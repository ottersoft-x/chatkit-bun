import { NotFoundError, UnsupportedOperationError, ValidationError } from "./errors";
import { decodeJsonBytes, encodeJsonBytes } from "./serialization";
import type { AttachmentStore, Store } from "./store";
import { ThreadMetadataSchema, type Page, type ThreadItem, type ThreadMetadata } from "./types/core";
import {
  ChatKitRequestSchema,
  DEFAULT_PAGE_SIZE,
  SyncCustomActionResponseSchema,
  ThreadStreamEventSchema,
  TranscriptionResultSchema,
  isStreamingRequest,
  type AudioInput,
  type ChatKitRequest,
  type FeedbackKind,
  type NonStreamingRequest,
  type StreamOptions,
  type StreamingRequest,
  type StructuredInputSubmission,
  type SyncCustomActionResponse,
  type Thread,
  type ThreadCustomActionParams,
  type ThreadItemUpdate,
  type ThreadStreamEvent,
  type TranscriptionResult,
  type UserMessageInput,
} from "./types/server";

const sseEncoder = new TextEncoder();
const sseDecoder = new TextDecoder();

type UserMessageItem = Extract<ThreadItem, { type: "user_message" }>;
type AssistantMessageItem = Extract<ThreadItem, { type: "assistant_message" }>;
type ClientToolCallItem = Extract<ThreadItem, { type: "client_tool_call" }>;
type StructuredInputItem = Extract<ThreadItem, { type: "structured_input" }>;
type WidgetItem = Extract<ThreadItem, { type: "widget" }>;
type ProcessRequestInput = string | Uint8Array | ArrayBuffer;

export class StreamingResult implements AsyncIterable<Uint8Array> {
  constructor(readonly jsonEvents: AsyncIterable<Uint8Array>) {}

  [Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
    return this.jsonEvents[Symbol.asyncIterator]();
  }
}

export class NonStreamingResult {
  constructor(readonly json: Uint8Array) {}
}

export class StreamCancelledError extends Error {
  constructor(message = "Stream cancelled") {
    super(message);
    this.name = "StreamCancelledError";
  }
}

export abstract class ChatKitServer<TContext = unknown> {
  constructor(
    readonly store: Store<TContext>,
    readonly attachmentStore: AttachmentStore<TContext> | null = null,
  ) {}

  abstract respond(
    thread: ThreadMetadata,
    inputUserMessage: UserMessageItem | null,
    context: TContext,
  ): AsyncIterable<ThreadStreamEvent>;

  async addFeedback(
    _threadId: string,
    _itemIds: string[],
    _kind: FeedbackKind,
    _context: TContext,
  ): Promise<void> {}

  async transcribe(_audio: AudioInput, _context: TContext): Promise<TranscriptionResult> {
    throw new UnsupportedOperationError(
      "transcribe() must be overridden to support the input.transcribe request.",
    );
  }

  async *action(
    _thread: ThreadMetadata,
    _action: ThreadCustomActionParams["action"],
    _sender: WidgetItem | null,
    _context: TContext,
  ): AsyncIterable<ThreadStreamEvent> {
    throw new UnsupportedOperationError(
      "The action() method must be overridden to react to actions.",
    );
  }

  async syncAction(
    _thread: ThreadMetadata,
    _action: ThreadCustomActionParams["action"],
    _sender: WidgetItem | null,
    _context: TContext,
  ): Promise<SyncCustomActionResponse> {
    throw new UnsupportedOperationError(
      "The syncAction() method must be overridden to react to sync actions.",
    );
  }

  getStreamOptions(_thread: ThreadMetadata, _context: TContext): StreamOptions {
    return { allow_cancel: true };
  }

  async handleStreamCancelled(
    thread: ThreadMetadata,
    pendingItems: ThreadItem[],
    context: TContext,
  ): Promise<void> {
    const messagesToSave = pendingItems.filter(
      (item): item is AssistantMessageItem =>
        item.type === "assistant_message" && item.content.some((part) => part.text.trim().length > 0),
    );

    for (const message of messagesToSave) {
      await this.store.saveItem(thread.id, message, context);
    }

    await this.store.addThreadItem(
      thread.id,
      {
        id: this.store.generateItemId("sdk_hidden_context", thread, context),
        thread_id: thread.id,
        created_at: new Date().toISOString(),
        type: "sdk_hidden_context",
        content: "Stream cancelled by client.",
      },
      context,
    );
  }

