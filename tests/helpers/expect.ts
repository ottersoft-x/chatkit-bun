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

function makeThrowExpectation(fn: unknown, expected?: ExpectedThrow): void {
  assert.equal(typeof fn, "function");

  if (expected === undefined) {
    assert.throws(fn as () => unknown);
    return;
  }

  if (typeof expected === "string") {
    assert.throws(fn as () => unknown, (error: unknown) => {
      assert(error instanceof Error);
      return error.message.includes(expected);
    });
    return;
  }

  assert.throws(fn as () => unknown, expected as Parameters<typeof assert.throws>[1]);
}

function makeMatchers<T>(actual: T, isNot = false): Matchers<T> {
  const run = (assertion: () => void): void => {
    if (isNot) {
      assert.throws(assertion);
      return;
    }

    assertion();
  };

  return {
    get not() {
      return makeMatchers(actual, !isNot);
    },
    toBe(expected: unknown) {
      run(() => assert.strictEqual(actual, expected));
    },
    toEqual(expected: unknown) {
      run(() => assert.deepStrictEqual(normalizeEqualValue(actual), normalizeEqualValue(expected)));
    },
    toBeNull() {
      run(() => assert.strictEqual(actual, null));
    },
    toBeTruthy() {
      run(() => assert.ok(actual));
    },
    toBeDefined() {
      run(() => assert.notStrictEqual(actual, undefined));
    },
    toBeInstanceOf(expected: Constructor) {
      run(() => assert.ok(actual instanceof expected));
    },
    toBeGreaterThan(expected: number) {
      run(() => {
        assert.equal(typeof actual, "number");
        assert.ok((actual as number) > expected);
      });
    },
    toHaveLength(expected: number) {
      run(() => {
        assert.ok(hasLength(actual));
        assert.strictEqual(actual.length, expected);
      });
    },
    toContain(expected: unknown) {
      run(() => {
        assert.ok(actual !== null && actual !== undefined);
        assert.ok(typeof (actual as { includes?: unknown }).includes === "function");
        assert.ok(((actual as unknown) as { includes: (value: unknown) => boolean }).includes(expected));
      });
    },
    toContainEqual(expected: unknown) {
      run(() => {
        assert.ok(Array.isArray(actual));
        assert.ok(
          actual.some((item) => {
            try {
              assert.deepStrictEqual(normalizeEqualValue(item), normalizeEqualValue(expected));
              return true;
            } catch {
              return false;
            }
          }),
        );
      });
    },
    toMatch(expected: string | RegExp) {
      run(() => {
        assert.equal(typeof actual, "string");
        const actualString = actual as string;
        if (typeof expected === "string") {
          assert.ok(actualString.includes(expected));
          return;
        }
        assert.match(actualString, expected);
      });
    },
    toMatchObject(expected: object) {
      run(() => matchObject(actual, expected));
    },
    toHaveProperty(property: string) {
      run(() => {
        assert.ok(actual !== null && actual !== undefined);
        assert.ok(property in Object(actual));
      });
    },
    toThrow(expected?: ExpectedThrow) {
      run(() => makeThrowExpectation(actual, expected));
    },
  };
}

function makeAsyncMatchers<T>(promise: Promise<T>, mode: "resolves" | "rejects"): AsyncMatchers<T> {
  const resolveActual = async (): Promise<unknown> => {
    if (mode === "resolves") {
      return promise;
    }

    try {
      await promise;
    } catch (error) {
      return error;
    }

    assert.fail("Expected promise to reject");
  };

  return {
    async toBe(expected: unknown) {
      makeMatchers(await resolveActual()).toBe(expected);
    },
    async toEqual(expected: unknown) {
      makeMatchers(await resolveActual()).toEqual(expected);
    },
    async toBeInstanceOf(expected: Constructor) {
      makeMatchers(await resolveActual()).toBeInstanceOf(expected);
    },
    async toMatchObject(expected: object) {
      makeMatchers(await resolveActual()).toMatchObject(expected);
    },
    async toThrow(expected?: ExpectedThrow) {
      const actual = await resolveActual();
      if (mode === "rejects") {
        if (expected === undefined) {
          return;
        }

        if (typeof expected === "string") {
          assert(actual instanceof Error);
          assert.ok(actual.message.includes(expected));
          return;
        }

        if (expected instanceof RegExp) {
          assert(actual instanceof Error);
          assert.match(actual.message, expected);
          return;
        }

        if (expected instanceof Error) {
          assert.deepStrictEqual(actual, expected);
          return;
        }

        if (typeof expected === "function") {
          const prototype = (expected as { prototype?: unknown }).prototype;
          if (prototype instanceof Error) {
            assert.ok(actual instanceof (expected as new (...args: any[]) => Error));
            return;
          }

          assert.ok((expected as (error: unknown) => boolean)(actual));
          return;
        }
      }

      makeMatchers(actual).toThrow(expected);
    },
  };
}

export function expect<T>(actual: T, _message?: string): Expectation<T> {
  const matchers = makeMatchers(actual) as Expectation<T>;
  Object.defineProperties(matchers, {
    resolves: {
      get() {
        return makeAsyncMatchers(Promise.resolve(actual), "resolves");
      },
    },
    rejects: {
      get() {
        return makeAsyncMatchers(Promise.resolve(actual), "rejects");
      },
    },
  });
  return matchers;
}
