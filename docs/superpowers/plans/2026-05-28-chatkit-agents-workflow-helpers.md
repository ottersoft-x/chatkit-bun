# ChatKit Agents Workflow Helpers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public `AgentContext` workflow helper methods and refactor reasoning workflow stream conversion to share the same lifecycle logic.

**Architecture:** Keep the public API on `AgentContext`, and move reusable workflow lifecycle logic into `src/agents/workflows.ts`. `AgentContext` enqueues helper events through its existing validated event queue, while `streamAgentResponse` calls the same shared helpers and returns events from SDK conversion without queueing them.

**Tech Stack:** Bun, TypeScript, Zod-validated ChatKit schemas, `bun:test`, existing fixture-shaped `@openai/agents` streams.

---

## Scope Check

This plan implements the approved workflow-helper slice:

- `AgentContext.startWorkflow(...)`
- `AgentContext.addWorkflowTask(...)`
- `AgentContext.updateWorkflowTask(...)`
- `AgentContext.endWorkflow(...)`
- `WorkflowSummary` type export from `src/types/core.ts`
- Shared internal workflow lifecycle helpers
- Reasoning workflow stream refactor onto shared lifecycle helpers
- Focused helper tests plus reasoning stream regression verification

It does not add cross-turn workflow resume, open-workflow persistence at stream end, visual-item auto-end behavior, guardrail rollback, widgets, or input replay.

## File Structure

- Modify: `src/types/core.ts`
  - Exports the `WorkflowSummary` type for the public `endWorkflow(...)` signature.
- Create: `src/agents/workflows.ts`
  - Owns reusable workflow item creation, workflow added/done events, duration summaries, thought task construction, and workflow task add/update event helpers.
- Modify: `src/agents/context.ts`
  - Adds public synchronous workflow helper methods backed by the shared workflow helpers.
- Modify: `src/agents/stream.ts`
  - Removes duplicate private workflow lifecycle helpers and uses `src/agents/workflows.ts`.
- Modify: `tests/agents.test.ts`
  - Adds helper API tests and keeps existing reasoning workflow stream regression tests green.

No schema or server changes are expected because workflow items, workflow summaries, and workflow task updates already exist.

## Task 1: Add Start And End Workflow Helpers

**Files:**
- Modify: `src/types/core.ts`
- Create: `src/agents/workflows.ts`
- Modify: `src/agents/context.ts`
- Modify: `tests/agents.test.ts`

- [ ] **Step 1: Write failing tests for `startWorkflow(...)` and `endWorkflow(...)`**

In `tests/agents.test.ts`, update the core type import:

```ts
import type { Annotation, Attachment, Page, ThreadItem, ThreadMetadata, WorkflowSummary } from "../src/types/core";
```

Add these tests inside the existing `describe("AgentContext", () => {` block, after the `"tracks the active workflow item for stream conversion"` test:

```ts
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
```

- [ ] **Step 2: Run focused tests and typecheck to verify the tests fail**

Run:

```bash
bun test tests/agents.test.ts
bun run typecheck
```

Expected:

- `bun test tests/agents.test.ts` fails because `startWorkflow(...)` and `endWorkflow(...)` do not exist.
- `bun run typecheck` fails because `WorkflowSummary`, `startWorkflow(...)`, and `endWorkflow(...)` are missing.

- [ ] **Step 3: Export `WorkflowSummary`**

In `src/types/core.ts`, replace:

```ts
export const WorkflowSummarySchema = z.union([
  z.object({ title: z.string(), icon: z.string().nullable().optional() }),
  z.object({ duration: z.number().int() }),
]);
```

with:

```ts
export const WorkflowSummarySchema = z.union([
  z.object({ title: z.string(), icon: z.string().nullable().optional() }),
  z.object({ duration: z.number().int() }),
]);
export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>;
```

- [ ] **Step 4: Create the shared workflow helper module**

Create `src/agents/workflows.ts`:

