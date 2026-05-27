# ChatKit Bun Port Design

## Purpose

`chatkit-bun` is a private TypeScript/Bun port of the upstream Python SDK in
`packages/chatkit-python`. The port should feel idiomatic to TypeScript users
while preserving ChatKit's observable behavior: request and response JSON,
stream event shapes, widget serialization, store contracts, attachment handling,
and Agents SDK conversion behavior.

The upstream Python package remains the behavioral reference. The Bun package
uses independent internal versioning, but each completed parity milestone records
the upstream `openai-chatkit` version and git commit it matches.

## Scope

The first complete port includes:

- Full feature parity with `openai-chatkit` Python SDK version `1.6.5` as found
  in the `packages/chatkit-python` submodule at design time.
- A private package named `chatkit-bun`.
- Runtime parsing and serialization with Zod schemas.
- A low-level `ChatKitServer.process(...)` API equivalent to Python's central
  request processor.
- A Bun-native request handler for use with `Bun.serve`.
- Abstract `Store<TContext>` and `AttachmentStore<TContext>` interfaces.
- A production-usable `bun:sqlite` store implementation.
- Widget builders, dynamic widget parsing, `.widget` template rendering, and
  widget diffing behavior.
- Action config helpers.
- Full parity for the Python SDK's `chatkit.agents` integration layer, using the
  JavaScript or TypeScript OpenAI Agents SDK surface.
- `bun test` coverage equivalent to the upstream Python test suite.
- A documented upstream sync process for applying later `chatkit-python` changes.

Out of scope for the first complete port:

- Publishing to npm or designing public package release automation.
- Preserving Python naming when it conflicts with idiomatic TypeScript, except at
  wire boundaries where JSON compatibility is required.
- Supporting runtimes other than Bun.

## Architecture

The package is organized as focused modules:

- `src/types`: Zod schemas and inferred TypeScript types for requests,
  responses, pages, thread metadata, thread items, stream events, updates,
  attachments, structured input, workflow data, annotations, inference options,
  and agent-related data.
- `src/server`: `ChatKitServer`, `StreamingResult`, `NonStreamingResult`,
  request dispatch, stream processing, cancellation handling, serialization, and
  the Bun request handler.
- `src/store`: `Store<TContext>`, `AttachmentStore<TContext>`,
  `NotFoundError`, store item type definitions, and default ID helpers.
- `src/sqlite`: default `bun:sqlite` store implementation.
- `src/widgets`: static widget builders, dynamic widget schemas, template
  loading/rendering, JSON omission behavior, and widget diffing utilities.
- `src/actions`: action config helpers and typed action creation support.
- `src/agents`: conversion from JavaScript Agents SDK run streams to ChatKit
  thread stream events, including workflow, generated image, annotation, client
  tool call, and guardrail-related behavior.
- `tests`: translated Bun tests, parity fixtures, helper stores, and golden JSON
  fixtures.
- `docs/parity`: upstream version metadata, parity matrix, and sync procedure.

`packages/chatkit-python` is a git submodule and is not imported by runtime code.
It is used for reference, upstream diffing, Python test execution, and optional
fixture generation.

## Data Flow

`ChatKitServer.process(request, context)` is the core entry point. It accepts
JSON as a string, bytes-compatible input, or a Bun `Request` body decoded by the
HTTP helper. It validates the payload through Zod discriminated unions keyed by
`type`.

Streaming requests return a `StreamingResult` backed by an async iterable of
Server-Sent Event bytes. Non-streaming requests return a `NonStreamingResult`
containing JSON bytes. The Bun HTTP helper wraps this same API and returns either
`application/json` or `text/event-stream`, so HTTP support does not become a
separate behavior path.

The request processor handles the same operation classes as Python:

- Thread creation, listing, loading, updating, deletion, retry, and message
  appending.
- Item listing, feedback, replacement, removal, and streaming updates.
- Client tool outputs.
- Structured input submissions.
- Custom actions and synchronous custom actions.
- Attachment creation and deletion.
- Audio transcription requests.

Store implementations own persistence. `ChatKitServer` owns request semantics,
event ordering, stream cancellation behavior, and conversion between stored
thread data and client-facing responses.

## Serialization And Validation

Zod schemas define runtime validation at all wire boundaries. TypeScript types
are inferred from those schemas where practical so the runtime contract and
static contract stay aligned.

Serialization centralizes Python-compatible behavior:

- JSON field names match Python output, including snake_case where Python emits
  snake_case.
- Discriminated unions use `type`.
- `undefined` values are omitted.
- Fields that Python serializes as `null` stay `null`; fields Python omits when
  unset or `None` are omitted by model-specific serializers.
- Datetimes serialize to ISO strings compatible with the Python SDK's output.
- Widget serialization recursively drops unset values while preserving required
  `type` fields.

The TypeScript public API can use idiomatic names and helpers, but all
client-visible JSON remains Python-compatible.

## Store Design

The core store boundary mirrors Python's abstract store contract:

- ID generation for threads and items.
- Loading and saving thread metadata.
- Loading, adding, saving, and deleting thread items.
- Loading paginated thread lists and item lists.
- Saving, loading, and deleting attachment metadata.
- Deleting threads.

