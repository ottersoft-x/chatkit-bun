import type { StoreItemType } from "../store";
import type { ThreadMetadata } from "../types/core";
import type { ThreadStreamEvent } from "../types/server";
import type { WidgetRoot } from "./types";
export interface StreamWidgetOptions {
    copyText?: string | null;
    generateId?: (itemType: StoreItemType) => string;
    now?: () => string;
}
export declare function streamWidget(thread: ThreadMetadata, widgetOrAsyncIterable: WidgetRoot | AsyncIterable<WidgetRoot>, options?: StreamWidgetOptions): AsyncIterable<ThreadStreamEvent>;
