import { z } from "zod";
export declare function PageSchema<T extends z.ZodTypeAny>(item: T): z.ZodObject<{
    data: z.ZodDefault<z.ZodArray<T>>;
    has_more: z.ZodDefault<z.ZodBoolean>;
    after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type Page<T> = {
    data: T[];
    has_more: boolean;
    after?: string | null;
};
export declare const ThreadStatusSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"active">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"locked">;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"closed">;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>], "type">;
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;
export declare const ThreadMetadataSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    id: z.ZodString;
    created_at: z.ZodString;
    status: z.ZodDefault<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"active">;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"locked">;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"closed">;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>], "type">>;
    allowed_image_domains: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type ThreadMetadata = z.infer<typeof ThreadMetadataSchema>;
export declare const AttachmentUploadDescriptorSchema: z.ZodObject<{
    url: z.ZodString;
    method: z.ZodEnum<{
        POST: "POST";
        PUT: "PUT";
    }>;
    headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
export type AttachmentUploadDescriptor = z.infer<typeof AttachmentUploadDescriptorSchema>;
export declare const FileAttachmentSchema: z.ZodObject<{
    id: z.ZodString;
    mime_type: z.ZodString;
    name: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    upload_descriptor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        url: z.ZodString;
        method: z.ZodEnum<{
            POST: "POST";
            PUT: "PUT";
        }>;
        headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>>;
    thread_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"file">;
}, z.core.$strip>;
export type FileAttachment = z.infer<typeof FileAttachmentSchema>;
export declare const ImageAttachmentSchema: z.ZodObject<{
    id: z.ZodString;
    mime_type: z.ZodString;
    name: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    upload_descriptor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        url: z.ZodString;
        method: z.ZodEnum<{
            POST: "POST";
            PUT: "PUT";
        }>;
        headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>>;
    thread_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"image">;
    preview_url: z.ZodString;
}, z.core.$strip>;
export type ImageAttachment = z.infer<typeof ImageAttachmentSchema>;
export declare const AttachmentSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    mime_type: z.ZodString;
    name: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    upload_descriptor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        url: z.ZodString;
        method: z.ZodEnum<{
            POST: "POST";
            PUT: "PUT";
        }>;
        headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>>;
    thread_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"file">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    mime_type: z.ZodString;
    name: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    upload_descriptor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        url: z.ZodString;
        method: z.ZodEnum<{
            POST: "POST";
            PUT: "PUT";
        }>;
        headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>>;
    thread_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"image">;
    preview_url: z.ZodString;
}, z.core.$strip>], "type">;
export type Attachment = z.infer<typeof AttachmentSchema>;
export declare const SourceBaseSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const FileSourceSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"file">;
    filename: z.ZodString;
}, z.core.$strip>;
export declare const UrlSourceSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"url">;
    url: z.ZodString;
    attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const EntitySourceSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"entity">;
    id: z.ZodString;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    inline_label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    interactive: z.ZodDefault<z.ZodBoolean>;
    data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    preview: z.ZodOptional<z.ZodNullable<z.ZodLiteral<"lazy">>>;
}, z.core.$strip>;
export declare const SourceSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"file">;
    filename: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"url">;
    url: z.ZodString;
    attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    type: z.ZodLiteral<"entity">;
    id: z.ZodString;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    inline_label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    interactive: z.ZodDefault<z.ZodBoolean>;
    data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    preview: z.ZodOptional<z.ZodNullable<z.ZodLiteral<"lazy">>>;
}, z.core.$strip>], "type">;
export type Source = z.infer<typeof SourceSchema>;
export declare const AnnotationSchema: z.ZodObject<{
    type: z.ZodDefault<z.ZodLiteral<"annotation">>;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"file">;
        filename: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"url">;
        url: z.ZodString;
        attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"entity">;
        id: z.ZodString;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inline_label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        interactive: z.ZodDefault<z.ZodBoolean>;
        data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        preview: z.ZodOptional<z.ZodNullable<z.ZodLiteral<"lazy">>>;
    }, z.core.$strip>], "type">;
    index: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export declare const AssistantMessageContentSchema: z.ZodObject<{
    type: z.ZodDefault<z.ZodLiteral<"output_text">>;
    text: z.ZodString;
    annotations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodDefault<z.ZodLiteral<"annotation">>;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"file">;
            filename: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"url">;
            url: z.ZodString;
            attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"entity">;
            id: z.ZodString;
            icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            inline_label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            interactive: z.ZodDefault<z.ZodBoolean>;
            data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            preview: z.ZodOptional<z.ZodNullable<z.ZodLiteral<"lazy">>>;
        }, z.core.$strip>], "type">;
        index: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type AssistantMessageContent = z.infer<typeof AssistantMessageContentSchema>;
