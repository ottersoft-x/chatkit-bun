import { describe, expect, test } from "bun:test";

import { AgentContext, ClientToolCall, streamAgentResponse } from "../src/agents";
import { BaseStore, type StoreItemType } from "../src/store";
import type { Attachment, Page, ThreadItem, ThreadMetadata } from "../src/types/core";
import type { ThreadStreamEvent } from "../src/types/server";

interface RequestContext {
  userId: string;
}

const now = "2026-05-27T00:00:00.000Z";
const thread: ThreadMetadata = {
  id: "thr_1",
  created_at: now,
  status: { type: "active" },
  metadata: {},
};
const requestContext: RequestContext = { userId: "user_1" };

class TestStore extends BaseStore<RequestContext> {
  override generateItemId(itemType: StoreItemType): string {
    return `${itemType}_generated`;
  }

  override async loadThread(_threadId: string, _context: RequestContext): Promise<ThreadMetadata> {
    throw new Error("loadThread is not used by agents tests");
  }

  override async saveThread(_thread: ThreadMetadata, _context: RequestContext): Promise<void> {
    throw new Error("saveThread is not used by agents tests");
  }

  override async loadThreadItems(
    _threadId: string,
    _after: string | null,
    _limit: number,
    _order: "asc" | "desc",
    _context: RequestContext,
  ): Promise<Page<ThreadItem>> {
    throw new Error("loadThreadItems is not used by agents tests");
  }

  override async saveAttachment(_attachment: Attachment, _context: RequestContext): Promise<void> {
    throw new Error("saveAttachment is not used by agents tests");
  }

  override async loadAttachment(_attachmentId: string, _context: RequestContext): Promise<Attachment> {
    throw new Error("loadAttachment is not used by agents tests");
  }

  override async deleteAttachment(_attachmentId: string, _context: RequestContext): Promise<void> {
    throw new Error("deleteAttachment is not used by agents tests");
  }

  override async loadThreads(
    _limit: number,
    _after: string | null,
    _order: "asc" | "desc",
    _context: RequestContext,
  ): Promise<Page<ThreadMetadata>> {
    throw new Error("loadThreads is not used by agents tests");
  }

  override async addThreadItem(
    _threadId: string,
    _item: ThreadItem,
    _context: RequestContext,
  ): Promise<void> {
    throw new Error("addThreadItem is not used by agents tests");
  }

  override async saveItem(_threadId: string, _item: ThreadItem, _context: RequestContext): Promise<void> {
    throw new Error("saveItem is not used by agents tests");
  }

  override async loadItem(
    _threadId: string,
    _itemId: string,
    _context: RequestContext,
  ): Promise<ThreadItem> {
    throw new Error("loadItem is not used by agents tests");
  }

  override async deleteThread(_threadId: string, _context: RequestContext): Promise<void> {
    throw new Error("deleteThread is not used by agents tests");
  }

  override async deleteThreadItem(
    _threadId: string,
    _itemId: string,
    _context: RequestContext,
  ): Promise<void> {
    throw new Error("deleteThreadItem is not used by agents tests");
  }
}

function createContext(): AgentContext<RequestContext> {
  return new AgentContext({
    thread,
    store: new TestStore(),
    context: requestContext,
    now: () => now,
  });
}

async function collect(iterable: AsyncIterable<ThreadStreamEvent>): Promise<ThreadStreamEvent[]> {
  const events: ThreadStreamEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

function streamFrom(events: unknown[], onReturn?: () => void): AsyncIterable<unknown> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<unknown> {
      let index = 0;

      return {
        async next(): Promise<IteratorResult<unknown>> {
          if (index >= events.length) {
            return { done: true, value: undefined };
          }

          return { done: false, value: events[index++] };
        },
        async return(): Promise<IteratorResult<unknown>> {
          onReturn?.();
          return { done: true, value: undefined };
        },
      };
    },
  };
}

function streamedRun(events: unknown[]): { toStream: () => AsyncIterable<unknown> } {
  return { toStream: () => streamFrom(events) };
}

