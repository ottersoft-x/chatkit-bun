import { z } from "zod";
export declare const HandlerSchema: z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>;
export type Handler = z.infer<typeof HandlerSchema>;
export declare const LoadingBehaviorSchema: z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>;
export type LoadingBehavior = z.infer<typeof LoadingBehaviorSchema>;
export declare const ActionConfigSchema: z.ZodObject<{
    type: z.ZodString;
    payload: z.ZodOptional<z.ZodUnknown>;
    handler: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"client">, z.ZodLiteral<"server">]>>;
    loadingBehavior: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodLiteral<"none">, z.ZodLiteral<"self">, z.ZodLiteral<"container">]>>;
    streaming: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type ActionConfig = z.infer<typeof ActionConfigSchema>;
export interface CreateActionOptions {
    handler?: Handler;
    loadingBehavior?: LoadingBehavior;
    streaming?: boolean;
}
export declare function createActionConfig(type: string, payload?: unknown, options?: CreateActionOptions): ActionConfig;
