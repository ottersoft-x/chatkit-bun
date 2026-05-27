import { describe, expect, test } from "bun:test";

import {
  DynamicWidgetRootSchema,
  serializeWidget,
  type DynamicWidgetRoot,
} from "../src/widgets";

const widgetFixtures = [
  "card_no_data",
  "card_with_data",
  "list_view_no_data",
  "list_view_with_data",
  "basic_root",
] as const;

describe("widgets", () => {
  test("has copied upstream widget fixtures", async () => {
    for (const name of widgetFixtures) {
      expect(await Bun.file(`tests/assets/widgets/${name}.widget`).exists()).toBe(true);
      expect(await Bun.file(`tests/assets/widgets/${name}.json`).exists()).toBe(true);
    }
  });

  test("serializes dynamic widgets while omitting undefined fields", () => {
    const widget: DynamicWidgetRoot = {
      type: "Card",
      key: undefined,
      children: [
        {
          type: "Text",
          value: "Hello",
          streaming: undefined,
          color: undefined,
        },
      ],
    };

    expect(serializeWidget(widget)).toEqual({
      type: "Card",
      children: [{ type: "Text", value: "Hello" }],
    });
  });

  test("validates dynamic widget roots", () => {
    expect(DynamicWidgetRootSchema.parse({ type: "Basic", children: [] })).toEqual({
      type: "Basic",
      children: [],
    });

    expect(() => DynamicWidgetRootSchema.parse({ type: "Text", value: "No root" })).toThrow();
  });
});
