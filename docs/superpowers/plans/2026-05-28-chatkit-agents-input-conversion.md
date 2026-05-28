# ChatKit Agents Input Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ThreadItemConverter` and `simpleToAgentInput(...)` so persisted ChatKit thread history can be replayed as JavaScript Agents SDK input.

**Architecture:** Create a focused input-side converter module under `src/agents/` that maps existing `ThreadItem` variants into `AgentInputItem[]` from `@openai/agents`. Keep conversion independent from `ChatKitServer`, `AgentContext`, and `streamAgentResponse(...)`; apps remain responsible for loading history, running the agent, and streaming output.

**Tech Stack:** Bun, TypeScript, `@openai/agents` `AgentInputItem`, existing ChatKit thread item types, existing widget serialization helpers, `bun:test`.

---

## Scope Check

This plan implements the approved input conversion spec:

- Add `ThreadItemConverter`.
- Add `simpleToAgentInput(...)`.
- Return JavaScript Agents SDK-native `AgentInputItem[]` shapes.
- Port Python converter behavior where it maps to current Bun `ThreadItem` variants.
- Add converter tests, workflow conversion coverage, export coverage, and one resumed-turn usage test.

This plan does not change server behavior, stream-output conversion, guardrail rollback, generated-image stream replay, or ChatKit schemas.

Commit checkpoints appear for review-sized boundaries. Only run commit commands when the operator has explicitly requested commits.

## File Structure

- Create: `src/agents/converter.ts`
  - Owns input conversion types, `ThreadItemConverter`, and the default `simpleToAgentInput(...)` helper.
- Modify: `src/agents/index.ts`
  - Re-exports the converter public API.
- Create: `tests/agents-converter.test.ts`
  - Contains converter parity tests and the resumed-turn usage test.
- Modify: `tests/exports.test.ts`
  - Asserts root exports include `ThreadItemConverter` and `simpleToAgentInput(...)`.

## Task 1: Public API Scaffolding

**Files:**
- Create: `tests/agents-converter.test.ts`
- Modify: `tests/exports.test.ts`
- Create: `src/agents/converter.ts`
- Modify: `src/agents/index.ts`

- [ ] **Step 1: Add failing export and helper tests**

Create `tests/agents-converter.test.ts` with the initial single-item helper test:

```ts
import { describe, expect, test } from "bun:test";

import {
  ThreadItemConverter,
  simpleToAgentInput,
  type ThreadItem,
  type UserMessageTagContent,
} from "../src";

const now = "2026-05-28T00:00:00.000Z";
const threadId = "thr_1";

function userMessage(overrides: Partial<Extract<ThreadItem, { type: "user_message" }>> = {}): Extract<ThreadItem, { type: "user_message" }> {
  return {
    id: "msg_user",
    thread_id: threadId,
    created_at: now,
    type: "user_message",
    content: [{ type: "input_text", text: "Hello!" }],
    attachments: [],
    inference_options: {},
    ...overrides,
  };
}

describe("ThreadItemConverter", () => {
  test("converts a single user message through the default helper", async () => {
    await expect(simpleToAgentInput(userMessage())).resolves.toEqual([
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Hello!" }],
      },
    ]);
  });

  test("exposes an overridable converter class", () => {
    expect(new ThreadItemConverter()).toBeInstanceOf(ThreadItemConverter);
  });
});
```

Update `tests/exports.test.ts` imports:

```ts
import {
  ActionConfigSchema,
  AgentContext,
  BaseStore,
  Card,
  ChatKitServer,
  ClientToolCall,
  NonStreamingResult,
  ResponseStreamConverter,
  SQLiteStore,
  StreamingResult,
  ThreadItemConverter,
  ThreadMetadataSchema,
  WidgetTemplate,
  createActionConfig,
  createChatKitHandler,
  decodeJsonBytes,
  defaultResponseStreamConverter,
  diffWidget,
  encodeJsonBytes,
  defaultGenerateId,
  simpleToAgentInput,
  streamAgentResponse,
  streamWidget,
} from "../src";
```

Add these assertions inside the existing `exports foundation APIs` test:

```ts
    expect(typeof ThreadItemConverter).toBe("function");
    expect(typeof simpleToAgentInput).toBe("function");
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run:

```bash
bun test tests/agents-converter.test.ts tests/exports.test.ts
```

Expected: FAIL because `ThreadItemConverter` and `simpleToAgentInput` are not exported.

- [ ] **Step 3: Add the converter scaffold and exports**

Create `src/agents/converter.ts`:

```ts
import type { AgentInputItem } from "@openai/agents";

import type { Attachment, ThreadItem, UserMessageContent } from "../types/core";

export type UserMessageItem = Extract<ThreadItem, { type: "user_message" }>;
export type AssistantMessageItem = Extract<ThreadItem, { type: "assistant_message" }>;
export type ClientToolCallItem = Extract<ThreadItem, { type: "client_tool_call" }>;
export type WidgetItem = Extract<ThreadItem, { type: "widget" }>;
export type GeneratedImageItem = Extract<ThreadItem, { type: "generated_image" }>;
export type StructuredInputItem = Extract<ThreadItem, { type: "structured_input" }>;
export type TaskItem = Extract<ThreadItem, { type: "task" }>;
export type WorkflowItem = Extract<ThreadItem, { type: "workflow" }>;
export type HiddenContextItem = Extract<ThreadItem, { type: "hidden_context_item" }>;
export type SDKHiddenContextItem = Extract<ThreadItem, { type: "sdk_hidden_context" }>;
export type EndOfTurnItem = Extract<ThreadItem, { type: "end_of_turn" }>;
export type UserMessageTagContent = Extract<UserMessageContent, { type: "input_tag" }>;

export type AgentUserMessageItem = Extract<AgentInputItem, { role: "user" }>;
export type AgentMessageContentPart = Exclude<AgentUserMessageItem["content"], string>[number];

type MaybeInput = AgentInputItem | AgentInputItem[] | null | undefined;

function normalizeInput(input: MaybeInput): AgentInputItem[] {
  if (input == null) {
    return [];
  }
  return Array.isArray(input) ? input : [input];
}

function userInputMessage(content: AgentUserMessageItem["content"]): AgentInputItem {
  return { type: "message", role: "user", content };
}

export class ThreadItemConverter {
  attachmentToMessageContent(_attachment: Attachment): AgentMessageContentPart | Promise<AgentMessageContentPart> {
    throw new Error(
      "An Attachment was included in a UserMessageItem but ThreadItemConverter.attachmentToMessageContent was not implemented",
    );
  }

  tagToMessageContent(_tag: UserMessageTagContent): AgentMessageContentPart | Promise<AgentMessageContentPart> {
    throw new Error(
      "A Tag was included in a UserMessageItem but ThreadItemConverter.tagToMessageContent was not implemented",
    );
  }