```ts
import { WorkflowSchema, type Task, type ThreadItem, type Workflow, type WorkflowSummary } from "../types/core";
import type { ThreadStreamEvent } from "../types/server";
import type { AgentContext } from "./context";

export type WorkflowItem = Extract<ThreadItem, { type: "workflow" }>;
export type ThoughtTask = Extract<WorkflowItem["workflow"]["tasks"][number], { type: "thought" }>;
export type ThreadItemAddedEvent = Extract<ThreadStreamEvent, { type: "thread.item.added" }>;
export type ThreadItemDoneEvent = Extract<ThreadStreamEvent, { type: "thread.item.done" }>;
export type ThreadItemUpdatedEvent = Extract<ThreadStreamEvent, { type: "thread.item.updated" }>;

export function createWorkflowItem<TContext>(
  context: AgentContext<TContext>,
  workflow: Workflow,
): WorkflowItem {
  const parsedWorkflow = WorkflowSchema.parse(workflow);

  return {
    id: context.store.generateItemId("workflow", context.thread, context.context),
    thread_id: context.thread.id,
    created_at: context.createdAt(),
    type: "workflow",
    workflow: parsedWorkflow,
  };
}

export function createReasoningWorkflowItem<TContext>(
  context: AgentContext<TContext>,
): WorkflowItem {
  return createWorkflowItem(context, {
    type: "reasoning",
    tasks: [],
    expanded: false,
  });
}

export function shouldEmitWorkflowAdded(workflow: Workflow): boolean {
  return workflow.type === "reasoning" || workflow.tasks.length > 0;
}

export function workflowAddedEvent(workflow: WorkflowItem): ThreadItemAddedEvent {
  return {
    type: "thread.item.added",
    item: workflow,
  };
}

export function durationSeconds(startedAt: string, endedAt: string): number {
  const started = Date.parse(startedAt);
  const ended = Date.parse(endedAt);

  if (!Number.isFinite(started) || !Number.isFinite(ended)) {
    return 0;
  }

  return Math.max(0, Math.floor((ended - started) / 1000));
}

export function finishWorkflow<TContext>(
  context: AgentContext<TContext>,
  summary?: WorkflowSummary,
  expanded = false,
): ThreadItemDoneEvent | null {
  const workflow = context.workflowItem;

  if (!workflow) {
    return null;
  }

  if (workflow.workflow.type !== "reasoning" && workflow.workflow.tasks.length === 0) {
    context.workflowItem = null;
    return null;
  }

  const endedAt = context.createdAt();
  const doneItem: WorkflowItem = {
    ...workflow,
    workflow: {
      ...workflow.workflow,
      summary:
        summary ??
        workflow.workflow.summary ??
        { duration: durationSeconds(workflow.created_at, endedAt) },
      expanded,
    },
  };
  context.workflowItem = null;

  return {
    type: "thread.item.done",
    item: doneItem,
  };
}
```

- [ ] **Step 5: Add `startWorkflow(...)` and `endWorkflow(...)` to `AgentContext`**

In `src/agents/context.ts`, replace the imports with:

```ts
import type { ThreadItem, Workflow, WorkflowSummary } from "../types/core";
import { ThreadStreamEventSchema, type ThreadStreamEvent } from "../types/server";
import type { AgentContextOptions, JsonObject } from "./types";
import {
  createWorkflowItem,
  finishWorkflow,
  shouldEmitWorkflowAdded,
  workflowAddedEvent,
} from "./workflows";
```

Add these methods after `closeEvents()`:

