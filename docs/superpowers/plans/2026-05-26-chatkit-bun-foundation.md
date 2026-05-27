# ChatKit Bun Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working foundation for the private `chatkit-bun` port: package setup, upstream parity metadata, core runtime helpers, action helpers, base schemas, store interfaces, a Bun SQLite store, and public exports.

**Architecture:** This is the first implementation plan for the approved full-port spec. It establishes small, focused modules that later server, widget, and agents plans can depend on without reworking foundation code. Runtime validation lives in Zod schemas, persistence boundaries live in store interfaces, and the SQLite store serializes through the same schema helpers used by tests.

**Tech Stack:** Bun, TypeScript, Zod, `bun:sqlite`, `bun:test`, `Bun.file`, `Bun.write`, Web-standard `Request`/`Response`/`ReadableStream`, and `tsc --noEmit`.

---

## Scope Decomposition

The approved design covers several substantial subsystems. This plan implements the first milestone only:

- Package scripts and dependencies.
- Upstream parity metadata.
- Serialization and error primitives.
- Action helpers.
- Base request-independent schemas for pages, threads, attachments, and thread items.
- Store and attachment-store interfaces.
- A `bun:sqlite` store implementation.
- Public exports.

Follow-up plans should cover these remaining milestones:

- ChatKit request/response schemas and `ChatKitServer.process(...)`.
- Widgets, widget templates, and widget diffing.
- Bun HTTP handler.
- Agents SDK stream conversion.
- Upstream sync tooling and parity matrix automation.

## Bun-Native And Dependency Policy

Use Bun-native tools by default whenever they cover the need:

- Runtime and standards: use Bun's Web-standard globals (`Request`, `Response`, `Headers`, `ReadableStream`, `TextEncoder`, `TextDecoder`, `crypto`) instead of polyfills.
- File and module system: use JSON imports for static fixtures and `Bun.file`/`Bun.write` for local files instead of `fs-extra` or ad hoc Node wrappers.
- HTTP server and networking: later server plans should use `Bun.serve`, route helpers, built-in `fetch`, and Web Streams; do not introduce Express, Fastify, `node-fetch`, or `ws` for first-party surfaces.
- Data and storage: use `bun:sqlite` for the included SQLite store; do not use `better-sqlite3`, `sqlite3`, or Prisma for the default store.
- Process and system: use `bun run`, `bun test`, `bunx`, and Bun shell scripts for local automation instead of npm scripts that depend on Node-specific runners or `execa`.
- Interop and tooling: use Bun's TypeScript execution and module loading for tests and scripts; use `tsc --noEmit` only for type checking.
- Utilities: prefer Bun built-ins such as `Bun.Glob`, hashing, file IO, and shell in follow-up parity tooling before adding libraries.

Use proven third-party libraries when they remove meaningful code ownership:

- Use `zod` for runtime validation and discriminated unions instead of hand-written validators.
- Follow-up widget/template work should evaluate `nunjucks` first because it is mature and close to Jinja semantics; only hand-write a renderer if parity requires behavior the library cannot provide.
- Follow-up Agents work should use the official JavaScript/TypeScript OpenAI Agents SDK package rather than reimplementing stream event models.
- Add small, focused utilities only when they replace non-trivial code and do not duplicate Bun built-ins. Avoid framework dependencies for core runtime paths.

## File Structure

- Modify: `package.json` to add scripts and dependencies.
- Create: `docs/parity/upstream.json` to record the current Python submodule target.
- Create: `src/errors.ts` for shared error classes.
- Create: `src/serialization.ts` for JSON bytes, date, and object omission helpers.
- Create: `src/actions.ts` for action config schemas and helpers.
- Create: `src/types/core.ts` for base Zod schemas and TypeScript types.
- Create: `src/store.ts` for store contracts and ID generation.
- Create: `src/sqlite-store.ts` for the Bun SQLite store.
- Create: `src/index.ts` for public exports.
- Create: `tests/actions.test.ts`.
- Create: `tests/serialization.test.ts`.
- Create: `tests/types.test.ts`.
- Create: `tests/store.test.ts`.
- Create: `tests/package.test.ts`.

### Task 1: Package Scripts And Dependencies

**Files:**
- Modify: `package.json`
- Test: `tests/package.test.ts`

- [ ] **Step 1: Write the package script test**

Create `tests/package.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import packageJson from "../package.json";

describe("package metadata", () => {
  test("stays private and exposes Bun verification scripts", () => {
    expect(packageJson.name).toBe("chatkit-bun");
    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe("module");
    expect(packageJson.module).toBe("src/index.ts");
    expect(packageJson.scripts).toMatchObject({
      test: "bun test",
      typecheck: "bunx tsc --noEmit",
      verify: "bun run typecheck && bun test",
    });
  });

  test("declares zod as runtime validation dependency", () => {
    expect(typeof packageJson.dependencies?.zod).toBe("string");
  });
});
```

