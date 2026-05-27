import { describe, expect, test } from "bun:test";

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
});
