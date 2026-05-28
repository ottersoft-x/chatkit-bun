# ChatKit Bun HTTP Handler Design

## Purpose

This milestone adds the thin Bun HTTP boundary for `chatkit-bun`. The server and
widget milestones already provide the core request processor, JSON bytes, SSE
event bytes, cancellation behavior, and parity tests. This milestone exposes
that core through a Bun-compatible `Request` to `Response` helper without adding
a second behavior path.

The Python SDK does not ship a framework handler. Its docs show app code reading
the raw FastAPI request body, calling `server.process(...)`, and returning either
`application/json` or `text/event-stream`. The Bun port should provide the same
pattern as a small library helper for `Bun.serve`.

## Scope

This milestone includes:

- A public HTTP helper exported from `src/index.ts`.
- A `createChatKitHandler(...)` factory that returns a fetch-style
  `(request: Request) => Promise<Response>` handler.
- Optional per-request context resolution through `getContext(request)`.
- Raw body extraction with `request.arrayBuffer()`.
- Delegation to `ChatKitServer.process(...)`.
- `application/json` responses for `NonStreamingResult`.
- `text/event-stream` responses for `StreamingResult`.
- Web `ReadableStream` bridging for the existing async iterable SSE bytes.
- Cancellation forwarding from the HTTP response stream to the underlying async
  iterator.
- Focused HTTP boundary tests.

This milestone defers:

- Auth helpers.
- CORS or `OPTIONS` helpers.
- Route registration helpers for `Bun.serve`.
- File upload endpoints.
- Broad error-to-status mapping.
- Extending `ChatKitServer.process(...)` to accept a `Request`.
- Agents SDK conversion and upstream sync tooling.

Applications remain responsible for routing, authentication, CORS, and custom
HTTP error handling, matching the Python documentation pattern.

## Architecture

Add `src/http.ts` with a focused helper:

```ts
export interface ChatKitHandlerOptions<TContext> {
  getContext?: (request: Request) => TContext | Promise<TContext>;
}

export function createChatKitHandler<TContext = undefined>(
  server: ChatKitServer<TContext>,
  options?: ChatKitHandlerOptions<TContext>,
): (request: Request) => Promise<Response>;
```

The default context is `undefined as TContext` when no `getContext` callback is
provided. Apps that need static context can return it from `getContext`, while
apps with auth can resolve the current user before `process(...)` runs.

The helper should import and use the existing `ChatKitServer`,
`StreamingResult`, and `NonStreamingResult` classes. It should not duplicate
request parsing, event serialization, store behavior, or stream error handling.

Export the helper from `src/index.ts` so consumers can use:

```ts
const chatkit = createChatKitHandler(server, {
  getContext: (request) => ({ request }),
});

Bun.serve({
  routes: {
    "/chatkit": { POST: chatkit },
  },
});
```

## Request And Response Behavior

The handler assumes the application attached it to the intended route and method.
It does not inspect paths and does not reject non-POST methods. Bun route config
or application wrapper code should own those decisions.

For every request:

1. Resolve context with `options.getContext(request)` when provided.
2. Read raw request bytes with `await request.arrayBuffer()`.
3. Call `await server.process(body, context)`.
4. Return a `Response` based on the result type.

For `NonStreamingResult`, return the serialized bytes as the response body with:

- `content-type: application/json`

For `StreamingResult`, return a `ReadableStream<Uint8Array>` with:

- `content-type: text/event-stream`
- `cache-control: no-cache`

The stream should pull from the result's async iterator and enqueue each existing
SSE chunk unchanged. It must not parse or reserialize events.

If the client cancels the response body, the stream should call `return()` on the
underlying iterator when available. This preserves the cancellation path already
implemented and tested in `ChatKitServer`.

## Error Handling

The thin handler does not introduce an SDK-level HTTP status mapping. Validation
errors, not-found errors, unsupported-operation errors, and unexpected errors
should propagate to the caller or Bun runtime by default.

This keeps the HTTP helper aligned with the Python docs, where framework/app code
owns HTTP policy. Applications that want `ValidationError` to become `400`,
`NotFoundError` to become `404`, or auth failures to become `401` can wrap the
returned handler.

Stream errors that `ChatKitServer` already converts into SSE `error` events
remain SSE events because the helper passes through the existing byte stream.

## Testing Strategy

Add `tests/http.test.ts` covering only the new HTTP boundary:

- Non-streaming requests return `application/json` and the exact JSON body
  produced by `ChatKitServer.process(...)`.
- Streaming requests return `text/event-stream` and the exact SSE bytes produced
  by `StreamingResult`.
- `getContext(request)` is called once per request and its value reaches the
  server.
- Response stream cancellation calls `return()` on the underlying iterator.

Update `tests/exports.test.ts` to assert `createChatKitHandler` is exported from
the package root.

Full verification for the implementation plan should include:

```bash
bun run verify
```

## Acceptance Criteria

The milestone is complete when:

- `createChatKitHandler(...)` is exported from `src/index.ts`.
- The helper returns a Bun/Web fetch-style request handler.
- Non-streaming responses preserve existing JSON bytes and use
  `application/json`.
- Streaming responses preserve existing SSE bytes and use `text/event-stream`.
- HTTP cancellation forwards to the underlying async iterator.
- Context can be resolved per request through `getContext(request)`.
- Tests cover the HTTP boundary without duplicating the full server parity suite.
- No auth, CORS, route registration, file upload, or broad HTTP status mapping is
  added in this milestone.
