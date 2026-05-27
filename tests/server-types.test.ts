import { describe, expect, test } from "bun:test";

import {
  ChatKitRequestSchema,
  ThreadStreamEventSchema,
  isStreamingRequest,
} from "../src/types/server";

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
});
