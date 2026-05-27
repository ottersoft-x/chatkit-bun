import { describe, expect, test } from "bun:test";

import packageJson from "../package.json";

describe("package metadata", () => {
  test("stays private and exposes Bun verification scripts", async () => {
    expect(packageJson.name).toBe("chatkit-bun");
    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe("module");
    expect(packageJson.module).toBe("src/index.ts");
    expect(await Bun.file(packageJson.module).exists()).toBe(true);
    expect(packageJson.scripts).toMatchObject({
      test: "bun test",
      typecheck: "bunx tsc --noEmit",
      verify: "bun run typecheck && bun test",
    });
  });

  test("declares only the required runtime and development dependencies", () => {
    expect(Object.keys(packageJson.dependencies ?? {}).sort()).toEqual([
      "nunjucks",
      "zod",
    ]);
    expect(Object.keys(packageJson.devDependencies ?? {}).sort()).toEqual([
      "@types/bun",
      "@types/nunjucks",
      "typescript",
    ]);
    expect(packageJson.peerDependencies).toEqual({ typescript: "^5" });

    expect(typeof packageJson.dependencies?.nunjucks).toBe("string");
    expect(typeof packageJson.dependencies?.zod).toBe("string");
    expect(typeof packageJson.devDependencies?.["@types/bun"]).toBe("string");
    expect(typeof packageJson.devDependencies?.["@types/nunjucks"]).toBe(
      "string",
    );
    expect(typeof packageJson.devDependencies?.typescript).toBe("string");
    expect(typeof packageJson.peerDependencies?.typescript).toBe("string");
  });
});
