import { UnsupportedOperationError } from "./errors";
import { decodeJsonBytes, encodeJsonBytes } from "./serialization";
import type { AttachmentStore, Store } from "./store";
import type { ThreadItem, ThreadMetadata } from "./types/core";
import {
  ChatKitRequestSchema,
  isStreamingRequest,
  type AudioInput,
  type ChatKitRequest,
  type FeedbackKind,
  type NonStreamingRequest,
  type StreamOptions,
  type StreamingRequest,
  type SyncCustomActionResponse,
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
    _request: NonStreamingRequest,
    _context: TContext,
  ): Promise<Uint8Array> {
    return this.serialize({});
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
}
