# 実装計画: 実装タスクのpush・CI確認を完了条件へ追加する

## 0. 依頼概要

- 依頼内容: 実装タスクについて、ローカル検証後のcommit、push、PR head確認、最新headの必須CI確認を完了工程へ追加する。
- 背景: ローカル検証だけで完了報告すると、remoteとGitHub Actionsでの検証状態が未確認のまま残る。
- 期待成果: `AGENTS.md`と`.codex/templates/TASKS.md`が、実装タスクとreview-only／plan-only／GitHub metadataのみの変更を区別し、final commit前のRun Artifact確定、push後の必須CI確認、Progress算出を矛盾なく扱う。手動Runの`run.json`制約は既存collectorの制約として記録する。

## 1. ゴール / 完了条件

- ゴール: ユーザーの明示的なGit操作禁止を尊重しつつ、通常の実装タスクを、final commit前にtracked Run Artifactを確定し、push後の最新headの必須CI成功を確認してから完了扱いにする。
- 完了条件（DoD）:
  - `AGENTS.md`へ、実装タスクのfinal commit前Run Artifact確定、最新headの必須CI確認、PR本文／ユーザー報告へのCI結果記録を追加する。
  - `AGENTS.md §2`のRun完了checkpointは維持し、repository working tree変更をcommit・pushし、push後CI確認まで行うタスクだけはtracked Artifactをcommit前に確定する例外を明記する。
  - repository working tree変更タスクのユーザー向けProgressへ必須CI確認1件を加算し、CI確認をTASKS checkboxへ追加しない。GitHub metadataのみの変更には加算しない。
  - `.codex/templates/TASKS.md`のcheckboxをfinal commit前に完了できるローカル作業までとし、commit・push・CI確認は説明として記載する。
  - final push後は、CI successを記録する目的だけでtracked fileを更新・再commit・再pushしない。CI結果の保存先はGitHub上のCI結果、PR本文、ユーザー向け最終報告とする。
  - 必須CI failureの判断は`AGENTS.md` §8「必須検証」へ委譲する。
  - `.codex/runs/20260910-200347-JST/run.json`は既存collectorを1回確認し、`pending`／`not_run`が残る場合は手動Runを反映できない既知制約としてREPORTとPR本文へ記録する。`run.json`、collector、manifest仕様は手編集・変更しない。
  - 通常PRの必須CIを`Web CI`と`Mobile App CI`と定義し、`Cross Browser Smoke`を通常PR必須CIに含めない。
  - auto-net、Hook、rules、CI workflow、branch safetyの正本を変更しない。
  - 指定ローカル検証がPASSする。
  - 専用branchへcommit・通常pushし、PRを作成または確認する。
  - push後の最新PR headでWeb CIとMobile App CIがsuccessになることを確認する。

## 2. 現状理解と前提

- Current understanding: 初回変更ではpush後のCI確認とRun Artifactへの結果記録を同じ完了工程として扱っており、tracked Artifactを後追いcommitする自己参照が残っていた。また、TASKS checkboxの完了値だけではCI未確認の実装タスクを100%と表現でき、repository file変更とGitHub metadataのみの変更の境界も明示されていなかった。手動Runの`run.json`はREPORTの検証結果を自動推論せず、`status=pending`／`validation.status=not_run`が残る。
- Assumptions: 通常PRで確認する必須CIは`Web CI`と`Mobile App CI`とする。repository working treeのファイル変更を伴いcommit・push・CI確認を行うタスクだけ、ユーザー向けProgressの分母へ必須CI確認1件を加算する。`Cross Browser Smoke`はschedule／`workflow_dispatch`のみであり、通常PR必須CIには含めない。既存のbranch safety文書を具体手順の正本として再利用する。
- Non-goals: auto-net契約、`.codex/hooks/**`、`.codex/rules/**`、`.codex/config.toml`、`.codex/requirements.toml`、`.github/workflows/**`、`docs/reference/git-branch-safety.md`、collector、manifest schema、実装コードや依存を変更しない。`run.json`を手編集して状態を補正しない。

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
  2. `AGENTS.md §2`のRun完了checkpoint例外、§3のProgress算出、実装タスク完了条件のrepository working tree／GitHub metadata境界を揃える。final commit前のRun Artifact確定とpush後CI確認を分離し、既存branch safetyと§8の詳細は重複記載しない。
  3. TASKS templateを、final commit前のローカル作業だけをcheckboxとし、commit・push・CI確認は説明へ移す形に更新する。
  4. 正本PlanとRun-local PLAN/TASKS/REPORTを新しい順序へ揃える。REPORTはappend-onlyで今回の4指摘、作業開始時head、`run.json`の既知制約、ProgressのCI未確認状態を事実どおり追記する。
  5. 指定検証、scope監査、sanitizerを完了してから明示stage・commit・通常pushする。push後はtracked fileを更新せず、最新headの必須CIを確認し、PR本文とユーザー報告へ結果を記録する。

## 6. 検証方法

- Validation plan:
  - `pnpm run lint:markdown`
  - `pnpm run validate:skills`
  - `pnpm run verify`
  - `git diff --check`
  - `scripts/collect-run-artifacts.ps1 -RunId 20260910-200347-JST -RefreshGitChangedFiles`をclean treeで1回だけ実行し、`run.json`の実値を照合する。
  - `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260910-200347-JST -Write -Check`
  - `git diff -- AGENTS.md .codex/templates/TASKS.md`、`git diff --name-status`
  - forbidden path、auto-net、Hook、rules、workflow、branch safety文書の差分監査
  - push後にPRの最新head SHA、`Web CI`、`Mobile App CI`を確認する
- 成功判定: final commit前に指定検証・scope監査・sanitizerをPASSし、push後の同一PR headで両workflowがsuccessになること。CIがqueued／in_progressなら完了判定せず、failureなら`AGENTS.md` §8へ委譲する。CI成功結果はRun Artifactへ追記せず、PR本文とユーザー向け最終報告へ記録する。GitHub metadataのみの変更ではcommit・push・CI完了条件とProgressのCI加算を適用しない。

## 7. リスクと未解決論点

- Risks: 文書間の条件不整合、Git操作の過剰適用、PR未作成によるCI未起動、旧headのCI結果の誤用、CI結果のtracked Artifactへの後追い記録によるhead自己参照。
- 対策: 適用対象／対象外を明記し、branch safetyを正本として再利用する。tracked Run Artifactをfinal commit前に確定し、push後はhead SHAを固定して必須CIを確認する。CI failureは`AGENTS.md` §8へ委譲する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: `AGENTS.md`、`.codex/templates/TASKS.md`。
- 付随ドキュメント: 本plan、Run `20260910-200347-JST`の`PLAN.md`、`TASKS.md`、`REPORT.md`、必要なmanifest／evaluation。

## 9. 備考

- 今回の変更自体も、追加する運用ルールに従い、Run Artifactをfinal commit前に確定してからcommit・通常pushし、最新headの必須CI success確認後にPR本文とユーザー向け最終報告へ結果を記録する。CI successの記録だけを目的とするtracked Artifactの再commitは行わない。
