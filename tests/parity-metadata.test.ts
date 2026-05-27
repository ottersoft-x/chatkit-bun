import { describe, expect, test } from "bun:test";

import upstream from "../docs/parity/upstream.json";

describe("upstream parity metadata", () => {
  test("records the pinned Python package reference", () => {
    expect(upstream.packageName).toBe("openai-chatkit");
    expect(upstream.version).toBe("1.6.5");
    expect(upstream.submodulePath).toBe("packages/chatkit-python");
    expect(upstream.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});