  async process(
    request: ProcessRequestInput,
    context: TContext,
  ): Promise<StreamingResult | NonStreamingResult> {
    const parsed: ChatKitRequest = ChatKitRequestSchema.parse(decodeJsonBytes(request));

    if (isStreamingRequest(parsed)) {
      return new StreamingResult(this.processStreaming(parsed, context));
    }

    return new NonStreamingResult(await this.processNonStreaming(parsed, context));
  }

  protected async processNonStreaming(
    request: NonStreamingRequest,
    context: TContext,
  ): Promise<Uint8Array> {
    switch (request.type) {
      case "threads.get_by_id": {
        return this.serialize(this.toThreadResponse(await this.loadFullThread(request.params.thread_id, context)));
      }

      case "threads.list": {
        const { limit, after, order } = request.params;
        const page = await this.store.loadThreads(
          limit ?? DEFAULT_PAGE_SIZE,
          after ?? null,
          order,
          context,
        );

        return this.serialize({
          ...page,
          data: page.data.map((thread) => this.toThreadResponse(thread)),
        });
      }

      case "items.list": {
        const { thread_id, limit, after, order } = request.params;
        const page = await this.store.loadThreadItems(
          thread_id,
          after ?? null,
          limit ?? DEFAULT_PAGE_SIZE,
          order,
          context,
        );

        return this.serialize({
          ...page,
          data: page.data.filter((item) => !this.isHiddenItem(item)),
        });
      }

      case "items.feedback": {
        const { thread_id, item_ids, kind } = request.params;
        await this.addFeedback(thread_id, item_ids, kind, context);
        return this.serialize({});
      }

      case "attachments.create": {
        const attachment = await this.getAttachmentStore().createAttachment(request.params, context);
        await this.store.saveAttachment(attachment, context);
        return this.serialize(attachment);
      }

      case "attachments.delete": {
        const { attachment_id } = request.params;
        await this.store.loadAttachment(attachment_id, context);
        await this.getAttachmentStore().deleteAttachment(attachment_id, context);
        await this.store.deleteAttachment(attachment_id, context);
        return this.serialize({});
      }

      case "threads.update": {
        const thread = await this.store.loadThread(request.params.thread_id, context);
        const updatedThread = { ...thread, title: request.params.title };
        await this.store.saveThread(updatedThread, context);
        return this.serialize(this.toThreadResponse(updatedThread));
      }

      case "threads.delete": {
        await this.store.deleteThread(request.params.thread_id, context);
        return this.serialize({});
      }

      case "input.transcribe": {
        const { audio_base64, mime_type } = request.params;
        const audio: AudioInput = {
          data: Uint8Array.from(Buffer.from(audio_base64, "base64")),
          mime_type,
          get mediaType() {
            return mime_type.split(";")[0]!.trim();
          },
        };
        const result = TranscriptionResultSchema.parse(await this.transcribe(audio, context));
        return this.serialize(result);
      }

      case "threads.sync_custom_action": {
        return this.serialize(await this.processSyncCustomAction(request, context));
      }

      default: {
        const _exhaustive: never = request;
        return this.serialize(_exhaustive);
      }
    }
  }

  protected async *processStreaming(
    request: StreamingRequest,
    context: TContext,
  ): AsyncIterable<Uint8Array> {
    for await (const event of this.processStreamingImpl(request, context)) {
      const json = sseDecoder.decode(this.serialize(event));
      yield sseEncoder.encode(`data: ${json}\n\n`);
    }
  }

  protected async *processStreamingImpl(
    request: StreamingRequest,
    context: TContext,
  ): AsyncIterable<ThreadStreamEvent> {
    switch (request.type) {
      case "threads.create": {
        const thread: Thread = {
          id: this.store.generateThreadId(context),
          created_at: new Date().toISOString(),
          status: { type: "active" },
          metadata: {},
          items: { data: [], has_more: false, after: null },
        };
        await this.store.saveThread(ThreadMetadataSchema.parse(thread), context);
        const userMessage = await this.buildUserMessageItem(request.params.input, thread, context);
        await this.persistUserMessageItem(thread, userMessage, context);

        yield { type: "thread.created", thread: this.toThreadResponse(thread) };
        yield { type: "thread.item.done", item: userMessage };
        yield* this.processEvents(thread, context, () => this.respond(thread, userMessage, context));
        return;
      }

      case "threads.add_user_message": {
        const thread = await this.store.loadThread(request.params.thread_id, context);
        const userMessage = await this.buildUserMessageItem(request.params.input, thread, context);
        yield* this.processNewThreadItemRespond(thread, userMessage, context);
        return;
      }

      default:
        yield* this.processStreamingContinuation(request, context);
    }
  }

