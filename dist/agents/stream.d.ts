import { type ThreadStreamEvent } from "../types/server";
import type { AgentContext } from "./context";
import type { AgentStreamInput, StreamAgentResponseOptions } from "./types";
export declare function streamAgentResponse<TContext>(context: AgentContext<TContext>, streamedRun: AgentStreamInput | AsyncIterable<unknown>, options?: StreamAgentResponseOptions): AsyncIterable<ThreadStreamEvent>;
