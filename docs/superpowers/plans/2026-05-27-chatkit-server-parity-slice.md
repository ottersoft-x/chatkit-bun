# ChatKit Server Parity Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first `ChatKitServer.process(...)` parity slice for the private Bun port, matching the relevant `chatkit-python` server behavior while preserving the path to full feature parity.

**Architecture:** Expand shared thread item schemas in `src/types/core.ts`, add server-specific request/event schemas in `src/types/server.ts`, and implement a subclass-first `ChatKitServer<TContext>` in `src/server.ts`. Tests should be parity-led translations from `packages/chatkit-python/tests/test_chatkit_server.py`, with widget runtime and Agents SDK conversion intentionally left to later milestones.

**Tech Stack:** Bun, TypeScript, Zod, `bun:test`, `bun:sqlite`, existing `Store<TContext>`/`AttachmentStore<TContext>`, Web-standard async iterables and `Uint8Array` JSON bytes.

---

## Scope Check

The approved spec covers one subsystem: the server request/response parity layer. It touches schemas, server dispatch, persistence behavior, and translated tests, but all work produces a single usable API surface: `ChatKitServer.process(...)`. Widget builders/templates/diffing, Bun HTTP routing, Agents SDK conversion, and upstream sync automation stay outside this plan.

## File Structure

- Modify: `src/types/core.ts`
  - Add shared content/source/task/workflow/structured-input/generated-image schemas.
  - Expand `ThreadItemSchema` so stores and server responses use one union.
- Create: `src/types/server.ts`
  - Add request params, request unions, request parsing, stream event schemas, item update schemas, transcription types, and server response helpers.
- Create: `src/server.ts`
  - Add `StreamingResult`, `NonStreamingResult`, and `ChatKitServer<TContext>`.
  - Implement parsing, streaming/non-streaming dispatch, event persistence, hidden item filtering, cancellation, and hook defaults.
- Modify: `src/index.ts`
  - Export `src/server.ts` and `src/types/server.ts`.
- Modify: `tests/types.test.ts`
  - Cover expanded core schemas.
- Create: `tests/server-types.test.ts`
  - Cover request/event parsing and streaming classification.
- Create: `tests/server.test.ts`
  - Translate relevant server behavior from Python.
- Modify: `tests/exports.test.ts`
  - Assert new public server exports.

## Parity Reference

Use these upstream files while executing:

- `packages/chatkit-python/chatkit/types.py`
- `packages/chatkit-python/chatkit/server.py`
- `packages/chatkit-python/tests/test_chatkit_server.py`

Do not import Python code at runtime. Python files are reference material for field names, request `type` values, event ordering, and observable behavior.

## Task 1: Expand Shared Core Schemas

**Files:**
- Modify: `src/types/core.ts`
- Modify: `tests/types.test.ts`

- [ ] **Step 1: Add failing schema tests for user/assistant content and new item variants**

Append these tests inside `describe("core schemas", ...)` in `tests/types.test.ts`:

```ts
test("parses user and assistant message content", () => {
  const user = UserMessageContentSchema.parse({ type: "input_text", text: "Hello" });
  expect(user).toEqual({ type: "input_text", text: "Hello" });

  const assistant = AssistantMessageContentSchema.parse({
    type: "output_text",
    text: "Hi",
    annotations: [],
  });
  expect(assistant.text).toBe("Hi");
});

test("parses structured input, generated image, task, and workflow items", () => {
  const created_at = "2026-05-27T00:00:00.000Z";
  expect(
    ThreadItemSchema.parse({
      id: "si_1",
      type: "structured_input",
      thread_id: "thr_1",
      created_at,
      status: "pending",
      inputs: [
        {
          id: "subject",
          type: "multiple_choice",
          question: "Subject?",
          options: [{ value: "Math" }],
          multiple: false,
        },
      ],
    }).type,
  ).toBe("structured_input");

  expect(
    ThreadItemSchema.parse({
      id: "img_1",
      type: "generated_image",
      thread_id: "thr_1",
      created_at,
      image: { id: "image", url: "https://example.com/image.png" },
    }).type,
  ).toBe("generated_image");

  expect(
    ThreadItemSchema.parse({
      id: "task_1",
      type: "task",
      thread_id: "thr_1",
      created_at,
      task: { type: "custom", title: "Step", content: "Working", status_indicator: "loading" },
    }).type,
  ).toBe("task");

  expect(
    ThreadItemSchema.parse({
      id: "wf_1",
      type: "workflow",
      thread_id: "thr_1",
      created_at,
      workflow: { type: "custom", tasks: [], expanded: false },
    }).type,
  ).toBe("workflow");
});
```

Update the import in `tests/types.test.ts` to include `AssistantMessageContentSchema` and `UserMessageContentSchema`.

- [ ] **Step 2: Run the core schema tests and verify they fail**

Run:

```bash
bun test tests/types.test.ts
```

Expected: FAIL because `UserMessageContentSchema`, `AssistantMessageContentSchema`, and the new thread item variants are not defined/exported yet.

- [ ] **Step 3: Add content, source, task, workflow, and structured input schemas**

In `src/types/core.ts`, add these schemas above `ThreadItemBaseSchema`:

