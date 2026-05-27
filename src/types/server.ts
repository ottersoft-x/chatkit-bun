import { z } from "zod";

import { ActionConfigSchema } from "../actions";
import {
  AnnotationSchema,
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

const JsonRecordSchema = z.record(z.string(), z.unknown());

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

export const PageParamsSchema = z.object({
  limit: z.number().int().positive().nullable().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  after: z.string().nullable().optional(),
});
export type PageParams = z.infer<typeof PageParamsSchema>;

export const StructuredInputAnswerSubmissionSchema = z.object({
  values: z.array(z.string()).optional(),
  skipped: z.boolean().optional(),
});
export type StructuredInputAnswerSubmission = z.infer<
  typeof StructuredInputAnswerSubmissionSchema
>;

export const StructuredInputSubmissionSchema = z.object({
  answers: z.record(z.string(), StructuredInputAnswerSubmissionSchema).default({}),
  status: z.enum(["answered", "skipped"]).default("answered"),
});
export type StructuredInputSubmission = z.infer<typeof StructuredInputSubmissionSchema>;

export const ThreadCustomActionParamsSchema = z.object({
  thread_id: z.string(),
  item_id: z.string().nullable().optional(),
  action: ActionConfigSchema,
});
export type ThreadCustomActionParams = z.infer<typeof ThreadCustomActionParamsSchema>;

export const AudioInputSchema = z.object({
  data: z.instanceof(Uint8Array),
  mime_type: z.string(),
});
export type AudioInput = z.infer<typeof AudioInputSchema>;

export const TranscriptionResultSchema = z.object({
  text: z.string(),
});
export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;

export const BaseRequestSchema = z.object({
  metadata: JsonRecordSchema.default({}),
});
export type BaseRequest = z.infer<typeof BaseRequestSchema>;

const ThreadCreateParamsSchema = z.object({
  input: UserMessageInputSchema,
});

const ThreadIdParamsSchema = z.object({
  thread_id: z.string(),
});

const AddUserMessageParamsSchema = ThreadIdParamsSchema.extend({
  input: UserMessageInputSchema,
});

const AddClientToolOutputParamsSchema = ThreadIdParamsSchema.extend({
  result: z.unknown(),
});

const AddStructuredInputParamsSchema = ThreadIdParamsSchema.extend({
  item_id: z.string(),
  input: StructuredInputSubmissionSchema,
});

const RetryAfterItemParamsSchema = ThreadIdParamsSchema.extend({
  item_id: z.string(),
});

const ListItemsParamsSchema = ThreadIdParamsSchema.merge(PageParamsSchema);

const ItemsFeedbackParamsSchema = ThreadIdParamsSchema.extend({
  item_ids: z.array(z.string()),
  kind: FeedbackKindSchema,
});

const AttachmentsCreateParamsSchema = z.object({
  name: z.string(),
  size: z.number().int(),
  mime_type: z.string(),
});

const AttachmentsDeleteParamsSchema = z.object({
  attachment_id: z.string(),
});

const ThreadsUpdateParamsSchema = ThreadIdParamsSchema.extend({
  title: z.string(),
});

const InputTranscribeParamsSchema = z.object({
  audio_base64: z.string(),
  mime_type: z.string(),
});

function requestSchema<TType extends string, TParams extends z.ZodType>(
  type: TType,
  params: TParams,
) {
  return BaseRequestSchema.extend({
    type: z.literal(type),
    params,
  });
}

export const ThreadsCreateRequestSchema = requestSchema("threads.create", ThreadCreateParamsSchema);
export const ThreadsAddUserMessageRequestSchema = requestSchema(
  "threads.add_user_message",
  AddUserMessageParamsSchema,
);
export const ThreadsAddClientToolOutputRequestSchema = requestSchema(
  "threads.add_client_tool_output",
  AddClientToolOutputParamsSchema,
);
export const ThreadsAddStructuredInputRequestSchema = requestSchema(
  "threads.add_structured_input",
  AddStructuredInputParamsSchema,
);
export const ThreadsRetryAfterItemRequestSchema = requestSchema(
  "threads.retry_after_item",
  RetryAfterItemParamsSchema,
);
export const ThreadsCustomActionRequestSchema = requestSchema(
  "threads.custom_action",
  ThreadCustomActionParamsSchema,
);

export const ThreadsGetByIdRequestSchema = requestSchema("threads.get_by_id", ThreadIdParamsSchema);
export const ThreadsListRequestSchema = requestSchema("threads.list", PageParamsSchema);
export const ItemsListRequestSchema = requestSchema("items.list", ListItemsParamsSchema);
export const ItemsFeedbackRequestSchema = requestSchema("items.feedback", ItemsFeedbackParamsSchema);
export const AttachmentsCreateRequestSchema = requestSchema(
  "attachments.create",
  AttachmentsCreateParamsSchema,
);
export const AttachmentsDeleteRequestSchema = requestSchema(
  "attachments.delete",
  AttachmentsDeleteParamsSchema,
);
export const ThreadsUpdateRequestSchema = requestSchema("threads.update", ThreadsUpdateParamsSchema);
export const ThreadsDeleteRequestSchema = requestSchema("threads.delete", ThreadIdParamsSchema);
export const InputTranscribeRequestSchema = requestSchema(
  "input.transcribe",
  InputTranscribeParamsSchema,
);
export const ThreadsSyncCustomActionRequestSchema = requestSchema(
  "threads.sync_custom_action",
  ThreadCustomActionParamsSchema,
);

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

const STREAMING_REQUEST_TYPES = [
  "threads.create",
  "threads.add_user_message",
  "threads.add_client_tool_output",
  "threads.add_structured_input",
  "threads.retry_after_item",
  "threads.custom_action",
] as const;

export function isStreamingRequest(request: ChatKitRequest): request is StreamingRequest {
  return (STREAMING_REQUEST_TYPES as readonly string[]).includes(request.type);
}

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
  content_index: z.number().int().nonnegative(),
  content: AssistantMessageContentSchema,
});

