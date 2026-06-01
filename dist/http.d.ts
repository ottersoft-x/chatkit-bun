import { type ChatKitServer } from "./server";
export interface ChatKitHandlerOptions<TContext> {
    getContext?: (request: Request) => TContext | Promise<TContext>;
}
export type ChatKitHandler = (request: Request) => Promise<Response>;
export declare function createChatKitHandler<TContext = undefined>(server: ChatKitServer<TContext>, options?: ChatKitHandlerOptions<TContext>): ChatKitHandler;