```ts
export const SourceBaseSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  timestamp: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
});

export const FileSourceSchema = SourceBaseSchema.extend({
  type: z.literal("file"),
  filename: z.string(),
});

export const UrlSourceSchema = SourceBaseSchema.extend({
  type: z.literal("url"),
  url: z.string(),
  attribution: z.string().nullable().optional(),
});

export const EntitySourceSchema = SourceBaseSchema.extend({
  type: z.literal("entity"),
  id: z.string(),
  icon: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  inline_label: z.string().nullable().optional(),
  interactive: z.boolean().default(false),
  data: z.record(z.string(), z.unknown()).default({}),
  preview: z.literal("lazy").nullable().optional(),
});

export const SourceSchema = z.discriminatedUnion("type", [
  FileSourceSchema,
  UrlSourceSchema,
  EntitySourceSchema,
]);
export type Source = z.infer<typeof SourceSchema>;

export const AnnotationSchema = z.object({
  type: z.literal("annotation").default("annotation"),
  source: SourceSchema,
  index: z.number().int().nullable().optional(),
});
export type Annotation = z.infer<typeof AnnotationSchema>;

export const AssistantMessageContentSchema = z.object({
  type: z.literal("output_text").default("output_text"),
  text: z.string(),
  annotations: z.array(AnnotationSchema).default([]),
});
export type AssistantMessageContent = z.infer<typeof AssistantMessageContentSchema>;

export const UserMessageTextContentSchema = z.object({
  type: z.literal("input_text"),
  text: z.string(),
});

export const UserMessageTagContentSchema = z.object({
  type: z.literal("input_tag"),
  id: z.string(),
  text: z.string(),
  data: z.record(z.string(), z.unknown()),
  group: z.string().nullable().optional(),
  interactive: z.boolean().default(false),
});

export const UserMessageContentSchema = z.discriminatedUnion("type", [
  UserMessageTextContentSchema,
  UserMessageTagContentSchema,
]);
export type UserMessageContent = z.infer<typeof UserMessageContentSchema>;

export const ToolChoiceSchema = z.object({ id: z.string() });
export type ToolChoice = z.infer<typeof ToolChoiceSchema>;

export const InferenceOptionsSchema = z.object({
  tool_choice: ToolChoiceSchema.nullable().optional(),
  model: z.string().nullable().optional(),
});
export type InferenceOptions = z.infer<typeof InferenceOptionsSchema>;

const BaseTaskSchema = z.object({
  status_indicator: z.enum(["none", "loading", "complete"]).default("none"),
});

export const CustomTaskSchema = BaseTaskSchema.extend({
  type: z.literal("custom"),
  title: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
});

export const SearchTaskSchema = BaseTaskSchema.extend({
  type: z.literal("web_search"),
  title: z.string().nullable().optional(),
  title_query: z.string().nullable().optional(),
  queries: z.array(z.string()).default([]),
  sources: z.array(UrlSourceSchema).default([]),
});

export const ThoughtTaskSchema = BaseTaskSchema.extend({
  type: z.literal("thought"),
  title: z.string().nullable().optional(),
  content: z.string(),
});

export const FileTaskSchema = BaseTaskSchema.extend({
  type: z.literal("file"),
  title: z.string().nullable().optional(),
  sources: z.array(FileSourceSchema).default([]),
});

export const ImageTaskSchema = BaseTaskSchema.extend({
  type: z.literal("image"),
  title: z.string().nullable().optional(),
});

export const TaskSchema = z.discriminatedUnion("type", [
  CustomTaskSchema,
  SearchTaskSchema,
  ThoughtTaskSchema,
  FileTaskSchema,
  ImageTaskSchema,
]);
export type Task = z.infer<typeof TaskSchema>;

export const WorkflowSummarySchema = z.union([
  z.object({ title: z.string(), icon: z.string().nullable().optional() }),
  z.object({ duration: z.number().int() }),
]);

export const WorkflowSchema = z.object({
  type: z.enum(["custom", "reasoning"]),
  tasks: z.array(TaskSchema),
  summary: WorkflowSummarySchema.nullable().optional(),
  expanded: z.boolean().default(false),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

export const GeneratedImageSchema = z.object({
  id: z.string(),
  url: z.string(),
});
export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

export const StructuredInputAnswerSchema = z.object({
  values: z.array(z.string()).default([]),
  skipped: z.boolean().default(false),
});
export type StructuredInputAnswer = z.infer<typeof StructuredInputAnswerSchema>;

const StructuredInputBaseSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: StructuredInputAnswerSchema.nullable().optional(),
});

export const StructuredInputMultipleChoiceSchema = StructuredInputBaseSchema.extend({
  type: z.literal("multiple_choice"),
  options: z.array(z.object({ value: z.string() })),
  multiple: z.boolean().default(false),
});

export const StructuredInputFreeformSchema = StructuredInputBaseSchema.extend({
  type: z.literal("freeform"),
  description: z.string().nullable().optional(),
});

export const StructuredInputSchema = z.discriminatedUnion("type", [
  StructuredInputMultipleChoiceSchema,
  StructuredInputFreeformSchema,
]);
export type StructuredInput = z.infer<typeof StructuredInputSchema>;
```

- [ ] **Step 4: Update existing thread item schemas to use typed content**

In `src/types/core.ts`, change the existing item schemas to use these fields:

```ts
export const UserMessageItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("user_message"),
  content: z.array(UserMessageContentSchema),
  attachments: z.array(AttachmentSchema).default([]),
  quoted_text: z.string().nullable().optional(),
  inference_options: InferenceOptionsSchema.default({}),
});

export const AssistantMessageItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("assistant_message"),
  content: z.array(AssistantMessageContentSchema),
});
```

Add the missing item schemas below `WidgetItemSchema`:

```ts
export const GeneratedImageItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("generated_image"),
  image: GeneratedImageSchema.nullable().optional(),
});

export const StructuredInputItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("structured_input"),
  status: z.enum(["pending", "answered", "skipped"]).default("pending"),
  inputs: z.array(StructuredInputSchema),
});

export const TaskItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("task"),
  task: TaskSchema,
});

export const WorkflowItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("workflow"),
  workflow: WorkflowSchema,
});
```

Expand `ThreadItemSchema`:

```ts
export const ThreadItemSchema = z.discriminatedUnion("type", [
  UserMessageItemSchema,
  AssistantMessageItemSchema,
  ClientToolCallItemSchema,
  WidgetItemSchema,
  GeneratedImageItemSchema,
  StructuredInputItemSchema,
  TaskItemSchema,
  WorkflowItemSchema,
  HiddenContextItemSchema,
  SDKHiddenContextItemSchema,
  EndOfTurnItemSchema,
]);
```

- [ ] **Step 5: Run tests for core schemas and persistence compatibility**

Run:

```bash
bun test tests/types.test.ts tests/store.test.ts
```

Expected: PASS. If the SQLite store rejects any expanded item fixture, fix the relevant schema and rerun the same command.

- [ ] **Step 6: Commit core schema expansion**

```bash
git add src/types/core.ts tests/types.test.ts
git commit -m "Expand ChatKit core item schemas"
```

## Task 2: Add Server Request And Event Schemas

**Files:**
- Create: `src/types/server.ts`
- Create: `tests/server-types.test.ts`

- [ ] **Step 1: Write failing request and event schema tests**

Create `tests/server-types.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import {
  ChatKitRequestSchema,
  ThreadStreamEventSchema,
  isStreamingRequest,
} from "../src/types/server";

describe("server request schemas", () => {
  test("classifies streaming and non-streaming request types", () => {
    const streaming = ChatKitRequestSchema.parse({
      type: "threads.create",
      params: {
        input: {
          content: [{ type: "input_text", text: "Hello" }],
          attachments: [],
          inference_options: {},
        },
      },
      metadata: {},
    });
    expect(isStreamingRequest(streaming)).toBe(true);

    const nonStreaming = ChatKitRequestSchema.parse({
      type: "threads.list",
      params: { limit: 20, order: "desc", after: null },
      metadata: {},
    });
    expect(isStreamingRequest(nonStreaming)).toBe(false);
  });

  test("parses thread stream events and item updates", () => {
    const event = ThreadStreamEventSchema.parse({
      type: "thread.item.updated",
      item_id: "msg_1",
      update: {
        type: "assistant_message.content_part.text_delta",
        content_index: 0,
        delta: "Hello",
      },
    });
    expect(event.type).toBe("thread.item.updated");
  });

  test("rejects unknown request types", () => {
    expect(() => ChatKitRequestSchema.parse({ type: "missing", params: {} })).toThrow();
  });
});
```

- [ ] **Step 2: Run schema tests and verify they fail**

Run:

```bash
bun test tests/server-types.test.ts
```

Expected: FAIL because `src/types/server.ts` does not exist.

- [ ] **Step 3: Create `src/types/server.ts` imports and base types**

Create `src/types/server.ts` with these imports and foundational schemas:

```ts
import { z } from "zod";

import { ActionConfigSchema } from "../actions";
import {
  AssistantMessageContentSchema,
  GeneratedImageSchema,
  InferenceOptionsSchema,
  PageSchema,
  TaskSchema,
  ThreadItemSchema,
  ThreadMetadataSchema,
  UserMessageContentSchema,
} from "./core";

export const DEFAULT_PAGE_SIZE = 20;

export const FeedbackKindSchema = z.enum(["positive", "negative"]);
export type FeedbackKind = z.infer<typeof FeedbackKindSchema>;

export const StreamOptionsSchema = z.object({
  allow_cancel: z.boolean(),
});
export type StreamOptions = z.infer<typeof StreamOptionsSchema>;

export const UserMessageInputSchema = z.object({
  content: z.array(UserMessageContentSchema),
  attachments: z.array(z.string()),
  quoted_text: z.string().nullable().optional(),
  inference_options: InferenceOptionsSchema,
});
export type UserMessageInput = z.infer<typeof UserMessageInputSchema>;
```

- [ ] **Step 4: Add request param and request union schemas**

In `src/types/server.ts`, add:

