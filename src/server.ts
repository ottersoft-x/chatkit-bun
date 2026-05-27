import { UnsupportedOperationError, ValidationError } from "./errors";
import { decodeJsonBytes, encodeJsonBytes } from "./serialization";
import type { AttachmentStore, Store } from "./store";
import type { Page, ThreadItem, ThreadMetadata } from "./types/core";
import {
  ChatKitRequestSchema,
  DEFAULT_PAGE_SIZE,
  SyncCustomActionResponseSchema,
  TranscriptionResultSchema,
  isStreamingRequest,
  type AudioInput,
  type ChatKitRequest,
  type FeedbackKind,
  type NonStreamingRequest,
  type StreamOptions,
  type StreamingRequest,
  type SyncCustomActionResponse,
  type Thread,
  type ThreadCustomActionParams,
  type ThreadStreamEvent,
  type TranscriptionResult,
} from "./types/server";

const sseEncoder = new TextEncoder();
const sseDecoder = new TextDecoder();

type UserMessageItem = Extract<ThreadItem, { type: "user_message" }>;
type AssistantMessageItem = Extract<ThreadItem, { type: "assistant_message" }>;
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

  async action(_params: ThreadCustomActionParams, _context: TContext): Promise<void> {
    throw new UnsupportedOperationError(
      "The action() method must be overridden to react to actions.",
    );
  }

  async syncAction(
    _params: ThreadCustomActionParams,
    _context: TContext,
  ): Promise<SyncCustomActionResponse> {
    throw new UnsupportedOperationError(
      "The syncAction() method must be overridden to react to sync actions.",
    );
  }

  getStreamOptions(_request: StreamingRequest, _context: TContext): StreamOptions {
    return { allow_cancel: true };
  }

  async handleStreamCancelled(
    thread: ThreadMetadata,
    pendingAssistantMessages: AssistantMessageItem[],
    context: TContext,
  ): Promise<void> {
    const messagesToSave = pendingAssistantMessages.filter((message) => message.content.length > 0);

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
    _request: StreamingRequest,
    _context: TContext,
  ): AsyncIterable<ThreadStreamEvent> {}

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

  protected async processSyncCustomAction(
    request: Extract<NonStreamingRequest, { type: "threads.sync_custom_action" }>,
    context: TContext,
  ): Promise<SyncCustomActionResponse> {
    const { thread_id, item_id } = request.params;
    await this.store.loadThread(thread_id, context);

    if (item_id != null) {
      const sender = await this.store.loadItem(thread_id, item_id, context);
      if (sender.type !== "widget") {
        throw new ValidationError("Sync custom actions can only be sent by widget items.");
      }
    }

    return SyncCustomActionResponseSchema.parse(await this.syncAction(request.params, context));
  }
}
