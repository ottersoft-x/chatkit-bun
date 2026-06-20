import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface PackEntry {
  files: Array<{ path: string }>;
}

const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"]);
const entries = JSON.parse(stdout) as PackEntry[];
const files = new Set(entries[0]?.files.map((file) => file.path) ?? []);

for (const expected of ["package.json", "README.md", "LICENSE", "NOTICE", "dist/index.js", "dist/index.d.ts"]) {
  assert.equal(files.has(expected), true, `Expected packed package to include ${expected}`);
}

for (const forbidden of ["bun.lock", "tsconfig.types.json", "src/index.ts", "types/index.d.ts"]) {
  assert.equal(files.has(forbidden), false, `Expected packed package to exclude ${forbidden}`);
}

for (const file of files) {
  assert.equal(file.startsWith("src/"), false, `Expected packed package to exclude source file ${file}`);
  assert.equal(file.startsWith("types/"), false, `Expected packed package to exclude old declaration file ${file}`);
  assert.equal(file.startsWith(".tmp/"), false, `Expected packed package to exclude temporary file ${file}`);
}

console.log(`Pack contents verified: ${files.size} files`);