```ts
  startWorkflow(workflow: Workflow): void {
    const item = createWorkflowItem(this, workflow);
    this.workflowItem = item;

    if (shouldEmitWorkflowAdded(item.workflow)) {
      this.stream(workflowAddedEvent(item));
    }
  }

  endWorkflow(summary?: WorkflowSummary, expanded = false): void {
    const event = finishWorkflow(this, summary, expanded);

    if (event) {
      this.stream(event);
    }
  }
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS for the focused agents tests.

- [ ] **Step 7: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit start/end workflow helpers**

Run:

```bash
git add src/types/core.ts src/agents/context.ts src/agents/workflows.ts tests/agents.test.ts
git commit -m "Add Agents workflow start and end helpers"
```

Expected: Commit succeeds.

## Task 2: Add Workflow Task Helpers

**Files:**
- Modify: `src/agents/workflows.ts`
- Modify: `src/agents/context.ts`
- Modify: `tests/agents.test.ts`

- [ ] **Step 1: Write failing tests for `addWorkflowTask(...)` and `updateWorkflowTask(...)`**

In `tests/agents.test.ts`, add these tests inside the existing `describe("AgentContext", () => {` block, after the Task 1 workflow helper tests:

```ts
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
```

- [ ] **Step 2: Run focused tests and typecheck to verify the tests fail**

Run:

```bash
bun test tests/agents.test.ts
bun run typecheck
```

Expected:

- `bun test tests/agents.test.ts` fails because `addWorkflowTask(...)` and `updateWorkflowTask(...)` do not exist.
- `bun run typecheck` fails because the methods are missing from `AgentContext`.

- [ ] **Step 3: Add task helper functions to `src/agents/workflows.ts`**

In `src/agents/workflows.ts`, add this after `workflowAddedEvent(...)`:

```ts
export function createThoughtTask(content: string): ThoughtTask {
  return {
    type: "thought",
    content,
    status_indicator: "none",
  };
}

export function workflowTaskAddedEvent(
  workflow: WorkflowItem,
  task: Task,
  taskIndex: number,
): ThreadItemUpdatedEvent {
  return {
    type: "thread.item.updated",
    item_id: workflow.id,
    update: {
      type: "workflow.task.added",
      task_index: taskIndex,
      task,
    },
  };
}

export function workflowTaskUpdatedEvent(
  workflow: WorkflowItem,
  task: Task,
  taskIndex: number,
): ThreadItemUpdatedEvent {
  return {
    type: "thread.item.updated",
    item_id: workflow.id,
    update: {
      type: "workflow.task.updated",
      task_index: taskIndex,
      task,
    },
  };
}

export function appendWorkflowTask(workflow: WorkflowItem, task: Task): ThreadItemUpdatedEvent {
  workflow.workflow.tasks.push(task);
  return workflowTaskAddedEvent(workflow, task, workflow.workflow.tasks.length - 1);
}

export function updateWorkflowTaskEvent(
  workflow: WorkflowItem,
  task: Task,
  taskIndex: number,
): ThreadItemUpdatedEvent {
  if (taskIndex < 0 || taskIndex >= workflow.workflow.tasks.length) {
    throw new RangeError("Workflow task index is out of range");
  }

  workflow.workflow.tasks[taskIndex] = task;
  return workflowTaskUpdatedEvent(workflow, task, taskIndex);
}
```

- [ ] **Step 4: Add `addWorkflowTask(...)` and `updateWorkflowTask(...)` to `AgentContext`**

In `src/agents/context.ts`, ensure the imports include `Task`:

```ts
import type { Task, ThreadItem, Workflow, WorkflowSummary } from "../types/core";
```

Extend the workflow helper import:

```ts
import {
  appendWorkflowTask,
  createWorkflowItem,
  finishWorkflow,
  shouldEmitWorkflowAdded,
  updateWorkflowTaskEvent,
  workflowAddedEvent,
} from "./workflows";
```

Add these methods between `startWorkflow(...)` and `endWorkflow(...)`:

```ts
  addWorkflowTask(task: Task): void {
    if (!this.workflowItem) {
      this.workflowItem = createWorkflowItem(this, {
        type: "custom",
        tasks: [],
        expanded: false,
      });
    }

    const shouldEmitAdded =
      this.workflowItem.workflow.type !== "reasoning" &&
      this.workflowItem.workflow.tasks.length === 0;
    const event = appendWorkflowTask(this.workflowItem, task);

    this.stream(shouldEmitAdded ? workflowAddedEvent(this.workflowItem) : event);
  }

  updateWorkflowTask(task: Task, taskIndex: number): void {
    if (!this.workflowItem) {
      throw new Error("Workflow is not set");
    }

    this.stream(updateWorkflowTaskEvent(this.workflowItem, task, taskIndex));
  }
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit workflow task helpers**

Run:

```bash
git add src/agents/context.ts src/agents/workflows.ts tests/agents.test.ts
git commit -m "Add Agents workflow task helpers"
```

Expected: Commit succeeds.

## Task 3: Refactor Reasoning Workflow Streams To Shared Helpers

**Files:**
- Modify: `src/agents/stream.ts`
- Modify: `tests/agents.test.ts`

- [ ] **Step 1: Add a helper/stream merge regression test**

In `tests/agents.test.ts`, add this test inside the existing `describe("streamAgentResponse", () => {` block, before `"yields context events while waiting for SDK events"`:

```ts
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
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS. This test exercises newly added helper behavior through the stream merge path before the internal stream refactor.

- [ ] **Step 3: Refactor `src/agents/stream.ts` imports and types**

In `src/agents/stream.ts`, replace the existing workflow-related local type aliases:

```ts
type WorkflowItem = Extract<ThreadItem, { type: "workflow" }>;
type ThoughtTask = Extract<WorkflowItem["workflow"]["tasks"][number], { type: "thought" }>;
```

with this import:

```ts
import {
  appendWorkflowTask,
  createReasoningWorkflowItem,
  createThoughtTask,
  finishWorkflow,
  type ThoughtTask,
  updateWorkflowTaskEvent,
  workflowAddedEvent,
} from "./workflows";
```

Keep `GeneratedImageItem` local:

```ts
type GeneratedImageItem = Extract<ThreadItem, { type: "generated_image" }>;
```

- [ ] **Step 4: Remove duplicate private workflow helpers from `src/agents/stream.ts`**

Delete these local helper functions from `src/agents/stream.ts`:

- `workflowItem(...)`
- `thoughtTask(...)`
- `durationSeconds(...)`
- `endActiveWorkflow(...)`

Keep `matchingStreamingThought(...)` in `src/agents/stream.ts` because it is stream-state specific.

- [ ] **Step 5: Refactor assistant message auto-end to shared `finishWorkflow(...)`**

In `assistantMessageAddedEvents(...)`, replace:

```ts
  const workflowDone = endActiveWorkflow(context);
```

with:

```ts
  const workflowDone = finishWorkflow(context);
```

- [ ] **Step 6: Refactor reasoning workflow creation**

In the `response.output_item.added` reasoning branch, replace:

```ts
        const itemId = context.store.generateItemId("workflow", context.thread, context.context);
        const workflow = workflowItem(context, itemId);
        context.workflowItem = workflow;

        return [
          {
            type: "thread.item.added",
            item: workflow,
          },
        ];
```

with:

```ts
        const workflow = createReasoningWorkflowItem(context);
        context.workflowItem = workflow;

        return [workflowAddedEvent(workflow)];
```

- [ ] **Step 7: Refactor reasoning summary delta conversion**

In the `response.reasoning_summary_text.delta` case, replace the first-thought block:

```ts
        const task = thoughtTask(delta);
        state.streamingThought = { itemId, summaryIndex, task };
        workflow.workflow.tasks.push(task);

        return [
          {
            type: "thread.item.updated",
            item_id: workflow.id,
            update: {
              type: "workflow.task.added",
              task_index: 0,
              task,
            },
          },
        ];
```

with:

```ts
        const task = createThoughtTask(delta);
        state.streamingThought = { itemId, summaryIndex, task };

        return [appendWorkflowTask(workflow, task)];
```

In the matching streaming thought block, replace the returned inline update event with:

```ts
      return [updateWorkflowTaskEvent(workflow, streamingThought.task, taskIndex)];
```

- [ ] **Step 8: Refactor reasoning summary done conversion**

In the matching streaming thought block of the `response.reasoning_summary_text.done` case, replace the returned inline update event with:

```ts
        return [updateWorkflowTaskEvent(workflow, streamingThought.task, taskIndex)];
```

In the non-matching done block, replace:

```ts
      const task = thoughtTask(text);
      workflow.workflow.tasks.push(task);

      return [
        {
          type: "thread.item.updated",
          item_id: workflow.id,
          update: {
            type: "workflow.task.added",
            task_index: workflow.workflow.tasks.length - 1,
            task,
          },
        },
      ];
```

with:

```ts
      const task = createThoughtTask(text);
      return [appendWorkflowTask(workflow, task)];
```

- [ ] **Step 9: Run focused tests**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS.

- [ ] **Step 10: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 11: Run full verification**

Run:

```bash
bun run verify
```

Expected: PASS.

- [ ] **Step 12: Commit stream workflow refactor**

Run:

```bash
git add src/agents/stream.ts tests/agents.test.ts
git commit -m "Share Agents workflow stream helpers"
```

Expected: Commit succeeds.

## Final Verification

After all tasks complete, run:

```bash
bun run verify
git status --short --branch
```

Expected:

- TypeScript typecheck passes.
- All Bun tests pass.
- Git status is clean on the implementation branch.

## Implementation Notes

- Use Bun tooling only.
- Keep helper methods synchronous.
- Keep `workflowItem` as the single active workflow state source.
- Do not add workflow persistence or resume behavior.
- Do not add visual-item auto-end behavior.
- Keep existing reasoning stream event shapes identical.
- Continue validating helper-emitted events through `AgentContext.stream(...)`.
- Do not export `src/agents/workflows.ts` from the public package surface; it is an internal implementation module.