  protected async buildUserMessageItem(
    input: UserMessageInput,
    thread: ThreadMetadata,
    context: TContext,
  ): Promise<UserMessageItem> {
    return {
      id: this.store.generateItemId("message", thread, context),
      type: "user_message",
      thread_id: thread.id,
      created_at: new Date().toISOString(),
      content: input.content,
      attachments: await Promise.all(
        input.attachments.map(async (attachmentId) => ({
          ...(await this.store.loadAttachment(attachmentId, context)),
          thread_id: thread.id,
        })),
      ),
      quoted_text: input.quoted_text,
      inference_options: input.inference_options,
    };
  }

  protected async *processNewThreadItemRespond(
    thread: ThreadMetadata,
    item: UserMessageItem,
    context: TContext,
  ): AsyncIterable<ThreadStreamEvent> {
    await this.persistUserMessageItem(thread, item, context);
    yield { type: "thread.item.done", item };
    yield* this.processEvents(thread, context, () => this.respond(thread, item, context));
  }

  protected async persistUserMessageItem(
    thread: ThreadMetadata,
    item: UserMessageItem,
    context: TContext,
  ): Promise<void> {
    for (const attachment of item.attachments) {
      await this.store.saveAttachment(attachment, context);
    }

    await this.store.addThreadItem(thread.id, item, context);
  }

  protected async *processStreamingContinuation(
    request: Exclude<StreamingRequest, { type: "threads.create" | "threads.add_user_message" }>,
    context: TContext,
  ): AsyncIterable<ThreadStreamEvent> {
    switch (request.type) {
      case "threads.add_client_tool_output": {
        const thread = await this.store.loadThread(request.params.thread_id, context);
        let toolCall: ClientToolCallItem | null = null;

        for await (const item of this.loadThreadItemsDescending(thread, context)) {
          if (item.type === "client_tool_call" && item.status === "pending") {
            toolCall = item;
            break;
          }
        }

        if (!toolCall) {
          throw new Error(`Last thread item in ${thread.id} was not a ClientToolCallItem`);
        }

        await this.store.saveItem(
          thread.id,
          { ...toolCall, status: "completed", output: request.params.result },
          context,
        );
        await this.cleanupPendingClientToolCall(thread, context);
        yield* this.processEvents(thread, context, () => this.respond(thread, null, context));
        return;
      }

      case "threads.add_structured_input": {
        const thread = await this.store.loadThread(request.params.thread_id, context);
        const item = await this.store.loadItem(thread.id, request.params.item_id, context);

        if (item.type !== "structured_input") {
          throw new Error(`Item ${request.params.item_id} is not a StructuredInputItem`);
        }

        const updatedItem = this.applyStructuredInputSubmission(item, request.params.input);
        const server = this;
        yield* this.processEvents(thread, context, async function* (): AsyncIterable<ThreadStreamEvent> {
          yield { type: "thread.item.replaced", item: updatedItem };
          yield* server.respond(thread, null, context);
        });
        return;
      }

      case "threads.retry_after_item": {
        const thread = await this.store.loadThread(request.params.thread_id, context);
        const userMessage = await this.removeItemsAfterUserMessage(
          thread,
          request.params.item_id,
          context,
        );
        yield* this.processEvents(thread, context, () => this.respond(thread, userMessage, context));
        return;
      }

      case "threads.custom_action": {
        const thread = await this.store.loadThread(request.params.thread_id, context);
        const sender =
          request.params.item_id != null
            ? await this.store.loadItem(thread.id, request.params.item_id, context)
            : null;

        if (sender && sender.type !== "widget") {
          yield { type: "error", code: "stream.error", allow_retry: false };
          return;
        }

        yield* this.processEvents(thread, context, () =>
          this.action(thread, request.params.action, sender, context),
        );
        return;
      }

      default: {
        const _exhaustive: never = request;
        return _exhaustive;
      }
    }
  }

