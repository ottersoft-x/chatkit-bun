import { describe, expect, test } from "bun:test";

import { createChatKitHandler } from "../src/http";
import { ChatKitServer, NonStreamingResult, StreamingResult } from "../src/server";
import { BaseStore, type StoreItemType } from "../src/store";
import type { Attachment, Page, ThreadItem, ThreadMetadata } from "../src/types/core";
import type { ThreadStreamEvent } from "../src/types/server";

interface RequestContext {
  userId: string;
  url: string;
}

type ProcessInput = string | Uint8Array | ArrayBuffer;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class UnusedStore<TContext> extends BaseStore<TContext> {
  override async loadThread(_threadId: string, _context: TContext): Promise<ThreadMetadata> {
    throw new Error("loadThread is not exercised by HTTP handler tests");
  }

  override async saveThread(_thread: ThreadMetadata, _context: TContext): Promise<void> {
    throw new Error("saveThread is not exercised by HTTP handler tests");
  }

  override async loadThreadItems(
    _threadId: string,
    _after: string | null,
    _limit: number,
    _order: "asc" | "desc",
    _context: TContext,
  ): Promise<Page<ThreadItem>> {
    throw new Error("loadThreadItems is not exercised by HTTP handler tests");
  }

  override async saveAttachment(_attachment: Attachment, _context: TContext): Promise<void> {
    throw new Error("saveAttachment is not exercised by HTTP handler tests");
  }

  override async loadAttachment(_attachmentId: string, _context: TContext): Promise<Attachment> {
    throw new Error("loadAttachment is not exercised by HTTP handler tests");
  }

  override async deleteAttachment(_attachmentId: string, _context: TContext): Promise<void> {
    throw new Error("deleteAttachment is not exercised by HTTP handler tests");
  }

  override async loadThreads(
    _limit: number,
    _after: string | null,
    _order: "asc" | "desc",
    _context: TContext,
  ): Promise<Page<ThreadMetadata>> {
    throw new Error("loadThreads is not exercised by HTTP handler tests");
  }

  override async addThreadItem(
    _threadId: string,
    _item: ThreadItem,
    _context: TContext,
  ): Promise<void> {
    throw new Error("addThreadItem is not exercised by HTTP handler tests");
  }

  override async saveItem(_threadId: string, _item: ThreadItem, _context: TContext): Promise<void> {
    throw new Error("saveItem is not exercised by HTTP handler tests");
  }

  override async loadItem(
    _threadId: string,
    _itemId: string,
    _context: TContext,
  ): Promise<ThreadItem> {
    throw new Error("loadItem is not exercised by HTTP handler tests");
  }

  override async deleteThread(_threadId: string, _context: TContext): Promise<void> {
    throw new Error("deleteThread is not exercised by HTTP handler tests");
  }

  override async deleteThreadItem(
    _threadId: string,
    _itemId: string,
    _context: TContext,
  ): Promise<void> {
    throw new Error("deleteThreadItem is not exercised by HTTP handler tests");
  }

  override generateItemId(
    itemType: StoreItemType,
    thread: ThreadMetadata,
    context: TContext,
  ): string {
    return super.generateItemId(itemType, thread, context);
  }
}

class RecordingServer extends ChatKitServer<RequestContext | undefined> {
  readonly calls: Array<{ body: string; context: RequestContext | undefined }> = [];

  constructor(private readonly result: StreamingResult | NonStreamingResult) {
    super(new UnusedStore<RequestContext | undefined>());
  }

  override async *respond(): AsyncIterable<ThreadStreamEvent> {
    throw new Error("respond is not exercised by HTTP handler tests");
  }

  override async process(
    request: ProcessInput,
    context: RequestContext | undefined,
  ): Promise<StreamingResult | NonStreamingResult> {
    const bytes =
      typeof request === "string"
        ? encoder.encode(request)
        : request instanceof ArrayBuffer
          ? new Uint8Array(request)
          : request;

    this.calls.push({ body: decoder.decode(bytes), context });
    return this.result;
  }
}

function jsonResult(value: unknown): NonStreamingResult {
  return new NonStreamingResult(encoder.encode(JSON.stringify(value)));
}

function streamingResult(chunks: string[], onReturn?: () => void): StreamingResult {
  return new StreamingResult({
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
      let index = 0;

      return {
        async next(): Promise<IteratorResult<Uint8Array>> {
          if (index >= chunks.length) {
            return { done: true, value: undefined };
          }

          return { done: false, value: encoder.encode(chunks[index++]!) };
        },
        async return(): Promise<IteratorResult<Uint8Array>> {
          onReturn?.();
          return { done: true, value: undefined };
        },
      };
    },
  });
}

describe("createChatKitHandler", () => {
  test("returns application/json for non-streaming results", async () => {
    const server = new RecordingServer(jsonResult({ ok: true }));
    const handler = createChatKitHandler(server);

    const response = await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        body: JSON.stringify({ type: "threads.list", params: {} }),
      }),
    );

    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.text()).toBe(JSON.stringify({ ok: true }));
    expect(server.calls).toEqual([
      {
        body: JSON.stringify({ type: "threads.list", params: {} }),
        context: undefined,
      },
    ]);
  });

  test("returns text/event-stream for streaming results", async () => {
    const chunks = [
      'data: {"type":"thread.created"}\n\n',
      'data: {"type":"thread.item.done"}\n\n',
    ];
    const server = new RecordingServer(streamingResult(chunks));
    const handler = createChatKitHandler(server);

    const response = await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        body: JSON.stringify({ type: "threads.create", params: {} }),
      }),
    );

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(await response.text()).toBe(chunks.join(""));
  });

  test("uses getContext to resolve per-request context", async () => {
    const server = new RecordingServer(jsonResult({ ok: true }));
    const handler = createChatKitHandler(server, {
      getContext: (request) => ({
        userId: request.headers.get("x-user-id") ?? "anonymous",
        url: request.url,
      }),
    });

    await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        headers: { "x-user-id": "user_123" },
        body: "context-body",
      }),
    );

    expect(server.calls).toEqual([
      {
        body: "context-body",
        context: {
          userId: "user_123",
          url: "https://example.com/chatkit",
        },
      },
    ]);
  });

  test("cancels the underlying streaming iterator when the response body is cancelled", async () => {
    let returned = false;
    const server = new RecordingServer(
      streamingResult(["data: one\n\n", "data: two\n\n"], () => {
        returned = true;
      }),
    );
    const handler = createChatKitHandler(server);

    const response = await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        body: JSON.stringify({ type: "threads.create", params: {} }),
      }),
    );

    const reader = response.body!.getReader();
    const first = await reader.read();

    expect(decoder.decode(first.value)).toBe("data: one\n\n");

    await reader.cancel();

    expect(returned).toBe(true);
  });
});