The `AttachmentStore<TContext>` boundary handles external attachment lifecycle
operations such as creating upload descriptors and deleting remote files.

The included SQLite implementation uses `bun:sqlite`. It is production-usable
for Bun apps that want a default store, while still serving as a parity fixture
for tests. It preserves the same observable pagination, ordering, upsert, and
not-found behavior asserted by the Python store tests.

## Widgets And Actions

Widget support includes both deprecated static widget builders and dynamic
template-based widgets because both are part of the upstream SDK surface.

The port supports:

- Static component builders for the current Python widget classes.
- Dynamic root and component parsing for widget JSON.
- `.widget` file loading.
- Template rendering with strict missing-variable behavior comparable to
  Python's `jinja2.StrictUndefined`.
- `build(...)` and deprecated `buildBasic(...)` behavior.
- Widget diffing for streaming text deltas and full root replacements.
- Action configuration with handler, loading behavior, streaming, type, and
  payload fields.

Widget tests use golden JSON fixtures from upstream assets to make omission and
rendering differences visible.

## Agents Integration

The first complete port includes full parity for the upstream `chatkit.agents`
module, adapted to the JavaScript or TypeScript OpenAI Agents SDK.

The integration provides:

- Agent context helpers for ID generation, widget streaming, workflow start/end,
  workflow task updates, and custom event streaming.
- Conversion of streamed agent output into ChatKit `ThreadStreamEvent` values.
- Assistant message content part add, text delta, annotation add, and done
  updates.
- Client tool call item creation and completion.
- Generated image item creation and partial progress updates.
- Workflow and reasoning task behavior.
- Conversion from ChatKit thread items to Agents SDK input items.
- Text accumulation helpers.
- Extension points for custom annotation and generated-image conversion.

If the JavaScript Agents SDK differs materially from the Python SDK, the Bun
port should expose a small adapter boundary inside `src/agents` while preserving
the same ChatKit events and tests wherever the upstream behavior is observable.

## Error Handling

The port preserves Python's observable error behavior where it affects
integrations or tests:

- Missing attachment store raises a clear runtime error when file operations are
  requested.
- Unsupported transcription raises a clear `NotImplementedError`-style error.
- Missing threads, items, or attachments raise `NotFoundError`.
- Invalid request JSON fails validation before dispatch.
- Invalid widget streaming updates raise errors for non-cumulative text updates
  or missing persistent node IDs.
- Stream errors produce the same user-facing `error` events where Python catches
  and converts domain errors, and they rethrow where Python rethrows unexpected
  failures.
- Cancellation persists non-empty pending assistant messages and writes SDK
  hidden context, matching Python's cancellation semantics.

Error classes should be idiomatic JavaScript classes, but names and messages
should stay close enough to upstream tests that behavioral drift is obvious.

## Testing Strategy

Testing is required for the first complete port.

The Bun test suite mirrors the Python test suite:

- `test_widgets.py` maps to widget diffing, serialization, and template tests.
- `test_store.py` maps to SQLite store contract tests.
- `test_icons.py` maps to icon validation tests.
- `test_chatkit_server.py` maps to request routing, streaming behavior,
  cancellation, structured input, attachments, custom actions, retry behavior,
  thread updates, deletion, feedback, transcription, and ID generation tests.
- `test_agents.py` maps to agents stream conversion, input conversion, workflow,
  image generation, annotations, guardrail behavior, and text accumulation tests.

Where Python tests compare Pydantic model equality, Bun tests compare normalized
JSON and observable fields. Where byte-level output matters, tests use golden
fixtures. Where upstream Python behavior is complex or likely to change, parity
tests should make the expected upstream version and commit explicit.

Verification for a parity milestone includes:

- `bun test`
- TypeScript type checking
- Python upstream tests in `packages/chatkit-python`
- Any parity fixture generation or comparison script added by the implementation

## Upstream Sync Process

Each upstream sync follows the same checklist:

1. Update the `packages/chatkit-python` submodule to the target upstream commit.
2. Record the upstream package version and commit in a tracked parity metadata
   file under `docs/parity`.
3. Review upstream release notes and the git diff since the last recorded commit.
4. Update the parity matrix for changed public models, request types, stream
   events, widget behavior, store contracts, agents behavior, and tests.
5. Port corresponding code and tests into `chatkit-bun`.
6. Run Python upstream verification.
7. Run Bun verification.
8. Record any intentional differences with rationale.

The Bun package uses independent internal versions. Release notes or milestone
notes for `chatkit-bun` must state the upstream `openai-chatkit` version and
commit that were used as the parity target.

## Acceptance Criteria

The design is complete when:

- The package remains private and named `chatkit-bun`.
- `packages/chatkit-python` is the stable upstream submodule path.
- Core APIs are idiomatic TypeScript while wire JSON matches Python behavior.
- Zod owns runtime validation at request and model boundaries.
- The Bun port includes low-level processing and a Bun-native HTTP helper.
- Store interfaces and a `bun:sqlite` implementation are included.
- Widgets, actions, server processing, attachments, structured input, retries,
  cancellation, and agents conversion have parity coverage.
- Upstream sync metadata and a parity matrix exist.
- The first complete implementation can pass Bun tests and the relevant Python
  upstream tests for the pinned submodule commit.
