import { DynamicWidgetRootSchema, type WidgetJson, type WidgetRoot } from "./types";

function omitUndefinedDeep(value: unknown): WidgetJson {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => omitUndefinedDeep(item)) as WidgetJson[];
  }

  if (value != null && typeof value === "object") {
    const source =
      typeof (value as { toJSON?: () => unknown }).toJSON === "function"
        ? (value as { toJSON: () => unknown }).toJSON()
        : value;

    if (source == null || typeof source !== "object" || Array.isArray(source)) {
      return omitUndefinedDeep(source);
    }

    const entries = Object.entries(source as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, omitUndefinedDeep(entryValue)] as const);

    return Object.fromEntries(entries) as WidgetJson;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  throw new TypeError(`Unsupported widget value: ${String(value)}`);
}

export function serializeWidget(widget: WidgetRoot): Record<string, unknown> {
  const parsed = DynamicWidgetRootSchema.parse(widget);
  const serialized = omitUndefinedDeep(parsed);
  if (serialized == null || typeof serialized !== "object" || Array.isArray(serialized)) {
    throw new TypeError("Widget root must serialize to an object.");
  }
  return serialized as Record<string, unknown>;
}
