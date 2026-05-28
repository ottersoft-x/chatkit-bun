import { describe, expect, test } from "bun:test";

import * as exports from "../src";
import {
  ActionConfigSchema,
  BaseStore,
  Card,
  ChatKitServer,
  NonStreamingResult,
  SQLiteStore,
  StreamingResult,
  ThreadMetadataSchema,
  WidgetTemplate,
  createActionConfig,
  createChatKitHandler,
  decodeJsonBytes,
  diffWidget,
  encodeJsonBytes,
  defaultGenerateId,
  streamWidget,
} from "../src";

describe("public exports", () => {
  test("exports foundation APIs", () => {
    expect(createActionConfig("x")).toMatchObject({ type: "x" });
    expect(ActionConfigSchema.parse({ type: "x" }).type).toBe("x");
    expect(ThreadMetadataSchema.parse({ id: "thr_1", created_at: "2026-05-26T00:00:00.000Z" }).id).toBe("thr_1");
    expect(defaultGenerateId("thread")).toMatch(/^thr_[0-9a-f]{8}$/);
    expect(typeof BaseStore).toBe("function");
    expect(typeof SQLiteStore).toBe("function");
    expect(ChatKitServer).toBeDefined();
    expect(typeof createChatKitHandler).toBe("function");
    expect(StreamingResult).toBeDefined();
    expect(NonStreamingResult).toBeDefined();
    expect(decodeJsonBytes(encodeJsonBytes({ ok: true }))).toEqual({ ok: true });
    expect(exports.StreamCancelledError).toBeDefined();
    expect(exports.ChatKitRequestSchema).toBeDefined();
    expect(exports.ThreadStreamEventSchema).toBeDefined();
    expect(typeof Card).toBe("function");
    expect(typeof WidgetTemplate).toBe("function");
    expect(typeof diffWidget).toBe("function");
    expect(typeof streamWidget).toBe("function");
  });
});
