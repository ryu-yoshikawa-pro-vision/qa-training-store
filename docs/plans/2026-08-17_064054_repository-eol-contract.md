# 計画書: Repository EOL Contractの恒久化

## 0. 依頼概要

- 依頼内容: Windowsでbranch switch後に発生するCRLF/LF差分を、Repository設定で恒久的に解消する。
- 背景: `.gitattributes`、Editor、PrettierのEOL契約が一致しておらず、`format:check`／`verify`がworktreeのEOLだけで失敗する。
- 期待成果: checkout、branch switch、Editor save、Prettier、Windows Native、CIの通常経路がLFを共有する。

## 1. ゴール / 完了条件

- ゴール: 通常のtracked text fileをRepository自身の設定でLF checkoutへ固定する。
- 完了条件（DoD）:
  - `.gitattributes`が`* text=auto eol=lf`を持つ。
  - `.editorconfig`がUTF-8、LF、final newlineだけを指定する。
  - `.prettierrc.json`が`endOfLine: lf`を持つ。
  - `git add --renormalize .`後のstaged／unstaged状態を比較し、意味変更・binary混入・不要なgenerated変更がない。
  - TypeScript、Markdown、JSON、PowerShell、Shellの`git check-attr`が`text: set`／`eol: lf`になる。
  - Windows Nativeでbranch A→B→Aの各`pnpm run format:check`がPASSする。
  - `pnpm run format:check`、`pnpm run verify`、`git diff --check`がPASSする。
  - 先行Codex Hook実装を再設計せず、destructive Git操作、新Dependency、custom frameworkを導入しない。

## 2. 現状理解と前提

- Current understanding:
  - `.gitattributes`は`* text=auto`だけで、working tree EOLをLFへ固定していない。
  - root `.editorconfig`は存在しない。
  - `.prettierrc.json`は`semi`、quote、trailing comma、print widthだけで、`endOfLine`は未指定。
  - `package.json`の`format`／`format:check`はPrettierをRepository全体へ適用し、`verify`は`format:check`から開始する。
  - `core.autocrlf=true`はGit system-scope config由来、`core.eol`はunset。Global設定は原因Evidenceとして扱い、変更しない。
  - worktreeには先行Codex Hook実装と直前の全体format変更があり、indexは空である。
  - `.bat`／`.cmd`は存在しないため、CRLF例外は追加しない。
- Assumptions:
  - Repository内の通常tracked text fileは一律LFでよく、binaryは既存Git判定へ任せる。
  - ユーザーが明示した`git add --renormalize .`により、現在の変更を保持したままindexをrenormalizeする。
  - branch switch acceptanceは現在のworktree上で同一snapshotから一時branch A／Bを作り、元branchへ戻す。branch削除は行わない。
- Non-goals:
  - Git global configの変更、style ruleの再設計、全体の意味的な再format。
  - 新Dependency、custom EOL script、pre-commit／Husky、CI architecture変更。
  - 先行Codex Hookの再実装、destructive reset／checkout、PR／commit／push。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。EOL、対象設定、検証、非対象が依頼文で明示されている。
- 仮定してよい細部: `.bat`／`.cmd`がないため例外を追加しない。DocumentationはPROJECT_CONTEXTへ最小追記する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Git checkout／index normalization、Editor、Prettier、Windows branch switch、format／verify gate。
  - 既存worktreeのstaged／unstaged境界。既存変更は内容を変更せず保持する。
- Files to inspect:
  - `.gitattributes`、`.editorconfig`、`.prettierrc.json`、`package.json`。
  - `docs/PROJECT_CONTEXT.md`、`scripts/verify`、`scripts/verify.ps1`。
  - 先行Hook関連の`.codex/`、Contract Test、既存Run Artifact。

## 5. 変更方針

- Change strategy:
  1. 現在のstatus／unstaged／staged diff、Git EOL設定、既存設定を記録する。
  2. `.gitattributes`、`.editorconfig`、PrettierへLF契約を追加し、PROJECT_CONTEXTへ責務を記録する。
  3. `git add --renormalize .`を実行し、staged／unstaged差分をbefore／afterで比較する。
  4. `git check-attr`、branch A→B→A、各format checkで実効値と再発防止を確認する。
  5. Required gate、Hook focused contract、diff check、sanitizerを実行する。
- 実行タスク:
  - [ ] 1. EOL設定と関連Documentationを追加する。
  - [ ] 2. tracked filesをrenormalizeし、差分を意味比較する。
  - [ ] 3. Git attributesとWindows branch switch acceptanceを検証する。
  - [ ] 4. format／verify／Hook gateとdiffを検証する。
  - [ ] 5. Run Artifactをsanitizerし、最終報告する。

## 6. 検証方法

- Validation plan:
  - `git check-attr text eol --`でTS、MD、JSON、PS1、SHを確認する。
  - temporary branch A→B→Aの各時点で`pnpm run format:check`を実行する。
  - `pnpm run format:check`、`pnpm run verify`、Hook Contract、`git diff --check`を実行する。
  - renormalize前後の`git diff --cached --check`、`git diff --numstat`、binary／content inspectionを行う。
- 成功判定: 全DoDがPASSし、failureが出た場合はEOL起因／先行実装起因／既存／環境依存を分類し、未完了ならRunへ記録する。

## 7. リスクと未解決論点

- Risks:
  - `git add --renormalize .`が既存変更を広くindexへ載せる。実行前後のstatus／diffを保存し、内容を確認する。
  - 現在のglobal `core.autocrlf=true`がRepository契約の検証を曖昧にする。Repository属性、実効checkout EOL、branch switchを独立確認する。
  - 既存の全体format変更と先行Hook実装が混在している。今回の変更は設定とEOLに限定し、既存内容を巻き戻さない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: `.gitattributes`、`.editorconfig`、`.prettierrc.json`、`docs/PROJECT_CONTEXT.md`、必要なRun Artifact。
- 付随ドキュメント: 本計画、Run内PLAN／TASKS／REPORT、検証結果。

## 9. 備考

- EOL責務は`.gitattributes`を正本、`.editorconfig`をEditor補助、Prettier `endOfLine`をFormatter補助とする。
- 実装完了後もGlobal Git設定は変更せず、Repository設定だけでLF checkoutが成立することをEvidenceにする。
