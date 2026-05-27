import { Database } from "bun:sqlite";

import { NotFoundError } from "./errors";
import { BaseStore } from "./store";
import {
  AttachmentSchema,
  ThreadItemSchema,
  ThreadMetadataSchema,
  type Attachment,
  type Page,
  type ThreadItem,
  type ThreadMetadata,
} from "./types/core";

export interface SQLiteStoreOptions<TContext> {
  path?: string;
  getUserId(context: TContext): string;
}

interface DataRow {
  data: string;
}

interface CursorRow {
  id: string;
  created_at: string;
}

interface OrderedDataRow extends DataRow, CursorRow {}

export class SQLiteStore<TContext = unknown> extends BaseStore<TContext> {
  private readonly db: Database;
  private readonly getUserId: (context: TContext) => string;

  constructor(options: SQLiteStoreOptions<TContext>) {
    super();
    this.db = new Database(options.path ?? "chatkit.sqlite");
    this.getUserId = options.getUserId;
    this.createSchema();
  }

  close(): void {
    this.db.close();
  }

  async loadThread(threadId: string, context: TContext): Promise<ThreadMetadata> {
    const row = this.threadRow(this.userId(context), threadId);
    return this.parseThread(row.data);
  }

  async saveThread(thread: ThreadMetadata, context: TContext): Promise<void> {
    const userId = this.userId(context);
    const parsed = ThreadMetadataSchema.parse(thread);

    this.db
      .query(
        `INSERT INTO threads (user_id, id, created_at, data)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, id) DO UPDATE SET
           created_at = excluded.created_at,
           data = excluded.data`,
      )
      .run(userId, parsed.id, parsed.created_at, JSON.stringify(parsed));
  }

  async loadThreads(
    limit: number,
    after: string | null,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadMetadata>> {
    this.assertPositiveLimit(limit);
    const userId = this.userId(context);
    const rows = after
      ? this.threadRowsAfter(userId, after, limit, order)
      : this.threadRows(userId, limit, order);

    return this.page(rows, limit, (row) => this.parseThread(row.data));
  }

  async addThreadItem(threadId: string, item: ThreadItem, context: TContext): Promise<void> {
    const userId = this.userId(context);
    this.threadRow(userId, threadId);
    const parsed = ThreadItemSchema.parse({ ...item, thread_id: threadId });

    this.db
      .query(
        `INSERT INTO items (user_id, thread_id, id, created_at, data)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(userId, threadId, parsed.id, parsed.created_at, JSON.stringify(parsed));
  }

  async saveItem(threadId: string, item: ThreadItem, context: TContext): Promise<void> {
    const userId = this.userId(context);
    this.threadRow(userId, threadId);
    const parsed = ThreadItemSchema.parse({ ...item, thread_id: threadId });

    this.db
      .query(
        `INSERT INTO items (user_id, thread_id, id, created_at, data)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, thread_id, id) DO UPDATE SET
           created_at = excluded.created_at,
           data = excluded.data`,
      )
      .run(userId, threadId, parsed.id, parsed.created_at, JSON.stringify(parsed));
  }

  async loadItem(threadId: string, itemId: string, context: TContext): Promise<ThreadItem> {
    const userId = this.userId(context);
    this.threadRow(userId, threadId);
    const row = this.itemRow(userId, threadId, itemId);
    return this.parseItem(row.data);
  }

  async loadThreadItems(
    threadId: string,
    after: string | null,
    limit: number,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadItem>> {
    this.assertPositiveLimit(limit);
    const userId = this.userId(context);
    this.threadRow(userId, threadId);
    const rows = after
      ? this.itemRowsAfter(userId, threadId, after, limit, order)
      : this.itemRows(userId, threadId, limit, order);

    return this.page(rows, limit, (row) => this.parseItem(row.data));
  }

  async deleteThread(threadId: string, context: TContext): Promise<void> {
    const userId = this.userId(context);
    this.threadRow(userId, threadId);
    this.db.query("DELETE FROM threads WHERE user_id = ? AND id = ?").run(userId, threadId);
  }

  async deleteThreadItem(threadId: string, itemId: string, context: TContext): Promise<void> {
    const userId = this.userId(context);
    this.threadRow(userId, threadId);
    this.itemRow(userId, threadId, itemId);
    this.db
      .query("DELETE FROM items WHERE user_id = ? AND thread_id = ? AND id = ?")
      .run(userId, threadId, itemId);
  }

  async saveAttachment(attachment: Attachment, context: TContext): Promise<void> {
    const userId = this.userId(context);
    const parsed = AttachmentSchema.parse(attachment);

    this.db
      .query(
        `INSERT OR REPLACE INTO attachments (user_id, id, data)
         VALUES (?, ?, ?)`,
      )
      .run(userId, parsed.id, JSON.stringify(parsed));
  }

  async loadAttachment(attachmentId: string, context: TContext): Promise<Attachment> {
    const row = this.attachmentRow(this.userId(context), attachmentId);
    return this.parseAttachment(row.data);
  }

  async deleteAttachment(attachmentId: string, context: TContext): Promise<void> {
    const userId = this.userId(context);
    this.attachmentRow(userId, attachmentId);
    this.db.query("DELETE FROM attachments WHERE user_id = ? AND id = ?").run(userId, attachmentId);
  }

  private createSchema(): void {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS threads (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (user_id, id)
      );

      CREATE INDEX IF NOT EXISTS threads_user_created_at_idx
        ON threads (user_id, created_at, id);

      CREATE TABLE IF NOT EXISTS items (
        user_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (user_id, thread_id, id),
        FOREIGN KEY (user_id, thread_id)
          REFERENCES threads (user_id, id)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS items_thread_created_at_idx
        ON items (user_id, thread_id, created_at, id);

      CREATE TABLE IF NOT EXISTS attachments (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (user_id, id)
      );
    `);
  }

