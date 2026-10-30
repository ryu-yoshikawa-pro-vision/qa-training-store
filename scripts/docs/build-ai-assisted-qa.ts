import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  MARKDOWN_CSS,
  escapeHtml,
  isExternalLink,
  parseMarkdownFile,
  renderMarkdown,
  type ParsedMarkdown,
} from "../spec/markdown";
import { validateAiAssistedQa } from "../training/validate-ai-assisted-qa";

const COURSE_ROOT = "docs/curriculum/ai-assisted-qa";
const MODULE_ROOT = `${COURSE_ROOT}/modules`;
const QUIZ_ROOT = `${COURSE_ROOT}/quizzes`;
const COURSE_ENTRY = `${COURSE_ROOT}/start-here.md`;
const COURSE_URL = "/docs/curriculum/ai-assisted-qa";
const SOURCE_REPOSITORY_URL = "https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob";
const SPEC_ROOT = "docs/spec";
const LEARNING_MAP_PATH = "docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md";
const TRAINING_ROOT = "training/ai-assisted-qa-course";
const MODULE_IDS = Array.from({ length: 11 }, (_, index) => `M${String(index).padStart(2, "0")}`);
const EXPECTED_OBJECTIVE_COUNTS = [4, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5];
const COURSE_ASSETS = new Set([
  `${COURSE_ROOT}/assets/m00-agent-boundary.png`,
  `${COURSE_ROOT}/assets/m01-expected-observed.png`,
  `${COURSE_ROOT}/assets/m05-test-execution-flow.png`,
]);

type NavigationItem = { label: string; canonicalPath: string; href: string };
type NavigationGroup = { label: string; items: NavigationItem[] };
type CourseBuildResult = { coursePages: number; exercisePages: number; quizPages: number };

function sourceUrlForBuild(rootDir: string): string {
  // Pull-request jobs may check out an ephemeral merge commit. Prefer the PR
  // head commit so review links remain usable after the next PR update.
  let sha: string | undefined;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    const event = JSON.parse(fs.readFileSync(eventPath, "utf8")) as {
      pull_request?: { head?: { sha?: string } };
    };
    sha = event.pull_request?.head?.sha;
  }
  sha ??= execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("教材の配布元commit SHAを確定できません");
  return `${SOURCE_REPOSITORY_URL}/${sha}`;
}

function listMarkdown(rootDir: string): string[] {
  const courseAbsolute = path.join(rootDir, ...COURSE_ROOT.split("/"));
  const result: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        path.relative(courseAbsolute, absolute).split(path.sep).join("/") !== "README.md"
      ) {
        result.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
      }
    }
  };
  if (fs.existsSync(courseAbsolute)) visit(courseAbsolute);
  return result.sort((left, right) => left.localeCompare(right));
}

function resolveRepositoryPath(rootDir: string, fromPath: string, target: string): string {
  const root = path.resolve(rootDir);
  const absolute = path.resolve(root, path.dirname(fromPath), target);
  const relative = path.relative(root, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`新課程のリンクがリポジトリ外へ移動しています: ${target}`);
  }
  if (!fs.existsSync(absolute)) throw new Error(`新課程のリンク先がありません: ${target}`);
  const realRoot = fs.realpathSync(root);
  const realTarget = fs.realpathSync(absolute);
  const realRelative = path.relative(realRoot, realTarget);
  if (realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error(`新課程のリンクがsymlink経由でリポジトリ外へ移動しています: ${target}`);
  }
  return relative.split(path.sep).join("/");
}

function courseOutputPath(relativePath: string): string {
  if (relativePath === COURSE_ENTRY) return "index.html";
  const moduleReadme = new RegExp(`^${MODULE_ROOT}/(M(?:0[0-9]|10))/README\\.md$`).exec(relativePath);
  if (moduleReadme?.[1] !== undefined) return `modules/${moduleReadme[1]}/index.html`;
  return relativePath.replace(`${COURSE_ROOT}/`, "").replace(/\.md$/i, ".html");
}

function courseUrlForMarkdown(relativePath: string): string {
  if (relativePath === COURSE_ENTRY) return `${COURSE_URL}/`;
  const moduleReadme = new RegExp(`^${MODULE_ROOT}/(M(?:0[0-9]|10))/README\\.md$`).exec(relativePath);
  if (moduleReadme?.[1] !== undefined) return `${COURSE_URL}/modules/${moduleReadme[1]}/`;
  return `${COURSE_URL}/${courseOutputPath(relativePath)}`;
}

function isPublicLearnerResource(relativePath: string): boolean {
  return (
    /^training\/ai-assisted-qa-course\/(?:exercises|inputs)\/M(?:0[0-9]|10)\/.+/.test(relativePath) ||
    /^training\/ai-assisted-qa-course\/assessment\/phase-[1-3]-rubric\.md$/.test(relativePath) ||
    relativePath === `${TRAINING_ROOT}/integrations/M02-M03-contract.md` ||
    relativePath === `${TRAINING_ROOT}/templates/phase3/course-e2e.workflow.yml.disabled`
  );
}

export function isPublicCourseAsset(relativePath: string): boolean {
  return (
    COURSE_ASSETS.has(relativePath) ||
    /^docs\/curriculum\/ai-assisted-qa\/assets\/figures\/M(?:0[0-9]|10)\/[a-z0-9-]+\.svg$/.test(relativePath)
  );
}

function resourceUrl(relativePath: string): string {
  return `${COURSE_URL}/resources/${relativePath}`;
}

function exercisePageUrl(moduleId: string): string {
  return `${COURSE_URL}/modules/${moduleId}/exercise.html`;
}

function resolveCourseLink(rootDir: string, fromPath: string, target: string, sourceUrl: string): string {
  if (isExternalLink(target)) return target;
  const [filePart = "", fragment] = target.split("#", 2);
  if (filePart === "") return fragment === undefined ? "" : `#${fragment}`;
  const resolved = resolveRepositoryPath(rootDir, fromPath, filePart);
  let href: string;
  if (resolved === COURSE_ENTRY) {
    href = `${COURSE_URL}/`;
  } else if (resolved.startsWith(`${MODULE_ROOT}/`) && resolved.endsWith("/README.md")) {
    const moduleId = resolved.slice(MODULE_ROOT.length + 1, -"/README.md".length);
    href = `${COURSE_URL}/modules/${moduleId}/`;
  } else if (resolved.startsWith(`${QUIZ_ROOT}/`) && /^M(?:0[0-9]|10)\.json$/.test(path.posix.basename(resolved))) {
    href = `${COURSE_URL}/quizzes/${path.posix.basename(resolved, ".json")}.html`;
  } else if (resolved.startsWith(`${COURSE_ROOT}/`) && resolved.endsWith(".md")) {
    href = courseUrlForMarkdown(resolved);
  } else if (resolved === `${SPEC_ROOT}/README.md`) {
    href = "/docs/spec/";
  } else if (resolved.startsWith(`${SPEC_ROOT}/`) && resolved.endsWith(".md")) {
    href = `/docs/spec/${resolved.slice(`${SPEC_ROOT}/`.length).replace(/\.md$/i, ".html")}`;
  } else if (resolved === LEARNING_MAP_PATH) {
    href = `${COURSE_URL}/objectives.html`;
  } else if (resolved.startsWith(`${COURSE_ROOT}/assets/`)) {
    if (!isPublicCourseAsset(resolved)) throw new Error(`公開対象外の教材画像です: ${resolved}`);
    href = `${COURSE_URL}/${resolved.slice(`${COURSE_ROOT}/`.length)}`;
  } else if (
    new RegExp(`^${TRAINING_ROOT}/exercises/M(?:0[0-9]|10)/exercise\\.md$`).test(resolved)
  ) {
    const moduleId = path.posix.basename(path.posix.dirname(resolved));
    href = exercisePageUrl(moduleId);
  } else if (resolved.startsWith(`${TRAINING_ROOT}/`)) {
    if (!isPublicLearnerResource(resolved)) throw new Error(`受講者へ公開しない教材資料へのリンクです: ${resolved}`);
    href = resourceUrl(resolved);
  } else {
    href = `${sourceUrl}/${resolved}`;
  }
  return fragment === undefined ? href : `${href}#${fragment}`;
}

