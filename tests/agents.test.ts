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

class ThrowingToolCallIdStore extends TestStore {
  override generateItemId(itemType: StoreItemType): string {
    if (itemType === "tool_call") {
      throw new Error("tool_call ids should not be generated when SDK metadata is present");
    }

    return super.generateItemId(itemType);
  }
}

class RecordingToolCallIdStore extends TestStore {
  readonly toolCallIds: string[] = [];

  override generateItemId(itemType: StoreItemType): string {
    if (itemType !== "tool_call") {
      return super.generateItemId(itemType);
    }

    const id = `tool_call_generated_${this.toolCallIds.length + 1}`;
    this.toolCallIds.push(id);
    return id;
  }
}

function createContext(store: TestStore = new TestStore()): AgentContext<RequestContext> {
  return new AgentContext({
    thread,
    store,
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

function rawModel(data: Record<string, unknown>): unknown {
  return { type: "raw_model_stream_event", data };
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function countedDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  thenCount: () => number;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  let thenCount = 0;
  const innerPromise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  const promise = {
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
      thenCount += 1;
      return innerPromise.then(onfulfilled, onrejected);
    },
  } as Promise<T>;

  return { promise, resolve, reject, thenCount: () => thenCount };
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

  test("maps normalized assistant text events from the Agents SDK", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({ type: "output_text_delta", delta: "Hello" }),
          rawModel({ type: "output_text_delta", delta: ", world!" }),
          rawModel({
            type: "response_done",
            response: {
              id: "resp_1",
              output: [
                {
                  type: "message",
                  id: "msg_real",
                  role: "assistant",
                  status: "completed",
                  content: [{ type: "output_text", text: "Hello, world!" }],
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.updated",
        item_id: "message_generated",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "Hello",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "message_generated",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: ", world!",
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [{ type: "output_text", text: "Hello, world!", annotations: [] }],
        },
      },
    ]);
  });

  test("maps provider response events wrapped in normalized model events", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({
            type: "model",
            event: {
              type: "response.output_text.delta",
              item_id: "msg_1",
              content_index: 0,
              delta: "nested",
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "nested",
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

  test("reuses a pending SDK next promise while context events win races", async () => {
    const agentContext = createContext();
    const pendingSdk = countedDeferred<IteratorResult<unknown>>();
    const sdkEvents = {
      [Symbol.asyncIterator](): AsyncIterator<unknown> {
        let calls = 0;

        return {
          next(): Promise<IteratorResult<unknown>> {
            calls += 1;

            if (calls === 1) {
              return pendingSdk.promise;
            }

            return Promise.resolve({ done: true, value: undefined });
          },
        };
      },
    };
    const iterator = streamAgentResponse(agentContext, sdkEvents)[Symbol.asyncIterator]();
    const first = iterator.next();

    await Promise.resolve();
    agentContext.stream({ type: "progress_update", icon: null, text: "First context" });

    await expect(first).resolves.toEqual({
      done: false,
      value: { type: "progress_update", icon: null, text: "First context" },
    });

    const second = iterator.next();

    await Promise.resolve();
    agentContext.stream({ type: "progress_update", icon: null, text: "Second context" });

    await expect(second).resolves.toEqual({
      done: false,
      value: { type: "progress_update", icon: null, text: "Second context" },
    });
    expect(pendingSdk.thenCount()).toBe(1);

    pendingSdk.reject(new Error("SDK stream failed"));

    await expect(iterator.next()).rejects.toThrow("SDK stream failed");
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

  test("emits a deferred pending client tool call with SDK metadata", async () => {
    const agentContext = createContext(new ThrowingToolCallIdStore());
    agentContext.setClientToolCall(new ClientToolCall("get_selection", { includeHtml: true }));

    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          {
            type: "run_item_stream_event",
            item: {
              type: "tool_call_item",
              raw_item: {
                type: "function_call",
                id: "fc_123",
                call_id: "call_123",
                name: "get_selection",
              },
            },
          },
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "fc_123",
          thread_id: "thr_1",
          created_at: now,
          type: "client_tool_call",
          status: "pending",
          call_id: "call_123",
          name: "get_selection",
          arguments: { includeHtml: true },
        },
      },
    ]);
  });

  test("retains SDK tool metadata that arrives before the client tool call is recorded", async () => {
    const agentContext = createContext(new ThrowingToolCallIdStore());
    const completionGate = deferred();
    const metadataConsumed = deferred();
    const sdkEvents = {
      async *[Symbol.asyncIterator](): AsyncIterator<unknown> {
        yield {
          type: "run_item_stream_event",
          item: {
            type: "tool_call_item",
            raw_item: {
              type: "function_call",
              id: "fc_early",
              call_id: "call_early",
              name: "get_selection",
            },
          },
        };
        metadataConsumed.resolve();
        await completionGate.promise;
      },
    };
    const iterator = streamAgentResponse(agentContext, sdkEvents)[Symbol.asyncIterator]();
    const next = iterator.next();

    await metadataConsumed.promise;
    agentContext.setClientToolCall(new ClientToolCall("get_selection"));
    completionGate.resolve();

    await expect(next).resolves.toEqual({
      done: false,
      value: {
        type: "thread.item.done",
        item: {
          id: "fc_early",
          thread_id: "thr_1",
          created_at: now,
          type: "client_tool_call",
          status: "pending",
          call_id: "call_early",
          name: "get_selection",
          arguments: {},
        },
      },
    });
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
  });

  test("does not let unrelated tool metadata override the recorded client tool call", async () => {
    const agentContext = createContext(new ThrowingToolCallIdStore());
    agentContext.setClientToolCall(new ClientToolCall("get_selection", { includeHtml: true }));

    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          {
            type: "run_item_stream_event",
            item: {
              type: "tool_call_item",
              toolName: "other_tool",
              rawItem: {
                type: "function_call",
                id: "fc_unrelated",
                callId: "call_unrelated",
                name: "other_tool",
              },
            },
          },
          {
            type: "run_item_stream_event",
            item: {
              type: "tool_call_item",
              toolName: "get_selection",
              raw_item: {
                type: "function_call",
                id: "fc_selection",
                call_id: "call_selection",
                name: "get_selection",
              },
            },
          },
          {
            type: "run_item_stream_event",
            item: {
              type: "tool_call_item",
              raw_item: {
                type: "function_call",
                id: "fc_other_latest",
                call_id: "call_other_latest",
                name: "other_tool",
              },
            },
          },
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "fc_selection",
          thread_id: "thr_1",
          created_at: now,
          type: "client_tool_call",
          status: "pending",
          call_id: "call_selection",
          name: "get_selection",
          arguments: { includeHtml: true },
        },
      },
    ]);
  });

  test("generates fallback client tool ids when SDK metadata is absent", async () => {
    const store = new RecordingToolCallIdStore();
    const agentContext = createContext(store);
    agentContext.setClientToolCall(new ClientToolCall("get_selection"));

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "tool_call_generated_1",
          thread_id: "thr_1",
          created_at: now,
          type: "client_tool_call",
          status: "pending",
          call_id: "tool_call_generated_1",
          name: "get_selection",
          arguments: {},
        },
      },
    ]);
    expect(store.toolCallIds).toEqual(["tool_call_generated_1"]);
  });

  test("cancelling the merged stream returns the SDK iterator", async () => {
    const agentContext = createContext();
    let returned = false;
    const iterator = streamAgentResponse(
      agentContext,
      streamFrom(
        [
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
        ],
        () => {
          returned = true;
        },
      ),
    )[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({ done: false });
    await iterator.return?.();

    expect(returned).toBe(true);
    expect(() => agentContext.stream({ type: "progress_update", text: "late" })).toThrow(
      "Cannot stream events after the agent context has completed.",
    );
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
