# ChatKit Bun Agents Input Conversion Design

## Purpose

This milestone adds input-side Agents parity for resumed ChatKit turns. Apps
should be able to load persisted `ThreadItem`s from a store, convert them into
`@openai/agents` model input, run the agent, and continue using the existing
`streamAgentResponse(...)` output bridge.

The goal is a focused but complete converter slice. It ports the Python
`ThreadItemConverter` behavior to TypeScript while using JavaScript
Agents-SDK-native `AgentInputItem` shapes. It does not change server request
handling, stream output conversion, guardrail rollback, or widget/image stream
replay behavior.

## Scope

This milestone includes:

- A new input conversion module under `src/agents/`.
- A public `ThreadItemConverter` class.
- A public `simpleToAgentInput(...)` helper backed by a default converter.
- Exports from `src/agents/index.ts` and the package root.
- Default conversions for all current `ThreadItem` variants where Python has a
  default conversion.
- Override hooks for use-case-specific conversions such as attachments, tags,
  hidden context, widgets, workflows, tasks, structured inputs, and generated
  images.
- Converter tests ported from Python, adapted to JavaScript Agents SDK input
  shapes.
- One Bun-specific workflow conversion test.
- One focused resumed-turn usage test showing stored thread items loaded in
  ascending order, converted, and passed as the next run input without calling
  OpenAI.

This milestone does not include:

- Changes to `ChatKitServer.respond(...)` or server continuation behavior.
- Automatic server-side input construction.
- Changes to `streamAgentResponse(...)` or output stream conversion.
- Guardrail rollback or `thread.item.removed` cleanup.
- Generated-image stream replay refinements.
- New ChatKit schemas or wire event shapes.
- Public docs/examples beyond the spec and implementation plan.

## Public API

Add a new public converter class:

```ts
type UserMessageItem = Extract<ThreadItem, { type: "user_message" }>;
type AssistantMessageItem = Extract<ThreadItem, { type: "assistant_message" }>;
type ClientToolCallItem = Extract<ThreadItem, { type: "client_tool_call" }>;
type WidgetItem = Extract<ThreadItem, { type: "widget" }>;
type GeneratedImageItem = Extract<ThreadItem, { type: "generated_image" }>;
type StructuredInputItem = Extract<ThreadItem, { type: "structured_input" }>;
type TaskItem = Extract<ThreadItem, { type: "task" }>;
type WorkflowItem = Extract<ThreadItem, { type: "workflow" }>;
type HiddenContextItem = Extract<ThreadItem, { type: "hidden_context_item" }>;
type SDKHiddenContextItem = Extract<ThreadItem, { type: "sdk_hidden_context" }>;
type EndOfTurnItem = Extract<ThreadItem, { type: "end_of_turn" }>;
type UserMessageTagContent = Extract<UserMessageContent, { type: "input_tag" }>;

class ThreadItemConverter {
  attachmentToMessageContent(attachment: Attachment): AgentMessageContentPart | Promise<AgentMessageContentPart>;
  tagToMessageContent(tag: UserMessageTagContent): AgentMessageContentPart | Promise<AgentMessageContentPart>;
  generatedImageToInput(item: GeneratedImageItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  hiddenContextToInput(item: HiddenContextItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  sdkHiddenContextToInput(item: SDKHiddenContextItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  taskToInput(item: TaskItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  workflowToInput(item: WorkflowItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  widgetToInput(item: WidgetItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  structuredInputToInput(item: StructuredInputItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  userMessageToInput(item: UserMessageItem, isLastMessage?: boolean): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  assistantMessageToInput(item: AssistantMessageItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  clientToolCallToInput(item: ClientToolCallItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  endOfTurnToInput(item: EndOfTurnItem): AgentInputItem | AgentInputItem[] | null | Promise<AgentInputItem | AgentInputItem[] | null>;
  toAgentInput(threadItems: ThreadItem | readonly ThreadItem[]): Promise<AgentInputItem[]>;
}
```

Add a default helper:

```ts
function simpleToAgentInput(threadItems: ThreadItem | readonly ThreadItem[]): Promise<AgentInputItem[]>;
```

The implementation may define local aliases to keep these signatures readable,
but any aliases that appear in exported method signatures should be exported as
types. Returned items should be assignable to `AgentInputItem[]` from
`@openai/agents`.

## Input Shape Decision

Python returns OpenAI Responses API dictionaries, including snake-case
`call_id` and `function_call_output` items. The Bun converter should instead
return JavaScript Agents SDK `AgentInputItem` objects because consumers pass the
result directly to `run(agent, input, { stream: true })`.

Important adaptations:

- Completed client tool calls become a `function_call` item followed by a
  `function_call_result` item.
- Tool call ids use `callId`.
- Generated images use Agents SDK input-image content with `image:
  item.image.url` and `detail: "auto"`.
- Assistant messages use `role: "assistant"`, `type: "message"`, `status:
  "completed"`, and `output_text` parts with text only. The JavaScript Agents
  SDK input protocol does not include assistant annotation arrays.

Tests should verify the JavaScript shapes rather than copying Python's exact
snake-case object names.

## Conversion Rules