function extractNavigation(rootDir: string, startPage: ParsedMarkdown, sourceUrl: string): NavigationGroup[] {
  const sectionStart = startPage.lines.findIndex((line) => line.trim() === "## フェーズと教材");
  if (sectionStart < 0) throw new Error(`${COURSE_ENTRY}に ## フェーズと教材 がありません`);
  const groups: NavigationGroup[] = [];
  let current: NavigationGroup | undefined;
  for (let index = sectionStart + 1; index < startPage.lines.length; index += 1) {
    const line = startPage.lines[index] ?? "";
    const trimmed = line.trim();
    if (/^##\s+/.test(trimmed)) break;
    const heading = /^###\s+(.+?)\s*$/.exec(trimmed);
    if (heading?.[1] !== undefined) {
      current = { label: heading[1], items: [] };
      groups.push(current);
      continue;
    }
    if (current === undefined) continue;
    const link = /^\d+\.\s+\[([^\]]+)\]\(([^)]+)\)\s*$/.exec(trimmed);
    if (link?.[1] === undefined || link[2] === undefined) continue;
    current.items.push({
      label: link[1],
      canonicalPath: resolveRepositoryPath(rootDir, COURSE_ENTRY, link[2]),
      href: resolveCourseLink(rootDir, COURSE_ENTRY, link[2], sourceUrl),
    });
  }
  if (groups.every((group) => group.items.length === 0)) {
    throw new Error(`${COURSE_ENTRY}の## フェーズと教材に公開モジュールへのリンクがありません`);
  }
  return groups;
}

function renderNavigation(navigation: NavigationGroup[], currentPath?: string): string {
  return `<ul>${navigation
    .map(
      (group) =>
        `<li class="primary-navigation-group"><strong>${escapeHtml(group.label)}</strong><ul>${group.items
          .map((item) => {
            const current = item.canonicalPath === currentPath ? ' aria-current="page"' : "";
            return `<li><a href="${escapeHtml(item.href)}"${current}>${escapeHtml(item.label)}</a></li>`;
          })
          .join("")}</ul></li>`,
    )
    .join("")}</ul>`;
}

function currentModuleId(relativePath: string): string | undefined {
  const match = new RegExp(`^${MODULE_ROOT}/(M(?:0[0-9]|10))/README\\.md$`).exec(relativePath);
  return match?.[1];
}

function moduleProgressHtml(moduleId: string, navigation: NavigationGroup[]): string {
  const items = navigation.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.canonicalPath === `${MODULE_ROOT}/${moduleId}/README.md`);
  const group = navigation.find((candidate) => candidate.items.some((item) => item.canonicalPath.endsWith(`/${moduleId}/README.md`)));
  if (index < 0 || group === undefined) throw new Error(`教材ナビゲーションに${moduleId}がありません`);
  return `<p class="module-progress">全${items.length}モジュール中 ${index + 1}番目 · ${escapeHtml(group.label)} · ${moduleId}</p>`;
}

function moduleTabsHtml(
  moduleId: string,
  currentPage: "lesson" | "exercise" | "quiz",
): string {
  const pages = [
    { id: "lesson", title: "テキスト", href: `${COURSE_URL}/modules/${moduleId}/` },
    { id: "exercise", title: "演習", href: exercisePageUrl(moduleId) },
    { id: "quiz", title: "クイズ", href: `${COURSE_URL}/quizzes/${moduleId}.html` },
  ];
  const links = pages
    .map((page) => {
      const active = page.id === currentPage ? ' aria-current="page"' : "";
      return `<a href="${escapeHtml(page.href)}"${active}>${page.title}</a>`;
    })
    .join("");
  return `<nav class="module-sections" aria-label="${moduleId}の学習ページ">${links}</nav>`;
}

function modulePagerHtml(
  moduleId: string,
  navigation: NavigationGroup[],
  currentPage: "lesson" | "exercise" | "quiz",
): string {
  const items = navigation.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.canonicalPath === `${MODULE_ROOT}/${moduleId}/README.md`);
  if (index < 0) throw new Error(`教材ナビゲーションに${moduleId}がありません`);
  const previous = items[index - 1];
  const next = items[index + 1];
  const itemLink = (item: NavigationItem | undefined, label: string, relation: string): string =>
    item === undefined
      ? `<span class="pager-edge" aria-disabled="true">${label}</span>`
      : `<a rel="${relation}" href="${escapeHtml(item.href)}">${label} · ${escapeHtml(item.label.slice(0, 3))}</a>`;
  const currentLabel =
    currentPage === "lesson" ? "テキスト" : currentPage === "exercise" ? "演習" : "クイズ";
  const nextStep =
    currentPage === "lesson"
      ? `<a href="${escapeHtml(exercisePageUrl(moduleId))}">次は演習へ</a>`
      : currentPage === "exercise"
        ? `<a href="${COURSE_URL}/quizzes/${moduleId}.html">次はクイズへ</a>`
        : next === undefined
          ? ""
          : `<a href="${escapeHtml(next.href)}">次のテキストへ</a>`;
  return `<nav class="module-pager" aria-label="モジュール間の移動">${itemLink(previous, "前の教材", "prev")}<span aria-current="page">${currentLabel} · ${moduleId}</span>${itemLink(next, "次の教材", "next")}${nextStep}</nav>`;
}
function injectIntoDocumentBody(markup: string, additions: string): string {
  const closingIndex = markup.lastIndexOf("</div>");
  if (closingIndex < 0) throw new Error("教材本文の表示領域を見つけられません");
  return `${markup.slice(0, closingIndex)}${additions}${markup.slice(closingIndex)}`;
}

function learnerResourceLabel(relativePath: string): string {
  const basename = path.posix.basename(relativePath);
  const knownLabels: Record<string, string> = {
    "exercise.md": "演習手順",
    "start.md": "演習開始ガイド",
    "submission-template.md": "提出テンプレート",
    "public-risk-input.csv": "公開リスク入力例",
    "new-case.spec.ts": "新しいケースの開始spec",
    "maintenance.spec.ts": "保守演習の開始spec",
    "workflow-starter.yml.disabled": "無効化されたworkflowの練習用ひな形",
  };
  if (knownLabels[basename] !== undefined) return knownLabels[basename];
  return basename.replaceAll("-", " ");
}

