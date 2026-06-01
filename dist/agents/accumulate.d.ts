import type { MarkdownWidget, TextWidget } from "../widgets";
type AccumulatableTextWidget = TextWidget | MarkdownWidget;
export type { AccumulatableTextWidget };
export declare function accumulateText<TWidget extends AccumulatableTextWidget>(events: AsyncIterable<unknown>, baseWidget: TWidget): AsyncGenerator<TWidget, void, unknown>;