```ts
const BaseRequestSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const ThreadsCreateRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.create"),
  params: z.object({ input: UserMessageInputSchema }),
});

export const ThreadsAddUserMessageRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.add_user_message"),
  params: z.object({ thread_id: z.string(), input: UserMessageInputSchema }),
});

export const ThreadsAddClientToolOutputRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.add_client_tool_output"),
  params: z.object({ thread_id: z.string(), result: z.unknown() }),
});

export const StructuredInputAnswerSubmissionSchema = z.object({
  values: z.array(z.string()).default([]),
  skipped: z.boolean().default(false),
});

export const StructuredInputSubmissionSchema = z.object({
  status: z.enum(["answered", "skipped"]).default("answered"),
  answers: z.record(z.string(), StructuredInputAnswerSubmissionSchema).default({}),
});
export type StructuredInputSubmission = z.infer<typeof StructuredInputSubmissionSchema>;

export const ThreadsAddStructuredInputRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.add_structured_input"),
  params: z.object({
    thread_id: z.string(),
    item_id: z.string(),
    input: StructuredInputSubmissionSchema,
  }),
});

export const ThreadsRetryAfterItemRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.retry_after_item"),
  params: z.object({ thread_id: z.string(), item_id: z.string() }),
});

export const ThreadCustomActionParamsSchema = z.object({
  thread_id: z.string(),
  item_id: z.string().nullable().optional(),
  action: ActionConfigSchema,
});

export const ThreadsCustomActionRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.custom_action"),
  params: ThreadCustomActionParamsSchema,
});

export const ThreadsSyncCustomActionRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.sync_custom_action"),
  params: ThreadCustomActionParamsSchema,
});

export const ThreadsGetByIdRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.get_by_id"),
  params: z.object({ thread_id: z.string() }),
});

const PageParamsSchema = z.object({
  limit: z.number().int().positive().nullable().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  after: z.string().nullable().optional(),
});

export const ThreadsListRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.list"),
  params: PageParamsSchema,
});

export const ItemsListRequestSchema = BaseRequestSchema.extend({
  type: z.literal("items.list"),
  params: PageParamsSchema.extend({ thread_id: z.string() }),
});

export const ItemsFeedbackRequestSchema = BaseRequestSchema.extend({
  type: z.literal("items.feedback"),
  params: z.object({
    thread_id: z.string(),
    item_ids: z.array(z.string()),
    kind: FeedbackKindSchema,
  }),
});

export const AttachmentsCreateRequestSchema = BaseRequestSchema.extend({
  type: z.literal("attachments.create"),
  params: z.object({ name: z.string(), size: z.number().int(), mime_type: z.string() }),
});

export const AttachmentsDeleteRequestSchema = BaseRequestSchema.extend({
  type: z.literal("attachments.delete"),
  params: z.object({ attachment_id: z.string() }),
});

export const ThreadsUpdateRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.update"),
  params: z.object({ thread_id: z.string(), title: z.string() }),
});

export const ThreadsDeleteRequestSchema = BaseRequestSchema.extend({
  type: z.literal("threads.delete"),
  params: z.object({ thread_id: z.string() }),
});

export const InputTranscribeRequestSchema = BaseRequestSchema.extend({
  type: z.literal("input.transcribe"),
  params: z.object({ audio_base64: z.string(), mime_type: z.string() }),
});

export const StreamingRequestSchema = z.discriminatedUnion("type", [
  ThreadsCreateRequestSchema,
  ThreadsAddUserMessageRequestSchema,
  ThreadsAddClientToolOutputRequestSchema,
  ThreadsAddStructuredInputRequestSchema,
  ThreadsRetryAfterItemRequestSchema,
  ThreadsCustomActionRequestSchema,
]);
export type StreamingRequest = z.infer<typeof StreamingRequestSchema>;

export const NonStreamingRequestSchema = z.discriminatedUnion("type", [
  ThreadsGetByIdRequestSchema,
  ThreadsListRequestSchema,
  ItemsListRequestSchema,
  ItemsFeedbackRequestSchema,
  AttachmentsCreateRequestSchema,
  AttachmentsDeleteRequestSchema,
  ThreadsUpdateRequestSchema,
  ThreadsDeleteRequestSchema,
  InputTranscribeRequestSchema,
  ThreadsSyncCustomActionRequestSchema,
]);
export type NonStreamingRequest = z.infer<typeof NonStreamingRequestSchema>;

export const ChatKitRequestSchema = z.discriminatedUnion("type", [
  ...StreamingRequestSchema.options,
  ...NonStreamingRequestSchema.options,
]);
export type ChatKitRequest = z.infer<typeof ChatKitRequestSchema>;

export function isStreamingRequest(request: ChatKitRequest): request is StreamingRequest {
  return StreamingRequestSchema.safeParse(request).success;
}
```

- [ ] **Step 5: Add event and update schemas**

In `src/types/server.ts`, add:

```ts
export const ThreadSchema = ThreadMetadataSchema.extend({
  items: PageSchema(ThreadItemSchema),
});
export type Thread = z.infer<typeof ThreadSchema>;

export const ThreadCreatedEventSchema = z.object({
  type: z.literal("thread.created"),
  thread: ThreadSchema,
});

export const ThreadUpdatedEventSchema = z.object({
  type: z.literal("thread.updated"),
  thread: ThreadSchema,
});

export const ThreadItemAddedEventSchema = z.object({
  type: z.literal("thread.item.added"),
  item: ThreadItemSchema,
});

export const ThreadItemDoneEventSchema = z.object({
  type: z.literal("thread.item.done"),
  item: ThreadItemSchema,
});

export const ThreadItemRemovedEventSchema = z.object({
  type: z.literal("thread.item.removed"),
  item_id: z.string(),
});

export const ThreadItemReplacedEventSchema = z.object({
  type: z.literal("thread.item.replaced"),
  item: ThreadItemSchema,
});

export const AssistantMessageContentPartAddedSchema = z.object({
  type: z.literal("assistant_message.content_part.added"),
  content_index: z.number().int(),
  content: AssistantMessageContentSchema,
});

export const AssistantMessageContentPartTextDeltaSchema = z.object({
  type: z.literal("assistant_message.content_part.text_delta"),
  content_index: z.number().int(),
  delta: z.string(),
});

export const AssistantMessageContentPartAnnotationAddedSchema = z.object({
  type: z.literal("assistant_message.content_part.annotation_added"),
  content_index: z.number().int(),
  annotation_index: z.number().int(),
  annotation: AssistantMessageContentSchema.shape.annotations.element,
});

export const AssistantMessageContentPartDoneSchema = z.object({
  type: z.literal("assistant_message.content_part.done"),
  content_index: z.number().int(),
  content: AssistantMessageContentSchema,
});

export const WorkflowTaskAddedSchema = z.object({
  type: z.literal("workflow.task.added"),
  task_index: z.number().int(),
  task: TaskSchema,
});

export const WorkflowTaskUpdatedSchema = z.object({
  type: z.literal("workflow.task.updated"),
  task_index: z.number().int(),
  task: TaskSchema,
});

export const GeneratedImageUpdatedSchema = z.object({
  type: z.literal("generated_image.updated"),
  image: GeneratedImageSchema,
  progress: z.number().nullable().optional(),
});

export const WidgetRootUpdatedSchema = z.object({
  type: z.literal("widget.root.updated"),
  widget: z.record(z.string(), z.unknown()),
});

export const WidgetComponentUpdatedSchema = z.object({
  type: z.literal("widget.component.updated"),
  component_id: z.string(),
  component: z.record(z.string(), z.unknown()),
});

export const WidgetStreamingTextValueDeltaSchema = z.object({
  type: z.literal("widget.streaming_text.value_delta"),
  component_id: z.string(),
  delta: z.string(),
  done: z.boolean(),
});

export const ThreadItemUpdateSchema = z.discriminatedUnion("type", [
  AssistantMessageContentPartAddedSchema,
  AssistantMessageContentPartTextDeltaSchema,
  AssistantMessageContentPartAnnotationAddedSchema,
  AssistantMessageContentPartDoneSchema,
  WidgetStreamingTextValueDeltaSchema,
  WidgetComponentUpdatedSchema,
  WidgetRootUpdatedSchema,
  WorkflowTaskAddedSchema,
  WorkflowTaskUpdatedSchema,
  GeneratedImageUpdatedSchema,
]);
export type ThreadItemUpdate = z.infer<typeof ThreadItemUpdateSchema>;

export const ThreadItemUpdatedEventSchema = z.object({
  type: z.literal("thread.item.updated"),
  item_id: z.string(),
  update: ThreadItemUpdateSchema,
});

export const StreamOptionsEventSchema = z.object({
  type: z.literal("stream_options"),
  stream_options: StreamOptionsSchema,
});

export const ProgressUpdateEventSchema = z.object({
  type: z.literal("progress_update"),
  icon: z.string().nullable().optional(),
  text: z.string(),
});

export const ClientEffectEventSchema = z.object({
  type: z.literal("client_effect"),
  name: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const ErrorCodeSchema = z.enum(["stream_error", "custom"]);

export const ErrorEventSchema = z.object({
  type: z.literal("error"),
  code: ErrorCodeSchema.default("custom"),
  message: z.string().nullable().optional(),
  allow_retry: z.boolean().default(false),
});

export const NoticeEventSchema = z.object({
  type: z.literal("notice"),
  level: z.enum(["info", "warning", "danger"]),
  message: z.string(),
  title: z.string().nullable().optional(),
});

export const ThreadStreamEventSchema = z.discriminatedUnion("type", [
  ThreadCreatedEventSchema,
  ThreadUpdatedEventSchema,
  ThreadItemDoneEventSchema,
  ThreadItemAddedEventSchema,
  ThreadItemUpdatedEventSchema,
  ThreadItemRemovedEventSchema,
  ThreadItemReplacedEventSchema,
  StreamOptionsEventSchema,
  ProgressUpdateEventSchema,
  ClientEffectEventSchema,
  ErrorEventSchema,
  NoticeEventSchema,
]);
export type ThreadStreamEvent = z.infer<typeof ThreadStreamEventSchema>;

export const SyncCustomActionResponseSchema = z.object({
  updated_item: ThreadItemSchema.nullable().optional(),
});
export type SyncCustomActionResponse = z.infer<typeof SyncCustomActionResponseSchema>;

export const AudioInputSchema = z.object({
  data: z.instanceof(Uint8Array),
  mime_type: z.string(),
});
export type AudioInput = z.infer<typeof AudioInputSchema> & { readonly mediaType: string };

export const TranscriptionResultSchema = z.object({ text: z.string() });
export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;
```

