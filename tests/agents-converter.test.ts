import { describe, expect, test } from "bun:test";

import {
  Card,
  Text,
  ThreadItemConverter,
  serializeWidget,
  simpleToAgentInput,
  type AssistantMessageItem,
  type ClientToolCallItem,
  type EndOfTurnItem,
  type GeneratedImageItem,
  type HiddenContextItem,
  type SDKHiddenContextItem,
  type StructuredInputItem,
  type TaskItem,
  type ThreadItem,
  type UserMessageTagContent,
  type WorkflowItem,
} from "../src";

const now = "2026-05-28T00:00:00.000Z";
const threadId = "thr_1";

function userMessage(
  overrides: Partial<Extract<ThreadItem, { type: "user_message" }>> = {},
): Extract<ThreadItem, { type: "user_message" }> {
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

  test("allows async converter hook overrides", async () => {
    class AsyncOverrideConverter extends ThreadItemConverter {
      override async generatedImageToInput(_item: GeneratedImageItem) {
        return null;
      }

      override async hiddenContextToInput(_item: HiddenContextItem) {
        return null;
      }

      override async sdkHiddenContextToInput(_item: SDKHiddenContextItem) {
        return null;
      }

      override async taskToInput(_item: TaskItem) {
        return null;
      }

      override async workflowToInput(_item: WorkflowItem) {
        return null;
      }

      override async structuredInputToInput(_item: StructuredInputItem) {
        return null;
      }

      override async assistantMessageToInput(_item: AssistantMessageItem) {
        return null;
      }

      override async clientToolCallToInput(_item: ClientToolCallItem) {
        return null;
      }

      override async endOfTurnToInput(_item: EndOfTurnItem) {
        return null;
      }
    }

    await expect(
      new AsyncOverrideConverter().toAgentInput({
        id: "ctc_done",
        thread_id: threadId,
        created_at: now,
        type: "client_tool_call",
        status: "completed",
        name: "get_selection",
        arguments: {},
        call_id: "call_selection",
        output: { selected: "paragraph" },
      }),
    ).resolves.toEqual([]);
  });

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

  test("converts tags through an override and dedupes by text", async () => {
    class CustomConverter extends ThreadItemConverter {
      override tagToMessageContent(tag: UserMessageTagContent) {
        return { type: "input_text" as const, text: `${tag.text} ${String(tag.data.key)}` };
      }
    }

    const input = await new CustomConverter().toAgentInput(
      userMessage({
        content: [
          { type: "input_tag", id: "tag_1", text: "Hello!", data: { key: "value" }, interactive: false },
          { type: "input_tag", id: "tag_2", text: "Hello!", data: { key: "ignored" }, interactive: false },
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
        userMessage({ content: [{ type: "input_tag", id: "tag_1", text: "Hello!", data: {}, interactive: false }] }),
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
    const loadCalls: Array<[threadId: string, after: string | null, limit: number, order: "asc" | "desc"]> = [];
    const fakeStore = {
      async loadThreadItems(threadId: string, after: string | null, limit: number, order: "asc" | "desc") {
        loadCalls.push([threadId, after, limit, order]);
        return { data: storedItems, has_more: false, after: null };
      },
    };
    async function fakeRun(input: Awaited<ReturnType<typeof simpleToAgentInput>>) {
      return input;
    }

    const page = await fakeStore.loadThreadItems(threadId, null, 20, "asc");
    const input = await simpleToAgentInput(page.data);
    await expect(fakeRun(input)).resolves.toEqual(input);
    expect(loadCalls).toEqual([[threadId, null, 20, "asc"]]);
    expect(input.map((item) => item.type)).toEqual(["message", "function_call", "function_call_result"]);
  });
});