export declare const UserMessageTextContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"input_text">;
    text: z.ZodString;
}, z.core.$strip>;
export declare const UserMessageTagContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"input_tag">;
    id: z.ZodString;
    text: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    interactive: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const UserMessageContentSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"input_text">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"input_tag">;
    id: z.ZodString;
    text: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    interactive: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>], "type">;
export type UserMessageContent = z.infer<typeof UserMessageContentSchema>;
export declare const ToolChoiceSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type ToolChoice = z.infer<typeof ToolChoiceSchema>;
export declare const InferenceOptionsSchema: z.ZodObject<{
    tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>>>;
    model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$catchall<z.ZodUnknown>>;
export type InferenceOptions = z.infer<typeof InferenceOptionsSchema>;
export declare const CustomTaskSchema: z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"custom">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const SearchTaskSchema: z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"web_search">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    queries: z.ZodDefault<z.ZodArray<z.ZodString>>;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"url">;
        url: z.ZodString;
        attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const ThoughtTaskSchema: z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"thought">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodString;
}, z.core.$strip>;
export declare const FileTaskSchema: z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"file">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"file">;
        filename: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const ImageTaskSchema: z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"image">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const TaskSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"custom">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"web_search">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    queries: z.ZodDefault<z.ZodArray<z.ZodString>>;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"url">;
        url: z.ZodString;
        attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
}, z.core.$strip>, z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"thought">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"file">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"file">;
        filename: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>, z.ZodObject<{
    status_indicator: z.ZodDefault<z.ZodEnum<{
        none: "none";
        loading: "loading";
        complete: "complete";
    }>>;
    type: z.ZodLiteral<"image">;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>], "type">;
export type Task = z.infer<typeof TaskSchema>;
export declare const WorkflowSummarySchema: z.ZodUnion<readonly [z.ZodObject<{
    title: z.ZodString;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    duration: z.ZodNumber;
}, z.core.$strip>]>;
export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>;
export declare const WorkflowSchema: z.ZodObject<{
    type: z.ZodEnum<{
        custom: "custom";
        reasoning: "reasoning";
    }>;
    tasks: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"custom">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"web_search">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        title_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        queries: z.ZodDefault<z.ZodArray<z.ZodString>>;
        sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"url">;
            url: z.ZodString;
            attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"thought">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"file">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"file">;
            filename: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"image">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>], "type">>;
    summary: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
        title: z.ZodString;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        duration: z.ZodNumber;
    }, z.core.$strip>]>>>;
    expanded: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export declare const GeneratedImageSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodString;
}, z.core.$strip>;
export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;
export declare const StructuredInputAnswerSchema: z.ZodObject<{
    values: z.ZodDefault<z.ZodArray<z.ZodString>>;
    skipped: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type StructuredInputAnswer = z.infer<typeof StructuredInputAnswerSchema>;
export declare const StructuredInputMultipleChoiceSchema: z.ZodObject<{
    id: z.ZodString;
    question: z.ZodString;
    answer: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        values: z.ZodDefault<z.ZodArray<z.ZodString>>;
        skipped: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"multiple_choice">;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
    }, z.core.$strip>>;
    multiple: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const StructuredInputFreeformSchema: z.ZodObject<{
    id: z.ZodString;
    question: z.ZodString;
    answer: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        values: z.ZodDefault<z.ZodArray<z.ZodString>>;
        skipped: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"freeform">;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const StructuredInputSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    question: z.ZodString;
    answer: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        values: z.ZodDefault<z.ZodArray<z.ZodString>>;
        skipped: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"multiple_choice">;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
    }, z.core.$strip>>;
    multiple: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    question: z.ZodString;
    answer: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        values: z.ZodDefault<z.ZodArray<z.ZodString>>;
        skipped: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"freeform">;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>], "type">;
