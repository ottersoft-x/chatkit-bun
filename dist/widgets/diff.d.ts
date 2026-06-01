import type { ThreadItemUpdate } from "../types/server";
import type { WidgetRoot } from "./types";
type WidgetDiffUpdate = Extract<ThreadItemUpdate, {
    type: "widget.root.updated" | "widget.streaming_text.value_delta";
}>;
export declare function diffWidget(before: WidgetRoot, after: WidgetRoot): WidgetDiffUpdate[];
export {};
