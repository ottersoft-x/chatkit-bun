import { BaseStore } from "./store";
import { type Attachment, type Page, type ThreadItem, type ThreadMetadata } from "./types/core";
export interface SQLiteStoreOptions<TContext> {
    path?: string;
    getUserId(context: TContext): string;
}
export declare class SQLiteStore<TContext = unknown> extends BaseStore<TContext> {
    private readonly db;
    private readonly getUserId;
    constructor(options: SQLiteStoreOptions<TContext>);
    close(): void;
    loadThread(threadId: string, context: TContext): Promise<ThreadMetadata>;
    saveThread(thread: ThreadMetadata, context: TContext): Promise<void>;
    loadThreads(limit: number, after: string | null, order: "asc" | "desc", context: TContext): Promise<Page<ThreadMetadata>>;
    addThreadItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
    saveItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
    loadItem(threadId: string, itemId: string, context: TContext): Promise<ThreadItem>;
    loadThreadItems(threadId: string, after: string | null, limit: number, order: "asc" | "desc", context: TContext): Promise<Page<ThreadItem>>;
    deleteThread(threadId: string, context: TContext): Promise<void>;
    deleteThreadItem(threadId: string, itemId: string, context: TContext): Promise<void>;
    saveAttachment(attachment: Attachment, context: TContext): Promise<void>;
    loadAttachment(attachmentId: string, context: TContext): Promise<Attachment>;
    deleteAttachment(attachmentId: string, context: TContext): Promise<void>;
    private createSchema;
    private userId;
    private threadRow;
    private itemRow;
    private attachmentRow;
    private threadCursor;
    private itemCursor;
    private threadRows;
    private threadRowsAfter;
    private itemRows;
    private itemRowsAfter;
    private page;
    private requestedLimit;
    private assertPositiveLimit;
    private queryLimit;
    private orderSql;
    private parseThread;
    private parseItem;
    private parseAttachment;
}
