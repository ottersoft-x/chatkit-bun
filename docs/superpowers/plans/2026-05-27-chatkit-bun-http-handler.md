# ChatKit Bun HTTP Handler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin Bun/Web HTTP handler that wraps `ChatKitServer.process(...)` and returns JSON or SSE `Response` objects.

**Architecture:** Add a focused `src/http.ts` module with `createChatKitHandler(...)`. The helper reads raw request bytes, resolves optional per-request context, delegates to the existing `ChatKitServer.process(...)`, and adapts `NonStreamingResult` or `StreamingResult` into Web `Response` instances without parsing or reserializing payloads. Public exports are added only after the HTTP boundary tests pass.

**Tech Stack:** Bun, TypeScript, Web `Request`/`Response`/`ReadableStream`, `bun:test`, existing `ChatKitServer`, `StreamingResult`, and `NonStreamingResult`.

---

## Scope Check

The approved spec covers one subsystem: a thin HTTP boundary helper for Bun/Web request handling. It does not include auth, CORS, route registration, file upload endpoints, error-to-status mapping, Agents SDK conversion, or upstream sync tooling.

## File Structure

- Create: `src/http.ts`
  - Owns the HTTP adapter only.
  - Exports `ChatKitHandlerOptions`, `ChatKitHandler`, and `createChatKitHandler(...)`.
  - Converts `StreamingResult` to a Web `ReadableStream` and forwards cancellation to the async iterator.
- Create: `tests/http.test.ts`
  - Tests the HTTP boundary with a recording server and synthetic `StreamingResult`/`NonStreamingResult` instances.
  - Does not duplicate the full `ChatKitServer.process(...)` parity suite.
- Modify: `src/index.ts`
  - Re-exports `src/http.ts`.
- Modify: `tests/exports.test.ts`
  - Asserts the root package exports `createChatKitHandler`.

## Reference Material

- Approved spec: `docs/superpowers/specs/2026-05-27-chatkit-bun-http-handler-design.md`
- Core server API: `src/server.ts`
- Existing public export test: `tests/exports.test.ts`
- Python docs reference: `packages/chatkit-python/docs/quickstart.md`

## Task 1: Add Focused HTTP Boundary Tests

**Files:**
- Create: `tests/http.test.ts`

- [ ] **Step 1: Write the failing HTTP boundary tests**

