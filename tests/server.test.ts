import { describe, expect, test } from "bun:test";

import type { ActionConfig } from "../src/actions";
import { NotFoundError, UnsupportedOperationError } from "../src/errors";
import { ChatKitServer, NonStreamingResult, StreamingResult } from "../src/server";
import { SQLiteStore } from "../src/sqlite-store";
import type { AttachmentStore } from "../src/store";
import type { Attachment, ThreadItem, ThreadMetadata } from "../src/types/core";
import type {
  AudioInput,
  FeedbackKind,
  SyncCustomActionResponse,
  ThreadStreamEvent,
  TranscriptionResult,
} from "../src/types/server";

interface RequestContext {
  user_id: string;
}

const defaultContext: RequestContext = { user_id: "user_1" };

type UserMessageItem = Extract<ThreadItem, { type: "user_message" }>;
type AssistantMessageItem = Extract<ThreadItem, { type: "assistant_message" }>;
type StructuredInputItem = Extract<ThreadItem, { type: "structured_input" }>;
type WidgetItem = Extract<ThreadItem, { type: "widget" }>;
type Responder = (
  thread: ThreadMetadata,
  inputUserMessage: UserMessageItem | null,
  context: RequestContext,
) => AsyncIterable<ThreadStreamEvent>;
type Transcriber = (
  audio: AudioInput,
  context: RequestContext,
) => Promise<TranscriptionResult>;
type ActionResponder = (
  thread: ThreadMetadata,
  action: ActionConfig,
  sender: WidgetItem | null,
  context: RequestContext,
) => AsyncIterable<ThreadStreamEvent>;
type SyncActionResponder = (
  thread: ThreadMetadata,
  action: ActionConfig,
  sender: WidgetItem | null,
  context: RequestContext,
) => Promise<SyncCustomActionResponse>;

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

function makeStructuredInputItem(threadId = "thr_test"): StructuredInputItem {
  return {
    id: "si_test",
    type: "structured_input",
    thread_id: threadId,
    created_at: "2026-05-27T00:00:02.000Z",
    status: "pending",
    inputs: [
      {
        id: "subject",
        type: "multiple_choice",
        question: "Subject?",
        options: [{ value: "Math" }, { value: "Science" }, { value: "History" }],
        multiple: false,
      },
      {
        id: "notes",
        type: "freeform",
        question: "Anything else?",
        description: "Optional context",
      },
    ],
  };
}