- [ ] **Step 2: Run the new package test to verify it fails**

Run: `bun test tests/package.test.ts`

Expected: FAIL because `package.json` still points at `index.ts`, has no scripts, and does not declare `zod`.

- [ ] **Step 3: Install dependencies with Bun**

Run:

```bash
bun add zod
bun add --dev typescript @types/bun
```

Expected: `package.json` and `bun.lock` update with `zod`, `typescript`, and `@types/bun`.

Do not add framework or Node replacement packages in this task. `zod` is the only foundation runtime dependency because Bun already provides the test runner, SQLite, file IO, shell, HTTP standards, binary data, and Web Streams needed by this milestone.

- [ ] **Step 4: Update `package.json` metadata and scripts**

Run this script so dependency versions written by `bun add` stay untouched:

```bash
bun --eval 'const p = await Bun.file("package.json").json(); p.name = "chatkit-bun"; p.module = "src/index.ts"; p.type = "module"; p.private = true; p.scripts = { test: "bun test", typecheck: "bunx tsc --noEmit", verify: "bun run typecheck && bun test" }; p.peerDependencies = { ...(p.peerDependencies ?? {}), typescript: "^5" }; await Bun.write("package.json", `${JSON.stringify(p, null, 2)}\n`);'
```

- [ ] **Step 5: Run the package test to verify it passes**

Run: `bun test tests/package.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit package setup**

```bash
git add package.json bun.lock tests/package.test.ts
git commit -m "Set up ChatKit Bun package scripts"
```

### Task 2: Upstream Parity Metadata

**Files:**
- Create: `docs/parity/upstream.json`
- Test: `tests/parity-metadata.test.ts`

- [ ] **Step 1: Write the parity metadata test**

Create `tests/parity-metadata.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the parity metadata test to verify it fails**

Run: `bun test tests/parity-metadata.test.ts`

Expected: FAIL because `docs/parity/upstream.json` does not exist.

- [ ] **Step 3: Read the current submodule commit**

Run: `git -C packages/chatkit-python rev-parse HEAD`

Expected: prints the current 40-character commit hash. At design time this was `dacc133c280b39b9334d06ea73f0f1c199e59927`.

- [ ] **Step 4: Create the parity metadata file**

Create `docs/parity/upstream.json`:

```json
{
  "packageName": "openai-chatkit",
  "version": "1.6.5",
  "submodulePath": "packages/chatkit-python",
  "commit": "dacc133c280b39b9334d06ea73f0f1c199e59927"
}
```

If Step 3 prints a different commit because the submodule moved, use the commit printed by Step 3 and keep the version at the value in `packages/chatkit-python/pyproject.toml`.

- [ ] **Step 5: Run the parity metadata test to verify it passes**

Run: `bun test tests/parity-metadata.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit parity metadata**

```bash
git add docs/parity/upstream.json tests/parity-metadata.test.ts
git commit -m "Record upstream ChatKit Python parity target"
```

### Task 3: Serialization And Error Primitives

**Files:**
- Create: `src/errors.ts`
- Create: `src/serialization.ts`
- Test: `tests/serialization.test.ts`

- [ ] **Step 1: Write serialization tests**

Create `tests/serialization.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { NotFoundError, UnsupportedOperationError } from "../src/errors";
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
```

- [ ] **Step 2: Run serialization tests to verify they fail**

Run: `bun test tests/serialization.test.ts`

Expected: FAIL because `src/errors.ts` and `src/serialization.ts` do not exist.

- [ ] **Step 3: Create shared error classes**

Create `src/errors.ts`:

```ts
export class ChatKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends ChatKitError {}

export class UnsupportedOperationError extends ChatKitError {}

export class ValidationError extends ChatKitError {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}
```

- [ ] **Step 4: Create serialization helpers**

Create `src/serialization.ts`:

```ts
import { ValidationError } from "./errors";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function encodeJsonBytes(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(omitUndefinedDeep(value)));
}

