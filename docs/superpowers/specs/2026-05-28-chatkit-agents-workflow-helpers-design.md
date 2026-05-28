# ChatKit Bun Agents Workflow Helpers Design

## Purpose

This milestone adds public workflow helper methods to `AgentContext` and
refactors the existing reasoning workflow stream conversion to share the same
workflow lifecycle rules. The previous reasoning workflow milestone introduced
`AgentContext.workflowItem` and private stream helpers. This slice turns that
state into a supported API for agent authors while reducing duplicate workflow
creation and completion behavior in `src/agents/stream.ts`.

The goal is parity with the focused Python `AgentContext` helper behavior
without taking on workflow resume, open-workflow persistence, visual-item
auto-end, guardrail rollback, widgets, or input replay.

## Scope

This milestone includes:

- Adding `AgentContext.startWorkflow(...)`.
- Adding `AgentContext.addWorkflowTask(...)`.
- Adding `AgentContext.updateWorkflowTask(...)`.
- Adding `AgentContext.endWorkflow(...)`.
- Sharing workflow item creation, lazy custom workflow creation, task update,
  and duration-summary logic between `AgentContext` and `streamAgentResponse`.
- Keeping existing reasoning workflow stream conversion behavior intact.
- Focused tests for helper events, helper state, helper/stream merge behavior,
  and reasoning stream regressions.

This milestone defers:

- Loading an open workflow from thread history before a stream starts.
- Persisting an open workflow at stream end when no done event is emitted.
- Auto-ending workflows around context-enqueued visual items.
- Guardrail rollback and produced-item removal.
- Widget streaming helpers.
- Workflow or generated-image input conversion and replay.

## Public API

Add these synchronous methods to `AgentContext<TContext>`:

```ts
startWorkflow(workflow: Workflow): void;
addWorkflowTask(task: Task): void;
updateWorkflowTask(task: Task, taskIndex: number): void;
endWorkflow(summary?: WorkflowSummary, expanded?: boolean): void;
```

The methods are synchronous because `AgentContext.stream(...)` is synchronous
and already enqueues validated stream events into the context event queue.

Export a `WorkflowSummary` type from `src/types/core.ts` so consumers can type
the optional `endWorkflow(...)` summary argument without reconstructing it from
the schema.

The helpers should use the existing public `workflowItem` field as the single
source of active workflow state. They should not introduce a second internal
workflow state object.

## Helper Semantics

`startWorkflow(workflow)` should:

- Create a workflow item using
  `store.generateItemId("workflow", thread, context)`.
- Set `created_at` with `createdAt()`.
- Set `thread_id` to the current thread id.
- Store the item on `workflowItem`.
- Emit `thread.item.added` immediately when the workflow is `reasoning` or has
  at least one task.
- Defer the `thread.item.added` event for an empty non-reasoning workflow until
  the first task is added.

`addWorkflowTask(task)` should:

- Lazily create a custom workflow if `workflowItem` is `null`.
- Append the task to `workflowItem.workflow.tasks`.
- If this is the first task in a non-reasoning workflow that has not yet been
  emitted, emit `thread.item.added` with the workflow item.
- Otherwise emit `thread.item.updated` with `workflow.task.added` and the new
  task index.

`updateWorkflowTask(task, taskIndex)` should:

- Throw `Error("Workflow is not set")` if no workflow is active.
- Throw `RangeError("Workflow task index is out of range")` if `taskIndex`
  does not refer to an existing task in the active workflow.
- Replace `workflowItem.workflow.tasks[taskIndex]` with the provided task.
- Emit `thread.item.updated` with `workflow.task.updated` and the provided
  index.

`endWorkflow(summary, expanded = false)` should:

- Return without emitting an event if no workflow is active.
- If `summary` is provided, set it on the workflow.
- If `summary` is omitted and the workflow has no summary, set
  `{ duration: seconds }`, where `seconds` is the non-negative integer number of
  seconds between the workflow item's `created_at` and `createdAt()`.
