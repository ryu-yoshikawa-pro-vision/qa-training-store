import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repositoryRoot = process.cwd();
const exercise = fs.readFileSync(
  path.join(repositoryRoot, "training/ai-assisted-qa-course/exercises/M07/exercise.md"),
  "utf8",
);
const backupSection = exercise
  .split("### Git/PRを使わないPhase 2成果物の保全")[1]
  ?.split("### 固定Skillとの協働")[0];
const fence = String.fromCharCode(96).repeat(3);
const codeBlockPattern = new RegExp(fence + "bash\\n([\\s\\S]*?)\\n\\s*" + fence, "g");
const commandBlocks = Array.from((backupSection ?? "").matchAll(codeBlockPattern), (match) =>
  match[1].replace(/^ {3}/gm, ""),
);
const initializeManifest = commandBlocks.find(
  (block) => block.includes("phase2-files.txt <<'EOF'") && block.includes("set -C"),
);
const guardAndArchive = commandBlocks.find((block) =>
  block.includes("tar --create --gzip --file=-"),
);

const restoreDownloaded = commandBlocks.find((block) => block.includes("tar -xzf ./phase2.tgz"));
const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** テスト用の成果物をworkspace相対パスで作成する。 */
function writeFixtureFile(root, relative, content = "dummy training evidence\n") {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
  return absolute;
}

/** 保全対象ファイルと一覧を持つ一時workspaceを作成する。 */
function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "course-phase2-export-"));
  temporaryDirectories.push(root);
  const files = [
    "workspace/M05/submission.md",
    "workspace/M05/p03-type-error.ts",
    "workspace/M05/p05-cart-locator.spec.ts",
    "workspace/M05/evidence/p05-direct-sample/spec-snapshot.ts",
    "workspace/M05/evidence/p05-direct-sample/console.log",
    "workspace/M05/evidence/p05-direct-sample/playwright-result.json",
    "workspace/M06/new-case.spec.ts",
    "workspace/M07/diagnosis.md",
  ];
  for (const file of files) writeFixtureFile(root, file);
  const manifest = "workspace/M07/exports/phase2-files.txt";
  writeFixtureFile(root, manifest, files.join("\n") + "\n");
  return { root, files, manifest };
}

/** 教材の一覧初期化コマンドを隔離Bashで実行する。 */
function runManifestInitialization(fixture) {
  return spawnSync("bash", ["-c", initializeManifest], {
    cwd: fixture.root,
    encoding: "utf8",
    timeout: 10_000,
  });
}

/** 教材のアーカイブ生成手順を隔離Bashで実行する。 */
function runGuard(fixture, manifestLines) {
  if (manifestLines) {
    writeFixtureFile(fixture.root, fixture.manifest, manifestLines.join("\n") + "\n");
  }
  return spawnSync("bash", ["-e", "-c", guardAndArchive], {
    cwd: fixture.root,
    encoding: "utf8",
    timeout: 15_000,
  });
}

/** ダウンロード済みコピーを置く本人専用ローカルディレクトリを作成する。 */
function makeDownloadedCopy(fixture) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "course-phase2-downloaded-"));
  temporaryDirectories.push(home);
  const local = path.join(home, "phase2-private");
  const exportsDir = path.join(fixture.root, "workspace/M07/exports");
  fs.mkdirSync(local, { mode: 0o700 });
  for (const name of ["phase2.tgz", "phase2.tgz.sha256"]) {
    fs.copyFileSync(path.join(exportsDir, name), path.join(local, name));
  }
  return { home, local };
}

/** 教材のコピー照合・復元手順をローカルの非公開領域で実行する。 */
function runDownloadedRestore(home) {
  return spawnSync("bash", ["-e", "-c", restoreDownloaded], {
    env: { ...process.env, HOME: home },
    cwd: home,
    encoding: "utf8",
    timeout: 15_000,
  });
}