export function decodeJsonBytes(input: string | Uint8Array | ArrayBuffer): unknown {
  const text =
    typeof input === "string"
      ? input
      : input instanceof Uint8Array
        ? decoder.decode(input)
        : decoder.decode(new Uint8Array(input));

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
```

- [ ] **Step 5: Run serialization tests to verify they pass**

Run: `bun test tests/serialization.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit serialization primitives**

```bash
git add src/errors.ts src/serialization.ts tests/serialization.test.ts
git commit -m "Add ChatKit serialization primitives"
```

### Task 4: Action Helpers

**Files:**
- Create: `src/actions.ts`
- Test: `tests/actions.test.ts`

- [ ] **Step 1: Write action helper tests**

Create `tests/actions.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { ActionConfigSchema, createActionConfig } from "../src/actions";

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
```

- [ ] **Step 2: Run action tests to verify they fail**

Run: `bun test tests/actions.test.ts`

Expected: FAIL because `src/actions.ts` does not exist.

- [ ] **Step 3: Create action helper module**

Create `src/actions.ts`:

```ts
import { z } from "zod";

export const HandlerSchema = z.union([z.literal("client"), z.literal("server")]);
export type Handler = z.infer<typeof HandlerSchema>;

export const LoadingBehaviorSchema = z.union([
  z.literal("auto"),
  z.literal("none"),
  z.literal("self"),
  z.literal("container"),
]);
export type LoadingBehavior = z.infer<typeof LoadingBehaviorSchema>;

export const ActionConfigSchema = z.object({
  type: z.string(),
  payload: z.unknown().optional(),
  handler: HandlerSchema.default("server"),
  loadingBehavior: LoadingBehaviorSchema.default("auto"),
  streaming: z.boolean().default(true),
});
export type ActionConfig = z.infer<typeof ActionConfigSchema>;

export interface CreateActionOptions {
  handler?: Handler;
  loadingBehavior?: LoadingBehavior;
  streaming?: boolean;
}

export function createActionConfig(
  type: string,
  payload?: unknown,
  options: CreateActionOptions = {},
): ActionConfig {
  return {
    type,
    payload,
    handler: options.handler ?? "server",
    loadingBehavior: options.loadingBehavior ?? "auto",
    streaming: options.streaming ?? true,
  };
}
```

- [ ] **Step 4: Run action tests to verify they pass**

Run: `bun test tests/actions.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit action helpers**

```bash
git add src/actions.ts tests/actions.test.ts
git commit -m "Add ChatKit action helpers"
```

### Task 5: Core Schemas

**Files:**
- Create: `src/types/core.ts`
- Test: `tests/types.test.ts`

- [ ] **Step 1: Write core schema tests**

Create `tests/types.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import {
  AttachmentSchema,
  PageSchema,
  ThreadItemSchema,
  ThreadMetadataSchema,
} from "../src/types/core";

describe("core schemas", () => {
  test("parses paginated data", () => {
    const PageOfStrings = PageSchema(zString());
    expect(PageOfStrings.parse({ data: ["a"], has_more: true, after: "a" })).toEqual({
      data: ["a"],
      has_more: true,
      after: "a",
    });
  });

  test("defaults thread status and metadata", () => {
    const thread = ThreadMetadataSchema.parse({
      id: "thr_1",
      created_at: "2026-05-26T00:00:00.000Z",
    });
    expect(thread.status).toEqual({ type: "active" });
    expect(thread.metadata).toEqual({});
  });

  test("parses file and image attachments", () => {
    expect(
      AttachmentSchema.parse({
        id: "file_1",
        type: "file",
        mime_type: "text/plain",
        name: "notes.txt",
      }).type,
    ).toBe("file");
    expect(
      AttachmentSchema.parse({
        id: "image_1",
        type: "image",
        mime_type: "image/png",
        name: "image.png",
        preview_url: "https://example.com/image.png",
      }).type,
    ).toBe("image");
  });

  test("parses known thread items and preserves unknown widget fields", () => {
    const item = ThreadItemSchema.parse({
      id: "widget_1",
      type: "widget",
      thread_id: "thr_1",
      created_at: "2026-05-26T00:00:00.000Z",
      widget: { type: "Card", children: [] },
    });
    expect(item.type).toBe("widget");
    expect(item.widget).toEqual({ type: "Card", children: [] });
  });
});

function zString() {
  return {
    parse(value: unknown) {
      if (typeof value !== "string") {
        throw new Error("Expected string");
      }
      return value;
    },
  };
}
```

- [ ] **Step 2: Run core schema tests to verify they fail**

Run: `bun test tests/types.test.ts`

Expected: FAIL because `src/types/core.ts` does not exist.

- [ ] **Step 3: Create core schemas**

Create `src/types/core.ts`:

```ts
import { z } from "zod";

export function PageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item).default([]),
    has_more: z.boolean().default(false),
    after: z.string().nullable().optional(),
  });
}

export type Page<T> = {
  data: T[];
  has_more: boolean;
  after?: string | null;
};

export const ThreadStatusSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("active") }),
  z.object({ type: z.literal("locked"), reason: z.string().nullable().optional() }),
  z.object({ type: z.literal("closed"), reason: z.string().nullable().optional() }),
]);
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;

