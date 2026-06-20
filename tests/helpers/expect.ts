import assert from "node:assert/strict";

type Constructor = abstract new (...args: any[]) => any;
type ExpectedThrow = string | RegExp | Constructor | Error | ((error: unknown) => boolean);

interface Matchers<T> {
  readonly not: Matchers<T>;
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeDefined(): void;
  toBeInstanceOf(expected: Constructor): void;
  toBeGreaterThan(expected: number): void;
  toHaveLength(expected: number): void;
  toContain(expected: unknown): void;
  toContainEqual(expected: unknown): void;
  toMatch(expected: string | RegExp): void;
  toMatchObject(expected: object): void;
  toHaveProperty(property: string): void;
  toThrow(expected?: ExpectedThrow): void;
}

interface AsyncMatchers<T> {
  toBe(expected: unknown): Promise<void>;
  toEqual(expected: unknown): Promise<void>;
  toBeInstanceOf(expected: Constructor): Promise<void>;
  toMatchObject(expected: object): Promise<void>;
  toThrow(expected?: ExpectedThrow): Promise<void>;
}

interface Expectation<T> extends Matchers<T> {
  readonly resolves: AsyncMatchers<Awaited<T>>;
  readonly rejects: AsyncMatchers<unknown>;
}

function isPropertyCheckable(value: unknown): value is object {
  return (typeof value === "object" || typeof value === "function") && value !== null;
}

function hasLength(value: unknown): value is { length: number } {
  return typeof value === "object" && value !== null && "length" in value;
}

function matchObject(actual: unknown, expected: object): void {
  assert.partialDeepStrictEqual(actual, expected);
}

function normalizeEqualValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeEqualValue(item));
  }

  if (value == null || typeof value !== "object") {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      normalized[key] = normalizeEqualValue(entry);
    }
  }
  return normalized;
}

function valuesContainEqual(actual: unknown[], expected: unknown): boolean {
  return actual.some((item) => {
    try {
      assert.deepStrictEqual(normalizeEqualValue(item), normalizeEqualValue(expected));
      return true;
    } catch {
      return false;
    }
  });
}

function expectedThrowMatches(error: unknown, expected: ExpectedThrow): boolean {
  if (typeof expected === "string") {
    return error instanceof Error && error.message.includes(expected);
  }

  if (expected instanceof RegExp) {
    return error instanceof Error && expected.test(error.message);
  }

  if (expected instanceof Error) {
    try {
      assert.deepStrictEqual(error, expected);
      return true;
    } catch {
      return false;
    }
  }

  if (typeof expected === "function") {
    const prototype = (expected as { prototype?: unknown }).prototype;
    if (prototype instanceof Error) {
      return error instanceof (expected as new (...args: any[]) => Error);
    }

    return (expected as (error: unknown) => boolean)(error);
  }

  return false;
}

function makeThrowExpectation(fn: unknown, expected: ExpectedThrow | undefined, isNot: boolean, message?: string): void {
  assert.equal(typeof fn, "function", message);

  if (isNot) {
    try {
      (fn as () => unknown)();
    } catch (error) {
      if (expected === undefined || expectedThrowMatches(error, expected)) {
        assert.fail(message);
      }
    }
    return;
  }

  if (expected === undefined) {
    assert.throws(fn as () => unknown, message);
    return;
  }

  if (typeof expected === "string") {
    assert.throws(fn as () => unknown, (error: unknown) => {
      assert(error instanceof Error);
      return error.message.includes(expected);
    }, message);
    return;
  }

  assert.throws(fn as () => unknown, expected as Parameters<typeof assert.throws>[1], message);
}

