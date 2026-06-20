import { describe, test } from "node:test";

import { expect } from "./helpers/expect.js";

import { ActionConfigSchema, createActionConfig } from "../src/actions.js";

describe("actions", () => {
  test("creates Python-compatible default action config", () => {
    expect(createActionConfig("open_email", { id: "email_1" })).toEqual({
      type: "open_email",
      payload: { id: "email_1" },
      handler: "server",
      loadingBehavior: "auto",
      streaming: true,
    });
  });

  test("allows explicit handler and loading behavior", () => {
    expect(
      createActionConfig("copy", undefined, {
        handler: "client",
        loadingBehavior: "none",
        streaming: false,
      }),
    ).toEqual({
      type: "copy",
      payload: undefined,
      handler: "client",
      loadingBehavior: "none",
      streaming: false,
    });
  });

  test("rejects invalid runtime action helper options", () => {
    expect(() =>
      createActionConfig("copy", undefined, { handler: "browser" } as any),
    ).toThrow();
  });

  test("validates action config wire shape", () => {
    expect(() =>
      ActionConfigSchema.parse({
        type: "copy",
        payload: null,
        handler: "browser",
        loadingBehavior: "auto",
        streaming: true,
      }),
    ).toThrow();
  });
});
