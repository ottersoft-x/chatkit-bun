# ChatKit Node.js Migration Design

## Purpose

This migration turns `chatkit-bun` into `chatkit-nodejs`: a clean Node.js
TypeScript port of OpenAI's Apache-2.0 `openai-chatkit` Python package. The
goal is to remove Bun from the runtime, development toolchain, package identity,
documentation, and release workflow while preserving the existing ChatKit API
behavior and parity discipline.

The migration is a clean transition. There are no compatibility shims, fallback
imports, `chatkit-bun` aliases, CommonJS builds, or Bun-supported paths. Existing
consumers update imports and installation instructions from `chatkit-bun` to
`chatkit-nodejs`.

## Scope

In scope:

- Rename the npm package and active docs to `chatkit-nodejs`.
- Require Node.js `>=24.15.0`.
- Use npm as the package manager and commit `package-lock.json`.
- Remove Bun from package metadata, dependency metadata, source code, tests,
  scripts, CI, and active contributor instructions.
- Publish compiled ESM JavaScript and declarations from `dist/`.
- Use Node-compatible TypeScript module settings and explicit `.js` relative
  import specifiers in TypeScript source where needed.
- Replace `bun:sqlite` with Node's built-in `node:sqlite` for the default
  `SQLiteStore`.
- Replace `bun:test` with Node's built-in test runner.
- Keep ChatKit request, response, stream, widget, store, and Agents conversion
  behavior unchanged except where Node migration requires equivalent runtime
  plumbing.

Out of scope:

- CommonJS support.
- Bun compatibility.
- A `chatkit-bun` deprecation package or import alias.
- A bundled single-file build.
- Broad ChatKit parity feature work unrelated to the Node migration.
- Changing wire-format behavior, public ChatKit schemas, or the upstream parity
  reference.

## Package Shape

`package.json` should describe a Node.js ESM library:

- `name`: `chatkit-nodejs`
- `type`: `module`
- `engines.node`: `>=24.15.0`
- `main`: `./dist/index.js`
- `types`: `./dist/index.d.ts`
- `exports["."]`: types and import targets under `dist`
- `files`: `dist`, `README.md`, `LICENSE`, and `NOTICE`
- `packageManager`: an exact npm version, such as `npm@11.13.0` when generated
  by the local Node 24 toolchain
- repository, homepage, bugs, and keywords updated away from `chatkit-bun` and
  Bun-specific branding

The package should not expose `src/*.ts` as runtime entrypoints. TypeScript
source remains under `src/`; published runtime code and type declarations come
from `dist/`.

`bun.lock` should be removed and replaced by `package-lock.json`. CI should use
`npm ci` so dependency installs are strictly tied to the committed lockfile.

Package dependencies should reflect a compiled Node library:

- add `@types/node` as a development dependency
- keep `typescript` as a development dependency
- remove the TypeScript peer dependency unless emitted declarations prove that
  consumers need to bring their own TypeScript package at runtime or install time
- remove `@types/bun` and all Bun engine metadata

## TypeScript And Module Design

The project should compile with TypeScript rather than a bundler. This keeps the
published package easy to inspect and avoids mismatches between emitted
JavaScript and declaration files.

The TypeScript configuration should use modern Node library settings:

- `module`: `nodenext`
- `moduleResolution`: `nodenext`
- `target` and `lib` appropriate for Node 24
- `rootDir`: `src`
- `outDir`: `dist`
- `declaration`: `true`
- strict type checking preserved
- `verbatimModuleSyntax`: `true`

Because Node ESM requires runtime-resolvable relative module specifiers, source
imports that compile into runtime imports should use `.js` extensions, such as
`import { NotFoundError } from "./errors.js";`. TypeScript resolves those
specifiers to `.ts` source files during development and emits the same `.js`
specifier into `dist`, where Node can load it.

The existing `types/` declaration-only output should be removed in favor of
declarations emitted beside JavaScript in `dist/`.

## Runtime Migration

Most core code already uses Web-standard APIs such as `Request`, `Response`,
`ReadableStream`, `TextEncoder`, and `TextDecoder`. Node 24 provides these, so
the HTTP handler can remain framework-neutral.

`src/sqlite-store.ts` should replace `bun:sqlite` with `node:sqlite` and
`DatabaseSync`. The current store uses only a narrow synchronous SQLite surface:

- open a database path or `:memory:`
- run schema DDL with `exec`
- create positional prepared statements
- call `run`, `get`, and `all`
- close the database

That maps directly to Node's built-in SQLite API. The public class should remain
`SQLiteStore`, because that is a useful package API and not Bun-specific.

`WidgetTemplate.fromFile(...)` should replace `Bun.file(...).json()` with
`node:fs/promises` file reading plus `JSON.parse`, while preserving the current
path resolution behavior.

The path resolver needs explicit compiled-package coverage. The current
implementation infers caller-relative paths from stack frames and skips its own
source file. After publishing compiled `dist` files, that same behavior must
skip both source and compiled internal template frames, then resolve
`WidgetTemplate.fromFile("relative.widget")` against the consumer file's
directory. Add a Node ESM smoke test that imports the compiled package and loads
a relative `.widget` fixture from a consumer module.

Example code should use Node APIs. The README server example should replace
`Bun.serve` and `Bun.env` with a Node `node:http` example and `process.env`.