  generatedImageToInput(_item: GeneratedImageItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  hiddenContextToInput(_item: HiddenContextItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  sdkHiddenContextToInput(_item: SDKHiddenContextItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  taskToInput(_item: TaskItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  workflowToInput(_item: WorkflowItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  widgetToInput(_item: WidgetItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  structuredInputToInput(_item: StructuredInputItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  async userMessageToInput(item: UserMessageItem, _isLastMessage = true): Promise<MaybeInput> {
    const content: AgentMessageContentPart[] = [];
    for (const part of item.content) {
      if (part.type === "input_text") {
        content.push({ type: "input_text", text: part.text });
      } else {
        content.push({ type: "input_text", text: `@${part.text}` });
      }
    }
    return userInputMessage(content);
  }

  assistantMessageToInput(_item: AssistantMessageItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  clientToolCallToInput(_item: ClientToolCallItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  endOfTurnToInput(_item: EndOfTurnItem): MaybeInput | Promise<MaybeInput> {
    return null;
  }

  async toAgentInput(threadItems: ThreadItem | readonly ThreadItem[]): Promise<AgentInputItem[]> {
    const items = Array.isArray(threadItems) ? [...threadItems] : [threadItems];
    const output: AgentInputItem[] = [];

    for (const [index, item] of items.entries()) {
      switch (item.type) {
        case "user_message":
          output.push(...normalizeInput(await this.userMessageToInput(item, index === items.length - 1)));
          break;
        default:
          break;
      }
    }

    return output;
  }
}

const defaultThreadItemConverter = new ThreadItemConverter();

export function simpleToAgentInput(threadItems: ThreadItem | readonly ThreadItem[]): Promise<AgentInputItem[]> {
  return defaultThreadItemConverter.toAgentInput(threadItems);
}
```

Update `src/agents/index.ts`:

```ts
export { ResponseStreamConverter, defaultResponseStreamConverter } from "./annotations";
export type { ResponseStreamConverterOptions } from "./annotations";
export { ThreadItemConverter, simpleToAgentInput } from "./converter";
export type {
  AgentMessageContentPart,
  AgentUserMessageItem,
  AssistantMessageItem,
  ClientToolCallItem,
  EndOfTurnItem,
  GeneratedImageItem,
  HiddenContextItem,
  SDKHiddenContextItem,
  StructuredInputItem,
  TaskItem,
  UserMessageItem,
  UserMessageTagContent,
  WidgetItem,
  WorkflowItem,
} from "./converter";
export { AgentContext, ClientToolCall } from "./context";
export { streamAgentResponse } from "./stream";
export type { AgentContextOptions, AgentStreamInput, StreamAgentResponseOptions } from "./types";
```

- [ ] **Step 4: Verify Task 1 passes**

Run:

```bash
bun test tests/agents-converter.test.ts tests/exports.test.ts
bun run typecheck
```

Expected: PASS for the new scaffold tests and export test.

## Task 2: User, Assistant, And Widget Conversion

**Files:**
- Modify: `tests/agents-converter.test.ts`
- Modify: `src/agents/converter.ts`

- [ ] **Step 1: Add failing core conversion tests**

Extend `tests/agents-converter.test.ts` imports:

```ts
import { Card, Text, serializeWidget } from "../src";
```

Add these tests inside `describe("ThreadItemConverter", () => { ... })`:

```ts
  test("quotes only the last user message", async () => {
    const input = await simpleToAgentInput([
      userMessage({ id: "msg_1", content: [{ type: "input_text", text: "Hello!" }], quoted_text: "Hi!" }),
      userMessage({
        id: "msg_2",
        content: [{ type: "input_text", text: "I'm well, thank you!" }],
        quoted_text: "How are you doing?",
      }),
    ]);

    expect(input).toEqual([
      { type: "message", role: "user", content: [{ type: "input_text", text: "Hello!" }] },
      { type: "message", role: "user", content: [{ type: "input_text", text: "I'm well, thank you!" }] },
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "The user is referring to this in particular: \nHow are you doing?",
          },
        ],
      },
    ]);
  });

  test("converts mixed user assistant and widget items", async () => {
    const input = await simpleToAgentInput([
      userMessage({ id: "msg_1", content: [{ type: "input_text", text: "Hello!" }] }),
      {
        id: "asst_1",
        thread_id: threadId,
        created_at: now,
        type: "assistant_message",
        content: [{ type: "output_text", text: "How are you doing?", annotations: [] }],
      },
      {
        id: "wd_123",
        thread_id: threadId,
        created_at: now,
        type: "widget",
        widget: serializeWidget(Card({ children: [Text({ value: "Hello, world!" })] })),
      },
    ]);

    expect(input[0]).toEqual({
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "Hello!" }],
    });
    expect(input[1]).toEqual({
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: "How are you doing?" }],
    });
    expect(input[2]).toMatchObject({ type: "message", role: "user" });
    expect(JSON.stringify(input[2])).toContain(
      "The following graphical UI widget (id: wd_123) was displayed to the user:",
    );
    expect(JSON.stringify(input[2])).toContain("Hello, world!");
    expect(JSON.stringify(input[2])).not.toContain("created_at");
  });
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents-converter.test.ts
```

Expected: FAIL because assistant, widget, and quoted text conversion are incomplete.

- [ ] **Step 3: Implement core conversions**

In `src/agents/converter.ts`, add this import:

```ts
import { serializeWidget } from "../widgets";
```

Replace `userMessageToInput`, `assistantMessageToInput`, and `widgetToInput` with:

```ts
  async widgetToInput(item: WidgetItem): Promise<MaybeInput> {
    const widget = serializeWidget(item.widget as Parameters<typeof serializeWidget>[0]);
    return userInputMessage([
      {
        type: "input_text",
        text: `The following graphical UI widget (id: ${item.id}) was displayed to the user:${JSON.stringify(widget)}`,
      },
    ]);
  }

  async userMessageToInput(item: UserMessageItem, isLastMessage = true): Promise<MaybeInput> {
    const messageTextParts: string[] = [];
    const tagParts: UserMessageTagContent[] = [];

    for (const part of item.content) {
      if (part.type === "input_text") {
        messageTextParts.push(part.text);
      } else {
        messageTextParts.push(`@${part.text}`);
        tagParts.push(part);
      }
    }

    const userMessage = userInputMessage([
      { type: "input_text", text: messageTextParts.join("") },
      ...(await Promise.all(item.attachments.map((attachment) => this.attachmentToMessageContent(attachment)))),
    ]);
    const contextMessages: AgentInputItem[] = [];

    if (item.quoted_text && isLastMessage) {
      contextMessages.push(
        userInputMessage([
          {
            type: "input_text",
            text: `The user is referring to this in particular: \n${item.quoted_text}`,
          },
        ]),
      );
    }

    if (tagParts.length > 0) {
      const seen = new Set<string>();
      const uniqueTags = tagParts.filter((tag) => {
        if (seen.has(tag.text)) {
          return false;
        }
        seen.add(tag.text);
        return true;
      });
      const tagContent = await Promise.all(uniqueTags.map((tag) => this.tagToMessageContent(tag)));
      contextMessages.push(
        userInputMessage([
          {
            type: "input_text",
            text:
              "# User-provided context for @-mentions\n" +
              "- When referencing resolved entities, use their canonical names **without** '@'.\n" +
              "- The '@' form appears only in user text and should not be echoed.",
          },
          ...tagContent,
        ]),
      );
    }

    return [userMessage, ...contextMessages];
  }

  assistantMessageToInput(item: AssistantMessageItem): MaybeInput {
    return {
      type: "message",
      role: "assistant",
      status: "completed",
      content: item.content.map((content) => ({ type: "output_text", text: content.text })),
    };
  }
```

Extend the `toAgentInput(...)` switch:

```ts
        case "assistant_message":
          output.push(...normalizeInput(await this.assistantMessageToInput(item)));
          break;
        case "widget":
          output.push(...normalizeInput(await this.widgetToInput(item)));
          break;
```

- [ ] **Step 4: Verify Task 2 passes**

Run:

```bash
bun test tests/agents-converter.test.ts
bun run typecheck
```

Expected: PASS for the core conversion tests.

## Task 3: Tags, Hidden Context, And Generated Images

**Files:**
- Modify: `tests/agents-converter.test.ts`
- Modify: `src/agents/converter.ts`

- [ ] **Step 1: Add failing hook and media tests**

Add these tests:

```ts
  test("converts tags through an override and dedupes by text", async () => {
    class CustomConverter extends ThreadItemConverter {
      override tagToMessageContent(tag: UserMessageTagContent) {
        return { type: "input_text", text: `${tag.text} ${String(tag.data.key)}` };
      }
    }

    const input = await new CustomConverter().toAgentInput(
      userMessage({
        content: [
          { type: "input_tag", id: "tag_1", text: "Hello!", data: { key: "value" } },
          { type: "input_tag", id: "tag_2", text: "Hello!", data: { key: "ignored" } },
        ],
      }),
    );

    expect(input).toEqual([
      { type: "message", role: "user", content: [{ type: "input_text", text: "@Hello!@Hello!" }] },
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "# User-provided context for @-mentions\n" +
              "- When referencing resolved entities, use their canonical names **without** '@'.\n" +
              "- The '@' form appears only in user text and should not be echoed.",
          },
          { type: "input_text", text: "Hello! value" },
        ],
      },
    ]);
  });

  test("throws for tags by default", async () => {
    await expect(
      simpleToAgentInput(
        userMessage({ content: [{ type: "input_tag", id: "tag_1", text: "Hello!", data: {} }] }),
      ),
    ).rejects.toThrow("ThreadItemConverter.tagToMessageContent");
  });

  test("converts generated images with URLs and skips missing images", async () => {
    await expect(
      simpleToAgentInput([
        { id: "img_missing", thread_id: threadId, created_at: now, type: "generated_image", image: null },
        {
          id: "img_item_1",
          thread_id: threadId,
          created_at: now,
          type: "generated_image",
          image: { id: "img_1", url: "https://example.com/img.png" },
        },
      ]),
    ).resolves.toEqual([
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "The following image was generated by the agent." },
          { type: "input_image", image: "https://example.com/img.png", detail: "auto" },
        ],
      },
    ]);
  });

  test("converts string hidden context and rejects non-string hidden context by default", async () => {
    await expect(
      simpleToAgentInput({
        id: "hidden_1",
        thread_id: threadId,
        created_at: now,
        type: "hidden_context_item",
        content: "User pressed the red button",
      }),
    ).resolves.toEqual([
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Hidden context for the agent (not shown to the user):\n" +
              "<HiddenContext>\nUser pressed the red button\n</HiddenContext>",
          },
        ],
      },
    ]);

    await expect(
      simpleToAgentInput({
        id: "hidden_2",
        thread_id: threadId,
        created_at: now,
        type: "hidden_context_item",
        content: { harry: "potter" },
      }),
    ).rejects.toThrow("non-string content");
  });
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents-converter.test.ts
```

Expected: FAIL because generated-image and hidden-context conversion are incomplete.

- [ ] **Step 3: Implement hook and media conversions**

In `src/agents/converter.ts`, replace `generatedImageToInput`, `hiddenContextToInput`, and `sdkHiddenContextToInput`:

```ts
  generatedImageToInput(item: GeneratedImageItem): MaybeInput {
    if (!item.image) {
      return null;
    }
    return userInputMessage([
      { type: "input_text", text: "The following image was generated by the agent." },
      { type: "input_image", image: item.image.url, detail: "auto" },
    ]);
  }

  hiddenContextToInput(item: HiddenContextItem): MaybeInput {
    if (typeof item.content !== "string") {
      throw new Error(
        "HiddenContextItems with non-string content were present but ThreadItemConverter.hiddenContextToInput was not implemented for non-string content",
      );
    }
    return this.sdkHiddenContextToInput({ ...item, type: "sdk_hidden_context", content: item.content });
  }

  sdkHiddenContextToInput(item: SDKHiddenContextItem): MaybeInput {
    return userInputMessage([
      {
        type: "input_text",
        text:
          "Hidden context for the agent (not shown to the user):\n" +
          `<HiddenContext>\n${item.content}\n</HiddenContext>`,
      },
    ]);
  }