`toAgentInput(...)` should accept either one `ThreadItem` or a readonly array of
items. It should make a shallow array copy before iterating so callers can mutate
their original array without affecting an in-progress conversion. The last-item
check should be index-based, not object-identity-based.

Default conversions:

- `user_message`: Convert `input_text` parts to text and render `input_tag`
  parts as `@${tag.text}` inside the user message. Attachments call
  `attachmentToMessageContent(...)`. If `quoted_text` is present only on the
  last converted item, append a separate user message:
  `The user is referring to this in particular: \n${quoted_text}`. If tags are
  present, dedupe by tag text while preserving order, call
  `tagToMessageContent(...)`, and append a separate user message containing the
  Python parity tag instruction block plus converted tag content.
- `assistant_message`: Convert each content part to `output_text` with the
  original text. This intentionally does not replay assistant annotations.
- `client_tool_call`: Skip pending calls. Convert completed calls to
  `function_call` and `function_call_result` items with JSON-stringified
  `arguments` and `output`.
- `widget`: Convert to a user message describing the displayed widget id plus a
  serialized JSON representation of the widget. Use the existing widget
  serialization behavior so unset values are omitted and `created_at` is not
  included.
- `workflow`: Convert each custom task with a title or content to a user message
  using the same task text format as `task`. Skip reasoning workflow tasks and
  custom tasks without title/content.
- `task`: Convert custom tasks with title or content to a user message:
  `A message was displayed to the user that the following task was performed:\n<Task>\n...\n</Task>`.
  Skip non-custom tasks and empty custom tasks.
- `structured_input`: Convert status plus each question into a user message with
  an XML-like `<StructuredInput>` block. Render missing answers as
  `unanswered`, skipped answers as `skipped`, and answered values joined by
  comma and space.
- `generated_image`: If `image` is absent, return no input. If present, return a
  user message with text `The following image was generated by the agent.` and
  an `input_image` content part pointing at the image URL.
- `hidden_context_item`: If `content` is a string, wrap it in
  `<HiddenContext>`. Non-string content throws by default.
- `sdk_hidden_context`: Wrap the string content in `<HiddenContext>`.
- `end_of_turn`: Return no input.

Default hook behavior:

- `attachmentToMessageContent(...)` throws with a clear message.
- `tagToMessageContent(...)` throws with a clear message.
- `hiddenContextToInput(...)` throws for non-string content.

## Usage Pattern

Applications should remain responsible for selecting how much history to load:

```ts
const page = await store.loadThreadItems(thread.id, null, 20, "asc", requestContext);
const input = await simpleToAgentInput(page.data);
const result = await run(agent, input, { stream: true });
yield* streamAgentResponse(agentContext, result);
```

The converter should not reach into the store, create an `AgentContext`, or call
`run(...)`. Keeping those steps separate preserves the existing app-owned
`respond(...)` boundary.

## Error Handling

The converter should not silently drop data that requires application-specific
handling. Attachments, tags without an override, and non-string hidden context
should throw clear errors by default.

JSON stringification errors from client tool call arguments or output should
propagate. Widget serialization errors should propagate from the existing widget
serializer. Conversions that intentionally have no model input should return
`null`, `undefined`, or an empty array internally and normalize to no output from
`toAgentInput(...)`.

## Testing Strategy

Add focused converter tests, either in a new `tests/agents-converter.test.ts` or
a clearly separated block in `tests/agents.test.ts`.

Coverage should include:

- Quoted text is only added for the last user message.
- Mixed user, assistant, and widget items convert correctly.
- Tags call an override hook, dedupe by text, and throw by default without an
  override.
- Generated images convert to user message text plus image input when a URL is
  present, and produce no input when no image is present.
- String hidden context converts by default; non-string hidden context throws by
  default and can be overridden.
- Pending client tool calls are skipped; completed client tool calls convert to
  call plus result.
- Structured input status and answer states convert correctly.
- Workflow custom tasks convert to task messages, while non-custom or empty
  tasks are skipped.
- `simpleToAgentInput(...)` and `ThreadItemConverter.toAgentInput(...)` accept a
  single item and an array.
- Public exports include `ThreadItemConverter` and `simpleToAgentInput`.
- A resumed-turn usage test loads stored items in ascending order and passes the
  converted `AgentInputItem[]` to a fake run function.

Focused verification for the implementation plan should include:

```bash
bun test tests/agents-converter.test.ts tests/exports.test.ts
bun run typecheck
```

Full verification should include:

```bash
bun run verify
```

## Acceptance Criteria

The milestone is complete when:

- `ThreadItemConverter` and `simpleToAgentInput(...)` are exported publicly.
- Converter outputs are assignable to `AgentInputItem[]`.
- Python converter behavior is ported where it applies to existing Bun
  `ThreadItem` variants.
- JavaScript Agents SDK input shapes are used consistently.
- App-specific data requiring custom handling throws by default instead of being
  silently dropped.
- Tests cover the Python parity cases, workflow conversion, exports, and the
  resumed-turn usage pattern.
- No server, stream-output, schema, guardrail rollback, or generated-image stream
  replay behavior changes are introduced.
- `bun run verify` passes.
