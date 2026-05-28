import { z } from "zod";

export function PageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item).default([]),
    has_more: z.boolean().default(false),
    after: z.string().nullable().optional(),
  });
}

export type Page<T> = {
  data: T[];
  has_more: boolean;
  after?: string | null;
};

export const ThreadStatusSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("active") }),
  z.object({ type: z.literal("locked"), reason: z.string().nullable().optional() }),
  z.object({ type: z.literal("closed"), reason: z.string().nullable().optional() }),
]);
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;

export const ThreadMetadataSchema = z.object({
  title: z.string().nullable().optional(),
  id: z.string(),
  created_at: z.string().datetime(),
  status: ThreadStatusSchema.default({ type: "active" }),
  allowed_image_domains: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type ThreadMetadata = z.infer<typeof ThreadMetadataSchema>;

export const AttachmentUploadDescriptorSchema = z.object({
  url: z.string().url(),
  method: z.enum(["POST", "PUT"]),
  headers: z.record(z.string(), z.string()).default({}),
});
export type AttachmentUploadDescriptor = z.infer<typeof AttachmentUploadDescriptorSchema>;

const AttachmentBaseSchema = z.object({
  id: z.string(),
  mime_type: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  upload_descriptor: AttachmentUploadDescriptorSchema.nullable().optional(),
  thread_id: z.string().nullable().optional(),
});

export const FileAttachmentSchema = AttachmentBaseSchema.extend({
  type: z.literal("file"),
});
export type FileAttachment = z.infer<typeof FileAttachmentSchema>;

export const ImageAttachmentSchema = AttachmentBaseSchema.extend({
  type: z.literal("image"),
  preview_url: z.string().url(),
});
export type ImageAttachment = z.infer<typeof ImageAttachmentSchema>;

export const AttachmentSchema = z.discriminatedUnion("type", [
  FileAttachmentSchema,
  ImageAttachmentSchema,
]);
export type Attachment = z.infer<typeof AttachmentSchema>;

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
}).catchall(z.unknown());
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
export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>;

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

export const ThreadItemBaseSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  created_at: z.string().datetime(),
});

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

export const ClientToolCallItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("client_tool_call"),
  status: z.union([z.literal("pending"), z.literal("completed")]).default("pending"),
  call_id: z.string(),
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  output: z.unknown().optional(),
});

export const WidgetItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("widget"),
  widget: z.record(z.string(), z.unknown()),
  copy_text: z.string().nullable().optional(),
});

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

export const HiddenContextItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("hidden_context_item"),
  content: z.unknown(),
});

export const SDKHiddenContextItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("sdk_hidden_context"),
  content: z.string(),
});

export const EndOfTurnItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("end_of_turn"),
});

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
export type ThreadItem = z.infer<typeof ThreadItemSchema>;
