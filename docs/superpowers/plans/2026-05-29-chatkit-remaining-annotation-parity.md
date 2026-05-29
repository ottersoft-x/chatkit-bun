# ChatKit Remaining Annotation Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reclassify the final two deferred annotation parity rows as not applicable for the current pinned upstream contract while preserving existing annotation behavior.

**Architecture:** Keep the change in parity metadata and parity smoke coverage. Do not change production schemas, stream conversion, input conversion, or server persistence; current code already represents the pinned contract, where default output annotations only cover concrete file/container/URL citation payloads and assistant input replay omits annotations.

**Tech Stack:** Bun, TypeScript, `bun:test`, parity matrix JSON, existing ChatKit Agents tests.

---

## Scope Check

This plan implements the approved remaining annotation parity design:

- Reclassify `annotations-entity-sources` from `deferred` to `not-applicable`.
- Reclassify `annotations-input-replay` from `deferred` to `not-applicable`.
- Add parity smoke tests that protect both classifications and rationale.
- Preserve existing output annotation conversion, assistant input conversion, server persistence, and wire schema behavior.

This plan does not implement entity-source default mapping or assistant annotation replay. It does not modify production source files.

Commit checkpoints appear for review-sized boundaries. Only run commit commands when the operator has explicitly requested commits.

## File Structure

- Modify: `tests/parity-smoke.test.ts`
  - Removes the two remaining annotation row ids from the known deferred row assertion.
  - Adds focused classification tests for `annotations-entity-sources` and `annotations-input-replay`.
- Modify: `docs/parity/matrix.json`
  - Changes both rows to `not-applicable`.
  - Adds relevant upstream and Bun references for the pinned-contract rationale.
  - Updates notes to explain why neither row is a current Bun implementation gap.
- Existing: `docs/superpowers/specs/2026-05-29-chatkit-remaining-annotation-parity-design.md`
  - Approved design document for this plan.

No files under `src/` should be modified.

## Task 1: Parity Smoke Classification Tests

**Files:**
- Modify: `tests/parity-smoke.test.ts`

- [ ] **Step 1: Update the deferred row assertion**

In `tests/parity-smoke.test.ts`, replace the body of `test("tracks the known deferred full-parity gaps", () => { ... })` with:

```ts
    const deferredIds = new Set(
      (matrix.rows as ParityRow[])
        .filter((row) => row.status === "deferred")
        .map((row) => row.id),
    );

    expect(deferredIds).not.toContain("annotations-entity-sources");
    expect(deferredIds).not.toContain("annotations-input-replay");
    expect(deferredIds).not.toContain("non-text-assistant-content");
    expect(deferredIds.size).toBe(0);
```

- [ ] **Step 2: Add the remaining annotation classification tests**

Still inside the `describe("parity matrix", () => { ... })` block, add these tests after the existing `classifies non-text assistant content against the pinned contract` test:

```ts
  test("classifies entity annotation sources against the pinned contract", () => {
    const row = expectParityRow("annotations-entity-sources");

    expect(row.status).toBe("not-applicable");
    expect(row.bun?.sources).toEqual(
      expect.arrayContaining(["src/types/core.ts", "src/agents/annotations.ts"]),
    );
    expect(row.bun?.docs).toEqual(
      expect.arrayContaining([
        "docs/superpowers/specs/2026-05-28-chatkit-agents-annotation-hardening-design.md",
        "docs/superpowers/specs/2026-05-29-chatkit-remaining-annotation-parity-design.md",
      ]),
    );
    expect(row.notes).toEqual(expect.stringContaining("no default upstream entity citation"));
    expect(row.notes).toEqual(expect.stringContaining("app-authored"));
    expect(row.notes).toEqual(expect.stringContaining("custom converter"));
  });

  test("classifies annotation input replay against the pinned contract", () => {
    const row = expectParityRow("annotations-input-replay");

    expect(row.status).toBe("not-applicable");
    expect(row.bun?.tests).toEqual(
      expect.arrayContaining(["tests/agents-converter.test.ts", "tests/parity-smoke.test.ts"]),
    );
    expect(row.bun?.sources).toEqual(expect.arrayContaining(["src/agents/converter.ts"]));
    expect(row.bun?.docs).toEqual(
      expect.arrayContaining([
        "docs/superpowers/specs/2026-05-28-chatkit-agents-input-conversion-design.md",
        "docs/superpowers/specs/2026-05-29-chatkit-remaining-annotation-parity-design.md",
      ]),
    );
    expect(row.notes).toEqual(expect.stringContaining("pinned Python"));
    expect(row.notes).toEqual(expect.stringContaining("strips assistant annotations"));
    expect(row.notes).toEqual(expect.stringContaining("Bun replays assistant text without annotations"));
  });
```

- [ ] **Step 3: Run focused tests to verify failure**

Run:

```bash
bun test tests/parity-smoke.test.ts
```