```

Extend the `toAgentInput(...)` switch:

```ts
        case "generated_image":
          output.push(...normalizeInput(await this.generatedImageToInput(item)));
          break;
        case "hidden_context_item":
          output.push(...normalizeInput(await this.hiddenContextToInput(item)));
          break;
        case "sdk_hidden_context":
          output.push(...normalizeInput(await this.sdkHiddenContextToInput(item)));
          break;
```

- [ ] **Step 4: Verify Task 3 passes**

Run:

```bash
bun test tests/agents-converter.test.ts
bun run typecheck
```

Expected: PASS for hook, hidden context, and generated image tests.

## Task 4: Tool Calls, Tasks, Workflows, Structured Input, And Usage Pattern

**Files:**
- Modify: `tests/agents-converter.test.ts`
- Modify: `src/agents/converter.ts`

- [ ] **Step 1: Add failing remaining conversion tests**

Add these tests:

```ts
  test("converts completed client tool calls and skips pending calls", async () => {
    const input = await simpleToAgentInput([
      {
        id: "ctc_pending",
        thread_id: threadId,
        created_at: now,
        type: "client_tool_call",
        status: "pending",
        name: "xyz",
        arguments: { foo: "bar" },
        call_id: "call_1",
      },
      {
        id: "ctc_done",
        thread_id: threadId,
        created_at: now,
        type: "client_tool_call",
        status: "completed",
        name: "xyz",
        arguments: { foo: "bar" },
        call_id: "call_1",
        output: { success: true },
      },
    ]);

    expect(input).toEqual([
      { type: "function_call", name: "xyz", callId: "call_1", arguments: JSON.stringify({ foo: "bar" }) },
      {
        type: "function_call_result",
        name: "xyz",
        callId: "call_1",
        status: "completed",
        output: JSON.stringify({ success: true }),
      },
    ]);
  });

  test("converts custom tasks and workflows", async () => {
    const input = await simpleToAgentInput([
      {
        id: "task_1",
        thread_id: threadId,
        created_at: now,
        type: "task",
        task: { type: "custom", title: "Called xyz", status_indicator: "complete" },
      },
      {
        id: "workflow_1",
        thread_id: threadId,
        created_at: now,
        type: "workflow",
        workflow: {
          type: "custom",
          expanded: false,
          tasks: [
            { type: "custom", title: "Gather", content: "Context", status_indicator: "complete" },
            { type: "thought", title: "Reasoning", content: "Private", status_indicator: "complete" },
          ],
        },
      },
    ]);

    expect(input).toEqual([
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "A message was displayed to the user that the following task was performed:\n<Task>\nCalled xyz\n</Task>",
          },
        ],
      },
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "A message was displayed to the user that the following task was performed:\n<Task>\nGather: Context\n</Task>",
          },
        ],
      },
    ]);
  });

  test("converts structured input answers", async () => {
    await expect(
      simpleToAgentInput({
        id: "si_1",
        thread_id: threadId,
        created_at: now,
        type: "structured_input",
        status: "answered",
        inputs: [
          {
            id: "subject",
            type: "multiple_choice",
            question: "Which subject is this lesson for?",
            options: [{ value: "Math" }, { value: "Science" }],
            multiple: false,
            answer: { values: ["Math"], skipped: false },
          },
          {
            id: "details",
            type: "freeform",
            question: "Anything else to know?",
            answer: { values: [], skipped: true },
          },
          {
            id: "missing",
            type: "freeform",
            question: "Missing answer?",
          },
        ],
      }),
    ).resolves.toEqual([
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "A structured input request was displayed to the user with the following status: answered\n" +
              "<StructuredInput>\n" +
              "- Which subject is this lesson for?: Math\n" +
              "- Anything else to know?: skipped\n" +
              "- Missing answer?: unanswered\n" +
              "</StructuredInput>",
          },
        ],
      },
    ]);
  });

  test("shows the resumed-turn usage pattern without calling OpenAI", async () => {
    const storedItems = [
      userMessage({ id: "msg_1", content: [{ type: "input_text", text: "Use the previous result" }] }),
      {
        id: "ctc_done",
        thread_id: threadId,
        created_at: now,
        type: "client_tool_call",
        status: "completed",
        name: "get_selection",
        arguments: {},
        call_id: "call_selection",
        output: { selected: "paragraph" },
      } satisfies ThreadItem,
    ];
    const fakeStore = {
      async loadThreadItems() {
        return { data: storedItems, has_more: false, after: null };
      },
    };
    async function fakeRun(input: Awaited<ReturnType<typeof simpleToAgentInput>>) {
      return input;
    }

    const page = await fakeStore.loadThreadItems();
    const input = await simpleToAgentInput(page.data);
    await expect(fakeRun(input)).resolves.toEqual(input);
    expect(input.map((item) => item.type)).toEqual(["message", "function_call", "function_call_result"]);
  });
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
bun test tests/agents-converter.test.ts
```

Expected: FAIL because tool-call, task, workflow, and structured input conversion are incomplete.

- [ ] **Step 3: Implement the remaining converters**

In `src/agents/converter.ts`, add these helpers near `userInputMessage(...)`:

```ts
function customTaskText(task: Extract<TaskItem["task"], { type: "custom" }>): string | null {
  const title = task.title ?? "";
  const content = task.content ?? "";
  if (!title && !content) {
    return null;
  }
  return title && content ? `${title}: ${content}` : title || content;
}

