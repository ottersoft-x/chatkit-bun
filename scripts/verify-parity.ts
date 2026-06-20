import { readFile } from "node:fs/promises";

interface UpstreamMetadata {
  packageName: string;
  version: string;
  submodulePath: string;
  commit: string;
}

interface ParityMatrix {
  rows: Array<{ status: string }>;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

const matrix = await readJson<ParityMatrix>("docs/parity/matrix.json");
const upstream = await readJson<UpstreamMetadata>("docs/parity/upstream.json");
const deferredRows = matrix.rows.filter((row) => row.status === "deferred");

console.log(`Parity reference: ${upstream.packageName} ${upstream.version}`);
console.log(`Pinned commit: ${upstream.commit}`);
console.log(`Submodule path: ${upstream.submodulePath}`);
console.log("Local implementation: chatkit-nodejs on Node.js");
console.log(`Matrix rows: ${matrix.rows.length}`);
console.log(`Deferred rows: ${deferredRows.length}`);
console.log("");
console.log("Optional upstream check when the Python environment is available:");
console.log(`cd ${upstream.submodulePath} && make test`);
