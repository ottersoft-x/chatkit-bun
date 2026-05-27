import { describe, expect, test } from "bun:test";

import { NotFoundError, UnsupportedOperationError } from "../src/errors";
import { ChatKitServer, NonStreamingResult, StreamingResult } from "../src/server";
import { SQLiteStore } from "../src/sqlite-store";
import type { AttachmentStore } from "../src/store";
import type { Attachment, ThreadItem, ThreadMetadata } from "../src/types/core";
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

function makeUserMessage(id: string, threadId = "thr_test"): UserMessageItem {
  return {
    id,
    type: "user_message",
    thread_id: threadId,
    created_at: "2026-05-27T00:00:01.000Z",
    content: [{ type: "input_text", text: "Hello" }],
    attachments: [],
    inference_options: {},
  };
}

function decodeJson(result: NonStreamingResult): unknown {
  return JSON.parse(new TextDecoder().decode(result.json));
}

class TestAttachmentStore implements AttachmentStore<RequestContext> {
  created: Array<{ name: string; size: number; mime_type: string }> = [];
  deleted: string[] = [];

  async createAttachment(input: { name: string; size: number; mime_type: string }): Promise<any> {
    this.created.push(input);
    return {
      id: `atc_${this.created.length}`,
      type: input.mime_type.startsWith("image/") ? "image" : "file",
      name: input.name,
      mime_type: input.mime_type,
      ...(input.mime_type.startsWith("image/")
        ? { preview_url: "https://example.com/preview.png" }
        : {}),
      upload_descriptor: { url: "https://example.com/upload", method: "PUT", headers: {} },
      metadata: { source: "test" },
    };
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    this.deleted.push(attachmentId);
  }
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
    attachmentStore: AttachmentStore<RequestContext> | null = null,
  ) {
    super(
      new SQLiteStore<RequestContext>({
        path: ":memory:",
        getUserId: (context) => context.user_id,
      }),
      attachmentStore,
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

  test("lists threads as a paginated non-streaming page", async () => {
    const server = new TestServer();
    const first = makeThread("thr_first");
    const second = { ...makeThread("thr_second"), created_at: "2026-05-27T00:00:01.000Z" };
    await server.store.saveThread(first, defaultContext);
    await server.store.saveThread(second, defaultContext);

    const result = (await server.process(
      JSON.stringify({ type: "threads.list", params: { limit: 1, order: "asc" }, metadata: {} }),
      defaultContext,
    )) as NonStreamingResult;

    expect(decodeJson(result)).toEqual({
      data: [
        {
          id: first.id,
          created_at: first.created_at,
          status: first.status,
          items: { data: [], has_more: false, after: null },
        },
      ],
      has_more: true,
      after: first.id,
    });
  });

  test("lists thread items without hidden context items", async () => {
    const server = new TestServer();
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, makeUserMessage("msg_visible"), defaultContext);
    await server.store.addThreadItem(
      thread.id,
      {
        id: "msg_hidden",
        thread_id: thread.id,
        created_at: "2026-05-27T00:00:02.000Z",
        type: "hidden_context_item",
        content: { secret: true },
      },
      defaultContext,
    );
    await server.store.addThreadItem(
      thread.id,
      {
        id: "msg_sdk_hidden",
        thread_id: thread.id,
        created_at: "2026-05-27T00:00:03.000Z",
        type: "sdk_hidden_context",
        content: "internal",
      },
      defaultContext,
    );

    const result = (await server.process(
      JSON.stringify({
        type: "items.list",
        params: { thread_id: thread.id, limit: 10, order: "asc" },
        metadata: {},
      }),
      defaultContext,
    )) as NonStreamingResult;

    expect(decodeJson(result)).toMatchObject({
      data: [{ id: "msg_visible" }],
      has_more: false,
      after: null,
    });
  });

  test("gets a thread with its items page", async () => {
    const server = new TestServer();
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, makeUserMessage("msg_visible"), defaultContext);

    const result = (await server.process(
      JSON.stringify({ type: "threads.get_by_id", params: { thread_id: thread.id }, metadata: {} }),
      defaultContext,
    )) as NonStreamingResult;

    expect(decodeJson(result)).toEqual({
      id: thread.id,
      created_at: thread.created_at,
      status: thread.status,
      items: {
        data: [makeUserMessage("msg_visible")],
        has_more: false,
        after: null,
      },
    });
  });

  test("dispatches item feedback with context", async () => {
    const server = new TestServer();

    const result = (await server.process(
      JSON.stringify({
        type: "items.feedback",
        params: { thread_id: "thr_feedback", item_ids: ["msg_a", "msg_b"], kind: "positive" },
        metadata: {},
      }),
      defaultContext,
    )) as NonStreamingResult;

    expect(decodeJson(result)).toEqual({});
    expect(server.feedbackCalls).toEqual([
      {
        threadId: "thr_feedback",
        itemIds: ["msg_a", "msg_b"],
        kind: "positive",
        context: defaultContext,
      },
    ]);
  });

  test("updates a thread title", async () => {
    const server = new TestServer();
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);

    await server.process(
      JSON.stringify({
        type: "threads.update",
        params: { thread_id: thread.id, title: "Updated title" },
        metadata: {},
      }),
      defaultContext,
    );

    await expect(server.store.loadThread(thread.id, defaultContext)).resolves.toMatchObject({
      title: "Updated title",
    });
  });

  test("deletes a thread", async () => {
    const server = new TestServer();
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);

    await server.process(
      JSON.stringify({ type: "threads.delete", params: { thread_id: thread.id }, metadata: {} }),
      defaultContext,
    );

    await expect(server.store.loadThread(thread.id, defaultContext)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("creates and persists an attachment", async () => {
    const attachmentStore = new TestAttachmentStore();
    const server = new TestServer(emptyResponse, undefined, attachmentStore);

    const result = (await server.process(
      JSON.stringify({
        type: "attachments.create",
        params: { name: "image.png", size: 123, mime_type: "image/png" },
        metadata: {},
      }),
      defaultContext,
    )) as NonStreamingResult;

    const attachment = decodeJson(result) as Attachment;
    expect(attachment).toEqual({
      id: "atc_1",
      type: "image",
      name: "image.png",
      mime_type: "image/png",
      preview_url: "https://example.com/preview.png",
      upload_descriptor: { url: "https://example.com/upload", method: "PUT", headers: {} },
      metadata: { source: "test" },
    });
    await expect(server.store.loadAttachment("atc_1", defaultContext)).resolves.toEqual(attachment);
  });

  test("deletes attachments from the attachment and metadata stores", async () => {
    const attachmentStore = new TestAttachmentStore();
    const server = new TestServer(emptyResponse, undefined, attachmentStore);
    const attachment = {
      id: "atc_delete",
      type: "file" as const,
      name: "document.pdf",
      mime_type: "application/pdf",
      upload_descriptor: { url: "https://example.com/upload", method: "PUT" as const, headers: {} },
      metadata: { source: "test" },
    };
    await server.store.saveAttachment(attachment, defaultContext);

    const deleteResult = (await server.process(
      JSON.stringify({
        type: "attachments.delete",
        params: { attachment_id: attachment.id },
        metadata: {},
      }),
      defaultContext,
    )) as NonStreamingResult;

    expect(decodeJson(deleteResult)).toEqual({});
    expect(attachmentStore.deleted).toEqual([attachment.id]);
    await expect(server.store.loadAttachment(attachment.id, defaultContext)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("rejects attachment creation without an attachment store", async () => {
    const server = new TestServer();

    await expect(
      server.process(
        JSON.stringify({
          type: "attachments.create",
          params: { name: "image.png", size: 123, mime_type: "image/png" },
          metadata: {},
        }),
        defaultContext,
      ),
    ).rejects.toThrow("AttachmentStore is not configured");
  });

  test("transcribes base64 audio with a runtime media type", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const capturedAudio: { value?: AudioInput } = {};
    const server = new TestServer(emptyResponse, async (audio) => {
      capturedAudio.value = audio;
      return { text: "transcribed text" };
    });

    const result = (await server.process(
      JSON.stringify({
        type: "input.transcribe",
        params: {
          audio_base64: Buffer.from(bytes).toString("base64"),
          mime_type: "audio/webm;codecs=opus",
        },
        metadata: {},
      }),
      defaultContext,
    )) as NonStreamingResult;

    expect(decodeJson(result)).toEqual({ text: "transcribed text" });
    expect(capturedAudio.value?.data).toEqual(bytes);
    expect(capturedAudio.value?.mime_type).toBe("audio/webm;codecs=opus");
    expect(capturedAudio.value?.mediaType).toBe("audio/webm");
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
      server.transcribe(
        { data: new Uint8Array(), mime_type: "audio/webm", mediaType: "audio/webm" },
        defaultContext,
      ),
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