If `AssistantMessageContentSchema.shape.annotations.element` is awkward with the installed Zod version, export `AnnotationSchema` from `src/types/core.ts` and import it directly.

- [ ] **Step 6: Run server type tests**

Run:

```bash
bun test tests/server-types.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit server schemas**

```bash
git add src/types/server.ts tests/server-types.test.ts src/types/core.ts
git commit -m "Add ChatKit server request schemas"
```

## Task 3: Add Server Result Wrappers And Base Class Skeleton

**Files:**
- Create: `src/server.ts`
- Create: `tests/server.test.ts`

- [ ] **Step 1: Write failing skeleton tests**

Create `tests/server.test.ts` with helpers and skeleton assertions:

```ts
import { describe, expect, test } from "bun:test";

import { UnsupportedOperationError } from "../src/errors";
import { ChatKitServer, NonStreamingResult, StreamingResult } from "../src/server";
import { SQLiteStore } from "../src/sqlite-store";
import type { ThreadItem, ThreadMetadata } from "../src/types/core";
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

const defaultContext: RequestContext = { user_id: "test_user" };

async function* emptyStream(): AsyncIterable<ThreadStreamEvent> {}

class TestServer extends ChatKitServer<RequestContext> {
  feedbackCalls: Array<{ threadId: string; itemIds: string[]; feedback: FeedbackKind; context: RequestContext }> = [];
  transcription?: (audioInput: AudioInput, context: RequestContext) => TranscriptionResult;

  constructor(
    readonly responder: (
      thread: ThreadMetadata,
      inputUserMessage: Extract<ThreadItem, { type: "user_message" }> | null,
      context: RequestContext,
    ) => AsyncIterable<ThreadStreamEvent> = () => emptyStream(),
  ) {
    super(new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id }));
  }

  override respond(
    thread: ThreadMetadata,
    inputUserMessage: Extract<ThreadItem, { type: "user_message" }> | null,
    context: RequestContext,
  ): AsyncIterable<ThreadStreamEvent> {
    return this.responder(thread, inputUserMessage, context);
  }

  override async addFeedback(
    threadId: string,
    itemIds: string[],
    feedback: FeedbackKind,
    context: RequestContext,
  ): Promise<void> {
    this.feedbackCalls.push({ threadId, itemIds, feedback, context });
  }

  override async transcribe(audioInput: AudioInput, context: RequestContext): Promise<TranscriptionResult> {
    if (!this.transcription) {
      return super.transcribe(audioInput, context);
    }
    return this.transcription(audioInput, context);
  }
}

async function decodeStream(result: StreamingResult): Promise<ThreadStreamEvent[]> {
  const events: ThreadStreamEvent[] = [];
  for await (const chunk of result.jsonEvents) {
    const text = new TextDecoder().decode(chunk);
    events.push(JSON.parse(text.slice("data: ".length).trim()));
  }
  return events;
}

describe("ChatKitServer skeleton", () => {
  test("returns non-streaming results for thread list requests", async () => {
    const server = new TestServer();
    const result = await server.process(
      JSON.stringify({ type: "threads.list", params: {}, metadata: {} }),
      defaultContext,
    );
    expect(result).toBeInstanceOf(NonStreamingResult);
  });

  test("returns streaming results for thread create requests", async () => {
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
    expect(await decodeStream(result)).toEqual(expect.any(Array));
  });

  test("default transcribe hook requires an override", async () => {
    const server = new TestServer();
    await expect(
      server.transcribe({ data: new Uint8Array(), mime_type: "audio/webm", mediaType: "audio/webm" }, defaultContext),
    ).rejects.toBeInstanceOf(UnsupportedOperationError);
  });
});
```

- [ ] **Step 2: Run skeleton tests and verify they fail**

Run:

```bash
bun test tests/server.test.ts
```

Expected: FAIL because `src/server.ts` does not exist.

- [ ] **Step 3: Create result wrappers and base class**

Create `src/server.ts`:

```ts
import { NotFoundError, UnsupportedOperationError, ValidationError } from "./errors";
import { decodeJsonBytes, encodeJsonBytes, serializeDate } from "./serialization";
import type { AttachmentStore, Store } from "./store";
import {
  type ThreadItem,
  type ThreadMetadata,
  ThreadMetadataSchema,
} from "./types/core";
import {
  ChatKitRequestSchema,
  DEFAULT_PAGE_SIZE,
  ThreadStreamEventSchema,
  TranscriptionResultSchema,
  isStreamingRequest,
  type AudioInput,
  type ChatKitRequest,
  type FeedbackKind,
  type NonStreamingRequest,
  type StreamOptions,
  type StreamingRequest,
  type SyncCustomActionResponse,
  type Thread,
  type ThreadStreamEvent,
  type UserMessageInput,
} from "./types/server";

export class StreamingResult implements AsyncIterable<Uint8Array> {
  constructor(readonly jsonEvents: AsyncIterable<Uint8Array>) {}

