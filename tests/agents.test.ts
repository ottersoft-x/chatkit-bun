import { describe, expect, test } from "bun:test";

import { AgentContext, ClientToolCall } from "../src/agents";
import { BaseStore, type StoreItemType } from "../src/store";
import type { Attachment, Page, ThreadItem, ThreadMetadata } from "../src/types/core";
import type { ThreadStreamEvent } from "../src/types/server";

interface RequestContext {
  userId: string;
}

const now = "2026-05-27T00:00:00.000Z";
const thread: ThreadMetadata = {
  id: "thr_1",
  created_at: now,
  status: { type: "active" },
  metadata: {},
};
const requestContext: RequestContext = { userId: "user_1" };

class TestStore extends BaseStore<RequestContext> {
  override generateItemId(itemType: StoreItemType): string {
    return `${itemType}_generated`;
  }

  override async loadThread(_threadId: string, _context: RequestContext): Promise<ThreadMetadata> {
    throw new Error("loadThread is not used by agents tests");
  }

  override async saveThread(_thread: ThreadMetadata, _context: RequestContext): Promise<void> {
    throw new Error("saveThread is not used by agents tests");
  }

  override async loadThreadItems(
    _threadId: string,
    _after: string | null,
    _limit: number,
    _order: "asc" | "desc",
    _context: RequestContext,
  ): Promise<Page<ThreadItem>> {
    throw new Error("loadThreadItems is not used by agents tests");
  }

  override async saveAttachment(_attachment: Attachment, _context: RequestContext): Promise<void> {
    throw new Error("saveAttachment is not used by agents tests");
  }

  override async loadAttachment(_attachmentId: string, _context: RequestContext): Promise<Attachment> {
    throw new Error("loadAttachment is not used by agents tests");
  }

  override async deleteAttachment(_attachmentId: string, _context: RequestContext): Promise<void> {
    throw new Error("deleteAttachment is not used by agents tests");
  }

  override async loadThreads(
    _limit: number,
    _after: string | null,
    _order: "asc" | "desc",
    _context: RequestContext,
  ): Promise<Page<ThreadMetadata>> {
    throw new Error("loadThreads is not used by agents tests");
  }

  override async addThreadItem(
    _threadId: string,
    _item: ThreadItem,
    _context: RequestContext,
  ): Promise<void> {
    throw new Error("addThreadItem is not used by agents tests");
  }

  override async saveItem(_threadId: string, _item: ThreadItem, _context: RequestContext): Promise<void> {
    throw new Error("saveItem is not used by agents tests");
  }

  override async loadItem(
    _threadId: string,
    _itemId: string,
    _context: RequestContext,
  ): Promise<ThreadItem> {
    throw new Error("loadItem is not used by agents tests");
  }

  override async deleteThread(_threadId: string, _context: RequestContext): Promise<void> {
    throw new Error("deleteThread is not used by agents tests");
  }

  override async deleteThreadItem(
    _threadId: string,
    _itemId: string,
    _context: RequestContext,
  ): Promise<void> {
    throw new Error("deleteThreadItem is not used by agents tests");
  }
}

function createContext(): AgentContext<RequestContext> {
  return new AgentContext({
    thread,
    store: new TestStore(),
    context: requestContext,
    now: () => now,
  });
}

async function collect(iterable: AsyncIterable<ThreadStreamEvent>): Promise<ThreadStreamEvent[]> {
  const events: ThreadStreamEvent[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}

describe("AgentContext", () => {
  test("stores thread, store, request context, and deterministic timestamps", () => {
    const agentContext = createContext();

    expect(agentContext.thread).toEqual(thread);
    expect(agentContext.context).toEqual(requestContext);
    expect(agentContext.createdAt()).toBe(now);
    expect(agentContext.store.generateItemId("tool_call", thread, requestContext)).toBe(
      "tool_call_generated",
    );
  });

  test("queues validated stream events", async () => {
    const agentContext = createContext();

    agentContext.stream({
      type: "progress_update",
      icon: "sparkle",
      text: "Thinking",
    });
    agentContext.closeEvents();

    await expect(collect(agentContext.events())).resolves.toEqual([
      {
        type: "progress_update",
        icon: "sparkle",
        text: "Thinking",
      },
    ]);
  });

  test("rejects invalid stream events before queueing them", () => {
    const agentContext = createContext();

    expect(() => agentContext.stream({ type: "progress_update" } as never)).toThrow();
  });

  test("records one client tool call per turn", () => {
    const agentContext = createContext();
    const toolCall = new ClientToolCall("get_selection", { includeHtml: true });

    agentContext.setClientToolCall(toolCall);

    expect(agentContext.getClientToolCall()).toBe(toolCall);
    expect(() => agentContext.setClientToolCall(new ClientToolCall("other"))).toThrow(
      "Only one client tool call can be set per response.",
    );
  });
});