  protected async *loadThreadItemsDescending(
    thread: ThreadMetadata,
    context: TContext,
  ): AsyncIterable<ThreadItem> {
    let after: string | null = null;

    while (true) {
      const page = await this.store.loadThreadItems(
        thread.id,
        after,
        DEFAULT_PAGE_SIZE,
        "desc",
        context,
      );

      yield* page.data;

      if (!page.has_more) {
        return;
      }

      after = page.after ?? null;
    }
  }

  protected async cleanupPendingClientToolCall(
    thread: ThreadMetadata,
    context: TContext,
  ): Promise<void> {
    const pendingItemIds: string[] = [];

    for await (const item of this.loadThreadItemsDescending(thread, context)) {
      if (item.type === "client_tool_call" && item.status === "pending") {
        pendingItemIds.push(item.id);
      }
    }

    for (const itemId of pendingItemIds) {
      await this.store.deleteThreadItem(thread.id, itemId, context);
    }
  }

  protected applyStructuredInputSubmission(
    item: StructuredInputItem,
    submission: StructuredInputSubmission,
  ): StructuredInputItem {
    if (item.status !== "pending") {
      throw new Error(`Structured input item ${item.id} is not pending`);
    }

    return {
      ...item,
      status: submission.status,
      inputs: item.inputs.map((question) => {
        const answer = submission.answers[question.id];

        if (
          submission.status === "skipped" ||
          !answer ||
          answer.skipped ||
          (answer.values?.length ?? 0) === 0
        ) {
          return { ...question, answer: { values: [], skipped: true } };
        }

        const values =
          question.type === "multiple_choice" && !question.multiple
            ? answer.values!.slice(0, 1)
            : answer.values!;

        return { ...question, answer: { values, skipped: false } };
      }),
    };
  }

  protected async removeItemsAfterUserMessage(
    thread: ThreadMetadata,
    itemId: string,
    context: TContext,
  ): Promise<UserMessageItem> {
    const itemsToRemove: ThreadItem[] = [];
    let after: string | null = null;

    while (true) {
      const page = await this.store.loadThreadItems(
        thread.id,
        after,
        DEFAULT_PAGE_SIZE,
        "desc",
        context,
      );

      for (const item of page.data) {
        if (item.id === itemId) {
          if (item.type !== "user_message") {
            throw new Error(`Item ${itemId} is not a user message`);
          }

          for (const itemToRemove of itemsToRemove) {
            await this.store.deleteThreadItem(thread.id, itemToRemove.id, context);
          }

          return item;
        }

        itemsToRemove.push(item);
      }

      if (!page.has_more) {
        break;
      }

      after = page.after ?? null;
    }

    throw new Error(`Item ${itemId} was not found`);
  }

  protected async *processEvents(
    thread: ThreadMetadata,
    context: TContext,
    stream: () => AsyncIterable<ThreadStreamEvent>,
  ): AsyncIterable<ThreadStreamEvent> {
    yield { type: "stream_options", stream_options: this.getStreamOptions(thread, context) };
    let lastThread = structuredClone(thread);
    const pendingItems = new Map<string, ThreadItem>();
    const updatedPendingItemIds = new Set<string>();
    let completedNormally = false;
    let cancellationHandled = false;
    const saveThreadIfChanged = async (): Promise<boolean> => {
      if (!this.hasThreadChanged(thread, lastThread)) {
        return false;
      }

      lastThread = structuredClone(thread);
      await this.store.saveThread(thread, context);
      return true;
    };

    try {
      for await (const rawEvent of stream()) {
        const event = ThreadStreamEventSchema.parse(rawEvent);
        let suppressClientEvent = false;

        if (event.type === "thread.item.added") {
          pendingItems.set(event.item.id, structuredClone(event.item));
          suppressClientEvent = this.isHiddenItem(event.item);
        } else if (event.type === "thread.item.done") {
          const pendingItem = pendingItems.get(event.item.id);
          const itemToSave = this.mergePendingUpdatesIntoDoneItem(
            event.item,
            pendingItem,
            updatedPendingItemIds.has(event.item.id),
          );
          await this.store.addThreadItem(thread.id, itemToSave, context);
          pendingItems.delete(event.item.id);
          updatedPendingItemIds.delete(event.item.id);
          suppressClientEvent = this.isHiddenItem(itemToSave);
        } else if (event.type === "thread.item.removed") {
          const pendingItem = pendingItems.get(event.item_id);
          suppressClientEvent =
            (pendingItem != null && this.isHiddenItem(pendingItem)) ||
            (pendingItem == null && (await this.isStoredHiddenItem(thread.id, event.item_id, context)));

          if (pendingItem == null) {
            await this.store.deleteThreadItem(thread.id, event.item_id, context);
          }

          pendingItems.delete(event.item_id);
          updatedPendingItemIds.delete(event.item_id);
        } else if (event.type === "thread.item.replaced") {
          await this.store.saveItem(thread.id, event.item, context);
          pendingItems.delete(event.item.id);
          updatedPendingItemIds.delete(event.item.id);
          suppressClientEvent = this.isHiddenItem(event.item);
        } else if (event.type === "thread.item.updated") {
          suppressClientEvent = await this.isKnownHiddenItem(
            thread.id,
            event.item_id,
            pendingItems,
            context,
          );

          if (this.updatePendingItems(pendingItems, event.item_id, event.update)) {
            updatedPendingItemIds.add(event.item_id);
          }
        }

        if (!suppressClientEvent) {
          yield event;
        }

        if (await saveThreadIfChanged()) {
          yield { type: "thread.updated", thread: this.toThreadResponse(thread) };
        }
      }
      completedNormally = true;
    } catch (error) {
      if (error instanceof StreamCancelledError) {
        cancellationHandled = true;
        await saveThreadIfChanged();
        await this.handleStreamCancelled(thread, [...pendingItems.values()], context);
        throw error;
      }

      completedNormally = true;
      yield { type: "error", code: "stream.error", allow_retry: true };
    } finally {
      if (!completedNormally && !cancellationHandled) {
        await saveThreadIfChanged();
        await this.handleStreamCancelled(thread, [...pendingItems.values()], context);
      }
    }

    if (await saveThreadIfChanged()) {
      yield { type: "thread.updated", thread: this.toThreadResponse(thread) };
    }
  }