  async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
    yield* this.jsonEvents;
  }
}

export class NonStreamingResult {
  constructor(readonly json: Uint8Array) {}
}

export abstract class ChatKitServer<TContext = unknown> {
  constructor(
    readonly store: Store<TContext>,
    readonly attachmentStore: AttachmentStore<TContext> | null = null,
  ) {}

  abstract respond(
    thread: ThreadMetadata,
    inputUserMessage: Extract<ThreadItem, { type: "user_message" }> | null,
    context: TContext,
  ): AsyncIterable<ThreadStreamEvent>;

  async addFeedback(
    _threadId: string,
    _itemIds: string[],
    _feedback: FeedbackKind,
    _context: TContext,
  ): Promise<void> {}

  async transcribe(_audioInput: AudioInput, _context: TContext): Promise<{ text: string }> {
    throw new UnsupportedOperationError("transcribe() must be overridden to support the input.transcribe request.");
  }

  action(
    _thread: ThreadMetadata,
    _action: unknown,
    _sender: Extract<ThreadItem, { type: "widget" }> | null,
    _context: TContext,
  ): AsyncIterable<ThreadStreamEvent> {
    throw new UnsupportedOperationError("The action() method must be overridden to react to actions.");
  }

  async syncAction(
    _thread: ThreadMetadata,
    _action: unknown,
    _sender: Extract<ThreadItem, { type: "widget" }> | null,
    _context: TContext,
  ): Promise<SyncCustomActionResponse> {
    throw new UnsupportedOperationError("The syncAction() method must be overridden to react to sync actions.");
  }

  getStreamOptions(_thread: ThreadMetadata, _context: TContext): StreamOptions {
    return { allow_cancel: true };
  }

  async handleStreamCancelled(
    thread: ThreadMetadata,
    pendingItems: ThreadItem[],
    context: TContext,
  ): Promise<void> {
    for (const item of pendingItems) {
      if (item.type !== "assistant_message") continue;
      const isEmpty = item.content.length === 0 || item.content.every((content) => !content.text.trim());
      if (!isEmpty) {
        await this.store.addThreadItem(thread.id, item, context);
      }
    }

    await this.store.addThreadItem(
      thread.id,
      {
        id: this.store.generateItemId("sdk_hidden_context", thread, context),
        type: "sdk_hidden_context",
        thread_id: thread.id,
        created_at: new Date().toISOString(),
        content: "The user cancelled the stream. Stop responding to the prior request.",
      },
      context,
    );
  }

  async process(request: string | Uint8Array | ArrayBuffer, context: TContext): Promise<StreamingResult | NonStreamingResult> {
    const parsed = ChatKitRequestSchema.parse(decodeJsonBytes(request));
    if (isStreamingRequest(parsed)) {
      return new StreamingResult(this.processStreaming(parsed, context));
    }
    return new NonStreamingResult(await this.processNonStreaming(parsed, context));
  }

  protected async processNonStreaming(_request: NonStreamingRequest, _context: TContext): Promise<Uint8Array> {
    return encodeJsonBytes({});
  }

  protected async *processStreaming(request: StreamingRequest, context: TContext): AsyncIterable<Uint8Array> {
    for await (const event of this.processStreamingImpl(request, context)) {
      yield new TextEncoder().encode(`data: ${new TextDecoder().decode(this.serialize(event))}\n\n`);
    }
  }

  protected async *processStreamingImpl(_request: StreamingRequest, _context: TContext): AsyncIterable<ThreadStreamEvent> {}

  protected serialize(value: unknown): Uint8Array {
    return encodeJsonBytes(value);
  }
}
```

Keep unused imports only if later steps in the same task use them before committing; otherwise remove them so `bunx tsc --noEmit` stays clean.

- [ ] **Step 4: Run skeleton tests**

Run:

```bash
bun test tests/server.test.ts
```

Expected: PASS for the skeleton tests.

- [ ] **Step 5: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS. Fix strict TypeScript issues before committing.

- [ ] **Step 6: Commit server skeleton**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "Add ChatKit server skeleton"
```

## Task 4: Implement Non-Streaming Dispatch

**Files:**
- Modify: `src/server.ts`
- Modify: `tests/server.test.ts`

- [ ] **Step 1: Add failing tests for thread/list/item/feedback/update/delete dispatch**

Append tests that:

- Save two threads directly through `server.store`, call `threads.list`, decode `NonStreamingResult.json`, and assert a paginated page.
- Create a thread plus visible and hidden items, call `items.list`, and assert hidden items are filtered.
- Save a thread, call `threads.get_by_id`, and assert the returned thread has an `items` page.
- Call `items.feedback` and assert the override captured thread id, item ids, kind, and context.
- Call `threads.update`, then load the thread from the store and assert `title` changed.
- Call `threads.delete`, then assert `loadThread` rejects with `NotFoundError`.

Use this helper in `tests/server.test.ts`:

```ts
function decodeJson(result: NonStreamingResult): unknown {
  return JSON.parse(new TextDecoder().decode(result.json));
}
```

- [ ] **Step 2: Add failing tests for attachments and transcription**

Add a test attachment store class:

```ts
class TestAttachmentStore {
  created: Array<{ name: string; size: number; mime_type: string }> = [];
  deleted: string[] = [];

  async createAttachment(input: { name: string; size: number; mime_type: string }): Promise<any> {
    this.created.push(input);
    return {
      id: `atc_${this.created.length}`,
      type: input.mime_type.startsWith("image/") ? "image" : "file",
      name: input.name,
      mime_type: input.mime_type,
      ...(input.mime_type.startsWith("image/") ? { preview_url: "https://example.com/preview.png" } : {}),
      upload_descriptor: { url: "https://example.com/upload", method: "PUT", headers: {} },
      metadata: { source: "test" },
    };
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    this.deleted.push(attachmentId);
  }
}
```

Then add tests that:

- `attachments.create` returns the saved attachment and persists it.
- `attachments.delete` calls both attachment store and metadata store deletion.
- `attachments.create` without an attachment store rejects with the configured runtime error.
- `input.transcribe` decodes base64, exposes `mediaType` as the MIME type before `;`, and returns `{ text }`.

- [ ] **Step 3: Run non-streaming tests and verify they fail**

Run:

```bash
bun test tests/server.test.ts
```

Expected: FAIL because `processNonStreaming` still returns `{}`.

- [ ] **Step 4: Implement non-streaming dispatch**

Replace `processNonStreaming` in `src/server.ts` with a switch on `request.type`:

