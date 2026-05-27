import { describe, expect, test } from "bun:test";

import { NotFoundError, UnsupportedOperationError, ValidationError } from "../src/errors";
import {
  decodeJsonBytes,
  encodeJsonBytes,
  omitUndefinedDeep,
  parseDate,
  serializeDate,
} from "../src/serialization";

describe("serialization helpers", () => {
  test("encodes and decodes JSON bytes", () => {
    const bytes = encodeJsonBytes({ type: "example", value: 1 });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(decodeJsonBytes(bytes)).toEqual({ type: "example", value: 1 });
  });

  test("rejects top-level undefined during JSON encoding", () => {
    expect(() => encodeJsonBytes(undefined)).toThrow(ValidationError);
  });

  test("rejects BigInt JSON encoding as validation error", () => {
    let thrown: unknown;
    try {
      encodeJsonBytes(1n);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ValidationError);
    expect((thrown as ValidationError).message).toBe("Invalid JSON payload");
    expect((thrown as ValidationError).cause).toBeInstanceOf(Error);
  });

  test("rejects circular JSON encoding as validation error", () => {
    const value: Record<string, unknown> = {};
    value.self = value;

    let thrown: unknown;
    try {
      encodeJsonBytes(value);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ValidationError);
    expect((thrown as ValidationError).message).toBe("Invalid JSON payload");
    expect((thrown as ValidationError).cause).toBeInstanceOf(Error);
  });

  test("rejects malformed UTF-8 bytes before JSON parsing", () => {
    expect(() => decodeJsonBytes(new Uint8Array([0x22, 0xff, 0x22]))).toThrow(ValidationError);
  });

  test("omits undefined recursively but preserves null", () => {
    expect(
      omitUndefinedDeep({
        keepNull: null,
        dropUndefined: undefined,
        nested: { value: "x", drop: undefined },
        list: [{ a: 1, b: undefined }],
      }),
    ).toEqual({
      keepNull: null,
      nested: { value: "x" },
      list: [{ a: 1 }],
    });
  });

  test("serializes dates as ISO strings", () => {
    const date = parseDate("2026-05-26T00:00:00.000Z");
    expect(serializeDate(date)).toBe("2026-05-26T00:00:00.000Z");
  });

  test("exposes shared error classes", () => {
    expect(new NotFoundError("Thread not found").name).toBe("NotFoundError");
    expect(new UnsupportedOperationError("transcribe() is not implemented").name).toBe(
      "UnsupportedOperationError",
    );
  });
});
