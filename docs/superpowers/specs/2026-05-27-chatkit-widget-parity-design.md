# ChatKit Widget Parity Design

## Purpose

This milestone adds full widget runtime parity for `chatkit-bun`, matching the
observable behavior of `packages/chatkit-python` while keeping the TypeScript API
idiomatic. The previous server milestone treats widget items as opaque JSON and
already has stream update event schemas. This milestone adds the typed widget
surface that constructs, validates, templates, diffs, and streams that JSON.

The target is the full Python widget surface, not a server-only helper slice.
That includes deprecated static widget builders, dynamic widget roots and
components, `.widget` template loading, Python-compatible serialization,
`diffWidget(...)`, `streamWidget(...)`, and translated coverage from
`packages/chatkit-python/tests/test_widgets.py`.

## Scope

This milestone includes:

- A public widget module exported from `src/index.ts`.
- Static builders/classes for the Python widget component catalogue.
- Shared widget data types, including `WidgetComponent`, `WidgetRoot`,
  `DynamicWidgetComponent`, `DynamicWidgetRoot`, and `BasicRoot`.
- Recursive widget serialization that omits unset values but preserves required
  `type` fields.
- `WidgetTemplate.fromFile(...)`, `WidgetTemplate.build(...)`, and deprecated
  `WidgetTemplate.buildBasic(...)`.
- `.widget` fixture support using a small Jinja-compatible renderer dependency
  if it provides strict missing-variable behavior and keeps the implementation
  simpler than an internal renderer.
- `diffWidget(...)` for Python-compatible widget root replacements and
  streaming text deltas.
- `streamWidget(...)` for one-off widgets and async widget generators.
- Translated parity tests from `packages/chatkit-python/tests/test_widgets.py`.
- Widget fixture JSON and `.widget` files needed by the translated tests.

This milestone defers:

- Bun HTTP route helpers.
- Agents SDK conversion and `AgentContext.stream_widget(...)`.
- Upstream sync automation and parity matrix tooling.

The deferred Agents milestone will consume the widget helpers from this
milestone instead of redefining widget stream behavior.

## Architecture

Add a dedicated widget module. Start with `src/widgets.ts` unless the component
catalogue becomes large enough during implementation to justify a `src/widgets/`
directory with focused files.

The public surface should include:

- Widget data types:
  - `WidgetComponent`
  - `WidgetRoot`
  - `DynamicWidgetComponent`
  - `DynamicWidgetRoot`
  - `BasicRoot`
- Static component builders/classes that preserve Python names and serialized
  property names, including root components such as `Card`, `ListView`, and
  `Basic`, and leaf/container components such as `Text`, `Markdown`, `Button`,
  `Row`, `Col`, `Box`, and the rest of the Python catalogue.
- Template support through `WidgetTemplate`.
- Runtime helpers:
  - `serializeWidget(...)`
  - `diffWidget(...)`
  - `streamWidget(...)`

`src/types/core.ts` can keep `WidgetItemSchema.widget` as JSON-like data. The
widget module is the typed construction and normalization layer, while stores
and server responses continue to persist and emit plain JSON. This preserves the
wire shape established by the server milestone and avoids coupling persistence
to widget builder classes.

`streamWidget(...)` should use the server event types already defined in
`src/types/server.ts`:

- `thread.item.done` for one-off widgets.
- `thread.item.added` for the first item in an async widget stream.
- `thread.item.updated` with widget updates for intermediate states.
- `thread.item.done` with the final widget state when streaming completes.

## Widget Construction And Serialization

Static component constructors should make common TypeScript usage concise while
serializing to Python-compatible JSON. Python uses Pydantic models with aliases
and recursively drops `None` fields. TypeScript should mirror the observable
output:

- Omit properties whose value is `undefined`.
- Preserve explicit `null` only where the Python wire shape preserves null.
- Recursively omit unset values in nested components and arrays.
- Always preserve required `type` fields.
- Preserve Python/ChatKit property names such as `onClickAction`,
  `loadingBehavior`, `copy_text`, and component-specific camelCase props.

Dynamic widgets should accept arbitrary extra fields for template-rendered JSON,
but roots must be restricted to Python's root types: `Card`, `ListView`, and
`Basic`. `BasicRoot` should serialize as `type: "Basic"` and remain available
for entity preview and deprecated `buildBasic(...)` parity.

The implementation can use Zod schemas internally for runtime validation, but
the exported API should feel like normal TypeScript object construction rather
than requiring users to call schema parsers directly.

## Widget Templates

`WidgetTemplate.fromFile(path)` loads a `.widget` JSON file and returns a
template instance. Absolute paths are loaded directly. Relative paths should
match Python by resolving from the caller's source file using runtime stack
inspection. If Bun stack metadata cannot identify a caller file, relative paths
fall back to `process.cwd()` and that fallback is covered by tests so the
behavior is deterministic.

`WidgetTemplate` validates:

- `version` is supported. The initial supported version is `1.0`.
- `name` is present.
- `template` is present and renderable.
- `jsonSchema`, if present, is retained as metadata.

`build(data)` renders the template with normalized data and validates the result
as a `DynamicWidgetRoot`. `buildBasic(data)` is a deprecated alias that validates
the result as `BasicRoot`.

