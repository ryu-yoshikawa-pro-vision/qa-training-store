import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync, gzipSync } from "node:zlib";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  exportLearnerWorkspace,
  restoreLearnerWorkspace,
} from "../../training/course-sync/learner-workspace-backup.mjs";
import { loadCourseManifest } from "../../scripts/training/ai-assisted-qa-course-core.mjs";

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), "learner-backup-contract-")));
const identity = {
  source_sha: "a".repeat(40),
  state_contract_revision: "ai-assisted-qa-course-v3",
};

function fixture(name = randomUUID()) {
  const root = path.join(tempRoot, name);
  const backupDirectory = path.join(tempRoot, "backups-" + randomUUID());
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(backupDirectory);
  write(root, ".course/distribution-manifest.json", JSON.stringify(identity));
  return { root, backup: path.join(backupDirectory, "learner.json.gz") };
}

function write(root, relative, content) {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  return destination;
}

function snapshot(root, relative) {
  return fs.readFileSync(path.join(root, relative));
}

afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

describe("Git-free Phase 1/2 learner backup", () => {
  it("packages the standalone CLI and its learner instructions from the pinned manifest", () => {
    const manifest = loadCourseManifest(process.cwd());
    expect(manifest.local_files).toContainEqual({
      source_path: "training/course-sync/learner-workspace-backup.mjs",
      target_path: "scripts/training/learner-workspace-backup.mjs",
      module_id: null,
      role: "runtime",
    });
    expect(manifest.local_files).toContainEqual({
      source_path: "training/course-sync/learner-workspace-backup.md",
      target_path: "course/learner-workspace-backup.md",
      module_id: null,
      role: "guide",
    });
  });

  it("exports and restores all Phase 1/2 learner, run, trace, receipt and private assessment files without Git", () => {
    const first = fixture();
    const trace = Buffer.from([0, 1, 2, 0, 255, 7]);
    const paths = [
      ["workspace/M00/submission.md", "# My test design\n"],
      ["workspace/M03/feature.spec.ts", "test('case', () => {});\n"],
      ["workspace/M05/learner.config.ts", "export const timeout = 30;\n"],
      ["workspace/M05/evidence/runs/" + randomUUID() + "/trace.zip", trace],
      ["workspace/M06/evidence/runs/" + randomUUID() + "/run.json", '{"status":"passed"}'],
      ["workspace/M07/notes.md", "# Review\n"],
      [
        "workspace/.course-assessments/P1/attempts/" + randomUUID() + "/result.json",
        '{"status":"blocked"}',
      ],
      [
        "workspace/.course-assessments/P2/attempts/" + randomUUID() + "/result.json",
        '{"status":"assessed"}',
      ],
      [".course-load/M00-2026-11-05.json", '{"module_id":"M00"}'],
    ];
    for (const [relative, bytes] of paths) write(first.root, relative, bytes);
    write(first.root, "workspace/M00/.env.local", "API_KEY=not-to-export");
    write(first.root, "workspace/M00/.envrc", "export MY_TOKEN=not-to-export");
    write(first.root, "workspace/M00/.env_backup", "not-to-export");
    write(first.root, "workspace/M05/credentials.txt", "not-to-export");
    write(first.root, "workspace/M08/submission.md", "not-Phase-1-2");
    write(first.root, "output/training/ai-assisted-qa/results.json", "excluded-output");

    const result = exportLearnerWorkspace({ root: first.root, target: first.backup });
    expect(result).toMatchObject({
      status: "exported",
      files: paths.length,
      excluded: 4,
      excluded_paths: [
        "workspace/M00/.env.local",
        "workspace/M00/.env_backup",
        "workspace/M00/.envrc",
        "workspace/M05/credentials.txt",
      ],
      source_sha: identity.source_sha,
    });
    expect(fs.statSync(first.backup).size).toBeGreaterThan(0);
    const archive = JSON.parse(gunzipSync(fs.readFileSync(first.backup)).toString("utf8"));
    expect(archive.files.map((file) => file.path).sort()).toEqual(
      paths.map(([relative]) => relative).sort(),
    );
    expect(archive.files.some((file) => file.path.includes(".env"))).toBe(false);
    const second = fixture();
    const restored = restoreLearnerWorkspace({ root: second.root, source: first.backup });
    expect(restored).toMatchObject({
      status: "restored",
      files_verified: paths.length,
      newly_restored: paths.length,
      existing_files_overwritten: 0,
      git_required: false,
    });
    for (const [relative] of paths) {
      expect(snapshot(second.root, relative)).toEqual(snapshot(first.root, relative));
    }
    expect(fs.existsSync(path.join(second.root, "workspace/M08/submission.md"))).toBe(false);
    expect(fs.existsSync(path.join(second.root, "workspace/M00/.env.local"))).toBe(false);
    expect(
      restoreLearnerWorkspace({ root: second.root, source: first.backup }).newly_restored,
    ).toBe(0);
    const before = fs.readFileSync(first.backup);
    expect(() => exportLearnerWorkspace({ root: first.root, target: first.backup })).toThrow(
      /already exists/,
    );
    expect(fs.readFileSync(first.backup)).toEqual(before);
  });

  it("accepts relative learner roots without rejecting existing manifest or files", () => {
    const first = fixture();
    write(first.root, "workspace/M00/submission.md", "relative root test\n");
    const exportResult = exportLearnerWorkspace({
      root: path.relative(process.cwd(), first.root),
      target: first.backup,
    });
    expect(exportResult.files).toBe(1);

    const second = fixture();
    const restored = restoreLearnerWorkspace({
      root: path.relative(process.cwd(), second.root),
      source: first.backup,
    });
    expect(restored.newly_restored).toBe(1);
    expect(snapshot(second.root, "workspace/M00/submission.md").toString("utf8")).toBe(
      "relative root test\n",
    );
  });

  it("refuses a source swapped to a symlink between lstat and no-follow open", () => {
    const first = fixture();
    const file = write(first.root, "workspace/M00/submission.md", "normal content\n");
    const outside = write(first.root, "sensitive.txt", "DO NOT BACK UP\n");
    const open = fs.openSync.bind(fs);
    let swapped = false;
    const spy = vi.spyOn(fs, "openSync").mockImplementation((location, ...args) => {
      if (!swapped && location === file) {
        swapped = true;
        fs.renameSync(file, file + ".original");
        fs.symlinkSync(outside, file);
      }
      return open(location, ...args);
    });
    try {
      expect(() => exportLearnerWorkspace({ root: first.root, target: first.backup })).toThrow(
        /ELOOP|symlink|no-follow|link/i,
      );
      expect(swapped).toBe(true);
      expect(fs.existsSync(first.backup)).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it("refuses an existing restore file swapped to a symlink before its no-follow read", () => {
    const first = fixture();
    write(first.root, "workspace/M00/submission.md", "answer\n");
    exportLearnerWorkspace({ root: first.root, target: first.backup });
    const second = fixture();
    const target = write(second.root, "workspace/M00/submission.md", "answer\n");
    const outside = write(second.root, "outside.md", "answer\n");
    const open = fs.openSync.bind(fs);
    let swapped = false;
    const spy = vi.spyOn(fs, "openSync").mockImplementation((location, ...args) => {
      if (!swapped && location === target) {
        swapped = true;
        fs.renameSync(target, target + ".original");
        fs.symlinkSync(outside, target);
      }
      return open(location, ...args);
    });
    try {
      expect(() => restoreLearnerWorkspace({ root: second.root, source: first.backup })).toThrow(
        /ELOOP|symlink|no-follow|link/i,
      );
      expect(swapped).toBe(true);
      expect(fs.readFileSync(outside, "utf8")).toBe("answer\n");
    } finally {
      spy.mockRestore();
    }
  });

  it("refuses a backup archive swapped to a symlink before its no-follow read", () => {
    const first = fixture();
    write(first.root, "workspace/M01/submission.md", "answer\n");
    exportLearnerWorkspace({ root: first.root, target: first.backup });
    const second = fixture();
    const outside = path.join(tempRoot, randomUUID() + ".json.gz");
    fs.copyFileSync(first.backup, outside);
    const open = fs.openSync.bind(fs);
    let swapped = false;
    const spy = vi.spyOn(fs, "openSync").mockImplementation((location, ...args) => {
      if (!swapped && location === first.backup) {
        swapped = true;
        fs.renameSync(first.backup, first.backup + ".original");
        fs.symlinkSync(outside, first.backup);
      }
      return open(location, ...args);
    });
    try {
      expect(() => restoreLearnerWorkspace({ root: second.root, source: first.backup })).toThrow(
        /ELOOP|symlink|no-follow|link/i,
      );
      expect(swapped).toBe(true);
      expect(fs.existsSync(path.join(second.root, "workspace/M01/submission.md"))).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it("blocks wrong source SHA or revision before any restore writes", () => {
    const first = fixture();
    write(first.root, "workspace/M00/submission.md", "answer\n");
    exportLearnerWorkspace({ root: first.root, target: first.backup });
    const second = fixture();
    write(
      second.root,
      ".course/distribution-manifest.json",
      JSON.stringify({ ...identity, source_sha: "b".repeat(40) }),
    );
    expect(() => restoreLearnerWorkspace({ root: second.root, source: first.backup })).toThrow(
      /mismatch/,
    );
    expect(fs.existsSync(path.join(second.root, "workspace/M00"))).toBe(false);
  });

  it("blocks modified content, traversal paths and duplicate archive entries", () => {
    const first = fixture();
    write(first.root, "workspace/M00/submission.md", "answer\n");
    exportLearnerWorkspace({ root: first.root, target: first.backup });
    const original = JSON.parse(gunzipSync(fs.readFileSync(first.backup)).toString("utf8"));
    for (const transform of [
      (value) => {
        value.files[0].data = Buffer.from("forged").toString("base64");
      },
      (value) => {
        value.files[0].path = "workspace/M00/../../.env";
      },
      (value) => {
        value.files[0].path = "workspace/M00/.envrc";
      },
      (value) => {
        value.files[0].path = "workspace/M00/.netrc";
      },
      (value) => {
        value.files.push({ ...value.files[0] });
        value.total_bytes *= 2;
      },
    ]) {
      const tampered = structuredClone(original);
      transform(tampered);
      const archive = path.join(tempRoot, randomUUID() + ".json.gz");
      fs.writeFileSync(archive, gzipSync(JSON.stringify(tampered)));
      const second = fixture();
      expect(() => restoreLearnerWorkspace({ root: second.root, source: archive })).toThrow();
      expect(fs.existsSync(path.join(second.root, "workspace/M00/submission.md"))).toBe(false);
    }
  });

  it("rejects an in-repo backup destination through a symlinked source ancestor", () => {
    const first = fixture();
    const alias = path.join(tempRoot, "root-alias-" + randomUUID());
    fs.symlinkSync(tempRoot, alias, "dir");
    const aliasedRoot = path.join(alias, path.basename(first.root));
    const destination = path.join(first.root, "inside-backup.json.gz");
    expect(() => exportLearnerWorkspace({ root: aliasedRoot, target: destination })).toThrow(
      /outside the learner repository/,
    );
    expect(fs.existsSync(destination)).toBe(false);
  });

  it("rejects source symlinks, backup destinations inside the repo, and unsafe output ancestors", () => {
    const first = fixture();
    const target = write(first.root, "workspace/M01/submission.md", "answer\n");
    fs.unlinkSync(target);
    fs.symlinkSync("missing-answer.md", target);
    expect(() => exportLearnerWorkspace({ root: first.root, target: first.backup })).toThrow(
      /symlink/,
    );
    expect(fs.existsSync(first.backup)).toBe(false);
    fs.unlinkSync(target);
    write(first.root, "workspace/M01/submission.md", "answer\n");
    expect(() =>
      exportLearnerWorkspace({
        root: first.root,
        target: path.join(first.root, "workspace/backup.json.gz"),
      }),
    ).toThrow(/outside/);
    const linked = path.join(tempRoot, "linked-" + randomUUID());
    fs.symlinkSync(path.dirname(first.backup), linked, "dir");
    expect(() =>
      exportLearnerWorkspace({ root: first.root, target: path.join(linked, "backup.json.gz") }),
    ).toThrow(/symlink/);
  });

  it("refuses to change existing learner data when restore has a collision", () => {
    const first = fixture();
    write(first.root, "workspace/M00/submission.md", "answer-a\n");
    write(first.root, "workspace/M05/evidence/run.json", '{"status":"passed"}');
    exportLearnerWorkspace({ root: first.root, target: first.backup });
    const second = fixture();
    write(second.root, "workspace/M00/submission.md", "answer-b\n");
    const before = snapshot(second.root, "workspace/M00/submission.md");
    expect(() => restoreLearnerWorkspace({ root: second.root, source: first.backup })).toThrow(
      /conflict/,
    );
    expect(snapshot(second.root, "workspace/M00/submission.md")).toEqual(before);
    expect(fs.existsSync(path.join(second.root, "workspace/M05"))).toBe(false);
  });

  it("excludes hidden credential stores even when files have no text extension", () => {
    const first = fixture();
    write(first.root, "workspace/M00/notes.md", "safe learner notes");
    write(first.root, "workspace/M00/.netrc", "machine example.invalid login sample password example");
    write(first.root, "workspace/M00/.pypirc", "[pypi]\\npassword = sample");
    write(first.root, "workspace/M00/.aws/config", "[default]\\nregion = example");
    write(first.root, "workspace/M00/.kube/config", "clusters: []");
    const result = exportLearnerWorkspace({ root: first.root, target: first.backup });
    expect(result).toMatchObject({
      files: 1,
      excluded: 4,
      excluded_paths: [
        "workspace/M00/.aws",
        "workspace/M00/.kube",
        "workspace/M00/.netrc",
        "workspace/M00/.pypirc",
      ],
    });
    const archive = JSON.parse(gunzipSync(fs.readFileSync(first.backup)).toString("utf8"));
    expect(archive.files.map((entry) => entry.path)).toEqual(["workspace/M00/notes.md"]);
  });

  it("blocks known credentials and personal email contents before export", () => {
    for (const text of ["OPENROUTER_API_KEY=" + "A".repeat(24), "recipient: learner@gmail.com"]) {
      const first = fixture();
      write(first.root, "workspace/M00/submission.md", text);
      expect(() => exportLearnerWorkspace({ root: first.root, target: first.backup })).toThrow(
        /Secret|personal email/,
      );
      expect(fs.existsSync(first.backup)).toBe(false);
    }
  });

  it("refuses a symlinked restore target without modifying a learner file", () => {
    const first = fixture();
    write(first.root, "workspace/M01/submission.md", "answer\n");
    exportLearnerWorkspace({ root: first.root, target: first.backup });
    const second = fixture();
    const outside = write(second.root, "original.md", "leave unchanged\n");
    const target = path.join(second.root, "workspace/M01/submission.md");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(outside, target);
    expect(() => restoreLearnerWorkspace({ root: second.root, source: first.backup })).toThrow(
      /symlink/,
    );
    expect(fs.readFileSync(outside, "utf8")).toBe("leave unchanged\n");
  });

  it("runs the distributed standalone CLI without Git or the shared router", () => {
    const first = fixture();
    write(first.root, "workspace/M02/plan.md", "learner plan\n");
    const scriptSource = path.join(
      process.cwd(),
      "training/course-sync/learner-workspace-backup.mjs",
    );
    const script = write(first.root, "scripts/training/learner-workspace-backup.mjs", "");
    fs.copyFileSync(scriptSource, script);
    const corePath = path.resolve("scripts/training/ai-assisted-qa-assessment-core.mjs");
    fs.copyFileSync(
      corePath,
      write(first.root, "scripts/training/ai-assisted-qa-assessment-core.mjs", ""),
    );
    const exported = spawnSync(process.execPath, [script, "export", "--target", first.backup], {
      cwd: first.root,
      encoding: "utf8",
    });
    expect(exported.status, exported.stderr).toBe(0);
    expect(JSON.parse(exported.stdout).excluded_paths).toEqual([]);
    const second = fixture();
    const secondScript = write(second.root, "scripts/training/learner-workspace-backup.mjs", "");
    fs.copyFileSync(scriptSource, secondScript);
    fs.copyFileSync(
      corePath,
      write(second.root, "scripts/training/ai-assisted-qa-assessment-core.mjs", ""),
    );
    const restored = spawnSync(
      process.execPath,
      [secondScript, "restore", "--source", first.backup],
      { cwd: second.root, encoding: "utf8" },
    );
    expect(restored.status, restored.stderr).toBe(0);
    expect(snapshot(second.root, "workspace/M02/plan.md").toString("utf8")).toBe("learner plan\n");
  });
});
