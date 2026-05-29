# ChatKit Attachments Content Conversion Design

## Purpose

This milestone closes the `attachments-content-conversion` parity row by
documenting and testing the same attachment conversion boundary that Python
ChatKit exposes.

Python's `ThreadItemConverter.attachment_to_message_content(...)` is an
application-owned hook. It throws by default when a user message contains
attachments, because the SDK cannot know whether a file should be sent as a URL,
an OpenAI file id, inline data, or a custom text description. Bun's
`ThreadItemConverter.attachmentToMessageContent(...)` already follows that same
boundary. The missing work is focused parity proof: tests for the default error
and for the override path, plus a parity matrix update that records the behavior
as covered.

## Scope

In scope:

- Add focused Bun tests showing that user-message attachments call
  `attachmentToMessageContent(...)`.
- Prove the default converter rejects attachments with a clear error instead of
  silently dropping them.
- Prove a custom converter can map both file and image attachments into Agents
  SDK message content parts.
- Update `docs/parity/matrix.json` so `attachments-content-conversion` is
  `covered`.
- Update the parity smoke deferred-row expectation.

Out of scope:

- Adding new default attachment conversion behavior.
- Fetching, downloading, or uploading attachment content.
- Adding file URL, file id, or binary data fields to ChatKit attachment schemas.
- Changing `ChatKitServer`, store, HTTP, stream output, or OpenAI `run(...)`
  behavior.
- Accepting Python snake-case content shapes in the Bun converter.

## Public API

No new public API is required.

The existing public hook remains the extension point:

```ts
class ThreadItemConverter {
  attachmentToMessageContent(
    attachment: Attachment,
  ): AgentMessageContentPart | Promise<AgentMessageContentPart>;
}
```

The default method continues to throw. Applications that know how their
attachments are stored can subclass `ThreadItemConverter` and return JavaScript
Agents SDK content parts such as `input_file`, `input_image`, or `input_text`.

## Conversion Boundary

Bun should not infer a default attachment representation from the current
ChatKit attachment metadata.

Image attachments have `preview_url`, which is suitable for UI previewing but is
not necessarily the original image the model should inspect. File attachments do
not include a stable download URL, OpenAI file id, or inline data. Choosing a
default would introduce behavior Python does not provide and could send the wrong
resource to the model.

The supported default behavior is therefore explicit failure when an attachment
is present without an override. That keeps the conversion safe and mirrors
Python's `NotImplementedError` contract.

## Data Flow

1. `simpleToAgentInput(...)` or `ThreadItemConverter.toAgentInput(...)` receives
   a `user_message` with attachments.
2. `userMessageToInput(...)` builds the user text content.
3. For each attachment, it calls `attachmentToMessageContent(...)`.
4. The default converter throws a clear error.
5. A custom converter can return an Agents SDK content part, which is appended to
   the user message content after the `input_text` part.

No stream events, persisted thread items, server request handling, or attachment
schemas change in this slice.

## Testing Strategy

Use TDD for implementation.

Focused tests in `tests/agents-converter.test.ts`:

- `simpleToAgentInput(...)` rejects a user message with an attachment by default,
  and the error names `ThreadItemConverter.attachmentToMessageContent`.
- A custom converter maps a file attachment into an `input_file` content part.
- A custom converter maps an image attachment into an `input_image` content part.
- Mixed text plus attachments preserve order: the original `input_text` part
  remains first, followed by converted attachment parts in attachment order.

Parity smoke:

- Update `docs/parity/matrix.json` so `attachments-content-conversion` is
  `covered`, with `tests/agents-converter.test.ts`,
  `tests/parity-smoke.test.ts`, and `src/agents/converter.ts` references.
- Update `tests/parity-smoke.test.ts` so the known deferred rows no longer
  include `attachments-content-conversion`.

Focused verification:

```bash
bun test tests/agents-converter.test.ts tests/parity-smoke.test.ts
bun run typecheck
```

Full verification:

```bash
bun run verify
bun run verify:parity
```

## Completion Criteria

- Attachment-bearing user messages still fail clearly by default.
- Custom converters can translate file and image attachments into Agents SDK
  content parts.
- Existing user message, tag, quote, and non-attachment conversion behavior stays
  unchanged.
- The parity matrix marks `attachments-content-conversion` as covered and cites
  local source, test, and spec references.
- Focused and full Bun verification pass.