  protected updatePendingItems(
    pendingItems: Map<string, ThreadItem>,
    itemId: string,
    update: ThreadItemUpdate,
  ): boolean {
    const item = pendingItems.get(itemId);
    if (!item) {
      return false;
    }

    if (
      item.type === "assistant_message" &&
      (update.type === "assistant_message.content_part.added" ||
        update.type === "assistant_message.content_part.text_delta" ||
        update.type === "assistant_message.content_part.annotation_added" ||
        update.type === "assistant_message.content_part.done")
    ) {
      pendingItems.set(itemId, this.applyAssistantMessageUpdate(item, update));
      return true;
    } else if (item.type === "workflow" && update.type === "workflow.task.added") {
      item.workflow.tasks.splice(update.task_index, 0, update.task);
      pendingItems.set(itemId, item);
      return true;
    } else if (item.type === "workflow" && update.type === "workflow.task.updated") {
      item.workflow.tasks[update.task_index] = update.task;
      pendingItems.set(itemId, item);
      return true;
    } else if (item.type === "generated_image" && update.type === "generated_image.updated") {
      pendingItems.set(itemId, { ...item, image: update.image });
      return true;
    }

    return false;
  }

  protected mergePendingUpdatesIntoDoneItem(
    doneItem: ThreadItem,
    pendingItem: ThreadItem | undefined,
    hasPendingUpdates: boolean,
  ): ThreadItem {
    if (!hasPendingUpdates || !pendingItem) {
      return doneItem;
    }

    if (doneItem.type === "assistant_message" && pendingItem.type === "assistant_message") {
      return { ...doneItem, content: this.mergeAssistantMessageContent(doneItem, pendingItem) };
    }

    if (doneItem.type === "workflow" && pendingItem.type === "workflow") {
      return {
        ...doneItem,
        workflow: {
          ...doneItem.workflow,
          tasks: pendingItem.workflow.tasks,
        },
      };
    }

    if (doneItem.type === "generated_image" && pendingItem.type === "generated_image") {
      return doneItem.image ? doneItem : { ...doneItem, image: pendingItem.image };
    }

    return doneItem;
  }

  private mergeAssistantMessageContent(
    doneItem: AssistantMessageItem,
    pendingItem: AssistantMessageItem,
  ): AssistantMessageItem["content"] {
    const content: AssistantMessageItem["content"] = [];
    const contentLength = Math.max(doneItem.content.length, pendingItem.content.length);

    for (let index = 0; index < contentLength; index++) {
      const donePart = doneItem.content[index];
      const pendingPart = pendingItem.content[index];

      if (!donePart) {
        if (pendingPart) {
          content.push(pendingPart);
        }
        continue;
      }

      if (!pendingPart) {
        content.push(donePart);
        continue;
      }

      content.push({
        ...donePart,
        text: donePart.text.length > 0 ? donePart.text : pendingPart.text,
        annotations:
          donePart.annotations.length > 0
            ? donePart.annotations
            : pendingPart.annotations,
      });
    }

    return content;
  }

