# ChatKit Agents Guardrail Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ChatKit items produced by the current Agents turn when a JavaScript Agents SDK guardrail tripwire interrupts `streamAgentResponse(...)`.

**Architecture:** Keep rollback private to `src/agents/stream.ts`. Track produced item ids in insertion order while yielding current-turn item-bearing stream events; on JS Agents guardrail tripwire, yield `thread.item.removed` events for those ids and rethrow the original error. Exclude metadata-only SDK tool ids and known existing stored ids from rollback. Preserve current behavior for non-guardrail failures and existing server persistence.

**Tech Stack:** Bun, TypeScript, `bun:test`, `@openai/agents` guardrail tripwire classes, existing ChatKit thread stream events.

---

## Scope Check

This plan implements the approved guardrail rollback spec:

- Detect JS Agents input, output, tool input, and tool output guardrail tripwire errors.
- Track items produced by the current `streamAgentResponse(...)` turn.
- Emit `thread.item.removed` cleanup events before rethrowing guardrail tripwire errors.
- Preserve existing non-guardrail error behavior.
- Add focused tests and run full verification.

This plan does not change server request handling, schemas, `ThreadItemConverter`, input replay, widget serialization, or generated-image URL conversion.

Commit checkpoints appear for review-sized boundaries. Only run commit commands when the operator has explicitly requested commits.

## File Structure

- Modify: `tests/agents.test.ts`
  - Adds test-only guardrail error factories, a throwing stream helper, and rollback tests in the existing `streamAgentResponse` describe block.
- Modify: `src/agents/stream.ts`
  - Imports JS Agents guardrail tripwire classes, adds private guardrail and produced-item helpers, tracks produced ids, and yields rollback events on guardrail errors.

## Task 1: Guardrail Detection And Basic Rollback

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/stream.ts`

- [ ] **Step 1: Add failing guardrail rollback tests**

Update the import block in `tests/agents.test.ts` to include guardrail tripwire classes:

```ts
import {
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
  ToolInputGuardrailTripwireTriggered,
  ToolOutputGuardrailTripwireTriggered,
} from "@openai/agents";
import { describe, expect, test } from "bun:test";
```

Add these helpers near the existing `streamedRun(...)` helper:

```ts
function throwingStream(events: unknown[], error: Error): { toStream: () => AsyncIterable<unknown> } {
  return {
    toStream: () => ({
      [Symbol.asyncIterator](): AsyncIterator<unknown> {
        let index = 0;

        return {
          async next(): Promise<IteratorResult<unknown>> {
            if (index < events.length) {
              return { done: false, value: events[index++] };
            }

            throw error;
          },
          async return(): Promise<IteratorResult<unknown>> {
            return { done: true, value: undefined };
          },
        };
      },
    }),
  };
}

type GuardrailErrorFactory = {
  name: string;
  create: () => Error;
};

