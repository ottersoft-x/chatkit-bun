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