function makeWidgetItem(threadId = "thr_test"): WidgetItem {
  return {
    id: "widget_test",
    type: "widget",
    thread_id: threadId,
    created_at: "2026-05-27T00:00:02.000Z",
    widget: { type: "Card", children: [] },
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
    private readonly actionResponder?: ActionResponder,
    private readonly syncActionResponder?: SyncActionResponder,
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

  override action(
    thread: ThreadMetadata,
    action: ActionConfig,
    sender: WidgetItem | null,
    context: RequestContext,
  ): AsyncIterable<ThreadStreamEvent> {
    return this.actionResponder?.(thread, action, sender, context) ?? super.action(thread, action, sender, context);
  }

  override syncAction(
    thread: ThreadMetadata,
    action: ActionConfig,
    sender: WidgetItem | null,
    context: RequestContext,
  ): Promise<SyncCustomActionResponse> {
    return this.syncActionResponder?.(thread, action, sender, context) ?? super.syncAction(thread, action, sender, context);
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

  test("does not delete external attachments when local metadata is missing", async () => {
    const attachmentStore = new TestAttachmentStore();
    const server = new TestServer(emptyResponse, undefined, attachmentStore);

    await expect(
      server.process(
        JSON.stringify({
          type: "attachments.delete",
          params: { attachment_id: "atc_missing" },
          metadata: {},
        }),
        defaultContext,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(attachmentStore.deleted).toEqual([]);
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
  });

  test("creates a thread, persists the user message, and streams responder events", async () => {
    const attachmentStore = new TestAttachmentStore();
    const responderCalls: Array<{ thread: ThreadMetadata; item: UserMessageItem | null }> = [];
    const server = new TestServer(
      async function* (thread, inputUserMessage) {
        responderCalls.push({ thread: structuredClone(thread), item: structuredClone(inputUserMessage) });
        yield {
          type: "thread.item.done",
          item: {
            id: "msg_assistant",
            type: "assistant_message",
            thread_id: thread.id,
            created_at: "2026-05-27T00:00:02.000Z",
            content: [{ type: "output_text", text: "Hi there", annotations: [] }],
          },
        };
      },
      undefined,
      attachmentStore,
    );
    await server.store.saveAttachment(
      {
        id: "atc_existing",
        type: "file",
        name: "notes.txt",
        mime_type: "text/plain",
        upload_descriptor: { url: "https://example.com/upload", method: "PUT", headers: {} },
        metadata: { source: "test" },
      },
      defaultContext,
    );

    const result = (await server.process(
      JSON.stringify({
        type: "threads.create",
        params: {
          input: {
            content: [{ type: "input_text", text: "Hello" }],
            attachments: ["atc_existing"],
            inference_options: { model: "gpt-test" },
          },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events.map((event) => event.type)).toEqual([
      "thread.created",
      "thread.item.done",
      "stream_options",
      "thread.item.done",
    ]);
    expect(events[0]).toMatchObject({ type: "thread.created", thread: { status: { type: "active" } } });
    const userMessageEvent = events[1];
    expect(userMessageEvent).toMatchObject({
      type: "thread.item.done",
      item: {
        type: "user_message",
        content: [{ type: "input_text", text: "Hello" }],
        attachments: [{ id: "atc_existing" }],
        inference_options: { model: "gpt-test" },
      },
    });
    expect(responderCalls).toHaveLength(1);
    const responderCall = responderCalls[0];
    expect(responderCall).toBeDefined();
    if (!responderCall) {
      throw new Error("Expected the responder to be called");
    }
    expect(responderCall.item).toMatchObject({
      type: "user_message",
      attachments: [{ id: "atc_existing", thread_id: responderCall.thread.id }],
    });

    const threadId = responderCall.thread.id;
    const persistedItems = await server.store.loadThreadItems(threadId, null, 10, "asc", defaultContext);
    expect(persistedItems.data.map((item) => item.type).sort()).toEqual([
      "assistant_message",
      "user_message",
    ]);
    expect(persistedItems.data.find((item) => item.type === "user_message")).toMatchObject({
      type: "user_message",
      thread_id: threadId,
      attachments: [{ id: "atc_existing", thread_id: threadId }],
    });
    await expect(server.store.loadAttachment("atc_existing", defaultContext)).resolves.toMatchObject({
      id: "atc_existing",
      thread_id: threadId,
    });
  });

  test("adds a user message to an existing thread and sends it to the responder", async () => {
    const captured: Array<UserMessageItem | null> = [];
    const server = new TestServer(async function* (_thread, inputUserMessage) {
      captured.push(structuredClone(inputUserMessage));
    });
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.add_user_message",
        params: {
          thread_id: thread.id,
          input: {
            content: [{ type: "input_text", text: "Second turn" }],
            attachments: [],
            quoted_text: "Earlier text",
            inference_options: { model: "gpt-test" },
          },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events.map((event) => event.type)).toEqual(["thread.item.done", "stream_options"]);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      type: "user_message",
      thread_id: thread.id,
      content: [{ type: "input_text", text: "Second turn" }],
      quoted_text: "Earlier text",
      inference_options: { model: "gpt-test" },
    });

    const persistedItems = await server.store.loadThreadItems(thread.id, null, 10, "asc", defaultContext);
    expect(persistedItems.data).toHaveLength(1);
    expect(persistedItems.data[0]).toMatchObject(captured[0] as UserMessageItem);
  });

  test("persists responder thread mutations and emits thread updated events", async () => {
    const server = new TestServer(async function* (thread) {
      thread.title = "Renamed thread";
      thread.metadata = { topic: "support", priority: 1 };
      yield { type: "progress_update", text: "renamed" };

      thread.status = { type: "locked", reason: "waiting" };
      thread.allowed_image_domains = ["example.com"];
      yield { type: "progress_update", text: "locked" };
    });
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.add_user_message",
        params: {
          thread_id: thread.id,
          input: {
            content: [{ type: "input_text", text: "Mutate thread" }],
            attachments: [],
            inference_options: {},
          },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events.map((event) => event.type)).toEqual([
      "thread.item.done",
      "stream_options",
      "progress_update",
      "thread.updated",
      "progress_update",
      "thread.updated",
    ]);
    expect(events[3]).toMatchObject({
      type: "thread.updated",
      thread: {
        id: thread.id,
        title: "Renamed thread",
        status: { type: "active" },
      },
    });
    expect(events[5]).toMatchObject({
      type: "thread.updated",
      thread: {
        id: thread.id,
        title: "Renamed thread",
        status: { type: "locked", reason: "waiting" },
        allowed_image_domains: ["example.com"],
      },
    });

    await expect(server.store.loadThread(thread.id, defaultContext)).resolves.toEqual({
      ...thread,
      title: "Renamed thread",
      status: { type: "locked", reason: "waiting" },
      allowed_image_domains: ["example.com"],
      metadata: { topic: "support", priority: 1 },
    });
  });

  test("adds client tool output and resumes the responder", async () => {
    const responderCalls: Array<UserMessageItem | null> = [];
    const server = new TestServer(async function* (thread, inputUserMessage) {
      responderCalls.push(structuredClone(inputUserMessage));

      if (inputUserMessage) {
        yield {
          type: "thread.item.done",
          item: {
            id: "tool_call_test",
            type: "client_tool_call",
            thread_id: thread.id,
            created_at: "2026-05-27T00:00:02.000Z",
            status: "pending",
            call_id: "call_test",
            name: "select_file",
            arguments: { accept: "text/plain" },
          },
        };
      } else {
        yield { type: "progress_update", text: "resumed" };
      }
    });

    const createResult = (await server.process(
      JSON.stringify({
        type: "threads.create",
        params: {
          input: {
            content: [{ type: "input_text", text: "Pick a file" }],
            attachments: [],
            inference_options: {},
          },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;
    const createEvents = await decodeStream(createResult);
    const threadId =
      createEvents[0]?.type === "thread.created" ? createEvents[0].thread.id : "missing_thread";

    const continuationResult = (await server.process(
      JSON.stringify({
        type: "threads.add_client_tool_output",
        params: { thread_id: threadId, result: { file_id: "file_1" } },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const continuationEvents = await decodeStream(continuationResult);
    expect(continuationEvents.map((event) => event.type)).toEqual([
      "stream_options",
      "progress_update",
    ]);
    expect(responderCalls).toHaveLength(2);
    expect(responderCalls[1]).toBeNull();
    await expect(server.store.loadItem(threadId, "tool_call_test", defaultContext)).resolves.toMatchObject({
      type: "client_tool_call",
      status: "completed",
      output: { file_id: "file_1" },
    });
  });

  test("replaces structured input answers and resumes the responder", async () => {
    const responderCalls: Array<UserMessageItem | null> = [];
    const server = new TestServer(async function* (_thread, inputUserMessage) {
      responderCalls.push(structuredClone(inputUserMessage));
      yield { type: "progress_update", text: "continued" };
    });
    const thread = makeThread();
    const item = makeStructuredInputItem(thread.id);
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, item, defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.add_structured_input",
        params: {
          thread_id: thread.id,
          item_id: item.id,
          input: {
            status: "answered",
            answers: {
              subject: { values: ["Science"] },
              notes: { values: ["Needs visuals"] },
            },
          },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events.map((event) => event.type)).toEqual([
      "stream_options",
      "thread.item.replaced",
      "progress_update",
    ]);
    expect(events[1]).toMatchObject({
      type: "thread.item.replaced",
      item: {
        id: item.id,
        status: "answered",
        inputs: [
          { id: "subject", answer: { values: ["Science"], skipped: false } },
          { id: "notes", answer: { values: ["Needs visuals"], skipped: false } },
        ],
      },
    });
    expect(responderCalls).toEqual([null]);
    await expect(server.store.loadItem(thread.id, item.id, defaultContext)).resolves.toMatchObject({
      type: "structured_input",
      status: "answered",
      inputs: [
        { id: "subject", answer: { values: ["Science"], skipped: false } },
        { id: "notes", answer: { values: ["Needs visuals"], skipped: false } },
      ],
    });
  });

  test("marks omitted structured input answers as skipped", async () => {
    const server = new TestServer();
    const thread = makeThread();
    const item = makeStructuredInputItem(thread.id);
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, item, defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.add_structured_input",
        params: {
          thread_id: thread.id,
          item_id: item.id,
          input: {
            status: "answered",
            answers: { subject: { values: ["Math"] } },
          },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events[1]).toMatchObject({
      type: "thread.item.replaced",
      item: {
        inputs: [
          { id: "subject", answer: { values: ["Math"], skipped: false } },
          { id: "notes", answer: { values: [], skipped: true } },
        ],
      },
    });
    await expect(server.store.loadItem(thread.id, item.id, defaultContext)).resolves.toMatchObject({
      inputs: [
        { id: "subject", answer: { values: ["Math"], skipped: false } },
        { id: "notes", answer: { values: [], skipped: true } },
      ],
    });
  });

  test("ignores unknown structured input answer ids", async () => {
    const server = new TestServer();
    const thread = makeThread();
    const item = makeStructuredInputItem(thread.id);
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, item, defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.add_structured_input",
        params: {
          thread_id: thread.id,
          item_id: item.id,
          input: {
            status: "answered",
            answers: {
              subject: { values: ["History"] },
              missing_question: { values: ["ignored"] },
            },
          },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events[1]).toMatchObject({
      type: "thread.item.replaced",
      item: {
        inputs: [
          { id: "subject", answer: { values: ["History"], skipped: false } },
          { id: "notes", answer: { values: [], skipped: true } },
        ],
      },
    });
    const persisted = await server.store.loadItem(thread.id, item.id, defaultContext);
    expect(JSON.stringify(persisted)).not.toContain("missing_question");
  });

  test("truncates single-choice structured input answers to one value", async () => {
    const server = new TestServer();
    const thread = makeThread();
    const item = makeStructuredInputItem(thread.id);
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, item, defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.add_structured_input",
        params: {
          thread_id: thread.id,
          item_id: item.id,
          input: {
            status: "answered",
            answers: {
              subject: { values: ["Science", "History"] },
              notes: { values: ["Keep all text"] },
            },
          },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events[1]).toMatchObject({
      type: "thread.item.replaced",
      item: {
        inputs: [
          { id: "subject", answer: { values: ["Science"], skipped: false } },
          { id: "notes", answer: { values: ["Keep all text"], skipped: false } },
        ],
      },
    });
    await expect(server.store.loadItem(thread.id, item.id, defaultContext)).resolves.toMatchObject({
      inputs: [
        { id: "subject", answer: { values: ["Science"], skipped: false } },
        { id: "notes", answer: { values: ["Keep all text"], skipped: false } },
      ],
    });
  });

  test("retry after a user message removes later items before resuming", async () => {
    const itemsAtResume: string[][] = [];
    const resumedWith: Array<UserMessageItem | null> = [];
    let server!: TestServer;
    server = new TestServer(async function* (thread, inputUserMessage) {
      resumedWith.push(structuredClone(inputUserMessage));
      const items = await server.store.loadThreadItems(thread.id, null, 10, "asc", defaultContext);
      itemsAtResume.push(items.data.map((item) => item.id));
      yield { type: "progress_update", text: "retrying" };
    });
    const thread = makeThread();
    const userMessage = makeUserMessage("msg_retry", thread.id);
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, userMessage, defaultContext);
    await server.store.addThreadItem(thread.id, makeAssistantMessage("First response"), defaultContext);
    await server.store.addThreadItem(thread.id, makeWidgetItem(thread.id), defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.retry_after_item",
        params: { thread_id: thread.id, item_id: userMessage.id },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events.map((event) => event.type)).toEqual(["stream_options", "progress_update"]);
    expect(resumedWith[0]).toMatchObject({ id: userMessage.id, type: "user_message" });
    expect(itemsAtResume).toEqual([[userMessage.id]]);
    const persistedItems = await server.store.loadThreadItems(thread.id, null, 10, "asc", defaultContext);
    expect(persistedItems.data.map((item) => item.id)).toEqual([userMessage.id]);
  });

  test("retry after a non-user item rejects", async () => {
    const server = new TestServer();
    const thread = makeThread();
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, makeAssistantMessage("Not retryable"), defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.retry_after_item",
        params: { thread_id: thread.id, item_id: "msg_test" },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    await expect(decodeStream(result)).rejects.toThrow("not a user message");
  });

  test("routes custom actions with widget senders", async () => {
    const actionCalls: Array<{
      thread: ThreadMetadata;
      action: ActionConfig;
      sender: WidgetItem | null;
      context: RequestContext;
    }> = [];
    const server = new TestServer(
      emptyResponse,
      undefined,
      null,
      async function* (thread, action, sender, context) {
        actionCalls.push({
          thread: structuredClone(thread),
          action: structuredClone(action),
          sender: structuredClone(sender),
          context,
        });
        yield { type: "progress_update", text: "action handled" };
      },
    );
    const thread = makeThread();
    const widget = makeWidgetItem(thread.id);
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, widget, defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.custom_action",
        params: {
          thread_id: thread.id,
          item_id: widget.id,
          action: { type: "open", payload: { id: 1 }, handler: "server" },
        },
        metadata: {},
      }),
      defaultContext,
    )) as StreamingResult;

    const events = await decodeStream(result);
    expect(events.map((event) => event.type)).toEqual(["stream_options", "progress_update"]);
    expect(actionCalls).toEqual([
      {
        thread,
        action: {
          type: "open",
          payload: { id: 1 },
          handler: "server",
          loadingBehavior: "auto",
          streaming: true,
        },
        sender: widget,
        context: defaultContext,
      },
    ]);
  });

  test("serializes sync custom action updated items from widget senders", async () => {
    const syncActionCalls: Array<{
      thread: ThreadMetadata;
      action: ActionConfig;
      sender: WidgetItem | null;
      context: RequestContext;
    }> = [];
    const server = new TestServer(
      emptyResponse,
      undefined,
      null,
      undefined,
      async (thread, action, sender, context) => {
        syncActionCalls.push({
          thread: structuredClone(thread),
          action: structuredClone(action),
          sender: structuredClone(sender),
          context,
        });
        return {
          updated_item: {
            ...sender!,
            widget: { type: "Card", children: [{ type: "Text", children: "Updated" }] },
          },
        };
      },
    );
    const thread = makeThread();
    const widget = makeWidgetItem(thread.id);
    await server.store.saveThread(thread, defaultContext);
    await server.store.addThreadItem(thread.id, widget, defaultContext);

    const result = (await server.process(
      JSON.stringify({
        type: "threads.sync_custom_action",
        params: {
          thread_id: thread.id,
          item_id: widget.id,
          action: { type: "update", payload: { value: true } },
        },
        metadata: {},
      }),
      defaultContext,
    )) as NonStreamingResult;

    expect(decodeJson(result)).toEqual({
      updated_item: {
        ...widget,
        widget: { type: "Card", children: [{ type: "Text", children: "Updated" }] },
      },
    });
    expect(syncActionCalls).toEqual([
      {
        thread,
        action: {
          type: "update",
          payload: { value: true },
          handler: "server",
          loadingBehavior: "auto",
          streaming: true,
        },
        sender: widget,
        context: defaultContext,
      },
    ]);
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