```ts
protected async processNonStreaming(request: NonStreamingRequest, context: TContext): Promise<Uint8Array> {
  switch (request.type) {
    case "threads.get_by_id":
      return this.serialize(this.toThreadResponse(await this.loadFullThread(request.params.thread_id, context)));
    case "threads.list": {
      const threads = await this.store.loadThreads(
        request.params.limit ?? DEFAULT_PAGE_SIZE,
        request.params.after ?? null,
        request.params.order,
        context,
      );
      return this.serialize({
        ...threads,
        data: threads.data.map((thread) => this.toThreadResponse(thread)),
      });
    }
    case "items.list": {
      const items = await this.store.loadThreadItems(
        request.params.thread_id,
        request.params.after ?? null,
        request.params.limit ?? DEFAULT_PAGE_SIZE,
        request.params.order,
        context,
      );
      return this.serialize({ ...items, data: items.data.filter((item) => !this.isHiddenItem(item)) });
    }
    case "items.feedback":
      await this.addFeedback(request.params.thread_id, request.params.item_ids, request.params.kind, context);
      return this.serialize({});
    case "attachments.create": {
      const attachmentStore = this.getAttachmentStore();
      const attachment = await attachmentStore.createAttachment(request.params, context);
      await this.store.saveAttachment(attachment, context);
      return this.serialize(attachment);
    }
    case "attachments.delete": {
      const attachmentStore = this.getAttachmentStore();
      await attachmentStore.deleteAttachment(request.params.attachment_id, context);
      await this.store.deleteAttachment(request.params.attachment_id, context);
      return this.serialize({});
    }
    case "threads.update": {
      const thread = await this.store.loadThread(request.params.thread_id, context);
      const updated = { ...thread, title: request.params.title };
      await this.store.saveThread(updated, context);
      return this.serialize(this.toThreadResponse(updated));
    }
    case "threads.delete":
      await this.store.deleteThread(request.params.thread_id, context);
      return this.serialize({});
    case "input.transcribe": {
      const data = Uint8Array.from(atob(request.params.audio_base64), (char) => char.charCodeAt(0));
      const audioInput = {
        data,
        mime_type: request.params.mime_type,
        get mediaType() {
          return request.params.mime_type.split(";", 1)[0] ?? request.params.mime_type;
        },
      };
      return this.serialize(TranscriptionResultSchema.parse(await this.transcribe(audioInput, context)));
    }
    case "threads.sync_custom_action":
      return this.serialize(await this.processSyncCustomAction(request, context));
  }
}
```

Add these private/protected helpers in `src/server.ts`:

```ts
private getAttachmentStore(): AttachmentStore<TContext> {
  if (!this.attachmentStore) {
    throw new Error("AttachmentStore is not configured. Provide an AttachmentStore to ChatKitServer to handle file operations.");
  }
  return this.attachmentStore;
}

protected async loadFullThread(threadId: string, context: TContext): Promise<Thread> {
  const thread = await this.store.loadThread(threadId, context);
  const items = await this.store.loadThreadItems(threadId, null, DEFAULT_PAGE_SIZE, "asc", context);
  return { ...thread, items };
}

protected toThreadResponse(thread: ThreadMetadata | Thread): Thread {
  const items = "items" in thread ? thread.items : { data: [], has_more: false };
  return {
    id: thread.id,
    title: thread.title,
    created_at: thread.created_at,
    status: thread.status,
    allowed_image_domains: thread.allowed_image_domains,
    items: { ...items, data: items.data.filter((item) => !this.isHiddenItem(item)) },
  };
}

protected isHiddenItem(item: ThreadItem): boolean {
  return item.type === "hidden_context_item" || item.type === "sdk_hidden_context";
}

protected async processSyncCustomAction(
  request: Extract<NonStreamingRequest, { type: "threads.sync_custom_action" }>,
  context: TContext,
): Promise<SyncCustomActionResponse> {
  const thread = await this.store.loadThread(request.params.thread_id, context);
  const sender = request.params.item_id
    ? await this.store.loadItem(request.params.thread_id, request.params.item_id, context)
    : null;
  if (sender && sender.type !== "widget") {
    throw new Error("threads.sync_custom_action requires a widget sender item");
  }
  return this.syncAction(thread, request.params.action, sender, context);
}
```

- [ ] **Step 5: Run non-streaming tests**

Run:

```bash
bun test tests/server.test.ts
```

Expected: PASS for the non-streaming tests added in this task.

- [ ] **Step 6: Commit non-streaming dispatch**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "Implement ChatKit non-streaming server dispatch"
```

## Task 5: Implement Thread Creation, Add Message, And Event Persistence

**Files:**
- Modify: `src/server.ts`
- Modify: `tests/server.test.ts`

- [ ] **Step 1: Add failing streaming tests for create/add message**

Add tests that:

- Call `threads.create` with a text input and assert event order includes `thread.created`, `thread.item.done` for the user message, `stream_options`, and responder events.
- Assert the created user message is persisted with loaded attachment metadata copied to `thread_id`.
- Call `threads.add_user_message` on an existing thread and assert the responder receives the new `UserMessageItem`.
- Mutate `thread.title`, `thread.metadata`, `thread.status`, and `thread.allowed_image_domains` inside responders and assert `thread.updated` events and persisted metadata match Python behavior.

- [ ] **Step 2: Run streaming tests and verify they fail**

Run:

```bash
bun test tests/server.test.ts
```

Expected: FAIL because `processStreamingImpl` is empty.

- [ ] **Step 3: Implement request branches for `threads.create` and `threads.add_user_message`**

In `src/server.ts`, implement `processStreamingImpl`:

```ts
protected async *processStreamingImpl(request: StreamingRequest, context: TContext): AsyncIterable<ThreadStreamEvent> {
  switch (request.type) {
    case "threads.create": {
      const thread: Thread = {
        id: this.store.generateThreadId(context),
        created_at: new Date().toISOString(),
        status: { type: "active" },
        metadata: {},
        items: { data: [], has_more: false },
      };
      await this.store.saveThread(ThreadMetadataSchema.parse(thread), context);
      yield { type: "thread.created", thread: this.toThreadResponse(thread) };
      const userMessage = await this.buildUserMessageItem(request.params.input, thread, context);
      yield* this.processNewThreadItemRespond(thread, userMessage, context);
      return;
    }
    case "threads.add_user_message": {
      const thread = await this.store.loadThread(request.params.thread_id, context);
      const userMessage = await this.buildUserMessageItem(request.params.input, thread, context);
      yield* this.processNewThreadItemRespond(thread, userMessage, context);
      return;
    }
    default:
      return yield* this.processStreamingContinuation(request, context);
  }
}
```

Add helpers:

```ts
protected async buildUserMessageItem(
  input: UserMessageInput,
  thread: ThreadMetadata,
  context: TContext,
): Promise<Extract<ThreadItem, { type: "user_message" }>> {
  return {
    id: this.store.generateItemId("message", thread, context),
    type: "user_message",
    thread_id: thread.id,
    created_at: new Date().toISOString(),
    content: input.content,
    attachments: await Promise.all(
      input.attachments.map(async (attachmentId) => ({
        ...(await this.store.loadAttachment(attachmentId, context)),
        thread_id: thread.id,
      })),
    ),
    quoted_text: input.quoted_text,
    inference_options: input.inference_options,
  };
}

protected async *processNewThreadItemRespond(
  thread: ThreadMetadata,
  item: Extract<ThreadItem, { type: "user_message" }>,
  context: TContext,
): AsyncIterable<ThreadStreamEvent> {
  for (const attachment of item.attachments) {
    await this.store.saveAttachment(attachment, context);
  }
  await this.store.addThreadItem(thread.id, item, context);
  yield { type: "thread.item.done", item };
  yield* this.processEvents(thread, context, () => this.respond(thread, item, context));
}

