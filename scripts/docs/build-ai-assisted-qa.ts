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

type NavigationItem = { label: string; canonicalPath: string; href: string };
type NavigationGroup = { label: string; items: NavigationItem[] };
type CourseBuildResult = { coursePages: number; quizPages: number };

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

function renderCoursePage(
  rootDir: string,
  parsed: ParsedMarkdown,
  navigation: NavigationGroup[],
  sourceUrl: string,
): string {
  const title = parsed.headings.find((heading) => heading.level === 1)?.text;
  if (title === undefined) throw new Error(`新課程MarkdownにH1がありません: ${parsed.relativePath}`);
  const navigationHtml = `<ul>${navigation
    .map(
      (group) =>
        `<li class="primary-navigation-group"><strong>${escapeHtml(group.label)}</strong><ul>${group.items
          .map((item) => {
            const current = item.canonicalPath === parsed.relativePath ? ' aria-current="page"' : "";
            return `<li><a href="${escapeHtml(item.href)}"${current}>${escapeHtml(item.label)}</a></li>`;
          })
          .join("")}</ul></li>`,
    )
    .join("")}</ul>`;
  const linkTarget = (target: string): string => resolveCourseLink(rootDir, parsed.relativePath, target, sourceUrl);
  const imageTarget = (target: string): string => resolveCourseLink(rootDir, parsed.relativePath, target, sourceUrl);
  const sourcePath = path.join(rootDir, ...parsed.relativePath.split("/"));
  const revision = createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
  const revisionHtml = `<p class="course-revision"><small>教材本文SHA-256: <code>${revision}</code></small></p>`;
  const moduleId = parsed.relativePath.startsWith(`${MODULE_ROOT}/`)
    && parsed.relativePath.endsWith("/README.md")
    ? parsed.relativePath.slice(MODULE_ROOT.length + 1, -"/README.md".length)
    : undefined;
  let resourcesHtml = "";
  if (moduleId !== undefined && /^M(?:0[0-9]|10)$/.test(moduleId)) {
    const phase = Number(moduleId.slice(1)) <= 4 ? 1 : Number(moduleId.slice(1)) <= 7 ? 2 : 3;
    const root = "training/ai-assisted-qa-course";
    const documents = [
      { label: "演習手順", path: `${root}/exercises/${moduleId}/exercise.md` },
      { label: "演習開始入力", path: `${root}/inputs/${moduleId}/start.md` },
      { label: "提出物テンプレート", path: `${root}/exercises/${moduleId}/submission-template.md` },
      { label: `Phase ${phase}の評価基準`, path: `${root}/assessment/phase-${phase}-rubric.md` },
    ];
    for (const document of documents) {
      if (!fs.existsSync(path.join(rootDir, ...document.path.split("/")))) {
        throw new Error(`教材の参照先がありません: ${document.path}`);
      }
    }
    const links = documents.map((document) =>
      `<li><a href="${escapeHtml(`${sourceUrl}/${document.path}`)}">${escapeHtml(document.label)}（同じ版のGitHubファイル）</a></li>`,
    );
    links.push(`<li><a href="${COURSE_URL}/quizzes/${moduleId}.html">確認クイズ</a></li>`);
    resourcesHtml = `<section aria-label="演習・評価資料へのリンク"><h2>演習・評価資料</h2><p>実技は個人用Codespaceで行います。GitHubリンクは、この教材の生成元commitに固定されています。</p><ul>${links.join("")}</ul></section>`;
  }
  const pageNavigation = `<nav class="primary-navigation" aria-label="新カリキュラム">${navigationHtml}</nav>`;
  const mobileNavigation = `<details class="mobile-primary-navigation"><summary>新カリキュラムのモジュール</summary><nav aria-label="新カリキュラム">${navigationHtml}</nav></details>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — AI協働テスト自動化カリキュラム</title><style>${MARKDOWN_CSS}</style></head><body><header><div class="brand"><a href="${COURSE_URL}/">AI協働テスト自動化カリキュラム</a> · <a href="/docs/curriculum/">旧カリキュラム</a></div></header><main>${pageNavigation}${mobileNavigation}<article>${renderMarkdown(parsed, linkTarget, imageTarget)}${resourcesHtml}${revisionHtml}</article></main></body></html>\n`;
}

