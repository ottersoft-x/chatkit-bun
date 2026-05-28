# ChatKit Bun Agents Core Slice Design

## Purpose

This milestone starts the `chatkit-bun` Agents SDK bridge. The server, widget,
HTTP, and stream-event schemas already provide the ChatKit runtime boundary. This
slice adds the first producer-side adapter from the official JavaScript
`@openai/agents` streaming surface to existing ChatKit `ThreadStreamEvent`
objects.

The goal is not full Python `chatkit.agents` parity in one pass. The Python
reference covers annotations, generated images, workflows, guardrail rollback,
widgets, input conversion, and custom converters. This milestone proves the core
bridge shape with assistant text streaming, app-enqueued context events, and one
deferred client tool call.

## Scope

This milestone includes:

- A new `src/agents/` module exported from `src/index.ts`.
- A runtime dependency on `@openai/agents`, installed with Bun.
- An `AgentContext<TContext>` class for per-response state and event enqueueing.
- A `ClientToolCall` value for app tools that need browser/client work.
- A `streamAgentResponse(...)` helper that returns
  `AsyncIterable<ThreadStreamEvent>`.
- Fair merging of SDK stream events and `AgentContext.stream(...)` events.
- Assistant message text mapping for message add, text delta, content-part done,
  and message done events.
- Deferred emission of one pending `client_tool_call` item at stream end.
- Focused tests for the new bridge and root exports.

This milestone defers:

- Annotation and citation conversion.
- Generated image events and partial image progress.
- Reasoning and custom workflow helpers.
- `AgentContext.streamWidget(...)`.
- Guardrail rollback and produced-item removal.
- Full `ThreadItemConverter` and `simpleToAgentInput(...)`.
- `ResponseStreamConverter` hooks for images and annotations.
- Server-side tool output conversion.

## Architecture

Add an agents directory with small modules:

```ts
src/agents/
  context.ts
  stream.ts
  types.ts
  index.ts
```

`context.ts` owns `AgentContext` and `ClientToolCall`. `stream.ts` owns
`streamAgentResponse(...)` and SDK event conversion. `types.ts` owns narrow
public option types and internal normalized stream-event helpers. `index.ts`
re-exports the public agents API.

The package root should re-export `./agents` so consumers can write:

```ts
import { AgentContext, ClientToolCall, streamAgentResponse } from "chatkit-bun";
```

`ChatKitServer` does not change. Applications use the bridge inside their
`respond(...)` implementation:

```ts
async *respond(thread, inputUserMessage, requestContext) {
  const agentContext = new AgentContext({
    thread,
    store: this.store,
    context: requestContext,
  });

  // Full ChatKit-to-Agents input conversion is deferred; apps prepare input here.
  const input = prepareAgentInput(inputUserMessage);
  const result = await run(agent, input, { stream: true });
  yield* streamAgentResponse(agentContext, result);
}
```

The design keeps all wire output on existing `ThreadStreamEvent` schemas. The
agents bridge produces events; `ChatKitServer.processEvents(...)` continues to
validate, persist, suppress hidden items, and translate thrown stream failures
into `stream.error` events.

## Agent Context

`AgentContext<TContext>` represents one streamed response turn. It stores:

- `thread: ThreadMetadata`
- `store: Store<TContext>`
- `context: TContext`
- an internal async queue of `ThreadStreamEvent`
- an optional `ClientToolCall`
- an optional clock override for deterministic tests

The first public methods are:

```ts
class AgentContext<TContext> {
  readonly thread: ThreadMetadata;
  readonly store: Store<TContext>;
  readonly context: TContext;

  stream(event: ThreadStreamEvent): void;
  setClientToolCall(toolCall: ClientToolCall): void;
}
```

`stream(event)` validates the event with `ThreadStreamEventSchema` before
enqueueing it. This lets app tools send `progress_update`, `client_effect`, or
manual thread-item events while the SDK run is still streaming.

`setClientToolCall(...)` records exactly one pending browser/client tool call for
the turn. If a second client tool call is recorded before the first is emitted,
the context throws a clear error. This matches the Python reference's one-client-
tool-per-turn behavior and keeps the first slice deterministic.