Expected: FAIL because `annotations-entity-sources` and `annotations-input-replay` are still `deferred`, and their matrix rows do not yet include the new references or notes.

## Task 2: Matrix Reclassification

**Files:**
- Modify: `docs/parity/matrix.json`

- [ ] **Step 1: Replace the `annotations-entity-sources` row**

In `docs/parity/matrix.json`, replace the current `annotations-entity-sources` object with:

```json
    {
      "id": "annotations-entity-sources",
      "area": "agents-output",
      "status": "not-applicable",
      "upstream": {
        "files": [
          "packages/chatkit-python/chatkit/agents.py",
          "packages/chatkit-python/chatkit/types.py",
          "packages/chatkit-python/docs/guides/add-annotations.md"
        ],
        "tests": []
      },
      "bun": {
        "tests": ["tests/parity-smoke.test.ts"],
        "sources": ["src/types/core.ts", "src/agents/annotations.ts"],
        "docs": [
          "docs/superpowers/specs/2026-05-28-chatkit-agents-annotation-hardening-design.md",
          "docs/superpowers/specs/2026-05-29-chatkit-remaining-annotation-parity-design.md"
        ]
      },
      "notes": "There is no default upstream entity citation payload for the Agents stream to mirror. Entity annotations are app-authored ChatKit thread data and remain available through the wire schema or a custom converter, so default entity source mapping is not applicable for this pinned upstream version."
    }
```

- [ ] **Step 2: Replace the `annotations-input-replay` row**

In `docs/parity/matrix.json`, replace the current `annotations-input-replay` object with:

```json
    {
      "id": "annotations-input-replay",
      "area": "agents-input",
      "status": "not-applicable",
      "upstream": {
        "files": [
          "packages/chatkit-python/chatkit/agents.py",
          "packages/chatkit-python/tests/test_agents.py"
        ],
        "tests": []
      },
      "bun": {
        "tests": ["tests/agents-converter.test.ts", "tests/parity-smoke.test.ts"],
        "sources": ["src/agents/converter.ts"],
        "docs": [
          "docs/superpowers/specs/2026-05-28-chatkit-agents-input-conversion-design.md",
          "docs/superpowers/specs/2026-05-29-chatkit-remaining-annotation-parity-design.md"
        ]
      },
      "notes": "Pinned Python strips assistant annotations during input replay, and Bun replays assistant text without annotations through the JavaScript Agents input shape. Full annotation replay should reopen only if upstream implements a concrete replay contract."
    }
```

- [ ] **Step 3: Run focused parity smoke tests**

Run:

```bash
bun test tests/parity-smoke.test.ts
```

Expected: PASS.

- [ ] **Step 4: Check working tree scope**

Run:

```bash
git status --short --branch
```

Expected: changes are limited to:

- `docs/parity/matrix.json`
- `docs/superpowers/specs/2026-05-29-chatkit-remaining-annotation-parity-design.md`
- `docs/superpowers/plans/2026-05-29-chatkit-remaining-annotation-parity.md`
- `tests/parity-smoke.test.ts`

## Task 3: Regression Verification

**Files:**
- Modify: `docs/parity/matrix.json`
- Modify: `tests/parity-smoke.test.ts`

- [ ] **Step 1: Run focused behavior coverage**

Run:

```bash
bun test tests/agents.test.ts tests/agents-converter.test.ts tests/server.test.ts tests/parity-smoke.test.ts
```

Expected: PASS. This confirms output annotation conversion, assistant input conversion, server annotation persistence, and parity matrix smoke coverage still pass.

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

Expected: PASS. The parity script should report the pinned upstream metadata, `Matrix rows: 19`, and `Deferred rows: 0`.

- [ ] **Step 5: Check final working tree scope**

Run:

```bash
git status --short --branch
```

Expected: changes remain limited to:

- `docs/parity/matrix.json`
- `docs/superpowers/specs/2026-05-29-chatkit-remaining-annotation-parity-design.md`
- `docs/superpowers/plans/2026-05-29-chatkit-remaining-annotation-parity.md`
- `tests/parity-smoke.test.ts`

## Final Verification

After all implementation tasks and reviews complete, run:

```bash
bun test tests/parity-smoke.test.ts
bun test tests/agents.test.ts tests/agents-converter.test.ts tests/server.test.ts tests/parity-smoke.test.ts
bun run typecheck
bun run verify
bun run verify:parity
git status --short --branch
```

Expected:

- Focused parity smoke tests pass.
- Existing Agents, converter, and server annotation behavior remains green.
- TypeScript typecheck passes.
- Full verification passes.
- Parity verification reports `Deferred rows: 0`.
- No production source files are modified.

## Implementation Notes

- Use Bun tooling only.
- Keep this as a metadata and test update. Do not change files under `src/`.
- Do not implement entity-source default mapping or assistant annotation replay.
- Keep `non-text-assistant-content` classified as `not-applicable`.
- If future upstream versions add concrete entity citation or annotation replay contracts, create a new parity row or reopen these rows with that evidence.
