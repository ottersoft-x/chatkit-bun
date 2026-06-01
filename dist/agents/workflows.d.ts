import { type Task, type ThreadItem, type Workflow, type WorkflowSummary } from "../types/core";
import type { ThreadStreamEvent } from "../types/server";
import type { AgentContext } from "./context";
export type WorkflowItem = Extract<ThreadItem, {
    type: "workflow";
}>;
export type ThoughtTask = Extract<WorkflowItem["workflow"]["tasks"][number], {
    type: "thought";
}>;
export type ThreadItemAddedEvent = Extract<ThreadStreamEvent, {
    type: "thread.item.added";
}>;
export type ThreadItemDoneEvent = Extract<ThreadStreamEvent, {
    type: "thread.item.done";
}>;
export type ThreadItemUpdatedEvent = Extract<ThreadStreamEvent, {
    type: "thread.item.updated";
}>;
export declare function isWorkflowItem(item: ThreadItem | undefined): item is WorkflowItem;
export declare function createWorkflowItem<TContext>(context: AgentContext<TContext>, workflow: Workflow): WorkflowItem;
export declare function createReasoningWorkflowItem<TContext>(context: AgentContext<TContext>): WorkflowItem;
export declare function shouldEmitWorkflowAdded(workflow: Workflow): boolean;
export declare function workflowAddedEvent(workflow: WorkflowItem): ThreadItemAddedEvent;
export declare function resumeWorkflowFromThreadItems<TContext>(context: AgentContext<TContext>, items: readonly ThreadItem[]): void;
export declare function shouldAutoEndWorkflowForItem<TContext>(context: AgentContext<TContext>, item: ThreadItem): boolean;
export declare function createThoughtTask(content: string): ThoughtTask;
export declare function workflowTaskAddedEvent(workflow: WorkflowItem, task: Task, taskIndex: number): ThreadItemUpdatedEvent;
export declare function workflowTaskUpdatedEvent(workflow: WorkflowItem, task: Task, taskIndex: number): ThreadItemUpdatedEvent;
export declare function normalizeWorkflowTask(task: Task): Task;
export declare function appendWorkflowTask(workflow: WorkflowItem, task: Task): ThreadItemUpdatedEvent;
export declare function updateWorkflowTaskEvent(workflow: WorkflowItem, task: Task, taskIndex: number): ThreadItemUpdatedEvent;
export declare function durationSeconds(startedAt: string, endedAt: string): number;
export declare function finishWorkflow<TContext>(context: AgentContext<TContext>, summary?: WorkflowSummary, expanded?: boolean): ThreadItemDoneEvent | null;
export declare function persistOpenWorkflow<TContext>(context: AgentContext<TContext>): Promise<void>;
