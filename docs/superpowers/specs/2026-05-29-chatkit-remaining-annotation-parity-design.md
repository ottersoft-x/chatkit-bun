# ChatKit Remaining Annotation Parity Design

## Purpose

This milestone resolves the two remaining deferred annotation parity rows by
classifying them against the current pinned upstream contract:

- `annotations-entity-sources`
- `annotations-input-replay`

Neither row should be treated as implemented default behavior. Instead, both are
not applicable to the pinned Agents parity contract because the concrete
upstream behavior needed to implement them does not exist today.

`annotations-entity-sources` has no default Agents SDK annotation payload to
mirror. Python and Bun both support entity annotations as ChatKit thread data,
but Python's default Agents stream converter only maps Responses file,
container-file, and URL citations.

`annotations-input-replay` is an aspirational replay behavior, not a pinned
upstream feature. Python's `ThreadItemConverter.assistant_message_to_input(...)`
explicitly drops stored assistant annotations by sending `annotations=[]` and
marks annotation replay as future work, while Bun replays assistant text without
annotations through the JavaScript Agents input shape.

## Scope

This milestone includes:

- Reclassifying `annotations-entity-sources` from `deferred` to
  `not-applicable`.
- Reclassifying `annotations-input-replay` from `deferred` to
  `not-applicable`.
- Documenting why each row is not a current Bun implementation gap.
- Updating parity smoke coverage so no stale deferred-row assertions remain.
- Preserving existing output annotation conversion, input conversion, server
  persistence, and wire schema behavior.

This milestone does not include:

- Adding default entity-source conversion to `ResponseStreamConverter`.
- Replaying assistant annotations back into model input.
- Changing ChatKit wire schemas.
- Changing `ThreadItemConverter` output shapes.
- Changing server persistence or annotation merge behavior.
- Removing future tracking entirely if upstream later adds concrete SDK or input
  contracts for these behaviors.

## Current Behavior

`src/agents/annotations.ts` converts three default Responses annotation payloads
into ChatKit annotations:

- `file_citation`
- `container_file_citation`
- `url_citation`

Unsupported annotation payloads return `null` and are dropped. This matches the
Python `ResponseStreamConverter` default behavior in
`packages/chatkit-python/chatkit/agents.py`.

`src/types/core.ts` already defines entity annotation sources in the ChatKit wire
schema. Applications can emit or persist entity annotations as thread data, and
custom stream converters can return any valid `Annotation`. There is no
upstream default Agents payload named `entity_citation` or equivalent to convert
by default.

`src/agents/converter.ts` converts stored assistant messages back to JavaScript
Agents input by replaying each content part's text:

```ts
{ type: "output_text", text: content.text }
```

It intentionally omits annotations. The approved input-conversion design already
states that JavaScript Agents SDK input replay does not include assistant
annotation arrays. The pinned Python converter also does not replay stored
annotations; it constructs `ResponseOutputText(..., annotations=[])` and marks
annotation replay as future work.

## Desired Behavior

The parity matrix should make the current pinned-contract status explicit:

- `annotations-entity-sources` is `not-applicable` because entity annotations are
  app-authored ChatKit wire data today, not default Responses annotation payloads
  produced by the Agents stream.
- `annotations-input-replay` is `not-applicable` because the pinned upstream
  converter itself strips assistant annotations on input replay, and Bun should
  not invent reverse annotation conversion without an upstream or SDK contract.

If future upstream releases add a concrete Responses annotation payload for
entities, or implement persisted assistant annotation replay into model input,
the relevant row should be reopened or replaced with a new implementation row
that cites the new contract.

## Architecture

Keep the work in parity metadata and parity smoke tests:

```text
docs/parity/matrix.json
tests/parity-smoke.test.ts
```

No production code should change. Existing code already represents the current
pinned behavior:

- output annotations are converted where upstream provides concrete citation
  payloads;
- entity sources remain available as ChatKit wire/source data;
- assistant input conversion replays text and omits annotations.

## Data Flow

No runtime data flow changes.

Existing output flow:

1. Responses stream emits supported file/container/URL citation annotations.
2. `ResponseStreamConverter` maps supported citations into ChatKit annotations.
3. Unsupported annotation payloads are dropped.
4. Applications may still produce entity annotations directly as ChatKit thread
   data or through custom converter overrides.

Existing input replay flow:

1. Stored ChatKit assistant messages contain output text and annotations.
2. `ThreadItemConverter.assistantMessageToInput(...)` maps each content part to
   assistant model input text.
3. Stored annotations are not replayed to the model.

## Error Handling

No new error behavior is added. Unsupported output annotation payloads continue
to return `null` in the default converter. Input conversion continues to omit
assistant annotations rather than attempting an unsupported reverse mapping.

If upstream introduces supported entity citation or annotation replay behavior
later, the implementation should define explicit conversion errors and tests at
that time.

## Testing

Update `tests/parity-smoke.test.ts` to:

- Remove `annotations-entity-sources` and `annotations-input-replay` from the
  known deferred row assertion.
- Assert that both rows are classified as `not-applicable`.
- Assert that entity-source notes mention the lack of a default upstream entity
  citation payload and the app-authored/custom-converter boundary.
- Assert that input-replay notes mention pinned Python stripping annotations and
  Bun intentionally not replaying them into model input.
- Continue to verify all referenced local files exist.

Existing behavior coverage should remain green:

- `tests/agents.test.ts` covers default output citation conversion and custom
  converter behavior.
- `tests/agents-converter.test.ts` covers assistant-message input conversion.
- `tests/server.test.ts` covers annotation persistence and merge behavior.
- `tests/parity-smoke.test.ts` covers matrix status and references.

Verification should use:

```bash
bun test tests/agents.test.ts tests/agents-converter.test.ts tests/server.test.ts tests/parity-smoke.test.ts
bun run typecheck
bun run verify
bun run verify:parity
```

## Acceptance Criteria

- `docs/parity/matrix.json` classifies both remaining annotation rows as
  `not-applicable`.
- `tests/parity-smoke.test.ts` no longer expects deferred rows for
  `annotations-entity-sources` or `annotations-input-replay`.
- Focused smoke tests protect both row classifications and rationale.
- No production source files change.
- `bun run verify:parity` reports no stale deferred parity rows for the pinned
  contract.