`node:sqlite` has a less application-specific TypeScript surface than
`bun:sqlite`'s typed `query<T, Args>` calls. Keep SQLite row typing contained in
`src/sqlite-store.ts` with a small local helper or parser boundary for expected
row shapes instead of scattering unchecked casts through the store. Store tests
should continue covering `:memory:`, foreign-key behavior, close behavior,
pagination, and parsed row shapes.

## Tests And Verification

Tests should migrate from `bun:test` to Node's built-in test runner:

- import tests from `node:test`
- import assertions from `node:assert/strict`
- use Node filesystem APIs for fixtures
- use Node-compatible temporary paths and cleanup

Tests should not run directly from raw TypeScript source. Node's built-in
TypeScript stripping does not apply project `tsconfig` settings and should not
be the canonical test path for this library. Instead, define a dedicated test
compile step that emits source, tests, and test-only helpers to a temporary
JavaScript output directory, then run `node --test` against that compiled test
output.

Expected npm scripts:

- `build:test`: `tsc -p tsconfig.test.json`
- `test`: `npm run build:test && node --test .tmp/test/tests`
- `build`: `tsc -p tsconfig.build.json`
- `typecheck`: `tsc --noEmit`
- `verify`: `npm run typecheck && npm test && npm run build`
- `verify:parity`: `npm run verify` plus a Node-compatible parity summary
  script compiled as part of the test or script build

The migration should add or update package tests to assert:

- package name is `chatkit-nodejs`
- package exports point at `dist`
- package engine requires Node `>=24.15.0`
- package manager is an exact npm package-manager value
- no Bun package manager, Bun engine, or `@types/bun` metadata remains
- TypeScript is not a peer dependency unless there is a documented emitted-type
  requirement
- repository, homepage, bugs, and keywords use `chatkit-nodejs` or Node wording
- packed contents do not include source-only or Bun lock artifacts

Full verification for the implementation should include `npm run verify`,
`npm run verify:parity`, and an npm pack inspection.

## Documentation And Contributor Instructions

Active documentation should describe `chatkit-nodejs` as a Node.js TypeScript
port of `openai-chatkit`.

Update:

- `README.md`
- `NOTICE`
- `AGENTS.md`
- `CLAUDE.md` or remove it if it only exists to instruct Bun usage
- `.github/workflows/publish.yml`
- active parity docs that instruct contributors how to sync and verify the
  project
- package metadata and package tests

Active parity metadata should be migrated as part of the clean rebrand. The
current matrix uses a `bun` implementation key, and active docs use Bun wording.
Rename active implementation metadata to `nodejs` rather than leaving Bun as a
schema name:

- `docs/parity/matrix.json` rows use `nodejs` for local tests, sources, and docs
- parity smoke tests validate `nodejs` references
- `docs/parity/sync.md` describes Node/npm verification
- `scripts/verify-parity.ts` output names the Node.js implementation
- active docs referenced by parity rows avoid Bun wording unless they are
  historical references

Historical Superpowers specs and plans can remain as history unless active
parity metadata or tests rely on their names. New specs and plans should use
`chatkit-nodejs` and Node/npm commands.

## Publishing Workflow

The GitHub publish workflow should remove `oven-sh/setup-bun` and use
`actions/setup-node` with Node `24.x`. It should run:

1. `npm ci`
2. `npm run verify`
3. `npm publish`

The workflow should keep `id-token: write` and be compatible with npm trusted
publishing or provenance publishing. If trusted publishing is configured on
npmjs.com for the package, npm can use OIDC without a long-lived token. Release
tags can keep the existing `v<version>` format.

## Risks And Decisions

`node:sqlite` is a release-candidate Node API in Node 24.15+, but it is a strong
fit for this package because the current SQLite usage is narrow and maps
directly to `DatabaseSync`. The store boundary remains isolated, so a later move
to `better-sqlite3` would be contained to `src/sqlite-store.ts` and dependency
metadata if Node's built-in API changes in a problematic way.

ESM-only is intentional. It matches the Node 24 target and avoids unchecked
dual-output complexity.

No compatibility path is intentional. The rebrand and runtime transition should
be clear in package metadata, docs, tests, and examples.

## Acceptance Criteria

- `npm install` creates or updates `package-lock.json`; Bun is not required.
- `npm run verify` passes under Node `>=24.15.0`.
- `npm run verify:parity` passes under Node `>=24.15.0`.
- `npm pack --dry-run` shows only intended publish artifacts.
- Importing `chatkit-nodejs` from the packed package works in a Node ESM smoke
  test.
- A compiled-package smoke test proves `WidgetTemplate.fromFile(...)` resolves a
  caller-relative `.widget` path from a consumer module.
- Active parity metadata uses `nodejs`, not `bun`, for local implementation
  references.
- Repository search finds no active Bun runtime, toolchain, package, or docs
  references except historical specs/plans and any explicit migration notes.
- README examples run on Node APIs and import from `chatkit-nodejs`.

## References

- Node.js package documentation:
  https://nodejs.org/download/release/latest-v24.x/docs/api/packages.html
- Node.js test runner documentation:
  https://nodejs.org/download/release/latest-v24.x/docs/api/test.html
- Node.js TypeScript documentation:
  https://nodejs.org/download/release/latest-v24.x/docs/api/typescript.html
- Node.js SQLite documentation:
  https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- TypeScript library compiler guidance:
  https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- npm install and lockfile behavior:
  https://docs.npmjs.com/cli/v11/commands/npm-install/
- npm trusted publishing:
  https://docs.npmjs.com/trusted-publishers/
