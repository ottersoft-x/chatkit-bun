import {
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
  ToolInputGuardrailTripwireTriggered,
  ToolOutputGuardrailTripwireTriggered,
} from "@openai/agents";
import { describe, expect, test } from "bun:test";

import { AgentContext, ClientToolCall, streamAgentResponse } from "../src/agents";
import { ResponseStreamConverter, defaultResponseStreamConverter } from "../src/agents/annotations";
import { SQLiteStore } from "../src/sqlite-store";
import { BaseStore, type Store, type StoreItemType } from "../src/store";
import type {
  Annotation,
  Attachment,
  Page,
  ThreadItem,
  ThreadMetadata,
  WorkflowSummary,
} from "../src/types/core";
import type { ThreadStreamEvent } from "../src/types/server";
import { Card, Text } from "../src/widgets";

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
  readonly addedThreadItems: Array<{
    threadId: string;
    item: ThreadItem;
    context: RequestContext;
  }> = [];
  readonly savedThreadItems: Array<{
    threadId: string;
    item: ThreadItem;
    context: RequestContext;
  }> = [];

  constructor(private readonly threadItems: ThreadItem[] = []) {
    super();
  }

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
    threadId: string,
    after: string | null,
    limit: number,
    order: "asc" | "desc",
    context: RequestContext,
  ): Promise<Page<ThreadItem>> {
    expect(threadId).toBe(thread.id);
    expect(after).toBeNull();
    expect(limit).toBe(2);
    expect(order).toBe("desc");
    expect(context).toEqual(requestContext);

    return {
      data: structuredClone(this.threadItems.slice(0, limit)),
      has_more: false,
      after: null,
    };
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
    threadId: string,
    item: ThreadItem,
    context: RequestContext,
  ): Promise<void> {
    this.addedThreadItems.push({ threadId, item: structuredClone(item), context });
  }

  override async saveItem(threadId: string, item: ThreadItem, context: RequestContext): Promise<void> {
    this.savedThreadItems.push({ threadId, item: structuredClone(item), context });
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

class RecordingMessageIdStore extends TestStore {
  readonly messageIds: string[] = [];

  override generateItemId(itemType: StoreItemType): string {
    if (itemType !== "message") {
      return super.generateItemId(itemType);
    }

    const id = `message_generated_${this.messageIds.length + 1}`;
    this.messageIds.push(id);
    return id;
  }
}

function createContext(store: Store<RequestContext> = new TestStore()): AgentContext<RequestContext> {
  return new AgentContext({
    thread,
    store,
    context: requestContext,
    now: () => now,
  });
}

function storedWorkflowItem(
  overrides: Partial<Extract<ThreadItem, { type: "workflow" }>> = {},
): Extract<ThreadItem, { type: "workflow" }> {
  return {
    id: "wf_previous",
    thread_id: "thr_1",
    created_at: now,
    type: "workflow",
    workflow: {
      type: "custom",
      tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
      expanded: true,
    },
    ...overrides,
  };
}

function storedClientToolCallItem(): Extract<ThreadItem, { type: "client_tool_call" }> {
  return {
    id: "fc_previous",
    thread_id: "thr_1",
    created_at: now,
    type: "client_tool_call",
    status: "pending",
    call_id: "call_previous",
    name: "get_selection",
    arguments: {},
  };
}

function storedAssistantMessageItem(): Extract<ThreadItem, { type: "assistant_message" }> {
  return {
    id: "msg_previous",
    thread_id: "thr_1",
    created_at: now,
    type: "assistant_message",
    content: [],
  };
}

function contextWidgetItem(): Extract<ThreadItem, { type: "widget" }> {
  return {
    id: "widget_1",
    thread_id: "thr_1",
    created_at: now,
    type: "widget",
    widget: { type: "Card", props: { title: "Result" } },
  };
}

function contextGeneratedImageItem(): Extract<ThreadItem, { type: "generated_image" }> {
  return {
    id: "generated_image_1",
    thread_id: "thr_1",
    created_at: now,
    type: "generated_image",
    image: null,
  };
}

function hiddenContextItem(): Extract<ThreadItem, { type: "hidden_context_item" }> {
  return {
    id: "hidden_1",
    thread_id: "thr_1",
    created_at: now,
    type: "hidden_context_item",
    content: { secret: true },
  };
}

function sdkHiddenContextItem(): Extract<ThreadItem, { type: "sdk_hidden_context" }> {
  return {
    id: "sdk_hidden_1",
    thread_id: "thr_1",
    created_at: now,
    type: "sdk_hidden_context",
    content: "internal",
  };
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

function throwingStream(
  events: unknown[],
  error: Error,
  options: { returnError?: Error } = {},
): { toStream: () => AsyncIterable<unknown> } {
  return {
    toStream: () => ({
      [Symbol.asyncIterator](): AsyncIterator<unknown> {
        let index = 0;

        return {
          async next(): Promise<IteratorResult<unknown>> {
            if (index < events.length) {
              return { done: false, value: events[index++] };
            }

            throw error;
          },
          async return(): Promise<IteratorResult<unknown>> {
            if (options.returnError) {
              throw options.returnError;
            }

            return { done: true, value: undefined };
          },
        };
      },
    }),
  };
}

type GuardrailErrorFactory = {
  name: string;
  create: () => Error;
};

const guardrailErrorFactories: GuardrailErrorFactory[] = [
  {
    name: "input",
    create: () =>
      new InputGuardrailTripwireTriggered("input blocked", {
        guardrail: { type: "input", name: "input_blocked" },
        output: { tripwireTriggered: true, outputInfo: null },
      } as never),
  },
  {
    name: "output",
    create: () =>
      new OutputGuardrailTripwireTriggered("output blocked", {
        guardrail: { type: "output", name: "output_blocked" },
        agent: {},
        agentOutput: "blocked",
        output: { tripwireTriggered: true, outputInfo: null },
      } as never),
  },
  {
    name: "tool input",
    create: () =>
      new ToolInputGuardrailTripwireTriggered("tool input blocked", {
        guardrail: { type: "tool_input", name: "tool_input_blocked" },
        output: { behavior: { type: "throwException" }, outputInfo: null },
      } as never),
  },
  {
    name: "tool output",
    create: () =>
      new ToolOutputGuardrailTripwireTriggered("tool output blocked", {
        guardrail: { type: "tool_output", name: "tool_output_blocked" },
        output: { behavior: { type: "throwException" }, outputInfo: null },
      } as never),
  },
];

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

describe("ResponseStreamConverter", () => {
  test("converts default citation annotations", () => {
    const converter = new ResponseStreamConverter();

    expect(
      converter.convertAnnotation({
        type: "file_citation",
        file_id: "file_123",
        filename: "report.pdf",
        index: 12,
      }),
    ).toEqual({
      type: "annotation",
      source: { type: "file", filename: "report.pdf", title: "report.pdf" },
      index: 12,
    });

    expect(
      converter.convertAnnotation({
        type: "container_file_citation",
        container_id: "container_1",
        file_id: "file_123",
        filename: "container.txt",
        start_index: 1,
        end_index: 9,
      }),
    ).toEqual({
      type: "annotation",
      source: { type: "file", filename: "container.txt", title: "container.txt" },
      index: 9,
    });

    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com/report",
        title: "Example Report",
        start_index: 3,
        end_index: 15,
      }),
    ).toEqual({
      type: "annotation",
      source: {
        type: "url",
        url: "https://example.com/report",
        title: "Example Report",
      },
      index: 15,
    });

    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com/untitled",
        title: "",
        end_index: 20,
      }),
    ).toEqual({
      type: "annotation",
      source: {
        type: "url",
        url: "https://example.com/untitled",
        title: "",
      },
      index: 20,
    });
  });

  test("drops invalid or unsupported citation annotations", () => {
    const converter = new ResponseStreamConverter();

    expect(
      converter.convertAnnotation({
        type: "file_citation",
        file_id: "file_123",
        filename: "",
        index: 0,
      }),
    ).toBeNull();
    expect(
      converter.convertAnnotation({
        type: "container_file_citation",
        container_id: "container_1",
        file_id: "file_123",
        filename: "",
        end_index: 4,
      }),
    ).toBeNull();
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com",
        end_index: 4,
      }),
    ).toBeNull();
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com",
        title: null,
        end_index: 4,
      }),
    ).toBeNull();
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com",
        title: 123,
        end_index: 4,
      }),
    ).toBeNull();
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "",
        title: "Empty URL",
        end_index: 4,
      }),
    ).toBeNull();
    expect(converter.convertAnnotation({ type: "unknown" })).toBeNull();
    expect(converter.convertAnnotation(null)).toBeNull();
  });

  test("exports a shared default converter instance", () => {
    expect(defaultResponseStreamConverter).toBeInstanceOf(ResponseStreamConverter);
  });

  test("converts base64 images to data URLs by default", async () => {
    const converter = new ResponseStreamConverter();

    await expect(converter.base64ImageToUrl("img_call_1", "dGVzdA==", null)).resolves.toBe(
      "data:image/png;base64,dGVzdA==",
    );
  });

  test("normalizes partial image progress from configured partial image count", () => {
    expect(new ResponseStreamConverter().partialImageIndexToProgress(1)).toBe(0);
    expect(new ResponseStreamConverter({ partialImages: 0 }).partialImageIndexToProgress(1)).toBe(0);
    expect(new ResponseStreamConverter({ partialImages: 3 }).partialImageIndexToProgress(1)).toBe(1 / 3);
    expect(new ResponseStreamConverter({ partialImages: 3 }).partialImageIndexToProgress(5)).toBe(1);
  });
});

