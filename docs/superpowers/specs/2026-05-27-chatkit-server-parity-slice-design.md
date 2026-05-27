# ChatKit Server Parity Slice Design

## Purpose

This milestone adds the first real `ChatKitServer.process(...)` implementation
for `chatkit-bun`. It should make the server request/response layer usable while
continuing toward full feature parity with `packages/chatkit-python`.

The goal is not a minimal smoke-test server. The goal is a reviewable server
parity slice that covers the Python server behaviors needed by the translated
`test_chatkit_server.py` cases, while explicitly deferring widget runtime,
template rendering, Bun HTTP routing, Agents SDK conversion, and upstream sync
automation to later milestones.

## Scope

This milestone includes:

- Zod request schemas for the Python streaming and non-streaming request union.
- Zod response and stream event schemas needed by the translated server tests.
- Expansion of `ThreadItemSchema` for structured input, workflow, generated
  image, and task items where server behavior requires them.
- `StreamingResult` and `NonStreamingResult`.
- A subclass-first `ChatKitServer<TContext>` base class with Python-like
  overridable methods.
- Core dispatch for thread creation, add message, client tool output, structured
  input, retry, custom actions, item and thread list/update/delete, attachments,
  feedback, and transcription.
- Server tests translated from relevant `test_chatkit_server.py` cases.

This milestone defers:

- `.widget` templates, widget builders, and widget diff internals.
- The Bun HTTP route/helper layer.
- Agents SDK stream conversion.
- Upstream sync tooling and parity matrix automation.

Deferred widget behavior means custom action support can validate and route a
`WidgetItem` sender as opaque widget JSON. Widget building, streaming widget
diffs, and template rendering remain part of the widget milestone.

## Architecture

Add three focused modules:

- `src/types/server.ts` defines request params, request unions, stream events,
  thread item updates, transcription types, structured input types,
  workflow/task/generated-image types, and response schemas.
- `src/server.ts` defines `ChatKitServer`, `StreamingResult`,
  `NonStreamingResult`, request dispatch, stream persistence, cancellation,
  event serialization, and Python-compatible response filtering.
- `tests/server.test.ts` translates the relevant server behavior from
  `packages/chatkit-python/tests/test_chatkit_server.py`.

The existing foundation remains in place:

- `src/types/core.ts` keeps shared thread, attachment, pagination, and thread
  item schemas. This milestone expands shared thread item variants there so
  stores, SQLite persistence, and server responses agree on one item union.
- `src/types/server.ts` owns request, response, stream event, update, and
  hook-only types that are not needed by the store boundary.
- `src/store.ts` remains the persistence boundary used by the server.
- `src/sqlite-store.ts` remains the concrete store used by tests.
- `src/serialization.ts` remains the JSON byte and omission helper layer.

Public exports should include the server classes/results and the request/event
types needed by users and tests.

## API Shape

The public server API mirrors Python's subclass-first model:

- `respond(thread, inputUserMessage, context)` is abstract and returns an async
  iterable of `ThreadStreamEvent` values.
- Optional hooks mirror Python behavior:
  - `addFeedback(threadId, itemIds, feedback, context)`.
  - `transcribe(audioInput, context)`.
  - `action(thread, action, sender, context)`.
  - `syncAction(thread, action, sender, context)`.
  - `getStreamOptions(thread, context)`.
  - `handleStreamCancelled(thread, pendingItems, context)`.
- `process(request, context)` accepts `string | Uint8Array | ArrayBuffer` and
  returns `StreamingResult | NonStreamingResult`.

Method names should be idiomatic TypeScript while staying visibly close to the
Python source. Wire-level JSON field names and event `type` values must remain
Python-compatible.

## Data Flow

`process(request, context)` parses the request with `ChatKitRequestSchema`, then
routes by request type.

Streaming requests return `StreamingResult`:

- `threads.create`
- `threads.add_user_message`
- `threads.add_client_tool_output`
- `threads.add_structured_input`
- `threads.retry_after_item`
- `threads.custom_action`

Non-streaming requests return `NonStreamingResult`:

- `threads.get_by_id`
- `threads.list`
- `items.list`
- `items.feedback`
- `attachments.create`
- `attachments.delete`
- `threads.update`
- `threads.delete`
- `input.transcribe`
- `threads.sync_custom_action`

Streaming events are serialized as Server-Sent Event chunks:

```text
data: <json>\n\n
```