const guardrailErrorFactories: GuardrailErrorFactory[] = [
  {
    name: "input",
    create: () =>
      new InputGuardrailTripwireTriggered("input blocked", {
        guardrail: { type: "input", name: "input_blocked" },
        output: { tripwireTriggered: true, outputInfo: null },
      } as never),
  },
  {
    name: "output",
    create: () =>
      new OutputGuardrailTripwireTriggered("output blocked", {
        guardrail: { type: "output", name: "output_blocked" },
        agent: {},
        agentOutput: "blocked",
        output: { tripwireTriggered: true, outputInfo: null },
      } as never),
  },
  {
    name: "tool input",
    create: () =>
      new ToolInputGuardrailTripwireTriggered("tool input blocked", {
        guardrail: { type: "tool_input", name: "tool_input_blocked" },
        output: { behavior: { type: "throwException" }, outputInfo: null },
      } as never),
  },
  {
    name: "tool output",
    create: () =>
      new ToolOutputGuardrailTripwireTriggered("tool output blocked", {
        guardrail: { type: "tool_output", name: "tool_output_blocked" },
        output: { behavior: { type: "throwException" }, outputInfo: null },
      } as never),
  },
];
```

The factories cast minimal constructor results to `never` because tests only need
real SDK error instances. The runtime constructors store `result` without
inspecting it.

Add this test inside `describe("streamAgentResponse", () => { ... })` after the existing workflow lifecycle tests and before unrelated mapping tests:

```ts
  for (const guardrail of guardrailErrorFactories) {
    test(`removes SDK and context produced items before rethrowing ${guardrail.name} guardrail errors`, async () => {
      const error = guardrail.create();
      const agentContext = createContext();
      const contextItem: Extract<ThreadItem, { type: "assistant_message" }> = {
        id: "ctx_message",
        thread_id: thread.id,
        created_at: now,
        type: "assistant_message",
        content: [{ type: "output_text", text: "Context output", annotations: [] }],
      };

      agentContext.stream({ type: "thread.item.done", item: contextItem });

      const iterator = streamAgentResponse(
        agentContext,
        throwingStream(
          [
            rawResponse({
              type: "response.output_item.added",
              item: { type: "message", id: "sdk_message" },
            }),
            rawResponse({
              type: "response.output_text.done",
              item_id: "sdk_message",
              content_index: 0,
              text: "SDK output",
            }),
          ],
          error,
        ),
      );
      const events: ThreadStreamEvent[] = [];
      let thrown: unknown;

      try {
        for await (const event of iterator) {
          events.push(event);
        }
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBe(error);

      expect(events).toEqual([
        {
          type: "thread.item.done",
          item: contextItem,
        },
        {
          type: "thread.item.added",
          item: {
            id: "sdk_message",
            thread_id: "thr_1",
            created_at: now,
            type: "assistant_message",
            content: [],
          },
        },
        {
          type: "thread.item.updated",
          item_id: "sdk_message",
          update: {
            type: "assistant_message.content_part.done",
            content_index: 0,
            content: { type: "output_text", text: "SDK output", annotations: [] },
          },
        },
        { type: "thread.item.removed", item_id: "ctx_message" },
        { type: "thread.item.removed", item_id: "sdk_message" },
      ]);
    });
  }
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: FAIL because guardrail errors rethrow without cleanup `thread.item.removed` events.

- [ ] **Step 3: Implement guardrail detection and item-bearing event tracking**

Update `src/agents/stream.ts` imports:

```ts
import {
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
  ToolInputGuardrailTripwireTriggered,
  ToolOutputGuardrailTripwireTriggered,
} from "@openai/agents";
import type { AssistantMessageContent, ThreadItem } from "../types/core";
```

Add these helpers near `tagNext(...)`:

```ts
function isGuardrailTripwire(error: unknown): boolean {
  return (
    error instanceof InputGuardrailTripwireTriggered ||
    error instanceof OutputGuardrailTripwireTriggered ||
    error instanceof ToolInputGuardrailTripwireTriggered ||
    error instanceof ToolOutputGuardrailTripwireTriggered
  );
}

function trackProducedItemId(
  producedItemIds: Set<string>,
  existingItemIds: ReadonlySet<string>,
  event: ThreadStreamEvent,
): void {
  if (event.type === "thread.item.added") {
    producedItemIds.add(event.item.id);
    return;
  }

  if (
    event.type === "thread.item.done" &&
    (!existingItemIds.has(event.item.id) || producedItemIds.has(event.item.id))
  ) {
    producedItemIds.add(event.item.id);
  }
}

function parseAndTrackProducedItem(
  producedItemIds: Set<string>,
  existingItemIds: ReadonlySet<string>,
  event: ThreadStreamEvent,
): ThreadStreamEvent {
  const parsedEvent = ThreadStreamEventSchema.parse(event);
  trackProducedItemId(producedItemIds, existingItemIds, parsedEvent);
  return parsedEvent;
}

function rollbackProducedItemEvents(producedItemIds: ReadonlySet<string>): ThreadStreamEvent[] {
  return [...producedItemIds].map((itemId) =>
    ThreadStreamEventSchema.parse({ type: "thread.item.removed", item_id: itemId }),
  );
}

async function returnIterator<T>(iterator: AsyncIterator<T>): Promise<void> {
  try {
    await iterator.return?.();
  } catch {
    // Iterator cleanup is best-effort and must not mask the stream error.
  }
}
```

In `streamAgentResponse(...)`, add a known existing item set from the recent
resume window and the produced set after `toolCallMetadataByName`:

```ts
  const existingItemIds = new Set(recentItems.data.map((item) => item.id));
  const toolCallMetadataByName = new Map<string, ToolCallMetadata>();
  const producedItemIds = new Set<string>();
```

Replace each direct yield of parsed converted/context events inside the loop:

```ts
yield ThreadStreamEventSchema.parse(event);
```

with:

```ts
yield parseAndTrackProducedItem(producedItemIds, existingItemIds, event);
```

There are four direct loop yield sites to update:

- `contextNext.result` ready branch.
- SDK-won race that still flushes a ready context event first.
- `next.source === "context"` branch.
- `convertSdkEvent(...)` result branch.

Wrap the existing `try` body with a guardrail catch before the existing `finally`:

```ts
  } catch (error) {
    if (!isGuardrailTripwire(error)) {
      throw error;
    }

    for (const event of rollbackProducedItemEvents(producedItemIds)) {
      yield event;
    }

    throw error;
  } finally {
    context.closeEvents();
    await returnIterator(sdkIterator);
    await returnIterator(contextIterator);
  }
```

- [ ] **Step 4: Verify Task 1 passes**

Run:

```bash
bun test tests/agents.test.ts
bun run typecheck
```

Expected: PASS for the new guardrail rollback tests and existing Agents tests.

## Task 2: SDK Tool Metadata Preservation, Generated Images, And Workflow Produced Ids

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/stream.ts`

- [ ] **Step 1: Add failing produced-id coverage tests**

Add this test inside `describe("streamAgentResponse", () => { ... })`:

```ts
  test("does not remove SDK tool metadata-only ids on guardrail errors", async () => {
    const error = guardrailErrorFactories[0]!.create();
    const agentContext = createContext();
    const iterator = streamAgentResponse(
      agentContext,
      throwingStream(
        [
          {
            type: "run_item_stream_event",
            item: {
              type: "tool_call_item",
              raw_item: {
                type: "function_call",
                id: "tool_call_item",
                call_id: "call_tool",
                name: "get_selection",
              },
            },
          },
          rawResponse({
            type: "response.output_item.added",
            item: { type: "reasoning", id: "reasoning_1" },
          }),
          rawResponse({
            type: "response.output_item.added",
            item: { type: "image_generation_call", id: "image_call" },
          }),
        ],
        error,
      ),
    );
    const events: ThreadStreamEvent[] = [];

    let thrown: unknown;

    try {
      for await (const event of iterator) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: { type: "reasoning", tasks: [], expanded: false },
        },
      },
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "generated_image",
          image: null,
        },
      },
      { type: "thread.item.removed", item_id: "workflow_generated" },
      { type: "thread.item.removed", item_id: "message_generated" },
    ]);
  });
