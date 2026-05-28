# ChatKit Agents Workflow Lifecycle Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resume, preserve, and close active Agents workflows across streamed response turns with strict Python parity.

**Architecture:** Keep `AgentContext.workflowItem` as the single active workflow state. Add stream-bridge lifecycle helpers in `src/agents/workflows.ts`, and call them from `streamAgentResponse(...)` before stream merge, around context-event yields, and before pending client tool call emission at normal stream completion.

**Tech Stack:** Bun, TypeScript, Zod-validated ChatKit schemas, `bun:test`, existing fixture-shaped `@openai/agents` streams.

---

## Scope Check

This plan implements the approved workflow lifecycle continuity spec:

- Resume an active workflow from the latest stored workflow item, or from the item before a latest `client_tool_call`.
- Persist an active workflow silently at normal stream completion so the next turn can continue it.
- End active workflows before context-emitted visible items.
- Preserve existing reasoning workflow stream behavior.

It does not add guardrail rollback, produced-item cleanup, widget helper APIs, input replay, schema changes, or server event-processing changes.

Commit checkpoints appear in the plan for review-sized boundaries. Only run commit commands when the operator has explicitly requested commits.

## File Structure

- Modify: `tests/agents.test.ts`
  - Update `TestStore` so Agents stream tests can use `loadThreadItems(...)` and record `addThreadItem(...)`.
  - Add workflow continuity tests inside `describe("streamAgentResponse", () => { ... })`.
- Modify: `src/agents/workflows.ts`
  - Add internal helpers for workflow resume, visible-item auto-end decisions, and silent open-workflow persistence.
- Modify: `src/agents/stream.ts`
  - Load resumable workflow state before stream merge.
  - Process context events through workflow auto-end/tracking logic.
  - Upsert an open workflow with a current `created_at` before yielding a pending client tool call at normal completion.
- Modify: `src/server.ts`
  - Upsert `thread.item.done` events for already-stored resumed items while keeping insert-only persistence for items added in the current stream.
- Modify: `tests/server.test.ts`
  - Add a SQLite-backed regression for finalizing a resumed workflow item.

## Task 1: Resume Stored Workflows

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `tests/server.test.ts`
- Modify: `src/agents/workflows.ts`
- Modify: `src/agents/stream.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Update the Agents test store for thread item history**

In `tests/agents.test.ts`, replace the start of `TestStore` with this shape:

```ts
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
```

Replace `loadThreadItems(...)` with:

```ts
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
```

Replace `addThreadItem(...)` with:

```ts
  override async addThreadItem(
    threadId: string,
    item: ThreadItem,
    context: RequestContext,
  ): Promise<void> {
    this.addedThreadItems.push({ threadId, item: structuredClone(item), context });
  }
```

Replace `saveItem(...)` with:

```ts
  override async saveItem(threadId: string, item: ThreadItem, context: RequestContext): Promise<void> {
    this.savedThreadItems.push({ threadId, item: structuredClone(item), context });
  }
