# ChatKit Agents Refusal Content Part Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve assistant refusal content from OpenAI Responses streams by mapping it into ChatKit's existing assistant output text content.

**Architecture:** Keep the feature private to the Agents stream conversion layer. Broaden the existing content-part converter in `src/agents/annotations.ts` so final assistant messages retain refusals, then add `response.content_part.added`, `response.refusal.delta`, and `response.refusal.done` handling in `src/agents/stream.ts`. Do not add new schemas, server behavior, guardrail behavior, or public converter methods.

**Tech Stack:** Bun, TypeScript, `bun:test`, OpenAI Responses raw stream events, existing ChatKit `ThreadStreamEvent` schemas.

---

## Scope Check

This plan implements the approved refusal/content-part parity spec:

- Convert OpenAI `refusal` parts into ChatKit `output_text` assistant content.
- Preserve streamed refusal added, delta, and done events.
- Preserve final refusal content in `response.output_item.done` and normalized `response_done`.
- Keep output text annotations and custom converter behavior unchanged.
- Ignore reasoning text content parts in `response.content_part.added`.

This plan does not change ChatKit schemas, server persistence, guardrail rollback, input conversion, widget behavior, image behavior, or public `ResponseStreamConverter` APIs.

Commit checkpoints appear for review-sized boundaries. Only run commit commands when the operator has explicitly requested commits.

## File Structure

- Modify: `tests/agents.test.ts`
  - Adds final refusal conversion tests and streaming refusal event mapping tests in the existing `streamAgentResponse` describe block.
- Modify: `src/agents/annotations.ts`
  - Broadens `convertTextContentPart(...)` so it also converts OpenAI `refusal` parts into existing ChatKit output text content.
- Modify: `src/agents/stream.ts`
  - Adds conversion cases for `response.content_part.added`, `response.refusal.delta`, and `response.refusal.done`.

## Task 1: Final Refusal Content Conversion

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/annotations.ts`

- [ ] **Step 1: Add failing final refusal conversion tests**

Add these tests inside `describe("streamAgentResponse", () => { ... })`, near the existing assistant message finalization tests:

```ts
  test("preserves refusal parts in final assistant messages", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_refusal" },
          }),
          rawResponse({
            type: "response.output_item.done",
            item: {
              type: "message",
              id: "msg_refusal",
              content: [
                { type: "output_text", text: "Allowed text", annotations: [] },
                { type: "refusal", refusal: "I can't help with that." },
              ],
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_refusal",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "msg_refusal",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [
            { type: "output_text", text: "Allowed text", annotations: [] },
            { type: "output_text", text: "I can't help with that.", annotations: [] },
          ],
        },
      },
    ]);
  });

  test("preserves refusal parts from normalized response_done events", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawModel({
            type: "response_done",
            response: {
              id: "resp_refusal",
              output: [
                {
                  type: "message",
                  id: "msg_refusal",
                  role: "assistant",
                  status: "completed",
                  content: [{ type: "refusal", refusal: "No, I cannot comply." }],
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "msg_refusal",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [{ type: "output_text", text: "No, I cannot comply.", annotations: [] }],
        },
      },
    ]);
  });
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: FAIL because final refusal content is currently dropped from assistant messages.

- [ ] **Step 3: Broaden the content converter**

Update `src/agents/annotations.ts` by replacing `convertTextContentPart(...)` with this implementation:

```ts
export function convertTextContentPart(
  part: unknown,
  converter: ResponseStreamConverter,
): ConvertedTextContent | null {
  if (!isRecord(part)) {
    return null;
  }

  if (part.type === "refusal") {
    const text = stringValue(part.refusal);
    return text === null ? null : { type: "output_text", text, annotations: [] };
  }

  if (part.type !== "output_text") {
    return null;
  }

  const text = stringValue(part.text);
  if (text === null) {
    return null;
  }

  const annotations = Array.isArray(part.annotations)
    ? part.annotations.flatMap((annotation) => {
        const converted = converter.convertAnnotation(annotation);
        return converted ? [converted] : [];
      })
    : [];

  return { type: "output_text", text, annotations };
}
```

Keep the exported function name unchanged so existing imports keep working.

- [ ] **Step 4: Run tests to verify Task 1 passes**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS for the new final refusal tests and existing Agents tests.

