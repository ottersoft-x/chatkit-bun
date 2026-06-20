import { describe, test } from "node:test";

import { expect } from "./helpers/expect.js";

import { accumulateText } from "../src/agents/index.js";
import { Card, Text, streamWidget } from "../src/widgets/index.js";

const testThread = {
  id: "thr_accumulate",
  created_at: "2026-05-28T00:00:00.000Z",
  status: { type: "active" as const },
  metadata: {},
};

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

async function* streamFrom(events: unknown[]): AsyncIterable<unknown> {
  for (const event of events) yield event;
}

function rawTextDelta(delta: string): unknown {
  return {
    type: "raw_response_event",
    data: {
      type: "response.output_text.delta",
      delta,
    },
  };
}

describe("accumulateText", () => {
  test("yields initial text, cumulative deltas, and final non-streaming text", async () => {
    const baseText = Text({ key: "text", value: "", streaming: true });

    const widgets = await collect(
      accumulateText(streamFrom([rawTextDelta("Hello"), rawTextDelta(", world!")]), baseText),
    );

    expect(widgets).toEqual([
      { type: "Text", key: "text", value: "", streaming: true },
      { type: "Text", key: "text", value: "Hello", streaming: true },
      { type: "Text", key: "text", value: "Hello, world!", streaming: true },
      { type: "Text", key: "text", value: "Hello, world!", streaming: false },
    ]);
    expect(widgets[0]).toBe(baseText);
    expect(widgets[1]).not.toBe(baseText);
    expect(baseText).toEqual({ type: "Text", key: "text", value: "", streaming: true });
  });

  test("composes accumulated text components with widget streaming roots", async () => {
    async function* accumulatedCards() {
      for await (const text of accumulateText(
        streamFrom([rawTextDelta("Hello"), rawTextDelta(", world!")]),
        Text({ id: "text", value: "", streaming: true }),
      )) {
        yield Card({ children: [text] });
      }
    }

    const events = await collect(
      streamWidget(testThread, accumulatedCards(), {
        generateId: () => "msg_accumulate",
        now: () => "2026-05-28T00:00:01.000Z",
      }),
    );

    expect(events).toEqual([
      {
        type: "thread.item.added",
        item: {
          id: "msg_accumulate",
          type: "widget",
          thread_id: "thr_accumulate",
          created_at: "2026-05-28T00:00:01.000Z",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "", streaming: true }],
          },
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_accumulate",
        update: {
          type: "widget.streaming_text.value_delta",
          component_id: "text",
          delta: "Hello",
          done: false,
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_accumulate",
        update: {
          type: "widget.streaming_text.value_delta",
          component_id: "text",
          delta: ", world!",
          done: false,
        },
      },
      {
        type: "thread.item.updated",
        item_id: "msg_accumulate",
        update: {
          type: "widget.root.updated",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "Hello, world!", streaming: false }],
          },
        },
      },
      {
        type: "thread.item.done",
        item: {
          id: "msg_accumulate",
          type: "widget",
          thread_id: "thr_accumulate",
          created_at: "2026-05-28T00:00:01.000Z",
          widget: {
            type: "Card",
            children: [{ type: "Text", id: "text", value: "Hello, world!", streaming: false }],
          },
        },
      },
    ]);
  });
});
