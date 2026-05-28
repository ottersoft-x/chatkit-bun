# ChatKit Agents Stream Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `AgentContext.streamWidget(...)` parity so Agents code can enqueue static and streaming widgets through the existing context event path.

**Architecture:** Delegate event generation to the existing low-level `streamWidget(...)` helper and enqueue each event through `AgentContext.stream(...)`. Keep workflow lifecycle behavior in `streamAgentResponse(...)`; the new helper should produce normal context events that the existing lifecycle wrapper already understands.

**Tech Stack:** Bun, TypeScript, existing widget component helpers, Zod-validated thread stream events, `bun:test`.

---

## Scope Check

This plan implements the approved stream-widget spec:

- Add an async `AgentContext.streamWidget(widget, copyText?)` helper.
- Use store-backed message id generation and the context timestamp source.
- Preserve low-level static and streaming widget event shapes.
- Prove widget events emitted by the helper flow through `streamAgentResponse(...)`.
- Prove helper-emitted visible widget events auto-end active workflows.

It does not change widget schemas, low-level widget streaming, server event processing, widget serialization, or input replay behavior.

Commit checkpoints appear in the plan for review-sized boundaries. Only run commit commands when the operator has explicitly requested commits.

## File Structure

- Modify: `src/agents/context.ts`
  - Import the low-level widget stream helper and widget root type.
  - Add `AgentContext.streamWidget(...)`.
- Modify: `tests/agents.test.ts`
  - Import widget component helpers.
  - Add integration tests for static widget, streaming text delta, full root replacement, and workflow auto-end through the helper.

## Task 1: Add `AgentContext.streamWidget(...)` And Python-Port Tests

**Files:**
- Modify: `tests/agents.test.ts`
- Modify: `src/agents/context.ts`

- [ ] **Step 1: Add failing Agent widget tests**

In `tests/agents.test.ts`, update the imports at the top:

```ts
import { AgentContext, ClientToolCall, streamAgentResponse } from "../src/agents";
import { ResponseStreamConverter, defaultResponseStreamConverter } from "../src/agents/annotations";
import { SQLiteStore } from "../src/sqlite-store";
import { BaseStore, type Store, type StoreItemType } from "../src/store";
import type {
  Annotation,
  Attachment,
  Page,
  ThreadItem,
  ThreadMetadata,
  WorkflowSummary,
} from "../src/types/core";
import type { ThreadStreamEvent } from "../src/types/server";
import { Card, Text } from "../src/widgets";
```

Add these tests inside `describe("streamAgentResponse", () => { ... })`, after the existing context visible-item lifecycle tests and before `"yields context-only events when the SDK stream is empty"`:

```ts
  test("returns widget items streamed through the agent context", async () => {
    const agentContext = createContext();

    await agentContext.streamWidget(
      Card({ children: [Text({ value: "Hello, world!" })] }),
      "Hello, world!",
    );
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", value: "Hello, world!" }],
          },
          copy_text: "Hello, world!",
        },
      },
    ]);
  });

  test("returns streamed widget text deltas through the agent context", async () => {
    const agentContext = createContext();

    async function* widgets() {
      yield Card({ children: [Text({ id: "text", value: "", streaming: true })] });
      yield Card({ children: [Text({ id: "text", value: "Hello, world", streaming: true })] });
    }

    await agentContext.streamWidget(widgets());
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "", streaming: true }],
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "message_generated",
        update: {
          type: "widget.streaming_text.value_delta",
          component_id: "text",
          delta: "Hello, world",
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "Hello, world", streaming: true }],
          },
        },
      },
    ]);
  });

  test("returns streamed widget root replacements through the agent context", async () => {
    const agentContext = createContext();

    async function* widgets() {
      yield Card({ children: [Text({ id: "text", value: "Hello!" })] });
      yield Card({ children: [Text({ key: "other text", value: "World!", streaming: false })] });
    }

    await agentContext.streamWidget(widgets());
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "Hello!" }],
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "message_generated",
        update: {
          type: "widget.root.updated",
          widget: {
            type: "Card",
            children: [{ type: "Text", key: "other text", value: "World!", streaming: false }],
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", key: "other text", value: "World!", streaming: false }],
          },
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

Expected: FAIL at compile/typecheck time because `AgentContext` does not yet expose `streamWidget(...)`.

- [ ] **Step 3: Implement `AgentContext.streamWidget(...)`**

In `src/agents/context.ts`, add imports after the existing imports:

```ts
import { streamWidget as streamWidgetEvents, type WidgetRoot } from "../widgets";
```

Inside `AgentContext<TContext>`, add this method after `stream(event: ThreadStreamEvent): void`:

```ts
  async streamWidget(
    widget: WidgetRoot | AsyncIterable<WidgetRoot>,
    copyText?: string | null,
  ): Promise<void> {
    for await (const event of streamWidgetEvents(this.thread, widget, {
      copyText,
      generateId: (itemType) => this.store.generateItemId(itemType, this.thread, this.context),
      now: () => this.createdAt(),
    })) {
      this.stream(event);
    }
  }
