import { describe, test } from "node:test";

import { expect } from "./helpers/expect.js";

import { NotFoundError } from "../src/errors.js";
import { defaultGenerateId } from "../src/store.js";
import { SQLiteStore } from "../src/sqlite-store.js";
import type { Attachment, ThreadItem, ThreadMetadata } from "../src/types/core.js";

interface RequestContext {
  user_id: string;
}

type AssistantMessageItem = Extract<ThreadItem, { type: "assistant_message" }>;

const defaultContext: RequestContext = { user_id: "test_user" };

function makeThread(id = "thr_test", createdAt = "2026-05-26T00:00:00.000Z"): ThreadMetadata {
  return {
    id,
    title: "Test Thread",
    created_at: createdAt,
    status: { type: "active" },
    metadata: { test: "test" },
  };
}

function makeMessage(id = "msg_test", createdAt = "2026-05-26T00:00:01.000Z"): AssistantMessageItem {
  return {
    id,
    type: "assistant_message",
    thread_id: "thr_test",
    created_at: createdAt,
    content: [{ type: "output_text", text: "Hi there!", annotations: [] }],
  };
}

describe("store helpers", () => {
  const idCases = [
    ["thread", /^thr_[0-9a-f]{8}$/],
    ["message", /^msg_[0-9a-f]{8}$/],
    ["tool_call", /^tc_[0-9a-f]{8}$/],
    ["task", /^tsk_[0-9a-f]{8}$/],
    ["workflow", /^wf_[0-9a-f]{8}$/],
    ["attachment", /^atc_[0-9a-f]{8}$/],
    ["sdk_hidden_context", /^shcx_[0-9a-f]{8}$/],
  ] as const;

  for (const [itemType, pattern] of idCases) {
    test(`generates ${itemType} ids`, () => {
      expect(defaultGenerateId(itemType)).toMatch(pattern);
    });
  }
});

describe("SQLiteStore", () => {
  test("saves and loads thread metadata by context user", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const thread = makeThread();

    await store.saveThread(thread, defaultContext);

    expect(await store.loadThread(thread.id, defaultContext)).toEqual(thread);
    await expect(store.loadThread(thread.id, { user_id: "other" })).rejects.toBeInstanceOf(NotFoundError);
  });

  test("orders and paginates threads", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    await store.saveThread(makeThread("thr_1", "2026-05-26T00:00:00.000Z"), defaultContext);
    await store.saveThread(makeThread("thr_2", "2026-05-26T00:00:01.000Z"), defaultContext);
    await store.saveThread(makeThread("thr_3", "2026-05-26T00:00:02.000Z"), defaultContext);

    const first = await store.loadThreads(2, null, "asc", defaultContext);
    expect(first.data.map((thread) => thread.id)).toEqual(["thr_1", "thr_2"]);
    expect(first.has_more).toBe(true);
    expect(first.after).toBe("thr_2");

    const second = await store.loadThreads(2, first.after ?? null, "asc", defaultContext);
    expect(second.data.map((thread) => thread.id)).toEqual(["thr_3"]);
    expect(second.has_more).toBe(false);
    expect(second.after).toBeNull();
  });

  test("rejects non-positive thread pagination limits", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });

    await expect(store.loadThreads(0, null, "asc", defaultContext)).rejects.toBeInstanceOf(RangeError);
    await expect(store.loadThreads(-1, null, "asc", defaultContext)).rejects.toBeInstanceOf(RangeError);
  });

  test("updates thread metadata without deleting items", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const thread = makeThread();
    const item = makeMessage();
    await store.saveThread(thread, defaultContext);
    await store.addThreadItem(thread.id, item, defaultContext);

    const updatedThread: ThreadMetadata = { ...thread, title: "Updated Thread" };
    await store.saveThread(updatedThread, defaultContext);

    expect(await store.loadThread(thread.id, defaultContext)).toEqual(updatedThread);
    expect((await store.loadThreadItems(thread.id, null, 10, "asc", defaultContext)).data).toEqual([item]);
  });

  test("saves, loads, updates, and deletes thread items", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const thread = makeThread();
    const item = makeMessage();
    await store.saveThread(thread, defaultContext);
    await store.addThreadItem(thread.id, item, defaultContext);

    expect((await store.loadThreadItems(thread.id, null, 10, "asc", defaultContext)).data).toEqual([item]);

    const updated: AssistantMessageItem = {
      ...item,
      content: [{ type: "output_text", text: "Updated", annotations: [] }],
    };
    await store.saveItem(thread.id, updated, defaultContext);
    expect(await store.loadItem(thread.id, item.id, defaultContext)).toEqual(updated);

    await store.deleteThreadItem(thread.id, item.id, defaultContext);
    await expect(store.loadItem(thread.id, item.id, defaultContext)).rejects.toBeInstanceOf(NotFoundError);
  });

  test("saveItem inserts new items for existing threads", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const thread = makeThread();
    const item = makeMessage();
    await store.saveThread(thread, defaultContext);

    await store.saveItem(thread.id, item, defaultContext);

    expect(await store.loadItem(thread.id, item.id, defaultContext)).toEqual(item);
    expect((await store.loadThreadItems(thread.id, null, 10, "asc", defaultContext)).data).toEqual([item]);
  });

  test("rejects non-positive item pagination limits", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const thread = makeThread();
    await store.saveThread(thread, defaultContext);

    await expect(store.loadThreadItems(thread.id, null, 0, "asc", defaultContext)).rejects.toBeInstanceOf(RangeError);
    await expect(store.loadThreadItems(thread.id, null, -1, "asc", defaultContext)).rejects.toBeInstanceOf(RangeError);
  });

  test("closes the sqlite database", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    await store.saveThread(makeThread(), defaultContext);

    expect(typeof store.close).toBe("function");
    store.close();
  });

  test("upserts, loads, and deletes attachments", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const attachment: Attachment = {
      id: "file_1",
      type: "file",
      mime_type: "text/plain",
      name: "notes.txt",
    };

    await store.saveAttachment(attachment, defaultContext);
    expect(await store.loadAttachment(attachment.id, defaultContext)).toEqual(attachment);

    const updated: Attachment = { ...attachment, name: "updated-notes.txt" };
    await store.saveAttachment(updated, defaultContext);
    expect(await store.loadAttachment(attachment.id, defaultContext)).toEqual(updated);

    await store.deleteAttachment(attachment.id, defaultContext);
    await expect(store.loadAttachment(attachment.id, defaultContext)).rejects.toBeInstanceOf(NotFoundError);
  });
});
