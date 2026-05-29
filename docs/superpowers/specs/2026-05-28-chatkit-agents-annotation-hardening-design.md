# ChatKit Agents Annotation Hardening Design

## Purpose

This milestone hardens ChatKit Bun's Agents annotation conversion for practical
compatibility with `@openai/agents` streams and ChatKit JS consumers.

The existing bridge already converts the core Responses citation shapes into
ChatKit annotations. This slice locks that behavior down with parity fixtures,
clarifies malformed payload policy, and aligns one small URL title edge case
with the Python reference without changing public stream event shapes or adding
new ChatKit schemas.

## Scope

This milestone includes:

- Regression coverage for mixed final assistant content with multiple annotation
  types.
- Explicit coverage that supported citation annotations are preserved in order
  while unsupported annotation types, including `file_path`, are dropped.
- Explicit malformed payload policy for the default `ResponseStreamConverter`.
- URL citation title edge behavior that accepts an empty string title but still
  rejects missing or non-string titles.
- Streaming annotation coverage for non-zero `content_index` values.
- Coverage that `response.output_text.done` continues to emit text content with
  `annotations: []`.
- Coverage that existing server-side annotation merge behavior remains intact.

This milestone does not include:

- New ChatKit annotation, source, or assistant content schemas.
- Default entity source mapping.
- Default conversion for non-citation annotation types.
- Input-side replay of assistant annotations back into OpenAI Agents input.
- Changes to `@openai/agents` stream event shapes.
- Changes to custom converter method names or the public
  `streamAgentResponse(...)` options shape.
- Matching Python's possible Pydantic throw-on-invalid behavior for malformed
  annotation payloads.

## Current Behavior

`src/agents/annotations.ts` owns default annotation conversion through
`ResponseStreamConverter`.

The default converter currently supports:

- `file_citation` to ChatKit file source, using `filename` as both filename and
  title and `index` as the annotation index.
- `container_file_citation` to ChatKit file source, using `filename` as both
  filename and title and `end_index` as the annotation index.
- `url_citation` to ChatKit URL source, using `url`, `title`, and `end_index`.

Unsupported annotation types and invalid citation payloads return `null`.
Stream conversion drops those `null` results and compacts emitted
`annotation_index` values per `item_id` and `content_index`.

Final assistant content conversion uses the same converter for annotations
embedded in `output_text` parts. Refusal parts map to ChatKit `output_text`
content with an empty annotations array. Other assistant content parts are
ignored.

The main implementation gap is not broad functionality. It is that several
important compatibility edges are implicit or only partially covered by tests:
mixed final content, explicit `file_path` drops, invalid payload handling inside
content annotation arrays, URL title edge behavior, annotations on content parts
after index 0, and the contract that done events still carry no annotations.

## Desired Behavior

Default annotation conversion should remain conservative and stable for runtime
use with ChatKit JS:

1. Valid supported citations convert into existing ChatKit `Annotation` objects.
2. Unsupported citation-like payloads return `null` and are dropped.
3. Malformed payloads return `null` rather than throwing.
4. Streamed annotation indices are compacted after drops.
5. Custom converter exceptions still propagate, because application converter
   bugs should not be silently hidden.

The only default converter behavior change in this milestone is URL title
handling:

- `url_citation` should require `url` to be a non-empty string.
- `url_citation` should require `title` to be a string.
- `url_citation` should allow `title: ""`.
- missing, `null`, or non-string `title` values should still drop the citation.

This brings TypeScript closer to the Python reference, which forwards the
Responses URL citation title as supplied by the SDK, while still preserving a
valid ChatKit source shape where `title` is required.

## Architecture

Keep production behavior changes inside the existing Agents conversion boundary:

```ts
src/agents/annotations.ts
src/agents/stream.ts
tests/agents.test.ts
tests/server.test.ts
```

`annotations.ts` remains the only default annotation converter implementation.
It should continue to treat SDK payloads as `unknown` and extract only the
fields needed for ChatKit.

`stream.ts` should not grow new event shapes. Any added tests should verify the
existing paths:

- `response.output_text.annotation.added`
- `response.output_text.done`
- `response.output_item.done`
- normalized `response_done`

`server.ts` should not need a behavior change. Its existing pending text merge
behavior should remain covered because it is important for ChatKit JS clients:
when streamed annotations arrive before a content-part done event with
`annotations: []`, the server preserves the previously streamed annotations in
stored thread state.

## Data Flow

Streaming annotation flow:

1. OpenAI Agents emits a raw Responses
   `response.output_text.annotation.added` event.
2. `streamAgentResponse(...)` unwraps the raw event and sends
   `event.annotation` to the active `ResponseStreamConverter`.
3. If the converter returns `null`, no ChatKit event is emitted.
4. If the converter returns an `Annotation`, the bridge emits
   `assistant_message.content_part.annotation_added` with the next compacted
   annotation index for that `item_id` and `content_index`.

Final content flow:

1. OpenAI Agents emits `response.output_item.done` or normalized
   `response_done` with final assistant message content.
2. Each `output_text` part is converted into ChatKit output text.
3. Each raw annotation in `part.annotations` is passed through the active
   converter.
4. Converted annotations are preserved in order; `null` conversions are skipped.
5. Unsupported content parts continue to be ignored unless existing bridge logic
   already maps them to text.

Done event flow:

1. OpenAI Agents emits `response.output_text.done`.
2. The bridge emits `assistant_message.content_part.done` with text and
   `annotations: []`.
3. Server-side merge logic may preserve earlier streamed annotations when
   applying that done update to stored state.

## Error Handling

The default converter should not throw for malformed SDK payloads. It should
return `null` for:

- non-object annotation payloads,
- unknown `type` values,
- empty file/container filenames,
- missing or non-string URL citation fields,
- unsupported valid annotation types such as `file_path`.

Non-integer indices should continue to become `null` rather than causing the
whole annotation to be dropped. This matches the existing ChatKit annotation
schema where `index` is optional and nullable.

Custom converter exceptions should continue to propagate through the stream
iterator. This preserves existing behavior and avoids hiding application bugs.

## Testing

Add focused coverage in `tests/agents.test.ts`:

- `ResponseStreamConverter` accepts URL citations with `title: ""` and drops URL
  citations with missing, `null`, or non-string titles.
- Final `response.output_item.done` content preserves mixed annotations in
  order across `file_citation`, `container_file_citation`, and `url_citation`
  while dropping `file_path` and malformed entries.
- Normalized `response_done` follows the same annotation filtering rules.
- `response.output_text.annotation.added` emits annotations for
  `content_index > 0` and compacts indices per content part after drops.
- `response.output_text.done` emits `annotations: []` even when annotations were
  streamed earlier.

Add or preserve focused coverage in `tests/server.test.ts`:

- The server keeps streamed annotations when applying a content-part done update
  whose content has `annotations: []`.

Verification should use:

```bash
bun test tests/agents.test.ts
bun test tests/server.test.ts
bun run typecheck
bun run verify
```

## Acceptance Criteria

- Default annotation conversion remains defensive and does not throw for
  malformed SDK annotation payloads.
- URL citations with an empty string title are preserved.
- URL citations with missing or non-string titles are dropped.
- Mixed final assistant content annotations match the supported Python/OpenAI
  citation mapping and explicitly drop unsupported `file_path` annotations.
- Streaming annotation indices remain compacted per `item_id` and
  `content_index`.
- `response.output_text.done` continues to emit `annotations: []`.
- Existing server-side annotation merge behavior remains protected by tests.
- No public schemas, stream event shapes, or converter method names change.
- `bun run verify` passes.
