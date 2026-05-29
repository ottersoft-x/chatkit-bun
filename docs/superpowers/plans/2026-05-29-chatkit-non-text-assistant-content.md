# ChatKit Non-Text Assistant Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reclassify `non-text-assistant-content` as not applicable for the current pinned upstream contract while preserving existing text, refusal, annotation, and generated-image behavior.

**Architecture:** Keep the change in parity metadata and parity smoke coverage. Do not change production schemas or stream conversion; current code already covers the pinned assistant-message content contract of `output_text` and `refusal`, while generated images are separate thread items.

**Tech Stack:** Bun, TypeScript, `bun:test`, parity matrix JSON, existing ChatKit Agents stream tests.

---

## Scope Check

This plan implements the approved non-text assistant content design:

- Reclassify `non-text-assistant-content` from `deferred` to `not-applicable`.
- Preserve evidence that text, refusal, annotations, and generated images are already covered by existing local tests.
- Update parity smoke tests so the deferred row list only contains current open gaps.
- Avoid public schema, stream event, converter, server, or generated-image behavior changes.

Commit checkpoints appear for review-sized boundaries. Only run commit commands when the operator has explicitly requested commits.

## File Structure

- Modify: `tests/parity-smoke.test.ts`
  - Adds a helper for locating matrix rows by id.
  - Changes the known deferred row assertion so `non-text-assistant-content` is no longer expected to be deferred.
  - Adds focused coverage that the row is `not-applicable` and its notes explain the pinned text/refusal assistant-message contract.
- Modify: `docs/parity/matrix.json`
  - Changes `non-text-assistant-content.status` to `not-applicable`.
  - Adds local coverage references to existing tests, sources, and specs.
  - Updates the row notes to explain why no additional assistant-message content part exists under the pinned contract.
- Existing: `docs/superpowers/specs/2026-05-29-chatkit-non-text-assistant-content-design.md`
  - Approved design document for this plan.

No production TypeScript files should be modified.

## Task 1: Parity Smoke Classification Tests

**Files:**
- Modify: `tests/parity-smoke.test.ts`

- [ ] **Step 1: Add a parity row lookup helper**

In `tests/parity-smoke.test.ts`, add this helper after `expectLocalFilesExist(...)`:

```ts
function expectParityRow(id: string): ParityRow {
  const row = (matrix.rows as ParityRow[]).find((candidate) => candidate.id === id);
  expect(row, `missing parity row ${id}`).toBeTruthy();
  return row!;
}
```

- [ ] **Step 2: Update the known deferred gap assertion**

In `tests/parity-smoke.test.ts`, replace the body of `test("tracks the known deferred full-parity gaps", () => { ... })` with:

```ts
    const deferredIds = new Set(
      (matrix.rows as ParityRow[])
        .filter((row) => row.status === "deferred")
        .map((row) => row.id),
    );

    expect(deferredIds).toContain("annotations-entity-sources");
    expect(deferredIds).toContain("annotations-input-replay");
    expect(deferredIds).not.toContain("non-text-assistant-content");
```

- [ ] **Step 3: Add the not-applicable row test**

Still inside the `describe("parity matrix", () => { ... })` block, add this test after the deferred gaps test:

```ts
  test("classifies non-text assistant content against the pinned contract", () => {
    const row = expectParityRow("non-text-assistant-content");

    expect(row.status).toBe("not-applicable");
    expect(row.bun?.tests).toEqual(
      expect.arrayContaining(["tests/agents.test.ts", "tests/server.test.ts", "tests/parity-smoke.test.ts"]),
    );
    expect(row.bun?.sources).toEqual(
      expect.arrayContaining([
        "src/types/core.ts",
        "src/types/server.ts",
        "src/agents/annotations.ts",
        "src/agents/stream.ts",
      ]),
    );
    expect(row.bun?.docs).toEqual(
      expect.arrayContaining([
        "docs/superpowers/specs/2026-05-28-chatkit-agents-refusal-content-part-design.md",
        "docs/superpowers/specs/2026-05-28-chatkit-agents-generated-images-design.md",
        "docs/superpowers/specs/2026-05-29-chatkit-non-text-assistant-content-design.md",
      ]),
    );
    expect(row.notes).toEqual(expect.stringContaining("output text and refusal"));
    expect(row.notes).toEqual(expect.stringContaining("generated_image"));
  });
```

