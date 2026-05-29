import { describe, expect, test } from "bun:test";

import matrix from "../docs/parity/matrix.json";
import upstream from "../docs/parity/upstream.json";
import { AgentContext, streamAgentResponse } from "../src/agents";
import { createChatKitHandler } from "../src/http";
import { ChatKitServer, StreamingResult } from "../src/server";
import { SQLiteStore } from "../src/sqlite-store";
import type { ThreadItem, ThreadMetadata } from "../src/types/core";
import { ThreadStreamEventSchema, type ThreadStreamEvent } from "../src/types/server";

const validStatuses = new Set([
  "covered",
  "partial",
  "intentional-difference",
  "deferred",
  "not-applicable",
]);

const validAreas = new Set([
  "agents-output",
  "agents-input",
  "server",
  "widgets",
  "types",
  "http",
  "metadata",
]);

type ParityRow = {
  id?: unknown;
  area?: unknown;
  status?: unknown;
  upstream?: unknown;
  bun?: {
    tests?: string[];
    sources?: string[];
    docs?: string[];
  };
  notes?: unknown;
};

function expectString(value: unknown, label: string): asserts value is string {
  expect(typeof value, label).toBe("string");
  expect((value as string).length, label).toBeGreaterThan(0);
}

async function expectLocalFilesExist(rowId: string, paths: string[]): Promise<void> {
  for (const path of paths) {
    expect(await Bun.file(path).exists(), `${rowId} references missing local file ${path}`).toBe(true);
  }
}

interface RequestContext {
  userId: string;
}

const now = "2026-05-28T00:00:00.000Z";
const requestContext: RequestContext = { userId: "user_parity" };

type UserMessageItem = Extract<ThreadItem, { type: "user_message" }>;

function makeThread(id = "thr_parity"): ThreadMetadata {
  return {
    id,
    created_at: now,
    status: { type: "active" },
    metadata: {},
  };
}

function rawResponse(data: Record<string, unknown>): unknown {
  return { type: "raw_response_event", data };
}

async function* streamFrom(events: unknown[]): AsyncIterable<unknown> {
  for (const event of events) {
    yield event;
  }
}

function streamedRun(events: unknown[]): { toStream: () => AsyncIterable<unknown> } {
  return { toStream: () => streamFrom(events) };
}

async function decodeStream(result: StreamingResult): Promise<ThreadStreamEvent[]> {
  const decoder = new TextDecoder();
  const events: ThreadStreamEvent[] = [];

  for await (const chunk of result.jsonEvents) {
    for (const frame of decoder.decode(chunk).split("\n\n")) {
      if (!frame) {
        continue;
      }

      const json = frame.startsWith("data: ") ? frame.slice("data: ".length) : frame;
      events.push(ThreadStreamEventSchema.parse(JSON.parse(json)));
    }
  }

  return events;
}

function parseSseFrames(text: string): unknown[] {
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((frame) => {
      expect(frame.startsWith("data: ")).toBe(true);
      return JSON.parse(frame.slice("data: ".length));
    });
}

class AgentSmokeServer extends ChatKitServer<RequestContext> {
  constructor() {
    super(
      new SQLiteStore<RequestContext>({
        path: ":memory:",
        getUserId: (context) => context.userId,
      }),
    );
  }

  override respond(
    thread: ThreadMetadata,
    _inputUserMessage: UserMessageItem | null,
    context: RequestContext,
  ): AsyncIterable<ThreadStreamEvent> {
    return streamAgentResponse(
      new AgentContext({
        thread,
        store: this.store,
        context,
        now: () => now,
      }),
      streamedRun([
        rawResponse({
          type: "response.output_item.added",
          item: {
            type: "message",
            id: "msg_parity_agent",
            role: "assistant",
            content: [],
          },
        }),
        rawResponse({
          type: "response.content_part.added",
          item_id: "msg_parity_agent",
          content_index: 0,
          part: { type: "output_text", text: "" },
        }),
        rawResponse({
          type: "response.output_text.delta",
          item_id: "msg_parity_agent",
          content_index: 0,
          delta: "Hello!",
        }),
        rawResponse({
          type: "response.output_text.annotation.added",
          item_id: "msg_parity_agent",
          content_index: 0,
          annotation_index: 0,
          annotation: {
            type: "url_citation",
            url: "https://example.com/parity",
            title: "",
            end_index: 6,
          },
        }),
        rawResponse({
          type: "response.output_text.done",
          item_id: "msg_parity_agent",
          content_index: 0,
          text: "Hello!",
          annotations: [],
        }),
        rawResponse({
          type: "response.output_item.done",
          item: {
            type: "message",
            id: "msg_parity_agent",
            content: [{ type: "output_text", text: "Hello!", annotations: [] }],
          },
        }),
      ]),
    );
  }
}

