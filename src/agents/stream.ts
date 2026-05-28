import type { AssistantMessageContent } from "../types/core";
import { ThreadStreamEventSchema, type ThreadStreamEvent } from "../types/server";
import type { AgentContext } from "./context";
import type { AgentStreamInput, ToolCallMetadata } from "./types";

type UnknownRecord = Record<string, unknown>;

interface AssistantTextState {
  activeItemId: string | null;
  textByPart: Map<string, string>;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    isRecord(value) &&
    typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function"
  );
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function normalizeStream(streamedRun: AgentStreamInput | AsyncIterable<unknown>): AsyncIterable<unknown> {
  if (isRecord(streamedRun) && typeof streamedRun.toStream === "function") {
    return streamedRun.toStream();
  }

  if (isAsyncIterable(streamedRun)) {
    return streamedRun;
  }

  throw new Error("streamAgentResponse requires an async iterable or an object with toStream().");
}

function rawResponseData(event: unknown): UnknownRecord | null {
  if (!isRecord(event)) {
    return null;
  }

  if (
    (event.type === "raw_response_event" || event.type === "raw_model_stream_event") &&
    isRecord(event.data)
  ) {
    return event.data;
  }

  if (typeof event.type === "string" && event.type.startsWith("response.")) {
    return event;
  }

  return null;
}

function partKey(itemId: string, contentIndex: number): string {
  return `${itemId}:${contentIndex}`;
}

function assistantItem<TContext>(
  context: AgentContext<TContext>,
  itemId: string,
  content: AssistantMessageContent[],
): Extract<ThreadStreamEvent, { type: "thread.item.added" }>["item"] {
  return {
    id: itemId,
    thread_id: context.thread.id,
    created_at: context.createdAt(),
    type: "assistant_message",
    content,
  };
}

function assistantContentFromItem(
  item: UnknownRecord,
  fallbackText: string,
): AssistantMessageContent[] {
  const rawContent = Array.isArray(item.content) ? item.content : [];
  const content = rawContent.flatMap((part) => {
    if (!isRecord(part)) {
      return [];
    }

    const text = stringValue(part.text);

    if (text === null) {
      return [];
    }

    return [{ type: "output_text" as const, text, annotations: [] }];
  });

  if (content.length > 0) {
    return content;
  }

  return fallbackText.length > 0
    ? [{ type: "output_text", text: fallbackText, annotations: [] }]
    : [];
}

function trackToolCallMetadata(event: unknown): ToolCallMetadata | null {
  if (!isRecord(event) || event.type !== "run_item_stream_event" || !isRecord(event.item)) {
    return null;
  }

  const item = event.item;

  if (item.type !== "tool_call_item") {
    return null;
  }

  const rawItem = isRecord(item.raw_item)
    ? item.raw_item
    : isRecord(item.rawItem)
      ? item.rawItem
      : item;

  return {
    itemId: stringValue(rawItem.id) ?? stringValue(item.id),
    callId:
      stringValue(rawItem.call_id) ??
      stringValue(rawItem.callId) ??
      stringValue(item.call_id) ??
      stringValue(item.callId),
  };
}

async function settledResult<T>(promise: Promise<IteratorResult<T>>): Promise<IteratorResult<T> | null> {
  const notReady = Symbol("notReady");
  const result = await Promise.race([promise, Promise.resolve(notReady)]);
  return result === notReady ? null : (result as IteratorResult<T>);
}

