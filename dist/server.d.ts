import type { AttachmentStore, Store } from "./store";
import { type ThreadItem, type ThreadMetadata } from "./types/core";
import { type AudioInput, type FeedbackKind, type NonStreamingRequest, type StreamOptions, type StreamingRequest, type StructuredInputSubmission, type SyncCustomActionResponse, type Thread, type ThreadCustomActionParams, type ThreadItemUpdate, type ThreadStreamEvent, type TranscriptionResult, type UserMessageInput } from "./types/server";
type UserMessageItem = Extract<ThreadItem, {
    type: "user_message";
}>;
type AssistantMessageItem = Extract<ThreadItem, {
    type: "assistant_message";
}>;
type StructuredInputItem = Extract<ThreadItem, {
    type: "structured_input";
}>;
type WidgetItem = Extract<ThreadItem, {
    type: "widget";
}>;
type ProcessRequestInput = string | Uint8Array | ArrayBuffer;
export declare class StreamingResult implements AsyncIterable<Uint8Array> {
    readonly jsonEvents: AsyncIterable<Uint8Array>;
    constructor(jsonEvents: AsyncIterable<Uint8Array>);
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
}
export declare class NonStreamingResult {
    readonly json: Uint8Array;
    constructor(json: Uint8Array);
}
export declare class StreamCancelledError extends Error {
    constructor(message?: string);
}
export declare abstract class ChatKitServer<TContext = unknown> {
    readonly store: Store<TContext>;
    readonly attachmentStore: AttachmentStore<TContext> | null;
    constructor(store: Store<TContext>, attachmentStore?: AttachmentStore<TContext> | null);
    abstract respond(thread: ThreadMetadata, inputUserMessage: UserMessageItem | null, context: TContext): AsyncIterable<ThreadStreamEvent>;
    addFeedback(_threadId: string, _itemIds: string[], _kind: FeedbackKind, _context: TContext): Promise<void>;
    transcribe(_audio: AudioInput, _context: TContext): Promise<TranscriptionResult>;
    action(_thread: ThreadMetadata, _action: ThreadCustomActionParams["action"], _sender: WidgetItem | null, _context: TContext): AsyncIterable<ThreadStreamEvent>;
    syncAction(_thread: ThreadMetadata, _action: ThreadCustomActionParams["action"], _sender: WidgetItem | null, _context: TContext): Promise<SyncCustomActionResponse>;
    getStreamOptions(_thread: ThreadMetadata, _context: TContext): StreamOptions;
    handleStreamCancelled(thread: ThreadMetadata, pendingItems: ThreadItem[], context: TContext): Promise<void>;
    process(request: ProcessRequestInput, context: TContext): Promise<StreamingResult | NonStreamingResult>;
    protected processNonStreaming(request: NonStreamingRequest, context: TContext): Promise<Uint8Array>;
    protected processStreaming(request: StreamingRequest, context: TContext): AsyncIterable<Uint8Array>;
    protected processStreamingImpl(request: StreamingRequest, context: TContext): AsyncIterable<ThreadStreamEvent>;
    protected buildUserMessageItem(input: UserMessageInput, thread: ThreadMetadata, context: TContext): Promise<UserMessageItem>;
    protected processNewThreadItemRespond(thread: ThreadMetadata, item: UserMessageItem, context: TContext): AsyncIterable<ThreadStreamEvent>;
    protected persistUserMessageItem(thread: ThreadMetadata, item: UserMessageItem, context: TContext): Promise<void>;
    protected processStreamingContinuation(request: Exclude<StreamingRequest, {
        type: "threads.create" | "threads.add_user_message";
    }>, context: TContext): AsyncIterable<ThreadStreamEvent>;
    protected loadThreadItemsDescending(thread: ThreadMetadata, context: TContext): AsyncIterable<ThreadItem>;
    protected cleanupPendingClientToolCall(thread: ThreadMetadata, context: TContext): Promise<void>;
    protected applyStructuredInputSubmission(item: StructuredInputItem, submission: StructuredInputSubmission): StructuredInputItem;
    protected removeItemsAfterUserMessage(thread: ThreadMetadata, itemId: string, context: TContext): Promise<UserMessageItem>;
    protected processEvents(thread: ThreadMetadata, context: TContext, stream: () => AsyncIterable<ThreadStreamEvent>): AsyncIterable<ThreadStreamEvent>;
    protected updatePendingItems(pendingItems: Map<string, ThreadItem>, itemId: string, update: ThreadItemUpdate): boolean;
    protected mergePendingUpdatesIntoDoneItem(doneItem: ThreadItem, pendingItem: ThreadItem | undefined, hasPendingUpdates: boolean): ThreadItem;
    private mergeAssistantMessageContent;
    protected applyAssistantMessageUpdate(item: AssistantMessageItem, update: Extract<ThreadItemUpdate, {
        type: `assistant_message.${string}`;
    }>): AssistantMessageItem;
    private hasThreadChanged;
    protected serialize(value: unknown): Uint8Array;
    private getAttachmentStore;
    protected loadFullThread(threadId: string, context: TContext): Promise<Thread>;
    protected toThreadResponse(thread: ThreadMetadata | Thread): Thread;
    protected isHiddenItem(item: ThreadItem): boolean;
    private isKnownHiddenItem;
    private isStoredHiddenItem;
    protected processSyncCustomAction(request: Extract<NonStreamingRequest, {
        type: "threads.sync_custom_action";
    }>, context: TContext): Promise<SyncCustomActionResponse>;
}
export {};