The server persists stream events through the same observable pipeline as
Python:

- `thread.item.done` adds the item to the store.
- `thread.item.removed` deletes the item from the store.
- `thread.item.replaced` saves the item.
- `thread.item.updated` mutates pending assistant and workflow items so
  cancellation can persist the latest pending state.
- Hidden context items are persisted but not sent to clients.
- Thread metadata changes during streaming are saved and emitted as
  `thread.updated`.

## Behavior

The server follows Python's observable behavior for this slice:

- `threads.create` creates and saves a thread, emits `thread.created`, stores the
  incoming user message, then streams responder events.
- `threads.add_user_message` loads the thread, stores the user message, then
  streams responder events.
- `threads.add_client_tool_output` completes the latest pending client tool
  call, cleans dangling pending tool calls, then resumes response.
- `threads.add_structured_input` replaces a pending structured input item with
  answered or skipped values, then resumes response.
- `threads.retry_after_item` removes items after a target user message and reruns
  `respond`.
- `threads.custom_action` routes to `action(...)`, with widget sender data
  treated as opaque JSON until the widget runtime milestone.
- `threads.sync_custom_action` routes to `syncAction(...)` and returns a single
  serialized response.
- `items.list` and thread responses filter hidden context items from client
  output.
- Attachment creation/deletion require a configured `AttachmentStore` and keep
  store metadata in sync.
- `input.transcribe` decodes base64 audio, preserves the raw MIME type, exposes
  a normalized media type helper, and delegates to `transcribe(...)`.

Structured input behavior should match Python:

- Unknown submitted answer ids are ignored.
- Omitted answers are treated as skipped.
- Submission-level skipped status marks all questions skipped.
- Single-choice multiple-choice inputs truncate extra submitted values.
- The item status changes to the submitted status.

Cancellation behavior should match Python:

- Non-empty pending assistant messages are persisted.
- Empty pending assistant messages are not persisted.
- An `sdk_hidden_context` item is added to tell later runs that the user
  cancelled the previous stream.
- Cancellation rethrows so consumers can observe cancellation.

## Error Handling

Error behavior should stay close to Python where tests or integrations observe
it:

- Missing attachment store raises a clear runtime error when file operations are
  requested.
- Unsupported transcription raises an override-required error.
- Invalid request JSON fails validation before dispatch.
- Invalid retry targets raise an error when the target item is not a user
  message.
- Custom action requests with a non-widget sender yield or throw the same
  observable errors as the Python path for streaming vs sync requests.
- Expected stream errors emit `error` events with the configured retry behavior.
- Unexpected responder errors emit retryable stream errors and do not crash the
  stream pipeline for translated parity cases.

The TypeScript implementation can use idiomatic error classes, but messages
should remain close enough to upstream that drift is easy to notice in tests.

## Testing Strategy

Testing is parity-led. `tests/server.test.ts` should translate the relevant
Python server tests for:

- Request parsing and routing into streaming vs non-streaming results.
- Thread create/add/list/get/update/delete behavior.
- Item list filtering and pagination.
- Attachment create/delete and missing attachment-store errors.
- Feedback and transcription hooks.
- Client tool output continuation.
- Structured input answering, skipping, unknown answers, and single-choice
  truncation.
- Retry after item, including invalid target behavior.
- Stream options, event persistence, thread updates, cancellation persistence,
  and error events.
- Custom action and sync action routing with widget sender treated as opaque
  JSON.

Do not translate widget diff/runtime tests in this milestone unless they are
needed for the opaque sender routing behavior. Do not translate Agents SDK
conversion tests in this milestone.

## Acceptance Criteria

This milestone is complete when:

- `bun run verify` passes.
- `ChatKitServer.process(...)` handles the streaming and non-streaming request
  union listed in this design.
- `StreamingResult` yields Python-compatible SSE byte chunks.
- `NonStreamingResult` exposes Python-compatible JSON bytes.
- Public exports include the new server and request/event types.
- The server tests translated for this slice pass.
- The schema additions cover the item and event shapes required by this
  milestone and do not knowingly block later full parity work.
- Deferred work is documented in the follow-up plan rather than hidden behind
  partial implementations.

## Follow-Up Milestones

After this server parity slice, the remaining full-parity path is:

1. Widgets, widget templates, and widget diffing.
2. Bun HTTP request handler.
3. Agents SDK stream conversion.
4. Upstream sync tooling and parity matrix automation.
