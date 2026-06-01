import type { Task, ThreadItem, Workflow, WorkflowSummary } from "../types/core";
import { type ThreadStreamEvent } from "../types/server";
import { type WidgetRoot } from "../widgets";
import type { AgentContextOptions, JsonObject } from "./types";
export declare class ClientToolCall {
    readonly name: string;
    readonly arguments: JsonObject;
    constructor(name: string, args?: JsonObject);
}
type WorkflowItem = Extract<ThreadItem, {
    type: "workflow";
}>;
export declare class AgentContext<TContext> {
    readonly thread: AgentContextOptions<TContext>["thread"];
    readonly store: AgentContextOptions<TContext>["store"];
    readonly context: TContext;
    readonly previousResponseId: string | null;
    workflowItem: WorkflowItem | null;
    private readonly now;
    private readonly queue;
    private clientToolCall;
    constructor(options: AgentContextOptions<TContext>);
    stream(event: ThreadStreamEvent): void;
    streamWidget(widget: WidgetRoot | AsyncIterable<WidgetRoot>, copyText?: string | null): Promise<void>;
    events(): AsyncIterable<ThreadStreamEvent>;
    closeEvents(): void;
    startWorkflow(workflow: Workflow): void;
    addWorkflowTask(task: Task): void;
    updateWorkflowTask(task: Task, taskIndex: number): void;
    endWorkflow(summary?: WorkflowSummary, expanded?: boolean): void;
    setClientToolCall(toolCall: ClientToolCall): void;
    getClientToolCall(): ClientToolCall | null;
    createdAt(): string;
}
export {};
