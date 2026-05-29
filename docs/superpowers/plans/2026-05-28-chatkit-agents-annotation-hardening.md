# ChatKit Agents Annotation Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden ChatKit Bun's Agents annotation conversion for `@openai/agents` stream compatibility while preserving the existing ChatKit JS event/schema surface.

**Architecture:** Keep the production change inside `ResponseStreamConverter` in `src/agents/annotations.ts`. Add regression coverage in `tests/agents.test.ts` for mixed final annotations, malformed annotation drops, non-zero content indices, and `output_text.done` annotation behavior. Reuse existing `tests/server.test.ts` merge coverage instead of changing server behavior.

**Tech Stack:** Bun, TypeScript, `bun:test`, `@openai/agents` raw Responses stream events, existing ChatKit `ThreadStreamEvent` schemas.

---

## Scope Check

This plan implements the approved annotation hardening spec:

- Preserve supported `file_citation`, `container_file_citation`, and `url_citation` annotations.
- Explicitly drop unsupported `file_path`, unknown, and malformed annotation payloads.
- Allow `url_citation` with `title: ""`, while still requiring `title` to be a string.
- Keep malformed payload handling defensive: default converter returns `null`, not throws.
- Keep streaming annotation indices compacted per `item_id` and `content_index`.
- Keep `response.output_text.done` emitting `annotations: []`.
- Preserve existing server-side merge behavior for streamed annotations.

This plan does not add schemas, entity mapping, input-side annotation replay, new stream event shapes, new converter methods, or Python-style throw-on-invalid behavior.

Commit checkpoints appear for review-sized boundaries. Only run commit commands when the operator has explicitly requested commits.

## File Structure

- Modify: `tests/agents.test.ts`
  - Adds failing coverage in the existing `ResponseStreamConverter` describe block.
  - Adds hardening coverage in the existing `describe("streamAgentResponse", () => { ... })` block near annotation tests.
- Modify: `src/agents/annotations.ts`
  - Loosens only URL citation title handling from non-empty string to string.
- Verify: `tests/server.test.ts`
  - Existing tests cover preserving streamed annotations when final or content-part done events carry empty annotation arrays.

## Task 1: Add Failing Annotation Coverage

**Files:**
- Modify: `tests/agents.test.ts`
- Verify: `tests/server.test.ts`

- [ ] **Step 1: Add URL title edge coverage to `ResponseStreamConverter` tests**

In `tests/agents.test.ts`, inside `describe("ResponseStreamConverter", () => { ... })`, extend `test("converts default citation annotations", ...)` by adding this assertion after the existing URL citation assertion:

```ts
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com/untitled",
        title: "",
        end_index: 20,
      }),
    ).toEqual({
      type: "annotation",
      source: {
        type: "url",
        url: "https://example.com/untitled",
        title: "",
      },
      index: 20,
    });
```

In the same describe block, extend `test("drops invalid or unsupported citation annotations", ...)` by replacing the single missing-title URL assertion:

```ts
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com",
        end_index: 4,
      }),
    ).toBeNull();
```

with these assertions:

```ts
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com",
        end_index: 4,
      }),
    ).toBeNull();
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com",
        title: null,
        end_index: 4,
      }),
    ).toBeNull();
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "https://example.com",
        title: 123,
        end_index: 4,
      }),
    ).toBeNull();
    expect(
      converter.convertAnnotation({
        type: "url_citation",
        url: "",
        title: "Empty URL",
        end_index: 4,
      }),
    ).toBeNull();
```

- [ ] **Step 2: Add final mixed-content hardening coverage**

In `tests/agents.test.ts`, after `test("includes converted annotations in final response output items", async () => { ... })`, add:

```ts
  test("filters mixed final assistant content annotations", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_item.done",
            item: {
              type: "message",
              id: "msg_mixed_annotations",
              content: [
                {
                  type: "output_text",
                  text: "See the cited sources.",
                  annotations: [
                    {
                      type: "file_citation",
                      file_id: "file_123",
                      filename: "report.pdf",
                      index: 0,
                    },
                    {
                      type: "file_path",
                      file_id: "file_path_1",
                      index: 2,
                    },
                    {
                      type: "container_file_citation",
                      container_id: "container_1",
                      file_id: "file_456",
                      filename: "container.txt",
                      start_index: 1,
                      end_index: 4,
                    },
                    {
                      type: "url_citation",
                      url: "https://example.com/untitled",
                      title: "",
                      start_index: 5,
                      end_index: 12,
                    },
                    {
                      type: "url_citation",
                      url: "https://example.com/bad-title",
                      title: 123,
                      end_index: 13,
                    },
                    {
                      type: "file_citation",
                      file_id: "file_empty",
                      filename: "",
                      index: 14,
                    },
                    "not an annotation",
                  ],
                },
                { type: "refusal", refusal: "I can't summarize the hidden material." },
                {
                  type: "output_text",
                  text: "Second content part.",
                  annotations: [
                    {
                      type: "url_citation",
                      url: "https://example.com/second",
                      title: "Second",
                      end_index: 6,
                    },
                  ],
                },
              ],
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "msg_mixed_annotations",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [
            {
              type: "output_text",
              text: "See the cited sources.",
              annotations: [
                {
                  type: "annotation",
                  source: { type: "file", filename: "report.pdf", title: "report.pdf" },
                  index: 0,
                },
                {
                  type: "annotation",
                  source: { type: "file", filename: "container.txt", title: "container.txt" },
                  index: 4,
                },
                {
                  type: "annotation",
                  source: { type: "url", url: "https://example.com/untitled", title: "" },
                  index: 12,
                },
              ],
            },
            {
              type: "output_text",
              text: "I can't summarize the hidden material.",
              annotations: [],
            },
            {
              type: "output_text",
              text: "Second content part.",
              annotations: [
                {
                  type: "annotation",
                  source: { type: "url", url: "https://example.com/second", title: "Second" },
                  index: 6,
                },
              ],
            },
          ],
        },
      },
    ]);
  });
```

- [ ] **Step 3: Add normalized `response_done` filtering coverage**

In `tests/agents.test.ts`, after `test("includes converted annotations in normalized response_done outputs", async () => { ... })`, add:

```ts
  test("filters normalized response_done annotations", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawModel({
            type: "response_done",
            response: {
              id: "resp_filter_annotations",
              output: [
                {
                  type: "message",
                  id: "msg_filtered",
                  role: "assistant",
                  status: "completed",
                  content: [
                    {
                      type: "output_text",
                      text: "Filtered annotations.",
                      annotations: [
                        {
                          type: "container_file_citation",
                          container_id: "container_1",
                          file_id: "file_123",
                          filename: "container.txt",
                          end_index: 8,
                        },
                        { type: "file_path", file_id: "file_path_1", index: 3 },
                        {
                          type: "url_citation",
                          url: "https://example.com/no-title",
                          title: null,
                          end_index: 9,
                        },
                      ],
                    },
                  ],
                },
              ],
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          }),
        ]),
      ),
    );

    expect(events.at(-1)).toEqual({
      type: "thread.item.done",
      item: {
        id: "msg_filtered",
        thread_id: "thr_1",
        created_at: now,
        type: "assistant_message",
        content: [
          {
            type: "output_text",
            text: "Filtered annotations.",
            annotations: [
              {
                type: "annotation",
                source: { type: "file", filename: "container.txt", title: "container.txt" },
                index: 8,
              },
            ],
          },
        ],
      },
    });
  });
```

- [ ] **Step 4: Add streaming multi-content-index and done-event coverage**

In `tests/agents.test.ts`, after `test("emits compacted streaming annotation added events", async () => { ... })`, add:

```ts
  test("compacts streaming annotation indices per content part", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_multi_part",
            content_index: 1,
            annotation_index: 0,
            annotation: {
              type: "file_citation",
              file_id: "file_invalid",
              filename: "",
              index: 0,
            },
          }),
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_multi_part",
            content_index: 1,
            annotation_index: 1,
            annotation: {
              type: "url_citation",
              url: "https://example.com/part-one",
              title: "Part One",
              end_index: 8,
            },
          }),
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_multi_part",
            content_index: 0,
            annotation_index: 2,
            annotation: {
              type: "container_file_citation",
              container_id: "container_1",
              file_id: "file_123",
              filename: "container.txt",
              end_index: 3,
            },
          }),
        ]),
      ),
    );

    expect(events).toEqual([
      {
        type: "thread.item.updated",
        item_id: "msg_multi_part",
        update: {
          type: "assistant_message.content_part.annotation_added",
          content_index: 1,
          annotation_index: 0,
          annotation: {
            type: "annotation",
            source: { type: "url", url: "https://example.com/part-one", title: "Part One" },
            index: 8,
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_multi_part",
        update: {
          type: "assistant_message.content_part.annotation_added",
          content_index: 0,
          annotation_index: 0,
          annotation: {
            type: "annotation",
            source: { type: "file", filename: "container.txt", title: "container.txt" },
            index: 3,
          },
        },
      },
    ]);
  });

  test("emits output text done events without annotations after streaming annotations", async () => {
    const events = await collect(
      streamAgentResponse(
        createContext(),
        streamedRun([
          rawResponse({
            type: "response.output_text.annotation.added",
            item_id: "msg_done_annotations",
            content_index: 0,
            annotation_index: 0,
            annotation: {
              type: "url_citation",
              url: "https://example.com",
              title: "Example",
              end_index: 5,
            },
          }),
          rawResponse({
            type: "response.output_text.done",
            item_id: "msg_done_annotations",
            content_index: 0,
            text: "Hello!",
          }),
        ]),
      ),
    );

    expect(events.at(-1)).toEqual({
      type: "thread.item.updated",
      item_id: "msg_done_annotations",
      update: {
        type: "assistant_message.content_part.done",
        content_index: 0,
        content: { type: "output_text", text: "Hello!", annotations: [] },
      },
    });
  });
```