  private userId(context: TContext): string {
    return this.getUserId(context);
  }

  private threadRow(userId: string, threadId: string): DataRow {
    const row = this.db
      .query<DataRow, [string, string]>("SELECT data FROM threads WHERE user_id = ? AND id = ?")
      .get(userId, threadId);

    if (!row) {
      throw new NotFoundError(`Thread not found: ${threadId}`);
    }

    return row;
  }

  private itemRow(userId: string, threadId: string, itemId: string): DataRow {
    const row = this.db
      .query<DataRow, [string, string, string]>(
        "SELECT data FROM items WHERE user_id = ? AND thread_id = ? AND id = ?",
      )
      .get(userId, threadId, itemId);

    if (!row) {
      throw new NotFoundError(`Thread item not found: ${itemId}`);
    }

    return row;
  }

  private attachmentRow(userId: string, attachmentId: string): DataRow {
    const row = this.db
      .query<DataRow, [string, string]>("SELECT data FROM attachments WHERE user_id = ? AND id = ?")
      .get(userId, attachmentId);

    if (!row) {
      throw new NotFoundError(`Attachment not found: ${attachmentId}`);
    }

    return row;
  }

  private threadCursor(userId: string, threadId: string): CursorRow {
    const row = this.db
      .query<CursorRow, [string, string]>(
        "SELECT id, created_at FROM threads WHERE user_id = ? AND id = ?",
      )
      .get(userId, threadId);

    if (!row) {
      throw new NotFoundError(`Thread cursor not found: ${threadId}`);
    }

    return row;
  }

  private itemCursor(userId: string, threadId: string, itemId: string): CursorRow {
    const row = this.db
      .query<CursorRow, [string, string, string]>(
        "SELECT id, created_at FROM items WHERE user_id = ? AND thread_id = ? AND id = ?",
      )
      .get(userId, threadId, itemId);

    if (!row) {
      throw new NotFoundError(`Thread item cursor not found: ${itemId}`);
    }

    return row;
  }