## Task 2: Streaming Refusal Event Mapping

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/stream.ts`

- [ ] **Step 1: Add failing streaming refusal tests**

Add these tests inside `describe("streamAgentResponse", () => { ... })`, near the existing stream event mapping tests:

```ts
  test("maps response.content_part.added output text and refusal parts", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_parts" },
          }),
          rawResponse({
            type: "response.content_part.added",
            item_id: "msg_parts",
            content_index: 0,
            part: {
              type: "output_text",
              text: "Visible text",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://example.com/source",
                  title: "Example Source",
                  end_index: 12,
                },
              ],
            },
          }),
          rawResponse({
            type: "response.content_part.added",
            item_id: "msg_parts",
            content_index: 1,
            part: { type: "refusal", refusal: "I can't help with that." },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_parts",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_parts",
        update: {
          type: "assistant_message.content_part.added",
          content_index: 0,
          content: {
            type: "output_text",
            text: "Visible text",
            annotations: [
              {
                type: "annotation",
                source: {
                  type: "url",
                  url: "https://example.com/source",
                  title: "Example Source",
                },
                index: 12,
              },
            ],
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_parts",
        update: {
          type: "assistant_message.content_part.added",
          content_index: 1,
          content: { type: "output_text", text: "I can't help with that.", annotations: [] },
        },
      },
    ]);
  });

  test("ignores reasoning text content parts", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_reasoning_part" },
          }),
          rawResponse({
            type: "response.content_part.added",
            item_id: "msg_reasoning_part",
            content_index: 0,
            part: { type: "reasoning_text", text: "private reasoning" },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_reasoning_part",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
    ]);
  });

  test("maps refusal delta and done events to assistant text updates", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.added",
            item: { type: "message", id: "msg_refusal_stream" },
          }),
          rawResponse({
            type: "response.refusal.delta",
            item_id: "msg_refusal_stream",
            content_index: 0,
            delta: "I can't",
          }),
          rawResponse({
            type: "response.refusal.delta",
            item_id: "msg_refusal_stream",
            content_index: 0,
            delta: " help.",
          }),
          rawResponse({
            type: "response.refusal.done",
            item_id: "msg_refusal_stream",
            content_index: 0,
            refusal: "I can't help.",
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_refusal_stream",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_refusal_stream",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: "I can't",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_refusal_stream",
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: 0,
          delta: " help.",
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_refusal_stream",
        update: {
          type: "assistant_message.content_part.done",
          content_index: 0,
          content: { type: "output_text", text: "I can't help.", annotations: [] },
        },
      },
    ]);
  });
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: FAIL because the new streaming raw event types are currently ignored.

- [ ] **Step 3: Add `response.content_part.added` handling**

In `src/agents/stream.ts`, add this case inside `convertSdkEvent(...)` before the existing `response.output_text.delta` case:

```ts
    case "response.content_part.added": {
      const itemId = stringValue(rawData.item_id) ?? state.activeItemId;
      if (!itemId) {
        return [];
      }

      const part = rawData.part;
      if (isRecord(part) && part.type === "reasoning_text") {
        return [];
      }

      const content = convertTextContentPart(part, converter);
      if (!content) {
        return [];
      }

      return [
        {
          type: "thread.item.updated",
          item_id: itemId,
          update: {
            type: "assistant_message.content_part.added",
            content_index: numberValue(rawData.content_index) ?? 0,
            content,
          },
        },
      ];
    }
```

- [ ] **Step 4: Add refusal delta and done handling**

In `src/agents/stream.ts`, add these cases inside `convertSdkEvent(...)` near the existing output text delta/done cases:

```ts
    case "response.refusal.delta": {
      const itemId = stringValue(rawData.item_id) ?? state.activeItemId;

      if (!itemId) {
        return [];
      }

      const contentIndex = numberValue(rawData.content_index) ?? 0;
      const delta = stringValue(rawData.delta) ?? "";
      const key = partKey(itemId, contentIndex);
      state.textByPart.set(key, `${state.textByPart.get(key) ?? ""}${delta}`);

      return [
        {
          type: "thread.item.updated",
          item_id: itemId,
          update: {
            type: "assistant_message.content_part.text_delta",
            content_index: contentIndex,
            delta,
          },
        },
      ];
    }

    case "response.refusal.done": {
      const itemId = stringValue(rawData.item_id) ?? state.activeItemId;

      if (!itemId) {
        return [];
      }

      const contentIndex = numberValue(rawData.content_index) ?? 0;
      const text = stringValue(rawData.refusal) ?? state.textByPart.get(partKey(itemId, contentIndex)) ?? "";

      return [
        {
          type: "thread.item.updated",
          item_id: itemId,
          update: {
            type: "assistant_message.content_part.done",
            content_index: contentIndex,
            content: { type: "output_text", text, annotations: [] },
          },
        },
      ];
    }
```

Keep output text handling unchanged.

- [ ] **Step 5: Run tests to verify Task 2 passes**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS for the new streaming refusal tests and existing Agents tests.

## Task 3: Regression Verification

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/annotations.ts`
- Modify: `src/agents/stream.ts`

- [ ] **Step 1: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run:

```bash
bun run verify
```

Expected: PASS.

- [ ] **Step 3: Check working tree scope**

Run:

```bash
git status --short --branch
```

Expected: Working tree changes are limited to:

- `docs/superpowers/specs/2026-05-28-chatkit-agents-refusal-content-part-design.md`
- `docs/superpowers/plans/2026-05-28-chatkit-agents-refusal-content-part.md`
- `src/agents/annotations.ts`
- `src/agents/stream.ts`
- `tests/agents.test.ts`

## Final Verification

After all implementation tasks and reviews complete, run:

```bash
bun test tests/agents.test.ts
bun run typecheck
bun run verify
git status --short --branch
```

Expected:

- `tests/agents.test.ts` passes.
- TypeScript typecheck passes.
- Full verification passes.
- No unrelated files are modified.

## Implementation Notes

- Use Bun tooling only.
- Keep `convertTextContentPart(...)` exported so existing imports remain stable.
- Represent refusals with the existing ChatKit `output_text` assistant content shape.
- Do not add refusal-specific schemas or public converter methods.
- Do not invoke custom annotation conversion for refusal parts.
- Continue validating all emitted events through the existing `ThreadStreamEventSchema.parse(...)` path in `streamAgentResponse(...)`.
- Ignore `reasoning_text` in `response.content_part.added`; reasoning summaries are handled by existing reasoning workflow events.
