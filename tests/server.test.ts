import { describe, expect, test } from "bun:test";

import { UnsupportedOperationError } from "../src/errors";
import { ChatKitServer, NonStreamingResult, StreamingResult } from "../src/server";
import { SQLiteStore } from "../src/sqlite-store";
import type { ThreadItem, ThreadMetadata } from "../src/types/core";
import type {
  AudioInput,
  FeedbackKind,
  ThreadStreamEvent,
  TranscriptionResult,
} from "../src/types/server";

interface RequestContext {
  user_id: string;
}

const defaultContext: RequestContext = { user_id: "user_1" };

type UserMessageItem = Extract<ThreadItem, { type: "user_message" }>;
type AssistantMessageItem = Extract<ThreadItem, { type: "assistant_message" }>;
type Responder = (
  thread: ThreadMetadata,
  inputUserMessage: UserMessageItem | null,
  context: RequestContext,
) => AsyncIterable<ThreadStreamEvent>;
type Transcriber = (
  audio: AudioInput,
  context: RequestContext,
) => Promise<TranscriptionResult>;

async function* emptyResponse(): AsyncIterable<ThreadStreamEvent> {}

function makeThread(id = "thr_test"): ThreadMetadata {
  return {
    id,
    created_at: "2026-05-27T00:00:00.000Z",
    status: { type: "active" },
    metadata: {},
  };
}

function makeAssistantMessage(contentText: string): AssistantMessageItem {
  return {
    id: "msg_test",
    type: "assistant_message",
    thread_id: "thr_test",
    created_at: "2026-05-27T00:00:01.000Z",
    content:
      contentText.length > 0
        ? [{ type: "output_text", text: contentText, annotations: [] }]
        : [],
  };
}

class TestServer extends ChatKitServer<RequestContext> {
  readonly feedbackCalls: Array<{
    threadId: string;
    itemIds: string[];
    kind: FeedbackKind;
    context: RequestContext;
  }> = [];

  constructor(
    private readonly responder: Responder = emptyResponse,
    private readonly transcriber?: Transcriber,
  ) {
    super(
      new SQLiteStore<RequestContext>({
        path: ":memory:",
        getUserId: (context) => context.user_id,
      }),
    );
  }

  override respond(
    thread: ThreadMetadata,
    inputUserMessage: UserMessageItem | null,
    context: RequestContext,
  ): AsyncIterable<ThreadStreamEvent> {
    return this.responder(thread, inputUserMessage, context);
  }

  override async addFeedback(
    threadId: string,
    itemIds: string[],
    kind: FeedbackKind,
    context: RequestContext,
  ): Promise<void> {
    this.feedbackCalls.push({ threadId, itemIds, kind, context });
  }

  override transcribe(
    audio: AudioInput,
    context: RequestContext,
  ): Promise<TranscriptionResult> {
    return this.transcriber?.(audio, context) ?? super.transcribe(audio, context);
  }
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
      events.push(JSON.parse(json) as ThreadStreamEvent);
    }
  }

  return events;
}

describe("ChatKitServer", () => {
  test("returns a non-streaming result for non-streaming requests", async () => {
    const server = new TestServer();

    const result = await server.process(
      JSON.stringify({ type: "threads.list", params: {}, metadata: {} }),
      defaultContext,
    );

    expect(result).toBeInstanceOf(NonStreamingResult);
  });

  test("returns a streaming result for streaming requests", async () => {
    const server = new TestServer();

    const result = await server.process(
      JSON.stringify({
        type: "threads.create",
        params: {
          input: {
            content: [{ type: "input_text", text: "Hello" }],
            attachments: [],
            inference_options: {},
          },
        },
        metadata: {},
      }),
      defaultContext,
    );

    expect(result).toBeInstanceOf(StreamingResult);
    expect(await decodeStream(result as StreamingResult)).toEqual([]);
  });

  test("rejects default transcription requests", async () => {
    const server = new TestServer();

    await expect(
      server.transcribe({ data: new Uint8Array(), mime_type: "audio/webm" }, defaultContext),
    ).rejects.toBeInstanceOf(UnsupportedOperationError);
  });

  test("records cancellation marker without pending assistant messages", async () => {
    const server = new TestServer();
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);

    await server.handleStreamCancelled(thread, [], defaultContext);

    const items = await server.store.loadThreadItems(thread.id, null, 10, "asc", defaultContext);
    expect(items.data.map((item) => item.type)).toEqual(["sdk_hidden_context"]);
  });

  test("records cancellation marker without saving empty pending assistant messages", async () => {
    const server = new TestServer();
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);

    await server.handleStreamCancelled(thread, [makeAssistantMessage("")], defaultContext);

    const items = await server.store.loadThreadItems(thread.id, null, 10, "asc", defaultContext);
    expect(items.data.some((item) => item.type === "assistant_message")).toBe(false);
    expect(items.data.some((item) => item.type === "sdk_hidden_context")).toBe(true);
  });
});