function makeMatchers<T>(actual: T, isNot = false, message?: string): Matchers<T> {
  return {
    get not() {
      return makeMatchers(actual, !isNot, message);
    },
    toBe(expected: unknown) {
      if (isNot) {
        assert.notStrictEqual(actual, expected, message);
        return;
      }
      assert.strictEqual(actual, expected, message);
    },
    toEqual(expected: unknown) {
      if (isNot) {
        assert.notDeepStrictEqual(normalizeEqualValue(actual), normalizeEqualValue(expected), message);
        return;
      }
      assert.deepStrictEqual(normalizeEqualValue(actual), normalizeEqualValue(expected), message);
    },
    toBeNull() {
      if (isNot) {
        assert.notStrictEqual(actual, null, message);
        return;
      }
      assert.strictEqual(actual, null, message);
    },
    toBeTruthy() {
      assert.ok(isNot ? !actual : actual, message);
    },
    toBeDefined() {
      if (isNot) {
        assert.strictEqual(actual, undefined, message);
        return;
      }
      assert.notStrictEqual(actual, undefined, message);
    },
    toBeInstanceOf(expected: Constructor) {
      assert.ok(isNot ? !(actual instanceof expected) : actual instanceof expected, message);
    },
    toBeGreaterThan(expected: number) {
      assert.equal(typeof actual, "number", message);
      assert.ok(isNot ? !((actual as number) > expected) : (actual as number) > expected, message);
    },
    toHaveLength(expected: number) {
      assert.ok(hasLength(actual), message);
      if (isNot) {
        assert.notStrictEqual(actual.length, expected, message);
        return;
      }
      assert.strictEqual(actual.length, expected, message);
    },
    toContain(expected: unknown) {
      assert.ok(actual !== null && actual !== undefined, message);
      assert.ok(typeof (actual as { includes?: unknown }).includes === "function", message);
      const contains = ((actual as unknown) as { includes: (value: unknown) => boolean }).includes(expected);
      assert.ok(isNot ? !contains : contains, message);
    },
    toContainEqual(expected: unknown) {
      assert.ok(Array.isArray(actual), message);
      const contains = valuesContainEqual(actual, expected);
      assert.ok(isNot ? !contains : contains, message);
    },
    toMatch(expected: string | RegExp) {
      assert.equal(typeof actual, "string", message);
      const actualString = actual as string;
      if (typeof expected === "string") {
        assert.ok(isNot ? !actualString.includes(expected) : actualString.includes(expected), message);
        return;
      }
      if (isNot) {
        assert.doesNotMatch(actualString, expected, message);
        return;
      }
      assert.match(actualString, expected, message);
    },
    toMatchObject(expected: object) {
      assert.ok(isPropertyCheckable(actual), message);
      if (isNot) {
        try {
          matchObject(actual, expected);
        } catch (error) {
          if (error instanceof assert.AssertionError) {
            return;
          }
          throw error;
        }
        assert.fail(message);
      }
      matchObject(actual, expected);
    },
    toHaveProperty(property: string) {
      assert.ok(isPropertyCheckable(actual), message);
      assert.ok(isNot ? !(property in actual) : property in actual, message);
    },
    toThrow(expected?: ExpectedThrow) {
      makeThrowExpectation(actual, expected, isNot, message);
    },
  };
}

function makeAsyncMatchers<T>(promise: Promise<T>, mode: "resolves" | "rejects", message?: string): AsyncMatchers<T> {
  const resolveActual = async (): Promise<unknown> => {
    if (mode === "resolves") {
      return promise;
    }

    try {
      await promise;
    } catch (error) {
      return error;
    }

    assert.fail(message ?? "Expected promise to reject");
  };

  return {
    async toBe(expected: unknown) {
      makeMatchers(await resolveActual(), false, message).toBe(expected);
    },
    async toEqual(expected: unknown) {
      makeMatchers(await resolveActual(), false, message).toEqual(expected);
    },
    async toBeInstanceOf(expected: Constructor) {
      makeMatchers(await resolveActual(), false, message).toBeInstanceOf(expected);
    },
    async toMatchObject(expected: object) {
      makeMatchers(await resolveActual(), false, message).toMatchObject(expected);
    },
    async toThrow(expected?: ExpectedThrow) {
      const actual = await resolveActual();
      if (mode === "rejects") {
        if (expected === undefined) {
          return;
        }

        assert.ok(expectedThrowMatches(actual, expected), message);
        return;
      }

      makeMatchers(actual, false, message).toThrow(expected);
    },
  };
}

export function expect<T>(actual: T, message?: string): Expectation<T> {
  const matchers = makeMatchers(actual, false, message) as Expectation<T>;
  Object.defineProperties(matchers, {
    resolves: {
      get() {
        return makeAsyncMatchers(Promise.resolve(actual), "resolves", message);
      },
    },
    rejects: {
      get() {
        return makeAsyncMatchers(Promise.resolve(actual), "rejects", message);
      },
    },
  });
  return matchers;
}
