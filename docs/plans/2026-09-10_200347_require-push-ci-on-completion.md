# 実装計画: 実装タスクのpush・CI確認を完了条件へ追加する

## 0. 依頼概要

- 依頼内容: 実装タスクについて、ローカル検証後のcommit、push、PR head確認、最新headの必須CI確認を完了工程へ追加する。
- 背景: ローカル検証だけで完了報告すると、remoteとGitHub Actionsでの検証状態が未確認のまま残る。
- 期待成果: `AGENTS.md`と`.codex/templates/TASKS.md`が、実装タスクとreview-only／plan-only等を区別し、最新headのCI成功までを明確に扱う。

## 1. ゴール / 完了条件

- ゴール: ユーザーの明示的なGit操作禁止を尊重しつつ、通常の実装タスクの完了判定をpush・PR・CIまで一貫させる。
- 完了条件（DoD）:
  - `AGENTS.md`へ実装タスクの完了条件、PR作成条件、CI状態別の扱い、failure時の停止・修正方針を追加する。
  - `.codex/templates/TASKS.md`へ実装タスク限定のcommit、push、PR head／CI確認工程を追加する。
  - auto-net、Hook、rules、CI workflow、branch safetyの正本を変更しない。
  - 指定ローカル検証がPASSする。
  - 専用branchへcommit・通常pushし、PRを作成または確認する。
  - push後の最新PR headでWeb CIとMobile App CIがsuccessになることを確認する。

## 2. 現状理解と前提

- Current understanding: `AGENTS.md`にはbranch safetyとローカル検証の規則があるが、一般実装タスクのpush・最新head CI確認を独立した完了条件として明記していない。TASKS templateはREPORTによる完了判定で終わっている。`.github/workflows/ci.yml`はpull requestとmain pushを契機とするため、feature branchにPRがなければPR用CI確認が成立しない。
- Assumptions: このrepositoryで必須CIとして確認するworkflowは`Web CI`と`Mobile App CI`とする。既存のbranch safety文書を具体手順の正本として再利用する。
- Non-goals: auto-net契約、`.codex/hooks/**`、`.codex/rules/**`、`.codex/config.toml`、`.codex/requirements.toml`、`.github/workflows/**`、`docs/reference/git-branch-safety.md`、実装コードや依存を変更しない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーが対象ファイル、branch、DoD、対象CI、禁止範囲を指定済み。
- 仮定してよい細部: 既存PRがなければpush後に日本語のPRを作成し、そのPRの最新headでCIを確認する。CIがqueued／in_progressなら停止して未完了として報告する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: 実装タスクのcompletion contract、標準TASKSの実行順、Runの検証・完了記録。
- Files to inspect: `AGENTS.md`、`.codex/templates/TASKS.md`、`docs/reference/git-branch-safety.md`、`.github/workflows/ci.yml`。
- Safe change surface: `AGENTS.md`、`.codex/templates/TASKS.md`、本plan、今回Run Artifact。

## 5. 変更方針

- Change strategy:
  1. 最新`origin/main`から専用branchとRunを準備し、既存契約を確認する。
  2. `AGENTS.md`の必須検証付近に、実装タスク限定のpush・PR・CI完了条件を追加する。既存branch safetyの詳細は重複記載しない。
  3. TASKS templateを、review-only／plan-only等にはGit操作を強制しない条件付き工程へ更新する。
  4. 指定検証とscope監査を行い、commit・push・PR確認・最新head CI確認を実施する。failureは既存停止条件に従う。
- 実行タスク:
  - [x] 1. 最新main、branch、既存契約、CI trigger、PR有無を確認する
  - [x] 2. planとRun Artifactを初期化する
  - [ ] 3. `AGENTS.md`と`.codex/templates/TASKS.md`を更新する
  - [ ] 4. ローカル検証とscope監査を実行する
  - [ ] 5. commit、push、PR作成または確認、最新headのCI成功を確認する
  - [ ] 6. Run Reportを更新し、sanitizerと最終完了判定を行う

## 6. 検証方法

- Validation plan:
  - `pnpm run lint:markdown`
  - `pnpm run validate:skills`
  - `pnpm run verify`
  - `git diff --check`
  - `git diff -- AGENTS.md .codex/templates/TASKS.md`、`git diff --name-status`
  - forbidden path、auto-net、Hook、rules、workflow、branch safety文書の差分監査
  - push後にPRの最新head SHA、`Web CI`、`Mobile App CI`を確認する
- 成功判定: 指定検証が全てPASSし、push後の同一PR headで両workflowがsuccessになること。CIがqueued／in_progressなら完了判定せず、failureなら原因分類と次アクションを記録する。

## 7. リスクと未解決論点

- Risks: 文書間の条件不整合、Git操作の過剰適用、PR未作成によるCI未起動、旧headのCI結果の誤用。
- 対策: 適用対象／対象外を明記し、branch safetyを正本として再利用し、push後にhead SHAを固定してCIを確認する。CI失敗時はsecret・権限・外部障害・独立問題を自動修正しない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: `AGENTS.md`、`.codex/templates/TASKS.md`。
- 付随ドキュメント: 本plan、Run `20260910-200347-JST`の`PLAN.md`、`TASKS.md`、`REPORT.md`、必要なmanifest／evaluation。

## 9. 備考

- 今回の変更自体も、追加する運用ルールに従いcommit、push、PR、最新headの必須CI確認まで行う。
