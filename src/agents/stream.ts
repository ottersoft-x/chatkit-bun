import type { AssistantMessageContent } from "../types/core";
import { ThreadStreamEventSchema, type ThreadStreamEvent } from "../types/server";
import type { AgentContext } from "./context";
import type { AgentStreamInput, ToolCallMetadata } from "./types";

type UnknownRecord = Record<string, unknown>;

interface AssistantTextState {
  activeItemId: string | null;
  textByPart: Map<string, string>;
}

type StreamSource = "sdk" | "context";

interface TaggedNextResult<T> {
  source: StreamSource;
  result: IteratorResult<T>;
}

interface TaggedNext<T> {
  promise: Promise<TaggedNextResult<T>>;
  result: TaggedNextResult<T> | null;
}

interface NamedToolCallMetadata {
  name: string;
  metadata: ToolCallMetadata;
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

function firstStringValue(...values: unknown[]): string | null {
  for (const value of values) {
    const text = stringValue(value);

    if (text !== null) {
      return text;
    }
  }

  return null;
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
    if (event.data.type === "model" && isRecord(event.data.event)) {
      return rawResponseData(event.data.event);
    }

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

function clearAssistantTextState(state: AssistantTextState, itemId: string): void {
  for (const key of state.textByPart.keys()) {
    if (key.startsWith(`${itemId}:`)) {
      state.textByPart.delete(key);
    }
  }

  if (state.activeItemId === itemId) {
    state.activeItemId = null;
  }
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

function firstAssistantMessageOutput(response: UnknownRecord): UnknownRecord | null {
  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    if (
      isRecord(item) &&
      item.type === "message" &&
      (item.role === undefined || item.role === "assistant")
    ) {
      return item;
    }
  }

  return null;
}

function ensureAssistantMessageAdded<TContext>(
  context: AgentContext<TContext>,
  state: AssistantTextState,
): Extract<ThreadStreamEvent, { type: "thread.item.added" }> {
  const itemId = context.store.generateItemId("message", context.thread, context.context);
  state.activeItemId = itemId;

  return {
    type: "thread.item.added",
    item: assistantItem(context, itemId, []),
  };
}

function toolCallName(item: UnknownRecord, rawItem: UnknownRecord): string | null {
  return firstStringValue(
    rawItem.name,
    rawItem.toolName,
    rawItem.tool_name,
    item.toolName,
    item.tool_name,
    item.name,
  );
}

function toolCallMetadata(event: unknown): NamedToolCallMetadata | null {
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

  const name = toolCallName(item, rawItem);

  if (name === null) {
    return null;
  }

  return {
    name,
    metadata: {
      itemId: firstStringValue(rawItem.id, item.id),
      callId: firstStringValue(rawItem.call_id, rawItem.callId, item.call_id, item.callId),
    },
  };
}

function tagNext<T>(source: StreamSource, promise: PromiseLike<IteratorResult<T>>): TaggedNext<T> {
  const tagged: TaggedNext<T> = {
    promise: Promise.resolve(null as never),
    result: null,
  };

  tagged.promise = Promise.resolve(promise).then((result) => {
    const taggedResult = { source, result };
    tagged.result = taggedResult;
    return taggedResult;
  });
  tagged.promise.catch(() => undefined);

  return tagged;
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
    case "output_text_delta": {
      const events: ThreadStreamEvent[] = [];
      const explicitItemId = stringValue(rawData.item_id);
      let itemId = explicitItemId ?? state.activeItemId;

      if (!itemId) {
        const added = ensureAssistantMessageAdded(context, state);
        events.push(added);
        itemId = added.item.id;
      }
      state.activeItemId ??= itemId;

      const contentIndex = numberValue(rawData.content_index) ?? 0;
      const delta = stringValue(rawData.delta) ?? "";
      const key = partKey(itemId, contentIndex);
      state.textByPart.set(key, `${state.textByPart.get(key) ?? ""}${delta}`);

      events.push({
        type: "thread.item.updated",
        item_id: itemId,
        update: {
          type: "assistant_message.content_part.text_delta",
          content_index: contentIndex,
          delta,
        },
      });

      return events;
    }

    case "response_done": {
      const response = isRecord(rawData.response) ? rawData.response : rawData;
      const item = firstAssistantMessageOutput(response);
      if (!item) {
        return [];
      }

      const itemId =
        state.activeItemId ??
        stringValue(item.id) ??
        stringValue(response.id) ??
        context.store.generateItemId("message", context.thread, context.context);
      const fallbackText = state.textByPart.get(partKey(itemId, 0)) ?? "";
      const doneEvent: ThreadStreamEvent = {
        type: "thread.item.done",
        item: assistantItem(
          context,
          itemId,
          assistantContentFromItem(item, fallbackText),
        ),
      };

      clearAssistantTextState(state, itemId);

      return [doneEvent];
    }

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
  metadataByToolName: ReadonlyMap<string, ToolCallMetadata>,
): ThreadStreamEvent | null {
  const toolCall = context.getClientToolCall();

  if (!toolCall) {
    return null;
  }

  const metadata = metadataByToolName.get(toolCall.name) ?? null;
  const id =
    metadata?.itemId ?? context.store.generateItemId("tool_call", context.thread, context.context);

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
  const toolCallMetadataByName = new Map<string, ToolCallMetadata>();
  let sdkDone = false;
  let contextDone = false;
  let sdkNext = tagNext("sdk", sdkIterator.next());
  let contextNext = tagNext("context", contextIterator.next());

  try {
    while (!sdkDone || !contextDone) {
      await Promise.resolve();

      if (!contextDone && contextNext.result) {
        if (contextNext.result.result.done) {
          contextDone = true;
        } else {
          const value = contextNext.result.result.value;
          contextNext = tagNext("context", contextIterator.next());
          yield ThreadStreamEventSchema.parse(value);
        }
        continue;
      }

      const contenders: Array<Promise<TaggedNextResult<unknown>>> = [];

      if (!contextDone) {
        contenders.push(contextNext.promise);
      }

      if (!sdkDone) {
        contenders.push(sdkNext.promise);
      }

      if (contenders.length === 0) {
        break;
      }

      const next = await Promise.race(contenders);

      if (next.source === "sdk" && !contextDone) {
        await Promise.resolve();

        if (contextNext.result) {
          if (contextNext.result.result.done) {
            contextDone = true;
          } else {
            const value = contextNext.result.result.value;
            contextNext = tagNext("context", contextIterator.next());
            yield ThreadStreamEventSchema.parse(value);
            continue;
          }
        }
      }

      if (next.source === "context") {
        if (next.result.done) {
          contextDone = true;
        } else {
          contextNext = tagNext("context", contextIterator.next());
          yield ThreadStreamEventSchema.parse(next.result.value);
        }
        continue;
      }

      if (next.result.done) {
        sdkDone = true;
        context.closeEvents();
        continue;
      }

      sdkNext = tagNext("sdk", sdkIterator.next());
      const metadata = toolCallMetadata(next.result.value);

      if (metadata) {
        toolCallMetadataByName.set(metadata.name, metadata.metadata);
      }

      for (const event of convertSdkEvent(context, state, next.result.value)) {
        yield ThreadStreamEventSchema.parse(event);
      }
    }

    const clientToolCallEvent = pendingClientToolCallEvent(context, toolCallMetadataByName);

    if (clientToolCallEvent) {
      yield ThreadStreamEventSchema.parse(clientToolCallEvent);
    }
  } finally {
    context.closeEvents();
    await sdkIterator.return?.();
    await contextIterator.return?.();
  }
}