  protected applyAssistantMessageUpdate(
    item: AssistantMessageItem,
    update: Extract<ThreadItemUpdate, { type: `assistant_message.${string}` }>,
  ): AssistantMessageItem {
    const content = item.content.map((part) => ({ ...part, annotations: [...part.annotations] }));

    while (content.length <= update.content_index) {
      content.push({ type: "output_text", text: "", annotations: [] });
    }

    const current = content[update.content_index];
    if (!current) {
      return { ...item, content };
    }

    if (update.type === "assistant_message.content_part.added") {
      content[update.content_index] = update.content;
    } else if (update.type === "assistant_message.content_part.text_delta") {
      content[update.content_index] = {
        ...current,
        text: current.text + update.delta,
      };
    } else if (update.type === "assistant_message.content_part.annotation_added") {
      const annotations = [...current.annotations];
      annotations.splice(update.annotation_index, 0, update.annotation);
      content[update.content_index] = { ...current, annotations };
    } else if (update.type === "assistant_message.content_part.done") {
      content[update.content_index] =
        update.content.annotations.length === 0 && current.annotations.length > 0
          ? { ...update.content, annotations: current.annotations }
          : update.content;
    }

    return { ...item, content };
  }

  private hasThreadChanged(thread: ThreadMetadata, lastThread: ThreadMetadata): boolean {
    return JSON.stringify(thread) !== JSON.stringify(lastThread);
  }

  protected serialize(value: unknown): Uint8Array {
    return encodeJsonBytes(value);
  }

  private getAttachmentStore(): AttachmentStore<TContext> {
    if (!this.attachmentStore) {
      throw new UnsupportedOperationError(
        "AttachmentStore is not configured. Provide an AttachmentStore to ChatKitServer to handle file operations.",
      );
    }

    return this.attachmentStore;
  }

  protected async loadFullThread(threadId: string, context: TContext): Promise<Thread> {
    const thread = await this.store.loadThread(threadId, context);
    const items = await this.store.loadThreadItems(
      threadId,
      null,
      DEFAULT_PAGE_SIZE,
      "asc",
      context,
    );

    return { ...thread, items };
  }

  protected toThreadResponse(thread: ThreadMetadata | Thread): Thread {
    const items: Page<ThreadItem> =
      "items" in thread
        ? {
            ...thread.items,
            data: thread.items.data.filter((item) => !this.isHiddenItem(item)),
          }
        : { data: [], has_more: false, after: null };
    const { metadata: _metadata, ...threadResponse } = thread;

    return { ...threadResponse, items } as Thread;
  }

  protected isHiddenItem(item: ThreadItem): boolean {
    return item.type === "hidden_context_item" || item.type === "sdk_hidden_context";
  }

  private async isKnownHiddenItem(
    threadId: string,
    itemId: string,
    pendingItems: Map<string, ThreadItem>,
    context: TContext,
  ): Promise<boolean> {
    const pendingItem = pendingItems.get(itemId);
    if (pendingItem) {
      return this.isHiddenItem(pendingItem);
    }

    return this.isStoredHiddenItem(threadId, itemId, context);
  }

  private async isStoredHiddenItem(
    threadId: string,
    itemId: string,
    context: TContext,
  ): Promise<boolean> {
    try {
      return this.isHiddenItem(await this.store.loadItem(threadId, itemId, context));
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }

      throw error;
    }
  }

  protected async processSyncCustomAction(
    request: Extract<NonStreamingRequest, { type: "threads.sync_custom_action" }>,
    context: TContext,
  ): Promise<SyncCustomActionResponse> {
    const { thread_id, item_id } = request.params;
    const thread = await this.store.loadThread(thread_id, context);
    let sender: WidgetItem | null = null;

    if (item_id != null) {
      const item = await this.store.loadItem(thread_id, item_id, context);
      if (item.type !== "widget") {
        throw new ValidationError("Sync custom actions can only be sent by widget items.");
      }
      sender = item;
    }

    return SyncCustomActionResponseSchema.parse(
      await this.syncAction(thread, request.params.action, sender, context),
    );
  }
}
