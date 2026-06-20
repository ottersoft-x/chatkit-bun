import { describe, test } from "node:test";

import { expect } from "./helpers/expect.js";

import {
  ChatKitRequestSchema,
  SyncCustomActionResponseSchema,
  ThreadStreamEventSchema,
  isStreamingRequest,
} from "../src/types/server.js";

describe("server request schemas", () => {
  test("classifies streaming and non-streaming request types", () => {
    const streaming = ChatKitRequestSchema.parse({
      type: "threads.create",
      params: {
        input: {
          content: [{ type: "input_text", text: "Hello" }],
          attachments: [],
          inference_options: {},
        },
      },
      metadata: {},
    });
    expect(isStreamingRequest(streaming)).toBe(true);

    const nonStreaming = ChatKitRequestSchema.parse({
      type: "threads.list",
      params: { limit: 20, order: "desc", after: null },
      metadata: {},
    });
    expect(isStreamingRequest(nonStreaming)).toBe(false);
  });

  test("parses thread stream events and item updates", () => {
    const event = ThreadStreamEventSchema.parse({
      type: "thread.item.updated",
      item_id: "msg_1",
      update: {
        type: "assistant_message.content_part.text_delta",
        content_index: 0,
        delta: "Hello",
      },
    });
    expect(event.type).toBe("thread.item.updated");
  });

  test("rejects unknown request types", () => {
    expect(() => ChatKitRequestSchema.parse({ type: "missing", params: {} })).toThrow();
  });

  test("parses server request wire names used by ChatKit clients", () => {
    expect(
      ChatKitRequestSchema.parse({
        type: "threads.add_client_tool_output",
        params: { thread_id: "thr_1", result: { ok: true } },
        metadata: {},
      }).params,
    ).toEqual({ thread_id: "thr_1", result: { ok: true } });

    expect(
      ChatKitRequestSchema.parse({
        type: "threads.add_structured_input",
        params: {
          thread_id: "thr_1",
          item_id: "item_1",
          input: { status: "skipped", answers: {} },
        },
        metadata: {},
      }).params,
    ).toEqual({
      thread_id: "thr_1",
      item_id: "item_1",
      input: { status: "skipped", answers: {} },
    });

    expect(
      ChatKitRequestSchema.parse({
        type: "items.feedback",
        params: { thread_id: "thr_1", item_ids: ["item_1"], kind: "positive" },
        metadata: {},
      }).params,
    ).toEqual({ thread_id: "thr_1", item_ids: ["item_1"], kind: "positive" });

    expect(
      ChatKitRequestSchema.parse({
        type: "input.transcribe",
        params: { audio_base64: "SGVsbG8=", mime_type: "audio/wav" },
        metadata: {},
      }).params,
    ).toEqual({ audio_base64: "SGVsbG8=", mime_type: "audio/wav" });
  });

  test("parses stream event wire names used by ChatKit clients", () => {
    expect(
      ThreadStreamEventSchema.parse({
        type: "stream_options",
        stream_options: { allow_cancel: true },
      }),
    ).toEqual({ type: "stream_options", stream_options: { allow_cancel: true } });

    expect(
      ThreadStreamEventSchema.parse({
        type: "error",
        code: "stream.error",
        allow_retry: true,
      }),
    ).toEqual({
      type: "error",
      code: "stream.error",
      allow_retry: true,
    });

    expect(() =>
      ThreadStreamEventSchema.parse({
        type: "error",
        code: "stream_error",
        allow_retry: true,
      }),
    ).toThrow();
  });

  test("parses attachment delete requests with attachment id only", () => {
    expect(
      ChatKitRequestSchema.parse({
        type: "attachments.delete",
        params: { attachment_id: "att_1" },
        metadata: {},
      }).params,
    ).toEqual({ attachment_id: "att_1" });

    expect(
      ChatKitRequestSchema.parse({
        type: "attachments.delete",
        params: { attachment_id: "att_1", thread_id: "thr_1" },
        metadata: {},
      }).params,
    ).toEqual({ attachment_id: "att_1" });
  });

  test("parses sync custom action response updated items", () => {
    const response = SyncCustomActionResponseSchema.parse({
      updated_item: {
        id: "widget_1",
        type: "widget",
        thread_id: "thr_1",
        created_at: "2026-05-27T00:00:00.000Z",
        widget: { type: "Card" },
      },
    });

    expect(response.updated_item?.id).toBe("widget_1");
  });

  test("rejects stream item updates missing required Python wire fields", () => {
    const parseUpdate = (update: unknown) =>
      ThreadStreamEventSchema.parse({
        type: "thread.item.updated",
        item_id: "item_1",
        update,
      });

    expect(() =>
      parseUpdate({
        type: "assistant_message.content_part.annotation_added",
        content_index: 0,
        annotation: {
          type: "annotation",
          source: { type: "url", title: "Docs", url: "https://example.com" },
        },
      }),
    ).toThrow();

    expect(() =>
      parseUpdate({
        type: "assistant_message.content_part.done",
        content_index: 0,
      }),
    ).toThrow();

    expect(() =>
      parseUpdate({
        type: "widget.streaming_text.value_delta",
        component_id: "component_1",
        delta: "Hello",
      }),
    ).toThrow();

    expect(() =>
      parseUpdate({
        type: "widget.streaming_text.value_delta",
        delta: "Hello",
        done: false,
      }),
    ).toThrow();

    expect(() =>
      parseUpdate({
        type: "generated_image.updated",
        image: null,
      }),
    ).toThrow();
  });
});