function taskMessage(text: string): AgentInputItem {
  return userInputMessage([
    {
      type: "input_text",
      text: `A message was displayed to the user that the following task was performed:\n<Task>\n${text}\n</Task>`,
    },
  ]);
}
```

Replace the remaining converter methods:

```ts
  structuredInputToInput(item: StructuredInputItem): MaybeInput {
    const lines = item.inputs.map((input) => {
      if (!input.answer) {
        return `- ${input.question}: unanswered`;
      }
      if (input.answer.skipped) {
        return `- ${input.question}: skipped`;
      }
      return `- ${input.question}: ${input.answer.values.join(", ")}`;
    });

    return userInputMessage([
      {
        type: "input_text",
        text:
          `A structured input request was displayed to the user with the following status: ${item.status}\n` +
          "<StructuredInput>\n" +
          lines.join("\n") +
          "\n</StructuredInput>",
      },
    ]);
  }

  taskToInput(item: TaskItem): MaybeInput {
    if (item.task.type !== "custom") {
      return null;
    }
    const text = customTaskText(item.task);
    return text ? taskMessage(text) : null;
  }

  workflowToInput(item: WorkflowItem): MaybeInput {
    return item.workflow.tasks.flatMap((task) => {
      if (task.type !== "custom") {
        return [];
      }
      const text = customTaskText(task);
      return text ? [taskMessage(text)] : [];
    });
  }

  clientToolCallToInput(item: ClientToolCallItem): MaybeInput {
    if (item.status === "pending") {
      return null;
    }
    return [
      {
        type: "function_call",
        name: item.name,
        callId: item.call_id,
        arguments: JSON.stringify(item.arguments),
      },
      {
        type: "function_call_result",
        name: item.name,
        callId: item.call_id,
        status: "completed",
        output: JSON.stringify(item.output ?? null),
      },
    ];
  }

  endOfTurnToInput(_item: EndOfTurnItem): MaybeInput {
    return null;
  }
