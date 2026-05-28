# ChatKit Bun Agents Stream Widget Design

## Purpose

This milestone adds `AgentContext.streamWidget(...)` parity on top of the
existing low-level widget streaming implementation. Agent authors should be able
to enqueue static or streaming widgets from an agent response without manually
calling `streamWidget(...)` and `context.stream(...)`.

The goal is a small but complete Agents integration slice: expose the Python
helper shape, preserve existing widget stream event behavior, and prove that
widgets emitted through the helper participate in the Agents workflow lifecycle
added by the previous milestone.

## Scope

This milestone includes:

- Adding an async `AgentContext.streamWidget(widget, copyText?)` helper.
- Delegating widget event generation to the existing `src/widgets/stream.ts`
  `streamWidget(...)` function.
- Using the current agent thread, store-backed message id generation, and
  context timestamp source.
- Enqueueing all produced widget events through `AgentContext.stream(...)`.
- Porting the Python Agents widget behavior tests for static widgets, streaming
  text deltas, and full root replacement.
- Adding one explicit workflow lifecycle integration test proving a helper
  emitted widget auto-ends an active workflow before the visible widget event.

This milestone does not add:

- New widget schemas or component behavior.
- Server event-processing changes.
- Changes to low-level `streamWidget(...)`, `diffWidget(...)`, or widget
  serialization.
- Public exports beyond the new method on the already-exported `AgentContext`
  class.
- Widget input replay or generated-image replay behavior.

## Public API

Add this method to `AgentContext<TContext>`:

```ts
async streamWidget(
  widget: WidgetRoot | AsyncIterable<WidgetRoot>,
  copyText?: string | null,
): Promise<void>
```

The method should mirror Python's `AgentContext.stream_widget(...)` purpose:
generate widget stream events for the current thread and enqueue them into the
agent context event queue.

The TypeScript method accepts `AsyncIterable<WidgetRoot>` rather than only
`AsyncGenerator<WidgetRoot, void, unknown>`, matching the broader input type
already supported by the low-level Bun `streamWidget(...)`.

## Event Generation

`AgentContext.streamWidget(...)` should delegate directly to the existing
low-level helper:

```ts
streamWidget(this.thread, widget, {
  copyText,
  generateId: (itemType) => this.store.generateItemId(itemType, this.thread, this.context),
  now: () => this.createdAt(),
})
```

For each event yielded by the low-level helper, call `this.stream(event)`.
This keeps validation, queueing, and error behavior aligned with existing
context events.

Static widgets should continue to emit a single `thread.item.done` event.
Streaming widget iterables should continue to emit `thread.item.added`, zero or
more `thread.item.updated` events, and a final `thread.item.done` event.

## Workflow Lifecycle

No new workflow lifecycle logic should be added. Because the helper enqueues
normal context stream events, `streamAgentResponse(...)` should process them
through the existing context-event lifecycle wrapper.

Expected behavior:

- A static widget `thread.item.done` event is visible and auto-ends an active
  workflow before the widget event is yielded.
- A streaming widget's first `thread.item.added` event is visible and auto-ends
  an active workflow before the widget event is yielded.
- Later widget `thread.item.updated` events pass through unchanged and do not
  participate in workflow auto-end decisions.

## Error Handling

The helper should allow errors from low-level widget streaming to propagate.
This includes the existing empty async iterable error and diff validation
errors. If an async iterable yields some events and later throws, already
queued events may remain queued; this matches the existing queue-oriented
context behavior and does not require rollback in this milestone.

The helper should not close the context event queue. The caller or
`streamAgentResponse(...)` remains responsible for normal queue lifecycle.

## Testing Strategy

Extend `tests/agents.test.ts` with integration tests around
`streamAgentResponse(...)`:

- Static widget: calling `await context.streamWidget(Card(...))` yields one
  `thread.item.done` event with a widget item using the store-generated message
  id and context timestamp.
- Streaming text widget: an async iterable yielding two widget roots yields a
  widget `thread.item.added`, a `widget.streaming_text.value_delta` update, and
  a widget `thread.item.done`.
- Full root replacement: an async iterable changing the widget root yields a
  `widget.root.updated` update between `added` and `done`.
- Workflow integration: an active workflow is ended before the first visible
  widget event produced by `context.streamWidget(...)`.

Focused verification for the implementation plan should include:

```bash
bun test tests/agents.test.ts
bun run typecheck
```

Full verification should include:

```bash
bun run verify
```

## Acceptance Criteria

The milestone is complete when:

- `AgentContext` exposes `streamWidget(...)` with the approved signature.
- The helper uses store-backed message id generation and context timestamps.
- Static and streaming widget event shapes match existing low-level
  `streamWidget(...)` behavior.
- Widget events emitted through the helper are validated and queued through the
  existing context event path.
- Active workflows auto-end before visible widget events emitted by the helper.
- No server, schema, low-level widget stream, or widget serialization behavior
  changes are introduced.
- `bun run verify` passes.
