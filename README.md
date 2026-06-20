# chatkit-nodejs

`chatkit-nodejs` is a Node.js server bridge for ChatKit-style thread APIs. It is
a TypeScript/Node.js port derived from OpenAI's Apache-2.0 licensed
`openai-chatkit` Python package.

- ChatKit request processing and SSE response helpers.
- SQLite-backed thread and item storage using Node's built-in `node:sqlite`.
- Widget serialization and streaming helpers.
- `@openai/agents` stream conversion helpers for Node.js servers.

## Transparency

This package has been developed heavily with AI assistance using
[Superpowers](https://github.com/obra/superpowers), an agentic skills framework
and software development methodology.

## Development

Install in a Node.js app:

```bash
npm install chatkit-nodejs
```

Install dependencies:

```bash
npm install
```

Run typecheck, tests, package smoke checks, and pack inspection:

```bash
npm run verify
```

The package publishes compiled ESM JavaScript and TypeScript declarations under
`dist/`. Node.js `>=24.15.0` is required.

## Node.js Agent Server Example

Use `ChatKitServer` to bridge ChatKit requests to an `@openai/agents` workflow.
This example streams an intake agent first, passes its summary to an isolated
research agent that does not receive the prior chat history, then passes both
outputs to the final answer agent. Each stage emits workflow updates so the
frontend can show what is happening:

```ts
import { Agent, run } from "@openai/agents";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import {
  AgentContext,
  ChatKitServer,
  SQLiteStore,
  createChatKitHandler,
  simpleToAgentInput,
  streamAgentResponse,
  type ThreadItem,
  type ThreadMetadata,
  type ThreadStreamEvent,
} from "chatkit-nodejs";

interface RequestContext {
  userId: string;
}

type UserMessageItem = Extract<ThreadItem, { type: "user_message" }>;

const intakeAgent = new Agent({
  name: "Intake Agent",
  instructions:
    "Read the conversation and summarize the user's goal, constraints, and any missing context.",
});

const answerAgent = new Agent({
  name: "Answer Agent",
  instructions:
    "Use the intake summary and research notes to produce a concise, helpful final answer for the user.",
});

const researchAgent = new Agent({
  name: "Research Agent",
  instructions:
    "You receive only a task summary, not the conversation history. Return focused research notes.",
});

function requestContext(request: Request): RequestContext {
  return {
    userId: request.headers.get("x-user-id") ?? "anonymous",
  };
}

function threadPreviousResponseId(thread: ThreadMetadata): string | null {
  const value = thread.metadata.previous_response_id;
  return typeof value === "string" ? value : null;
}

class AppChatKitServer extends ChatKitServer<RequestContext> {
  constructor(readonly sqlitePath = process.env.CHATKIT_SQLITE_PATH ?? "chatkit.sqlite") {
    super(
      new SQLiteStore<RequestContext>({
        path: sqlitePath,
        getUserId: (context) => context.userId,
      }),
    );
  }

  override async *respond(
    thread: ThreadMetadata,
    _inputUserMessage: UserMessageItem | null,
    context: RequestContext,
  ): AsyncIterable<ThreadStreamEvent> {
    const page = await this.store.loadThreadItems(thread.id, null, 50, "asc", context);
    const input = await simpleToAgentInput(page.data);
    const previousResponseId = threadPreviousResponseId(thread);

    const intakeContext = new AgentContext({
      thread,
      store: this.store,
      context,
      previousResponseId,
    });
    intakeContext.addWorkflowTask({
      type: "custom",
      title: "Reviewing the request",
      content: "The intake agent is identifying the user's goal and constraints.",
      status_indicator: "loading",
    });

    const intakeRun = await run(intakeAgent, input, {
      stream: true,
      previousResponseId: previousResponseId ?? undefined,
    });

    yield* streamAgentResponse(intakeContext, intakeRun);
    await intakeRun.completed;

    const intakeSummary = String(intakeRun.finalOutput ?? "No intake summary was produced.");
    const researchContext = new AgentContext({
      thread,
      store: this.store,
      context,
    });
    researchContext.addWorkflowTask({
      type: "custom",
      title: "Checking isolated context",
      content: "The research agent is working from the intake summary only.",
      status_indicator: "loading",
    });

    const researchRun = await run(
      researchAgent,
      `Research this request using only this summary:\n\n${intakeSummary}`,
      { stream: true },
    );

    yield* streamAgentResponse(researchContext, researchRun);
    await researchRun.completed;

    const researchNotes = String(researchRun.finalOutput ?? "No research notes were produced.");
    const answerContext = new AgentContext({
      thread,
      store: this.store,
      context,
      previousResponseId: intakeRun.lastResponseId ?? previousResponseId,
    });
    answerContext.addWorkflowTask({
      type: "custom",
      title: "Drafting the answer",
      content: "The answer agent is combining the intake summary and isolated research notes.",
      status_indicator: "loading",
    });

    const answerRun = await run(
      answerAgent,
      `Use this intake summary and research notes.

Intake summary:
${intakeSummary}

Research notes:
${researchNotes}`,
      {
        stream: true,
        previousResponseId: answerContext.previousResponseId ?? undefined,
      },
    );

    yield* streamAgentResponse(answerContext, answerRun);
  }
}

const chatkitHandler = createChatKitHandler(new AppChatKitServer(), {
  getContext: requestContext,
});

const server = createServer(async (incoming, outgoing) => {
  const origin = `http://${incoming.headers.host ?? "localhost"}`;
  const request = new Request(new URL(incoming.url ?? "/", origin), {
    method: incoming.method,
    headers: incoming.headers as HeadersInit,
    body: incoming.method === "GET" || incoming.method === "HEAD" ? undefined : Readable.toWeb(incoming),
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  if (request.method === "GET" && new URL(request.url).pathname === "/health") {
    outgoing.writeHead(200, { "content-type": "text/plain" });
    outgoing.end("ok");
    return;
  }

  if (request.method === "POST" && new URL(request.url).pathname === "/chatkit") {
    const response = await chatkitHandler(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      for await (const chunk of response.body) {
        outgoing.write(chunk);
      }
    }
    outgoing.end();
    return;
  }

  outgoing.writeHead(404, { "content-type": "text/plain" });
  outgoing.end("not found");
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`ChatKit server listening on http://localhost:${port}`);
});
```

The server listens on `PORT` or `3000` and exposes `POST /chatkit`. It uses
`x-user-id` as the per-request user id, falling back to `anonymous`.
