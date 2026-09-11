# 実装計画: 実装タスクのpush・CI確認を完了条件へ追加する

## 0. 依頼概要

- 依頼内容: 実装タスクについて、ローカル検証後のcommit、push、PR head確認、最新headの必須CI確認を完了工程へ追加する。
- 背景: ローカル検証だけで完了報告すると、remoteとGitHub Actionsでの検証状態が未確認のまま残る。
- 期待成果: `AGENTS.md`と`.codex/templates/TASKS.md`が、実装タスクとreview-only／plan-only等を区別し、final commit前のRun Artifact確定と最新headのCI成功までを別段階として明確に扱う。

## 1. ゴール / 完了条件

- ゴール: ユーザーの明示的なGit操作禁止を尊重しつつ、通常の実装タスクを、final commit前にtracked Run Artifactを確定し、push後の最新headの必須CI成功を確認してから完了扱いにする。
- 完了条件（DoD）:
  - `AGENTS.md`へ、実装タスクのfinal commit前Run Artifact確定、最新headの必須CI確認、PR本文／ユーザー報告へのCI結果記録を追加する。
  - `.codex/templates/TASKS.md`のcheckboxをfinal commit前に完了できるローカル作業までとし、commit・push・CI確認は説明として記載する。
  - final push後は、CI successを記録する目的だけでtracked fileを更新・再commit・再pushしない。CI結果の保存先はGitHub上のCI結果、PR本文、ユーザー向け最終報告とする。
  - 必須CI failureの判断は`AGENTS.md` §8「必須検証」へ委譲する。
  - 通常PRの必須CIを`Web CI`と`Mobile App CI`と定義し、`Cross Browser Smoke`を通常PR必須CIに含めない。
  - auto-net、Hook、rules、CI workflow、branch safetyの正本を変更しない。
  - 指定ローカル検証がPASSする。
  - 専用branchへcommit・通常pushし、PRを作成または確認する。
  - push後の最新PR headでWeb CIとMobile App CIがsuccessになることを確認する。

## 2. 現状理解と前提

- Current understanding: 初回変更ではpush後のCI確認とRun Artifactへの結果記録を同じ完了工程として扱っており、tracked Artifactを後追いcommitする自己参照が残っていた。また、CI failureの独自条件が`AGENTS.md` §8と重複し、通常PRの必須CI名が恒久ルール側で明示されていなかった。
- Assumptions: 通常PRで確認する必須CIは`Web CI`と`Mobile App CI`とする。`Cross Browser Smoke`はschedule／`workflow_dispatch`のみであり、通常PR必須CIには含めない。既存のbranch safety文書を具体手順の正本として再利用する。
- Non-goals: auto-net契約、`.codex/hooks/**`、`.codex/rules/**`、`.codex/config.toml`、`.codex/requirements.toml`、`.github/workflows/**`、`docs/reference/git-branch-safety.md`、実装コードや依存を変更しない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーが対象ファイル、branch、DoD、対象CI、禁止範囲を指定済み。
- 仮定してよい細部: 既存PRがなければpush後に日本語のPRを作成し、そのPRの最新headでCIを確認する。CIがqueued／in_progressなら停止して未完了として報告する。CI結果はtracked Run Artifactへ書き戻さない。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: 実装タスクのcompletion contract、標準TASKSの実行順、Runの検証・完了記録。
- Files to inspect: `AGENTS.md`、`.codex/templates/TASKS.md`、`docs/reference/git-branch-safety.md`、`.github/workflows/ci.yml`。
- Safe change surface: `AGENTS.md`、`.codex/templates/TASKS.md`、本plan、今回Run Artifact。

## 5. 変更方針

- Change strategy:
  1. 対象branch、PR、既存契約、CI trigger、直近Runを再確認する。
  2. `AGENTS.md`の実装タスク完了条件とProgress補足を、final commit前のRun Artifact確定とpush後CI確認に分離する。既存branch safetyと§8の詳細は重複記載しない。
  3. TASKS templateを、final commit前のローカル作業だけをcheckboxとし、commit・push・CI確認は説明へ移す形に更新する。
  4. 正本PlanとRun-local PLAN/TASKS/REPORTを新しい順序へ揃える。REPORTはappend-onlyで今回の指摘と修正を追記し、CI未確認の状態を事実どおり記録する。
  5. 指定検証、scope監査、sanitizerを完了してから明示stage・commit・通常pushする。push後はtracked fileを更新せず、最新headの必須CIを確認し、PR本文とユーザー報告へ結果を記録する。

## 6. 検証方法

- Validation plan:
  - `pnpm run lint:markdown`
  - `pnpm run validate:skills`
  - `pnpm run verify`
  - `git diff --check`
  - `scripts/sanitize-codex-artifacts.ps1 -RunId 20260910-200347-JST -Write -Check`
  - `git diff -- AGENTS.md .codex/templates/TASKS.md`、`git diff --name-status`
  - forbidden path、auto-net、Hook、rules、workflow、branch safety文書の差分監査
  - push後にPRの最新head SHA、`Web CI`、`Mobile App CI`を確認する
- 成功判定: final commit前に指定検証・scope監査・sanitizerをPASSし、push後の同一PR headで両workflowがsuccessになること。CIがqueued／in_progressなら完了判定せず、failureなら`AGENTS.md` §8へ委譲する。CI成功結果はRun Artifactへ追記せず、PR本文とユーザー向け最終報告へ記録する。

## 7. リスクと未解決論点

- Risks: 文書間の条件不整合、Git操作の過剰適用、PR未作成によるCI未起動、旧headのCI結果の誤用、CI結果のtracked Artifactへの後追い記録によるhead自己参照。
- 対策: 適用対象／対象外を明記し、branch safetyを正本として再利用する。tracked Run Artifactをfinal commit前に確定し、push後はhead SHAを固定して必須CIを確認する。CI failureは`AGENTS.md` §8へ委譲する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: `AGENTS.md`、`.codex/templates/TASKS.md`。
- 付随ドキュメント: 本plan、Run `20260910-200347-JST`の`PLAN.md`、`TASKS.md`、`REPORT.md`、必要なmanifest／evaluation。

## 9. 備考

- 今回の変更自体も、追加する運用ルールに従い、Run Artifactをfinal commit前に確定してからcommit・通常pushし、最新headの必須CI success確認後にPR本文とユーザー向け最終報告へ結果を記録する。CI successの記録だけを目的とするtracked Artifactの再commitは行わない。