`ClientToolCall` stores the tool `name` and JSON-compatible `arguments`. The
bridge will combine those values with SDK tool-call metadata when available.

## Stream Conversion

`streamAgentResponse(agentContext, streamedRun, options?)` accepts the streamed
result returned by `@openai/agents` when `run(..., { stream: true })` is used. It
should support the SDK's async-iterable result shape and its `toStream()` shape
so tests can use lightweight fixture streams while app code can pass the real
SDK result directly.

The helper merges two sources:

1. SDK stream events.
2. Events enqueued through `AgentContext.stream(...)`.

The merge should not starve context events when the SDK stream is long-running,
and it should drain queued context events after the SDK stream completes. If the
consumer cancels iteration, the helper should call `return()` on the SDK iterator
when available and close the context queue.

For this slice, SDK raw model events map to ChatKit assistant-message events:

- Message item added -> `thread.item.added` with an `assistant_message` item.
- Text delta -> `thread.item.updated` with
  `assistant_message.content_part.text_delta`.
- Text content part done -> `thread.item.updated` with
  `assistant_message.content_part.done`.
- Message item done -> `thread.item.done` with the final `assistant_message`
  item.

The converter should ignore SDK event types it does not understand in this slice.
It should not emit placeholder ChatKit events for annotations, generated images,
reasoning, or server-side tools.

## Client Tool Calls

Application tools that need a browser/client callback record a `ClientToolCall`
on the `AgentContext`. The bridge also watches SDK run-item events for raw
function-call metadata, including the SDK item id and call id when present.

At stream end, if a `ClientToolCall` is recorded, the helper emits one
`thread.item.done` event with a pending `client_tool_call` item:

- `type: "client_tool_call"`
- `status: "pending"`
- `name` and `arguments` from `ClientToolCall`
- `id` and `call_id` from SDK metadata when available
- generated fallback ids from `store.generateItemId(...)` when SDK metadata is
  absent

This matches the Python behavior where client tool calls are deferred until the
run ends and existing server request handling resumes with
`threads.add_client_tool_output`.

## Error Handling

The bridge validates its own outgoing events but does not create a separate error
policy. Ordinary SDK iterator failures propagate. When used inside
`ChatKitServer.respond(...)`, the existing `processEvents(...)` error handling
will yield the standard retryable `stream.error` event.

Guardrail rollback is explicitly deferred. The first slice does not track every
produced item id deeply enough to remove produced items and rethrow guardrail
exceptions with Python parity.

Cancellation is handled at the async iterator level. A cancelled consumer closes
the context queue and forwards `return()` to the SDK iterator when available.

## Testing Strategy

Add `tests/agents.test.ts` with focused fixture streams shaped like real
`@openai/agents` events. Use real package imports where they help type
compatibility, but keep behavior tests deterministic and network-free.

Coverage should include:

- Context-only events are yielded even when the SDK stream produces no events.
- Assistant text streams as add, delta, content-part done, and item done events.
- Context events interleave with SDK events and drain after SDK completion.
- A recorded `ClientToolCall` emits one pending `client_tool_call` item at stream
  end.
- SDK tool-call metadata is used for client tool `id` and `call_id` when present.
- Fallback ids are generated through the existing store when metadata is absent.
- Cancelling the returned iterator calls `return()` on the SDK iterator.
- Unknown SDK events are ignored.

Update `tests/exports.test.ts` to assert the new public agents API is exported.

Full verification for the implementation plan should include:

```bash
bun run verify
```

## Acceptance Criteria

The milestone is complete when:

- `@openai/agents` is installed as a runtime dependency.
- `AgentContext`, `ClientToolCall`, and `streamAgentResponse` are exported from
  the package root.
- `streamAgentResponse(...)` can consume a real SDK streamed result or compatible
  fixture stream.
- Assistant text streaming produces existing ChatKit thread stream events.
- `AgentContext.stream(...)` events merge with SDK stream events.
- One deferred pending `client_tool_call` item can be emitted at stream end.
- Cancellation forwards to the SDK iterator and closes the context event queue.
- Focused agents tests and export tests pass.
- Full `bun run verify` passes.
- No annotations, generated images, workflows, widget helpers, guardrail
  rollback, input conversion, or custom converter APIs are added in this slice.
