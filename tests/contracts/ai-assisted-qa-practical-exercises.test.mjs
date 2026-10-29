import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const manifest = JSON.parse(read("training/course-sync/manifest.json"));
const modules = Array.from({ length: 11 }, (_, i) => `M${String(i).padStart(2, "0")}`);

describe("AI協働QAの反復実践と配布・提出契約", () => {
  it.each(modules)("%sの6課題が配布教材と提出テンプレートに揃っている", (moduleId) => {
    const basePath = `training/ai-assisted-qa-course/exercises/${moduleId}`;
    const exercisePath = `${basePath}/exercise.md`;
    const templatePath = `${basePath}/submission-template.md`;
    const exercise = read(exercisePath);
    const template = read(templatePath);
    const paths = new Set(manifest.local_files.map((entry) => entry.source_path));
    expect(paths.has(exercisePath)).toBe(true);
    expect(paths.has(templatePath)).toBe(true);
    for (let number = 1; number <= 6; number++) {
      const id = `P0${number}`;
      expect(exercise, `${moduleId}に${id}の手順が必要`).toContain(`**${id}`);
      expect(template, `${moduleId}に${id}の証拠欄が必要`).toContain(`| ${id} |`);
    }
    expect(template).toMatch(/未実行|未実施|未確認|未決/);
    const endState = JSON.parse(read(`training/ai-assisted-qa-course/states/${moduleId}/end.json`));
    expect(endState.expected.required_paths.length).toBeGreaterThan(0);
    expect(endState.expected.required_paths.some((p) => p.startsWith(`workspace/${moduleId}/`))).toBe(true);
  });
});
