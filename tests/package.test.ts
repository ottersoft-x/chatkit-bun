import { describe, expect, test } from "bun:test";

interface PackageJson {
  exports?: unknown;
  module?: unknown;
  types?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readPackageJson(): Promise<PackageJson> {
  const json = await Bun.file(new URL("../package.json", import.meta.url)).json();
  if (!isRecord(json)) {
    throw new Error("Expected package.json to contain an object");
  }
  return json;
}

describe("package metadata", () => {
  test("points type entries at declarations while preserving source runtime entries", async () => {
    const packageJson = await readPackageJson();
    const rootExport = isRecord(packageJson.exports) ? packageJson.exports["."] : undefined;

    if (!isRecord(rootExport)) {
      throw new Error('Expected package.json exports["."] to contain an object');
    }

    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(rootExport.types).toBe("./dist/index.d.ts");
    expect(packageJson.module).toBe("./src/index.ts");
    expect(rootExport.import).toBe("./src/index.ts");
  });
});