```

Add this test for pending client tool calls after guardrail interruption:

```ts
  test("does not yield pending client tool calls after guardrail errors", async () => {
    async function* runWithLateGuardrail() {
      yield rawResponse({
        type: "response.output_item.added",
        item: { type: "message", id: "sdk_message" },
      });
      throw guardrailErrorFactories[1]!.create();
    }

    const agentContext = createContext();
    agentContext.setClientToolCall(new ClientToolCall("get_selection"));

    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(agentContext, runWithLateGuardrail())) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(OutputGuardrailTripwireTriggered);

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      { type: "thread.item.removed", item_id: "sdk_message" },
    ]);
  });
```

This second test documents that a pending client tool call is not produced after
guardrail interruption. If a future code path yields a pending client tool call
before a guardrail error, `parseAndTrackProducedItem(...)` will track it through
the same item-bearing event path.

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS after Task 1 event tracking because metadata-only SDK tool ids are
not ChatKit items yielded by the bridge. The generated image and reasoning
workflow removals are kept because they protect the yielded produced-id set.

- [ ] **Step 3: Preserve SDK tool-call metadata without rollback tracking**

In `src/agents/stream.ts`, keep metadata for normal pending client tool call
finalization, but do not add metadata-only ids to `producedItemIds`:

```ts
      if (metadata) {
        toolCallMetadataByName.set(metadata.name, metadata.metadata);
      }
```

Keep pending client tool call event tracking through `parseAndTrackProducedItem(...)`:

```ts
    if (clientToolCallEvent) {
      yield parseAndTrackProducedItem(producedItemIds, existingItemIds, clientToolCallEvent);
    }
```

- [ ] **Step 4: Verify Task 2 passes**

Run:

```bash
bun test tests/agents.test.ts
bun run typecheck
```

Expected: PASS for produced-id coverage and typecheck.

## Task 3: Non-Guardrail Preservation, Context Queue Cleanup, And Full Verification

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/stream.ts`

- [ ] **Step 1: Add failing cleanup edge tests**

Add this test for non-guardrail behavior:

```ts
  test("does not remove produced items for non-guardrail stream errors", async () => {
    const error = new Error("ordinary stream failure");
    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(
        createContext(),
        throwingStream(
          [
            rawResponse({
              type: "response.output_item.added",
              item: { type: "message", id: "sdk_message" },
            }),
          ],
          error,
        ),
      )) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
    ]);
  });
```

Add this test for queued context events after guardrail:

```ts
  test("does not process queued context events after guardrail rollback", async () => {
    const error = guardrailErrorFactories[0]!.create();
    const agentContext = createContext();
    const firstContextItem = {
      ...contextWidgetItem(),
      id: "widget_before_guardrail",
    };
    const secondContextItem = {
      ...contextWidgetItem(),
      id: "widget_after_guardrail",
    };

    agentContext.stream({ type: "thread.item.done", item: firstContextItem });

    async function* runWithQueuedContext() {
      yield rawResponse({
        type: "response.output_item.added",
        item: { type: "message", id: "sdk_message" },
      });
      agentContext.stream({ type: "thread.item.done", item: secondContextItem });
      throw error;
    }

    const events: ThreadStreamEvent[] = [];
    let thrown: unknown;

    try {
      for await (const event of streamAgentResponse(agentContext, runWithQueuedContext())) {
        events.push(event);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(error);

    expect(events).toEqual([
      { type: "thread.item.done", item: firstContextItem },
      {
        type: "thread.item.added",
        item: {
          id: "sdk_message",
          thread_id: "thr_1",
          created_at: now,
          type: "assistant_message",
          content: [],
        },
      },
      { type: "thread.item.removed", item_id: "widget_before_guardrail" },
      { type: "thread.item.removed", item_id: "sdk_message" },
    ]);
  });
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS if Tasks 1 and 2 kept non-guardrail errors untouched and guardrail
cleanup stops context processing. If the queued context item appears in output,
fix the catch path so guardrail cleanup yields only rollback events after the
tripwire.

- [ ] **Step 3: Review final implementation shape**

Confirm `src/agents/stream.ts` has these final properties:

```ts
function isGuardrailTripwire(error: unknown): boolean {
  return (
    error instanceof InputGuardrailTripwireTriggered ||
    error instanceof OutputGuardrailTripwireTriggered ||
    error instanceof ToolInputGuardrailTripwireTriggered ||
    error instanceof ToolOutputGuardrailTripwireTriggered
  );
}
```

```ts
function parseAndTrackProducedItem(
  producedItemIds: Set<string>,
  existingItemIds: ReadonlySet<string>,
  event: ThreadStreamEvent,
): ThreadStreamEvent {
  const parsedEvent = ThreadStreamEventSchema.parse(event);
  trackProducedItemId(producedItemIds, existingItemIds, parsedEvent);
  return parsedEvent;
}
```

```ts
  } catch (error) {
    if (!isGuardrailTripwire(error)) {
      throw error;
    }

    for (const event of rollbackProducedItemEvents(producedItemIds)) {
      yield event;
    }

    throw error;
  } finally {
    context.closeEvents();
    await returnIterator(sdkIterator);
    await returnIterator(contextIterator);
  }
```

Do not add a public export for these helpers unless another file needs them.

- [ ] **Step 4: Run final verification**

Run:

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
- Working tree changes are limited to `src/agents/stream.ts`, `tests/agents.test.ts`, this plan, and the approved spec.

## Final Verification

After all implementation tasks and reviews complete, run:

```bash
bun run verify
git status --short --branch
```

Expected:

- `bun run verify` passes.
- No unrelated files are modified.

## Implementation Notes

- Use Bun tooling only.
- Keep rollback logic private to `src/agents/stream.ts`.
- Preserve `ThreadStreamEventSchema.parse(...)` validation on every yielded event.
- Use `Set<string>` insertion order for deterministic rollback.
- Track `thread.item.done` ids only when they are not known existing stored ids
  from the recent resume window, or when they were already produced earlier in
  the same turn.
- Keep SDK tool metadata for normal pending client tool finalization, but do not
  rollback metadata-only ids.
- Rethrow the original guardrail error object so callers can distinguish safety
  blocks from generic stream failures.
- Treat iterator `return(...)` cleanup as best-effort so cleanup failures do not
  mask the original stream error.
- Keep non-guardrail errors untouched.
- Do not change `ChatKitServer.processEvents(...)`; existing
  `thread.item.removed` persistence already deletes stored items and suppresses
  hidden item events.
