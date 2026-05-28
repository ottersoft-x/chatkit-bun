import type { AssistantMessageContent, ThreadItem } from "../types/core";
import { ThreadStreamEventSchema, type ThreadStreamEvent } from "../types/server";
import { convertTextContentPart, defaultResponseStreamConverter } from "./annotations";
import type { ResponseStreamConverter } from "./annotations";
import type { AgentContext } from "./context";
import type { AgentStreamInput, StreamAgentResponseOptions, ToolCallMetadata } from "./types";
import {
  appendWorkflowTask,
  createReasoningWorkflowItem,
  createThoughtTask,
  finishWorkflow,
  isWorkflowItem,
  persistOpenWorkflow,
  resumeWorkflowFromThreadItems,
  shouldAutoEndWorkflowForItem,
  type ThoughtTask,
  updateWorkflowTaskEvent,
  workflowAddedEvent,
} from "./workflows";

type UnknownRecord = Record<string, unknown>;

type GeneratedImageItem = Extract<ThreadItem, { type: "generated_image" }>;

interface GeneratedImageState {
  callId: string | null;
  item: GeneratedImageItem;
}

interface StreamingThoughtState {
  itemId: string | null;
  summaryIndex: number;
  task: ThoughtTask;
}

interface AssistantTextState {
  activeItemId: string | null;
  textByPart: Map<string, string>;
  annotationCountByPart: Map<string, number>;
  generatedImage: GeneratedImageState | null;
  streamingThought: StreamingThoughtState | null;
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

function nextAnnotationIndex(state: AssistantTextState, itemId: string, contentIndex: number): number {
  const key = partKey(itemId, contentIndex);
  const index = state.annotationCountByPart.get(key) ?? 0;
  state.annotationCountByPart.set(key, index + 1);
  return index;
}

function clearAssistantTextState(state: AssistantTextState, itemId: string): void {
  for (const key of state.textByPart.keys()) {
    if (key.startsWith(`${itemId}:`)) {
      state.textByPart.delete(key);
    }
  }

  for (const key of state.annotationCountByPart.keys()) {
    if (key.startsWith(`${itemId}:`)) {
      state.annotationCountByPart.delete(key);
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

function generatedImageItem<TContext>(
  context: AgentContext<TContext>,
  itemId: string,
  image: GeneratedImageItem["image"],
): GeneratedImageItem {
  return {
    id: itemId,
    thread_id: context.thread.id,
    created_at: context.createdAt(),
    type: "generated_image",
    image,
  };
}

function matchingStreamingThought(
  state: AssistantTextState,
  itemId: string | null,
  summaryIndex: number,
): StreamingThoughtState | null {
  const streamingThought = state.streamingThought;

  if (
    streamingThought &&
    streamingThought.itemId === itemId &&
    streamingThought.summaryIndex === summaryIndex
  ) {
    return streamingThought;
  }

  return null;
}

function assistantContentFromItem(
  item: UnknownRecord,
  fallbackText: string,
  converter: ResponseStreamConverter,
): AssistantMessageContent[] {
  const rawContent = Array.isArray(item.content) ? item.content : [];
  const content = rawContent.flatMap((part) => {
    const converted = convertTextContentPart(part, converter);
    return converted ? [converted] : [];
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
): { itemId: string; events: ThreadStreamEvent[] } {
  const itemId = context.store.generateItemId("message", context.thread, context.context);

  return {
    itemId,
    events: assistantMessageAddedEvents(context, state, itemId),
  };
}

function assistantMessageAddedEvents<TContext>(
  context: AgentContext<TContext>,
  state: AssistantTextState,
  itemId: string,
): ThreadStreamEvent[] {
  state.activeItemId = itemId;
  const events: ThreadStreamEvent[] = [];
  const workflowDone = finishWorkflow(context);

  if (workflowDone) {
    events.push(workflowDone);
  }

  events.push({
    type: "thread.item.added",
    item: assistantItem(context, itemId, []),
  });

  return events;
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

async function convertSdkEvent<TContext>(
  context: AgentContext<TContext>,
  state: AssistantTextState,
  event: unknown,
  converter: ResponseStreamConverter,
): Promise<ThreadStreamEvent[]> {
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
        events.push(...added.events);
        itemId = added.itemId;
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
          assistantContentFromItem(item, fallbackText, converter),
        ),
      };

      clearAssistantTextState(state, itemId);

      return [doneEvent];
    }

    case "response.output_item.added": {
      const item = isRecord(rawData.item) ? rawData.item : null;

      if (!item) {
        return [];
      }

      if (item.type === "reasoning") {
        if (context.workflowItem) {
          return [];
        }

        const workflow = createReasoningWorkflowItem(context);
        context.workflowItem = workflow;

        return [workflowAddedEvent(workflow)];
      }

      if (item.type === "image_generation_call") {
        const callId = stringValue(item.id);
        const itemId = context.store.generateItemId("message", context.thread, context.context);
        const generated = generatedImageItem(context, itemId, null);
        state.generatedImage = { callId, item: generated };

        return [
          {
            type: "thread.item.added",
            item: generated,
          },
        ];
      }

      if (item.type !== "message") {
        return [];
      }

      const itemId =
        stringValue(item.id) ?? context.store.generateItemId("message", context.thread, context.context);
      return assistantMessageAddedEvents(context, state, itemId);
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

    case "response.reasoning_summary_text.delta": {
      const workflow = context.workflowItem;
      const itemId = stringValue(rawData.item_id);
      const summaryIndex = numberValue(rawData.summary_index);
      const delta = stringValue(rawData.delta) ?? "";

      if (!workflow || summaryIndex === null) {
        return [];
      }

      if (workflow.workflow.type === "reasoning" && workflow.workflow.tasks.length === 0) {
        const task = createThoughtTask(delta);
        const event = appendWorkflowTask(workflow, task);
        state.streamingThought = { itemId, summaryIndex, task: workflow.workflow.tasks[0] as ThoughtTask };

        return [event];
      }

      const streamingThought = matchingStreamingThought(state, itemId, summaryIndex);

      if (!streamingThought) {
        return [];
      }

      streamingThought.task.content += delta;
      const taskIndex = workflow.workflow.tasks.indexOf(streamingThought.task);

      if (taskIndex < 0) {
        return [];
      }

      const event = updateWorkflowTaskEvent(workflow, streamingThought.task, taskIndex);
      streamingThought.task = workflow.workflow.tasks[taskIndex] as ThoughtTask;

      return [event];
    }

    case "response.reasoning_summary_text.done": {
      const workflow = context.workflowItem;
      const itemId = stringValue(rawData.item_id);
      const summaryIndex = numberValue(rawData.summary_index);
      const text = stringValue(rawData.text) ?? "";

      if (!workflow || summaryIndex === null) {
        return [];
      }

      const streamingThought = matchingStreamingThought(state, itemId, summaryIndex);

      if (streamingThought) {
        streamingThought.task.content = text;
        state.streamingThought = null;
        const taskIndex = workflow.workflow.tasks.indexOf(streamingThought.task);

        if (taskIndex < 0) {
          return [];
        }

        return [updateWorkflowTaskEvent(workflow, streamingThought.task, taskIndex)];
      }

      const task = createThoughtTask(text);
      return [appendWorkflowTask(workflow, task)];
    }

    case "response.image_generation_call.partial_image": {
      const imageId = stringValue(rawData.item_id);
      const base64Image = stringValue(rawData.partial_image_b64);
      const partialImageIndex = numberValue(rawData.partial_image_index);
      const generatedImage = state.generatedImage;

      if (!generatedImage || !imageId || !base64Image || partialImageIndex === null) {
        return [];
      }

      if (generatedImage.callId !== null && imageId !== generatedImage.callId) {
        return [];
      }

      const image = {
        id: imageId,
        url: await converter.base64ImageToUrl(imageId, base64Image, partialImageIndex),
      };
      state.generatedImage = { ...generatedImage, item: { ...generatedImage.item, image } };

      return [
        {
          type: "thread.item.updated",
          item_id: generatedImage.item.id,
          update: {
            type: "generated_image.updated",
            image,
            progress: converter.partialImageIndexToProgress(partialImageIndex),
          },
        },
      ];
    }

    case "response.output_text.annotation.added": {
      const itemId = stringValue(rawData.item_id) ?? state.activeItemId;
      if (!itemId) {
        return [];
      }

      const annotation = converter.convertAnnotation(rawData.annotation);
      if (!annotation) {
        return [];
      }

      const contentIndex = numberValue(rawData.content_index) ?? 0;

      return [
        {
          type: "thread.item.updated",
          item_id: itemId,
          update: {
            type: "assistant_message.content_part.annotation_added",
            content_index: contentIndex,
            annotation_index: nextAnnotationIndex(state, itemId, contentIndex),
            annotation,
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

      if (!item) {
        return [];
      }

      if (item.type === "image_generation_call") {
        const imageId = stringValue(item.id);
        const result = stringValue(item.result);
        const generatedImage = state.generatedImage;

        if (!generatedImage) {
          return [];
        }

        if (generatedImage.callId !== null && imageId !== generatedImage.callId) {
          return [];
        }

        if (!result) {
          state.generatedImage = null;
          return [];
        }

        if (!imageId) {
          state.generatedImage = null;
          return [];
        }

        const image = {
          id: imageId,
          url: await converter.base64ImageToUrl(imageId, result, null),
        };
        const doneItem = { ...generatedImage.item, image };
        state.generatedImage = null;

        return [
          {
            type: "thread.item.done",
            item: doneItem,
          },
        ];
      }

      if (item.type !== "message") {
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
          item: assistantItem(context, itemId, assistantContentFromItem(item, fallbackText, converter)),
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

function contextEventsWithWorkflowLifecycle<TContext>(
  context: AgentContext<TContext>,
  event: ThreadStreamEvent,
): ThreadStreamEvent[] {
  if (event.type !== "thread.item.added" && event.type !== "thread.item.done") {
    return [event];
  }

  const events: ThreadStreamEvent[] = [];

  if (shouldAutoEndWorkflowForItem(context, event.item)) {
    const workflowDone = finishWorkflow(context);

    if (workflowDone) {
      events.push(workflowDone);
    }
  }

  if (
    event.type === "thread.item.added" &&
    isWorkflowItem(event.item) &&
    context.workflowItem?.id !== event.item.id
  ) {
    context.workflowItem = event.item;
  }

  if (
    event.type === "thread.item.done" &&
    isWorkflowItem(event.item) &&
    context.workflowItem?.id === event.item.id
  ) {
    context.workflowItem = null;
  }

  events.push(event);
  return events;
}

export async function* streamAgentResponse<TContext>(
  context: AgentContext<TContext>,
  streamedRun: AgentStreamInput | AsyncIterable<unknown>,
  options: StreamAgentResponseOptions = {},
): AsyncIterable<ThreadStreamEvent> {
  const converter = options.converter ?? defaultResponseStreamConverter;
  const recentItems = await context.store.loadThreadItems(
    context.thread.id,
    null,
    2,
    "desc",
    context.context,
  );
  resumeWorkflowFromThreadItems(context, recentItems.data);

  const sdkIterator = normalizeStream(streamedRun)[Symbol.asyncIterator]();
  const contextIterator = context.events()[Symbol.asyncIterator]();
  const state: AssistantTextState = {
    activeItemId: null,
    textByPart: new Map(),
    annotationCountByPart: new Map(),
    generatedImage: null,
    streamingThought: null,
  };
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
          for (const event of contextEventsWithWorkflowLifecycle(context, value)) {
            yield ThreadStreamEventSchema.parse(event);
          }
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
            for (const event of contextEventsWithWorkflowLifecycle(context, value)) {
              yield ThreadStreamEventSchema.parse(event);
            }
            continue;
          }
        }
      }

      if (next.source === "context") {
        if (next.result.done) {
          contextDone = true;
        } else {
          contextNext = tagNext("context", contextIterator.next());
          const value = ThreadStreamEventSchema.parse(next.result.value);

          for (const event of contextEventsWithWorkflowLifecycle(context, value)) {
            yield ThreadStreamEventSchema.parse(event);
          }
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

      for (const event of await convertSdkEvent(context, state, next.result.value, converter)) {
        yield ThreadStreamEventSchema.parse(event);
      }
    }

    await persistOpenWorkflow(context);
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
