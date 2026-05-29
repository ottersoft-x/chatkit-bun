# ChatKit Agents Previous Response ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict Python parity for `AgentContext.previous_response_id` as Bun's readonly `AgentContext.previousResponseId` state.

**Architecture:** Keep the change inside the existing Agents context boundary. Extend `AgentContextOptions<TContext>`, normalize the constructor option to `null`, expose the value on `AgentContext`, and update the parity matrix once focused tests prove the state exists.

**Tech Stack:** Bun, TypeScript, `bun:test`, existing `src/agents/` bridge, parity matrix smoke tests.

---

## File Structure

- Modify `src/agents/types.ts`
  - Add the optional `previousResponseId?: string | null` constructor option.
- Modify `src/agents/context.ts`
  - Add the readonly `previousResponseId` property and normalize omitted values to `null`.
- Modify `tests/agents.test.ts`
  - Add red tests in the existing `AgentContext` describe block for the default and explicit values.
- Modify `docs/parity/matrix.json`
  - Move `agents-previous-response-id` from `deferred` to `covered` and cite the local test/source/spec references.
- Modify `tests/parity-smoke.test.ts`
  - Remove `agents-previous-response-id` from the known deferred gap assertions.

## Task 1: Add Red AgentContext Tests

**Files:**
- Modify: `tests/agents.test.ts`

- [ ] **Step 1: Update the existing constructor-state test**

In `tests/agents.test.ts`, inside `describe("AgentContext", ...)`, replace the first test with:

```ts
  test("stores thread, store, request context, previous response id, and deterministic timestamps", () => {
    const agentContext = createContext();

    expect(agentContext.thread).toEqual(thread);
    expect(agentContext.context).toEqual(requestContext);
    expect(agentContext.previousResponseId).toBeNull();
    expect(agentContext.createdAt()).toBe(now);
    expect(agentContext.store.generateItemId("tool_call", thread, requestContext)).toBe(
      "tool_call_generated",
    );
  });
```

- [ ] **Step 2: Add the explicit value test immediately after it**

Add this test directly after the updated constructor-state test:

```ts
  test("preserves an explicit previous response id", () => {
    const agentContext = new AgentContext({
      thread,
      store: new TestStore(),
      context: requestContext,
      previousResponseId: "resp_previous_123",
      now: () => now,
    });

    expect(agentContext.previousResponseId).toBe("resp_previous_123");
    expect(agentContext.createdAt()).toBe(now);
  });
```

- [ ] **Step 3: Run the focused red test command**

Run:

```bash
bun test tests/agents.test.ts --test-name-pattern "AgentContext"
```

Expected: FAIL because `agentContext.previousResponseId` is currently `undefined` and `AgentContextOptions` does not define `previousResponseId`.

- [ ] **Step 4: Commit the red tests**

Only commit if the controller has explicitly approved implementation commits for this branch:

```bash
git add tests/agents.test.ts
git commit -m "Add previous response id context tests"
```

## Task 2: Implement AgentContext State

**Files:**
- Modify: `src/agents/types.ts`
- Modify: `src/agents/context.ts`

- [ ] **Step 1: Extend `AgentContextOptions`**

In `src/agents/types.ts`, update the interface to:

```ts
export interface AgentContextOptions<TContext> {
  thread: ThreadMetadata;
  store: Store<TContext>;
  context: TContext;
  now?: () => Date | string;
  previousResponseId?: string | null;
}
```

- [ ] **Step 2: Add the readonly context property**

In `src/agents/context.ts`, update the top of `AgentContext` to:

```ts
export class AgentContext<TContext> {
  readonly thread: AgentContextOptions<TContext>["thread"];
  readonly store: AgentContextOptions<TContext>["store"];
  readonly context: TContext;
  readonly previousResponseId: string | null;
  workflowItem: WorkflowItem | null = null;
  private readonly now: () => Date | string;
  private readonly queue = new AsyncEventQueue<ThreadStreamEvent>();
  private clientToolCall: ClientToolCall | null = null;
```

- [ ] **Step 3: Normalize constructor input**

In `src/agents/context.ts`, update the constructor to:

```ts
  constructor(options: AgentContextOptions<TContext>) {
    this.thread = options.thread;
    this.store = options.store;
    this.context = options.context;
    this.previousResponseId = options.previousResponseId ?? null;
    this.now = options.now ?? (() => new Date());
  }
```