function rawResponse(data: Record<string, unknown>): unknown {
  return { type: "raw_response_event", data };
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function assertClientToolCallArgumentTypes(): void {
  new ClientToolCall("valid", {
    includeHtml: true,
    nested: { ids: ["selection"], count: 1, empty: null },
  });

  // @ts-expect-error client tool arguments must be JSON-compatible.
  new ClientToolCall("invalid", { callback: () => undefined });

  // @ts-expect-error client tool arguments must be JSON-compatible.
  new ClientToolCall("invalid", { value: 1n });

  // @ts-expect-error client tool arguments must be JSON-compatible.
  new ClientToolCall("invalid", { value: new Date() });

  // @ts-expect-error client tool arguments must be JSON-compatible.
  new ClientToolCall("invalid", { value: Symbol("selection") });

  // @ts-expect-error nested client tool arguments must be JSON-compatible.
  new ClientToolCall("invalid", { nested: { callback: () => undefined } });
}

describe("AgentContext", () => {
  test("stores thread, store, request context, and deterministic timestamps", () => {
    const agentContext = createContext();

    expect(agentContext.thread).toEqual(thread);
    expect(agentContext.context).toEqual(requestContext);
    expect(agentContext.createdAt()).toBe(now);
    expect(agentContext.store.generateItemId("tool_call", thread, requestContext)).toBe(
      "tool_call_generated",
    );
  });

  test("queues validated stream events", async () => {
    const agentContext = createContext();

    agentContext.stream({
      type: "progress_update",
      icon: "sparkle",
      text: "Thinking",
    });
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "progress_update",
        icon: "sparkle",
        text: "Thinking",
      },
    ]);
  });

  test("rejects invalid stream events before queueing them", () => {
    const agentContext = createContext();

    expect(() => agentContext.stream({ type: "progress_update" } as never)).toThrow();
  });

  test("records one client tool call per turn", () => {
    const agentContext = createContext();
    const toolCall = new ClientToolCall("get_selection", { includeHtml: true });

    agentContext.setClientToolCall(toolCall);

    expect(agentContext.getClientToolCall()).toBe(toolCall);
    expect(() => agentContext.setClientToolCall(new ClientToolCall("other"))).toThrow(
      "Only one client tool call can be set per response.",
    );
  });
});

describe("streamAgentResponse", () => {
  test("yields context-only events when the SDK stream is empty", async () => {
    const agentContext = createContext();

    agentContext.stream({ type: "progress_update", icon: null, text: "Queued" });

    await expect(collect(streamAgentResponse(agentContext, streamedRun([])))).resolves.toEqual([
      { type: "progress_update", icon: null, text: "Queued" },
    ]);
  });

  test("maps assistant message text events", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_1" },
          }),
          rawResponse({
            type: "response.output_text.delta",
            item_id: "msg_1",
            content_index: 0,
            delta: "Hello, ",
          }),
          rawResponse({
            type: "response.output_text.delta",
            item_id: "msg_1",
            content_index: 0,
            delta: "world!",
          }),
          rawResponse({
            type: "response.output_text.done",
            item_id: "msg_1",
            content_index: 0,
            text: "Hello, world!",
          }),
          rawResponse({
            type: "response.output_item.done",
            item: {
              type: "message",
              id: "msg_1",
              content: [{ type: "output_text", text: "Hello, world!" }],
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_1",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "Hello, ",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "world!",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.done",
          content_index: 0,
          content: { type: "output_text", text: "Hello, world!", annotations: [] },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "msg_1",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [{ type: "output_text", text: "Hello, world!", annotations: [] }],
        },
      },
    ]);
  });

  test("yields context events while waiting for SDK events", async () => {
    const agentContext = createContext();
    const gate = deferred();
    const sdkEvents = {
      async *[Symbol.asyncIterator](): AsyncIterator<unknown> {
        await gate.promise;
        yield rawResponse({
          type: "response.output_text.delta",
          item_id: "msg_1",
          content_index: 0,
          delta: "after",
        });
      },
    };
    const iterator = streamAgentResponse(agentContext, sdkEvents)[Symbol.asyncIterator]();
    const first = iterator.next();

    await Promise.resolve();
    agentContext.stream({ type: "progress_update", icon: null, text: "Still working" });

    await expect(first).resolves.toEqual({
      done: false,
      value: { type: "progress_update", icon: null, text: "Still working" },
    });

    gate.resolve();

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "after",
        },
      },
    });
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
  });

  test("prefers queued context events over ready SDK events", async () => {
    const agentContext = createContext();
    const iterator = streamAgentResponse(
      agentContext,
      streamedRun([
        rawResponse({
          type: "response.output_text.delta",
          item_id: "msg_1",
          content_index: 0,
          delta: "first",
        }),
        rawResponse({
          type: "response.output_text.delta",
          item_id: "msg_1",
          content_index: 0,
          delta: "second",
        }),
      ]),
    )[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "first",
        },
      },
    });

    agentContext.stream({ type: "progress_update", icon: null, text: "Queued context" });

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { type: "progress_update", icon: null, text: "Queued context" },
    });
    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "second",
        },
      },
    });
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
  });

  test("ignores unknown SDK events in the first slice", async () => {
    const agentContext = createContext();

    await expect(
      collect(
        streamAgentResponse(
          agentContext,
          streamedRun([
            rawResponse({ type: "response.created" }),
            { type: "run_item_stream_event", item: { type: "server_tool_call_item" } },
          ]),
        ),
      ),
    ).resolves.toEqual([]);
  });
});
