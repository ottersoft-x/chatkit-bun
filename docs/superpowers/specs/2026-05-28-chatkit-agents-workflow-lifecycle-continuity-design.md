# ChatKit Bun Agents Workflow Lifecycle Continuity Design

## Purpose

This milestone continues workflow parity after the public `AgentContext`
workflow helpers. It makes active workflows survive across streamed response
turns and ensures visible context-emitted items close the active workflow before
they are shown.

The goal is strict parity with the focused Python stream lifecycle behavior:
resume the last open workflow when a response starts, silently persist any
workflow still open when the response ends, and auto-end workflows before
context-emitted visible items.

## Scope

This milestone includes:

- Loading the most recent thread items before streaming and resuming an open
  workflow when the latest item is a workflow.
- Resuming the previous workflow when the latest item is a pending
  `client_tool_call` and the second latest item is a workflow.
- Persisting an active workflow at normal stream completion without emitting a
  `thread.item.done` event.
- Ending an active workflow before context-queued visible `thread.item.added`
  or `thread.item.done` events.
- Tracking context-queued workflow items as the current active workflow.
- Focused tests around resume, silent persist, visual-item auto-end, and
  hidden/client-tool exemptions.

This milestone does not add:

- Guardrail rollback or produced-item cleanup.
- `AgentContext.streamWidget(...)`.
- Widget helper APIs.
- Generated-image input conversion or replay.
- Any schema changes.
- Broad server persistence rewrites. A narrow `thread.item.done` upsert path
  for already-stored resumed items is in scope if tests prove insert-only
  persistence would fail.

## Startup Resume

`streamAgentResponse(...)` should load the latest two thread items before it
starts merging SDK and context events:

```ts
await context.store.loadThreadItems(context.thread.id, null, 2, "desc", context.context);
```

If the latest item is a workflow, set `context.workflowItem` to that item. If
the latest item is a `client_tool_call` and the second latest item is a
workflow, set `context.workflowItem` to the second latest item.

The resume rule should not inspect workflow summaries, task status, or expanded
state to infer whether a workflow is open. It should mirror Python's item-order
rule exactly.

If the latest item is any other item type, leave `context.workflowItem` as it
is. This allows callers to seed a workflow explicitly on the context when they
need to, while normal persisted-thread resume follows the store result.

## Context Event Auto-End

Context events should pass through a small stream-side wrapper before they are
yielded. For a context event whose type is `thread.item.added` or
`thread.item.done`:

- If `context.workflowItem` is set,
- and the event item is not the same item as the active workflow,
- and the event item is visible,
- then yield `finishWorkflow(context)` before yielding the original event.

For this milestone, visible means the item is not one of:

- `client_tool_call`
- `hidden_context_item`
- `sdk_hidden_context`

If a context `thread.item.added` event contains a workflow item, set
`context.workflowItem` to that workflow after the auto-end check. This mirrors
Python's behavior where explicit context workflow events become the current
workflow.

The auto-ended workflow should use the existing shared `finishWorkflow(...)`
logic so duration summaries, summary preservation, expanded-state defaulting,
and deferred-empty custom workflow behavior stay aligned with
`AgentContext.endWorkflow(...)` and assistant-message auto-end.

## End-Of-Run Persist

After the SDK stream and context queue complete normally, if
`context.workflowItem` is still set, upsert the workflow item with a current
`created_at` value:

```ts
await context.store.saveItem(context.thread.id, persistedWorkflow, context.context);
```

Then clear `context.workflowItem`.

This persistence is silent. It should not yield a `thread.item.done` event and
should not add a duration summary. The stored workflow remains open so a later
turn can resume it and append or update workflow tasks against the same item id.
Refreshing `created_at` during the silent upsert keeps the workflow in SQLite's
two-item resume window after a pending client tool call is stored.

Do not persist an extra workflow when the workflow has already been ended by
`AgentContext.endWorkflow(...)`, assistant-message auto-end, or context
visual-item auto-end. Those paths clear `context.workflowItem`.

## Stream Behavior

Existing reasoning workflow stream behavior should remain unchanged:

- A new reasoning item starts a reasoning workflow only when no workflow is
  already active.
- Reasoning summary deltas and done events continue to emit the same
  `workflow.task.*` updates.
- Assistant messages continue to end the active workflow before the assistant
  item is emitted.
- Existing workflow summaries are preserved when a workflow is ended.

Generated-image SDK events should continue using the current generated-image
state handling. Context-emitted generated-image or widget items are visible
items and should trigger workflow auto-end through the context event wrapper.

## Testing Strategy

Extend `tests/agents.test.ts` with a store implementation that can seed
`loadThreadItems(...)` results and record `addThreadItem(...)` calls.

Add focused tests for:

- Resuming when the latest stored item is a workflow.
- Resuming when the latest stored item is a `client_tool_call` and the second
  latest item is a workflow.
- Not resuming when the latest stored item is an assistant message.
- Continuing a resumed workflow by emitting `workflow.task.*` updates against
  the stored workflow id.
- Silently persisting an active workflow at normal stream completion without a
  yielded `thread.item.done` event.
- Skipping silent persistence when the workflow is ended during the stream.
- Ending an active workflow before a context-emitted visible widget item.
- Ending an active workflow before a context-emitted generated-image item.
- Not ending an active workflow before `client_tool_call`,
  `hidden_context_item`, or `sdk_hidden_context` events.

Full verification for the implementation plan should include:

```bash
bun run verify
```

## Acceptance Criteria

The milestone is complete when:

- `streamAgentResponse(...)` resumes the prior workflow using the Python
  two-item rule.
- A workflow can stay open across response turns by being persisted silently at
  normal stream completion.
- A resumed workflow can later be finalized without duplicate item id failures.
- Resumed workflows keep their existing item id and can receive new task add or
  update events.
- Context-emitted visible items end the active workflow before they are yielded.
- Client tool calls and hidden items do not end the active workflow.
- Existing reasoning workflow stream event shapes do not change.
- No guardrail, widget-helper, input-replay, or schema behavior is added.
- `bun run verify` passes.