export const ThreadMetadataSchema = z.object({
  title: z.string().nullable().optional(),
  id: z.string(),
  created_at: z.string().datetime(),
  status: ThreadStatusSchema.default({ type: "active" }),
  allowed_image_domains: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type ThreadMetadata = z.infer<typeof ThreadMetadataSchema>;

export const AttachmentUploadDescriptorSchema = z.object({
  url: z.string().url(),
  method: z.string(),
  headers: z.record(z.string(), z.string()).default({}),
});
export type AttachmentUploadDescriptor = z.infer<typeof AttachmentUploadDescriptorSchema>;

const AttachmentBaseSchema = z.object({
  id: z.string(),
  mime_type: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  upload_descriptor: AttachmentUploadDescriptorSchema.optional(),
});

export const FileAttachmentSchema = AttachmentBaseSchema.extend({
  type: z.literal("file"),
});
export type FileAttachment = z.infer<typeof FileAttachmentSchema>;

export const ImageAttachmentSchema = AttachmentBaseSchema.extend({
  type: z.literal("image"),
  preview_url: z.string().url().optional(),
});
export type ImageAttachment = z.infer<typeof ImageAttachmentSchema>;

export const AttachmentSchema = z.discriminatedUnion("type", [
  FileAttachmentSchema,
  ImageAttachmentSchema,
]);
export type Attachment = z.infer<typeof AttachmentSchema>;

export const ThreadItemBaseSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  created_at: z.string().datetime(),
});

export const UserMessageItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("user_message"),
  content: z.array(z.unknown()),
  attachments: z.array(AttachmentSchema).default([]),
  quoted_text: z.string().nullable().optional(),
  inference_options: z.record(z.string(), z.unknown()).default({}),
});

export const AssistantMessageItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("assistant_message"),
  content: z.array(z.unknown()),
});

export const ClientToolCallItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("client_tool_call"),
  status: z.union([z.literal("pending"), z.literal("completed")]).default("pending"),
  call_id: z.string(),
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  output: z.unknown().optional(),
});

export const WidgetItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("widget"),
  widget: z.record(z.string(), z.unknown()),
  copy_text: z.string().nullable().optional(),
});

export const HiddenContextItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("hidden_context_item"),
  content: z.unknown(),
});

export const SDKHiddenContextItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("sdk_hidden_context"),
  content: z.string(),
});

export const EndOfTurnItemSchema = ThreadItemBaseSchema.extend({
  type: z.literal("end_of_turn"),
});

export const GenericThreadItemSchema = ThreadItemBaseSchema.extend({
  type: z.string(),
}).passthrough();

export const ThreadItemSchema = z.discriminatedUnion("type", [
  UserMessageItemSchema,
  AssistantMessageItemSchema,
  ClientToolCallItemSchema,
  WidgetItemSchema,
  HiddenContextItemSchema,
  SDKHiddenContextItemSchema,
  EndOfTurnItemSchema,
]);
export type ThreadItem = z.infer<typeof ThreadItemSchema>;
```

- [ ] **Step 4: Fix the test helper import**

Replace `tests/types.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  AttachmentSchema,
  PageSchema,
  ThreadItemSchema,
  ThreadMetadataSchema,
} from "../src/types/core";

describe("core schemas", () => {
  test("parses paginated data", () => {
    const PageOfStrings = PageSchema(z.string());
    expect(PageOfStrings.parse({ data: ["a"], has_more: true, after: "a" })).toEqual({
      data: ["a"],
      has_more: true,
      after: "a",
    });
  });

  test("defaults thread status and metadata", () => {
    const thread = ThreadMetadataSchema.parse({
      id: "thr_1",
      created_at: "2026-05-26T00:00:00.000Z",
    });
    expect(thread.status).toEqual({ type: "active" });
    expect(thread.metadata).toEqual({});
  });

  test("parses file and image attachments", () => {
    expect(
      AttachmentSchema.parse({
        id: "file_1",
        type: "file",
        mime_type: "text/plain",
        name: "notes.txt",
      }).type,
    ).toBe("file");
    expect(
      AttachmentSchema.parse({
        id: "image_1",
        type: "image",
        mime_type: "image/png",
        name: "image.png",
        preview_url: "https://example.com/image.png",
      }).type,
    ).toBe("image");
  });

  test("parses known thread items and preserves unknown widget fields", () => {
    const item = ThreadItemSchema.parse({
      id: "widget_1",
      type: "widget",
      thread_id: "thr_1",
      created_at: "2026-05-26T00:00:00.000Z",
      widget: { type: "Card", children: [] },
    });
    expect(item.type).toBe("widget");
    expect(item.widget).toEqual({ type: "Card", children: [] });
  });
});
```

- [ ] **Step 5: Run core schema tests to verify they pass**

Run: `bun test tests/types.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit core schemas**

```bash
git add src/types/core.ts tests/types.test.ts
git commit -m "Add core ChatKit schemas"
```

### Task 6: Store Interfaces And ID Generation

