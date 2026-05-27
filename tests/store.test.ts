import { describe, expect, test } from "bun:test";

import { defaultGenerateId } from "../src/store";

describe("store helpers", () => {
  test.each([
    ["thread", /^thr_[0-9a-f]{8}$/],
    ["message", /^msg_[0-9a-f]{8}$/],
    ["tool_call", /^tc_[0-9a-f]{8}$/],
    ["task", /^tsk_[0-9a-f]{8}$/],
    ["workflow", /^wf_[0-9a-f]{8}$/],
    ["attachment", /^atc_[0-9a-f]{8}$/],
    ["sdk_hidden_context", /^shcx_[0-9a-f]{8}$/],
  ] as const)("generates %s ids", (itemType, pattern) => {
    expect(defaultGenerateId(itemType)).toMatch(pattern);
  });
});
