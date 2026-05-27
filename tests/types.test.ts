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
});