```

Expected: existing tests still typecheck because `TestStore` keeps the same default constructor behavior and returns an empty history page unless seeded.

- [ ] **Step 2: Add failing resume tests**

In `tests/agents.test.ts`, add these helpers near `createContext(...)`:

```ts
function storedWorkflowItem(overrides: Partial<Extract<ThreadItem, { type: "workflow" }>> = {}): Extract<ThreadItem, { type: "workflow" }> {
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
```

Add these tests inside `describe("streamAgentResponse", () => { ... })`, before `"yields context-only events when the SDK stream is empty"`:

```ts
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
```

- [ ] **Step 3: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: FAIL because `streamAgentResponse(...)` has not loaded stored workflow state before accepting context helper events.

- [ ] **Step 4: Add workflow resume helpers**

In `src/agents/workflows.ts`, add this after the exported event type aliases:

```ts
export function isWorkflowItem(item: ThreadItem | undefined): item is WorkflowItem {
  return item?.type === "workflow";
}
```

Add this after `workflowAddedEvent(...)`:

```ts
export function resumeWorkflowFromThreadItems<TContext>(
  context: AgentContext<TContext>,
  items: readonly ThreadItem[],
): void {
  const latest = items[0];
  const secondLatest = items[1];

  if (isWorkflowItem(latest)) {
    context.workflowItem = latest;
    return;
  }

  if (latest?.type === "client_tool_call" && isWorkflowItem(secondLatest)) {
    context.workflowItem = secondLatest;
  }
}
```

- [ ] **Step 5: Load resumable workflow state in `streamAgentResponse(...)`**

In `src/agents/stream.ts`, add `resumeWorkflowFromThreadItems` to the workflow import:

```ts
import {
  appendWorkflowTask,
  createReasoningWorkflowItem,
  createThoughtTask,
  finishWorkflow,
  resumeWorkflowFromThreadItems,
  type ThoughtTask,
  updateWorkflowTaskEvent,
  workflowAddedEvent,
} from "./workflows";
```

At the top of `streamAgentResponse(...)`, after `const converter = ...`, add:

```ts
  const recentItems = await context.store.loadThreadItems(
    context.thread.id,
    null,
    2,
    "desc",
    context.context,
  );
  resumeWorkflowFromThreadItems(context, recentItems.data);
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS for the new resume tests and existing Agents tests.

- [ ] **Step 7: Add the resumed workflow finalization regression**

In `tests/server.test.ts`, add a test near the existing workflow persistence
tests that stores a workflow item, then streams a `thread.item.done` event for
the same workflow id with a summary and `expanded: false`.

Run the focused test before changing production code.

Expected: FAIL with a stream error caused by duplicate insert persistence.

- [ ] **Step 8: Upsert already-stored done items**

In `src/server.ts`, inside the `thread.item.done` branch of `processEvents(...)`,
persist with `addThreadItem(...)` when `pendingItem` exists and with
`saveItem(...)` when it does not.

This preserves insert-only persistence for normal added-then-done stream items
and allows resumed/stored workflow items to be finalized without duplicate id
failures.

- [ ] **Step 9: Verify Task 1**

Run:

```bash
bun test tests/server.test.ts
bun test tests/agents.test.ts
bun run typecheck
```

Expected: PASS.

## Task 2: Persist Open Workflows At Stream Completion

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/workflows.ts`
- Modify: `src/agents/stream.ts`

- [ ] **Step 1: Add failing silent-persist tests**

Add these tests in `tests/agents.test.ts` after the resume tests:

```ts
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
    expect(store.savedThreadItems).toEqual([]);
  });

  test("persists open workflows before yielding pending client tool calls", async () => {
    const store = new TestStore();
    const agentContext = createContext(store);

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Prepare", status_indicator: "loading" }],
      expanded: true,
    });
    agentContext.setClientToolCall(new ClientToolCall("get_selection"));
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events.at(-1)).toEqual({
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
    });
    expect(store.savedThreadItems.map((entry) => entry.item.type)).toEqual(["workflow"]);
  });
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: FAIL because open workflows are not yet persisted at stream completion.

- [ ] **Step 3: Add silent persist helper**

In `src/agents/workflows.ts`, add this after `finishWorkflow(...)`:

```ts
export async function persistOpenWorkflow<TContext>(
  context: AgentContext<TContext>,
): Promise<void> {
  const workflow = context.workflowItem;

  if (!workflow) {
    return;
  }

  await context.store.saveItem(
    context.thread.id,
    { ...workflow, created_at: context.createdAt() },
    context.context,
  );
  context.workflowItem = null;
}
```

- [ ] **Step 4: Persist before pending client tool call emission**

In `src/agents/stream.ts`, add `persistOpenWorkflow` to the workflow import:

```ts
  finishWorkflow,
  persistOpenWorkflow,
  resumeWorkflowFromThreadItems,
```

In `streamAgentResponse(...)`, replace:

```ts
    const clientToolCallEvent = pendingClientToolCallEvent(context, toolCallMetadataByName);
```

with:

