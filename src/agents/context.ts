import type { Task, ThreadItem, Workflow, WorkflowSummary } from "../types/core";
import { ThreadStreamEventSchema, type ThreadStreamEvent } from "../types/server";
import { streamWidget as streamWidgetEvents, type WidgetRoot } from "../widgets";
import type { AgentContextOptions, JsonObject } from "./types";
import {
  appendWorkflowTask,
  createWorkflowItem,
  finishWorkflow,
  normalizeWorkflowTask,
  shouldEmitWorkflowAdded,
  updateWorkflowTaskEvent,
  workflowAddedEvent,
} from "./workflows";

class AsyncEventQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = [];
  private readonly waiting: Array<(result: IteratorResult<T>) => void> = [];
  private closed = false;

  push(value: T): void {
    if (this.closed) {
      throw new Error("Cannot stream events after the agent context has completed.");
    }

    const resolve = this.waiting.shift();

    if (resolve) {
      resolve({ done: false, value });
      return;
    }

    this.values.push(value);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    for (const resolve of this.waiting.splice(0)) {
      resolve({ done: true, value: undefined });
    }
  }

  async next(): Promise<IteratorResult<T>> {
    const value = this.values.shift();

    if (value !== undefined) {
      return { done: false, value };
    }

    if (this.closed) {
      return { done: true, value: undefined };
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => this.next(),
      return: async () => {
        this.close();
        return { done: true, value: undefined };
      },
    };
  }
}

export class ClientToolCall {
  readonly arguments: JsonObject;

  constructor(
    readonly name: string,
    args: JsonObject = {},
  ) {
    this.arguments = args;
  }
}

type WorkflowItem = Extract<ThreadItem, { type: "workflow" }>;

export class AgentContext<TContext> {
  readonly thread: AgentContextOptions<TContext>["thread"];
  readonly store: AgentContextOptions<TContext>["store"];
  readonly context: TContext;
  workflowItem: WorkflowItem | null = null;
  private readonly now: () => Date | string;
  private readonly queue = new AsyncEventQueue<ThreadStreamEvent>();
  private clientToolCall: ClientToolCall | null = null;

  constructor(options: AgentContextOptions<TContext>) {
    this.thread = options.thread;
    this.store = options.store;
    this.context = options.context;
    this.now = options.now ?? (() => new Date());
  }

  stream(event: ThreadStreamEvent): void {
    this.queue.push(ThreadStreamEventSchema.parse(event));
  }

  async streamWidget(
    widget: WidgetRoot | AsyncIterable<WidgetRoot>,
    copyText?: string | null,
  ): Promise<void> {
    for await (const event of streamWidgetEvents(this.thread, widget, {
      copyText,
      generateId: (itemType) => this.store.generateItemId(itemType, this.thread, this.context),
      now: () => this.createdAt(),
    })) {
      this.stream(event);
    }
  }

  events(): AsyncIterable<ThreadStreamEvent> {
    return this.queue;
  }

  closeEvents(): void {
    this.queue.close();
  }

  startWorkflow(workflow: Workflow): void {
    const item = createWorkflowItem(this, workflow);
    this.workflowItem = item;

    if (shouldEmitWorkflowAdded(item.workflow)) {
      this.stream(workflowAddedEvent(item));
    }
  }

  addWorkflowTask(task: Task): void {
    const normalizedTask = normalizeWorkflowTask(task);

    if (!this.workflowItem) {
      this.workflowItem = createWorkflowItem(this, {
        type: "custom",
        tasks: [],
        expanded: false,
      });
    }

    const shouldEmitAdded =
      this.workflowItem.workflow.type !== "reasoning" &&
      this.workflowItem.workflow.tasks.length === 0;
    const event = appendWorkflowTask(this.workflowItem, normalizedTask);

    this.stream(shouldEmitAdded ? workflowAddedEvent(this.workflowItem) : event);
  }

  updateWorkflowTask(task: Task, taskIndex: number): void {
    if (!this.workflowItem) {
      throw new Error("Workflow is not set");
    }

    this.stream(updateWorkflowTaskEvent(this.workflowItem, task, taskIndex));
  }

  endWorkflow(summary?: WorkflowSummary, expanded = false): void {
    const event = finishWorkflow(this, summary, expanded);

    if (event) {
      this.stream(event);
    }
  }

  setClientToolCall(toolCall: ClientToolCall): void {
    if (this.clientToolCall) {
      throw new Error("Only one client tool call can be set per response.");
    }

    this.clientToolCall = toolCall;
  }

  getClientToolCall(): ClientToolCall | null {
    return this.clientToolCall;
  }

  createdAt(): string {
    const value = this.now();
    return typeof value === "string" ? value : value.toISOString();
  }
}