```

Expected behavior:

- Static widgets enqueue one `thread.item.done` event.
- Streaming widgets enqueue `thread.item.added`, `thread.item.updated`, and `thread.item.done` events from the low-level helper.
- All generated events still pass through `AgentContext.stream(...)` validation.
- The method does not call `closeEvents()`.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
bun test tests/agents.test.ts
bun run typecheck
```

Expected: PASS for the new Python-port widget tests and existing Agents tests.

## Task 2: Prove Workflow Auto-End With Helper-Emitted Widgets

**Files:**
- Modify: `tests/agents.test.ts`

- [ ] **Step 1: Add the workflow integration test**

In `tests/agents.test.ts`, add this test after the Task 1 widget tests:

```ts
  test("ends active workflows before widgets streamed through the agent context", async () => {
    const store = new TestStore();
    const agentContext = createContext(store);

    agentContext.startWorkflow({
      type: "custom",
      tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
      expanded: true,
    });
    await agentContext.streamWidget(Card({ children: [Text({ value: "Result" })] }));
    agentContext.closeEvents();

    const events = await collect(streamAgentResponse(agentContext, streamedRun([])));

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
            expanded: true,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "workflow_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "workflow",
          workflow: {
            type: "custom",
            tasks: [{ type: "custom", title: "Prepare", status_indicator: "complete" }],
            summary: { duration: 0 },
            expanded: false,
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "message_generated",
          thread_id: "thr_1",
          created_at: now,
          type: "widget",
          widget: {
            type: "Card",
            children: [{ type: "Text", value: "Result" }],
          },
        },
      },
    ]);
    expect(store.savedThreadItems).toEqual([]);
  });
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
bun test tests/agents.test.ts
```

Expected: PASS if Task 1 correctly enqueues widget events through `AgentContext.stream(...)` and the existing workflow lifecycle wrapper handles visible widget events.

If it fails, inspect only the interaction between `AgentContext.streamWidget(...)` and the existing `contextEventsWithWorkflowLifecycle(...)` path. Do not add new workflow lifecycle logic unless the test proves the existing helper path is bypassed.

- [ ] **Step 3: Run full verification for the implementation slice**

Run:

```bash
bun run verify
git status --short --branch
```

Expected:

- TypeScript typecheck passes.
- All Bun tests pass.
- The working tree contains only the approved spec, this plan, `src/agents/context.ts`, and `tests/agents.test.ts` changes.

## Final Verification

After both tasks complete and reviews pass, run:

```bash
bun run verify
git status --short --branch
```

Expected:

- `bun run verify` passes.
- No unrelated files are modified.

## Implementation Notes

- Use Bun tooling only.
- Keep the helper async because low-level widget streaming can consume async iterables.
- Use `message` item ids because low-level `streamWidget(...)` already treats widgets as message-like thread items.
- Do not close the context event queue from `streamWidget(...)`.
- Do not duplicate widget diffing or serialization in `AgentContext`.
- Do not add server, schema, or low-level widget stream changes.
