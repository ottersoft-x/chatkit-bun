import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { WidgetTemplate, createActionConfig } from "chatkit-nodejs";

import { loadConsumerRelativeTemplate } from "./consumer/consumer.js";

const consumerFixtureUrl = new URL("./consumer/fixtures/relative.widget", import.meta.url);
const decoyFixtureUrl = new URL("./fixtures/relative.widget", import.meta.url);

async function writeWidgetFixture(fixtureUrl: URL, name: string, message: string): Promise<void> {
  const fixturePath = fileURLToPath(fixtureUrl);
  await mkdir(dirname(fixturePath), { recursive: true });
  await writeFile(
    fixturePath,
    JSON.stringify({
      version: "1.0",
      name,
      template: `{"type":"Card","children":[{"type":"Text","value":"${message}: {{ message }}"}]}`,
    }),
  );
}

async function writeRelativeWidgetFixtures(): Promise<void> {
  await writeWidgetFixture(consumerFixtureUrl, "relative-smoke", "Consumer");
  await writeWidgetFixture(decoyFixtureUrl, "test-relative-decoy", "Decoy");
}

test("imports the compiled package through package exports", () => {
  assert.equal(typeof WidgetTemplate, "function");
  assert.deepEqual(createActionConfig("open_details"), {
    type: "open_details",
    payload: undefined,
    handler: "server",
    loadingBehavior: "auto",
    streaming: true,
  });
});

test("loads caller-relative widget files from a consumer module", async () => {
  await writeRelativeWidgetFixtures();

  const template = await loadConsumerRelativeTemplate();
  const widget = template.build({ message: "Loaded from consumer" });

  assert.equal(template.name, "relative-smoke");
  assert.deepEqual(widget, {
    type: "Card",
    children: [{ type: "Text", value: "Consumer: Loaded from consumer" }],
  });
});
