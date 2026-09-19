import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * C09のinitial Failureへ戻すための不変な演習内容です。
 * 学習者の修正後コードやcanonicalな教材ファイルを自動で読み戻さず、
 * 明示された演習用コピーへだけ書き出します。
 */
export const INITIAL_DIAGNOSTIC_EXERCISE = `import { expect, test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";

test("TC-CART-001 diagnostic exercise: identify and repair the incorrect cart expectation", async ({
  page,
}) => {
  // C09のinitial runでは、決定的に誤った期待値を観測し、Evidenceから原因を分析します。
  // 修正は学習者の演習用コピーで行い、diagnostic-repairedとして別run／別Evidenceを残します。
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.getByLabel("数量").selectOption("4");
  await page.getByRole("button", { name: "カートに追加" }).click();

  // 受講者はFailure Evidenceを確認し、仕様の条件に合わせてこの期待値を修正します。
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await expect(page.getByLabel("数量")).toHaveValue("1");
});
`;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function hasGitSegment(candidate: string): boolean {
  return candidate.split(/[\\/]+/).some((part) => part === ".git");
}

function resolveThroughExistingAncestor(candidate: string): string {
  let current = candidate;
  const missing: string[] = [];
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return candidate;
    missing.unshift(path.basename(current));
    current = parent;
  }
  return path.resolve(fs.realpathSync(current), ...missing);
}

export function restoreDiagnosticExercise(
  rootOption: string,
  targetOption: string,
  force: boolean,
): string {
  if (!rootOption || rootOption.includes("\0")) throw new Error("--root must be a non-empty path");
  if (!targetOption || targetOption.includes("\0"))
    throw new Error("--target must be a non-empty path");
  const root = path.resolve(rootOption);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory())
    throw new Error(`--root must be an existing directory: ${root}`);
  const rootReal = fs.realpathSync(root);
  const repositoryRoot = fs.realpathSync(process.cwd());
  if (isWithin(repositoryRoot, rootReal) || isWithin(rootReal, repositoryRoot))
    throw new Error("--root must be outside the canonical repository");
  const target = path.resolve(targetOption);
  if (!isWithin(rootReal, resolveThroughExistingAncestor(target)))
    throw new Error("--target must remain inside --root");
  if (!target.toLowerCase().endsWith(".spec.ts"))
    throw new Error("--target must point to a .spec.ts file");
  if (hasGitSegment(target) || hasGitSegment(resolveThroughExistingAncestor(target)))
    throw new Error("--target must not be inside .git");
  const targetParent = path.dirname(target);
  if (!isWithin(rootReal, resolveThroughExistingAncestor(targetParent)))
    throw new Error("--target parent must remain inside --root");
  if (fs.existsSync(target)) {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) throw new Error(`Target must not be a symlink: ${target}`);
    if (!force)
      throw new Error("Target exists; pass --force only for an intentional diagnostic recovery");
    if (!stat.isFile()) throw new Error(`Target is not a regular file: ${target}`);
  }
  fs.mkdirSync(targetParent, { recursive: true });
  if (!isWithin(rootReal, fs.realpathSync(targetParent)))
    throw new Error("--target parent symlink escaped --root");
  fs.writeFileSync(target, INITIAL_DIAGNOSTIC_EXERCISE, "utf8");
  return target;
}

if (isMainModule()) {
  const root = option("--root");
  const target = option("--target");
  if (!root) throw new Error("--root is required");
  if (!target) throw new Error("--target is required");
  const restored = restoreDiagnosticExercise(root, target, process.argv.includes("--force"));
  console.log(JSON.stringify({ target: restored, context: "diagnostic-initial" }, null, 2));
}
