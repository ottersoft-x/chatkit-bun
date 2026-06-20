import type { MarkdownWidget, TextWidget } from "../widgets/index.js";

type AccumulatableTextWidget = TextWidget | MarkdownWidget;
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function outputTextDelta(event: unknown): string | null {
  if (!isRecord(event) || event.type !== "raw_response_event" || !isRecord(event.data)) {
    return null;
  }

  if (event.data.type !== "response.output_text.delta") {
    return null;
  }

  return typeof event.data.delta === "string" ? event.data.delta : null;
}

export type { AccumulatableTextWidget };

export async function* accumulateText<TWidget extends AccumulatableTextWidget>(
  events: AsyncIterable<unknown>,
  baseWidget: TWidget,
): AsyncGenerator<TWidget, void, unknown> {
  let text = "";

  yield baseWidget;

  for await (const event of events) {
    const delta = outputTextDelta(event);
    if (delta === null) {
      continue;
    }

    text += delta;
    yield { ...baseWidget, value: text } as TWidget;
  }

  yield { ...baseWidget, value: text, streaming: false } as TWidget;
}
