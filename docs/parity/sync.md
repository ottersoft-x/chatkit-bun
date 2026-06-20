# Parity Sync Procedure

This repository tracks parity against the Python `openai-chatkit` package pinned
in `docs/parity/upstream.json`.

## When Upstream Changes

1. Update the `packages/chatkit-python` submodule to the target upstream commit.
2. Record the package name, version, submodule path, and commit in
   `docs/parity/upstream.json`.
3. Review upstream release notes and the Python test diff since the previous
   pinned commit.
4. Update `docs/parity/matrix.json` for changed public models, request types,
   stream events, widget behavior, store contracts, Agents behavior, and tests.
5. Port corresponding TypeScript code and Node.js tests.
6. Run local verification:

```bash
npm run verify:parity
```

The opt-in `npm run verify:parity` wrapper runs the normal Node.js verification
and prints the optional Python upstream command.

7. When the Python submodule environment is available, run:

```bash
cd packages/chatkit-python
make test
```

## Matrix Status Values

- `covered`: Node.js has local tests for the behavior and no known parity gap.
- `partial`: Node.js covers the main behavior, but the row still has known
  limits or related sub-gaps.
- `intentional-difference`: Node.js deliberately differs from Python, and the
  row notes why.
- `deferred`: The behavior is known but not implemented in Node.js yet.
- `not-applicable`: The upstream behavior does not apply to this Node.js port.

## Rules

- Keep `docs/parity/upstream.json` and `docs/parity/matrix.json` in sync.
- Every non-deferred matrix row must cite local tests, source files, or docs.
- Do not add networked OpenAI calls to parity tests.
- Do not make Python pytest part of the default `npm run verify` command.
- Choose future parity implementation slices from `deferred` and `partial` rows.