protected async *processStreamingContinuation(
  _request: Exclude<StreamingRequest, { type: "threads.create" | "threads.add_user_message" }>,
  _context: TContext,
): AsyncIterable<ThreadStreamEvent> {}
```

- [ ] **Step 4: Implement event persistence pipeline**

Add `processEvents`:

```ts
protected async *processEvents(
  thread: ThreadMetadata,
  context: TContext,
  stream: () => AsyncIterable<ThreadStreamEvent>,
): AsyncIterable<ThreadStreamEvent> {
  yield { type: "stream_options", stream_options: this.getStreamOptions(thread, context) };
  let lastThread = structuredClone(thread);
  const pendingItems = new Map<string, ThreadItem>();

  try {
    for await (const rawEvent of stream()) {
      const event = ThreadStreamEventSchema.parse(rawEvent);
      if (event.type === "thread.item.added") {
        pendingItems.set(event.item.id, structuredClone(event.item));
      }
      if (event.type === "thread.item.done") {
        await this.store.addThreadItem(thread.id, event.item, context);
        pendingItems.delete(event.item.id);
      } else if (event.type === "thread.item.removed") {
        await this.store.deleteThreadItem(thread.id, event.item_id, context);
        pendingItems.delete(event.item_id);
      } else if (event.type === "thread.item.replaced") {
        await this.store.saveItem(thread.id, event.item, context);
        pendingItems.delete(event.item.id);
      } else if (event.type === "thread.item.updated") {
        this.updatePendingItems(pendingItems, event.item_id, event.update);
      }

      if (!(event.type === "thread.item.done" && this.isHiddenItem(event.item))) {
        yield event;
      }

      if (JSON.stringify(thread) !== JSON.stringify(lastThread)) {
        lastThread = structuredClone(thread);
        await this.store.saveThread(thread, context);
        yield { type: "thread.updated", thread: this.toThreadResponse(thread) };
      }
    }
  } catch (error) {
    yield { type: "error", code: "stream_error", allow_retry: true };
  }

  if (JSON.stringify(thread) !== JSON.stringify(lastThread)) {
    await this.store.saveThread(thread, context);
    yield { type: "thread.updated", thread: this.toThreadResponse(thread) };
  }
}
```

Add `updatePendingItems` and assistant update handling:

```ts
protected updatePendingItems(
  pendingItems: Map<string, ThreadItem>,
  itemId: string,
  update: ThreadItemUpdate,
): void {
  const item = pendingItems.get(itemId);
  if (!item) return;
  if (item.type === "assistant_message" && update.type.startsWith("assistant_message.")) {
    pendingItems.set(itemId, this.applyAssistantMessageUpdate(item, update));
  }
  if (item.type === "workflow" && update.type === "workflow.task.added") {
    item.workflow.tasks.push(update.task);
    pendingItems.set(itemId, item);
  }
  if (item.type === "workflow" && update.type === "workflow.task.updated") {
    item.workflow.tasks[update.task_index] = update.task;
    pendingItems.set(itemId, item);
  }
}
```

Import `ThreadItemUpdate` from `src/types/server.ts`.

- [ ] **Step 5: Run streaming tests**

Run:

```bash
bun test tests/server.test.ts
```

Expected: PASS for create/add-message and event persistence tests.

- [ ] **Step 6: Commit streaming basics**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "Implement ChatKit streaming thread dispatch"
```

## Task 6: Implement Continuation Requests

**Files:**
- Modify: `src/server.ts`
- Modify: `tests/server.test.ts`

- [ ] **Step 1: Add failing tests for client tool output**

Add a test that:

- Creates a thread whose responder emits a pending `client_tool_call`.
- Calls `threads.add_client_tool_output`.
- Asserts the pending tool call is saved with `status: "completed"` and `output`.
- Asserts `respond(thread, null, context)` is called after tool output.

- [ ] **Step 2: Add failing tests for structured input**

Translate the Python cases for:

- Replacing a structured input item with custom answers and resuming response.
- Omitted answers become skipped.
- Unknown answer ids are ignored.
- Single-choice multiple-choice answers truncate extra values.

Use `ThreadItemReplacedEvent` assertions and persisted store assertions.

- [ ] **Step 3: Add failing tests for retry and custom action routing**

Add tests that:

- Create a thread with one user message and several following items, call `threads.retry_after_item`, and assert later items are removed before response resumes.
- Call retry with a non-user target and assert it rejects.
- Save a widget item with opaque `{ type: "Card", children: [] }` JSON, call `threads.custom_action`, and assert `action(...)` receives the sender.
- Call `threads.sync_custom_action` with a widget sender and assert `updated_item` serializes.

- [ ] **Step 4: Run continuation tests and verify they fail**

Run:

```bash
bun test tests/server.test.ts
```

Expected: FAIL because continuation branches are not implemented.

- [ ] **Step 5: Implement continuation dispatch**

Replace `processStreamingContinuation` with:

```ts
protected async *processStreamingContinuation(
  request: Exclude<StreamingRequest, { type: "threads.create" | "threads.add_user_message" }>,
  context: TContext,
): AsyncIterable<ThreadStreamEvent> {
  switch (request.type) {
    case "threads.add_client_tool_output": {
      const thread = await this.store.loadThread(request.params.thread_id, context);
      const items = await this.store.loadThreadItems(thread.id, null, 1, "desc", context);
      const toolCall = items.data.find((item) => item.type === "client_tool_call" && item.status === "pending");
      if (!toolCall || toolCall.type !== "client_tool_call") {
        throw new Error(`Last thread item in ${thread.id} was not a ClientToolCallItem`);
      }
      const completed = { ...toolCall, status: "completed" as const, output: request.params.result };
      await this.store.saveItem(thread.id, completed, context);
      await this.cleanupPendingClientToolCall(thread, context);
      yield* this.processEvents(thread, context, () => this.respond(thread, null, context));
      return;
    }
    case "threads.add_structured_input": {
      const thread = await this.store.loadThread(request.params.thread_id, context);
      const item = await this.store.loadItem(thread.id, request.params.item_id, context);
      if (item.type !== "structured_input") {
        throw new Error(`Item ${request.params.item_id} is not a StructuredInputItem`);
      }
      const updatedItem = this.applyStructuredInputSubmission(item, request.params.input);
      yield* this.processEvents(thread, context, async function* (this: ChatKitServer<TContext>) {
        yield { type: "thread.item.replaced", item: updatedItem } satisfies ThreadStreamEvent;
        yield* this.respond(thread, null, context);
      }.bind(this));
      return;
    }
    case "threads.retry_after_item": {
      const thread = await this.store.loadThread(request.params.thread_id, context);
      const userMessage = await this.removeItemsAfterUserMessage(thread, request.params.item_id, context);
      yield* this.processEvents(thread, context, () => this.respond(thread, userMessage, context));
      return;
    }
    case "threads.custom_action": {
      const thread = await this.store.loadThread(request.params.thread_id, context);
      const sender = request.params.item_id ? await this.store.loadItem(thread.id, request.params.item_id, context) : null;
      if (sender && sender.type !== "widget") {
        yield { type: "error", code: "stream_error", allow_retry: false };
        return;
      }
      yield* this.processEvents(thread, context, () => this.action(thread, request.params.action, sender, context));
      return;
    }
  }
}
```

- [ ] **Step 6: Implement continuation helpers**

Add:

```ts
protected async cleanupPendingClientToolCall(thread: ThreadMetadata, context: TContext): Promise<void> {
  const items = await this.store.loadThreadItems(thread.id, null, DEFAULT_PAGE_SIZE, "desc", context);
  for (const item of items.data) {
    if (item.type === "client_tool_call" && item.status === "pending") {
      await this.store.deleteThreadItem(thread.id, item.id, context);
    }
  }
}

protected applyStructuredInputSubmission(
  item: Extract<ThreadItem, { type: "structured_input" }>,
  submission: StructuredInputSubmission,
): Extract<ThreadItem, { type: "structured_input" }> {
  if (item.status !== "pending") {
    throw new Error(`Structured input item ${item.id} is not pending`);
  }
  return {
    ...item,
    status: submission.status,
    inputs: item.inputs.map((question) => {
      const answer = submission.answers[question.id];
      if (submission.status === "skipped" || !answer || answer.skipped || answer.values.length === 0) {
        return { ...question, answer: { values: [], skipped: true } };
      }
      const values = question.type === "multiple_choice" && !question.multiple ? answer.values.slice(0, 1) : answer.values;
      return { ...question, answer: { values, skipped: false } };
    }),
  };
}

protected async removeItemsAfterUserMessage(
  thread: ThreadMetadata,
  itemId: string,
  context: TContext,
): Promise<Extract<ThreadItem, { type: "user_message" }>> {
  const toRemove: ThreadItem[] = [];
  let after: string | null = null;
  while (true) {
    const page = await this.store.loadThreadItems(thread.id, after, DEFAULT_PAGE_SIZE, "desc", context);
    for (const item of page.data) {
      if (item.id === itemId) {
        if (item.type !== "user_message") {
          throw new Error(`Item ${itemId} is not a user message`);
        }
        for (const remove of toRemove) {
          await this.store.deleteThreadItem(thread.id, remove.id, context);
        }
        return item;
      }
      toRemove.push(item);
    }
    if (!page.has_more) break;
    after = page.after ?? null;
  }
  throw new Error(`Item ${itemId} was not found`);
}
```

