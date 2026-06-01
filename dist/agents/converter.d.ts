import type { AgentInputItem } from "@openai/agents";
import type { Attachment, ThreadItem, UserMessageContent } from "../types/core";
export type UserMessageItem = Extract<ThreadItem, {
    type: "user_message";
}>;
export type AssistantMessageItem = Extract<ThreadItem, {
    type: "assistant_message";
}>;
export type ClientToolCallItem = Extract<ThreadItem, {
    type: "client_tool_call";
}>;
export type WidgetItem = Extract<ThreadItem, {
    type: "widget";
}>;
export type GeneratedImageItem = Extract<ThreadItem, {
    type: "generated_image";
}>;
export type StructuredInputItem = Extract<ThreadItem, {
    type: "structured_input";
}>;
export type TaskItem = Extract<ThreadItem, {
    type: "task";
}>;
export type WorkflowItem = Extract<ThreadItem, {
    type: "workflow";
}>;
export type HiddenContextItem = Extract<ThreadItem, {
    type: "hidden_context_item";
}>;
export type SDKHiddenContextItem = Extract<ThreadItem, {
    type: "sdk_hidden_context";
}>;
export type EndOfTurnItem = Extract<ThreadItem, {
    type: "end_of_turn";
}>;
export type UserMessageTagContent = Extract<UserMessageContent, {
    type: "input_tag";
}>;
export type AgentUserMessageItem = Extract<AgentInputItem, {
    role: "user";
}>;
export type AgentMessageContentPart = Exclude<AgentUserMessageItem["content"], string>[number];
export type ThreadItemConverterResult = AgentInputItem | AgentInputItem[] | null | undefined;
export declare class ThreadItemConverter {
    attachmentToMessageContent(_attachment: Attachment): AgentMessageContentPart | Promise<AgentMessageContentPart>;
    tagToMessageContent(_tag: UserMessageTagContent): AgentMessageContentPart | Promise<AgentMessageContentPart>;
    generatedImageToInput(item: GeneratedImageItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    hiddenContextToInput(item: HiddenContextItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    sdkHiddenContextToInput(item: SDKHiddenContextItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    taskToInput(item: TaskItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    workflowToInput(item: WorkflowItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    widgetToInput(item: WidgetItem): Promise<ThreadItemConverterResult>;
    structuredInputToInput(item: StructuredInputItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    userMessageToInput(item: UserMessageItem, isLastMessage?: boolean): Promise<ThreadItemConverterResult>;
    assistantMessageToInput(item: AssistantMessageItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    clientToolCallToInput(item: ClientToolCallItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    endOfTurnToInput(_item: EndOfTurnItem): ThreadItemConverterResult | Promise<ThreadItemConverterResult>;
    toAgentInput(threadItems: ThreadItem | readonly ThreadItem[]): Promise<AgentInputItem[]>;
}
export declare function simpleToAgentInput(threadItems: ThreadItem | readonly ThreadItem[]): Promise<AgentInputItem[]>;