describe("parity matrix", () => {
  test("matches the pinned upstream metadata", () => {
    expect(matrix.schemaVersion).toBe(1);
    expect(matrix.upstream).toEqual(upstream);
  });

  test("has valid, unique rows with useful references", async () => {
    expect(Array.isArray(matrix.rows)).toBe(true);
    expect(matrix.rows.length).toBeGreaterThan(8);

    const rowIds = new Set<string>();
    const ids = new Set<string>();
    for (const row of matrix.rows as ParityRow[]) {
      expectString(row.id, "row id");
      expect(row.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(ids.has(row.id), `duplicate parity row id ${row.id}`).toBe(false);
      ids.add(row.id);
      rowIds.add(row.id);

      expectString(row.area, `${row.id} area`);
      expect(validAreas.has(row.area), `${row.id} has unknown area ${row.area}`).toBe(true);

      expectString(row.status, `${row.id} status`);
      expect(validStatuses.has(row.status), `${row.id} has unknown status ${row.status}`).toBe(true);

      expect(row.upstream, `${row.id} upstream reference`).toBeTruthy();
      expect(row.bun, `${row.id} Bun reference`).toBeTruthy();
      expectString(row.notes, `${row.id} notes`);

      const localReferences = [
        ...(row.bun?.tests ?? []),
        ...(row.bun?.sources ?? []),
        ...(row.bun?.docs ?? []),
      ];
      if (row.status !== "deferred" && row.status !== "not-applicable") {
        expect(localReferences.length, `${row.id} should cite local coverage`).toBeGreaterThan(0);
      }
      await expectLocalFilesExist(row.id, localReferences);
    }

    expect(rowIds).toContain("agents-context-events");
  });

  test("tracks the known deferred full-parity gaps", () => {
    const deferredIds = new Set(
      (matrix.rows as ParityRow[])
        .filter((row) => row.status === "deferred")
        .map((row) => row.id),
    );

    expect(deferredIds).toContain("annotations-entity-sources");
    expect(deferredIds).toContain("annotations-input-replay");
    expect(deferredIds).toContain("attachments-content-conversion");
    expect(deferredIds).toContain("non-text-assistant-content");
  });
});

describe("ChatKit JS parity smoke", () => {
  test("preserves streamed Agents annotations through server persistence", async () => {
    const server = new AgentSmokeServer();
    const thread = makeThread();
    await server.store.saveThread(thread, requestContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.add_user_message",
        params: {
          thread_id: thread.id,
          input: {
            content: [{ type: "input_text", text: "Run parity smoke" }],
            attachments: [],
            inference_options: {},
          },
        },
        metadata: {},
      }),
      requestContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events.every((event) => ThreadStreamEventSchema.safeParse(event).success)).toBe(true);
    expect(events.map((event) => event.type)).toContain("thread.item.updated");
    expect(events.map((event) => event.type)).toContain("thread.item.done");

    await expect(server.store.loadItem(thread.id, "msg_parity_agent", requestContext)).resolves.toMatchObject({
      type: "assistant_message",
      content: [
        {
          type: "output_text",
          text: "Hello!",
          annotations: [
            {
              type: "annotation",
              source: {
                type: "url",
                url: "https://example.com/parity",
                title: "",
              },
              index: 6,
            },
          ],
        },
      ],
    });
  });

  test("emits parseable ChatKit SSE frames from the HTTP handler", async () => {
    const server = new AgentSmokeServer();
    const handler = createChatKitHandler(server, {
      getContext: () => requestContext,
    });

    const response = await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        body: JSON.stringify({
          type: "threads.create",
          params: {
            input: {
              content: [{ type: "input_text", text: "Create parity thread" }],
              attachments: [],
              inference_options: {},
            },
          },
          metadata: {},
        }),
      }),
    );

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    const frames = parseSseFrames(await response.text());
    const events = frames.map((frame) => ThreadStreamEventSchema.parse(frame));

    expect(events[0]?.type).toBe("thread.created");
    expect(events.some((event) => event.type === "thread.item.done")).toBe(true);
    expect(events.some((event) => event.type === "thread.item.updated")).toBe(true);
  });
});
