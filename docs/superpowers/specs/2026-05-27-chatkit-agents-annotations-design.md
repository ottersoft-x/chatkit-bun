# ChatKit Bun Agents Annotations Design

## Purpose

This milestone extends the merged Agents core bridge with annotation and citation
conversion. The previous slice maps assistant text and client tool calls from
`@openai/agents` streams into existing ChatKit `ThreadStreamEvent` objects, but
it intentionally emits `annotations: []` for assistant text content.

This slice fills that gap for the citation shapes already represented by the
ChatKit core schemas: file citations, container file citations, and URL
citations. It also introduces a narrow converter hook so applications can
customize citation metadata without replacing the stream bridge.

## Scope

This milestone includes:

- A public `ResponseStreamConverter`-style API in `src/agents`.
- Default conversion for Responses citation annotations:
  - `file_citation`
  - `container_file_citation`
  - `url_citation`
- Streaming `response.output_text.annotation.added` conversion into
  `assistant_message.content_part.annotation_added`.
- Final assistant message content conversion so `thread.item.done` and
  normalized `response_done` outputs include converted annotations.
- Compacted annotation indices when invalid or unsupported annotations are
  dropped.
- Focused tests for default conversion, custom converter overrides, streaming
  annotation events, and final message annotations.

This milestone defers:

- Generated image events and partial image progress.
- Reasoning/workflow stream conversion.
- Widget helpers on `AgentContext`.
- Guardrail rollback and produced-item removal.
- Input conversion and replay.
- Non-citation annotation types unless the current SDK exposes a citation shape
  that maps cleanly to existing ChatKit `Source` schemas.
- Refusal/content-part-added parity beyond what is required to attach
  annotations to existing output text.

## Architecture

Keep the implementation inside the existing agents module:

```ts
src/agents/
  annotations.ts
  context.ts
  stream.ts
  types.ts
  index.ts
```

`annotations.ts` owns citation conversion and exports the public converter API.
`stream.ts` imports that converter and remains responsible for event ordering,
state tracking, and validation. `index.ts` re-exports the new public types and
class/function values.

The preferred public shape is a small class with overridable methods:

```ts
class ResponseStreamConverter {
  fileCitationToAnnotation(annotation: unknown): Annotation | null;
  containerFileCitationToAnnotation(annotation: unknown): Annotation | null;
  urlCitationToAnnotation(annotation: unknown): Annotation | null;
}
```

`streamAgentResponse(...)` should accept an optional `converter`:

```ts
streamAgentResponse(agentContext, streamedRun, { converter });
```

When no converter is provided, the bridge uses a shared default converter. This
keeps the common path simple while letting applications customize source titles,
descriptions, grouping, or entity mapping later.

## Default Citation Mapping

Default mapping should mirror the Python reference where possible:

- `file_citation` with a non-empty `filename` becomes an `Annotation` whose
  `source` is `{ type: "file", filename, title: filename }` and whose `index`
  is the citation `index`.
- `container_file_citation` with a non-empty `filename` becomes the same file
  source shape, using `end_index` as `index`.
- `url_citation` becomes an `Annotation` whose `source` is
  `{ type: "url", url, title }` and whose `index` is `end_index`.
- Missing filenames return `null` instead of emitting invalid file sources.
- Unsupported annotation types return `null`.

The converter should be defensive because the Python reference notes that raw
annotation events can arrive as plain objects rather than typed SDK instances.
The TypeScript bridge should treat all SDK annotation payloads as `unknown` and
extract only the fields it needs.

## Stream Event Conversion

For direct Responses stream events, handle:

```ts
response.output_text.annotation.added
```

The bridge should convert the raw annotation with the active converter. If the
converter returns an `Annotation`, yield:

```ts
{
  type: "thread.item.updated",
  item_id,
  update: {
    type: "assistant_message.content_part.annotation_added",
    content_index,
    annotation_index,
    annotation,
  },
}
```

The emitted `annotation_index` should be compacted per `item_id` and
`content_index`, not copied blindly from the SDK event. This preserves stable
indices when invalid annotations are dropped. For example, if the first SDK
annotation is an invalid file citation and the next two are valid, the emitted
indices should be `0` and `1`.

The existing `rawResponseData(...)` path already unwraps `raw_response_event`,
`raw_model_stream_event`, direct `response.*` events, and nested `model.event`
provider events. Annotation conversion should reuse that path so provider-nested
`response.output_text.annotation.added` events work the same as direct events.

Normalized `@openai/agents` events such as `output_text_delta` and
`response_done` do not carry streaming annotation deltas today. They should not
invent annotation events. They should only include annotations that are present
on final response output content.

## Final Content Conversion

The current bridge builds final assistant content with:

```ts
{ type: "output_text", text, annotations: [] }
```

This slice should replace that with converter-backed content conversion for
message content parts. For each output text content part:

- Use `part.text` as the ChatKit `text`.
- Convert each `part.annotations` entry with the active converter.
- Drop `null` conversions.
- Preserve the converted annotation order in the final content array.

This applies to both direct `response.output_item.done` and normalized
`response_done` paths. It should continue to use accumulated fallback text when
the final SDK item does not contain output text content.

If a content part is not output text, this slice should continue to ignore it
unless the bridge already has a safe text fallback. Refusal handling is
deferred.

## Error Handling

Converter methods should not cause malformed ChatKit events to leak. Outgoing
events continue to be validated with `ThreadStreamEventSchema.parse(...)`.

If a custom converter throws, the error should propagate through the existing
stream iterator. `ChatKitServer.processEvents(...)` already converts thrown
stream failures into the standard `stream.error` behavior when the bridge is
used from a server response. Swallowing converter errors would make application
bugs hard to diagnose.

Invalid citation payloads should not throw in the default converter. They should
return `null` so the bridge can drop them and compact annotation indices.

## Testing Strategy

Extend `tests/agents.test.ts` with network-free fixtures. Coverage should
include:

- Default file citation conversion into a file source.
- Default container file citation conversion using `end_index`.
- Default URL citation conversion into a URL source.
- Invalid file/container citations with empty filenames are dropped.
- Streaming `response.output_text.annotation.added` emits
  `assistant_message.content_part.annotation_added`.
- Dropped annotations compact subsequent emitted indices.
- `response.output_item.done` final content includes converted annotations.
- Normalized `response_done` final content includes converted annotations.
- A custom converter is used for both streaming annotation-added events and final
  message content.
- Nested `raw_model_stream_event` with `data.type === "model"` and provider
  `response.output_text.annotation.added` maps through the same path.
- Existing assistant text, client tool, merge fairness, cancellation, and export
  tests remain green.

Full verification for the implementation plan should include:

```bash
bun run verify
```

## Acceptance Criteria

The milestone is complete when:

- `ResponseStreamConverter` or an equivalent public converter API is exported
  from `src/agents` and the package root.
- Default converter behavior matches the citation mapping in this design.
- `streamAgentResponse(...)` accepts an optional converter without breaking the
  existing call signature.
- Streaming annotation-added events emit validated ChatKit annotation updates.
- Final assistant message content includes converted annotations where the SDK
  final output contains them.
- Invalid or unsupported annotations are dropped with compact emitted indices.
- The implementation remains limited to annotations/citations and does not add
  image, workflow, guardrail, widget, or input-conversion behavior.
- `bun run verify` passes.