```ts
    await persistOpenWorkflow(context);
    const clientToolCallEvent = pendingClientToolCallEvent(context, toolCallMetadataByName);
```

This ordering preserves Python's two-item resume window: the open workflow is upserted with a current timestamp before the pending client tool call is emitted and persisted by the server.

- [ ] **Step 5: Run focused tests**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS.

## Task 3: Auto-End Workflows Before Context Visible Items

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/workflows.ts`
- Modify: `src/agents/stream.ts`

- [ ] **Step 1: Add failing context auto-end tests**

Add these helpers near the stored item helpers in `tests/agents.test.ts`:

```ts
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
```

Add these tests after the silent-persist tests:

```ts
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

    agentContext.addWorkflowTask({ type: "custom", title: "Prepare", status_indicator: "complete" });
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
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: FAIL because context events are yielded without workflow auto-end handling.

- [ ] **Step 3: Add visible item and context-event helpers**

In `src/agents/workflows.ts`, add this after `resumeWorkflowFromThreadItems(...)`:

```ts
export function shouldAutoEndWorkflowForItem<TContext>(
  context: AgentContext<TContext>,
  item: ThreadItem,
): boolean {
  const workflow = context.workflowItem;

  return (
    workflow !== null &&
    item.id !== workflow.id &&
    item.type !== "client_tool_call" &&
    item.type !== "hidden_context_item" &&
    item.type !== "sdk_hidden_context"
  );
}
```

In `src/agents/stream.ts`, add `shouldAutoEndWorkflowForItem` and `isWorkflowItem` to the workflow import:

```ts
  finishWorkflow,
  isWorkflowItem,
  persistOpenWorkflow,
  resumeWorkflowFromThreadItems,
  shouldAutoEndWorkflowForItem,
```

Add this helper above `streamAgentResponse(...)`:

```ts
function contextEventsWithWorkflowLifecycle<TContext>(
  context: AgentContext<TContext>,
  event: ThreadStreamEvent,
): ThreadStreamEvent[] {
  if (event.type !== "thread.item.added" && event.type !== "thread.item.done") {
    return [event];
  }

  const events: ThreadStreamEvent[] = [];

  if (shouldAutoEndWorkflowForItem(context, event.item)) {
    const workflowDone = finishWorkflow(context);

    if (workflowDone) {
      events.push(workflowDone);
    }
  }

  if (event.type === "thread.item.added" && isWorkflowItem(event.item)) {
    context.workflowItem = event.item;
  }

  events.push(event);
  return events;
}
```

- [ ] **Step 4: Use context wrapper in both context-yield branches**

In `streamAgentResponse(...)`, replace each direct context yield:

```ts
          yield ThreadStreamEventSchema.parse(value);
```

and:

```ts
            yield ThreadStreamEventSchema.parse(value);
```

and:

```ts
          yield ThreadStreamEventSchema.parse(next.result.value);
```

with this loop using the relevant context event value:

```ts
          for (const event of contextEventsWithWorkflowLifecycle(context, value)) {
            yield ThreadStreamEventSchema.parse(event);
          }
```

Use `value` where the local variable is named `value`, and use `next.result.value` in the branch that has no local `value`.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
bun test tests/agents.test.ts
bun run typecheck
```

Expected: PASS.

## Final Verification

After all tasks complete, run:

```bash
bun run verify
git status --short --branch
```

Expected:

- TypeScript typecheck passes.
- All Bun tests pass.
- The implementation branch contains only the planned source, test, spec, plan, and `AGENTS.md` changes.

## Implementation Notes

- Use Bun tooling only.
- Keep `AgentContext.workflowItem` as the only active workflow state.
- Resume from stored items before creating SDK/context iterators that depend on active workflow state.
- Persist an open workflow with upsert semantics and a current `created_at` before yielding the pending client tool call event.
- Do not emit `thread.item.done` for silent end-of-run persistence.
- Keep reasoning workflow event shapes identical.
- Keep server changes limited to the tested upsert path for already-stored resumed items.