function quizHtml(moduleId: string, title: string, questionCount: number, revision: string): string {
  const escapedModuleId = escapeHtml(moduleId);
  const escapedTitle = escapeHtml(title);
  const escapedRevision = escapeHtml(revision);
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="quiz-revision" content="${escapedRevision}"><title>${escapedModuleId}の確認クイズ — AI協働テスト自動化カリキュラム</title><link rel="stylesheet" href="quiz.css"><script src="quiz.js" defer></script></head><body data-module-id="${escapedModuleId}" data-quiz-file="${escapedModuleId}.json" data-revision="${escapedRevision}"><header><p><a href="${COURSE_URL}/">AI協働テスト自動化カリキュラム</a></p><p><a href="${COURSE_URL}/modules/${escapedModuleId}/">${escapedModuleId}の教材へ戻る</a></p></header><main><h1>${escapedModuleId}の確認クイズ</h1><p>${escapedTitle}</p><p>全${questionCount}問 · 正答と解説は全問回答後に表示します。</p><p>クイズJSON SHA-256: <code>${escapedRevision}</code></p><p id="storage-message" role="status" aria-live="polite"></p><div id="quiz-error" role="alert" hidden></div><section id="start-panel" aria-labelledby="start-title"><h2 id="start-title">取り組み方</h2><p>問題は記載順に一問ずつ表示されます。回答を選んで次へ進み、最後の問題で結果を確認してください。</p><button id="start-button" type="button">回答を始める</button><button id="resume-button" type="button" hidden>続きから再開</button><button id="restart-start-button" type="button" hidden>最初からやり直す</button></section><section id="question-panel" aria-labelledby="question-title" hidden><p id="progress" role="status" aria-live="polite"></p><form id="answer-form"><fieldset><legend id="question-title"></legend><div id="choices"></div></fieldset><p id="answer-error" role="alert" hidden>回答を1つ選んでから進んでください。</p><div class="quiz-controls"><button id="previous-button" type="button">前へ</button><button id="next-button" type="button">次へ</button><button id="finish-button" type="button" disabled>結果を確認</button></div></form></section><section id="result-panel" aria-labelledby="result-title" hidden><h2 id="result-title">結果</h2><p id="score" role="status" aria-live="polite"></p><div id="results"></div><p>クイズの得点だけで正式な修了を判定しません。間違えた項目は復習先を読み、別条件で確認してください。</p><button id="retry-button" type="button">このクイズを最初からやり直す</button></section></main></body></html>\n`;
}

const QUIZ_CSS = `:root{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;background:#f5f7fb;color:#182230;line-height:1.6}header,main{max-width:54rem;margin:0 auto;padding:1rem}header{display:flex;gap:1.5rem;flex-wrap:wrap;border-bottom:1px solid #ccd4df}a{color:#0759a5}button{font:inherit;padding:.6rem 1rem;margin:.35rem 0;cursor:pointer;border:1px solid #53657a;border-radius:.35rem;background:#fff;color:#182230}button:disabled{cursor:not-allowed;opacity:.55}:focus-visible{outline:3px solid #1266c5;outline-offset:3px}fieldset{border:1px solid #9aaabd;border-radius:.5rem;padding:1rem;margin:1rem 0}legend{font-weight:700;padding:0 .25rem}.answer-option{display:flex;gap:.7rem;align-items:flex-start;padding:.7rem;border-radius:.35rem}.answer-option input{margin-top:.4rem}.quiz-controls{display:flex;gap:.6rem;flex-wrap:wrap}#quiz-error,#answer-error{padding:.7rem;background:#fff0ed;border-left:4px solid #a32112;color:#65170f}.result-question{padding:1rem 0;border-top:1px solid #ccd4df}.result-option{margin:.6rem 0;padding:.6rem;background:#fff;border-radius:.35rem}.correct-answer{border-left:4px solid #167446}.wrong-answer{border-left:4px solid #a32112}code{overflow-wrap:anywhere}small{color:#445469}@media(prefers-color-scheme:dark){body{background:#101820;color:#e5edf5}header{border-color:#405064}a{color:#9ccaff}button,.result-option{background:#1d2936;color:#e5edf5;border-color:#71849b}#quiz-error,#answer-error{background:#3a211e;color:#ffd9d3}}@media(max-width:36rem){header,main{padding:.8rem}button{width:100%}}`;

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
    if(file==="docs/spec/README.md")return "/docs/spec/"+fragment;
    if(file.startsWith("docs/spec/")&&file.endsWith(".md"))return "/docs/spec/"+file.slice("docs/spec/".length).replace(/\\.md$/i,".html")+fragment;
    return "__COURSE_SOURCE_URL__/"+file+fragment;
  };
  const validQuestion=(question)=>{
    if(!question||typeof question!=="object"||typeof question.id!=="string"||!new RegExp("^"+moduleId+"-Q[0-9]{2}$").test(question.id))return false;
    if(typeof question.question!=="string"||!question.question.trim()||!Array.isArray(question.objective_ids)||question.objective_ids.length===0||question.objective_ids.some((id)=>typeof id!=="string"||!id.startsWith(moduleId+"-")))return false;
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
    const results=byId("results");results.replaceChildren();let score=0;
    for(const question of quiz.questions){
      const selected=state.answers[question.id],correct=selected===question.correct_value;if(correct)score++;
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
      const objectives=document.createElement("p");setText(objectives,"学習項目: "+question.objective_ids.join(", "));section.append(objectives);
      const sourceLine=document.createElement("p");setText(sourceLine,"根拠: ");
      for(const reference of question.source_refs){const link=document.createElement("a");link.href=safeHref(reference);link.textContent=reference;sourceLine.append(link,document.createTextNode(" "));}section.append(sourceLine);
      const review=document.createElement("p");const reviewLink=document.createElement("a");reviewLink.href=safeHref(question.review_path);reviewLink.textContent="教材の復習先";review.append(reviewLink);section.append(review);
      results.append(section);
    }
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
    if(saved&&saved.revision!==revision){try{localStorage.removeItem(storageKey);}catch{}saved=null;setText(storageMessage,"クイズの版が更新されたため、以前の回答は引き継ぎません。新しい版で始めてください。");}
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
    byId("finish-button").addEventListener("click",()=>{if(!allAnswered()){byId("answer-error").hidden=false;return;}state.resultStatus="completed";saveState();renderResults();});
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
  for (const relativePath of markdownPaths) {
    const parsed = parseMarkdownFile(path.join(rootDir, ...relativePath.split("/")), relativePath);
    const outputAbsolute = path.join(outputDir, "curriculum", "ai-assisted-qa", courseOutputPath(relativePath));
    fs.mkdirSync(path.dirname(outputAbsolute), { recursive: true });
    fs.writeFileSync(outputAbsolute, renderCoursePage(rootDir, parsed, navigation, sourceUrl), "utf8");
  }

  const quizOutput = path.join(outputDir, "curriculum", "ai-assisted-qa", "quizzes");
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
      quizHtml(moduleId, titles.get(moduleId) ?? moduleId, quiz.questions.length, revision),
      "utf8",
    );
  }
  fs.writeFileSync(path.join(quizOutput, "quiz.css"), QUIZ_CSS, "utf8");
  fs.writeFileSync(path.join(quizOutput, "quiz.js"), QUIZ_JS.replace("__COURSE_SOURCE_URL__", sourceUrl), "utf8");
  return { coursePages: markdownPaths.length, quizPages: validation.modules.length };
}

type QuizDocument = { questions: unknown[] };
