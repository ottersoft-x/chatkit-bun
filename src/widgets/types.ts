import { z } from "zod";

export type WidgetPrimitive = string | number | boolean | null;
export type WidgetJson = WidgetPrimitive | WidgetJson[] | { [key: string]: WidgetJson | undefined };

export type DynamicWidgetComponent = {
  type: string;
  key?: string;
  id?: string;
  children?: DynamicWidgetComponent | DynamicWidgetComponent[];
  [key: string]: WidgetJson | DynamicWidgetComponent | DynamicWidgetComponent[] | undefined;
};

export type BasicRoot = DynamicWidgetComponent & { type: "Basic" };
export type DynamicWidgetRoot = DynamicWidgetComponent & { type: "Card" | "ListView" | "Basic" };

export const WidgetJsonSchema: z.ZodType<WidgetJson> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(WidgetJsonSchema),
    z.record(z.string(), z.union([WidgetJsonSchema, z.undefined()])),
  ]),
);

export const DynamicWidgetComponentSchema: z.ZodType<DynamicWidgetComponent> = z.lazy(() =>
  z
    .object({
      type: z.string(),
      key: z.string().optional(),
      id: z.string().optional(),
      children: z
        .union([DynamicWidgetComponentSchema, z.array(DynamicWidgetComponentSchema)])
        .optional(),
    })
    .catchall(WidgetJsonSchema.optional()) as z.ZodType<DynamicWidgetComponent>,
);

export const BasicRootSchema: z.ZodType<BasicRoot> = DynamicWidgetComponentSchema.refine(
  (value): value is BasicRoot => value.type === "Basic",
);

export const DynamicWidgetRootSchema: z.ZodType<DynamicWidgetRoot> =
  DynamicWidgetComponentSchema.refine(
    (value): value is DynamicWidgetRoot =>
      value.type === "Card" || value.type === "ListView" || value.type === "Basic",
  );

export type WidgetComponent = DynamicWidgetComponent;
export type WidgetRoot = DynamicWidgetRoot;
