import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

import { expect } from "./helpers/expect.js";

interface PackageJson {
  name?: unknown;
  description?: unknown;
  main?: unknown;
  types?: unknown;
  module?: unknown;
  exports?: unknown;
  files?: unknown;
  packageManager?: unknown;
  engines?: unknown;
  repository?: unknown;
  homepage?: unknown;
  bugs?: unknown;
  keywords?: unknown;
  devDependencies?: unknown;
  peerDependencies?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readPackageJson(): Promise<PackageJson> {
  const json = JSON.parse(await readFile("package.json", "utf8")) as unknown;
  if (!isRecord(json)) {
    throw new Error("Expected package.json to contain an object");
  }
  return json;
}

describe("package metadata", () => {
  test("describes the Node.js ESM package", async () => {
    const packageJson = await readPackageJson();
    const rootExport = isRecord(packageJson.exports) ? packageJson.exports["."] : undefined;

    if (!isRecord(rootExport)) {
      throw new Error('Expected package.json exports["."] to contain an object');
    }

    expect(packageJson.name).toBe("chatkit-nodejs");
    expect(packageJson.description).toContain("Node.js");
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(rootExport.types).toBe("./dist/index.d.ts");
    expect(rootExport.import).toBe("./dist/index.js");
    expect(packageJson.module).toBe(undefined);
  });

  test("requires Node 24.15 or newer and npm", async () => {
    const packageJson = await readPackageJson();
    const engines = isRecord(packageJson.engines) ? packageJson.engines : {};

    expect(engines.node).toBe(">=24.15.0");
    expect(packageJson.packageManager).toMatch(/^npm@\d+\.\d+\.\d+$/);
    expect(JSON.stringify(packageJson)).not.toContain('"bun"');
    expect(JSON.stringify(packageJson)).not.toContain(`@types/${"bun"}`);
  });

  test("publishes compiled artifacts only", async () => {
    const packageJson = await readPackageJson();

    expect(packageJson.files).toEqual(["dist", "README.md", "LICENSE", "NOTICE"]);
    expect(packageJson.peerDependencies).toBe(undefined);
  });

  test("uses chatkit-nodejs repository metadata and Node keywords", async () => {
    const packageJson = await readPackageJson();

    expect(JSON.stringify(packageJson.repository)).toContain("chatkit-nodejs");
    expect(packageJson.homepage).toBe("https://github.com/ottersoft-x/chatkit-nodejs#readme");
    expect(JSON.stringify(packageJson.bugs)).toContain("chatkit-nodejs/issues");
    expect(packageJson.keywords).toContain("nodejs");
    expect(packageJson.keywords).not.toContain("bun");
  });
});
