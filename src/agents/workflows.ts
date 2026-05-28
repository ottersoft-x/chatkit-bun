import { WorkflowSchema, type ThreadItem, type Workflow, type WorkflowSummary } from "../types/core";
import type { ThreadStreamEvent } from "../types/server";
import type { AgentContext } from "./context";

export type WorkflowItem = Extract<ThreadItem, { type: "workflow" }>;
export type ThoughtTask = Extract<WorkflowItem["workflow"]["tasks"][number], { type: "thought" }>;
export type ThreadItemAddedEvent = Extract<ThreadStreamEvent, { type: "thread.item.added" }>;
export type ThreadItemDoneEvent = Extract<ThreadStreamEvent, { type: "thread.item.done" }>;
export type ThreadItemUpdatedEvent = Extract<ThreadStreamEvent, { type: "thread.item.updated" }>;

export function createWorkflowItem<TContext>(
  context: AgentContext<TContext>,
  workflow: Workflow,
): WorkflowItem {
  const parsedWorkflow = WorkflowSchema.parse(workflow);

  return {
    id: context.store.generateItemId("workflow", context.thread, context.context),
    thread_id: context.thread.id,
    created_at: context.createdAt(),
    type: "workflow",
    workflow: parsedWorkflow,
  };
}

export function createReasoningWorkflowItem<TContext>(
  context: AgentContext<TContext>,
): WorkflowItem {
  return createWorkflowItem(context, {
    type: "reasoning",
    tasks: [],
    expanded: false,
  });
}

export function shouldEmitWorkflowAdded(workflow: Workflow): boolean {
  return workflow.type === "reasoning" || workflow.tasks.length > 0;
}

export function workflowAddedEvent(workflow: WorkflowItem): ThreadItemAddedEvent {
  return {
    type: "thread.item.added",
    item: workflow,
  };
}

export function durationSeconds(startedAt: string, endedAt: string): number {
  const started = Date.parse(startedAt);
  const ended = Date.parse(endedAt);

  if (!Number.isFinite(started) || !Number.isFinite(ended)) {
    return 0;
  }

  return Math.max(0, Math.floor((ended - started) / 1000));
}

export function finishWorkflow<TContext>(
  context: AgentContext<TContext>,
  summary?: WorkflowSummary,
  expanded = false,
): ThreadItemDoneEvent | null {
  const workflow = context.workflowItem;

  if (!workflow) {
    return null;
  }

  if (workflow.workflow.type !== "reasoning" && workflow.workflow.tasks.length === 0) {
    context.workflowItem = null;
    return null;
  }

  const endedAt = context.createdAt();
  const doneItem: WorkflowItem = {
    ...workflow,
    workflow: {
      ...workflow.workflow,
      summary:
        summary ??
        workflow.workflow.summary ??
        { duration: durationSeconds(workflow.created_at, endedAt) },
      expanded,
    },
  };
  context.workflowItem = null;

  return {
    type: "thread.item.done",
    item: doneItem,
  };
}
