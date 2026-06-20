import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { WidgetTemplate, createActionConfig } from "chatkit-nodejs";

import { loadConsumerRelativeTemplate } from "./consumer.js";

const fixtureUrl = new URL("./fixtures/relative.widget", import.meta.url);

async function writeRelativeWidgetFixture(): Promise<void> {
  const fixturePath = fileURLToPath(fixtureUrl);
  await mkdir(dirname(fixturePath), { recursive: true });
  await writeFile(
    fixturePath,
    JSON.stringify({
      version: "1.0",
      name: "relative-smoke",
      template: "{\"type\":\"Card\",\"children\":[{\"type\":\"Text\",\"value\":\"{{ message }}\"}]}",
    }),
  );
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
  await writeRelativeWidgetFixture();

  const template = await loadConsumerRelativeTemplate();
  const widget = template.build({ message: "Loaded from consumer" });

  assert.equal(template.name, "relative-smoke");
  assert.deepEqual(widget, {
    type: "Card",
    children: [{ type: "Text", value: "Loaded from consumer" }],
  });
});
