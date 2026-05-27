import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  AttachmentSchema,
  PageSchema,
  ThreadItemSchema,
  ThreadMetadataSchema,
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

  test("parses known thread items and preserves unknown widget fields", () => {
    const item = ThreadItemSchema.parse({
      id: "widget_1",
      type: "widget",
      thread_id: "thr_1",
      created_at: "2026-05-26T00:00:00.000Z",
      widget: { type: "Card", children: [] },
    });
    expect(item.type).toBe("widget");
    expect(item.widget).toEqual({ type: "Card", children: [] });
  });
});
