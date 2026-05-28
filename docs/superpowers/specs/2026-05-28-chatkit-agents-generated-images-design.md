# ChatKit Bun Agents Generated Images Design

## Purpose

This milestone extends the merged Agents stream bridge with generated image
conversion. The current bridge handles assistant text, citation annotations, and
client tool calls, and the core schemas already include `generated_image` items
and `generated_image.updated` updates. This slice wires those existing ChatKit
shapes to Responses image generation stream events.

The goal is parity with the Python `chatkit.agents` behavior for image
generation calls while keeping workflows, reasoning, guardrails, widgets, and
input replay in later milestones.

## Scope

This milestone includes:

- Default conversion of final base64 image results into data URLs.
- A public converter hook for applications that need to store images elsewhere
  and return hosted URLs.
- Partial image progress updates for
  `response.image_generation_call.partial_image`.
- Progress normalization through a `partialImages` converter option.
- Focused stream tests and server persistence lifecycle tests.

This milestone defers:

- Reasoning and workflow stream conversion.
- Generated image input conversion/replay.
- Guardrail rollback and produced-item removal.
- Widget helpers on `AgentContext`.
- Multiple simultaneous generated image calls beyond preserving the current
  single active image item behavior used by the Python reference.

## Architecture

Keep the work inside the existing Agents bridge and core server lifecycle:

```text
src/agents/annotations.ts
src/agents/stream.ts
src/agents/types.ts
src/server.ts
tests/agents.test.ts
tests/server.test.ts
tests/exports.test.ts
```

`ResponseStreamConverter` remains the public extension point. It already owns
annotation conversion; this slice adds generated image conversion methods to the
same class so applications pass one converter object to `streamAgentResponse`.

`stream.ts` remains responsible for event ordering, active item state, and
validating outgoing `ThreadStreamEvent` values. It should track one active
generated image item and emit the existing ChatKit event shapes:

- `thread.item.added` with a `generated_image` item and `image: null`.
- `thread.item.updated` with `generated_image.updated` for partial progress.
- `thread.item.done` with the final `generated_image` item.

`server.ts` should only change if persistence currently drops or mishandles
generated image partial/final updates. Any server change must be covered by a
lifecycle regression and kept independent from assistant-message annotation
merge logic.

## Converter API

Extend `ResponseStreamConverter` with:

```ts
export interface ResponseStreamConverterOptions {
  partialImages?: number | null;
}

class ResponseStreamConverter {
  constructor(options?: ResponseStreamConverterOptions);

  base64ImageToUrl(
    imageId: string,
    base64Image: string,
    partialImageIndex?: number | null,
  ): string | Promise<string>;

  partialImageIndexToProgress(partialImageIndex: number): number;
}
```

Default behavior:

- `base64ImageToUrl(...)` returns `data:image/png;base64,<base64Image>`.
- `partialImageIndexToProgress(...)` returns `0` when `partialImages` is unset,
  `null`, or less than or equal to zero.
- Otherwise, progress is `Math.min(1, partialImageIndex / partialImages)`.

The hook may be asynchronous because real applications often upload base64 image
bytes to object storage. Converter errors should propagate through the existing
stream iterator; `ChatKitServer` already converts stream failures into standard
stream error behavior when used through server processing.

The previously exported `defaultResponseStreamConverter` should remain available
and should use the default options.

## Stream Event Conversion

Handle these raw Responses events through the existing `rawResponseData(...)`
path, including direct `raw_response_event`, `raw_model_stream_event`, and nested
provider model events:

```text
response.output_item.added
response.image_generation_call.partial_image
response.output_item.done
```

When `response.output_item.added` contains `item.type === "image_generation_call"`:

- Generate a ChatKit item ID with `context.store.generateItemId("message", ...)`,
  matching the Python bridge's use of the message ID namespace.
- Create a `generated_image` item with `image: null`.
- Store it as the active generated image item.
- Yield `thread.item.added`.

When `response.image_generation_call.partial_image` arrives:

- Ignore the event if there is no active generated image item.
- Convert `partial_image_b64` with `converter.base64ImageToUrl(...)`, passing the
  SDK `item_id` and `partial_image_index`.
- Compute progress with `converter.partialImageIndexToProgress(...)`.
- Update the active item image to `{ id: item_id, url }`.
- Yield `thread.item.updated` with:

```ts
{
  type: "generated_image.updated",
  image: { id: itemId, url },
  progress,
}
```

When `response.output_item.done` contains an image generation call with a final
`result`:

- Ignore the event if there is no active generated image item.
- Convert `result` with `converter.base64ImageToUrl(...)`, passing no partial
  image index.
- Set the active item image to `{ id: item.id, url }`.
- Yield `thread.item.done` with the active generated image item.
- Clear the active generated image item.

If `response.output_item.done` has no final result, keep the slice conservative:
do not emit a done item. This matches the existing Python guard and avoids
persisting an empty final image as completed.

## Persistence

The existing server update path already supports `generated_image.updated`.
Implementation should verify that a generated image added event followed by a
partial update and final done item persists the final image. If that lifecycle
fails, fix only the generated-image merge/update path and cover it with a server
test.

Partial image updates are useful for live clients but are not required to persist
as final state if a final done item follows. The stored item after a normal
stream should contain the final image URL.

## Testing Strategy

Extend `tests/agents.test.ts` with network-free fixtures:

- `ResponseStreamConverter` default `base64ImageToUrl(...)` returns a data URL.
- `partialImageIndexToProgress(...)` returns `0` by default and normalized values
  when `partialImages` is set.
- `response.output_item.added` for `image_generation_call` emits a
  `generated_image` item with `image: null`.
- `response.output_item.done` with a final result emits a done generated image
  item with a data URL.
- A custom converter is used for final image conversion.
- Partial image events emit `generated_image.updated` with normalized progress.
- A custom converter receives `(imageId, base64Image, partialImageIndex)` for
  partial images and `(imageId, base64Image, null)` for final images.
- Nested provider/model raw event wrappers use the same conversion path.

Extend `tests/server.test.ts` to prove lifecycle persistence:

- A stream with generated image added, partial update, and final done stores the
  final generated image item.

Existing assistant text, annotations, client tool, merge fairness, cancellation,
and export tests must remain green.

Full verification for the implementation plan should include:

```bash
bun run verify
```

## Acceptance Criteria

The milestone is complete when:

- `ResponseStreamConverter` supports generated image conversion and partial
  progress options without breaking existing annotation APIs.
- `streamAgentResponse(...)` emits validated ChatKit events for generated image
  added, partial update, and final done events.
- Default conversion matches Python-visible behavior: base64 data URLs and
  progress `0` unless partial count is configured.
- Custom converter overrides work for partial and final image URLs.
- Generated image lifecycle persistence is either verified as already correct or
  fixed with a focused server regression.
- The implementation remains limited to generated image stream conversion and
  does not add workflow, reasoning, guardrail, widget, or input replay behavior.
- `bun run verify` passes.
