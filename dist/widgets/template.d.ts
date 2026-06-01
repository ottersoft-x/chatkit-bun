import { type BasicRoot, type DynamicWidgetRoot } from "./types";
export interface WidgetTemplateDefinition {
    version: string;
    name: string;
    template: string;
    dataSchema?: Record<string, unknown>;
    jsonSchema?: Record<string, unknown>;
}
export declare class WidgetTemplate {
    readonly version: string;
    readonly name: string;
    readonly template: string;
    readonly dataSchema: Record<string, unknown>;
    readonly jsonSchema?: Record<string, unknown>;
    constructor(definition: WidgetTemplateDefinition);
    static fromFile(path: string): Promise<WidgetTemplate>;
    build(data?: unknown): DynamicWidgetRoot;
    buildBasic(data?: unknown): BasicRoot;
}
