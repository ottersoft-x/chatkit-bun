import { z } from "zod";
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const FeedbackKindSchema: z.ZodEnum<{
    positive: "positive";
    negative: "negative";
}>;
export type FeedbackKind = z.infer<typeof FeedbackKindSchema>;
export declare const StreamOptionsSchema: z.ZodObject<{
    allow_cancel: z.ZodBoolean;
}, z.core.$strip>;
export type StreamOptions = z.infer<typeof StreamOptionsSchema>;
export declare const UserMessageInputSchema: z.ZodObject<{
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
    attachments: z.ZodArray<z.ZodString>;
    quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    inference_options: z.ZodObject<{
        tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>>>;
        model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$catchall<z.ZodUnknown>>;
}, z.core.$strip>;
export type UserMessageInput = z.infer<typeof UserMessageInputSchema>;
export declare const PageParamsSchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type PageParams = z.infer<typeof PageParamsSchema>;
export declare const StructuredInputAnswerSubmissionSchema: z.ZodObject<{
    values: z.ZodOptional<z.ZodArray<z.ZodString>>;
    skipped: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type StructuredInputAnswerSubmission = z.infer<typeof StructuredInputAnswerSubmissionSchema>;
export declare const StructuredInputSubmissionSchema: z.ZodObject<{
    answers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        values: z.ZodOptional<z.ZodArray<z.ZodString>>;
        skipped: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    status: z.ZodDefault<z.ZodEnum<{
        skipped: "skipped";
        answered: "answered";
    }>>;
}, z.core.$strip>;
export type StructuredInputSubmission = z.infer<typeof StructuredInputSubmissionSchema>;
export declare const ThreadCustomActionParamsSchema: z.ZodObject<{
    thread_id: z.ZodString;
    item_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    action: z.ZodObject<{
        type: z.ZodString;
        payload: z.ZodOptional<z.ZodUnknown>;
        handler: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>>;
        loadingBehavior: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>>;
        streaming: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ThreadCustomActionParams = z.infer<typeof ThreadCustomActionParamsSchema>;
export declare const AudioInputSchema: z.ZodObject<{
    data: z.ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>;
    mime_type: z.ZodString;
    mediaType: z.ZodString;
}, z.core.$strip>;
export type AudioInput = z.infer<typeof AudioInputSchema>;
export declare const TranscriptionResultSchema: z.ZodObject<{
    text: z.ZodString;
}, z.core.$strip>;
export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;
export declare const BaseRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type BaseRequest = z.infer<typeof BaseRequestSchema>;
export declare const ThreadsCreateRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.create">;
    params: z.ZodObject<{
        input: z.ZodObject<{
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
            attachments: z.ZodArray<z.ZodString>;
            quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            inference_options: z.ZodObject<{
                tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>>>;
                model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsAddUserMessageRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_user_message">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        input: z.ZodObject<{
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
            attachments: z.ZodArray<z.ZodString>;
            quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            inference_options: z.ZodObject<{
                tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>>>;
                model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsAddClientToolOutputRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_client_tool_output">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        result: z.ZodUnknown;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsAddStructuredInputRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_structured_input">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodString;
        input: z.ZodObject<{
            answers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
                values: z.ZodOptional<z.ZodArray<z.ZodString>>;
                skipped: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>>;
            status: z.ZodDefault<z.ZodEnum<{
                skipped: "skipped";
                answered: "answered";
            }>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsRetryAfterItemRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.retry_after_item">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsCustomActionRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.custom_action">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        action: z.ZodObject<{
            type: z.ZodString;
            payload: z.ZodOptional<z.ZodUnknown>;
            handler: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>>;
            loadingBehavior: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>>;
            streaming: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsGetByIdRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.get_by_id">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsListRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.list">;
    params: z.ZodObject<{
        limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        order: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
        after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ItemsListRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"items.list">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        order: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
        after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ItemsFeedbackRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"items.feedback">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_ids: z.ZodArray<z.ZodString>;
        kind: z.ZodEnum<{
            positive: "positive";
            negative: "negative";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const AttachmentsCreateRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"attachments.create">;
    params: z.ZodObject<{
        name: z.ZodString;
        size: z.ZodNumber;
        mime_type: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const AttachmentsDeleteRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"attachments.delete">;
    params: z.ZodObject<{
        attachment_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsUpdateRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.update">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        title: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsDeleteRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.delete">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const InputTranscribeRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"input.transcribe">;
    params: z.ZodObject<{
        audio_base64: z.ZodString;
        mime_type: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadsSyncCustomActionRequestSchema: z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.sync_custom_action">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        action: z.ZodObject<{
            type: z.ZodString;
            payload: z.ZodOptional<z.ZodUnknown>;
            handler: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>>;
            loadingBehavior: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>>;
            streaming: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const StreamingRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.create">;
    params: z.ZodObject<{
        input: z.ZodObject<{
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
            attachments: z.ZodArray<z.ZodString>;
            quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            inference_options: z.ZodObject<{
                tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>>>;
                model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_user_message">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        input: z.ZodObject<{
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
            attachments: z.ZodArray<z.ZodString>;
            quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            inference_options: z.ZodObject<{
                tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>>>;
                model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_client_tool_output">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        result: z.ZodUnknown;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_structured_input">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodString;
        input: z.ZodObject<{
            answers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
                values: z.ZodOptional<z.ZodArray<z.ZodString>>;
                skipped: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>>;
            status: z.ZodDefault<z.ZodEnum<{
                skipped: "skipped";
                answered: "answered";
            }>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.retry_after_item">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.custom_action">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        action: z.ZodObject<{
            type: z.ZodString;
            payload: z.ZodOptional<z.ZodUnknown>;
            handler: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>>;
            loadingBehavior: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>>;
            streaming: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>], "type">;
export type StreamingRequest = z.infer<typeof StreamingRequestSchema>;
export declare const NonStreamingRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.get_by_id">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.list">;
    params: z.ZodObject<{
        limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        order: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
        after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"items.list">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        order: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
        after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"items.feedback">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_ids: z.ZodArray<z.ZodString>;
        kind: z.ZodEnum<{
            positive: "positive";
            negative: "negative";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"attachments.create">;
    params: z.ZodObject<{
        name: z.ZodString;
        size: z.ZodNumber;
        mime_type: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"attachments.delete">;
    params: z.ZodObject<{
        attachment_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.update">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        title: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.delete">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"input.transcribe">;
    params: z.ZodObject<{
        audio_base64: z.ZodString;
        mime_type: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.sync_custom_action">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        action: z.ZodObject<{
            type: z.ZodString;
            payload: z.ZodOptional<z.ZodUnknown>;
            handler: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>>;
            loadingBehavior: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>>;
            streaming: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>], "type">;
export type NonStreamingRequest = z.infer<typeof NonStreamingRequestSchema>;
export declare const ChatKitRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.create">;
    params: z.ZodObject<{
        input: z.ZodObject<{
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
            attachments: z.ZodArray<z.ZodString>;
            quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            inference_options: z.ZodObject<{
                tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>>>;
                model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_user_message">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        input: z.ZodObject<{
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
            attachments: z.ZodArray<z.ZodString>;
            quoted_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            inference_options: z.ZodObject<{
                tool_choice: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    id: z.ZodString;
                }, z.core.$strip>>>;
                model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_client_tool_output">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        result: z.ZodUnknown;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.add_structured_input">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodString;
        input: z.ZodObject<{
            answers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
                values: z.ZodOptional<z.ZodArray<z.ZodString>>;
                skipped: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>>;
            status: z.ZodDefault<z.ZodEnum<{
                skipped: "skipped";
                answered: "answered";
            }>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.retry_after_item">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.custom_action">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        action: z.ZodObject<{
            type: z.ZodString;
            payload: z.ZodOptional<z.ZodUnknown>;
            handler: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>>;
            loadingBehavior: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>>;
            streaming: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.get_by_id">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.list">;
    params: z.ZodObject<{
        limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        order: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
        after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"items.list">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        order: z.ZodDefault<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
        after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"items.feedback">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_ids: z.ZodArray<z.ZodString>;
        kind: z.ZodEnum<{
            positive: "positive";
            negative: "negative";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"attachments.create">;
    params: z.ZodObject<{
        name: z.ZodString;
        size: z.ZodNumber;
        mime_type: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"attachments.delete">;
    params: z.ZodObject<{
        attachment_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.update">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        title: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.delete">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"input.transcribe">;
    params: z.ZodObject<{
        audio_base64: z.ZodString;
        mime_type: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    type: z.ZodLiteral<"threads.sync_custom_action">;
    params: z.ZodObject<{
        thread_id: z.ZodString;
        item_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        action: z.ZodObject<{
            type: z.ZodString;
            payload: z.ZodOptional<z.ZodUnknown>;
            handler: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>>;
            loadingBehavior: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>>;
            streaming: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>], "type">;
export type ChatKitRequest = z.infer<typeof ChatKitRequestSchema>;
export declare function isStreamingRequest(request: ChatKitRequest): request is StreamingRequest;
export declare const ThreadSchema: z.ZodObject<{
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
    items: z.ZodObject<{
        data: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        }, z.core.$strip>], "type">>>;
        has_more: z.ZodDefault<z.ZodBoolean>;
        after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type Thread = z.infer<typeof ThreadSchema>;
export declare const ThreadCreatedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"thread.created">;
    thread: z.ZodObject<{
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
        items: z.ZodObject<{
            data: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            }, z.core.$strip>], "type">>>;
            has_more: z.ZodDefault<z.ZodBoolean>;
            after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadUpdatedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"thread.updated">;
    thread: z.ZodObject<{
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
        items: z.ZodObject<{
            data: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            }, z.core.$strip>], "type">>>;
            has_more: z.ZodDefault<z.ZodBoolean>;
            after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ThreadItemAddedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"thread.item.added">;
    item: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strip>;
export declare const ThreadItemDoneEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"thread.item.done">;
    item: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strip>;
export declare const ThreadItemRemovedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"thread.item.removed">;
    item_id: z.ZodString;
}, z.core.$strip>;
export declare const ThreadItemReplacedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"thread.item.replaced">;
    item: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strip>;
export declare const AssistantMessageContentPartAddedSchema: z.ZodObject<{
    type: z.ZodLiteral<"assistant_message.content_part.added">;
    content_index: z.ZodNumber;
    content: z.ZodObject<{
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
}, z.core.$strip>;
export declare const AssistantMessageContentPartTextDeltaSchema: z.ZodObject<{
    type: z.ZodLiteral<"assistant_message.content_part.text_delta">;
    content_index: z.ZodNumber;
    delta: z.ZodString;
}, z.core.$strip>;
export declare const AssistantMessageContentPartAnnotationAddedSchema: z.ZodObject<{
    type: z.ZodLiteral<"assistant_message.content_part.annotation_added">;
    content_index: z.ZodNumber;
    annotation_index: z.ZodNumber;
    annotation: z.ZodObject<{
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
}, z.core.$strip>;
export declare const AssistantMessageContentPartDoneSchema: z.ZodObject<{
    type: z.ZodLiteral<"assistant_message.content_part.done">;
    content_index: z.ZodNumber;
    content: z.ZodObject<{
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
}, z.core.$strip>;
export declare const WorkflowTaskAddedSchema: z.ZodObject<{
    type: z.ZodLiteral<"workflow.task.added">;
    task_index: z.ZodNumber;
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
export declare const WorkflowTaskUpdatedSchema: z.ZodObject<{
    type: z.ZodLiteral<"workflow.task.updated">;
    task_index: z.ZodNumber;
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
export declare const GeneratedImageUpdatedSchema: z.ZodObject<{
    type: z.ZodLiteral<"generated_image.updated">;
    image: z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
    }, z.core.$strip>;
    progress: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export declare const WidgetRootUpdatedSchema: z.ZodObject<{
    type: z.ZodLiteral<"widget.root.updated">;
    widget: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export declare const WidgetComponentUpdatedSchema: z.ZodObject<{
    type: z.ZodLiteral<"widget.component.updated">;
    component_id: z.ZodString;
    component: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export declare const WidgetStreamingTextValueDeltaSchema: z.ZodObject<{
    type: z.ZodLiteral<"widget.streaming_text.value_delta">;
    component_id: z.ZodString;
    delta: z.ZodString;
    done: z.ZodBoolean;
}, z.core.$strip>;
export declare const ThreadItemUpdateSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"assistant_message.content_part.added">;
    content_index: z.ZodNumber;
    content: z.ZodObject<{
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
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"assistant_message.content_part.text_delta">;
    content_index: z.ZodNumber;
    delta: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"assistant_message.content_part.annotation_added">;
    content_index: z.ZodNumber;
    annotation_index: z.ZodNumber;
    annotation: z.ZodObject<{
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
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"assistant_message.content_part.done">;
    content_index: z.ZodNumber;
    content: z.ZodObject<{
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
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"workflow.task.added">;
    task_index: z.ZodNumber;
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
    type: z.ZodLiteral<"workflow.task.updated">;
    task_index: z.ZodNumber;
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
    type: z.ZodLiteral<"generated_image.updated">;
    image: z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
    }, z.core.$strip>;
    progress: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"widget.root.updated">;
    widget: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"widget.component.updated">;
    component_id: z.ZodString;
    component: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"widget.streaming_text.value_delta">;
    component_id: z.ZodString;
    delta: z.ZodString;
    done: z.ZodBoolean;
}, z.core.$strip>], "type">;
export type ThreadItemUpdate = z.infer<typeof ThreadItemUpdateSchema>;
export declare const ThreadItemUpdatedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"thread.item.updated">;
    item_id: z.ZodString;
    update: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"assistant_message.content_part.added">;
        content_index: z.ZodNumber;
        content: z.ZodObject<{
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
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"assistant_message.content_part.text_delta">;
        content_index: z.ZodNumber;
        delta: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"assistant_message.content_part.annotation_added">;
        content_index: z.ZodNumber;
        annotation_index: z.ZodNumber;
        annotation: z.ZodObject<{
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
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"assistant_message.content_part.done">;
        content_index: z.ZodNumber;
        content: z.ZodObject<{
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
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"workflow.task.added">;
        task_index: z.ZodNumber;
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
        type: z.ZodLiteral<"workflow.task.updated">;
        task_index: z.ZodNumber;
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
        type: z.ZodLiteral<"generated_image.updated">;
        image: z.ZodObject<{
            id: z.ZodString;
            url: z.ZodString;
        }, z.core.$strip>;
        progress: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"widget.root.updated">;
        widget: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"widget.component.updated">;
        component_id: z.ZodString;
        component: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"widget.streaming_text.value_delta">;
        component_id: z.ZodString;
        delta: z.ZodString;
        done: z.ZodBoolean;
    }, z.core.$strip>], "type">;
}, z.core.$strip>;
export declare const StreamOptionsEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"stream_options">;
    stream_options: z.ZodObject<{
        allow_cancel: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ProgressUpdateEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"progress_update">;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    text: z.ZodString;
}, z.core.$strip>;
export declare const ClientEffectEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"client_effect">;
    name: z.ZodString;
    data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const ErrorEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"error">;
    code: z.ZodDefault<z.ZodEnum<{
        custom: "custom";
        "stream.error": "stream.error";
    }>>;
    message: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    allow_retry: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const NoticeEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"notice">;
    level: z.ZodEnum<{
        info: "info";
        warning: "warning";
        danger: "danger";
    }>;
    message: z.ZodString;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const ThreadStreamEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"thread.created">;
    thread: z.ZodObject<{
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
        items: z.ZodObject<{
            data: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            }, z.core.$strip>], "type">>>;
            has_more: z.ZodDefault<z.ZodBoolean>;
            after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"thread.updated">;
    thread: z.ZodObject<{
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
        items: z.ZodObject<{
            data: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            }, z.core.$strip>], "type">>>;
            has_more: z.ZodDefault<z.ZodBoolean>;
            after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"thread.item.added">;
    item: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"thread.item.done">;
    item: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"thread.item.removed">;
    item_id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"thread.item.replaced">;
    item: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"thread.item.updated">;
    item_id: z.ZodString;
    update: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"assistant_message.content_part.added">;
        content_index: z.ZodNumber;
        content: z.ZodObject<{
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
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"assistant_message.content_part.text_delta">;
        content_index: z.ZodNumber;
        delta: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"assistant_message.content_part.annotation_added">;
        content_index: z.ZodNumber;
        annotation_index: z.ZodNumber;
        annotation: z.ZodObject<{
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
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"assistant_message.content_part.done">;
        content_index: z.ZodNumber;
        content: z.ZodObject<{
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
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"workflow.task.added">;
        task_index: z.ZodNumber;
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
        type: z.ZodLiteral<"workflow.task.updated">;
        task_index: z.ZodNumber;
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
        type: z.ZodLiteral<"generated_image.updated">;
        image: z.ZodObject<{
            id: z.ZodString;
            url: z.ZodString;
        }, z.core.$strip>;
        progress: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"widget.root.updated">;
        widget: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"widget.component.updated">;
        component_id: z.ZodString;
        component: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"widget.streaming_text.value_delta">;
        component_id: z.ZodString;
        delta: z.ZodString;
        done: z.ZodBoolean;
    }, z.core.$strip>], "type">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"stream_options">;
    stream_options: z.ZodObject<{
        allow_cancel: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"progress_update">;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"client_effect">;
    name: z.ZodString;
    data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    code: z.ZodDefault<z.ZodEnum<{
        custom: "custom";
        "stream.error": "stream.error";
    }>>;
    message: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    allow_retry: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"notice">;
    level: z.ZodEnum<{
        info: "info";
        warning: "warning";
        danger: "danger";
    }>;
    message: z.ZodString;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>], "type">;
export type ThreadStreamEvent = z.infer<typeof ThreadStreamEventSchema>;
export declare const SyncCustomActionResponseSchema: z.ZodObject<{
    updated_item: z.ZodOptional<z.ZodNullable<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    }, z.core.$strip>], "type">>>;
}, z.core.$strip>;
export type SyncCustomActionResponse = z.infer<typeof SyncCustomActionResponseSchema>;