- [ ] **Step 4: Run the focused AgentContext tests**

Run:

```bash
bun test tests/agents.test.ts --test-name-pattern "AgentContext"
```

Expected: PASS for the AgentContext test subset.

- [ ] **Step 5: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit the implementation**

Only commit if the controller has explicitly approved implementation commits for this branch:

```bash
git add src/agents/types.ts src/agents/context.ts tests/agents.test.ts
git commit -m "Add agents previous response id state"
```

## Task 3: Update Parity Matrix Coverage

**Files:**
- Modify: `docs/parity/matrix.json`
- Modify: `tests/parity-smoke.test.ts`

- [ ] **Step 1: Update the matrix row**

In `docs/parity/matrix.json`, replace the `agents-previous-response-id` row with:

```json
    {
      "id": "agents-previous-response-id",
      "area": "agents-output",
      "status": "covered",
      "upstream": {
        "files": [
          "packages/chatkit-python/chatkit/agents.py",
          "packages/chatkit-python/tests/test_agents.py"
        ],
        "tests": []
      },
      "bun": {
        "tests": ["tests/agents.test.ts", "tests/parity-smoke.test.ts"],
        "sources": ["src/agents/context.ts", "src/agents/types.ts"],
        "docs": [
          "docs/superpowers/specs/2026-05-29-chatkit-agents-previous-response-id-design.md"
        ]
      },
      "notes": "Bun AgentContext stores previousResponseId state for OpenAI Responses API chaining while leaving persistence and run options application-owned."
    },
```

- [ ] **Step 2: Update the deferred gap smoke test**

In `tests/parity-smoke.test.ts`, update the known deferred gap assertions to remove `agents-previous-response-id`:

```ts
  test("tracks the known deferred full-parity gaps", () => {
    const deferredIds = new Set(
      (matrix.rows as ParityRow[])
        .filter((row) => row.status === "deferred")
        .map((row) => row.id),
    );

    expect(deferredIds).toContain("annotations-entity-sources");
    expect(deferredIds).toContain("annotations-input-replay");
    expect(deferredIds).toContain("attachments-content-conversion");
    expect(deferredIds).toContain("non-text-assistant-content");
  });
```

- [ ] **Step 3: Run focused parity tests**

Run:

```bash
bun test tests/agents.test.ts tests/parity-smoke.test.ts
```

Expected: PASS with all tests in both files passing.

- [ ] **Step 4: Run parity verification**

Run:

```bash
bun run verify:parity
```

Expected: PASS. The parity helper should report one fewer deferred row than before this slice.

- [ ] **Step 5: Commit the parity update**

Only commit if the controller has explicitly approved implementation commits for this branch:

```bash
git add docs/parity/matrix.json tests/parity-smoke.test.ts
git commit -m "Mark previous response id parity covered"
```

## Task 4: Final Verification And Branch Review

**Files:**
- Review: all changed files

- [ ] **Step 1: Run full verification**

Run:

```bash
bun run verify
bun run verify:parity
```

Expected: PASS for both commands.

- [ ] **Step 2: Review git status and diff**

Run:

```bash
git status --short --branch
git diff --stat master...HEAD
git diff master...HEAD -- src/agents/types.ts src/agents/context.ts tests/agents.test.ts docs/parity/matrix.json tests/parity-smoke.test.ts
```

Expected: only the previous response id parity files are changed on the feature branch.

- [ ] **Step 3: Confirm completion criteria**

Confirm:

- `AgentContextOptions` accepts `previousResponseId?: string | null`.
- `AgentContext.previousResponseId` is readonly and defaults to `null`.
- Existing AgentContext behavior and stream behavior remain unchanged.
- `agents-previous-response-id` is marked `covered` in `docs/parity/matrix.json`.
- Focused tests and full Bun verification pass.

- [ ] **Step 4: Prepare PR summary**

Use this PR summary shape:

```markdown
## Summary
- Add readonly `AgentContext.previousResponseId` state for strict Python `previous_response_id` parity.
- Cover default and explicit previous response id construction behavior.
- Mark `agents-previous-response-id` covered in the parity matrix and remove it from deferred smoke expectations.

## Test plan
- [x] `bun test tests/agents.test.ts tests/parity-smoke.test.ts`
- [x] `bun run verify`
- [x] `bun run verify:parity`
```