```

Extend the `toAgentInput(...)` switch with every remaining `ThreadItem` type:

```ts
        case "client_tool_call":
          output.push(...normalizeInput(await this.clientToolCallToInput(item)));
          break;
        case "structured_input":
          output.push(...normalizeInput(await this.structuredInputToInput(item)));
          break;
        case "task":
          output.push(...normalizeInput(await this.taskToInput(item)));
          break;
        case "workflow":
          output.push(...normalizeInput(await this.workflowToInput(item)));
          break;
        case "end_of_turn":
          output.push(...normalizeInput(await this.endOfTurnToInput(item)));
          break;
```

- [ ] **Step 4: Run final verification for the converter slice**

Run:

```bash
bun test tests/agents-converter.test.ts tests/exports.test.ts
bun run typecheck
bun run verify
git status --short --branch
```

Expected:

- Converter tests pass.
- Export tests pass.
- TypeScript typecheck passes.
- Full verification passes.
- Working tree changes are limited to the spec, this plan, converter module, agents exports, converter tests, and export tests.

## Final Verification

After all tasks complete and reviews pass, run:

```bash
bun run verify
git status --short --branch
```

Expected:

- `bun run verify` passes.
- No unrelated files are modified.

## Implementation Notes

- Use Bun tooling only.
- Keep `ThreadItemConverter` independent from `AgentContext`, stores, and `streamAgentResponse(...)`.
- Use `AgentInputItem` from `@openai/agents`; do not return Python-style snake-case Responses API objects.
- Use `callId` and `function_call_result` for completed client tool call output.
- Do not replay assistant annotations because JavaScript Agents SDK `output_text` input parts contain text only.
- Throw by default for attachments, tags without an override, and non-string hidden context.
- Do not add server, schema, stream-output, guardrail rollback, or generated-image stream replay changes.
