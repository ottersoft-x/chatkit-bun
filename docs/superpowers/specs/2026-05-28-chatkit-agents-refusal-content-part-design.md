# ChatKit Agents Refusal Content Part Design

## Purpose

This milestone adds refusal/content-part parity to the TypeScript
`streamAgentResponse(...)` bridge. The JavaScript OpenAI Responses stream can
emit assistant refusal content through `response.content_part.added`,
`response.refusal.delta`, `response.refusal.done`, and final message content.
ChatKit should surface that refusal text instead of dropping it.

The behavior follows the Python `chatkit.agents` reference: non-reasoning
assistant content is converted into ChatKit assistant message content, with
refusals represented as text content and no annotations.

## Scope

This milestone includes:

- Converting `refusal` content parts into existing ChatKit
  `assistant_message` output text content.
- Handling streamed refusal content part added, delta, and done events.
- Including refusal parts in final assistant messages produced from
  `response.output_item.done` and normalized `response_done` events.
- Preserving existing output text annotation conversion and custom converter
  behavior.
- Focused tests for streamed refusal events, final refusal content, normalized
  response completion, and output text regressions.

This milestone does not include:

- New ChatKit schemas or a dedicated refusal content type.
- Public API changes to `ResponseStreamConverter`.
- Server persistence changes.
- Guardrail rollback changes.
- Input conversion or replay changes.
- Audio, image, or file content part parity.

## Current Behavior

`src/agents/annotations.ts` exposes `convertTextContentPart(...)`, which only
accepts content parts whose `type` is `output_text`. It returns `null` for any
other content part.

`src/agents/stream.ts` uses that helper when final assistant message content is
converted. As a result, final refusal parts are dropped from assistant messages.
The stream bridge also handles `response.output_text.delta`,
`response.output_text.done`, and `response.output_text.annotation.added`, but it
does not handle:

- `response.content_part.added`
- `response.refusal.delta`
- `response.refusal.done`

The Python reference maps `refusal` content to `AssistantMessageContent` with
the refusal text and an empty annotations list. It ignores reasoning-text
content parts in `response.content_part.added`.

## Desired Behavior

The TypeScript bridge should treat refusal content as ChatKit assistant output
text because the existing public schema only has `output_text` assistant content.

When a raw Responses event contains:

- `response.content_part.added` with `part.type === "output_text"` or
  `part.type === "refusal"`, yield `thread.item.updated` with
  `assistant_message.content_part.added`.
- `response.content_part.added` with `part.type === "reasoning_text"`, ignore
  it. Reasoning text continues to be handled by the existing reasoning summary
  event path.
- `response.refusal.delta`, yield `assistant_message.content_part.text_delta`
  and update the same accumulated text state used for output text deltas.
- `response.refusal.done`, yield `assistant_message.content_part.done` with
  `content.text` from `rawData.refusal`.

When final assistant item content contains refusal parts, the resulting
`thread.item.done` assistant message should include each refusal part as:

```ts
{ type: "output_text", text: refusalText, annotations: [] }
```

Output text parts keep their existing annotation conversion behavior. Invalid or
unsupported content parts continue to be skipped.

## Architecture

Rename or wrap `convertTextContentPart(...)` in `src/agents/annotations.ts` with
a private implementation that converts assistant text-like content. The public
surface can remain source-compatible by keeping `convertTextContentPart(...)`
exported and broadening its accepted content internally:

- `output_text` maps exactly as it does today, including annotations.
- `refusal` maps to `output_text` with `text` from `part.refusal` and an empty
  annotations array.
- other content types return `null`.

`src/agents/stream.ts` should keep using this converter for final message
content. It should add cases in `convertSdkEvent(...)` for:

- `response.content_part.added`
- `response.refusal.delta`
- `response.refusal.done`

The new stream cases should use the same `item_id`, `content_index`, fallback
item id, `partKey(...)`, and `state.textByPart` conventions as the existing
output text cases. This keeps final `response_done` fallback behavior aligned
for streams that provide deltas before final content.

## Data Flow

Streaming refusal:

1. `response.output_item.added` creates or identifies an assistant message item.
2. `response.content_part.added` with a refusal part yields a content-part-added
   update.
3. `response.refusal.delta` yields text deltas and accumulates text by
   `item_id` and `content_index`.
4. `response.refusal.done` yields a content-part-done update with the final
   refusal text.
5. `response.output_item.done` yields the final assistant message item,
   including refusal content.

Normalized final response:

1. Normalized `response_done` locates the assistant message output item.
2. The final content array is converted through the broadened content converter.
3. Refusal parts are retained as output text content.

## Error Handling

Malformed refusal parts should be skipped by the content converter if
`part.refusal` is not a string. This matches the existing output text behavior
for missing `part.text`.

No new error conversion behavior is added. Exceptions from custom annotation
conversion for output text continue to propagate through the existing stream
path. Refusal conversion does not invoke custom annotation conversion.

## Testing

Add focused tests in `tests/agents.test.ts`:

- `response.content_part.added` with an output text part still yields
  `assistant_message.content_part.added` with converted annotations.
- `response.content_part.added` with a refusal part yields
  `assistant_message.content_part.added` with output text content and no
  annotations.
- `response.content_part.added` with reasoning text is ignored.
- `response.refusal.delta` yields a text delta update and contributes to
  accumulated fallback text.
- `response.refusal.done` yields a content part done update using
  `rawData.refusal`.
- Final `response.output_item.done` with mixed output text and refusal content
  preserves both content parts.
- Normalized `response_done` with refusal content preserves the refusal text.
- Existing custom converter and annotation tests still pass.

Verification should use:

```bash
bun test tests/agents.test.ts
bun run typecheck
bun run verify
```

## Acceptance Criteria

- Streamed refusal added, delta, and done events are converted to existing
  assistant message update event shapes.
- Final assistant messages include refusal content instead of dropping it.
- Output text annotation and custom converter behavior remains unchanged.
- Reasoning text content parts in `response.content_part.added` remain ignored.
- No public schema, server, guardrail, or input conversion behavior changes are
  introduced.
- `bun run verify` passes.
