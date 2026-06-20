import { describe, test } from "node:test";

import { expect } from "./helpers/expect.js";

import * as exports from "../src/index.js";
import type { ResponseStreamConverterOptions, ThreadItemConverterResult } from "../src/index.js";
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
} from "../src/index.js";

function assertResponseStreamConverterOptions(_options: ResponseStreamConverterOptions): void {}
function assertThreadItemConverterResult(_result: ThreadItemConverterResult): void {}

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
    expect(typeof AgentContext).toBe("function");
    expect(typeof ClientToolCall).toBe("function");
    expect(typeof streamAgentResponse).toBe("function");
    expect(typeof ResponseStreamConverter).toBe("function");
    expect(defaultResponseStreamConverter).toBeInstanceOf(ResponseStreamConverter);
    expect(typeof ThreadItemConverter).toBe("function");
    expect(typeof simpleToAgentInput).toBe("function");
    assertResponseStreamConverterOptions({ partialImages: 3 });
    assertThreadItemConverterResult(null);
    assertThreadItemConverterResult(undefined);
    assertThreadItemConverterResult({ type: "message", role: "user", content: "Hello" });
    assertThreadItemConverterResult([{ type: "message", role: "assistant", status: "completed", content: [] }]);
  });
});
