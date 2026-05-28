import type { Store } from "../store";
import type { ThreadMetadata } from "../types/core";

export interface AgentContextOptions<TContext> {
  thread: ThreadMetadata;
  store: Store<TContext>;
  context: TContext;
  now?: () => Date | string;
}

export interface AgentStreamInput {
  [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  toStream?: () => AsyncIterable<unknown>;
}

export interface ToolCallMetadata {
  itemId: string | null;
  callId: string | null;
}

export type JsonObject = Record<string, unknown>;
