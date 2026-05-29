# ChatKit Attachments Content Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `attachments-content-conversion` parity by proving Bun's attachment conversion hook matches Python's app-owned override boundary.

**Architecture:** Do not change production converter behavior. Add focused converter tests for the default failure and custom override path, then update the parity matrix and smoke test so the row is covered instead of deferred.

**Tech Stack:** Bun, TypeScript, `bun:test`, existing `ThreadItemConverter`, existing parity matrix smoke tests.

---

## File Structure

- Modify `tests/agents-converter.test.ts`
  - Add attachment fixture helpers.
  - Add tests for default attachment rejection and custom file/image conversion.
- Modify `docs/parity/matrix.json`
  - Move `attachments-content-conversion` from `deferred` to `covered`.
  - Cite the converter source, focused tests, parity smoke test, and approved design spec.
- Modify `tests/parity-smoke.test.ts`
  - Remove `attachments-content-conversion` from the known deferred gaps.
- Review `src/agents/converter.ts`
  - No production change is expected. Only edit it if the new tests expose a real mismatch with the approved spec.

## Task 1: Add Attachment Converter Coverage

**Files:**
- Modify: `tests/agents-converter.test.ts`
- Review: `src/agents/converter.ts`

- [ ] **Step 1: Add attachment fixture helpers**

In `tests/agents-converter.test.ts`, update the import block to include attachment types:

```ts
import {
  Card,
  Text,
  ThreadItemConverter,
  serializeWidget,
  simpleToAgentInput,
  type AssistantMessageItem,
  type ClientToolCallItem,
  type EndOfTurnItem,
  type FileAttachment,
  type GeneratedImageItem,
  type HiddenContextItem,
  type ImageAttachment,
  type SDKHiddenContextItem,
  type StructuredInputItem,
  type TaskItem,
  type ThreadItem,
  type UserMessageTagContent,
  type WorkflowItem,
} from "../src";
```

Add these helpers after the existing `userMessage(...)` helper:

```ts
function fileAttachment(overrides: Partial<FileAttachment> = {}): FileAttachment {
  return {
    id: "file_1",
    type: "file",
    mime_type: "application/pdf",
    name: "brief.pdf",
    metadata: { source: "test" },
    ...overrides,
  };
}

function imageAttachment(overrides: Partial<ImageAttachment> = {}): ImageAttachment {
  return {
    id: "image_1",
    type: "image",
    mime_type: "image/png",
    name: "diagram.png",
    preview_url: "https://example.com/diagram.png",
    metadata: { source: "test" },
    ...overrides,
  };
}
```

- [ ] **Step 2: Add the default rejection test**

In `tests/agents-converter.test.ts`, inside `describe("ThreadItemConverter", ...)`, add this test after `exposes an overridable converter class`:

```ts
  test("throws for attachments by default", async () => {
    await expect(
      simpleToAgentInput(
        userMessage({
          attachments: [fileAttachment()],
        }),
      ),
    ).rejects.toThrow("ThreadItemConverter.attachmentToMessageContent");
  });
```

- [ ] **Step 3: Add the custom override conversion test**

Add this test immediately after the default rejection test:

```ts
  test("converts attachments through an override in attachment order", async () => {
    class AttachmentConverter extends ThreadItemConverter {
      override attachmentToMessageContent(attachment: FileAttachment | ImageAttachment) {
        if (attachment.type === "image") {
          return { type: "input_image" as const, image: attachment.preview_url, detail: "auto" };
        }

        return { type: "input_file" as const, file: { id: attachment.id }, filename: attachment.name };
      }
    }

    const input = await new AttachmentConverter().toAgentInput(
      userMessage({
        content: [{ type: "input_text", text: "Review these attachments" }],
        attachments: [fileAttachment(), imageAttachment()],
      }),
    );

    expect(input).toEqual([
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "Review these attachments" },
          { type: "input_file", file: { id: "file_1" }, filename: "brief.pdf" },
          { type: "input_image", image: "https://example.com/diagram.png", detail: "auto" },
        ],
      },
    ]);
  });
```

- [ ] **Step 4: Run focused converter tests**

Run:

```bash
bun test tests/agents-converter.test.ts
```

Expected: PASS. These are characterization tests for existing app-owned hook behavior; no production change should be necessary.

