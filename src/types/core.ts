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

export const ThreadItemBaseSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  created_at: z.string().datetime(),
});

export const UserMessageItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("user_message"),
  content: z.array(z.unknown()),
  attachments: z.array(AttachmentSchema).default([]),
  quoted_text: z.string().nullable().optional(),
  inference_options: z.record(z.string(), z.unknown()).default({}),
});

export const AssistantMessageItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("assistant_message"),
  content: z.array(z.unknown()),
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
  HiddenContextItemSchema,
  SDKHiddenContextItemSchema,
  EndOfTurnItemSchema,
]);
export type ThreadItem = z.infer<typeof ThreadItemSchema>;