- Preserve an existing workflow summary when `summary` is omitted.
- Set `workflow.expanded` to the `expanded` argument.
- Emit `thread.item.done` with the final workflow item.
- Clear `workflowItem`.

## Shared Workflow Logic

Move reusable workflow lifecycle code out of `src/agents/stream.ts` and into a
small module under `src/agents/`, such as `src/agents/workflows.ts`. The shared
module should provide internal helpers for:

- Building workflow items.
- Building thought tasks.
- Calculating duration summaries.
- Finalizing active workflows.
- Appending and updating workflow tasks.

`AgentContext` should use the shared helpers to implement the public methods.
`streamAgentResponse` should use the same helpers for reasoning workflow item
creation, reasoning thought task updates, and workflow completion before
assistant messages.

This keeps the stream bridge and public helpers aligned. A workflow ended by
`AgentContext.endWorkflow(...)` and a workflow ended automatically before an
assistant message should produce the same summary and final item shape.

## Stream Behavior

The existing reasoning workflow stream behavior should not change:

- A `response.output_item.added` reasoning item starts a reasoning workflow and
  emits `thread.item.added`.
- The first reasoning summary thought streams through `workflow.task.added` and
  `workflow.task.updated`.
- Later thoughts are added on `.done`.
- An active workflow is ended before assistant message items are emitted.
- An existing workflow summary is preserved when auto-ending before an
  assistant message.
- The normalized text-event path also ends an active workflow before emitting an
  assistant message.

The stream bridge may call shared helpers directly rather than public
`AgentContext` methods when it needs to return events as part of SDK-event
conversion instead of enqueueing them on the context event queue.

## Testing Strategy

Extend `tests/agents.test.ts` with helper-focused tests inside
`describe("AgentContext", () => { ... })`:

- `startWorkflow(...)` emits `thread.item.added` for reasoning workflows.
- `startWorkflow(...)` defers `thread.item.added` for empty custom workflows.
- `addWorkflowTask(...)` lazily creates a custom workflow and emits
  `thread.item.added` for the first custom task.
- `addWorkflowTask(...)` emits `workflow.task.added` for subsequent tasks.
- `updateWorkflowTask(...)` updates state and emits `workflow.task.updated`.
- `updateWorkflowTask(...)` throws when no workflow is active.
- `updateWorkflowTask(...)` throws when the task index is out of range.
- `endWorkflow(...)` emits `thread.item.done`, defaults to a duration summary,
  collapses the workflow, and clears `workflowItem`.
- `endWorkflow(...)` preserves an existing summary when no summary argument is
  provided.
- `endWorkflow(...)` accepts an explicit summary and expanded state.
- Helper events merge correctly with `streamAgentResponse(...)` context events.

Keep the existing reasoning workflow stream tests green and add targeted
regression assertions where the refactor could drift:

- Reasoning workflow creation still emits the same `thread.item.added` shape.
- Reasoning thought task updates still emit the same `workflow.task.*` shapes.
- Automatic workflow completion before assistant messages still emits the same
  `thread.item.done` shape.

Full verification for the implementation plan should include:

```bash
bun run verify
```

## Acceptance Criteria

The milestone is complete when:

- Agent authors can manage workflows through `AgentContext` helper methods.
- Helper methods emit validated `ThreadStreamEvent` values through the existing
  context event queue.
- Empty custom workflows are not emitted until the first task is added.
- Lazy custom workflow creation works from `addWorkflowTask(...)`.
- Workflow task add/update helpers mutate `workflowItem` and emit matching
  `workflow.task.*` events.
- Invalid workflow task updates fail before mutating workflow state.
- `endWorkflow(...)` handles no active workflow, explicit summaries, preserved
  summaries, default duration summaries, expanded state, and state cleanup.
- `streamAgentResponse(...)` uses the shared workflow lifecycle logic without
  changing existing reasoning workflow stream behavior.
- No persistence/resume, visual-item auto-end, widgets, guardrail rollback, or
  input replay behavior is added in this milestone.
- `bun run verify` passes.