describe("AgentContext", () => {
  test("stores thread, store, request context, previous response id, and deterministic timestamps", () => {
    const agentContext = createContext();

    expect(agentContext.thread).toEqual(thread);
    expect(agentContext.context).toEqual(requestContext);
    expect(agentContext.previousResponseId).toBeNull();
    expect(agentContext.createdAt()).toBe(now);
    expect(agentContext.store.generateItemId("tool_call", thread, requestContext)).toBe(
      "tool_call_generated",
    );
  });

  test("preserves an explicit previous response id", () => {
    const agentContext = new AgentContext({
      thread,
      store: new TestStore(),
      context: requestContext,
      previousResponseId: "resp_previous_123",
      now: () => now,
    });

    expect(agentContext.previousResponseId).toBe("resp_previous_123");
    expect(agentContext.createdAt()).toBe(now);
  });

  test("tracks the active workflow item for stream conversion", () => {
    const agentContext = createContext();
    const workflow: Extract<ThreadItem, { type: "workflow" }> = {
      id: "workflow_generated",
      thread_id: thread.id,
      created_at: now,
      type: "workflow",
      workflow: {
        type: "reasoning",
        tasks: [],
        expanded: false,
      },
    };

    expect(agentContext.workflowItem).toBeNull();

    agentContext.workflowItem = workflow;
    expect(agentContext.workflowItem).toBe(workflow);

    agentContext.workflowItem = null;
    expect(agentContext.workflowItem).toBeNull();
  });

  test("starts reasoning workflows immediately", async () => {
    const agentContext = createContext();

    agentContext.startWorkflow({ type: "reasoning", tasks: [], expanded: false });
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: { type: "reasoning", tasks: [], expanded: false },
        },
      },
    ]);
    expect(agentContext.workflowItem).toEqual({
      id: "workflow_generated",
      thread_id: "thr_1",
      created_at: now,
      type: "workflow",
      workflow: { type: "reasoning", tasks: [], expanded: false },
    });
  });

  test("defers empty custom workflow added events until a task is available", async () => {
    const agentContext = createContext();

    agentContext.startWorkflow({ type: "custom", tasks: [], expanded: false });
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([]);
    expect(agentContext.workflowItem).toEqual({
      id: "workflow_generated",
      thread_id: "thr_1",
      created_at: now,
      type: "workflow",
      workflow: { type: "custom", tasks: [], expanded: false },
    });
  });

  test("ending a deferred empty custom workflow clears state without emitting an orphan done event", async () => {
    const agentContext = createContext();

    agentContext.startWorkflow({ type: "custom", tasks: [], expanded: false });
    agentContext.endWorkflow();
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("startWorkflow clones caller-provided workflow tasks", async () => {
    const agentContext = createContext();
    const task = { type: "custom" as const, title: "Fetch data", status_indicator: "loading" as const };

    agentContext.startWorkflow({ type: "custom", tasks: [task], expanded: false });
    task.title = "Mutated outside context";
    agentContext.endWorkflow();
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "loading" }],
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "loading" }],
            summary: { duration: 0 },
            expanded: false,
          },
        },
      },
    ]);
  });

  test("ends workflows with duration summaries by default", async () => {
    const agentContext = createContext();

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
      expanded: true,
    });
    agentContext.endWorkflow();
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
            expanded: true,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
            summary: { duration: 0 },
            expanded: false,
          },
        },
      },
    ]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("ends workflows with explicit summaries and expanded state", async () => {
    const agentContext = createContext();
    const summary: WorkflowSummary = { title: "Complete", icon: "check" };

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
      expanded: false,
    });
    agentContext.endWorkflow(summary, true);
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
            summary,
            expanded: true,
          },
        },
      },
    ]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("preserves existing workflow summaries when ending without an explicit summary", async () => {
    const agentContext = createContext();

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
      summary: { title: "Already summarized" },
      expanded: true,
    });
    agentContext.endWorkflow();
    agentContext.closeEvents();

    const events = await collect(agentContext.events());
    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "workflow_generated",
        thread_id: "thr_1",
        created_at: now,
        type: "workflow",
        workflow: {
          type: "custom",
          tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
          summary: { title: "Already summarized" },
          expanded: false,
        },
      },
    });
    expect(agentContext.workflowItem).toBeNull();
  });

  test("ending without an active workflow is a no-op", async () => {
    const agentContext = createContext();

    agentContext.endWorkflow();
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("addWorkflowTask lazily starts custom workflows and emits the first task as the added item", async () => {
    const agentContext = createContext();

    agentContext.addWorkflowTask({ type: "custom", title: "Fetch data", status_indicator: "loading" });
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "loading" }],
            expanded: false,
          },
        },
      },
    ]);
    expect(agentContext.workflowItem?.workflow.tasks).toEqual([
      { type: "custom", title: "Fetch data", status_indicator: "loading" },
    ]);
  });

  test("addWorkflowTask emits task updates for subsequent workflow tasks", async () => {
    const agentContext = createContext();

    agentContext.addWorkflowTask({ type: "custom", title: "Fetch data", status_indicator: "complete" });
    agentContext.addWorkflowTask({ type: "custom", title: "Analyze data", status_indicator: "loading" });
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.added",
          task_index: 1,
          task: { type: "custom", title: "Analyze data", status_indicator: "loading" },
        },
      },
    ]);
    expect(agentContext.workflowItem?.workflow.tasks).toEqual([
      { type: "custom", title: "Fetch data", status_indicator: "complete" },
      { type: "custom", title: "Analyze data", status_indicator: "loading" },
    ]);
  });

  test("addWorkflowTask emits task updates when a reasoning workflow is already active", async () => {
    const agentContext = createContext();

    agentContext.startWorkflow({ type: "reasoning", tasks: [], expanded: false });
    agentContext.addWorkflowTask({ type: "thought", content: "Thinking", status_indicator: "none" });
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "reasoning",
            tasks: [],
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.added",
          task_index: 0,
          task: { type: "thought", content: "Thinking", status_indicator: "none" },
        },
      },
    ]);
  });

  test("addWorkflowTask validates tasks before lazily creating workflow state", () => {
    const agentContext = createContext();

    expect(() =>
      agentContext.addWorkflowTask({ type: "custom", status_indicator: "invalid" } as never),
    ).toThrow();
    expect(agentContext.workflowItem).toBeNull();
  });

  test("updateWorkflowTask replaces workflow tasks and emits task updates", async () => {
    const agentContext = createContext();

    agentContext.addWorkflowTask({ type: "custom", title: "Fetch data", status_indicator: "loading" });
    agentContext.updateWorkflowTask(
      { type: "custom", title: "Fetch data", status_indicator: "complete" },
      0,
    );
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Fetch data", status_indicator: "loading" }],
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.updated",
          task_index: 0,
          task: { type: "custom", title: "Fetch data", status_indicator: "complete" },
        },
      },
    ]);
    expect(agentContext.workflowItem?.workflow.tasks).toEqual([
      { type: "custom", title: "Fetch data", status_indicator: "complete" },
    ]);
  });

  test("updateWorkflowTask throws when no workflow is active", () => {
    const agentContext = createContext();

    expect(() =>
      agentContext.updateWorkflowTask(
        { type: "custom", title: "Fetch data", status_indicator: "complete" },
        0,
      ),
    ).toThrow("Workflow is not set");
  });

  test("updateWorkflowTask throws before mutating state when the index is out of range", () => {
    const agentContext = createContext();

    agentContext.addWorkflowTask({ type: "custom", title: "Fetch data", status_indicator: "loading" });

    expect(() =>
      agentContext.updateWorkflowTask(
        { type: "custom", title: "Fetch data", status_indicator: "complete" },
        1,
      ),
    ).toThrow("Workflow task index is out of range");
    expect(agentContext.workflowItem?.workflow.tasks).toEqual([
      { type: "custom", title: "Fetch data", status_indicator: "loading" },
    ]);
  });

  test("updateWorkflowTask rejects non-integer task indexes before mutating state", () => {
    const agentContext = createContext();

    agentContext.addWorkflowTask({ type: "custom", title: "Fetch data", status_indicator: "loading" });

    expect(() =>
      agentContext.updateWorkflowTask(
        { type: "custom", title: "Fetch data", status_indicator: "complete" },
        0.5,
      ),
    ).toThrow("Workflow task index is out of range");
    expect(agentContext.workflowItem?.workflow.tasks).toEqual([
      { type: "custom", title: "Fetch data", status_indicator: "loading" },
    ]);
  });

  test("addWorkflowTask clones caller-provided tasks", async () => {
    const agentContext = createContext();
    const task = { type: "custom" as const, title: "Fetch data", status_indicator: "loading" as const };

    agentContext.addWorkflowTask(task);
    task.title = "Mutated outside context";
    agentContext.endWorkflow();
    agentContext.closeEvents();

    const events = await collect(agentContext.events());
    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "workflow_generated",
        thread_id: "thr_1",
        created_at: now,
        type: "workflow",
        workflow: {
          type: "custom",
          tasks: [{ type: "custom", title: "Fetch data", status_indicator: "loading" }],
          summary: { duration: 0 },
          expanded: false,
        },
      },
    });
  });

  test("updateWorkflowTask clones caller-provided tasks", async () => {
    const agentContext = createContext();
    const task = { type: "custom" as const, title: "Fetch data", status_indicator: "complete" as const };

    agentContext.addWorkflowTask({ type: "custom", title: "Fetch data", status_indicator: "loading" });
    agentContext.updateWorkflowTask(task, 0);
    task.title = "Mutated outside context";
    agentContext.endWorkflow();
    agentContext.closeEvents();

    const events = await collect(agentContext.events());
    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "workflow_generated",
        thread_id: "thr_1",
        created_at: now,
        type: "workflow",
        workflow: {
          type: "custom",
          tasks: [{ type: "custom", title: "Fetch data", status_indicator: "complete" }],
          summary: { duration: 0 },
          expanded: false,
        },
      },
    });
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
  test("resumes the latest stored workflow before streaming", async () => {
    const workflow = storedWorkflowItem();
    const store = new TestStore([workflow]);
    const agentContext = createContext(store);

    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.reasoning_summary_text.done",
            item_id: "reasoning_1",
            summary_index: 0,
            text: "Analyze",
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.updated",
        item_id: "wf_previous",
        update: {
          type: "workflow.task.added",
          task_index: 1,
          task: { type: "thought", content: "Analyze", status_indicator: "none" },
        },
      },
    ]);
  });

  test("resumes the workflow before a latest client tool call", async () => {
    const workflow = storedWorkflowItem();
    const store = new TestStore([storedClientToolCallItem(), workflow]);
    const agentContext = createContext(store);

    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.reasoning_summary_text.done",
            item_id: "reasoning_1",
            summary_index: 0,
            text: "Analyze",
          }),
        ]),
      ),
    );

    expect(events[0]).toEqual({
      type: "thread.item.updated",
      item_id: "wf_previous",
      update: {
        type: "workflow.task.added",
        task_index: 1,
        task: { type: "thought", content: "Analyze", status_indicator: "none" },
      },
    });
  });

  test("does not resume workflows when the latest stored item is not resumable", async () => {
    const store = new TestStore([storedAssistantMessageItem(), storedWorkflowItem()]);
    const agentContext = createContext(store);

    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "reasoning", id: "reasoning_1" },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: { type: "reasoning", tasks: [], expanded: false },
        },
      },
    ]);
  });

  test("silently persists active workflows at normal stream completion", async () => {
    const store = new TestStore();
    const agentContext = createContext(store);

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Prepare", status_indicator: "loading" }],
      expanded: true,
    });
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "loading" }],
            expanded: true,
          },
        },
      },
    ]);
    expect(store.savedThreadItems).toEqual([
      {
        threadId: "thr_1",
        context: requestContext,
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "loading" }],
            expanded: true,
          },
        },
      },
    ]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("silently persists helper-created workflows with all queued tasks", async () => {
    const store = new TestStore();
    const agentContext = createContext(store);

    agentContext.addWorkflowTask({
      type: "custom",
      title: "Prepare",
      status_indicator: "complete",
    });
    agentContext.addWorkflowTask({
      type: "custom",
      title: "Analyze",
      status_indicator: "loading",
    });
    agentContext.closeEvents();

    await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(store.savedThreadItems.at(0)?.item).toMatchObject({
      id: "workflow_generated",
      type: "workflow",
      workflow: {
        type: "custom",
        tasks: [
          { type: "custom", title: "Prepare", status_indicator: "complete" },
          { type: "custom", title: "Analyze", status_indicator: "loading" },
        ],
      },
    });
    expect(agentContext.workflowItem).toBeNull();
  });

  test("silently persists resumed open workflows without duplicating stored ids", async () => {
    const store = new SQLiteStore<RequestContext>({
      path: ":memory:",
      getUserId: (context) => context.userId,
    });
    const workflow = storedWorkflowItem();

    try {
      await store.saveThread(thread, requestContext);
      await store.addThreadItem(thread.id, workflow, requestContext);

      const agentContext = createContext(store);
      const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

      expect(events).toEqual([]);
      await expect(store.loadItem(thread.id, workflow.id, requestContext)).resolves.toMatchObject({
        id: workflow.id,
        type: "workflow",
      });
      expect(agentContext.workflowItem).toBeNull();
    } finally {
      store.close();
    }
  });

  test("keeps silently persisted resumed workflows in the two-item resume window", async () => {
    const store = new SQLiteStore<RequestContext>({
      path: ":memory:",
      getUserId: (context) => context.userId,
    });
    const olderAssistant = {
      ...storedAssistantMessageItem(),
      id: "msg_older",
      created_at: "2026-05-26T00:00:00.000Z",
    };
    const workflow = storedWorkflowItem({
      created_at: "2026-05-26T00:01:00.000Z",
    });
    const existingToolCall = {
      ...storedClientToolCallItem(),
      id: "fc_existing",
      created_at: "2026-05-26T00:02:00.000Z",
      call_id: "call_existing",
    };

    try {
      await store.saveThread(thread, requestContext);
      await store.addThreadItem(thread.id, olderAssistant, requestContext);
      await store.addThreadItem(thread.id, workflow, requestContext);
      await store.addThreadItem(thread.id, existingToolCall, requestContext);

      const agentContext = createContext(store);
      agentContext.setClientToolCall(new ClientToolCall("get_selection"));

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
                  id: "fc_current",
                  call_id: "call_current",
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
            id: "fc_current",
            thread_id: "thr_1",
            created_at: now,
            type: "client_tool_call",
            status: "pending",
            call_id: "call_current",
            name: "get_selection",
            arguments: {},
          },
        },
      ]);

      const clientToolCall = events[0]?.type === "thread.item.done" ? events[0].item : null;
      expect(clientToolCall?.type).toBe("client_tool_call");
      await store.saveItem(thread.id, clientToolCall!, requestContext);

      const resumeWindow = await store.loadThreadItems(thread.id, null, 2, "desc", requestContext);
      const persistedWorkflow = resumeWindow.data.find(
        (item): item is Extract<ThreadItem, { type: "workflow" }> =>
          item.type === "workflow" && item.id === workflow.id,
      );

      expect(resumeWindow.data.map((item) => item.id)).toContain(workflow.id);
      expect(persistedWorkflow).toMatchObject({
        id: workflow.id,
        type: "workflow",
        created_at: now,
      });
      expect(persistedWorkflow?.workflow).not.toHaveProperty("summary");
      expect(agentContext.workflowItem).toBeNull();
    } finally {
      store.close();
    }
  });

  test("does not silently persist workflows that ended during the stream", async () => {
    const store = new TestStore();
    const agentContext = createContext(store);

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
      expanded: true,
    });
    agentContext.endWorkflow({ title: "Prepared" });
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "workflow_generated",
        thread_id: "thr_1",
        created_at: now,
        type: "workflow",
        workflow: {
          type: "custom",
          tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
          summary: { title: "Prepared" },
          expanded: false,
        },
      },
    });
    expect(store.addedThreadItems).toEqual([]);
    expect(store.savedThreadItems).toEqual([]);
  });

  test("persists open workflows before yielding pending client tool calls", async () => {
    class OrderRecordingStore extends TestStore {
      readonly order: string[] = [];

      override async saveItem(
        threadId: string,
        item: ThreadItem,
        context: RequestContext,
      ): Promise<void> {
        this.order.push(`persist:${item.type}`);
        await super.saveItem(threadId, item, context);
      }
    }

    const store = new OrderRecordingStore();
    const agentContext = createContext(store);

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Prepare", status_indicator: "loading" }],
      expanded: true,
    });
    agentContext.setClientToolCall(new ClientToolCall("get_selection"));
    agentContext.closeEvents();

    const iterator = streamAgentResponse(agentContext, streamedRun([]))[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "loading" }],
            expanded: true,
          },
        },
      },
    });

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: {
        type: "thread.item.done",
        item: {
          id: "tool_call_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "client_tool_call",
          status: "pending",
          call_id: "tool_call_generated",
          name: "get_selection",
          arguments: {},
        },
      },
    });
    store.order.push("yield:client_tool_call");

    expect(store.order).toEqual(["persist:workflow", "yield:client_tool_call"]);
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
    expect(store.savedThreadItems.map((entry) => entry.item.type)).toEqual(["workflow"]);
  });

  test("ends active workflows before context-emitted widget items", async () => {
    const store = new TestStore();
    const agentContext = createContext(store);
    const widget = contextWidgetItem();

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
      expanded: true,
    });
    agentContext.stream({ type: "thread.item.added", item: widget });
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
            expanded: true,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
            summary: { duration: 0 },
            expanded: false,
          },
        },
      },
      { type: "thread.item.added", item: widget },
    ]);
    expect(store.savedThreadItems).toEqual([]);
  });

  test("ends active workflows before context-emitted generated image items", async () => {
    const agentContext = createContext();
    const generatedImage = contextGeneratedImageItem();

    agentContext.addWorkflowTask({
      type: "custom",
      title: "Prepare",
      status_indicator: "complete",
    });
    agentContext.stream({ type: "thread.item.done", item: generatedImage });
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events.at(-2)).toEqual({
      type: "thread.item.done",
      item: {
        id: "workflow_generated",
        thread_id: "thr_1",
        created_at: now,
        type: "workflow",
        workflow: {
          type: "custom",
          tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
          summary: { duration: 0 },
          expanded: false,
        },
      },
    });
    expect(events.at(-1)).toEqual({ type: "thread.item.done", item: generatedImage });
  });

  test("does not end active workflows before client tool or hidden context items", async () => {
    const workflow = storedWorkflowItem();
    const store = new TestStore([workflow]);
    const agentContext = createContext(store);

    agentContext.stream({ type: "thread.item.done", item: storedClientToolCallItem() });
    agentContext.stream({ type: "thread.item.added", item: hiddenContextItem() });
    agentContext.stream({ type: "thread.item.added", item: sdkHiddenContextItem() });
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      { type: "thread.item.done", item: storedClientToolCallItem() },
      { type: "thread.item.added", item: hiddenContextItem() },
      { type: "thread.item.added", item: sdkHiddenContextItem() },
    ]);
    expect(store.savedThreadItems.at(0)?.item.id).toBe("wf_previous");
  });

  test("returns widget items streamed through the agent context", async () => {
    const agentContext = createContext();

    await agentContext.streamWidget(
      Card({ children: [Text({ value: "Hello, world!" })] }),
      "Hello, world!",
    );
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", value: "Hello, world!" }],
          },
          copy_text: "Hello, world!",
        },
      },
    ]);
  });

  test("returns streamed widget text deltas through the agent context", async () => {
    const agentContext = createContext();

    async function* widgets() {
      yield Card({ children: [Text({ id: "text", value: "", streaming: true })] });
      yield Card({ children: [Text({ id: "text", value: "Hello, world", streaming: true })] });
    }

    await agentContext.streamWidget(widgets());
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "", streaming: true }],
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "message_generated",
        update: {
          type: "widget.streaming_text.value_delta",
          component_id: "text",
          delta: "Hello, world",
          done: false,
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "Hello, world", streaming: true }],
          },
        },
      },
    ]);
  });

  test("returns streamed widget root replacements through the agent context", async () => {
    const agentContext = createContext();

    async function* widgets() {
      yield Card({ children: [Text({ id: "text", value: "Hello!" })] });
      yield Card({ children: [Text({ key: "other text", value: "World!", streaming: false })] });
    }

    await agentContext.streamWidget(widgets());
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "Hello!" }],
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "message_generated",
        update: {
          type: "widget.root.updated",
          widget: {
            type: "Card",
            children: [{ type: "Text", key: "other text", value: "World!", streaming: false }],
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", key: "other text", value: "World!", streaming: false }],
          },
        },
      },
    ]);
  });

  test("ends active workflows before widgets streamed through the agent context", async () => {
    const store = new TestStore();
    const agentContext = createContext(store);

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
      expanded: true,
    });
    await agentContext.streamWidget(Card({ children: [Text({ value: "Result" })] }));
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
            expanded: true,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
            summary: { duration: 0 },
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", value: "Result" }],
          },
        },
      },
    ]);
    expect(store.savedThreadItems).toEqual([]);
  });

  test("yields context-only events when the SDK stream is empty", async () => {
    const agentContext = createContext();

    agentContext.stream({ type: "progress_update", icon: null, text: "Queued" });

    await expect(collect(streamAgentResponse(agentContext, streamedRun([])))).resolves.toEqual([
      { type: "progress_update", icon: null, text: "Queued" },
    ]);
  });

  for (const guardrail of guardrailErrorFactories) {
    test(`removes SDK and context produced items before rethrowing ${guardrail.name} guardrail errors`, async () => {
      const error = guardrail.create();
      const agentContext = createContext();
      const contextItem: Extract<ThreadItem, { type: "assistant_message" }> = {
        id: "ctx_message",
        thread_id: thread.id,
        created_at: now,
        type: "assistant_message",
        content: [{ type: "output_text", text: "Context output", annotations: [] }],
      };

      agentContext.stream({ type: "thread.item.done", item: contextItem });

      const iterator = streamAgentResponse(
        agentContext,
        throwingStream(
          [
            rawResponse({
              type: "response.output_item.added",
              item: { type: "message", id: "sdk_message" },
            }),
            rawResponse({
              type: "response.output_text.done",
              item_id: "sdk_message",
              content_index: 0,
              text: "SDK output",
            }),
          ],
          error,
        ),
      );
      const events: ThreadStreamEvent[] = [];
      let thrown: unknown;

      try {
        for await (const event of iterator) {
          events.push(event);
        }
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBe(error);

      expect(events).toEqual([
        {
          type: "thread.item.done",
          item: contextItem,
        },
        {
          type: "thread.item.added",
          item: {
            id: "sdk_message",
            thread_id: "thr_1",
            created_at: now,
            type: "assistant_message",
            content: [],
          },
        },
        {
          type: "thread.item.updated",
          item_id: "sdk_message",
          update: {
            type: "assistant_message.content_part.done",
            content_index: 0,
            content: { type: "output_text", text: "SDK output", annotations: [] },
          },
        },
        { type: "thread.item.removed", item_id: "ctx_message" },
        { type: "thread.item.removed", item_id: "sdk_message" },
      ]);
    });
  }

  test("does not remove SDK tool metadata-only ids on guardrail errors", async () => {
    const error = guardrailErrorFactories[0]!.create();
    const agentContext = createContext();
    const iterator = streamAgentResponse(
      agentContext,
      throwingStream(
        [
          {
            type: "run_item_stream_event",
            item: {
              type: "tool_call_item",
              raw_item: {
                type: "function_call",
                id: "tool_call_item",
                call_id: "call_tool",
                name: "get_selection",
              },
            },
          },
          rawResponse({
            type: "response.output_item.added",
            item: { type: "reasoning", id: "reasoning_1" },
          }),
          rawResponse({
            type: "response.output_item.added",
            item: { type: "image_generation_call", id: "image_call" },
          }),
        ],
        error,
      ),
    );
    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of iterator) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: { type: "reasoning", tasks: [], expanded: false },
        },
      },
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "generated_image",
          image: null,
        },
      },
      { type: "thread.item.removed", item_id: "workflow_generated" },
      { type: "thread.item.removed", item_id: "message_generated" },
    ]);
  });

  test("does not remove resumed workflows auto-ended before SDK assistant items", async () => {
    const error = guardrailErrorFactories[0]!.create();
    const workflow = storedWorkflowItem();
    const store = new TestStore([workflow]);
    const agentContext = createContext(store);
    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(
        agentContext,
        throwingStream(
          [
            rawResponse({
              type: "response.output_item.added",
              item: { type: "message", id: "sdk_message" },
            }),
          ],
          error,
        ),
      )) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          ...workflow,
          workflow: {
            ...workflow.workflow,
            summary: { duration: 0 },
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      { type: "thread.item.removed", item_id: "sdk_message" },
    ]);
  });

  test("does not mask guardrail errors when stream cleanup return rejects", async () => {
    const error = guardrailErrorFactories[0]!.create();
    const returnError = new Error("cleanup failed");
    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(
        createContext(),
        throwingStream(
          [
            rawResponse({
              type: "response.output_item.added",
              item: { type: "message", id: "sdk_message" },
            }),
          ],
          error,
          { returnError },
        ),
      )) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);
    expect(thrown).not.toBe(returnError);

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      { type: "thread.item.removed", item_id: "sdk_message" },
    ]);
  });

  test("does not yield pending client tool calls after guardrail errors", async () => {
    async function* runWithLateGuardrail() {
      yield rawResponse({
        type: "response.output_item.added",
        item: { type: "message", id: "sdk_message" },
      });
      throw guardrailErrorFactories[1]!.create();
    }

    const agentContext = createContext();
    agentContext.setClientToolCall(new ClientToolCall("get_selection"));

    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(agentContext, runWithLateGuardrail())) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(OutputGuardrailTripwireTriggered);

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      { type: "thread.item.removed", item_id: "sdk_message" },
    ]);
  });

  test("does not remove produced items for non-guardrail stream errors", async () => {
    const error = new Error("ordinary stream failure");
    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(
        createContext(),
        throwingStream(
          [
            rawResponse({
              type: "response.output_item.added",
              item: { type: "message", id: "sdk_message" },
            }),
          ],
          error,
        ),
      )) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
    ]);
  });

  test("does not process queued context events when SDK guardrail rejects immediately", async () => {
    const error = guardrailErrorFactories[0]!.create();
    const agentContext = createContext();
    const contextItem = {
      ...contextWidgetItem(),
      id: "widget_before_immediate_guardrail",
    };

    agentContext.stream({ type: "thread.item.done", item: contextItem });

    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(
        agentContext,
        throwingStream([], error),
      )) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);
    expect(events).toEqual([]);
  });

  test("does not process queued context events after guardrail rollback", async () => {
    const error = guardrailErrorFactories[0]!.create();
    const agentContext = createContext();
    const firstContextItem = {
      ...contextWidgetItem(),
      id: "widget_before_guardrail",
    };
    const secondContextItem = {
      ...contextWidgetItem(),
      id: "widget_after_guardrail",
    };

    agentContext.stream({ type: "thread.item.done", item: firstContextItem });

    async function* runWithQueuedContext() {
      yield rawResponse({
        type: "response.output_item.added",
        item: { type: "message", id: "sdk_message" },
      });
      agentContext.stream({ type: "thread.item.done", item: secondContextItem });
      throw error;
    }

    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(agentContext, runWithQueuedContext())) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);

    expect(events).toEqual([
      { type: "thread.item.done", item: firstContextItem },
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      { type: "thread.item.removed", item_id: "widget_before_guardrail" },
      { type: "thread.item.removed", item_id: "sdk_message" },
    ]);
  });

  test("does not remove context replaced items before rethrowing guardrail errors", async () => {
    const error = guardrailErrorFactories[0]!.create();
    const agentContext = createContext();
    const replacementItem: Extract<ThreadItem, { type: "assistant_message" }> = {
      id: "ctx_replacement",
      thread_id: thread.id,
      created_at: now,
      type: "assistant_message",
      content: [{ type: "output_text", text: "Replacement output", annotations: [] }],
    };

    agentContext.stream({ type: "thread.item.replaced", item: replacementItem });

    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(
        agentContext,
        throwingStream(
          [
            rawResponse({
              type: "response.output_item.added",
              item: { type: "message", id: "sdk_message" },
            }),
          ],
          error,
        ),
      )) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);

    expect(events).toEqual([
      {
        type: "thread.item.replaced",
        item: replacementItem,
      },
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      { type: "thread.item.removed", item_id: "sdk_message" },
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

  test("preserves initial assistant content on output item added events", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: {
              type: "message",
              id: "msg_initial",
              content: [
                {
                  type: "output_text",
                  text: "Initial text",
                  annotations: [
                    {
                      type: "url_citation",
                      url: "https://example.com/source",
                      title: "Example Source",
                      end_index: 12,
                    },
                  ],
                },
                { type: "refusal", refusal: "I can't help with that." },
              ],
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_initial",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [
            {
              type: "output_text",
              text: "Initial text",
              annotations: [
                {
                  type: "annotation",
                  source: {
                    type: "url",
                    url: "https://example.com/source",
                    title: "Example Source",
                  },
                  index: 12,
                },
              ],
            },
            { type: "output_text", text: "I can't help with that.", annotations: [] },
          ],
        },
      },
    ]);
  });

  test("skips unsupported initial assistant content parts", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: {
              type: "message",
              id: "msg_unsupported_initial",
              content: [
                { type: "reasoning_text", text: "private reasoning" },
                { type: "input_text", text: "not assistant output" },
              ],
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_unsupported_initial",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
    ]);
  });

  test("maps response.content_part.added output text and refusal parts", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_parts" },
          }),
          rawResponse({
            type: "response.content_part.added",
            item_id: "msg_parts",
            content_index: 0,
            part: {
              type: "output_text",
              text: "Visible text",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://example.com/source",
                  title: "Example Source",
                  end_index: 12,
                },
              ],
            },
          }),
          rawResponse({
            type: "response.content_part.added",
            item_id: "msg_parts",
            content_index: 1,
            part: { type: "refusal", refusal: "I can't help with that." },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_parts",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_parts",
        update: {
          type: "assistant_message.content_part.added",
          content_index: 0,
          content: {
            type: "output_text",
            text: "Visible text",
            annotations: [
              {
                type: "annotation",
                source: {
                  type: "url",
                  url: "https://example.com/source",
                  title: "Example Source",
                },
                index: 12,
              },
            ],
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_parts",
        update: {
          type: "assistant_message.content_part.added",
          content_index: 1,
          content: { type: "output_text", text: "I can't help with that.", annotations: [] },
        },
      },
    ]);
  });

  test("ignores reasoning text content parts", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_reasoning_part" },
          }),
          rawResponse({
            type: "response.content_part.added",
            item_id: "msg_reasoning_part",
            content_index: 0,
            part: { type: "reasoning_text", text: "private reasoning" },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_reasoning_part",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
    ]);
  });

  test("maps refusal delta and done events to assistant text updates", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_refusal_stream" },
          }),
          rawResponse({
            type: "response.refusal.delta",
            item_id: "msg_refusal_stream",
            content_index: 0,
            delta: "I can't",
          }),
          rawResponse({
            type: "response.refusal.delta",
            item_id: "msg_refusal_stream",
            content_index: 0,
            delta: " help.",
          }),
          rawResponse({
            type: "response.refusal.done",
            item_id: "msg_refusal_stream",
            content_index: 0,
            refusal: "I can't help.",
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_refusal_stream",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_refusal_stream",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "I can't",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_refusal_stream",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: " help.",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_refusal_stream",
        update: {
          type: "assistant_message.content_part.done",
          content_index: 0,
          content: { type: "output_text", text: "I can't help.", annotations: [] },
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

  test("preserves refusal parts in final assistant messages", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_refusal" },
          }),
          rawResponse({
            type: "response.output_item.done",
            item: {
              type: "message",
              id: "msg_refusal",
              content: [
                { type: "output_text", text: "Allowed text", annotations: [] },
                { type: "refusal", refusal: "I can't help with that." },
              ],
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_refusal",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "msg_refusal",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [
            { type: "output_text", text: "Allowed text", annotations: [] },
            { type: "output_text", text: "I can't help with that.", annotations: [] },
          ],
        },
      },
    ]);
  });

  test("preserves refusal parts from normalized response_done events", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawModel({
            type: "response_done",
            response: {
              id: "resp_refusal",
              output: [
                {
                  type: "message",
                  id: "msg_refusal",
                  role: "assistant",
                  status: "completed",
                  content: [{ type: "refusal", refusal: "No, I cannot comply." }],
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
        type: "thread.item.done",
        item: {
          id: "msg_refusal",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [{ type: "output_text", text: "No, I cannot comply.", annotations: [] }],
        },
      },
    ]);
  });

  test("ignores normalized response_done events without assistant messages", async () => {
    const agentContext = createContext();

    await expect(
      collect(
        streamAgentResponse(
          agentContext,
          streamedRun([
            rawModel({
              type: "response_done",
              response: {
                id: "resp_tool_only",
                output: [
                  {
                    type: "tool_search_call",
                    id: "tool_search_1",
                    call_id: "call_1",
                    execution: "server",
                    arguments: {},
                  },
                ],
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
              },
            }),
          ]),
        ),
      ),
    ).resolves.toEqual([]);
  });

  test("does not emit duplicate assistant done events for later tool-only responses", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({ type: "output_text_delta", delta: "Hello" }),
          rawModel({
            type: "response_done",
            response: {
              id: "resp_text",
              output: [
                {
                  type: "message",
                  id: "msg_real",
                  role: "assistant",
                  status: "completed",
                  content: [{ type: "output_text", text: "Hello" }],
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
          rawModel({
            type: "response_done",
            response: {
              id: "resp_tool_only",
              output: [
                {
                  type: "tool_search_call",
                  id: "tool_search_1",
                  call_id: "call_1",
                  execution: "server",
                  arguments: {},
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
        ]),
      ),
    );

    expect(events.filter((event) => event.type === "thread.item.done")).toHaveLength(1);
  });

  test("starts a new assistant item after each normalized response_done", async () => {
    const store = new RecordingMessageIdStore();
    const agentContext = createContext(store);
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({ type: "output_text_delta", delta: "Hello" }),
          rawModel({
            type: "response_done",
            response: {
              id: "resp_first",
              output: [
                {
                  type: "message",
                  id: "msg_first",
                  role: "assistant",
                  status: "completed",
                  content: [{ type: "output_text", text: "Hello" }],
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
          rawModel({
            type: "response_done",
            response: {
              id: "resp_tool_only",
              output: [
                {
                  type: "tool_search_call",
                  id: "tool_search_1",
                  call_id: "call_1",
                  execution: "server",
                  arguments: {},
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
          rawModel({ type: "output_text_delta", delta: "Goodbye" }),
          rawModel({
            type: "response_done",
            response: {
              id: "resp_second",
              output: [
                {
                  type: "message",
                  id: "msg_second",
                  role: "assistant",
                  status: "completed",
                  content: [{ type: "output_text", text: "Goodbye" }],
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
        ]),
      ),
    );

    expect(store.messageIds).toEqual(["message_generated_1", "message_generated_2"]);
    expect(events.filter((event) => event.type === "thread.item.added")).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated_1",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.added",
        item: {
          id: "message_generated_2",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
    ]);
    expect(events.filter((event) => event.type === "thread.item.done")).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "message_generated_1",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [{ type: "output_text", text: "Hello", annotations: [] }],
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated_2",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [{ type: "output_text", text: "Goodbye", annotations: [] }],
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

  test("dedupes normalized and nested provider text deltas for the same SDK chunk", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({
            type: "output_text_delta",
            item_id: "msg_1",
            content_index: 0,
            delta: "same",
          }),
          rawModel({
            type: "model",
            event: {
              type: "response.output_text.delta",
              item_id: "msg_1",
              content_index: 0,
              delta: "same",
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
          delta: "same",
        },
      },
    ]);
  });

  test("preserves repeated text deltas from the same stream channel", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({
            type: "output_text_delta",
            item_id: "msg_1",
            content_index: 0,
            delta: "ha",
          }),
          rawModel({
            type: "output_text_delta",
            item_id: "msg_1",
            content_index: 0,
            delta: "ha",
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
          delta: "ha",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "ha",
        },
      },
    ]);
  });

  test("preserves matching raw response text deltas after normalized text deltas", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({
            type: "output_text_delta",
            item_id: "msg_1",
            content_index: 0,
            delta: "same",
          }),
          rawResponse({
            type: "response.output_text.delta",
            item_id: "msg_1",
            content_index: 0,
            delta: "same",
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
          delta: "same",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "same",
        },
      },
    ]);
  });

  test("does not dedupe refusal deltas that match a normalized text delta", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({
            type: "output_text_delta",
            item_id: "msg_1",
            content_index: 0,
            delta: "No",
          }),
          rawModel({
            type: "model",
            event: {
              type: "response.refusal.delta",
              item_id: "msg_1",
              content_index: 0,
              delta: "No",
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
          delta: "No",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "No",
        },
      },
    ]);
  });

  test("maps reasoning summary streams into workflow thought tasks", async () => {
    const store = new TestStore();
    const agentContext = createContext(store);
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "reasoning", id: "resp_1", summary: [] },
          }),
          rawResponse({
            type: "response.reasoning_summary_text.delta",
            item_id: "resp_1",
            summary_index: 0,
            delta: "Think",
          }),
          rawResponse({
            type: "response.reasoning_summary_text.delta",
            item_id: "resp_1",
            summary_index: 0,
            delta: "ing 1",
          }),
          rawResponse({
            type: "response.reasoning_summary_text.done",
            item_id: "resp_1",
            summary_index: 0,
            text: "Thinking 1",
          }),
          rawResponse({
            type: "response.reasoning_summary_text.delta",
            item_id: "resp_1",
            summary_index: 1,
            delta: "Think",
          }),
          rawResponse({
            type: "response.reasoning_summary_text.delta",
            item_id: "resp_1",
            summary_index: 1,
            delta: "ing 2",
          }),
          rawResponse({
            type: "response.reasoning_summary_text.done",
            item_id: "resp_1",
            summary_index: 1,
            text: "Thinking 2",
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "reasoning",
            tasks: [],
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.added",
          task_index: 0,
          task: { type: "thought", content: "Think", status_indicator: "none" },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.updated",
          task_index: 0,
          task: { type: "thought", content: "Thinking 1", status_indicator: "none" },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.updated",
          task_index: 0,
          task: { type: "thought", content: "Thinking 1", status_indicator: "none" },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.added",
          task_index: 1,
          task: { type: "thought", content: "Thinking 2", status_indicator: "none" },
        },
      },
    ]);
    expect(store.savedThreadItems).toEqual([
      {
        threadId: "thr_1",
        context: requestContext,
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "reasoning",
            tasks: [
              { type: "thought", content: "Thinking 1", status_indicator: "none" },
              { type: "thought", content: "Thinking 2", status_indicator: "none" },
            ],
            expanded: false,
          },
        },
      },
    ]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("maps nested provider reasoning events through the raw model path", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawModel({
            type: "model",
            event: {
              type: "response.output_item.added",
              item: { type: "reasoning", id: "resp_1", summary: [] },
            },
          }),
          rawModel({
            type: "model",
            event: {
              type: "response.reasoning_summary_text.done",
              item_id: "resp_1",
              summary_index: 0,
              text: "Nested thought",
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: { type: "reasoning", tasks: [], expanded: false },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.added",
          task_index: 0,
          task: { type: "thought", content: "Nested thought", status_indicator: "none" },
        },
      },
    ]);
  });

  test("ends active reasoning workflows before assistant message items", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "reasoning", id: "resp_1", summary: [] },
          }),
          rawResponse({
            type: "response.reasoning_summary_text.done",
            item_id: "resp_1",
            summary_index: 0,
            text: "Thinking 1",
          }),
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_1" },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: { type: "reasoning", tasks: [], expanded: false },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.added",
          task_index: 0,
          task: { type: "thought", content: "Thinking 1", status_indicator: "none" },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "reasoning",
            tasks: [{ type: "thought", content: "Thinking 1", status_indicator: "none" }],
            summary: { duration: 0 },
            expanded: false,
          },
        },
      },
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
    ]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("ends active reasoning workflows before normalized assistant text", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "reasoning", id: "resp_1", summary: [] },
          }),
          rawResponse({
            type: "response.reasoning_summary_text.done",
            item_id: "resp_1",
            summary_index: 0,
            text: "Thinking 1",
          }),
          rawModel({ type: "output_text_delta", delta: "Hello" }),
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
                  content: [{ type: "output_text", text: "Hello" }],
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
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: { type: "reasoning", tasks: [], expanded: false },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "workflow_generated",
        update: {
          type: "workflow.task.added",
          task_index: 0,
          task: { type: "thought", content: "Thinking 1", status_indicator: "none" },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "reasoning",
            tasks: [{ type: "thought", content: "Thinking 1", status_indicator: "none" }],
            summary: { duration: 0 },
            expanded: false,
          },
        },
      },
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
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [{ type: "output_text", text: "Hello", annotations: [] }],
        },
      },
    ]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("preserves existing workflow summaries when auto-ending before assistant messages", async () => {
    const agentContext = createContext();
    agentContext.workflowItem = {
      id: "wf_existing",
      thread_id: thread.id,
      created_at: now,
      type: "workflow",
      workflow: {
        type: "custom",
        tasks: [{ type: "custom", title: "Test", status_indicator: "complete" }],
        summary: { title: "Test" },
        expanded: true,
      },
    };

    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_1" },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "wf_existing",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Test", status_indicator: "complete" }],
            summary: { title: "Test" },
            expanded: false,
          },
        },
      },
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
    ]);
    expect(agentContext.workflowItem).toBeNull();
  });

  test("merges context workflow helper events with SDK stream events", async () => {
    const agentContext = createContext();

    agentContext.addWorkflowTask({ type: "custom", title: "Prepare", status_indicator: "complete" });
    agentContext.endWorkflow({ title: "Prepared" });

    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_1" },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
            summary: { title: "Prepared" },
            expanded: false,
          },
        },
      },
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

  test("emits compacted streaming annotation added events", async () => {
    const agentContext = createContext();
    const events = await collect(
      streamAgentResponse(
        agentContext,
        streamedRun([
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_1",
            content_index: 0,
            annotation_index: 0,
            annotation: {
              type: "file_citation",
              file_id: "file_invalid",
              filename: "",
              index: 0,
            },
          }),
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_1",
            content_index: 0,
            annotation_index: 1,
            annotation: {
              type: "container_file_citation",
              container_id: "container_1",
              file_id: "file_123",
              filename: "container.txt",
              start_index: 0,
              end_index: 3,
            },
          }),
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_1",
            content_index: 0,
            annotation_index: 2,
            annotation: {
              type: "url_citation",
              url: "https://example.com",
              title: "Example",
              start_index: 1,
              end_index: 5,
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
          type: "assistant_message.content_part.annotation_added",
          content_index: 0,
          annotation_index: 0,
          annotation: {
            type: "annotation",
            source: { type: "file", filename: "container.txt", title: "container.txt" },
            index: 3,
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.annotation_added",
          content_index: 0,
          annotation_index: 1,
          annotation: {
            type: "annotation",
            source: { type: "url", url: "https://example.com", title: "Example" },
            index: 5,
          },
        },
      },
    ]);
  });

  test("compacts streaming annotation indices per content part", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_multi_part",
            content_index: 1,
            annotation_index: 0,
            annotation: {
              type: "file_citation",
              file_id: "file_invalid",
              filename: "",
              index: 0,
            },
          }),
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_multi_part",
            content_index: 1,
            annotation_index: 1,
            annotation: {
              type: "url_citation",
              url: "https://example.com/part-one",
              title: "Part One",
              end_index: 8,
            },
          }),
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_multi_part",
            content_index: 0,
            annotation_index: 2,
            annotation: {
              type: "container_file_citation",
              container_id: "container_1",
              file_id: "file_123",
              filename: "container.txt",
              end_index: 3,
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.updated",
        item_id: "msg_multi_part",
        update: {
          type: "assistant_message.content_part.annotation_added",
          content_index: 1,
          annotation_index: 0,
          annotation: {
            type: "annotation",
            source: { type: "url", url: "https://example.com/part-one", title: "Part One" },
            index: 8,
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_multi_part",
        update: {
          type: "assistant_message.content_part.annotation_added",
          content_index: 0,
          annotation_index: 0,
          annotation: {
            type: "annotation",
            source: { type: "file", filename: "container.txt", title: "container.txt" },
            index: 3,
          },
        },
      },
    ]);
  });

  test("emits output text done events without annotations after streaming annotations", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_done_annotations",
            content_index: 0,
            annotation_index: 0,
            annotation: {
              type: "url_citation",
              url: "https://example.com",
              title: "Example",
              end_index: 5,
            },
          }),
          rawResponse({
            type: "response.output_text.done",
            item_id: "msg_done_annotations",
            content_index: 0,
            text: "Hello!",
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.updated",
        item_id: "msg_done_annotations",
        update: {
          type: "assistant_message.content_part.annotation_added",
          content_index: 0,
          annotation_index: 0,
          annotation: {
            type: "annotation",
            source: { type: "url", url: "https://example.com", title: "Example" },
            index: 5,
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_done_annotations",
        update: {
          type: "assistant_message.content_part.done",
          content_index: 0,
          content: { type: "output_text", text: "Hello!", annotations: [] },
        },
      },
    ]);
  });

  test("uses custom converters for streaming annotation events", async () => {
    class CustomConverter extends ResponseStreamConverter {
      readonly calls: string[] = [];

      override fileCitationToAnnotation(_annotation: unknown): Annotation | null {
        this.calls.push("file");
        return {
          type: "annotation",
          source: {
            type: "file",
            filename: "custom.pdf",
            title: "Custom Report",
            description: "Custom citation metadata",
          },
          index: 111,
        };
      }
    }

    const converter = new CustomConverter();
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawModel({
            type: "model",
            event: {
              type: "response.output_text.annotation.added",
              item_id: "msg_1",
              content_index: 0,
              annotation_index: 0,
              annotation: {
                type: "file_citation",
                file_id: "file_123",
                filename: "report.pdf",
                index: 0,
              },
            },
          }),
        ]),
        { converter },
      ),
    );

    expect(converter.calls).toEqual(["file"]);
    expect(events).toEqual([
      {
        type: "thread.item.updated",
        item_id: "msg_1",
        update: {
          type: "assistant_message.content_part.annotation_added",
          content_index: 0,
          annotation_index: 0,
          annotation: {
            type: "annotation",
            source: {
              type: "file",
              filename: "custom.pdf",
              title: "Custom Report",
              description: "Custom citation metadata",
            },
            index: 111,
          },
        },
      },
    ]);
  });

  test("includes converted annotations in final response output items", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.done",
            item: {
              type: "message",
              id: "msg_1",
              content: [
                {
                  type: "output_text",
                  text: "Hello!",
                  annotations: [
                    {
                      type: "url_citation",
                      url: "https://example.com",
                      title: "Example",
                      start_index: 0,
                      end_index: 6,
                    },
                  ],
                },
              ],
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "msg_1",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [
            {
              type: "output_text",
              text: "Hello!",
              annotations: [
                {
                  type: "annotation",
                  source: { type: "url", url: "https://example.com", title: "Example" },
                  index: 6,
                },
              ],
            },
          ],
        },
      },
    ]);
  });

  test("filters mixed final assistant content annotations", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.done",
            item: {
              type: "message",
              id: "msg_mixed_annotations",
              content: [
                {
                  type: "output_text",
                  text: "See the cited sources.",
                  annotations: [
                    {
                      type: "file_citation",
                      file_id: "file_123",
                      filename: "report.pdf",
                      index: 0,
                    },
                    {
                      type: "file_path",
                      file_id: "file_path_1",
                      index: 2,
                    },
                    {
                      type: "container_file_citation",
                      container_id: "container_1",
                      file_id: "file_456",
                      filename: "container.txt",
                      start_index: 1,
                      end_index: 4,
                    },
                    {
                      type: "url_citation",
                      url: "https://example.com/untitled",
                      title: "",
                      start_index: 5,
                      end_index: 12,
                    },
                    {
                      type: "url_citation",
                      url: "https://example.com/bad-title",
                      title: 123,
                      end_index: 13,
                    },
                    {
                      type: "file_citation",
                      file_id: "file_empty",
                      filename: "",
                      index: 14,
                    },
                    "not an annotation",
                  ],
                },
                { type: "refusal", refusal: "I can't summarize the hidden material." },
                {
                  type: "output_text",
                  text: "Second content part.",
                  annotations: [
                    {
                      type: "url_citation",
                      url: "https://example.com/second",
                      title: "Second",
                      end_index: 6,
                    },
                  ],
                },
              ],
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "msg_mixed_annotations",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [
            {
              type: "output_text",
              text: "See the cited sources.",
              annotations: [
                {
                  type: "annotation",
                  source: { type: "file", filename: "report.pdf", title: "report.pdf" },
                  index: 0,
                },
                {
                  type: "annotation",
                  source: { type: "file", filename: "container.txt", title: "container.txt" },
                  index: 4,
                },
                {
                  type: "annotation",
                  source: { type: "url", url: "https://example.com/untitled", title: "" },
                  index: 12,
                },
              ],
            },
            {
              type: "output_text",
              text: "I can't summarize the hidden material.",
              annotations: [],
            },
            {
              type: "output_text",
              text: "Second content part.",
              annotations: [
                {
                  type: "annotation",
                  source: { type: "url", url: "https://example.com/second", title: "Second" },
                  index: 6,
                },
              ],
            },
          ],
        },
      },
    ]);
  });

  test("includes converted annotations in normalized response_done outputs", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawModel({ type: "output_text_delta", delta: "Hello!" }),
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
                  content: [
                    {
                      type: "output_text",
                      text: "Hello!",
                      annotations: [
                        {
                          type: "file_citation",
                          file_id: "file_123",
                          filename: "report.pdf",
                          index: 4,
                        },
                      ],
                    },
                  ],
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
        ]),
      ),
    );

    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "message_generated",
        thread_id: "thr_1",
        created_at: now,
        type: "assistant_message",
        content: [
          {
            type: "output_text",
            text: "Hello!",
            annotations: [
              {
                type: "annotation",
                source: { type: "file", filename: "report.pdf", title: "report.pdf" },
                index: 4,
              },
            ],
          },
        ],
      },
    });
  });

  test("filters normalized response_done annotations", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawModel({
            type: "response_done",
            response: {
              id: "resp_filter_annotations",
              output: [
                {
                  type: "message",
                  id: "msg_filtered",
                  role: "assistant",
                  status: "completed",
                  content: [
                    {
                      type: "output_text",
                      text: "Filtered annotations.",
                      annotations: [
                        {
                          type: "container_file_citation",
                          container_id: "container_1",
                          file_id: "file_123",
                          filename: "container.txt",
                          end_index: 8,
                        },
                        { type: "file_path", file_id: "file_path_1", index: 3 },
                        {
                          type: "url_citation",
                          url: "https://example.com/no-title",
                          title: null,
                          end_index: 9,
                        },
                      ],
                    },
                  ],
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
        ]),
      ),
    );

    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "msg_filtered",
        thread_id: "thr_1",
        created_at: now,
        type: "assistant_message",
        content: [
          {
            type: "output_text",
            text: "Filtered annotations.",
            annotations: [
              {
                type: "annotation",
                source: { type: "file", filename: "container.txt", title: "container.txt" },
                index: 8,
              },
            ],
          },
        ],
      },
    });
  });

  test("maps image generation added and done events", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "image_generation_call", id: "img_call_1" },
          }),
          rawResponse({
            type: "response.output_item.done",
            item: { type: "image_generation_call", id: "img_call_1", result: "dGVzdA==" },
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
          type: "generated_image",
          image: null,
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "generated_image",
          image: {
            id: "img_call_1",
            url: "data:image/png;base64,dGVzdA==",
          },
        },
      },
    ]);
  });

  test("uses custom converters for final image generation URLs", async () => {
    class CustomConverter extends ResponseStreamConverter {
      readonly calls: Array<[string, string, number | null]> = [];

      override async base64ImageToUrl(
        imageId: string,
        base64Image: string,
        partialImageIndex: number | null = null,
      ): Promise<string> {
        this.calls.push([imageId, base64Image, partialImageIndex]);
        return `https://example.com/${imageId}.png`;
      }
    }

    const converter = new CustomConverter();
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "image_generation_call", id: "img_call_1" },
          }),
          rawResponse({
            type: "response.output_item.done",
            item: { type: "image_generation_call", id: "img_call_1", result: "dGVzdA==" },
          }),
        ]),
        { converter },
      ),
    );

    expect(converter.calls).toEqual([["img_call_1", "dGVzdA==", null]]);
    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "message_generated",
        thread_id: "thr_1",
        created_at: now,
        type: "generated_image",
        image: { id: "img_call_1", url: "https://example.com/img_call_1.png" },
      },
    });
  });

  test("ignores final image generation events without an active image item or result", async () => {
    await expect(
      collect(
        streamAgentResponse(
          createContext(),
          streamedRun([
            rawResponse({
              type: "response.output_item.done",
              item: { type: "image_generation_call", id: "img_call_1", result: "dGVzdA==" },
            }),
            rawResponse({
              type: "response.output_item.added",
              item: { type: "image_generation_call", id: "img_call_2" },
            }),
            rawResponse({
              type: "response.output_item.done",
              item: { type: "image_generation_call", id: "img_call_2" },
            }),
          ]),
        ),
      ),
    ).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "generated_image",
          image: null,
        },
      },
    ]);
  });

  test("clears active generated image state when final event has no result", async () => {
    await expect(
      collect(
        streamAgentResponse(
          createContext(),
          streamedRun([
            rawResponse({
              type: "response.output_item.added",
              item: { type: "image_generation_call", id: "img_call_1" },
            }),
            rawResponse({
              type: "response.output_item.done",
              item: { type: "image_generation_call", id: "img_call_1" },
            }),
            rawResponse({
              type: "response.output_item.done",
              item: { type: "image_generation_call", id: "img_call_2", result: "dGVzdA==" },
            }),
          ]),
        ),
      ),
    ).resolves.toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "generated_image",
          image: null,
        },
      },
    ]);
  });

  test("maps partial image progress updates", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "image_generation_call", id: "img_call_1" },
          }),
          rawResponse({
            type: "response.image_generation_call.partial_image",
            item_id: "img_call_1",
            partial_image_b64: "cGFydGlhbA==",
            partial_image_index: 1,
          }),
          rawResponse({
            type: "response.output_item.done",
            item: { type: "image_generation_call", id: "img_call_1", result: "ZmluYWw=" },
          }),
        ]),
        { converter: new ResponseStreamConverter({ partialImages: 3 }) },
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "generated_image",
          image: null,
        },
      },
      {
        type: "thread.item.updated",
        item_id: "message_generated",
        update: {
          type: "generated_image.updated",
          image: {
            id: "img_call_1",
            url: "data:image/png;base64,cGFydGlhbA==",
          },
          progress: 1 / 3,
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "generated_image",
          image: {
            id: "img_call_1",
            url: "data:image/png;base64,ZmluYWw=",
          },
        },
      },
    ]);
  });

  test("uses custom converters for partial image updates and nested provider events", async () => {
    class CustomConverter extends ResponseStreamConverter {
      readonly calls: Array<[string, string, number | null]> = [];

      override base64ImageToUrl(
        imageId: string,
        base64Image: string,
        partialImageIndex: number | null = null,
      ): string {
        this.calls.push([imageId, base64Image, partialImageIndex]);
        const suffix = partialImageIndex === null ? "final" : `partial-${partialImageIndex}`;
        return `https://example.com/${imageId}/${suffix}.png`;
      }
    }

    const converter = new CustomConverter({ partialImages: 4 });
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawModel({
            type: "model",
            event: {
              type: "response.output_item.added",
              item: { type: "image_generation_call", id: "img_call_1" },
            },
          }),
          rawModel({
            type: "model",
            event: {
              type: "response.image_generation_call.partial_image",
              item_id: "img_call_1",
              partial_image_b64: "cGFydGlhbA==",
              partial_image_index: 2,
            },
          }),
          rawModel({
            type: "model",
            event: {
              type: "response.output_item.done",
              item: { type: "image_generation_call", id: "img_call_1", result: "ZmluYWw=" },
            },
          }),
        ]),
        { converter },
      ),
    );

    expect(converter.calls).toEqual([
      ["img_call_1", "cGFydGlhbA==", 2],
      ["img_call_1", "ZmluYWw=", null],
    ]);
    expect(events[1]).toEqual({
      type: "thread.item.updated",
      item_id: "message_generated",
      update: {
        type: "generated_image.updated",
        image: {
          id: "img_call_1",
          url: "https://example.com/img_call_1/partial-2.png",
        },
        progress: 0.5,
      },
    });
    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "message_generated",
        thread_id: "thr_1",
        created_at: now,
        type: "generated_image",
        image: {
          id: "img_call_1",
          url: "https://example.com/img_call_1/final.png",
        },
      },
    });
  });

  test("ignores partial image updates without an active generated image item", async () => {
    await expect(
      collect(
        streamAgentResponse(
          createContext(),
          streamedRun([
            rawResponse({
              type: "response.image_generation_call.partial_image",
              item_id: "img_call_1",
              partial_image_b64: "cGFydGlhbA==",
              partial_image_index: 1,
            }),
          ]),
        ),
      ),
    ).resolves.toEqual([]);
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
