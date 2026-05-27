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
const NullableJsonRecordSchema = JsonRecordSchema.nullable().optional();

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
  skipped: z.boolean().default(false),
});
export type StructuredInputSubmission = z.infer<typeof StructuredInputSubmissionSchema>;

export const ThreadCustomActionParamsSchema = z.object({
  thread_id: z.string(),
  action: ActionConfigSchema,
  sender: z
    .object({
      item_id: z.string().optional(),
      widget: JsonRecordSchema.optional(),
    })
    .catchall(z.unknown()),
});
export type ThreadCustomActionParams = z.infer<typeof ThreadCustomActionParamsSchema>;

export const AudioInputSchema = z.object({
  data: z.string(),
  mime_type: z.string(),
});
export type AudioInput = z.infer<typeof AudioInputSchema> & {
  readonly mediaType: string;
};

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
  call_id: z.string(),
  output: z.unknown(),
});

const AddStructuredInputParamsSchema = ThreadIdParamsSchema.extend({
  item_id: z.string(),
  submission: StructuredInputSubmissionSchema,
});

const RetryAfterItemParamsSchema = ThreadIdParamsSchema.extend({
  item_id: z.string(),
});

const ListItemsParamsSchema = ThreadIdParamsSchema.merge(PageParamsSchema);

const ItemsFeedbackParamsSchema = ThreadIdParamsSchema.extend({
  item_ids: z.array(z.string()),
  feedback: FeedbackKindSchema,
});

const AttachmentsCreateParamsSchema = z.object({
  thread_id: z.string().nullable().optional(),
  filename: z.string().optional(),
  name: z.string().optional(),
  mime_type: z.string(),
  metadata: NullableJsonRecordSchema,
});

const AttachmentsDeleteParamsSchema = z.object({
  attachment_id: z.string(),
  thread_id: z.string().nullable().optional(),
});

const ThreadsUpdateParamsSchema = ThreadIdParamsSchema.extend({
  title: z.string().nullable().optional(),
  status: ThreadMetadataSchema.shape.status.optional(),
  allowed_image_domains: z.array(z.string()).nullable().optional(),
  metadata: JsonRecordSchema.optional(),
});

const InputTranscribeParamsSchema = z.object({
  audio: AudioInputSchema,
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

const ThreadCreatedEventSchema = z.object({
  type: z.literal("thread.created"),
  thread: ThreadSchema,
});

const ThreadUpdatedEventSchema = z.object({
  type: z.literal("thread.updated"),
  thread: ThreadMetadataSchema,
});

const ThreadItemAddedEventSchema = z.object({
  type: z.literal("thread.item.added"),
  item: ThreadItemSchema,
});

const ThreadItemDoneEventSchema = z.object({
  type: z.literal("thread.item.done"),
  item: ThreadItemSchema,
});

const ThreadItemRemovedEventSchema = z.object({
  type: z.literal("thread.item.removed"),
  item_id: z.string(),
});

const ThreadItemReplacedEventSchema = z.object({
  type: z.literal("thread.item.replaced"),
  item: ThreadItemSchema,
});

const AssistantContentPartAddedUpdateSchema = z.object({
  type: z.literal("assistant_message.content_part.added"),
  content_index: z.number().int().nonnegative(),
  content: AssistantMessageContentSchema,
});

const AssistantTextDeltaUpdateSchema = z.object({
  type: z.literal("assistant_message.content_part.text_delta"),
  content_index: z.number().int().nonnegative(),
  delta: z.string(),
});

const AssistantAnnotationAddedUpdateSchema = z.object({
  type: z.literal("assistant_message.content_part.annotation_added"),
  content_index: z.number().int().nonnegative(),
  annotation_index: z.number().int().nonnegative().optional(),
  annotation: AnnotationSchema,
});

const AssistantContentPartDoneUpdateSchema = z.object({
  type: z.literal("assistant_message.content_part.done"),
  content_index: z.number().int().nonnegative(),
  content: AssistantMessageContentSchema.optional(),
});

const WorkflowTaskAddedUpdateSchema = z.object({
  type: z.literal("workflow.task.added"),
  task_index: z.number().int().nonnegative(),
  task: TaskSchema,
});

const WorkflowTaskUpdatedUpdateSchema = z.object({
  type: z.literal("workflow.task.updated"),
  task_index: z.number().int().nonnegative(),
  task: TaskSchema,
});

const GeneratedImageUpdatedUpdateSchema = z.object({
  type: z.literal("generated_image.updated"),
  image: GeneratedImageSchema.nullable(),
});

const WidgetRootUpdatedUpdateSchema = z
  .object({
    type: z.literal("widget.root.updated"),
    widget: JsonRecordSchema.optional(),
  })
  .catchall(z.unknown());

const WidgetComponentUpdatedUpdateSchema = z
  .object({
    type: z.literal("widget.component.updated"),
    component_id: z.string().optional(),
    update: JsonRecordSchema.optional(),
  })
  .catchall(z.unknown());

const WidgetStreamingTextValueDeltaUpdateSchema = z
  .object({
    type: z.literal("widget.streaming_text.value_delta"),
    delta: z.string().optional(),
  })
  .catchall(z.unknown());

export const ThreadItemUpdateSchema = z.discriminatedUnion("type", [
  AssistantContentPartAddedUpdateSchema,
  AssistantTextDeltaUpdateSchema,
  AssistantAnnotationAddedUpdateSchema,
  AssistantContentPartDoneUpdateSchema,
  WorkflowTaskAddedUpdateSchema,
  WorkflowTaskUpdatedUpdateSchema,
  GeneratedImageUpdatedUpdateSchema,
  WidgetRootUpdatedUpdateSchema,
  WidgetComponentUpdatedUpdateSchema,
  WidgetStreamingTextValueDeltaUpdateSchema,
]);
export type ThreadItemUpdate = z.infer<typeof ThreadItemUpdateSchema>;

const ThreadItemUpdatedEventSchema = z.object({
  type: z.literal("thread.item.updated"),
  item_id: z.string(),
  update: ThreadItemUpdateSchema,
});

const StreamOptionsEventSchema = z.object({
  type: z.literal("stream_options"),
  options: StreamOptionsSchema,
});

const ProgressUpdateEventSchema = z
  .object({
    type: z.literal("progress_update"),
    message: z.string().optional(),
  })
  .catchall(z.unknown());

const ClientEffectEventSchema = z
  .object({
    type: z.literal("client_effect"),
    effect: JsonRecordSchema.optional(),
  })
  .catchall(z.unknown());

const ErrorEventSchema = z
  .object({
    type: z.literal("error"),
    message: z.string(),
    retryable: z.boolean().optional(),
  })
  .catchall(z.unknown());

const NoticeEventSchema = z
  .object({
    type: z.literal("notice"),
    message: z.string(),
  })
  .catchall(z.unknown());

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
  events: z.array(ThreadStreamEventSchema).default([]),
});
export type SyncCustomActionResponse = z.infer<typeof SyncCustomActionResponseSchema>;
