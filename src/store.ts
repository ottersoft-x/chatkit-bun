import type { Attachment, Page, ThreadItem, ThreadMetadata } from "./types/core";

export type StoreItemType =
  | "thread"
  | "message"
  | "tool_call"
  | "task"
  | "workflow"
  | "attachment"
  | "sdk_hidden_context";

const idPrefixes: Record<StoreItemType, string> = {
  thread: "thr",
  message: "msg",
  tool_call: "tc",
  task: "tsk",
  workflow: "wf",
  attachment: "atc",
  sdk_hidden_context: "shcx",
};

export function defaultGenerateId(itemType: StoreItemType): string {
  return `${idPrefixes[itemType]}_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

export interface AttachmentCreateParams {
  name: string;
  size: number;
  mime_type: string;
}

export interface AttachmentStore<TContext = unknown> {
  deleteAttachment(attachmentId: string, context: TContext): Promise<void>;
  createAttachment(input: AttachmentCreateParams, context: TContext): Promise<Attachment>;
  generateAttachmentId?(mimeType: string, context: TContext): string;
}

export interface Store<TContext = unknown> {
  generateThreadId(context: TContext): string;
  generateItemId(itemType: StoreItemType, thread: ThreadMetadata, context: TContext): string;
  loadThread(threadId: string, context: TContext): Promise<ThreadMetadata>;
  saveThread(thread: ThreadMetadata, context: TContext): Promise<void>;
  loadThreadItems(
    threadId: string,
    after: string | null,
    limit: number,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadItem>>;
  saveAttachment(attachment: Attachment, context: TContext): Promise<void>;
  loadAttachment(attachmentId: string, context: TContext): Promise<Attachment>;
  deleteAttachment(attachmentId: string, context: TContext): Promise<void>;
  loadThreads(
    limit: number,
    after: string | null,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadMetadata>>;
  addThreadItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
  saveItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
  loadItem(threadId: string, itemId: string, context: TContext): Promise<ThreadItem>;
  deleteThread(threadId: string, context: TContext): Promise<void>;
  deleteThreadItem(threadId: string, itemId: string, context: TContext): Promise<void>;
}

export abstract class BaseStore<TContext = unknown> implements Store<TContext> {
  generateThreadId(_context: TContext): string {
    return defaultGenerateId("thread");
  }

  generateItemId(itemType: StoreItemType, _thread: ThreadMetadata, _context: TContext): string {
    return defaultGenerateId(itemType);
  }

  abstract loadThread(threadId: string, context: TContext): Promise<ThreadMetadata>;
  abstract saveThread(thread: ThreadMetadata, context: TContext): Promise<void>;
  abstract loadThreadItems(
    threadId: string,
    after: string | null,
    limit: number,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadItem>>;
  abstract saveAttachment(attachment: Attachment, context: TContext): Promise<void>;
  abstract loadAttachment(attachmentId: string, context: TContext): Promise<Attachment>;
  abstract deleteAttachment(attachmentId: string, context: TContext): Promise<void>;
  abstract loadThreads(
    limit: number,
    after: string | null,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadMetadata>>;
  abstract addThreadItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
  abstract saveItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
  abstract loadItem(threadId: string, itemId: string, context: TContext): Promise<ThreadItem>;
  abstract deleteThread(threadId: string, context: TContext): Promise<void>;
  abstract deleteThreadItem(threadId: string, itemId: string, context: TContext): Promise<void>;
}
