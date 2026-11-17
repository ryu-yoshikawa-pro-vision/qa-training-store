import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const exercise = fs.readFileSync(
  path.join(process.cwd(), "training/ai-assisted-qa-course/exercises/M05/exercise.md"),
  "utf8",
);
const flags = [
  "--ignoreConfig",
  "--noEmit",
  "--strict",
  "--skipLibCheck",
  "--target",
  "ES2022",
  "--module",
  "NodeNext",
  "--moduleResolution",
  "NodeNext",
];
const temporaryRoots = [];

afterEach(() => {
  for (const directory of temporaryRoots.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** 指定した学習用TypeScriptファイルを既定の型検査条件で実行する。 */
function typecheck(file) {
  return spawnSync("pnpm", ["exec", "tsc", ...flags, file], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 30_000,
  });
}

describe("M05 P03のTypeScript型診断（隔離した短コードのみ）", () => {
  it("教材はworkspaceの対象ファイルを明示し、ルート全体の型検査と区別する", () => {
    expect(exercise).toContain(
      "pnpm exec tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext workspace/M05/p03-type-error.ts",
    );
    expect(exercise).toContain("tsx");
    expect(exercise).toContain("型検査");
  });

  const linuxIt = process.platform === "linux" ? it : it.skip;
  linuxIt("誤型では非0とTS2345、修正後は0を返す", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "course-m05-p03-typecheck-"));
    temporaryRoots.push(root);
    const file = path.join(root, "p03-type-error.ts");
    const before = [
      "function addOne(quantity: number): number { return quantity + 1; }",
      'const observed = addOne("2");',
      "console.log(observed);",
      "",
    ].join("\n");
    fs.writeFileSync(file, before);

    const invalid = typecheck(file);
    expect(invalid.error).toBeUndefined();
    expect(invalid.status).not.toBe(0);
    expect(invalid.stdout + invalid.stderr).toContain("TS2345");

    fs.writeFileSync(file, before.replace('addOne("2")', "addOne(2)"));
    const corrected = typecheck(file);
    expect(corrected.error).toBeUndefined();
    expect(corrected.status, corrected.stdout + corrected.stderr).toBe(0);
  });
});
