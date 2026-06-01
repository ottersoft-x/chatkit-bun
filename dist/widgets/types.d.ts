import { z } from "zod";
export type WidgetPrimitive = string | number | boolean | null;
export type WidgetJson = WidgetPrimitive | WidgetJson[] | {
    [key: string]: WidgetJson | undefined;
};
export type DynamicWidgetComponent = {
    type: string;
    key?: string;
    id?: string;
    children?: DynamicWidgetComponent | DynamicWidgetComponent[];
    [key: string]: WidgetJson | DynamicWidgetComponent | DynamicWidgetComponent[] | undefined;
};
export type BasicRoot = DynamicWidgetComponent & {
    type: "Basic";
};
export type DynamicWidgetRoot = DynamicWidgetComponent & {
    type: "Card" | "ListView" | "Basic";
};
export declare const WidgetJsonSchema: z.ZodType<WidgetJson>;
export declare const DynamicWidgetComponentSchema: z.ZodType<DynamicWidgetComponent>;
export declare const BasicRootSchema: z.ZodType<BasicRoot>;
export declare const DynamicWidgetRootSchema: z.ZodType<DynamicWidgetRoot>;
export type WidgetComponent = DynamicWidgetComponent;
export type WidgetRoot = DynamicWidgetRoot;
