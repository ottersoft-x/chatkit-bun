import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { expect } from "./helpers/expect.js";

describe("expect helper negation", () => {
  test("not.toHaveProperty requires a property-checkable receiver", () => {
    assert.throws(() => expect(undefined).not.toHaveProperty("summary"));
    assert.throws(() => expect(null).not.toHaveProperty("summary"));
  });

  test("not.toHaveProperty passes only when the property is absent", () => {
    expect({ title: "Prepared" }).not.toHaveProperty("summary");
    assert.throws(() => expect({ summary: "Done" }).not.toHaveProperty("summary"));
  });
});
