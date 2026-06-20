import type { Store } from "../store.js";
import type { JsonValue } from "../serialization.js";
import type { ThreadMetadata } from "../types/core.js";
import type { ResponseStreamConverter } from "./annotations.js";

export interface AgentContextOptions<TContext> {
  thread: ThreadMetadata;
  store: Store<TContext>;
  context: TContext;
  previousResponseId?: string | null;
  now?: () => Date | string;
}

export interface AgentStreamInput {
  [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  toStream?: () => AsyncIterable<unknown>;
}

export interface StreamAgentResponseOptions {
  converter?: ResponseStreamConverter;
}

export interface ToolCallMetadata {
  itemId: string | null;
  callId: string | null;
}

export type { JsonValue } from "../serialization.js";

export type JsonObject = { [key: string]: JsonValue };