- [ ] **Step 4: Run the focused test to verify failure**

Run:

```bash
bun test tests/parity-smoke.test.ts
```

Expected: FAIL because `non-text-assistant-content` is still `deferred`, still appears in the deferred assertion, and does not yet cite the new spec.

## Task 2: Matrix Reclassification

**Files:**
- Modify: `docs/parity/matrix.json`

- [ ] **Step 1: Update the matrix row**

In `docs/parity/matrix.json`, replace the `non-text-assistant-content` row with:

```json
    {
      "id": "non-text-assistant-content",
      "area": "agents-output",
      "status": "not-applicable",
      "upstream": {
        "files": [
          "packages/chatkit-python/chatkit/agents.py",
          "packages/chatkit-python/tests/test_agents.py"
        ],
        "tests": ["test_stream_agent_response_assistant_message_content_types"]
      },
      "bun": {
        "tests": ["tests/agents.test.ts", "tests/server.test.ts", "tests/parity-smoke.test.ts"],
        "sources": [
          "src/types/core.ts",
          "src/types/server.ts",
          "src/agents/annotations.ts",
          "src/agents/stream.ts"
        ],
        "docs": [
          "docs/superpowers/specs/2026-05-28-chatkit-agents-refusal-content-part-design.md",
          "docs/superpowers/specs/2026-05-28-chatkit-agents-generated-images-design.md",
          "docs/superpowers/specs/2026-05-29-chatkit-non-text-assistant-content-design.md"
        ]
      },
      "notes": "The pinned assistant-message content contract only exposes output text and refusal content, both covered locally. Generated images are represented as separate generated_image thread items, so there is no additional non-text assistant-message content part to implement for this upstream version."
    }
```

- [ ] **Step 2: Run the focused parity smoke test**

Run:

```bash
bun test tests/parity-smoke.test.ts
```

Expected: PASS.

- [ ] **Step 3: Check the working tree scope**

Run:

```bash
git status --short --branch
```

Expected: changes are limited to:

- `docs/parity/matrix.json`
- `docs/superpowers/specs/2026-05-29-chatkit-non-text-assistant-content-design.md`
- `docs/superpowers/plans/2026-05-29-chatkit-non-text-assistant-content.md`
- `tests/parity-smoke.test.ts`

## Task 3: Regression Verification

**Files:**
- Modify: `docs/parity/matrix.json`
- Modify: `tests/parity-smoke.test.ts`

- [ ] **Step 1: Run focused behavior coverage**

Run:

```bash
bun test tests/agents.test.ts tests/server.test.ts tests/parity-smoke.test.ts
```

Expected: PASS. This confirms the existing text/refusal/generated-image behavior still passes alongside the new parity classification tests.

- [ ] **Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
bun run verify
```

Expected: PASS.

- [ ] **Step 4: Run parity verification**

Run:

```bash
bun run verify:parity
```

Expected: PASS. The command should report the Bun verification passing and show no failing parity checks.

- [ ] **Step 5: Check final working tree scope**

Run:

```bash
git status --short --branch
```

Expected: changes remain limited to:

- `docs/parity/matrix.json`
- `docs/superpowers/specs/2026-05-29-chatkit-non-text-assistant-content-design.md`
- `docs/superpowers/plans/2026-05-29-chatkit-non-text-assistant-content.md`
- `tests/parity-smoke.test.ts`

## Final Verification

After all implementation tasks and reviews complete, run:

```bash
bun test tests/parity-smoke.test.ts
bun test tests/agents.test.ts tests/server.test.ts tests/parity-smoke.test.ts
bun run typecheck
bun run verify
bun run verify:parity
git status --short --branch
```

Expected:

- Focused parity smoke tests pass.
- Existing Agents and server coverage for text, refusal, annotations, and generated images passes.
- TypeScript typecheck passes.
- Full verification and parity verification pass.
- No production code is modified.

## Implementation Notes

- Use Bun tooling only.
- Keep this as a metadata and test update. Do not change `src/types/*`, `src/agents/*`, or `src/server.ts`.
- Preserve the existing deferred rows for `annotations-entity-sources` and `annotations-input-replay`.
- `not-applicable` is valid because the pinned upstream contract has no additional assistant-message content part beyond text-like content. If future upstream types add a concrete ChatKit wire shape, create a new parity row or reopen this one with that evidence.
