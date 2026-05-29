# ChatKit Agents Previous Response ID Design

## Purpose

This milestone closes the `agents-previous-response-id` parity row by adding the
same per-response state that Python ChatKit exposes on `AgentContext`.

Python's `AgentContext` accepts `previous_response_id: str | None` so an
application can carry the most recent OpenAI Responses API response id into a
new turn. The Bun Agents bridge already owns per-turn state such as the thread,
store, request context, workflows, and client tool calls, but it does not expose
an equivalent value.

The goal is a small parity slice: add typed context state, prove construction
and defaults locally, document the application-owned persistence boundary, and
update the parity matrix from `deferred` to `covered`.

## Scope

In scope:

- Add `previousResponseId?: string | null` to `AgentContextOptions<TContext>`.
- Expose `agentContext.previousResponseId` as a readonly `string | null`.
- Default `previousResponseId` to `null` when omitted.
- Preserve the existing `thread`, `store`, `context`, `now`, event queue,
  workflow, widget, and client-tool behavior.
- Add focused Bun tests for the default and explicit values.
- Update `docs/parity/matrix.json` so `agents-previous-response-id` cites the
  new source and test coverage as `covered`.
- Update the parity smoke deferred-row expectation.

Out of scope:

- Calling `run(...)` from `@openai/agents` or wrapping its options.
- Adding a package-level helper that injects `previous_response_id` into OpenAI
  Responses calls.
- Defining a required `ThreadMetadata.metadata` key such as `last_response_id`.
- Persisting response ids in stores or changing `ChatKitServer` behavior.
- Running live OpenAI requests or adding Python pytest to the default Bun
  verification path.

## Public API

Extend the existing options type:

```ts
interface AgentContextOptions<TContext> {
  thread: ThreadMetadata;
  store: Store<TContext>;
  context: TContext;
  now?: () => Date | string;
  previousResponseId?: string | null;
}
```

Expose the normalized value on `AgentContext`:

```ts
class AgentContext<TContext> {
  readonly previousResponseId: string | null;
}
```

The public API uses TypeScript camelCase. The spec and docs should mention that
this mirrors Python's `previous_response_id` field, but the Bun type should not
also accept snake-case input. Keeping one spelling avoids ambiguous options and
matches the rest of the Bun Agents API.

## Application Boundary

The Bun bridge should store the value but not decide where it comes from.
Applications that use the OpenAI Responses API can keep their own response id in
`thread.metadata`, a database column, or any other app-specific state, then pass
it into `AgentContext` for the turn:

```ts
const previousResponseId =
  typeof thread.metadata.last_response_id === "string"
    ? thread.metadata.last_response_id
    : null;

const agentContext = new AgentContext({
  thread,
  store: this.store,
  context,
  previousResponseId,
});
```

The app remains responsible for passing that value into the actual model call
when appropriate. This mirrors upstream guidance: ChatKit tracks the context
field, while persistence conventions and OpenAI `run(...)` options stay under
the application integration.

## Data Flow

1. The server or application prepares a new response turn.
2. It reads any app-owned last response id from its own state.
3. It constructs `new AgentContext({ ..., previousResponseId })`.
4. Application inference code can read `agentContext.previousResponseId` while
   configuring the model call.
5. `streamAgentResponse(...)` continues to consume the streamed result and emit
   ChatKit thread events without needing to inspect or mutate the value.

No stream events, persisted thread items, or ChatKit wire schemas change in this
slice.

## Error Handling

`previousResponseId` is optional. Omitted and explicit `null` values both
normalize to `null`.

The value should be typed as `string | null` and should not be runtime-validated
beyond normal TypeScript checks. JavaScript callers can still pass invalid values
at runtime; this slice should not add broader option validation or throw during
`AgentContext` construction because the existing constructor does not validate
other option fields beyond behavior-specific stream event parsing.

## Testing Strategy

Use TDD for implementation.

Focused tests in `tests/agents.test.ts`:

- `AgentContext` defaults `previousResponseId` to `null` when omitted.
- `AgentContext` preserves an explicit previous response id.
- Existing constructor behavior for thread, store, context, and deterministic
  timestamps still passes.

Parity smoke:

- Update `docs/parity/matrix.json` so `agents-previous-response-id` is
  `covered`, with `tests/agents.test.ts` and `src/agents/context.ts` references.
- Update `tests/parity-smoke.test.ts` so the known deferred rows no longer
  include `agents-previous-response-id`.

Focused verification:

```bash
bun test tests/agents.test.ts tests/parity-smoke.test.ts
bun run typecheck
```

Full verification:

```bash
bun run verify
bun run verify:parity
```

## Completion Criteria

- `AgentContextOptions` accepts `previousResponseId?: string | null`.
- `AgentContext.previousResponseId` is readonly and normalized to `null` by
  default.
- Existing Agents behavior remains unchanged.
- The parity matrix marks `agents-previous-response-id` as covered and cites the
  local tests and source file.
- Focused and full Bun verification pass.
