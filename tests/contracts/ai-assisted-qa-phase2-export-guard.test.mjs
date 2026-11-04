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
const commandBlocks = [
  ...(backupSection ?? "").matchAll(
    new RegExp(fence + "bash\\n([\\s\\S]*?)\\n\\s*" + fence, "g"),
  ),
].map((match) => match[1].replace(/^ {3}/gm, ""));
const guardAndArchive = commandBlocks.find((block) =>
  block.includes("tar --create --gzip --file=workspace/M07/exports/phase2.tgz"),
);

const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function writeFixtureFile(root, relative, content = "dummy training evidence\n") {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
  return absolute;
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "course-phase2-export-"));
  temporaryDirectories.push(root);
  const files = [
    "workspace/M05/submission.md",
    "workspace/M06/new-case.spec.ts",
    "workspace/M07/diagnosis.md",
  ];
  for (const file of files) writeFixtureFile(root, file);
  const manifest = "workspace/M07/exports/phase2-files.txt";
  writeFixtureFile(root, manifest, files.join("\n") + "\n");
  return { root, files, manifest };
}

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

  linuxIt("M05配下に見せかけた相対パス逸脱を拒否する", () => {
    const fixture = makeFixture();
    writeFixtureFile(fixture.root, "workspace/outside.txt");
    const run = runGuard(fixture, ["workspace/M05/../outside.txt"]);
    expect(run.status).not.toBe(0);
    expect(run.stdout).toMatch(/workspace外|相対移動/);
    expect(fs.existsSync(path.join(fixture.root, "workspace/M07/exports/phase2.tgz"))).toBe(
      false,
    );
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