**Files:**
- Create: `src/store.ts`
- Test: `tests/store.test.ts`

- [ ] **Step 1: Write store interface tests for ID generation**

Create `tests/store.test.ts`:

```ts
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
```

- [ ] **Step 2: Run store helper tests to verify they fail**

Run: `bun test tests/store.test.ts`

Expected: FAIL because `src/store.ts` does not exist.

- [ ] **Step 3: Create store interfaces**

Create `src/store.ts`:

```ts
import type { Attachment, Page, ThreadItem, ThreadMetadata } from "./types/core";

export type StoreItemType =
  | "thread"
  | "message"
  | "tool_call"
  | "task"
  | "workflow"
  | "attachment"
  | "sdk_hidden_context";

const idPrefixes: Record<StoreItemType, string> = {
  thread: "thr",
  message: "msg",
  tool_call: "tc",
  task: "tsk",
  workflow: "wf",
  attachment: "atc",
  sdk_hidden_context: "shcx",
};

export function defaultGenerateId(itemType: StoreItemType): string {
  return `${idPrefixes[itemType]}_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

export interface AttachmentCreateParams {
  name: string;
  size: number;
  mime_type: string;
}

export interface AttachmentStore<TContext = unknown> {
  deleteAttachment(attachmentId: string, context: TContext): Promise<void>;
  createAttachment(input: AttachmentCreateParams, context: TContext): Promise<Attachment>;
  generateAttachmentId?(mimeType: string, context: TContext): string;
}