- [ ] **Step 5: Verify the server merge coverage already exists**

Run:

```bash
rg 'keeps streamed assistant annotations when final content has none|preserves streamed assistant annotations when content done has none' tests/server.test.ts
```

Expected: both of these existing tests are reported:

```ts
  test("keeps streamed assistant annotations when final content has none", async () => {
```

```ts
  test("preserves streamed assistant annotations when content done has none", async () => {
```

Do not edit `tests/server.test.ts` unless either test is missing.

- [ ] **Step 6: Run focused tests and confirm the expected failure**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: FAIL. The failures should be caused by URL citations with `title: ""` being dropped by the current default converter. Tests unrelated to empty URL titles may already pass.

## Task 2: Implement URL Title Edge Behavior

**Files:**
- Modify: `src/agents/annotations.ts`
- Test: `tests/agents.test.ts`

- [ ] **Step 1: Loosen URL citation title conversion only**

In `src/agents/annotations.ts`, replace the current URL citation conversion guard:

```ts
    const url = nonEmptyStringValue(annotation.url);
    const title = nonEmptyStringValue(annotation.title);
    if (!url || !title) {
      return null;
    }
```

with:

```ts
    const url = nonEmptyStringValue(annotation.url);
    const title = stringValue(annotation.title);
    if (!url || title === null) {
      return null;
    }
```

Do not change file citation, container file citation, number parsing, content-part conversion, stream event conversion, server merge logic, or converter method names.

- [ ] **Step 2: Run the focused Agents tests**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS. The new URL empty-title tests and existing Agents stream tests should pass.

- [ ] **Step 3: Run TypeScript**

Run:

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 4: Optional commit checkpoint**

Only if the operator has explicitly requested commits, run:

```bash
git add src/agents/annotations.ts tests/agents.test.ts
git commit -m "$(cat <<'EOF'
Harden agent annotation conversion

EOF
)"
```

## Task 3: Regression Verification

**Files:**
- Verify: `src/agents/annotations.ts`
- Verify: `tests/agents.test.ts`
- Verify: `tests/server.test.ts`
- Verify: `docs/superpowers/specs/2026-05-28-chatkit-agents-annotation-hardening-design.md`
- Verify: `docs/superpowers/plans/2026-05-28-chatkit-agents-annotation-hardening.md`

- [ ] **Step 1: Run server annotation regression tests**

Run:

```bash
bun test tests/server.test.ts
```

Expected: PASS. Existing server tests should continue to prove that streamed annotations survive final and content-part done updates with empty annotation arrays.

- [ ] **Step 2: Review the scoped diff**

Run:

```bash
git diff -- src/agents/annotations.ts tests/agents.test.ts tests/server.test.ts docs/superpowers/specs/2026-05-28-chatkit-agents-annotation-hardening-design.md docs/superpowers/plans/2026-05-28-chatkit-agents-annotation-hardening.md
```

Expected: the production diff only loosens URL title conversion in `src/agents/annotations.ts`. Test/doc changes should match this plan and the approved spec. There should be no changes to public schemas, stream event shapes, custom converter method names, server behavior, input conversion, widgets, generated images, or persistence logic.

- [ ] **Step 3: Run full verification**

Run:

```bash
bun run verify
```

Expected: PASS.

- [ ] **Step 4: Check final status**

Run:

```bash
git status --short --branch
```

Expected: only the approved spec, implementation plan, `src/agents/annotations.ts`, and `tests/agents.test.ts` are changed unless the operator has explicitly requested commits. `tests/server.test.ts` should be unchanged if its existing coverage was present.

- [ ] **Step 5: Optional final commit checkpoint**

Only if the operator has explicitly requested commits and Task 2 was not already committed, run:

```bash
git add docs/superpowers/specs/2026-05-28-chatkit-agents-annotation-hardening-design.md docs/superpowers/plans/2026-05-28-chatkit-agents-annotation-hardening.md src/agents/annotations.ts tests/agents.test.ts
git commit -m "$(cat <<'EOF'
Harden agent annotation conversion

EOF
)"
```