function collectPublicLearnerResources(rootDir: string): string[] {
  const resources = new Set<string>();
  const walk = (relativeDirectory: string): void => {
    const absoluteDirectory = path.join(rootDir, ...relativeDirectory.split("/"));
    if (!fs.existsSync(absoluteDirectory)) throw new Error(`公開教材資料がありません: ${relativeDirectory}`);
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) walk(relativePath);
      else if (entry.isFile() && isPublicLearnerResource(relativePath)) resources.add(relativePath);
    }
  };
  for (const moduleId of MODULE_IDS) {
    walk(`${TRAINING_ROOT}/exercises/${moduleId}`);
    walk(`${TRAINING_ROOT}/inputs/${moduleId}`);
  }
  for (const phase of [1, 2, 3]) resources.add(`${TRAINING_ROOT}/assessment/phase-${phase}-rubric.md`);
  resources.add(`${TRAINING_ROOT}/integrations/M02-M03-contract.md`);
  resources.add(`${TRAINING_ROOT}/templates/phase3/course-e2e.workflow.yml.disabled`);
  for (const resource of resources) {
    const absolutePath = path.join(rootDir, ...resource.split("/"));
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) throw new Error(`公開教材資料がありません: ${resource}`);
  }
  return [...resources].sort((left, right) => left.localeCompare(right));
}

function copyPublicResources(rootDir: string, outputRoot: string, resources: string[]): void {
  for (const relativePath of resources) {
    if (!isPublicLearnerResource(relativePath)) throw new Error(`許可リスト外の教材資料です: ${relativePath}`);
    const source = path.join(rootDir, ...relativePath.split("/"));
    const output = path.join(outputRoot, "resources", ...relativePath.split("/"));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(source, output);
  }
}

function copyPublicCourseAssets(rootDir: string, outputRoot: string): void {
  const figureRoot = path.join(rootDir, ...`${COURSE_ROOT}/assets/figures`.split("/"));
  const figureFiles: string[] = [];
  const walk = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) figureFiles.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
    }
  };
  walk(figureRoot);
  for (const relativePath of [...COURSE_ASSETS, ...figureFiles]) {
    if (!isPublicCourseAsset(relativePath)) throw new Error(`許可リスト外の教材画像です: ${relativePath}`);
    const source = path.join(rootDir, ...relativePath.split("/"));
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`教材画像がありません: ${relativePath}`);
    const output = path.join(outputRoot, ...relativePath.slice(`${COURSE_ROOT}/`.length).split("/"));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(source, output);
  }
}

type LearningObjective = { id: string; moduleId: string; summary: string; level: string };

