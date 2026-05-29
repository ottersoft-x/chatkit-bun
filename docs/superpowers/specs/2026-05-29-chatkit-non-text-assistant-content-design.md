# ChatKit Non-Text Assistant Content Design

## Purpose

This milestone resolves the `non-text-assistant-content` parity row by making the
current upstream contract explicit. The pinned Python reference test named
`test_stream_agent_response_assistant_message_content_types` verifies assistant
message content conversion, but the concrete assistant-message content in the
pinned OpenAI Responses types is limited to text-like output:

- `output_text`, which ChatKit Bun already preserves with supported annotations.
- `refusal`, which ChatKit Bun already maps into existing ChatKit output text.

Other rich outputs, such as generated images, are not assistant-message content
parts in the pinned contract. They are separate Responses output items and are
already covered by the `agents-generated-images` parity row.

## Scope

This milestone includes:

- Reclassifying `non-text-assistant-content` from `deferred` to
  `not-applicable` for the current pinned upstream contract.
- Documenting the evidence from pinned Python tests, pinned OpenAI Responses
  types, ChatKit thread types, and current Bun schemas.
- Updating parity smoke coverage so the known deferred list no longer treats
  this row as an open implementation gap.
- Keeping existing text, refusal, generated-image, annotation, and server
  persistence tests green.

This milestone does not include:

- Public ChatKit assistant-message content schema changes.
- New assistant content part event shapes.
- Audio, image, or file assistant-message content support invented ahead of an
  upstream ChatKit wire contract.
- Changes to generated-image handling.
- Changes to input conversion, annotation replay, or entity source mapping.

## Current Behavior

`src/types/core.ts` models assistant message content as a list of
`output_text` parts with text and annotations. `src/types/server.ts` uses that
same content schema for assistant message content-part updates.

`src/agents/annotations.ts` converts supported Responses assistant content
parts into that ChatKit shape:

- `output_text` becomes ChatKit `output_text` and preserves supported citation
  annotations.
- `refusal` becomes ChatKit `output_text` with an empty annotation list.
- Unsupported content parts return `null` and are skipped.

`src/agents/stream.ts` handles streamed assistant text and refusal events, final
assistant messages, normalized response completion, and generated image output
items. Generated images intentionally produce `generated_image` thread items
rather than assistant-message content parts.

The parity matrix still marks `non-text-assistant-content` as deferred even
though the remaining alleged non-text assistant-message content has no concrete
pinned upstream shape to implement.

## Evidence

Pinned Python behavior:

- `packages/chatkit-python/tests/test_agents.py` exercises assistant content
  conversion with `ResponseOutputText` parts.
- The same test's effective non-plain-text assistant case is still text-like
  assistant content: annotated and unannotated output text.
- Python generated-image coverage is a separate test and emits
  `GeneratedImageItem`, not assistant-message content.

Pinned OpenAI Responses types:

- `ResponseOutputMessage.content` is typed as
  `Array<ResponseOutputText | ResponseOutputRefusal>`.
- `response.content_part.added` and `response.content_part.done` carry
  `ResponseOutputText`, `ResponseOutputRefusal`, or `reasoning_text`.
- `reasoning_text` is reasoning workflow content, not public assistant-message
  content.

Pinned ChatKit thread types:

- `ChatKitThreadAssistantMessageItem.content` is
  `Array<ChatKitResponseOutputText>`.
- `ChatKitResponseOutputText` only has `type: "output_text"`, `text`, and
  annotations.

Current Bun coverage:

- Output text and annotations are covered by `tests/agents.test.ts`,
  `tests/server.test.ts`, and `tests/parity-smoke.test.ts`.
- Refusal content is covered by `tests/agents.test.ts`.
- Generated images are covered by `tests/agents.test.ts`,
  `tests/server.test.ts`, and the `agents-generated-images` matrix row.

## Desired Behavior

The matrix should represent this row as `not-applicable` under the current
pinned upstream contract. The row should explain that there are no additional
assistant-message content part types to implement beyond text and refusal, and
that generated images are intentionally tracked as separate thread items.

No runtime conversion should change. If a future upstream version adds a
concrete ChatKit assistant-message content shape for audio, image, file, or any
other rich assistant content, parity should be reopened as a new implementation
slice based on that specific contract.

## Architecture

Keep this work in the parity documentation and smoke-test boundary:

```text
docs/parity/matrix.json
tests/parity-smoke.test.ts
```

The implementation plan should not modify production code unless verification
uncovers stale assumptions in the current test suite. Existing stream and schema
code should remain the source of truth for the already-covered text/refusal
contract.

## Data Flow

There is no new runtime data flow. Existing flows remain:

1. Responses assistant `output_text` and `refusal` parts are converted into
   ChatKit assistant `output_text` content.
2. Responses generated-image calls are converted into ChatKit
   `generated_image` items.
3. Unsupported assistant-message content parts are skipped because there is no
   ChatKit assistant content schema for them.

## Error Handling

No new error behavior is added. Unsupported content parts continue to return
`null` from the converter and are skipped. If upstream introduces a new required
content type later, that behavior should be revisited with the new contract in
hand.

## Testing

Update `tests/parity-smoke.test.ts` to:

- Remove `non-text-assistant-content` from the known deferred row assertion.
- Assert that the row is classified as `not-applicable`.
- Assert that its notes mention the current output-text/refusal contract or the
  absence of additional assistant-message content parts.

Existing coverage should continue to prove the supported behavior:

- `bun test tests/agents.test.ts tests/server.test.ts tests/parity-smoke.test.ts`
- `bun run typecheck`
- `bun run verify`
- `bun run verify:parity`

## Acceptance Criteria

- `docs/parity/matrix.json` classifies `non-text-assistant-content` as
  `not-applicable`.
- The row cites this spec and current local coverage instead of empty local
  references.
- `tests/parity-smoke.test.ts` protects the reclassification and keeps the
  remaining deferred-row list accurate.
- No public schemas, stream events, or conversion behavior change.
- Full Bun verification and parity verification pass.