Template rendering should prefer a small Jinja-compatible dependency. During
implementation, evaluate candidate packages against the upstream fixtures before
adding one. The chosen renderer must meet these requirements:

- `{{ ... }}` interpolation works for the upstream fixtures.
- Missing variables fail strictly instead of rendering as empty strings.
- Rendered output is JSON that can be parsed and validated.
- The dependency does not pull in a large or runtime-inappropriate stack for Bun.

If no suitable dependency meets those requirements, use the smallest internal
renderer that passes the upstream fixtures and records the intentional limitation
in the implementation notes.

## Widget Diffing

`diffWidget(before, after)` mirrors Python's `diff_widget(...)`.

It emits `widget.root.updated` when a full replacement is required, including
when:

- Root or component `type` changes.
- Root or component `id` changes.
- Root or component `key` changes.
- Child structure changes.
- Any non-streaming property changes.
- A `Text` or `Markdown` value changes without satisfying cumulative streaming
  rules.

It emits `widget.streaming_text.value_delta` when:

- The component is `Text` or `Markdown`.
- The component has a stable `id`.
- The new `value` starts with the previous `value`.
- The changed field is only the streaming text value.

The `done` field is `true` when the updated node is no longer marked
`streaming: true`, matching Python's `done = not after.streaming` behavior.

Diffing should throw validation errors for Python-compatible invalid streaming
updates:

- A streaming text node with an `id` appears after the initial render.
- A streaming text node changes to a value that is not cumulative.

`widget.component.updated` is already part of the server event schema, but the
Python reference currently returns root replacements or streaming text deltas for
the translated tests. The implementation should not invent component update
behavior beyond what upstream currently exercises unless a reference path is
found during implementation.

## Widget Streaming

`streamWidget(thread, widget, options)` streams widget roots as
`ThreadStreamEvent` values. It accepts either a single `WidgetRoot` or an async
iterable of widget roots.

For a single widget root, it emits one `thread.item.done` event containing a
`WidgetItem` with:

- Generated item id.
- `thread_id` from the thread.
- Current timestamp.
- Serialized widget JSON.
- Optional `copy_text`.

For an async widget sequence, it:

1. Reads the first widget state.
2. Emits `thread.item.added` with that initial widget item.
3. Diffs each later state against the previous state and emits
   `thread.item.updated` events for each update.
4. Emits `thread.item.done` with the final widget state.

The helper should accept an id generator option compatible with the existing
store/server pattern, so responders can pass `store.generateItemId(...)` just as
Python passes `generate_id`.

Empty async widget sequences are an edge case not covered by the Python helper,
which awaits the first item. TypeScript should fail clearly if the generator
finishes before yielding an initial widget.

## Error Handling

Observable errors should stay close to Python where they affect parity:

- Unsupported `.widget` versions throw a clear `ValueError`-style error.
- Missing template variables throw strict render errors.
- Invalid rendered JSON throws with template context.
- Rendered JSON that is not a valid dynamic root throws validation errors.
- `buildBasic(...)` throws if the rendered root is not `Basic`.
- Streaming text nodes that appear late throw.
- Non-cumulative streaming text updates throw.

The implementation can use existing project error classes where they fit, but
messages should remain close enough to upstream tests that behavioral drift is
easy to detect.

## Testing Strategy

Testing is parity-led. Add `tests/widgets.test.ts` as a translation of
`packages/chatkit-python/tests/test_widgets.py`.

Coverage should include:

- `diffWidget(...)` no-op cases.
- Streaming `Text` and `Markdown` delta cases.
- Full root replacement cases.
- Dynamic widget root diff cases.
- JSON serialization that omits unset fields at top level and nested levels.
- `WidgetItem` serialization with nested widgets.
- `WidgetTemplate.fromFile(...)` for all upstream `.widget` fixtures.
- `WidgetTemplate.build(...)` with and without data.
- `WidgetTemplate.buildBasic(...)` behavior and deprecation signal.
- Strict missing-variable behavior for templates.
- Public exports from `src/index.ts`.
- `streamWidget(...)` one-off widget output.
- `streamWidget(...)` async generator output and finalization.
- `streamWidget(...)` error cases for invalid diff transitions.

Fixture files should live under `tests/assets/widgets` and match upstream assets
closely enough that expected JSON can be compared directly.

Verification for this milestone is:

- `bun run verify`
- Focused widget tests with `bun test tests/widgets.test.ts`

If a renderer dependency is added, fixture tests must prove that it preserves the
Python-relevant behavior rather than merely producing similar output.

## Acceptance Criteria

This milestone is complete when:

- The package exports the widget module from `src/index.ts`.
- Static widget builders/classes cover the upstream Python catalogue.
- Dynamic widget roots and components validate template-rendered JSON.
- Widget serialization matches Python omission behavior for translated tests.
- `.widget` template fixtures render to the expected JSON.
- `diffWidget(...)` matches upstream diff behavior for translated cases.
- `streamWidget(...)` emits Python-compatible thread stream events for static
  and async widget inputs.
- `WidgetItem` continues to store and emit plain JSON-compatible widget data.
- `bun run verify` passes.

## Follow-Up Milestones

After widget parity, the remaining full-parity path is:

1. Bun HTTP request handler.
2. Agents SDK stream conversion, including `AgentContext.streamWidget(...)`.
3. Upstream sync tooling and parity matrix automation.