Create `tests/http.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { createChatKitHandler } from "../src/http";
import { ChatKitServer, NonStreamingResult, StreamingResult } from "../src/server";
import { BaseStore, type StoreItemType } from "../src/store";
import type { Attachment, Page, ThreadItem, ThreadMetadata } from "../src/types/core";
import type { ThreadStreamEvent } from "../src/types/server";

interface RequestContext {
  userId: string;
  url: string;
}

type ProcessInput = string | Uint8Array | ArrayBuffer;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class UnusedStore<TContext> extends BaseStore<TContext> {
  override async loadThread(_threadId: string, _context: TContext): Promise<ThreadMetadata> {
    throw new Error("loadThread is not exercised by HTTP handler tests");
  }

  override async saveThread(_thread: ThreadMetadata, _context: TContext): Promise<void> {
    throw new Error("saveThread is not exercised by HTTP handler tests");
  }

  override async loadThreadItems(
    _threadId: string,
    _after: string | null,
    _limit: number,
    _order: "asc" | "desc",
    _context: TContext,
  ): Promise<Page<ThreadItem>> {
    throw new Error("loadThreadItems is not exercised by HTTP handler tests");
  }

  override async saveAttachment(_attachment: Attachment, _context: TContext): Promise<void> {
    throw new Error("saveAttachment is not exercised by HTTP handler tests");
  }

  override async loadAttachment(_attachmentId: string, _context: TContext): Promise<Attachment> {
    throw new Error("loadAttachment is not exercised by HTTP handler tests");
  }

  override async deleteAttachment(_attachmentId: string, _context: TContext): Promise<void> {
    throw new Error("deleteAttachment is not exercised by HTTP handler tests");
  }

  override async loadThreads(
    _limit: number,
    _after: string | null,
    _order: "asc" | "desc",
    _context: TContext,
  ): Promise<Page<ThreadMetadata>> {
    throw new Error("loadThreads is not exercised by HTTP handler tests");
  }

  override async addThreadItem(
    _threadId: string,
    _item: ThreadItem,
    _context: TContext,
  ): Promise<void> {
    throw new Error("addThreadItem is not exercised by HTTP handler tests");
  }

  override async saveItem(_threadId: string, _item: ThreadItem, _context: TContext): Promise<void> {
    throw new Error("saveItem is not exercised by HTTP handler tests");
  }

  override async loadItem(
    _threadId: string,
    _itemId: string,
    _context: TContext,
  ): Promise<ThreadItem> {
    throw new Error("loadItem is not exercised by HTTP handler tests");
  }

  override async deleteThread(_threadId: string, _context: TContext): Promise<void> {
    throw new Error("deleteThread is not exercised by HTTP handler tests");
  }

  override async deleteThreadItem(
    _threadId: string,
    _itemId: string,
    _context: TContext,
  ): Promise<void> {
    throw new Error("deleteThreadItem is not exercised by HTTP handler tests");
  }

  override generateItemId(
    itemType: StoreItemType,
    thread: ThreadMetadata,
    context: TContext,
  ): string {
    return super.generateItemId(itemType, thread, context);
  }
}

class RecordingServer extends ChatKitServer<RequestContext | undefined> {
  readonly calls: Array<{ body: string; context: RequestContext | undefined }> = [];

  constructor(private readonly result: StreamingResult | NonStreamingResult) {
    super(new UnusedStore<RequestContext | undefined>());
  }

  override async *respond(): AsyncIterable<ThreadStreamEvent> {
    throw new Error("respond is not exercised by HTTP handler tests");
  }

  override async process(
    request: ProcessInput,
    context: RequestContext | undefined,
  ): Promise<StreamingResult | NonStreamingResult> {
    const bytes =
      typeof request === "string"
        ? encoder.encode(request)
        : request instanceof ArrayBuffer
          ? new Uint8Array(request)
          : request;

    this.calls.push({ body: decoder.decode(bytes), context });
    return this.result;
  }
}

function jsonResult(value: unknown): NonStreamingResult {
  return new NonStreamingResult(encoder.encode(JSON.stringify(value)));
}

function streamingResult(chunks: string[], onReturn?: () => void): StreamingResult {
  return new StreamingResult({
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
      let index = 0;

      return {
        async next(): Promise<IteratorResult<Uint8Array>> {
          if (index >= chunks.length) {
            return { done: true, value: undefined };
          }

          return { done: false, value: encoder.encode(chunks[index++]!) };
        },
        async return(): Promise<IteratorResult<Uint8Array>> {
          onReturn?.();
          return { done: true, value: undefined };
        },
      };
    },
  });
}

describe("createChatKitHandler", () => {
  test("returns application/json for non-streaming results", async () => {
    const server = new RecordingServer(jsonResult({ ok: true }));
    const handler = createChatKitHandler(server);

    const response = await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        body: JSON.stringify({ type: "threads.list", params: {} }),
      }),
    );

    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.text()).toBe(JSON.stringify({ ok: true }));
    expect(server.calls).toEqual([
      {
        body: JSON.stringify({ type: "threads.list", params: {} }),
        context: undefined,
      },
    ]);
  });

  test("returns text/event-stream for streaming results", async () => {
    const chunks = [
      'data: {"type":"thread.created"}\n\n',
      'data: {"type":"thread.item.done"}\n\n',
    ];
    const server = new RecordingServer(streamingResult(chunks));
    const handler = createChatKitHandler(server);

    const response = await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        body: JSON.stringify({ type: "threads.create", params: {} }),
      }),
    );

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(await response.text()).toBe(chunks.join(""));
  });

  test("uses getContext to resolve per-request context", async () => {
    const server = new RecordingServer(jsonResult({ ok: true }));
    const handler = createChatKitHandler(server, {
      getContext: (request) => ({
        userId: request.headers.get("x-user-id") ?? "anonymous",
        url: request.url,
      }),
    });

    await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        headers: { "x-user-id": "user_123" },
        body: "context-body",
      }),
    );

    expect(server.calls).toEqual([
      {
        body: "context-body",
        context: {
          userId: "user_123",
          url: "https://example.com/chatkit",
        },
      },
    ]);
  });

  test("cancels the underlying streaming iterator when the response body is cancelled", async () => {
    let returned = false;
    const server = new RecordingServer(
      streamingResult(["data: one\n\n", "data: two\n\n"], () => {
        returned = true;
      }),
    );
    const handler = createChatKitHandler(server);

    const response = await handler(
      new Request("https://example.com/chatkit", {
        method: "POST",
        body: JSON.stringify({ type: "threads.create", params: {} }),
      }),
    );

    const reader = response.body!.getReader();
    const first = await reader.read();

    expect(decoder.decode(first.value)).toBe("data: one\n\n");

    await reader.cancel();

    expect(returned).toBe(true);
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
bun test tests/http.test.ts
```