describe("Phase 2 Git/PR不要の保全手順", () => {
  const linuxIt = process.platform === "linux" ? it : it.skip;

  linuxIt("明示した本人成果物だけを保全し、SHA-256と復元内容が一致する", () => {
    expect(guardAndArchive).toBeTruthy();
    const fixture = makeFixture();
    const run = runGuard(fixture);
    expect(run.status, run.stderr + run.stdout).toBe(0);
    const archive = path.join(fixture.root, "workspace/M07/exports/phase2.tgz");
    const checksum = path.join(fixture.root, "workspace/M07/exports/phase2.tgz.sha256");
    expect(fs.statSync(archive).size).toBeGreaterThan(0);
    expect(fs.readFileSync(checksum, "utf8")).toContain("phase2.tgz");
    const extractRoot = path.join(fixture.root, "extracted");
    fs.mkdirSync(extractRoot);
    const extract = spawnSync("tar", ["-xzf", archive, "-C", extractRoot], {
      cwd: fixture.root,
      encoding: "utf8",
    });
    expect(extract.status, extract.stderr).toBe(0);
    for (const file of fixture.files) {
      expect(fs.readFileSync(path.join(extractRoot, file), "utf8")).toBe(
        fs.readFileSync(path.join(fixture.root, file), "utf8"),
      );
    }
  });

  linuxIt("保全先を所有者のみに制限し、既存の広い権限も修正する", () => {
    const fixture = makeFixture();
    const exportsDir = path.join(fixture.root, "workspace/M07/exports");
    fs.chmodSync(exportsDir, 0o755);
    const run = runGuard(fixture);
    expect(run.status, run.stderr + run.stdout).toBe(0);
    expect(fs.statSync(exportsDir).mode & 0o777).toBe(0o700);
    const archive = path.join(exportsDir, "phase2.tgz");
    const checksum = path.join(exportsDir, "phase2.tgz.sha256");
    expect(fs.statSync(archive).mode & 0o777).toBe(0o600);
    expect(fs.statSync(checksum).mode & 0o777).toBe(0o600);
    expect(initializeManifest).toContain("umask 077");
    expect(initializeManifest).toContain("chmod 700 workspace/M07/exports");
  });

  linuxIt("ダウンロードしたコピーを原本なしで検証・復元できる", () => {
    expect(restoreDownloaded).toBeTruthy();
    const fixture = makeFixture();
    const archive = runGuard(fixture);
    expect(archive.status, archive.stderr + archive.stdout).toBe(0);
    const { home, local } = makeDownloadedCopy(fixture);
    fs.rmSync(path.join(fixture.root, "workspace/M07/exports/phase2.tgz"));
    fs.rmSync(path.join(fixture.root, "workspace/M07/exports/phase2.tgz.sha256"));
    const restored = runDownloadedRestore(home);
    expect(restored.status, restored.stderr + restored.stdout).toBe(0);
    for (const file of fixture.files) {
      expect(fs.readFileSync(path.join(local, "restore-check", file), "utf8")).toBe(
        fs.readFileSync(path.join(fixture.root, file), "utf8"),
      );
    }
    expect(fs.statSync(path.join(local, "restore-check")).mode & 0o777).toBe(0o700);
    expect(backupSection).toContain("更新後の`phase2-handoff.md`も同じ非公開保管先へ");
    expect(backupSection).toContain("**別ファイルとして再ダウンロード**");
  });

  linuxIt("改変コピー・既存復元先・symlinkを拒否し、既存内容を上書きしない", () => {
    expect(restoreDownloaded).toBeTruthy();
    const fixture = makeFixture();
    expect(runGuard(fixture).status).toBe(0);
    const { home, local } = makeDownloadedCopy(fixture);
    const downloadedArchive = path.join(local, "phase2.tgz");
    fs.appendFileSync(downloadedArchive, "corruption");
    let result = runDownloadedRestore(home);
    expect(result.status).not.toBe(0);
    expect(fs.existsSync(path.join(local, "restore-check"))).toBe(false);
    const originalArchive = path.join(fixture.root, "workspace/M07/exports/phase2.tgz");
    fs.copyFileSync(originalArchive, downloadedArchive);

    const existing = path.join(local, "restore-check");
    fs.mkdirSync(existing);
    fs.writeFileSync(path.join(existing, "keep.txt"), "keep");
    result = runDownloadedRestore(home);
    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(path.join(existing, "keep.txt"), "utf8")).toBe("keep");
    fs.rmSync(existing, { recursive: true });
    fs.symlinkSync(path.join(fixture.root, "workspace/M06"), existing, "dir");
    result = runDownloadedRestore(home);
    expect(result.status).not.toBe(0);
  });

  linuxIt("Run証拠を追記した既存の保全リストを初期化で上書きしない", () => {
    expect(initializeManifest).toBeTruthy();
    const fixture = makeFixture();
    const manifestFile = path.join(fixture.root, fixture.manifest);
    const original = fs.readFileSync(manifestFile, "utf8");
    const appended = original + "workspace/M05/evidence/run-unique/trace.zip\n";
    fs.writeFileSync(manifestFile, appended);
    const alreadyExists = runManifestInitialization(fixture);
    expect(alreadyExists.status).not.toBe(0);
    expect(fs.readFileSync(manifestFile, "utf8")).toBe(appended);

    fs.rmSync(manifestFile);
    const created = runManifestInitialization(fixture);
    expect(created.status, created.stderr + created.stdout).toBe(0);
    expect(fs.readFileSync(manifestFile, "utf8")).toContain("workspace/M07/phase2-handoff.md");
    const repeated = runManifestInitialization(fixture);
    expect(repeated.status).not.toBe(0);
  });

  linuxIt("既存アーカイブとチェックサムを上書きしない", () => {
    const fixture = makeFixture();
    const archive = writeFixtureFile(
      fixture.root,
      "workspace/M07/exports/phase2.tgz",
      "previous archive",
    );
    const checksum = writeFixtureFile(
      fixture.root,
      "workspace/M07/exports/phase2.tgz.sha256",
      "previous checksum",
    );

    const existingArchive = runGuard(fixture);
    expect(existingArchive.status).not.toBe(0);
    expect(existingArchive.stdout).toContain("上書きしません");
    expect(fs.readFileSync(archive, "utf8")).toBe("previous archive");
    expect(fs.readFileSync(checksum, "utf8")).toBe("previous checksum");

    fs.rmSync(archive);
    const existingChecksum = runGuard(fixture);
    expect(existingChecksum.status).not.toBe(0);
    expect(fs.existsSync(archive)).toBe(false);
    expect(fs.readFileSync(checksum, "utf8")).toBe("previous checksum");
  });

  it("M05 P03/P05の本人ファイルと直接Playwright証拠を保全対象として区別する", () => {
    expect(commandBlocks[0]).toContain("workspace/M05/p03-type-error.ts");
    expect(commandBlocks[0]).toContain("workspace/M05/p05-cart-locator.spec.ts");
    expect(backupSection).toContain(
      "workspace/M05/evidence/p05-direct-<実際の識別子>/spec-snapshot.ts",
    );
    expect(backupSection).toContain("`playwright-result.json`");
    expect(backupSection).toContain("console.log");
    expect(backupSection).toContain("直接実行のJSONを`course:run`のreceiptとして");
  });

  linuxIt("M05配下に見せかけた相対パス逸脱を拒否する", () => {
    const fixture = makeFixture();
    writeFixtureFile(fixture.root, "workspace/outside.txt");
    const run = runGuard(fixture, ["workspace/M05/../outside.txt"]);
    expect(run.status).not.toBe(0);
    expect(run.stdout).toMatch(/workspace外|相対移動/);
    const archive = path.join(fixture.root, "workspace/M07/exports/phase2.tgz");
    expect(fs.existsSync(archive)).toBe(false);
  });

  linuxIt("最終ファイルと親ディレクトリのsymlinkを拒否する", () => {
    const fixture = makeFixture();
    const secret = writeFixtureFile(fixture.root, "workspace/secret.txt");
    fs.symlinkSync(secret, path.join(fixture.root, "workspace/M05/secret.md"));
    let run = runGuard(fixture, ["workspace/M05/secret.md"]);
    expect(run.status).not.toBe(0);
    fs.symlinkSync(
      path.join(fixture.root, "workspace/M06"),
      path.join(fixture.root, "workspace/M05/bridge"),
      "dir",
    );
    run = runGuard(fixture, ["workspace/M05/bridge/new-case.spec.ts"]);
    expect(run.status).not.toBe(0);
  });

  linuxIt("生成アーカイブ自身の入力への混入を拒否する", () => {
    const fixture = makeFixture();
    const archive = writeFixtureFile(
      fixture.root,
      "workspace/M07/exports/phase2.tgz",
      "preexisting placeholder",
    );
    const run = runGuard(fixture, ["workspace/M07/exports/phase2.tgz"]);
    expect(run.status).not.toBe(0);
    expect(run.stdout).toContain("保全用ファイルを入力へ混ぜられません");
    expect(fs.readFileSync(archive, "utf8")).toBe("preexisting placeholder");
  });
});
