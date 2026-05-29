# ChatKit Bun Source Install Agent Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `chatkit-bun` usable from a private GitHub install in a Bun server that also uses `@openai/agents`, without requiring build output.

**Architecture:** Keep the runtime APIs unchanged and make the package boundary explicit with source exports that point to `src/index.ts`. Document a reference example server in the README that demonstrates the intended integration: ChatKit HTTP handler, `ChatKitServer`, `SQLiteStore`, Agents `run()`, and `streamAgentResponse()`.

**Tech Stack:** Bun, TypeScript, `@openai/agents`, `zod`, existing `chatkit-bun` server and agents helpers.

---

### Task 1: Pin Source Package Metadata Behavior

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Choose source package metadata**

Use source distribution for private Bun Git installs: `package.json` stays private and exposes `src/index.ts` through `module`, `types`, and the `exports` map for `.`.

- [ ] **Step 2: Implement source package metadata**

Update `package.json` so Bun consumers can import `chatkit-bun` directly from `src/index.ts` after installing the private GitHub URL.

- [ ] **Step 3: Verify with the full suite**

Run: `bun run verify`

Expected after implementation: PASS.

### Task 2: Document A Reference Bun Agent Server Example

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the example server to README**

Document an example that imports from `chatkit-bun` and `@openai/agents`, defines a support agent, subclasses `ChatKitServer`, converts stored ChatKit items with `simpleToAgentInput`, runs the agent with `{ stream: true, previousResponseId }`, streams back with `streamAgentResponse`, and starts a Bun server from the consuming app entrypoint.

- [ ] **Step 2: Document the example**

Replace the placeholder README content with install, verify, private GitHub dependency, and reference server instructions.

### Task 3: Verify Typecheck And Full Suite

**Files:**
- Verify: `package.json`
- Verify: `README.md`

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck`

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run: `bun run verify`

Expected: PASS.
