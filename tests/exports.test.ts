import { describe, expect, test } from "bun:test";

import * as exports from "../src";
import {
  ActionConfigSchema,
  SQLiteStore,
  ThreadMetadataSchema,
  createActionConfig,
  defaultGenerateId,
} from "../src";

describe("public exports", () => {
  test("exports foundation APIs", () => {
    expect(createActionConfig("x")).toMatchObject({ type: "x" });
    expect(ActionConfigSchema.parse({ type: "x" }).type).toBe("x");
    expect(ThreadMetadataSchema.parse({ id: "thr_1", created_at: "2026-05-26T00:00:00.000Z" }).id).toBe("thr_1");
    expect(defaultGenerateId("thread")).toMatch(/^thr_[0-9a-f]{8}$/);
    expect(typeof SQLiteStore).toBe("function");
    expect(exports.ChatKitServer).toBeDefined();
    expect(exports.StreamingResult).toBeDefined();
    expect(exports.NonStreamingResult).toBeDefined();
    expect(exports.StreamCancelledError).toBeDefined();
    expect(exports.ChatKitRequestSchema).toBeDefined();
    expect(exports.ThreadStreamEventSchema).toBeDefined();
  });
});