  private threadRows(userId: string, limit: number, order: "asc" | "desc"): OrderedDataRow[] {
    const orderSql = this.orderSql(order);

    return this.db
      .query<OrderedDataRow, [string, number]>(
        `SELECT id, created_at, data
         FROM threads
         WHERE user_id = ?
         ORDER BY created_at ${orderSql}, id ${orderSql}
         LIMIT ?`,
      )
      .all(userId, this.queryLimit(limit));
  }

  private threadRowsAfter(
    userId: string,
    after: string,
    limit: number,
    order: "asc" | "desc",
  ): OrderedDataRow[] {
    const cursor = this.threadCursor(userId, after);
    const orderSql = this.orderSql(order);
    const comparator = order === "asc" ? ">" : "<";

    return this.db
      .query<OrderedDataRow, [string, string, string, string, number]>(
        `SELECT id, created_at, data
         FROM threads
         WHERE user_id = ?
           AND (created_at ${comparator} ? OR (created_at = ? AND id ${comparator} ?))
         ORDER BY created_at ${orderSql}, id ${orderSql}
         LIMIT ?`,
      )
      .all(userId, cursor.created_at, cursor.created_at, cursor.id, this.queryLimit(limit));
  }

  private itemRows(
    userId: string,
    threadId: string,
    limit: number,
    order: "asc" | "desc",
  ): OrderedDataRow[] {
    const orderSql = this.orderSql(order);

    return this.db
      .query<OrderedDataRow, [string, string, number]>(
        `SELECT id, created_at, data
         FROM items
         WHERE user_id = ? AND thread_id = ?
         ORDER BY created_at ${orderSql}, id ${orderSql}
         LIMIT ?`,
      )
      .all(userId, threadId, this.queryLimit(limit));
  }

  private itemRowsAfter(
    userId: string,
    threadId: string,
    after: string,
    limit: number,
    order: "asc" | "desc",
  ): OrderedDataRow[] {
    const cursor = this.itemCursor(userId, threadId, after);
    const orderSql = this.orderSql(order);
    const comparator = order === "asc" ? ">" : "<";

    return this.db
      .query<OrderedDataRow, [string, string, string, string, string, number]>(
        `SELECT id, created_at, data
         FROM items
         WHERE user_id = ? AND thread_id = ?
           AND (created_at ${comparator} ? OR (created_at = ? AND id ${comparator} ?))
         ORDER BY created_at ${orderSql}, id ${orderSql}
         LIMIT ?`,
      )
      .all(userId, threadId, cursor.created_at, cursor.created_at, cursor.id, this.queryLimit(limit));
  }

  private page<T>(rows: OrderedDataRow[], limit: number, parse: (row: OrderedDataRow) => T): Page<T> {
    const requestedLimit = this.requestedLimit(limit);
    const dataRows = rows.slice(0, requestedLimit);
    const hasMore = rows.length > requestedLimit;

    return {
      data: dataRows.map(parse),
      has_more: hasMore,
      after: hasMore && dataRows.length > 0 ? dataRows[dataRows.length - 1]!.id : null,
    };
  }

  private requestedLimit(limit: number): number {
    return Math.max(0, Math.trunc(limit));
  }

  private assertPositiveLimit(limit: number): void {
    if (!Number.isFinite(limit) || limit < 1) {
      throw new RangeError("Pagination limit must be at least 1");
    }
  }

  private queryLimit(limit: number): number {
    return this.requestedLimit(limit) + 1;
  }

  private orderSql(order: "asc" | "desc"): "ASC" | "DESC" {
    return order === "asc" ? "ASC" : "DESC";
  }

  private parseThread(data: string): ThreadMetadata {
    return ThreadMetadataSchema.parse(JSON.parse(data));
  }

  private parseItem(data: string): ThreadItem {
    return ThreadItemSchema.parse(JSON.parse(data));
  }

  private parseAttachment(data: string): Attachment {
    return AttachmentSchema.parse(JSON.parse(data));
  }
}
