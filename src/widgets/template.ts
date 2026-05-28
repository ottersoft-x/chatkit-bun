import { dirname, isAbsolute, join } from "node:path";

import nunjucks from "nunjucks";

import { serializeWidget } from "./serialization";
import {
  BasicRootSchema,
  DynamicWidgetRootSchema,
  type BasicRoot,
  type DynamicWidgetRoot,
} from "./types";

const env = new nunjucks.Environment(undefined, {
  autoescape: false,
  throwOnUndefined: true,
});

env.addFilter("tojson", (value: unknown) => {
  if (value === undefined) {
    throw new Error("Missing template variable.");
  }
  return JSON.stringify(value);
});

export interface WidgetTemplateDefinition {
  version: string;
  name: string;
  template: string;
  dataSchema?: Record<string, unknown>;
  jsonSchema?: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function callerDirectory(): string | null {
  const stack = new Error().stack ?? "";
  const lines = stack.split("\n").slice(2);

  for (const line of lines) {
    const match = line.match(/\(?((?:file:\/\/)?\/[^:)]+):\d+:\d+\)?/);
    if (!match) continue;

    const matchedPath = match[1];
    if (matchedPath == null) continue;

    const path = decodeURI(matchedPath.replace(/^file:\/\//, ""));
    if (!path.includes("/src/widgets/template.")) {
      return dirname(path);
    }
  }

  return null;
}

function resolveWidgetPath(path: string): string {
  if (isAbsolute(path)) {
    return path;
  }

  const callerPath = callerDirectory();
  if (callerPath != null) {
    return join(callerPath, path);
  }

  return join(process.cwd(), path);
}

function normalizeData(data: unknown): Record<string, unknown> {
  if (data == null) {
    return {};
  }

  if (typeof data === "object" && typeof (data as { toJSON?: () => unknown }).toJSON === "function") {
    const json = (data as { toJSON: () => unknown }).toJSON();
    if (isPlainObject(json)) {
      return json;
    }
    throw new TypeError("Widget template data toJSON() must return a plain object.");
  }

  if (isPlainObject(data)) {
    return data;
  }

  throw new TypeError("Widget template data must be a plain object.");
}

function parseRenderedTemplate(rendered: string, name: string): unknown {
  try {
    return JSON.parse(rendered);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SyntaxError(`Rendered widget template "${name}" is not valid JSON: ${message}`);
  }
}

function renderableTemplate(source: string): string {
  let output = "";
  let index = 0;

  while (index < source.length) {
    const expressionStart = source.indexOf("{{", index);
    const blockStart = source.indexOf("{%", index);
    const starts = [expressionStart, blockStart].filter((start) => start !== -1);
    if (starts.length === 0) {
      output += source.slice(index);
      break;
    }

    const tagStart = Math.min(...starts);
    const tagEndMarker = tagStart === expressionStart ? "}}" : "%}";
    const tagEnd = source.indexOf(tagEndMarker, tagStart + 2);
    if (tagEnd === -1) {
      output += source.slice(index);
      break;
    }

    const tagCloseEnd = tagEnd + tagEndMarker.length;
    const tag = source
      .slice(tagStart, tagCloseEnd)
      .replace(/\b([A-Za-z_$][\w$]*)\[(\d+):\]/g, "$1.slice($2)");

    output += source.slice(index, tagStart) + tag;
    index = tagCloseEnd;
  }

  return output;
}

export class WidgetTemplate {
  readonly version: string;
  readonly name: string;
  readonly template: string;
  readonly dataSchema: Record<string, unknown>;
  readonly jsonSchema?: Record<string, unknown>;

  constructor(definition: WidgetTemplateDefinition) {
    if (definition.version !== "1.0") {
      throw new Error(`Unsupported widget spec version: ${definition.version}`);
    }
    if (typeof definition.name !== "string" || definition.name.length === 0) {
      throw new TypeError("Widget template name is required.");
    }
    if (typeof definition.template !== "string" || definition.template.length === 0) {
      throw new TypeError("Widget template source is required.");
    }

    this.version = definition.version;
    this.name = definition.name;
    this.template = definition.template;
    this.jsonSchema = definition.jsonSchema;
    this.dataSchema = definition.dataSchema ?? definition.jsonSchema ?? {};
  }

  static async fromFile(path: string): Promise<WidgetTemplate> {
    const definition = await Bun.file(resolveWidgetPath(path)).json();
    return new WidgetTemplate(definition as WidgetTemplateDefinition);
  }

  build(data?: unknown): DynamicWidgetRoot {
    const rendered = env.renderString(renderableTemplate(this.template), normalizeData(data));
    const parsed = parseRenderedTemplate(rendered, this.name);
    const widget = DynamicWidgetRootSchema.parse(parsed);
    return serializeWidget(widget) as DynamicWidgetRoot;
  }

  buildBasic(data?: unknown): BasicRoot {
    const rendered = env.renderString(renderableTemplate(this.template), normalizeData(data));
    const parsed = parseRenderedTemplate(rendered, this.name);
    const widget = BasicRootSchema.parse(parsed);
    return serializeWidget(widget) as BasicRoot;
  }
}