- [ ] **Step 5: If the converter tests fail, fix only the mismatch**

Only if Step 4 fails because `src/agents/converter.ts` does not call `attachmentToMessageContent(...)` for attachments or does not preserve content order, update `userMessageToInput(...)` to keep this structure:

```ts
    const userMessage = userInputMessage([
      { type: "input_text", text: messageTextParts.join("") },
      ...(await Promise.all(item.attachments.map((attachment) => this.attachmentToMessageContent(attachment)))),
    ]);
```

Then rerun:

```bash
bun test tests/agents-converter.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the converter coverage**

Only commit if the controller has explicitly approved implementation commits for this branch:

```bash
git add tests/agents-converter.test.ts src/agents/converter.ts
git commit -m "Add attachment converter parity coverage"
```

## Task 2: Update Parity Matrix Coverage

**Files:**
- Modify: `docs/parity/matrix.json`
- Modify: `tests/parity-smoke.test.ts`

- [ ] **Step 1: Update the matrix row**

In `docs/parity/matrix.json`, replace the `attachments-content-conversion` row with:

```json
    {
      "id": "attachments-content-conversion",
      "area": "agents-input",
      "status": "covered",
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
          "docs/superpowers/specs/2026-05-29-chatkit-attachments-content-conversion-design.md"
        ]
      },
      "notes": "Bun matches Python's app-owned attachment conversion boundary: attachments throw by default and custom converters can map them to Agents SDK content parts."
    },
```

- [ ] **Step 2: Update the deferred gap smoke test**

In `tests/parity-smoke.test.ts`, update the known deferred gap assertions to remove `attachments-content-conversion`:

```ts
  test("tracks the known deferred full-parity gaps", () => {
    const deferredIds = new Set(
      (matrix.rows as ParityRow[])
        .filter((row) => row.status === "deferred")
        .map((row) => row.id),
    );

    expect(deferredIds).toContain("annotations-entity-sources");
    expect(deferredIds).toContain("annotations-input-replay");
    expect(deferredIds).toContain("non-text-assistant-content");
  });
```

- [ ] **Step 3: Run focused parity tests**

Run:

```bash
bun test tests/agents-converter.test.ts tests/parity-smoke.test.ts
```

Expected: PASS with all tests in both files passing.

- [ ] **Step 4: Run parity verification**

Run:

```bash
bun run verify:parity
```

Expected: PASS. The parity helper should report three deferred rows.

- [ ] **Step 5: Commit the parity update**

Only commit if the controller has explicitly approved implementation commits for this branch:

```bash
git add docs/parity/matrix.json tests/parity-smoke.test.ts tests/agents-converter.test.ts
git commit -m "Mark attachment conversion parity covered"
```

## Task 3: Final Verification And Branch Review

**Files:**
- Review: `tests/agents-converter.test.ts`
- Review: `docs/parity/matrix.json`
- Review: `tests/parity-smoke.test.ts`
- Review: `docs/superpowers/specs/2026-05-29-chatkit-attachments-content-conversion-design.md`

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
git diff master...HEAD -- tests/agents-converter.test.ts docs/parity/matrix.json tests/parity-smoke.test.ts docs/superpowers/specs/2026-05-29-chatkit-attachments-content-conversion-design.md
```

Expected: only the attachment conversion parity files are changed on the feature branch.

- [ ] **Step 3: Confirm completion criteria**

Confirm:

- Attachment-bearing user messages fail clearly by default.
- Custom converters can translate file and image attachments into Agents SDK content parts.
- Existing user message, tag, quote, and non-attachment conversion behavior remains unchanged.
- `attachments-content-conversion` is marked `covered` in `docs/parity/matrix.json`.
- Focused tests and full Bun verification pass.

- [ ] **Step 4: Prepare PR summary**

Use this PR summary shape:

```markdown
## Summary
- Add converter coverage for attachment default failure and custom file/image override behavior.
- Mark `attachments-content-conversion` covered in the parity matrix.
- Remove attachment conversion from deferred parity smoke expectations.

## Test plan
- [x] `bun test tests/agents-converter.test.ts tests/parity-smoke.test.ts`
- [x] `bun run verify`
- [x] `bun run verify:parity`
```