function loadPublicLearningObjectives(rootDir: string): LearningObjective[] {
  const source = fs.readFileSync(path.join(rootDir, ...LEARNING_MAP_PATH.split("/")), "utf8");
  const rows: LearningObjective[] = [];
  let moduleId: string | undefined;
  for (const line of source.split(/\r?\n/)) {
    const moduleHeading = /^##\s+(M(?:0[0-9]|10))\s+/.exec(line);
    if (moduleHeading?.[1] !== undefined) {
      moduleId = moduleHeading[1];
      continue;
    }
    if (/^##\s+/.test(line)) {
      moduleId = undefined;
      continue;
    }
    if (moduleId === undefined || !/^\|\s*M(?:0[0-9]|10)-\d{2}\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const id = cells[0];
    const summary = cells[1]?.replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();
    const level = cells[2]?.replace(/\*\*/g, "").replace(/`/g, "").trim();
    if (id === undefined || summary === undefined || level === undefined) throw new Error(`学習項目の列が不足しています: ${line}`);
    rows.push({ id, moduleId, summary, level });
  }
  const counts = MODULE_IDS.map((id) => rows.filter((row) => row.moduleId === id).length);
  if (rows.length < 51 || counts.some((count, index) => count < (EXPECTED_OBJECTIVE_COUNTS[index] ?? 0))) {
    throw new Error(`公開学習項目が既存基準を下回っています。現在: ${rows.length}件 (${counts.join(", ")})`);
  }
  if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error("公開学習項目IDが重複しています");
  return rows;
}

const OBJECTIVE_MAP_CSS = "\n.knowledge-list{margin:.7rem 0 1.25rem;padding-left:1.1rem}.knowledge-list li{margin:.7rem 0;padding:.7rem .85rem;border:1px solid #cbd5e1;border-radius:.5rem;list-style:none}.knowledge-list p{margin:.35rem 0}.knowledge-self-check{font:inherit;font-size:.85rem;cursor:pointer;padding:.35rem .6rem;border:1px solid #526b85;border-radius:.4rem;background:transparent;color:inherit}.knowledge-self-check[aria-pressed=\"true\"]{border-color:#167446}.knowledge-links a{margin-right:.85rem}.knowledge-summary{color:#445469;font-size:.85rem}.objective-module details{margin-top:.5rem}.objective-module summary{cursor:pointer;font-weight:600}.knowledge-status{display:block;margin:.4rem 0;font-size:.85rem}@media(max-width:36rem){.knowledge-list{padding-left:0}.knowledge-list li{padding:.6rem}.knowledge-self-check{max-width:100%;white-space:normal}}\n";
const OBJECTIVE_MAP_JS = "(()=>{\nconst model=JSON.parse(document.getElementById(\"knowledge-map-data\").textContent);\nconst byId=new Map(model.nodes.map(node=>[node.id,node]));\nconst statusMessage=document.getElementById(\"knowledge-storage-status\");\nconst getSaved=(key)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch{return null;}};\nconst refresh=(button)=>{\n  const node=byId.get(button.dataset.knowledgeId);\n  if(!node)return;\n  const entry=getSaved(\"ai-assisted-qa-knowledge:\"+node.id);\n  const current=entry&&entry.revision===node.revision&&entry.checked===true;\n  const stale=entry&&entry.revision!==node.revision;\n  button.setAttribute(\"aria-pressed\",current?\"true\":\"false\");\n  button.textContent=current?\"本人確認済み（正式評価ではありません）\":stale?\"定義が変更されました：再確認\":\"本人確認：未確認\";\n};\nfor(const button of document.querySelectorAll(\"button[data-knowledge-id]\")){\n  refresh(button);\n  button.addEventListener(\"click\",()=>{\n    const node=byId.get(button.dataset.knowledgeId);\n    if(!node)return;\n    const current=getSaved(\"ai-assisted-qa-knowledge:\"+node.id);\n    const checked=!(current&&current.revision===node.revision&&current.checked===true);\n    try{localStorage.setItem(\"ai-assisted-qa-knowledge:\"+node.id,JSON.stringify({revision:node.revision,checked,updated_at:new Date().toISOString()}));statusMessage.textContent=\"本人の確認状況をこのブラウザに保存しました。正式評価には影響しません。\";refresh(button);}\n    catch{statusMessage.textContent=\"このブラウザでは学習状況を保存できません。設定と空き容量を確認してください。\";}\n  });\n}\nconst scores=new Map();\nfor(const quiz of model.quizzes){\n const stored=getSaved(\"ai-assisted-qa-knowledge-quiz:\"+quiz.module);\n if(!stored||stored.revision!==quiz.revision||!stored.results)continue;\n for(const [id,value] of Object.entries(stored.results)){\n   if(!value||!Number.isInteger(value.correct)||!Number.isInteger(value.total)||value.correct<0||value.correct>value.total)continue;\n   const previous=scores.get(id)||{correct:0,total:0};\n   scores.set(id,{correct:previous.correct+value.correct,total:previous.total+value.total});\n }\n}\nfor(const node of model.nodes){\n for(const label of document.querySelectorAll('[data-knowledge-quiz=\"'+node.id+'\"]')){\n   const score=scores.get(node.id);\n   label.textContent=score?\"このブラウザのクイズ確認：\"+score.correct+\" / \"+score.total+\"問正解\":\"クイズ結果：未確認\";\n }\n}\n})();";

function renderObjectiveMap(
  rootDir: string,
  navigation: NavigationGroup[],
  objectives: LearningObjective[],
): string {
  const graph = JSON.parse(
    fs.readFileSync(path.join(rootDir, ...`${COURSE_ROOT}/knowledge-graph.json`.split("/")), "utf8"),
  ) as {
    nodes: { id: string; type: string; module?: string; title: string; can_do?: string; review_path?: string }[];
    edges: { from: string; relation: string; to: string }[];
  };
  const knowledgeById = new Map(graph.nodes.filter((node) => node.type === "knowledge").map((node) => [node.id, node]));
  const knowledgeByObjective = new Map<string, string[]>();
  for (const edge of graph.edges.filter((edge) => edge.relation === "requires_knowledge")) {
    knowledgeByObjective.set(edge.from, [...(knowledgeByObjective.get(edge.from) ?? []), edge.to]);
  }
  const questionIndex = new Map<string, { id: string; module: string }[]>();
  const quizData = MODULE_IDS.map((module) => {
    const quizPath = path.join(rootDir, ...`${QUIZ_ROOT}/${module}.json`.split("/"));
    const bytes = fs.readFileSync(quizPath);
    const quiz = JSON.parse(bytes.toString("utf8")) as { questions: { id: string; knowledge_ids: string[] }[] };
    for (const question of quiz.questions) {
      for (const id of question.knowledge_ids) questionIndex.set(id, [...(questionIndex.get(id) ?? []), { id: question.id, module }]);
    }
    return { module, revision: createHash("sha256").update(bytes).digest("hex") };
  });
  const publicNodes = [...knowledgeById.values()].map((node) => ({ id: node.id, revision: createHash("sha256").update([node.id, node.title, node.can_do ?? ""].join("|")).digest("hex") }));
  const knowledgeData = JSON.stringify({ nodes: publicNodes, quizzes: quizData }).replace(/</g, "\\u003c");
  const titles = new Map(navigation.flatMap((group) => group.items.map((item) => [item.label.slice(0, 3), item.label] as const)));
  const groups = navigation
    .map((phase) => {
      const moduleSections = phase.items
        .map((item) => {
          const moduleId = item.label.slice(0, 3);
          const rows = objectives.filter((objective) => objective.moduleId === moduleId);
          return `<section class="objective-module" id="${moduleId}"><h3><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></h3><ol>${rows
            .map((objective) => {
              const nodes = (knowledgeByObjective.get(objective.id) ?? []).map((id) => knowledgeById.get(id)).filter((node) => node !== undefined);
              const details = nodes.map((node) => {
                const id = escapeHtml(node.id);
                const revision = publicNodes.find((candidate) => candidate.id === node.id)?.revision ?? "";
                const fragment = node.review_path?.split("#")[1];
                const lessonHref = `${COURSE_URL}/modules/${moduleId}/${fragment ? `#${encodeURIComponent(fragment)}` : ""}`;
                const quizLinks = (questionIndex.get(node.id) ?? []).map((question) => `<a href="${COURSE_URL}/quizzes/${question.module}.html">${escapeHtml(question.id)}の確認クイズ</a>`).join("");
                return `<li data-knowledge-node="${id}"><strong>${id}：${escapeHtml(node.title)}</strong><p>${escapeHtml(node.can_do ?? "")}</p><p class="knowledge-links"><a href="${escapeHtml(lessonHref)}">教材と復習先</a><a href="${COURSE_URL}/resources/training/ai-assisted-qa-course/exercises/${moduleId}/exercise.md">演習手順</a>${quizLinks}</p><small class="knowledge-status" data-knowledge-quiz="${id}">クイズ結果：未確認</small><button type="button" class="knowledge-self-check" data-knowledge-id="${id}" data-revision="${revision}" aria-pressed="false">本人確認：未確認</button></li>`;
              }).join("");
              return `<li data-objective-id="${escapeHtml(objective.id)}"><strong>${escapeHtml(objective.id)} · ${escapeHtml(objective.level)}</strong><p>${escapeHtml(objective.summary)}</p><details><summary>理解ノード（${nodes.length}件）</summary><ul class="knowledge-list">${details}</ul></details></li>`;
            })
            .join("")}</ol></section>`;
        })
        .join("");
      return `<section><h2>${escapeHtml(phase.label)}</h2>${moduleSections}</section>`;
    })
    .join("");
  const toc = `<nav class="toc" aria-label="学習項目の目次" tabindex="0"><strong>モジュール</strong><ul>${MODULE_IDS
    .map((moduleId) => `<li><a href="#${moduleId}">${escapeHtml(titles.get(moduleId) ?? moduleId)}</a></li>`)
    .join("")}</ul></nav>`;
  const body = `<div class="document-body"><h1>${objectives.length}件の学習項目マップ</h1><p>各目標を理解ノードへ分けて、説明・練習・確認状況をモジュール別に確認できます。項目を読んだことやクイズの得点だけで技能の修了とはなりません。本文の例、演習、Phase評価基準で、説明・操作・別条件への適用を確認してください。</p>${groups}</div>`;
  const navigationHtml = renderNavigation(navigation);
  const pageNavigation = `<nav class="primary-navigation" aria-label="新カリキュラム" tabindex="0">${navigationHtml}<p><a href="${COURSE_URL}/objectives.html" aria-current="page">51件の学習項目マップ</a></p></nav>`;
  const mobileNavigation = `<details class="mobile-primary-navigation"><summary>新カリキュラムのモジュール</summary><nav aria-label="新カリキュラム">${navigationHtml}<p><a href="${COURSE_URL}/objectives.html" aria-current="page">51件の学習項目マップ</a></p></nav></details>`;
  const absolutePath = path.join(rootDir, ...LEARNING_MAP_PATH.split("/"));
  const revision = createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="course-source-revision" content="${revision}"><title>${objectives.length}件の学習項目マップ — AI協働テスト自動化カリキュラム</title><style>${MARKDOWN_CSS}${OBJECTIVE_MAP_CSS}</style></head><body data-course-revision="${revision}"><header><div class="brand"><a href="${COURSE_URL}/">AI協働テスト自動化カリキュラム</a> · <a href="${COURSE_URL}/objectives.html" aria-current="page">学習項目マップ</a> · <a href="/docs/curriculum/">旧カリキュラム</a></div></header><main>${pageNavigation}${mobileNavigation}<article>${toc}${body}</article></main><p id="knowledge-storage-status" role="status" aria-live="polite"></p><script id="knowledge-map-data" type="application/json">${knowledgeData}</script><script>${OBJECTIVE_MAP_JS}</script></body></html>\n`;
}

function renderCoursePage(
  rootDir: string,
  parsed: ParsedMarkdown,
  navigation: NavigationGroup[],
  sourceUrl: string,
  publicResources: string[],
  pageKind: "lesson" | "exercise" = "lesson",
): string {
  const title = parsed.headings.find((heading) => heading.level === 1)?.text;
  if (title === undefined) throw new Error(`新課程MarkdownにH1がありません: ${parsed.relativePath}`);
  const linkTarget = (target: string): string => resolveCourseLink(rootDir, parsed.relativePath, target, sourceUrl);
  const imageTarget = (target: string): string => resolveCourseLink(rootDir, parsed.relativePath, target, sourceUrl);
  const sourcePath = path.join(rootDir, ...parsed.relativePath.split("/"));
  const revision = createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
  const moduleId =
    pageKind === "exercise"
      ? new RegExp(`^${TRAINING_ROOT}/exercises/(M(?:0[0-9]|10))/exercise\\.md$`).exec(
          parsed.relativePath,
        )?.[1]
      : currentModuleId(parsed.relativePath);
  if (pageKind === "exercise" && moduleId === undefined)
    throw new Error(`演習ページの正本が不正です: ${parsed.relativePath}`);
  let resourcesHtml = "";
  if (moduleId !== undefined && /^M(?:0[0-9]|10)$/.test(moduleId)) {
    const phase = Number(moduleId.slice(1)) <= 4 ? 1 : Number(moduleId.slice(1)) <= 7 ? 2 : 3;
    const moduleResources = publicResources.filter((relativePath) =>
      relativePath.startsWith(`${TRAINING_ROOT}/exercises/${moduleId}/`) ||
      relativePath.startsWith(`${TRAINING_ROOT}/inputs/${moduleId}/`),
    );
    const rubricPath = `${TRAINING_ROOT}/assessment/phase-${phase}-rubric.md`;
    const links = moduleResources.map((relativePath) => {
      const relativeLabel = relativePath.slice(`${TRAINING_ROOT}/`.length);
      const href =
        relativePath === `${TRAINING_ROOT}/exercises/${moduleId}/exercise.md`
          ? exercisePageUrl(moduleId)
          : resourceUrl(relativePath);
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(learnerResourceLabel(relativePath))}</a><small>${escapeHtml(relativeLabel)}</small></li>`;
    });
    links.push(`<li><a href="${escapeHtml(resourceUrl(rubricPath))}">Phase ${phase}の評価基準</a></li>`);
    if (moduleId === "M03") {
      const integrationPath = `${TRAINING_ROOT}/integrations/M02-M03-contract.md`;
      links.push(`<li><a href="${escapeHtml(resourceUrl(integrationPath))}">M02からM03へ引き継ぐ資料</a></li>`);
    }
    links.push(`<li><a href="${COURSE_URL}/quizzes/${moduleId}.html">確認クイズ</a></li>`);
    links.push(`<li><a href="${COURSE_URL}/objectives.html">51件の学習項目マップ</a></li>`);
    resourcesHtml = `<section class="course-resources" aria-label="演習・評価資料へのリンク"><h2>このモジュールの資料</h2><p>資料は教材と同じ配布版です。実技は個人用Codespaceで行います。評価基準は到達を確認する観点を示し、クイズの得点だけで修了を決めません。</p><ul>${links.join("")}</ul></section>`;
  }
  const currentPath = moduleId === undefined ? parsed.relativePath : `${MODULE_ROOT}/${moduleId}/README.md`;
  const navigationHtml = renderNavigation(navigation, currentPath);
  const pageNavigation = `<nav class="primary-navigation" aria-label="新カリキュラム" tabindex="0">${navigationHtml}<p><a href="${COURSE_URL}/objectives.html">51件の学習項目マップ</a></p></nav>`;
  const mobileNavigation = `<details class="mobile-primary-navigation"><summary>新カリキュラムのモジュール</summary><nav aria-label="新カリキュラム">${navigationHtml}<p><a href="${COURSE_URL}/objectives.html">51件の学習項目マップ</a></p></nav></details>`;
  const pageAdditions = [
    resourcesHtml,
    moduleId === undefined ? "" : modulePagerHtml(moduleId, navigation, pageKind),
  ].join("");
  const content = injectIntoDocumentBody(renderMarkdown(parsed, linkTarget, imageTarget), pageAdditions);
  const body =
    moduleId === undefined
      ? content
      : content.replace('<div class="document-body">', () => {
          const learnerNote =
            pageKind === "lesson"
              ? `<p class="module-guide">本文の練習と解説は理解を深めるための例です。実施・提出する課題の手順、P01〜P06と証拠の条件は<a href="${escapeHtml(exercisePageUrl(moduleId))}">${moduleId}の演習ページ</a>で確認してください。</p>`
              : "";
          return `<div class="document-body">${moduleProgressHtml(moduleId, navigation)}${moduleTabsHtml(moduleId, pageKind)}${learnerNote}`;
        });
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="course-source-revision" content="${revision}"><title>${escapeHtml(title)} — AI協働テスト自動化カリキュラム</title><style>${MARKDOWN_CSS}${MODULE_TABS_CSS}</style></head><body data-course-revision="${revision}"><header><div class="brand"><a href="${COURSE_URL}/">AI協働テスト自動化カリキュラム</a> · <a href="${COURSE_URL}/objectives.html">学習項目マップ</a> · <a href="/docs/curriculum/">旧カリキュラム</a></div></header><main>${pageNavigation}${mobileNavigation}<article>${body}</article></main></body></html>\n`;
}

function quizHtml(
  moduleId: string,
  title: string,
  questionCount: number,
  revision: string,
  navigation: NavigationGroup[],
): string {
  const escapedModuleId = escapeHtml(moduleId);
  const escapedTitle = escapeHtml(title);
  const escapedRevision = escapeHtml(revision);
  const modulePath = `${MODULE_ROOT}/${moduleId}/README.md`;
  const navigationHtml = renderNavigation(navigation, modulePath);
  const pageNavigation = `<nav class="primary-navigation" aria-label="新カリキュラム" tabindex="0">${navigationHtml}<p><a href="${COURSE_URL}/objectives.html">51件の学習項目マップ</a></p></nav>`;
  const mobileNavigation = `<details class="mobile-primary-navigation"><summary>新カリキュラムのモジュール</summary><nav aria-label="新カリキュラム">${navigationHtml}<p><a href="${COURSE_URL}/objectives.html">51件の学習項目マップ</a></p></nav></details>`;
  const progress = moduleProgressHtml(moduleId, navigation);
  const pager = modulePagerHtml(moduleId, navigation, "quiz");
  const contentsNavigation = `<nav class="toc" aria-label="このページの項目" tabindex="0"><strong>このページ</strong><ul><li><a href="#start-title">取り組み方</a></li><li><a href="#question-title">問題に回答</a></li><li><a href="#result-title">結果と復習</a></li><li><a href="${COURSE_URL}/modules/${escapedModuleId}/">教材本文</a></li><li><a href="${COURSE_URL}/objectives.html">学習項目マップ</a></li></ul></nav>`;
  const documentBody = `<div class="document-body">${progress}${moduleTabsHtml(moduleId, "quiz")}<h1>${escapedModuleId}の確認クイズ</h1><p>${escapedTitle}</p><p>全${questionCount}問です。各問で最も適切な答えを1つ選び、「次へ」で進みます。前の問題に戻って回答を見直せます。全問に回答すると、正誤・選択肢ごとの理由・教材の復習先が表示されます。</p><p id="storage-message" role="status" aria-live="polite"></p><div id="quiz-error" role="alert" hidden></div><section id="start-panel" aria-labelledby="start-title"><h2 id="start-title">取り組み方</h2><p>まず本文の例を思い出し、選択肢を比べてください。途中でページを閉じても、同じブラウザーで同じ教材版を開けば回答を再開できます。</p><button id="start-button" type="button">回答を始める</button><button id="resume-button" type="button" hidden>続きから再開</button><button id="restart-start-button" type="button" hidden>最初からやり直す</button></section><section id="question-panel" aria-labelledby="question-title" hidden><p id="progress" role="status" aria-live="polite"></p><form id="answer-form"><fieldset><legend id="question-title"></legend><div id="choices"></div></fieldset><p id="answer-error" role="alert" hidden>回答を1つ選んでから進んでください。</p><div class="quiz-controls"><button id="previous-button" type="button">前へ</button><button id="next-button" type="button">次へ</button><button id="finish-button" type="button" disabled>結果を確認</button></div></form></section><section id="result-panel" aria-labelledby="result-title" hidden><h2 id="result-title">結果</h2><p id="score" role="status" aria-live="polite"></p><div id="results"></div><p>クイズの得点だけで正式な修了を判定しません。間違えた項目は教材を読み直し、別条件の演習でも説明できるか確かめてください。</p><button id="retry-button" type="button">このクイズを最初からやり直す</button></section>${pager}</div>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="quiz-revision" content="${escapedRevision}"><title>${escapedModuleId}の確認クイズ — AI協働テスト自動化カリキュラム</title><link rel="stylesheet" href="quiz.css"><script src="quiz.js" defer></script></head><body data-module-id="${escapedModuleId}" data-quiz-file="${escapedModuleId}.json" data-revision="${escapedRevision}"><header><div class="brand"><a href="${COURSE_URL}/">AI協働テスト自動化カリキュラム</a> · <a href="${COURSE_URL}/objectives.html">学習項目マップ</a> · <a href="/docs/curriculum/">旧カリキュラム</a></div></header><main>${pageNavigation}${mobileNavigation}<article>${contentsNavigation}${documentBody}</article></main></body></html>\n`;
}

const MODULE_TABS_CSS = `
.module-sections{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 1.5rem;padding:.5rem;border:1px solid #cbd5e1;border-radius:.75rem;background:#f4f7fb}
.module-sections a{display:inline-block;padding:.55rem 1rem;border-radius:.45rem;text-decoration:none;color:#233b58;font-weight:600}
.module-sections a[aria-current="page"]{color:#fff;background:#1a527f}
.module-sections a:focus-visible{outline:3px solid #1266c5;outline-offset:2px}
`;

const QUIZ_CSS = `:root{font-family:system-ui,sans-serif}button{font:inherit;padding:.6rem 1rem;margin:.35rem 0;cursor:pointer;border:1px solid #53657a;border-radius:.35rem;background:#fff;color:#182230}button:disabled{cursor:not-allowed;opacity:.55}:focus-visible{outline:3px solid #1266c5;outline-offset:3px}fieldset{border:1px solid #9aaabd;border-radius:.5rem;padding:1rem;margin:1rem 0}legend{font-weight:700;padding:0 .25rem}.answer-option{display:flex;gap:.7rem;align-items:flex-start;padding:.7rem;border-radius:.35rem}.answer-option input{margin-top:.4rem}.quiz-controls{display:flex;gap:.6rem;flex-wrap:wrap}#quiz-error,#answer-error{padding:.7rem;background:#fff0ed;border-left:4px solid #a32112;color:#65170f}.result-question{padding:1rem 0;border-top:1px solid #ccd4df}.result-option{margin:.6rem 0;padding:.6rem;background:#fff;border-radius:.35rem}.correct-answer{border-left:4px solid #167446}.wrong-answer{border-left:4px solid #a32112}code{overflow-wrap:anywhere}small{color:#445469}@media(max-width:36rem){button{width:100%}}`;

const QUIZ_JS = `(async()=>{
  const body=document.body;
  const moduleId=body.dataset.moduleId;
  const quizFile=body.dataset.quizFile;
  const revision=body.dataset.revision;
  const storageKey="ai-assisted-qa-quiz:"+moduleId;
  const byId=(id)=>document.getElementById(id);
  const startPanel=byId("start-panel"),questionPanel=byId("question-panel"),resultPanel=byId("result-panel");
  const errorBox=byId("quiz-error"),storageMessage=byId("storage-message");
  let quiz, state={answers:{},currentIndex:0,resultStatus:"in_progress"},storageAvailable=true;
  const setText=(node,value)=>{node.textContent=value;};
  const showError=(message)=>{setText(errorBox,message);errorBox.hidden=false;};
  const clearError=()=>{errorBox.hidden=true;errorBox.textContent="";};
  const allAnswered=()=>quiz.questions.every((question)=>["A","B","C","D"].includes(state.answers[question.id]));
  const saveState=()=>{if(!storageAvailable)return;try{localStorage.setItem(storageKey,JSON.stringify({revision,answers:state.answers,currentIndex:state.currentIndex,resultStatus:state.resultStatus}));}catch{storageAvailable=false;setText(storageMessage,"このブラウザでは回答を保存できません。ページを閉じると回答を再開できない場合があります。");}};
  const setPanel=(name)=>{startPanel.hidden=name!=="start";questionPanel.hidden=name!=="question";resultPanel.hidden=name!=="result";};
  const safeHref=(reference)=>{
    if(reference.startsWith("https://"))return reference;
    const parts=reference.split("#"),file=parts[0],fragment=parts.length>1?"#"+parts.slice(1).join("#"):"";
    if(file==="docs/curriculum/ai-assisted-qa/start-here.md")return "/docs/curriculum/ai-assisted-qa/"+fragment;
    const moduleMatch=/^docs\\/curriculum\\/ai-assisted-qa\\/modules\\/(M(?:0[0-9]|10))\\/README\\.md$/.exec(file);
    if(moduleMatch)return "/docs/curriculum/ai-assisted-qa/modules/"+moduleMatch[1]+"/"+fragment;
    if(file==="docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md")return "/docs/curriculum/ai-assisted-qa/objectives.html"+fragment;
    if(file.startsWith("training/ai-assisted-qa-course/")){
      const exerciseMatch=/^training\\/ai-assisted-qa-course\\/exercises\\/(M(?:0[0-9]|10))\\/exercise\\.md$/.exec(file);
      if(exerciseMatch)return "/docs/curriculum/ai-assisted-qa/modules/"+exerciseMatch[1]+"/exercise.html"+fragment;
      const learnerResource=/^training\\/ai-assisted-qa-course\\/(?:exercises|inputs)\\/M(?:0[0-9]|10)\\/.+/.test(file)||/^training\\/ai-assisted-qa-course\\/assessment\\/phase-[1-3]-rubric\\.md$/.test(file)||file==="training/ai-assisted-qa-course/integrations/M02-M03-contract.md";
      return learnerResource?"/docs/curriculum/ai-assisted-qa/resources/"+file+fragment:"#";
    }
    if(file==="docs/spec/README.md")return "/docs/spec/"+fragment;
    if(file.startsWith("docs/spec/")&&file.endsWith(".md"))return "/docs/spec/"+file.slice("docs/spec/".length).replace(/\\.md$/i,".html")+fragment;
    return "__COURSE_SOURCE_URL__/"+file+fragment;
  };
  const validQuestion=(question)=>{
    if(!question||typeof question!=="object"||typeof question.id!=="string"||!new RegExp("^"+moduleId+"-Q[0-9]{2}$").test(question.id))return false;
    if(typeof question.question!=="string"||!question.question.trim()||!Array.isArray(question.objective_ids)||question.objective_ids.length===0||question.objective_ids.some((id)=>typeof id!=="string"||!id.startsWith(moduleId+"-"))||!Array.isArray(question.knowledge_ids)||question.knowledge_ids.length===0||question.knowledge_ids.some((id)=>typeof id!=="string"||!id.startsWith("K-"+moduleId+"-")))return false;
    if(!Array.isArray(question.options)||question.options.length!==4)return false;
    const values=question.options.map((option)=>option&&option.value);
    if(["A","B","C","D"].some((value)=>values.filter((candidate)=>candidate===value).length!==1))return false;
    if(question.options.some((option)=>!option||[option.label,option.meaning,option.reason].some((value)=>typeof value!=="string"||!value.trim())))return false;
    if(!["A","B","C","D"].includes(question.correct_value))return false;
    if(!Array.isArray(question.source_refs)||question.source_refs.length===0||question.source_refs.some((reference)=>typeof reference!=="string"||!reference.trim()))return false;
    if(typeof question.review_path!=="string"||!new RegExp("^docs/curriculum/ai-assisted-qa/modules/"+moduleId+"/README\\.md(?:#.+)?$").test(question.review_path))return false;
    return true;
  };
  const renderQuestion=()=>{
    clearError();
    const question=quiz.questions[state.currentIndex];
    setText(byId("progress"),"第"+(state.currentIndex+1)+"問 / 全"+quiz.questions.length+"問");
    setText(byId("question-title"),question.question);
    const choices=byId("choices");choices.replaceChildren();
    for(const option of question.options){
      const label=document.createElement("label");label.className="answer-option";
      const input=document.createElement("input");input.type="radio";input.name="answer";input.value=option.value;input.checked=state.answers[question.id]===option.value;
      input.addEventListener("change",()=>{state.answers[question.id]=option.value;byId("answer-error").hidden=true;byId("finish-button").disabled=!allAnswered();saveState();});
      const text=document.createElement("span");text.textContent=option.label;label.append(input,text);choices.append(label);
    }
    byId("previous-button").disabled=state.currentIndex===0;
    const isLast=state.currentIndex===quiz.questions.length-1;
    byId("next-button").hidden=isLast;byId("finish-button").hidden=!isLast;
    byId("finish-button").disabled=!allAnswered();
    setPanel("question");
  };
  const renderResults=()=>{
    const results=byId("results");results.replaceChildren();let score=0;const knowledgeScores={};
    for(const question of quiz.questions){
      const selected=state.answers[question.id],correct=selected===question.correct_value;if(correct)score++;
      for(const id of question.knowledge_ids){const entry=knowledgeScores[id]||{correct:0,total:0};entry.total++;if(correct)entry.correct++;knowledgeScores[id]=entry;}
      const section=document.createElement("section");section.className="result-question";
      const title=document.createElement("h3");setText(title,question.id+" · "+(correct?"正解":"不正解"));section.append(title);
      const prompt=document.createElement("p");setText(prompt,question.question);section.append(prompt);
      const selectedLine=document.createElement("p");setText(selectedLine,"あなたの回答: "+selected+" / 正答: "+question.correct_value);section.append(selectedLine);
      for(const option of question.options){
        const item=document.createElement("div");item.className="result-option"+(option.value===question.correct_value?" correct-answer":"")+(option.value===selected&&!correct?" wrong-answer":"");
        const label=document.createElement("strong");setText(label,option.value+" · "+option.label);item.append(label);
        const meaning=document.createElement("p");setText(meaning,"意味: "+option.meaning);item.append(meaning);
        const reason=document.createElement("p");setText(reason,"この条件での理由: "+option.reason);item.append(reason);section.append(item);
      }
      const objectives=document.createElement("p");setText(objectives,"学習項目: "+question.objective_ids.join(", ")+" / 理解ノード: "+question.knowledge_ids.join(", "));section.append(objectives);
      const sourceLine=document.createElement("p");setText(sourceLine,"根拠: ");
      for(const reference of question.source_refs){const link=document.createElement("a");link.href=safeHref(reference);link.textContent=reference;sourceLine.append(link,document.createTextNode(" "));}section.append(sourceLine);
      const review=document.createElement("p");const reviewLink=document.createElement("a");reviewLink.href=safeHref(question.review_path);reviewLink.textContent="教材の復習先";review.append(reviewLink);section.append(review);
      results.append(section);
    }
    if(storageAvailable){try{localStorage.setItem("ai-assisted-qa-knowledge-quiz:"+moduleId,JSON.stringify({revision,results:knowledgeScores}));}catch{storageAvailable=false;}}
    const percentage=Math.round(score/quiz.questions.length*100);
    setText(byId("score"),score+" / "+quiz.questions.length+"問正解（"+percentage+"%）");setPanel("result");
  };
  const begin=()=>{state.resultStatus="in_progress";saveState();renderQuestion();};
  try{
    const response=await fetch(quizFile);
    if(!response.ok)throw new Error("クイズデータを読み込めませんでした。ページを再読み込みしてください。");
    quiz=await response.json();
    if(quiz.schema_version!==1||quiz.module_id!==moduleId||!Array.isArray(quiz.questions)||quiz.questions.length===0||quiz.questions.some((question)=>!validQuestion(question))||new Set(quiz.questions.map((question)=>question.id)).size!==quiz.questions.length)throw new Error("クイズデータの形式が正しくありません。");
    for(const question of quiz.questions){if(!Array.isArray(question.options)||question.options.length!==4||!question.options.some((option)=>option.value===question.correct_value))throw new Error("問題または選択肢に不整合があります。");}
    let saved=null;try{const raw=localStorage.getItem(storageKey);if(raw)saved=JSON.parse(raw);}catch{storageAvailable=false;}
    if(saved&&saved.revision!==revision){try{const archiveKey="ai-assisted-qa-quiz-history:"+moduleId;const history=JSON.parse(localStorage.getItem(archiveKey)||"[]");if(Array.isArray(history)){history.push(saved);localStorage.setItem(archiveKey,JSON.stringify(history));}localStorage.removeItem(storageKey);}catch{}saved=null;setText(storageMessage,"クイズの版が更新されました。旧版の履歴は同じブラウザ内に保存し、新しい版で確認してください。");}
    const questionIds=new Set(quiz.questions.map((question)=>question.id));
    const savedAnswersValid=saved?.answers&&typeof saved.answers==="object"&&Object.entries(saved.answers).every(([id,value])=>questionIds.has(id)&&["A","B","C","D"].includes(value));
    if(saved&&saved.revision===revision&&savedAnswersValid&&Number.isInteger(saved.currentIndex)&&["in_progress","completed"].includes(saved.resultStatus)){
      state={answers:saved.answers,currentIndex:Math.min(Math.max(saved.currentIndex,0),quiz.questions.length-1),resultStatus:saved.resultStatus};
      if(state.resultStatus==="completed"&&allAnswered()){renderResults();return;}
      byId("start-button").hidden=true;byId("resume-button").hidden=false;byId("restart-start-button").hidden=false;
      setText(byId("resume-button"),"続きから再開（第"+(state.currentIndex+1)+"問）");
    }
    if(!storageAvailable)setText(storageMessage,"このブラウザでは再開用の保存ができません。回答・結果は表示できますが、ページを閉じると回答は保持されません。");
    byId("start-button").addEventListener("click",begin);
    byId("resume-button").addEventListener("click",renderQuestion);
    byId("restart-start-button").addEventListener("click",()=>{state={answers:{},currentIndex:0,resultStatus:"in_progress"};begin();});
    byId("previous-button").addEventListener("click",()=>{if(state.currentIndex>0){state.currentIndex--;saveState();renderQuestion();}});
    byId("next-button").addEventListener("click",()=>{const question=quiz.questions[state.currentIndex];if(!state.answers[question.id]){byId("answer-error").hidden=false;byId("choices").querySelector("input")?.focus();return;}state.currentIndex++;saveState();renderQuestion();});
    byId("finish-button").addEventListener("click",()=>{if(!allAnswered()){byId("answer-error").hidden=false;return;}state.resultStatus="completed";saveState();try{const archiveKey="ai-assisted-qa-quiz-history:"+moduleId;const history=JSON.parse(localStorage.getItem(archiveKey)||"[]");if(Array.isArray(history)){history.push({revision,answers:{...state.answers},resultStatus:"completed",completed_at:new Date().toISOString()});localStorage.setItem(archiveKey,JSON.stringify(history));}}catch{}renderResults();});
    byId("retry-button").addEventListener("click",()=>{state={answers:{},currentIndex:0,resultStatus:"in_progress"};try{localStorage.removeItem(storageKey);}catch{}byId("start-button").hidden=false;byId("resume-button").hidden=true;byId("restart-start-button").hidden=true;setPanel("start");byId("start-button").focus();});
  }catch(error){showError(error instanceof Error?error.message:"クイズを表示できませんでした。");startPanel.hidden=true;questionPanel.hidden=true;resultPanel.hidden=true;}
})();`;

export function buildAiAssistedQaSite(rootDir = process.cwd(), outputDir = path.join(rootDir, "dist", "docs")): CourseBuildResult {
  const validation = validateAiAssistedQa(rootDir);
  const markdownPaths = listMarkdown(rootDir);
  if (!markdownPaths.includes(COURSE_ENTRY)) throw new Error(`${COURSE_ENTRY}がありません`);
  const startPage = parseMarkdownFile(path.join(rootDir, ...COURSE_ENTRY.split("/")), COURSE_ENTRY);
  const sourceUrl = sourceUrlForBuild(rootDir);
  const navigation = extractNavigation(rootDir, startPage, sourceUrl);
  const publicResources = collectPublicLearnerResources(rootDir);
  const learningObjectives = loadPublicLearningObjectives(rootDir);
  const courseOutputRoot = path.join(outputDir, "curriculum", "ai-assisted-qa");
  copyPublicResources(rootDir, courseOutputRoot, publicResources);
  copyPublicCourseAssets(rootDir, courseOutputRoot);
  for (const relativePath of markdownPaths) {
    const parsed = parseMarkdownFile(path.join(rootDir, ...relativePath.split("/")), relativePath);
    const outputAbsolute = path.join(courseOutputRoot, courseOutputPath(relativePath));
    fs.mkdirSync(path.dirname(outputAbsolute), { recursive: true });
    fs.writeFileSync(outputAbsolute, renderCoursePage(rootDir, parsed, navigation, sourceUrl, publicResources), "utf8");
  }

  for (const moduleId of validation.modules) {
    const sourcePath = `${TRAINING_ROOT}/exercises/${moduleId}/exercise.md`;
    const parsed = parseMarkdownFile(
      path.join(rootDir, ...sourcePath.split("/")),
      sourcePath,
    );
    const target = path.join(courseOutputRoot, "modules", moduleId, "exercise.html");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(
      target,
      renderCoursePage(rootDir, parsed, navigation, sourceUrl, publicResources, "exercise"),
      "utf8",
    );
  }

  fs.writeFileSync(path.join(courseOutputRoot, "objectives.html"), renderObjectiveMap(rootDir, navigation, learningObjectives), "utf8");

  const quizOutput = path.join(courseOutputRoot, "quizzes");
  fs.mkdirSync(quizOutput, { recursive: true });
  const titles = new Map(
    navigation.flatMap((group) =>
      group.items.map((item) => [item.label.slice(0, 3), item.label] as const),
    ),
  );
  for (const moduleId of validation.modules) {
    const quizPath = path.join(rootDir, ...`${QUIZ_ROOT}/${moduleId}.json`.split("/"));
    const quizBytes = fs.readFileSync(quizPath);
    const quiz = JSON.parse(quizBytes.toString("utf8")) as QuizDocument;
    const revision = createHash("sha256").update(quizBytes).digest("hex");
    fs.writeFileSync(path.join(quizOutput, `${moduleId}.json`), quizBytes);
    fs.writeFileSync(
      path.join(quizOutput, `${moduleId}.html`),
      quizHtml(moduleId, titles.get(moduleId) ?? moduleId, quiz.questions.length, revision, navigation),
      "utf8",
    );
  }
  fs.writeFileSync(path.join(quizOutput, "quiz.css"), `${QUIZ_CSS}\n${MARKDOWN_CSS}\n${MODULE_TABS_CSS}\n`, "utf8");
  fs.writeFileSync(path.join(quizOutput, "quiz.js"), QUIZ_JS.replace("__COURSE_SOURCE_URL__", sourceUrl), "utf8");
  return {
    coursePages: markdownPaths.length,
    exercisePages: validation.modules.length,
    quizPages: validation.modules.length,
  };
}

type QuizDocument = { questions: unknown[] };
