import { ValidationError } from "./errors.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function encodeJsonBytes(value: unknown): Uint8Array {
  let json: string | undefined;
  try {
    json = JSON.stringify(omitUndefinedDeep(value));
  } catch (error) {
    throw new ValidationError("Invalid JSON payload", error);
  }
  if (typeof json !== "string") {
    throw new ValidationError("Invalid JSON payload");
  }
  return encoder.encode(json);
}

export function decodeJsonBytes(input: string | Uint8Array | ArrayBuffer): unknown {
  let text: string;
  try {
    text =
      typeof input === "string"
        ? input
        : input instanceof Uint8Array
          ? decoder.decode(input)
          : decoder.decode(new Uint8Array(input));
  } catch (error) {
    throw new ValidationError("Invalid JSON payload", error);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ValidationError("Invalid JSON payload", error);
  }
}

export function omitUndefinedDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) {
        result[key] = omitUndefinedDeep(child);
      }
    }
    return result;
  }

  return value;
}

export function parseDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new ValidationError(`Invalid datetime: ${String(value)}`);
  }
  return date;
}

export function serializeDate(value: string | Date): string {
  return parseDate(value).toISOString();
}
