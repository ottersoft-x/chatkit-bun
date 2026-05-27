import { z } from "zod";

export const HandlerSchema = z.union([z.literal("client"), z.literal("server")]);
export type Handler = z.infer<typeof HandlerSchema>;

export const LoadingBehaviorSchema = z.union([
  z.literal("auto"),
  z.literal("none"),
  z.literal("self"),
  z.literal("container"),
]);
export type LoadingBehavior = z.infer<typeof LoadingBehaviorSchema>;

export const ActionConfigSchema = z.object({
  type: z.string(),
  payload: z.unknown().optional(),
  handler: HandlerSchema.default("server"),
  loadingBehavior: LoadingBehaviorSchema.default("auto"),
  streaming: z.boolean().default(true),
});
export type ActionConfig = z.infer<typeof ActionConfigSchema>;

export interface CreateActionOptions {
  handler?: Handler;
  loadingBehavior?: LoadingBehavior;
  streaming?: boolean;
}

export function createActionConfig(
  type: string,
  payload?: unknown,
  options: CreateActionOptions = {},
): ActionConfig {
  return ActionConfigSchema.parse({
    type,
    payload,
    ...options,
  });
}