export interface Store<TContext = unknown> {
  generateThreadId(context: TContext): string;
  generateItemId(itemType: StoreItemType, thread: ThreadMetadata, context: TContext): string;
  loadThread(threadId: string, context: TContext): Promise<ThreadMetadata>;
  saveThread(thread: ThreadMetadata, context: TContext): Promise<void>;
  loadThreadItems(
    threadId: string,
    after: string | null,
    limit: number,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadItem>>;
  saveAttachment(attachment: Attachment, context: TContext): Promise<void>;
  loadAttachment(attachmentId: string, context: TContext): Promise<Attachment>;
  deleteAttachment(attachmentId: string, context: TContext): Promise<void>;
  loadThreads(
    limit: number,
    after: string | null,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadMetadata>>;
  addThreadItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
  saveItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
  loadItem(threadId: string, itemId: string, context: TContext): Promise<ThreadItem>;
  deleteThread(threadId: string, context: TContext): Promise<void>;
  deleteThreadItem(threadId: string, itemId: string, context: TContext): Promise<void>;
}

export abstract class BaseStore<TContext = unknown> implements Store<TContext> {
  generateThreadId(_context: TContext): string {
    return defaultGenerateId("thread");
  }

  generateItemId(itemType: StoreItemType, _thread: ThreadMetadata, _context: TContext): string {
    return defaultGenerateId(itemType);
  }

  abstract loadThread(threadId: string, context: TContext): Promise<ThreadMetadata>;
  abstract saveThread(thread: ThreadMetadata, context: TContext): Promise<void>;
  abstract loadThreadItems(
    threadId: string,
    after: string | null,
    limit: number,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadItem>>;
  abstract saveAttachment(attachment: Attachment, context: TContext): Promise<void>;
  abstract loadAttachment(attachmentId: string, context: TContext): Promise<Attachment>;
  abstract deleteAttachment(attachmentId: string, context: TContext): Promise<void>;
  abstract loadThreads(
    limit: number,
    after: string | null,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadMetadata>>;
  abstract addThreadItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
  abstract saveItem(threadId: string, item: ThreadItem, context: TContext): Promise<void>;
  abstract loadItem(threadId: string, itemId: string, context: TContext): Promise<ThreadItem>;
  abstract deleteThread(threadId: string, context: TContext): Promise<void>;
  abstract deleteThreadItem(threadId: string, itemId: string, context: TContext): Promise<void>;
}
```

- [ ] **Step 4: Run store helper tests to verify they pass**

Run: `bun test tests/store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit store interfaces**

```bash
git add src/store.ts tests/store.test.ts
git commit -m "Add ChatKit store interfaces"
```

### Task 7: SQLite Store Contract

**Files:**
- Create: `src/sqlite-store.ts`
- Modify: `tests/store.test.ts`

- [ ] **Step 1: Extend store tests for SQLite behavior**

Replace `tests/store.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";

import { NotFoundError } from "../src/errors";
import { defaultGenerateId } from "../src/store";
import { SQLiteStore } from "../src/sqlite-store";
import type { Attachment, ThreadItem, ThreadMetadata } from "../src/types/core";

interface RequestContext {
  user_id: string;
}

const defaultContext: RequestContext = { user_id: "test_user" };

function makeThread(id = "thr_test", createdAt = "2026-05-26T00:00:00.000Z"): ThreadMetadata {
  return {
    id,
    title: "Test Thread",
    created_at: createdAt,
    status: { type: "active" },
    metadata: { test: "test" },
  };
}

function makeMessage(id = "msg_test", createdAt = "2026-05-26T00:00:01.000Z"): ThreadItem {
  return {
    id,
    type: "assistant_message",
    thread_id: "thr_test",
    created_at: createdAt,
    content: [{ type: "output_text", text: "Hi there!", annotations: [] }],
  };
}

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

describe("SQLiteStore", () => {
  test("saves and loads thread metadata by context user", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const thread = makeThread();

    await store.saveThread(thread, defaultContext);

    expect(await store.loadThread(thread.id, defaultContext)).toEqual(thread);
    await expect(store.loadThread(thread.id, { user_id: "other" })).rejects.toBeInstanceOf(NotFoundError);
  });

  test("orders and paginates threads", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    await store.saveThread(makeThread("thr_1", "2026-05-26T00:00:00.000Z"), defaultContext);
    await store.saveThread(makeThread("thr_2", "2026-05-26T00:00:01.000Z"), defaultContext);
    await store.saveThread(makeThread("thr_3", "2026-05-26T00:00:02.000Z"), defaultContext);

    const first = await store.loadThreads(2, null, "asc", defaultContext);
    expect(first.data.map((thread) => thread.id)).toEqual(["thr_1", "thr_2"]);
    expect(first.has_more).toBe(true);
    expect(first.after).toBe("thr_2");

    const second = await store.loadThreads(2, first.after ?? null, "asc", defaultContext);
    expect(second.data.map((thread) => thread.id)).toEqual(["thr_3"]);
    expect(second.has_more).toBe(false);
    expect(second.after).toBeNull();
  });

  test("saves, loads, updates, and deletes thread items", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const thread = makeThread();
    const item = makeMessage();
    await store.saveThread(thread, defaultContext);
    await store.addThreadItem(thread.id, item, defaultContext);

    expect((await store.loadThreadItems(thread.id, null, 10, "asc", defaultContext)).data).toEqual([item]);

    const updated: ThreadItem = { ...item, content: [{ type: "output_text", text: "Updated", annotations: [] }] };
    await store.saveItem(thread.id, updated, defaultContext);
    expect(await store.loadItem(thread.id, item.id, defaultContext)).toEqual(updated);

    await store.deleteThreadItem(thread.id, item.id, defaultContext);
    await expect(store.loadItem(thread.id, item.id, defaultContext)).rejects.toBeInstanceOf(NotFoundError);
  });

  test("upserts, loads, and deletes attachments", async () => {
    const store = new SQLiteStore<RequestContext>({ path: ":memory:", getUserId: (context) => context.user_id });
    const attachment: Attachment = {
      id: "file_1",
      type: "file",
      mime_type: "text/plain",
      name: "notes.txt",
    };

    await store.saveAttachment(attachment, defaultContext);
    expect(await store.loadAttachment(attachment.id, defaultContext)).toEqual(attachment);

    await store.deleteAttachment(attachment.id, defaultContext);
    await expect(store.loadAttachment(attachment.id, defaultContext)).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [ ] **Step 2: Run SQLite store tests to verify they fail**

Run: `bun test tests/store.test.ts`

Expected: FAIL because `src/sqlite-store.ts` does not exist.

- [ ] **Step 3: Create SQLite store implementation**

Create `src/sqlite-store.ts`:

```ts
import { Database } from "bun:sqlite";

import { NotFoundError } from "./errors";
import { BaseStore } from "./store";
import type { StoreItemType } from "./store";
import {
  AttachmentSchema,
  ThreadItemSchema,
  ThreadMetadataSchema,
  type Attachment,
  type Page,
  type ThreadItem,
  type ThreadMetadata,
} from "./types/core";

export interface SQLiteStoreOptions<TContext> {
  path?: string;
  getUserId(context: TContext): string;
}

export class SQLiteStore<TContext = unknown> extends BaseStore<TContext> {
  private readonly db: Database;
  private readonly getUserId: (context: TContext) => string;

  constructor(options: SQLiteStoreOptions<TContext>) {
    super();
    this.db = new Database(options.path ?? "chatkit.sqlite");
    this.getUserId = options.getUserId;
    this.createTables();
  }

  override generateItemId(itemType: StoreItemType, thread: ThreadMetadata, context: TContext): string {
    return super.generateItemId(itemType, thread, context);
  }

  async loadThread(threadId: string, context: TContext): Promise<ThreadMetadata> {
    const row = this.db
      .query("SELECT data FROM threads WHERE id = ? AND user_id = ?")
      .get(threadId, this.getUserId(context)) as { data: string } | null;
    if (!row) {
      throw new NotFoundError(`Thread ${threadId} not found`);
    }
    return ThreadMetadataSchema.parse(JSON.parse(row.data));
  }

  async saveThread(thread: ThreadMetadata, context: TContext): Promise<void> {
    const userId = this.getUserId(context);
    this.db
      .query("DELETE FROM threads WHERE id = ? AND user_id = ?")
      .run(thread.id, userId);
    this.db
      .query("INSERT INTO threads (id, user_id, created_at, data) VALUES (?, ?, ?, ?)")
      .run(thread.id, userId, thread.created_at, JSON.stringify(thread));
  }

  async loadThreadItems(
    threadId: string,
    after: string | null,
    limit: number,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadItem>> {
    const userId = this.getUserId(context);
    const createdAfter = after ? this.createdAtForItem(after, userId) : null;
    const comparison = order === "asc" ? ">" : "<";
    const sql = [
      "SELECT data FROM items WHERE thread_id = ? AND user_id = ?",
      createdAfter ? `AND created_at ${comparison} ?` : "",
      `ORDER BY created_at ${order.toUpperCase()} LIMIT ?`,
    ].join(" ");
    const params = createdAfter
      ? [threadId, userId, createdAfter, limit + 1]
      : [threadId, userId, limit + 1];
    const rows = this.db.query(sql).all(...params) as Array<{ data: string }>;
    return pageFromRows(rows, limit, (row) => ThreadItemSchema.parse(JSON.parse(row.data)));
  }

  async saveAttachment(attachment: Attachment, context: TContext): Promise<void> {
    this.db
      .query("INSERT OR REPLACE INTO attachments (id, user_id, data) VALUES (?, ?, ?)")
      .run(attachment.id, this.getUserId(context), JSON.stringify(attachment));
  }

  async loadAttachment(attachmentId: string, context: TContext): Promise<Attachment> {
    const row = this.db
      .query("SELECT data FROM attachments WHERE id = ? AND user_id = ?")
      .get(attachmentId, this.getUserId(context)) as { data: string } | null;
    if (!row) {
      throw new NotFoundError(`Attachment ${attachmentId} not found`);
    }
    return AttachmentSchema.parse(JSON.parse(row.data));
  }

  async deleteAttachment(attachmentId: string, context: TContext): Promise<void> {
    this.db
      .query("DELETE FROM attachments WHERE id = ? AND user_id = ?")
      .run(attachmentId, this.getUserId(context));
  }

  async loadThreads(
    limit: number,
    after: string | null,
    order: "asc" | "desc",
    context: TContext,
  ): Promise<Page<ThreadMetadata>> {
    const userId = this.getUserId(context);
    const createdAfter = after ? this.createdAtForThread(after, userId) : null;
    const comparison = order === "asc" ? ">" : "<";
    const sql = [
      "SELECT data FROM threads WHERE user_id = ?",
      createdAfter ? `AND created_at ${comparison} ?` : "",
      `ORDER BY created_at ${order.toUpperCase()} LIMIT ?`,
    ].join(" ");
    const params = createdAfter ? [userId, createdAfter, limit + 1] : [userId, limit + 1];
    const rows = this.db.query(sql).all(...params) as Array<{ data: string }>;
    return pageFromRows(rows, limit, (row) => ThreadMetadataSchema.parse(JSON.parse(row.data)));
  }

  async addThreadItem(threadId: string, item: ThreadItem, context: TContext): Promise<void> {
    this.db
      .query("INSERT INTO items (id, thread_id, user_id, created_at, data) VALUES (?, ?, ?, ?, ?)")
      .run(item.id, threadId, this.getUserId(context), item.created_at, JSON.stringify(item));
  }

  async saveItem(threadId: string, item: ThreadItem, context: TContext): Promise<void> {
    const result = this.db
      .query("UPDATE items SET data = ? WHERE id = ? AND thread_id = ? AND user_id = ?")
      .run(JSON.stringify(item), item.id, threadId, this.getUserId(context));
    if (result.changes === 0) {
      throw new NotFoundError(`Item ${item.id} not found`);
    }
  }

  async loadItem(threadId: string, itemId: string, context: TContext): Promise<ThreadItem> {
    const row = this.db
      .query("SELECT data FROM items WHERE id = ? AND thread_id = ? AND user_id = ?")
      .get(itemId, threadId, this.getUserId(context)) as { data: string } | null;
    if (!row) {
      throw new NotFoundError(`Item ${itemId} not found`);
    }
    return ThreadItemSchema.parse(JSON.parse(row.data));
  }

  async deleteThread(threadId: string, context: TContext): Promise<void> {
    const userId = this.getUserId(context);
    this.db.query("DELETE FROM items WHERE thread_id = ? AND user_id = ?").run(threadId, userId);
    this.db.query("DELETE FROM threads WHERE id = ? AND user_id = ?").run(threadId, userId);
  }

  async deleteThreadItem(threadId: string, itemId: string, context: TContext): Promise<void> {
    this.db
      .query("DELETE FROM items WHERE id = ? AND thread_id = ? AND user_id = ?")
      .run(itemId, threadId, this.getUserId(context));
  }

  private createTables(): void {
    this.db.run("CREATE TABLE IF NOT EXISTS threads (id TEXT, user_id TEXT, created_at TEXT, data TEXT, PRIMARY KEY (id, user_id))");
    this.db.run("CREATE TABLE IF NOT EXISTS items (id TEXT, thread_id TEXT, user_id TEXT, created_at TEXT, data TEXT, PRIMARY KEY (id, user_id))");
    this.db.run("CREATE TABLE IF NOT EXISTS attachments (id TEXT, user_id TEXT, data TEXT, PRIMARY KEY (id, user_id))");
  }

  private createdAtForThread(threadId: string, userId: string): string {
    const row = this.db
      .query("SELECT created_at FROM threads WHERE id = ? AND user_id = ?")
      .get(threadId, userId) as { created_at: string } | null;
    if (!row) {
      throw new NotFoundError(`Thread ${threadId} not found`);
    }
    return row.created_at;
  }

  private createdAtForItem(itemId: string, userId: string): string {
    const row = this.db
      .query("SELECT created_at FROM items WHERE id = ? AND user_id = ?")
      .get(itemId, userId) as { created_at: string } | null;
    if (!row) {
      throw new NotFoundError(`Item ${itemId} not found`);
    }
    return row.created_at;
  }
}

function pageFromRows<T>(
  rows: Array<{ data: string }>,
  limit: number,
  parse: (row: { data: string }) => T & { id: string },
): Page<T> {
  const data = rows.map(parse);
  const hasMore = data.length > limit;
  const pageData = hasMore ? data.slice(0, limit) : data;
  return {
    data: pageData,
    has_more: hasMore,
    after: hasMore ? pageData.at(-1)?.id ?? null : null,
  };
}
```

- [ ] **Step 4: Run SQLite store tests to verify they pass**

Run: `bun test tests/store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit SQLite store**

```bash
git add src/sqlite-store.ts tests/store.test.ts
git commit -m "Add Bun SQLite ChatKit store"
```

### Task 8: Public Exports And Verification

**Files:**
- Create: `src/index.ts`
- Test: `tests/exports.test.ts`

- [ ] **Step 1: Write public export tests**

Create `tests/exports.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import {
  ActionConfigSchema,
  SQLiteStore,
  ThreadMetadataSchema,
  createActionConfig,
  defaultGenerateId,
} from "../src";

describe("public exports", () => {
  test("exports foundation APIs", () => {
    expect(createActionConfig("x")).toMatchObject({ type: "x" });
    expect(ActionConfigSchema.parse({ type: "x" }).type).toBe("x");
    expect(ThreadMetadataSchema.parse({ id: "thr_1", created_at: "2026-05-26T00:00:00.000Z" }).id).toBe("thr_1");
    expect(defaultGenerateId("thread")).toMatch(/^thr_[0-9a-f]{8}$/);
    expect(typeof SQLiteStore).toBe("function");
  });
});
```

- [ ] **Step 2: Run public export tests to verify they fail**

Run: `bun test tests/exports.test.ts`

Expected: FAIL because `src/index.ts` does not export the foundation APIs.

- [ ] **Step 3: Create public entry point**

Create `src/index.ts`:

```ts
export * from "./actions";
export * from "./errors";
export * from "./serialization";
export * from "./sqlite-store";
export * from "./store";
export * from "./types/core";
```

- [ ] **Step 4: Run public export tests to verify they pass**

Run: `bun test tests/exports.test.ts`

Expected: PASS.

- [ ] **Step 5: Run full foundation verification**

Run: `bun run verify`

Expected: TypeScript type checking exits 0 and all Bun tests pass.

- [ ] **Step 6: Commit public exports**

```bash
git add src/index.ts tests/exports.test.ts
git commit -m "Export ChatKit Bun foundation APIs"
```

## Self-Review Checklist

- Spec coverage: This plan covers package setup, parity metadata, Zod validation, serialization helpers, action helpers, base schemas, store interfaces, SQLite persistence, tests, and exports from the approved design.
- Deferred coverage: Server processing, widgets, Bun HTTP handling, agents integration, and upstream sync automation are excluded from this milestone and should each receive their own implementation plan.
- Type consistency: Public names are `createActionConfig`, `ActionConfigSchema`, `ThreadMetadataSchema`, `defaultGenerateId`, and `SQLiteStore`; tests and exports use the same names.
- Verification: The final command for this milestone is `bun run verify`.