Import `StructuredInputSubmission` from `src/types/server.ts`.

- [ ] **Step 7: Run continuation tests**

Run:

```bash
bun test tests/server.test.ts
```

Expected: PASS for continuation behavior.

- [ ] **Step 8: Commit continuation dispatch**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "Implement ChatKit streaming continuations"
```

## Task 7: Implement Cancellation, Error Events, And Pending Updates

**Files:**
- Modify: `src/server.ts`
- Modify: `tests/server.test.ts`

- [ ] **Step 1: Add failing tests for cancellation**

Add tests translated from Python:

- A responder yields `thread.item.added` for an assistant message, then `thread.item.updated` text delta. Simulate cancellation by throwing an error type that represents cancellation from the async iterator, then assert a non-empty pending assistant item and an `sdk_hidden_context` item are persisted.
- A responder yields an empty assistant message and cancellation, then assert the empty assistant message is not persisted but `sdk_hidden_context` is persisted.

Use a local `CancelledStreamError` class in the test so cancellation can be distinguished from regular responder errors.

- [ ] **Step 2: Add failing tests for error events and pending replacements**

Add tests that:

- A responder throwing `Error("Test error")` yields a single `error` event with `code: "stream_error"` and `allow_retry: true`.
- `thread.item.replaced` replaces an item in the store.
- `thread.item.removed` removes an item from the store.
- `thread.item.updated` for assistant text deltas updates pending assistant content before cancellation persistence.
- `thread.item.updated` for workflow task add/update updates pending workflow state without duplicating tasks on `thread.item.done`.

- [ ] **Step 3: Run tests and verify they fail where behavior is incomplete**

Run:

```bash
bun test tests/server.test.ts
```

Expected: FAIL for cancellation and incomplete pending update behavior.

- [ ] **Step 4: Add a cancellation marker and use it in tests**

In `src/server.ts`, export:

```ts
export class StreamCancelledError extends Error {
  constructor(message = "Stream cancelled") {
    super(message);
    this.name = "StreamCancelledError";
  }
}
```

Update tests to throw `new StreamCancelledError()` from the responder when simulating cancellation.

- [ ] **Step 5: Update `processEvents` cancellation and error behavior**

In the `catch` section of `processEvents`, use:

```ts
  } catch (error) {
    if (error instanceof StreamCancelledError) {
      await this.handleStreamCancelled(thread, [...pendingItems.values()], context);
      throw error;
    }
    yield { type: "error", code: "stream_error", allow_retry: true };
  }
```

Keep cancellation rethrowing so consumers can observe it, matching Python's `asyncio.CancelledError` behavior.

- [ ] **Step 6: Complete assistant update handling**

Implement `applyAssistantMessageUpdate`:

```ts
protected applyAssistantMessageUpdate(
  item: Extract<ThreadItem, { type: "assistant_message" }>,
  update: Extract<ThreadItemUpdate, { type: `assistant_message.${string}` }>,
): Extract<ThreadItem, { type: "assistant_message" }> {
  const content = item.content.map((part) => ({ ...part, annotations: [...part.annotations] }));
  while (content.length <= update.content_index) {
    content.push({ type: "output_text", text: "", annotations: [] });
  }
  if (update.type === "assistant_message.content_part.added") {
    content[update.content_index] = update.content;
  } else if (update.type === "assistant_message.content_part.text_delta") {
    content[update.content_index] = {
      ...content[update.content_index],
      text: content[update.content_index].text + update.delta,
    };
  } else if (update.type === "assistant_message.content_part.annotation_added") {
    const annotations = [...content[update.content_index].annotations];
    annotations.splice(update.annotation_index, 0, update.annotation);
    content[update.content_index] = { ...content[update.content_index], annotations };
  } else if (update.type === "assistant_message.content_part.done") {
    content[update.content_index] = update.content;
  }
  return { ...item, content };
}
```

Because `noUncheckedIndexedAccess` is enabled, assign `content[update.content_index]` to a checked local variable if TypeScript requires it.

- [ ] **Step 7: Run cancellation/error tests**

Run:

```bash
bun test tests/server.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit cancellation and error behavior**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "Handle ChatKit stream cancellation and errors"
```

## Task 8: Export Public APIs And Final Verification

**Files:**
- Modify: `src/index.ts`
- Modify: `tests/exports.test.ts`
- Modify: `docs/superpowers/plans/2026-05-27-chatkit-server-parity-slice.md`

- [ ] **Step 1: Add failing export assertions**

In `tests/exports.test.ts`, extend the public export test to assert:

```ts
expect(exports.ChatKitServer).toBeDefined();
expect(exports.StreamingResult).toBeDefined();
expect(exports.NonStreamingResult).toBeDefined();
expect(exports.StreamCancelledError).toBeDefined();
expect(exports.ChatKitRequestSchema).toBeDefined();
expect(exports.ThreadStreamEventSchema).toBeDefined();
```

- [ ] **Step 2: Run export tests and verify they fail**

Run:

```bash
bun test tests/exports.test.ts
```

Expected: FAIL because new modules are not exported.

- [ ] **Step 3: Export server modules**

Update `src/index.ts`:

```ts
export * from "./actions";
export * from "./errors";
export * from "./serialization";
export * from "./server";
export * from "./sqlite-store";
export * from "./store";
export * from "./types/core";
export * from "./types/server";
```

- [ ] **Step 4: Run export tests**

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

Expected: PASS with all test files, including `tests/server-types.test.ts` and `tests/server.test.ts`.

- [ ] **Step 6: Review diff for accidental scope creep**

Run:

```bash
git diff --stat
git diff -- src/types/core.ts src/types/server.ts src/server.ts src/index.ts tests/types.test.ts tests/server-types.test.ts tests/server.test.ts tests/exports.test.ts
```

Expected: Diff only covers the planned server parity slice. It should not add widget template runtime, Bun HTTP helpers, Agents SDK dependencies, or upstream sync automation.

- [ ] **Step 7: Commit final exports**

```bash
git add src/index.ts tests/exports.test.ts
git commit -m "Export ChatKit server parity APIs"
```

- [ ] **Step 8: Final status check**

Run:

```bash
git status --short --branch
```

Expected: clean working tree on the implementation branch, ahead by the task commits.

## Self-Review Notes

Spec coverage:

- Request and response schemas are covered by Task 2.
- Shared item schema expansion is covered by Task 1.
- `StreamingResult`, `NonStreamingResult`, and subclass-first `ChatKitServer` are covered by Task 3.
- Non-streaming dispatch is covered by Task 4.
- Thread create/add message streaming and persistence are covered by Task 5.
- Client tool output, structured input, retry, and custom actions are covered by Task 6.
- Cancellation, pending item updates, replacement/removal, thread updates, and error events are covered by Task 7.
- Public exports and final verification are covered by Task 8.

Deferred work remains outside this plan by design:

- Widget builders, templates, and diffing.
- Bun HTTP request handler.
- Agents SDK stream conversion.
- Upstream sync tooling and parity matrix automation.

No task requires a new runtime dependency. If implementation reveals a need for a dependency, stop and revise the plan before adding it.
