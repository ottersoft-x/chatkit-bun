import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  AssistantMessageContentSchema,
  AttachmentSchema,
  PageSchema,
  ThreadItemSchema,
  ThreadMetadataSchema,
  UserMessageContentSchema,
} from "../src/types/core";

describe("core schemas", () => {
  test("parses paginated data", () => {
    const PageOfStrings = PageSchema(z.string());
    expect(PageOfStrings.parse({ data: ["a"], has_more: true, after: "a" })).toEqual({
      data: ["a"],
      has_more: true,
      after: "a",
    });
  });

  test("defaults thread status and metadata", () => {
    const thread = ThreadMetadataSchema.parse({
      id: "thr_1",
      created_at: "2026-05-26T00:00:00.000Z",
    });
    expect(thread.status).toEqual({ type: "active" });
    expect(thread.metadata).toEqual({});
  });

  test("parses file and image attachments", () => {
    expect(
      AttachmentSchema.parse({
        id: "file_1",
        type: "file",
        mime_type: "text/plain",
        name: "notes.txt",
      }).type,
    ).toBe("file");
    expect(
      AttachmentSchema.parse({
        id: "image_1",
        type: "image",
        mime_type: "image/png",
        name: "image.png",
        preview_url: "https://example.com/image.png",
      }).type,
    ).toBe("image");
  });

  test("allows attachment metadata to be null without applying defaults", () => {
    const withNullMetadata = AttachmentSchema.parse({
      id: "file_1",
      type: "file",
      mime_type: "text/plain",
      name: "notes.txt",
      metadata: null,
    });
    expect(withNullMetadata.metadata).toBeNull();

    const omittedMetadata = AttachmentSchema.parse({
      id: "file_2",
      type: "file",
      mime_type: "text/plain",
      name: "notes.txt",
    });
    expect("metadata" in omittedMetadata).toBe(false);
  });

  test("allows attachment upload descriptors to be null", () => {
    const attachment = AttachmentSchema.parse({
      id: "file_1",
      type: "file",
      mime_type: "text/plain",
      name: "notes.txt",
      upload_descriptor: null,
    });
    expect(attachment.upload_descriptor).toBeNull();
  });

  test("preserves attachment thread ids when present", () => {
    const attachment = AttachmentSchema.parse({
      id: "file_1",
      type: "file",
      mime_type: "text/plain",
      name: "notes.txt",
      thread_id: "thr_1",
    });
    expect(attachment.thread_id).toBe("thr_1");
  });

  test("requires image attachment preview urls", () => {
    expect(() =>
      AttachmentSchema.parse({
        id: "image_1",
        type: "image",
        mime_type: "image/png",
        name: "image.png",
      }),
    ).toThrow();
  });

  test("restricts upload descriptor methods to POST and PUT", () => {
    expect(() =>
      AttachmentSchema.parse({
        id: "file_1",
        type: "file",
        mime_type: "text/plain",
        name: "notes.txt",
        upload_descriptor: {
          url: "https://example.com/upload",
          method: "DELETE",
        },
      }),
    ).toThrow();
  });

  test("parses known widget thread items", () => {
    const item = ThreadItemSchema.parse({
      id: "widget_1",
      type: "widget",
      thread_id: "thr_1",
      created_at: "2026-05-26T00:00:00.000Z",
      widget: { type: "Card", children: [] },
    });
    if (item.type !== "widget") {
      throw new Error(`Expected widget item, got ${item.type}`);
    }
    expect(item.widget).toEqual({ type: "Card", children: [] });
  });

  test("parses user and assistant message content", () => {
    const user = UserMessageContentSchema.parse({ type: "input_text", text: "Hello" });
    expect(user).toEqual({ type: "input_text", text: "Hello" });

    const assistant = AssistantMessageContentSchema.parse({
      type: "output_text",
      text: "Hi",
      annotations: [],
    });
    expect(assistant.text).toBe("Hi");
  });

  test("preserves arbitrary user message inference options", () => {
    const inference_options = {
      model: "gpt-4.1",
      temperature: 0.2,
      metadata: { trace_id: "trace_1" },
      runtime: "server",
    };

    const item = ThreadItemSchema.parse({
      id: "msg_1",
      type: "user_message",
      thread_id: "thr_1",
      created_at: "2026-05-27T00:00:00.000Z",
      content: [{ type: "input_text", text: "Hello" }],
      inference_options,
    });

    if (item.type !== "user_message") {
      throw new Error(`Expected user_message item, got ${item.type}`);
    }
    expect(item.inference_options).toEqual(inference_options);
  });

  test("parses structured input, generated image, task, and workflow items", () => {
    const created_at = "2026-05-27T00:00:00.000Z";
    expect(
      ThreadItemSchema.parse({
        id: "si_1",
        type: "structured_input",
        thread_id: "thr_1",
        created_at,
        status: "pending",
        inputs: [
          {
            id: "subject",
            type: "multiple_choice",
            question: "Subject?",
            options: [{ value: "Math" }],
            multiple: false,
          },
        ],
      }).type,
    ).toBe("structured_input");

    expect(
      ThreadItemSchema.parse({
        id: "img_1",
        type: "generated_image",
        thread_id: "thr_1",
        created_at,
        image: { id: "image", url: "https://example.com/image.png" },
      }).type,
    ).toBe("generated_image");

    expect(
      ThreadItemSchema.parse({
        id: "task_1",
        type: "task",
        thread_id: "thr_1",
        created_at,
        task: { type: "custom", title: "Step", content: "Working", status_indicator: "loading" },
      }).type,
    ).toBe("task");

    expect(
      ThreadItemSchema.parse({
        id: "wf_1",
        type: "workflow",
        thread_id: "thr_1",
        created_at,
        workflow: { type: "custom", tasks: [], expanded: false },
      }).type,
    ).toBe("workflow");
  });
});