function convertSdkEvent<TContext>(
  context: AgentContext<TContext>,
  state: AssistantTextState,
  event: unknown,
): ThreadStreamEvent[] {
  const rawData = rawResponseData(event);

  if (!rawData) {
    return [];
  }

  switch (rawData.type) {
    case "response.output_item.added": {
      const item = isRecord(rawData.item) ? rawData.item : null;

      if (!item || item.type !== "message") {
        return [];
      }

      const itemId =
        stringValue(item.id) ?? context.store.generateItemId("message", context.thread, context.context);
      state.activeItemId = itemId;

      return [
        {
          type: "thread.item.added",
          item: assistantItem(context, itemId, []),
        },
      ];
    }

    case "response.output_text.delta": {
      const itemId = stringValue(rawData.item_id) ?? state.activeItemId;

      if (!itemId) {
        return [];
      }

      const contentIndex = numberValue(rawData.content_index) ?? 0;
      const delta = stringValue(rawData.delta) ?? "";
      const key = partKey(itemId, contentIndex);
      state.textByPart.set(key, `${state.textByPart.get(key) ?? ""}${delta}`);

      return [
        {
          type: "thread.item.updated",
          item_id: itemId,
          update: {
            type: "assistant_message.content_part.text_delta",
            content_index: contentIndex,
            delta,
          },
        },
      ];
    }

    case "response.output_text.done": {
      const itemId = stringValue(rawData.item_id) ?? state.activeItemId;

      if (!itemId) {
        return [];
      }

      const contentIndex = numberValue(rawData.content_index) ?? 0;
      const text = stringValue(rawData.text) ?? state.textByPart.get(partKey(itemId, contentIndex)) ?? "";

      return [
        {
          type: "thread.item.updated",
          item_id: itemId,
          update: {
            type: "assistant_message.content_part.done",
            content_index: contentIndex,
            content: { type: "output_text", text, annotations: [] },
          },
        },
      ];
    }

    case "response.output_item.done": {
      const item = isRecord(rawData.item) ? rawData.item : null;

      if (!item || item.type !== "message") {
        return [];
      }

      const itemId = stringValue(item.id) ?? state.activeItemId;

      if (!itemId) {
        return [];
      }

      const fallbackText = state.textByPart.get(partKey(itemId, 0)) ?? "";

      return [
        {
          type: "thread.item.done",
          item: assistantItem(context, itemId, assistantContentFromItem(item, fallbackText)),
        },
      ];
    }

    default:
      return [];
  }
}

function pendingClientToolCallEvent<TContext>(
  context: AgentContext<TContext>,
  metadata: ToolCallMetadata | null,
): ThreadStreamEvent | null {
  const toolCall = context.getClientToolCall();

  if (!toolCall) {
    return null;
  }

  const fallbackId = context.store.generateItemId("tool_call", context.thread, context.context);
  const id = metadata?.itemId ?? fallbackId;

  return {
    type: "thread.item.done",
    item: {
      id,
      thread_id: context.thread.id,
      created_at: context.createdAt(),
      type: "client_tool_call",
      status: "pending",
      call_id: metadata?.callId ?? id,
      name: toolCall.name,
      arguments: toolCall.arguments,
    },
  };
}

export async function* streamAgentResponse<TContext>(
  context: AgentContext<TContext>,
  streamedRun: AgentStreamInput | AsyncIterable<unknown>,
): AsyncIterable<ThreadStreamEvent> {
  const sdkIterator = normalizeStream(streamedRun)[Symbol.asyncIterator]();
  const contextIterator = context.events()[Symbol.asyncIterator]();
  const state: AssistantTextState = { activeItemId: null, textByPart: new Map() };
  let latestToolCallMetadata: ToolCallMetadata | null = null;
  let sdkDone = false;
  let contextDone = false;
  let sdkNext = sdkIterator.next();
  let contextNext = contextIterator.next();

  try {
    while (!sdkDone || !contextDone) {
      if (!contextDone) {
        const readyContextResult = await settledResult(contextNext);

        if (readyContextResult) {
          if (readyContextResult.done) {
            contextDone = true;
          } else {
            contextNext = contextIterator.next();
            yield ThreadStreamEventSchema.parse(readyContextResult.value);
          }
          continue;
        }
      }

      const contenders: Array<Promise<{ source: "sdk" | "context"; result: IteratorResult<unknown> }>> = [];

      if (!contextDone) {
        contenders.push(contextNext.then((result) => ({ source: "context", result })));
      }

      if (!sdkDone) {
        contenders.push(sdkNext.then((result) => ({ source: "sdk", result })));
      }

      if (contenders.length === 0) {
        break;
      }

      const next = await Promise.race(contenders);

      if (next.source === "context") {
        if (next.result.done) {
          contextDone = true;
        } else {
          contextNext = contextIterator.next();
          yield ThreadStreamEventSchema.parse(next.result.value);
        }
        continue;
      }

      if (next.result.done) {
        sdkDone = true;
        context.closeEvents();
        continue;
      }

      sdkNext = sdkIterator.next();
      latestToolCallMetadata = trackToolCallMetadata(next.result.value) ?? latestToolCallMetadata;

      for (const event of convertSdkEvent(context, state, next.result.value)) {
        yield ThreadStreamEventSchema.parse(event);
      }
    }

    const clientToolCallEvent = pendingClientToolCallEvent(context, latestToolCallMetadata);

    if (clientToolCallEvent) {
      yield ThreadStreamEventSchema.parse(clientToolCallEvent);
    }
  } finally {
    context.closeEvents();
    await sdkIterator.return?.();
    await contextIterator.return?.();
  }
}