export const AssistantMessageContentPartTextDeltaSchema = z.object({
  type: z.literal("assistant_message.content_part.text_delta"),
  content_index: z.number().int().nonnegative(),
  delta: z.string(),
});

export const AssistantMessageContentPartAnnotationAddedSchema = z.object({
  type: z.literal("assistant_message.content_part.annotation_added"),
  content_index: z.number().int().nonnegative(),
  annotation_index: z.number().int().nonnegative(),
  annotation: AnnotationSchema,
});

export const AssistantMessageContentPartDoneSchema = z.object({
  type: z.literal("assistant_message.content_part.done"),
  content_index: z.number().int().nonnegative(),
  content: AssistantMessageContentSchema,
});

export const WorkflowTaskAddedSchema = z.object({
  type: z.literal("workflow.task.added"),
  task_index: z.number().int().nonnegative(),
  task: TaskSchema,
});

export const WorkflowTaskUpdatedSchema = z.object({
  type: z.literal("workflow.task.updated"),
  task_index: z.number().int().nonnegative(),
  task: TaskSchema,
});

export const GeneratedImageUpdatedSchema = z.object({
  type: z.literal("generated_image.updated"),
  image: GeneratedImageSchema,
  progress: z.number().nullable().optional(),
});

export const WidgetRootUpdatedSchema = z.object({
  type: z.literal("widget.root.updated"),
  widget: JsonRecordSchema,
});

export const WidgetComponentUpdatedSchema = z.object({
  type: z.literal("widget.component.updated"),
  component_id: z.string(),
  component: JsonRecordSchema,
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
  WorkflowTaskAddedSchema,
  WorkflowTaskUpdatedSchema,
  GeneratedImageUpdatedSchema,
  WidgetRootUpdatedSchema,
  WidgetComponentUpdatedSchema,
  WidgetStreamingTextValueDeltaSchema,
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
  data: JsonRecordSchema.default({}),
});

export const ErrorEventSchema = z.object({
  type: z.literal("error"),
  code: z.enum(["stream.error", "custom"]).default("custom"),
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
  ThreadItemAddedEventSchema,
  ThreadItemDoneEventSchema,
  ThreadItemRemovedEventSchema,
  ThreadItemReplacedEventSchema,
  ThreadItemUpdatedEventSchema,
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