Expected: FAIL because `../src/http` does not exist yet.

## Task 2: Implement The Thin HTTP Handler

**Files:**
- Create: `src/http.ts`
- Test: `tests/http.test.ts`

- [ ] **Step 1: Add the handler implementation**

Create `src/http.ts`:

```ts
import { NonStreamingResult, StreamingResult, type ChatKitServer } from "./server";

export interface ChatKitHandlerOptions<TContext> {
  getContext?: (request: Request) => TContext | Promise<TContext>;
}

export type ChatKitHandler = (request: Request) => Promise<Response>;

export function createChatKitHandler<TContext = undefined>(
  server: ChatKitServer<TContext>,
  options: ChatKitHandlerOptions<TContext> = {},
): ChatKitHandler {
  return async (request) => {
    const context = options.getContext
      ? await options.getContext(request)
      : (undefined as TContext);
    const result = await server.process(await request.arrayBuffer(), context);

    if (result instanceof NonStreamingResult) {
      return new Response(result.json, {
        headers: {
          "content-type": "application/json",
        },
      });
    }

    if (result instanceof StreamingResult) {
      return new Response(toReadableStream(result), {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
        },
      });
    }

    const _exhaustive: never = result;
    return _exhaustive;
  };
}

function toReadableStream(iterable: AsyncIterable<Uint8Array>): ReadableStream<Uint8Array> {
  let iterator: AsyncIterator<Uint8Array> | undefined;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      iterator ??= iterable[Symbol.asyncIterator]();
      const next = await iterator.next();

      if (next.done) {
        controller.close();
        return;
      }

      controller.enqueue(next.value);
    },
    async cancel() {
      await iterator?.return?.();
    },
  });
}
```

- [ ] **Step 2: Run the focused HTTP tests**

Run:

```bash
bun test tests/http.test.ts
```

Expected: PASS for all `createChatKitHandler` tests.

- [ ] **Step 3: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Commit the handler and focused tests**

Run:

```bash
git add src/http.ts tests/http.test.ts
git commit -m "Add Bun HTTP handler"
```

Expected: Commit succeeds.

## Task 3: Export The Public HTTP API

**Files:**
- Modify: `src/index.ts`
- Modify: `tests/exports.test.ts`

- [ ] **Step 1: Add a failing root export assertion**

Update the import list in `tests/exports.test.ts` to include `createChatKitHandler`:

```ts
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
```

Add this assertion inside `test("exports foundation APIs", () => { ... })` near the server assertions:

```ts
expect(typeof createChatKitHandler).toBe("function");
```

- [ ] **Step 2: Run the export test to verify it fails**

Run:

```bash
bun test tests/exports.test.ts
```

Expected: FAIL because `createChatKitHandler` is not exported from `src/index.ts`.

- [ ] **Step 3: Export the HTTP module**

Add the HTTP export to `src/index.ts`:

```ts
export * from "./actions";
export * from "./errors";
export * from "./http";
export * from "./serialization";
export * from "./server";
export * from "./sqlite-store";
export * from "./store";
export * from "./types/core";
export * from "./types/server";
export * from "./widgets";
```

- [ ] **Step 4: Run the export test**

Run:

```bash
bun test tests/exports.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run:

```bash
bun run verify
```

Expected: PASS with all tests passing.

- [ ] **Step 6: Commit the public export**

Run:

```bash
git add src/index.ts tests/exports.test.ts
git commit -m "Export Bun HTTP handler"
```

Expected: Commit succeeds.

## Final Verification

After all tasks are complete, run:

```bash
bun run verify
git status --short --branch
```

Expected:

- TypeScript typecheck passes.
- All Bun tests pass.
- Git status is clean on the implementation branch.

## Implementation Notes

- Do not change `ChatKitServer.process(...)`.
- Do not add auth, CORS, `OPTIONS`, route setup, upload routes, or HTTP status mapping.
- Do not parse or reserialize SSE chunks in the HTTP helper.
- Keep the helper usable directly in `Bun.serve({ routes: { "/chatkit": { POST: handler } } })`.
- If cancellation behavior fails in Bun's Web Streams implementation, preserve the public API and adjust only the internal stream bridge until the cancellation test passes.