export type StructuredInput = z.infer<typeof StructuredInputSchema>;
export declare const ThreadItemBaseSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
}, z.core.$strip>;
export declare const UserMessageItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"user_message">;
    content: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"input_text">;
        text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"input_tag">;
        id: z.ZodString;
        text: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        interactive: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>], "type">>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        mime_type: z.ZodString;
        name: z.ZodString;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        upload_descriptor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            url: z.ZodString;
            method: z.ZodEnum<{
                POST: "POST";
                PUT: "PUT";
            }>;
            headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>>;
        thread_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"file">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        mime_type: z.ZodString;
        name: z.ZodString;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        upload_descriptor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            url: z.ZodString;
            method: z.ZodEnum<{
                POST: "POST";
                PUT: "PUT";
            }>;
            headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>>;
        thread_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"image">;
        preview_url: z.ZodString;
    }, z.core.$strip>], "type">>>;
    quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    inference_options: z.ZodDefault<z.ZodObject<{
        tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>>>;
        model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>;
export declare const AssistantMessageItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"assistant_message">;
    content: z.ZodArray<z.ZodObject<{
        type: z.ZodDefault<z.ZodLiteral<"output_text">>;
        text: z.ZodString;
        annotations: z.ZodDefault<z.ZodArray<z.ZodObject<{
            type: z.ZodDefault<z.ZodLiteral<"annotation">>;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"file">;
                filename: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"url">;
                url: z.ZodString;
                attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>, z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"entity">;
                id: z.ZodString;
                icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                inline_label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                interactive: z.ZodDefault<z.ZodBoolean>;
                data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                preview: z.ZodOptional<z.ZodNullable<z.ZodLiteral<"lazy">>>;
            }, z.core.$strip>], "type">;
            index: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ClientToolCallItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"client_tool_call">;
    status: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"completed">]>>;
    call_id: z.ZodString;
    name: z.ZodString;
    arguments: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    output: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const WidgetItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"widget">;
    widget: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    copy_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const GeneratedImageItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"generated_image">;
    image: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const StructuredInputItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"structured_input">;
    status: z.ZodDefault<z.ZodEnum<{
        skipped: "skipped";
        pending: "pending";
        answered: "answered";
    }>>;
    inputs: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        answer: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            values: z.ZodDefault<z.ZodArray<z.ZodString>>;
            skipped: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"multiple_choice">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
        }, z.core.$strip>>;
        multiple: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        answer: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            values: z.ZodDefault<z.ZodArray<z.ZodString>>;
            skipped: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"freeform">;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>], "type">>;
}, z.core.$strip>;
export declare const TaskItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"task">;
    task: z.ZodDiscriminatedUnion<[z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"custom">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"web_search">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        title_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        queries: z.ZodDefault<z.ZodArray<z.ZodString>>;
        sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"url">;
            url: z.ZodString;
            attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"thought">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"file">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"file">;
            filename: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"image">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>], "type">;
}, z.core.$strip>;
export declare const WorkflowItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"workflow">;
    workflow: z.ZodObject<{
        type: z.ZodEnum<{
            custom: "custom";
            reasoning: "reasoning";
        }>;
        tasks: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"custom">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"web_search">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            title_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            queries: z.ZodDefault<z.ZodArray<z.ZodString>>;
            sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"url">;
                url: z.ZodString;
                attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>>>;
        }, z.core.$strip>, z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"thought">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            content: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"file">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"file">;
                filename: z.ZodString;
            }, z.core.$strip>>>;
        }, z.core.$strip>, z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"image">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>], "type">>;
        summary: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
            title: z.ZodString;
            icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            duration: z.ZodNumber;
        }, z.core.$strip>]>>>;
        expanded: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const HiddenContextItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"hidden_context_item">;
    content: z.ZodUnknown;
}, z.core.$strip>;
export declare const SDKHiddenContextItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"sdk_hidden_context">;
    content: z.ZodString;
}, z.core.$strip>;
export declare const EndOfTurnItemSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"end_of_turn">;
}, z.core.$strip>;
export declare const ThreadItemSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"user_message">;
    content: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"input_text">;
        text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"input_tag">;
        id: z.ZodString;
        text: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        interactive: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>], "type">>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        mime_type: z.ZodString;
        name: z.ZodString;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        upload_descriptor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            url: z.ZodString;
            method: z.ZodEnum<{
                POST: "POST";
                PUT: "PUT";
            }>;
            headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>>;
        thread_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"file">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        mime_type: z.ZodString;
        name: z.ZodString;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        upload_descriptor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            url: z.ZodString;
            method: z.ZodEnum<{
                POST: "POST";
                PUT: "PUT";
            }>;
            headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>>;
        thread_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        type: z.ZodLiteral<"image">;
        preview_url: z.ZodString;
    }, z.core.$strip>], "type">>>;
    quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    inference_options: z.ZodDefault<z.ZodObject<{
        tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>>>;
        model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"assistant_message">;
    content: z.ZodArray<z.ZodObject<{
        type: z.ZodDefault<z.ZodLiteral<"output_text">>;
        text: z.ZodString;
        annotations: z.ZodDefault<z.ZodArray<z.ZodObject<{
            type: z.ZodDefault<z.ZodLiteral<"annotation">>;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"file">;
                filename: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"url">;
                url: z.ZodString;
                attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>, z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"entity">;
                id: z.ZodString;
                icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                inline_label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                interactive: z.ZodDefault<z.ZodBoolean>;
                data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                preview: z.ZodOptional<z.ZodNullable<z.ZodLiteral<"lazy">>>;
            }, z.core.$strip>], "type">;
            index: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"client_tool_call">;
    status: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"completed">]>>;
    call_id: z.ZodString;
    name: z.ZodString;
    arguments: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    output: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"widget">;
    widget: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    copy_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"generated_image">;
    image: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"structured_input">;
    status: z.ZodDefault<z.ZodEnum<{
        skipped: "skipped";
        pending: "pending";
        answered: "answered";
    }>>;
    inputs: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        answer: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            values: z.ZodDefault<z.ZodArray<z.ZodString>>;
            skipped: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"multiple_choice">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
        }, z.core.$strip>>;
        multiple: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        answer: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            values: z.ZodDefault<z.ZodArray<z.ZodString>>;
            skipped: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"freeform">;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>], "type">>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"task">;
    task: z.ZodDiscriminatedUnion<[z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"custom">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"web_search">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        title_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        queries: z.ZodDefault<z.ZodArray<z.ZodString>>;
        sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"url">;
            url: z.ZodString;
            attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"thought">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"file">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            type: z.ZodLiteral<"file">;
            filename: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        status_indicator: z.ZodDefault<z.ZodEnum<{
            none: "none";
            loading: "loading";
            complete: "complete";
        }>>;
        type: z.ZodLiteral<"image">;
        title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>], "type">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"workflow">;
    workflow: z.ZodObject<{
        type: z.ZodEnum<{
            custom: "custom";
            reasoning: "reasoning";
        }>;
        tasks: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"custom">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"web_search">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            title_query: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            queries: z.ZodDefault<z.ZodArray<z.ZodString>>;
            sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"url">;
                url: z.ZodString;
                attribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>>>;
        }, z.core.$strip>, z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"thought">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            content: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"file">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                timestamp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                group: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                type: z.ZodLiteral<"file">;
                filename: z.ZodString;
            }, z.core.$strip>>>;
        }, z.core.$strip>, z.ZodObject<{
            status_indicator: z.ZodDefault<z.ZodEnum<{
                none: "none";
                loading: "loading";
                complete: "complete";
            }>>;
            type: z.ZodLiteral<"image">;
            title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>], "type">>;
        summary: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
            title: z.ZodString;
            icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            duration: z.ZodNumber;
        }, z.core.$strip>]>>>;
        expanded: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"hidden_context_item">;
    content: z.ZodUnknown;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"sdk_hidden_context">;
    content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    created_at: z.ZodString;
    type: z.ZodLiteral<"end_of_turn">;
}, z.core.$strip>], "type">;
export type ThreadItem = z.infer<typeof ThreadItemSchema>;
