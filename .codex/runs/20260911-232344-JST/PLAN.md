# Plan

## Objective

- PR #133の未対応3件だけを、指定された4つのsourceファイルへbounded repairとして反映し、新しいRunで検証・記録して対象branchへpushする。

## Scope

- In: P1-2 / P1-3教材のExecutable Source導線、Evidence validatorとtraining curriculum contract、今回の新Run・Evaluation・Sanitizer・必要なliving documentation。
- Out: Native CI、C09、C12、Training Workflow等の既修正領域、Product Code、過去Run `20260911-075512-JST`、新parser / dependency、filesystem存在確認、外部Full Review。

## Assumptions

- `BEFORE_SHA=a9ecc1d6fd4dff1e75ded3af6a8c342f1d455a38`を今回の基準とする。
- `task_type=repair`、`workflow_level=strict`、`preset=safe`は既存の正式値であり、source編集と検証に適する。
- source commitとRun Artifact commitを分離する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象とDoDが明示されている。
- 仮定してよい細部: 既存fixtureに合わせた負例・正例の配置と既存validatorの局所修正方法。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 現行contract fixtureで、説明文直後の`Trace:`に続く危険Pathが通過するため、先に再現して負例へ固定できる。
- H2: P1-2 / P1-3の直接参照は本文の標準導線を人間向けSSOT中心に置き換える局所編集で除去できる。
- H3: local検証の主要EvidenceをGit管理Run report / manifestまたはGitHub Actionsへ接続できる。

## Research Plan

- Round 1 Query: 開始SHA、PR HEAD、正本Plan、最近のADR / Run、4つのsourceファイル、run toolingを確認する。
- Round 2 Query: test-first再現、contract追加、validator / 教材修正、focused / standard validation、source commit、Training Copy、machine Evidence、Sanitizer、remote checksを確認する。
- Exit Criteria:
  - 3件の修正と4つのsource変更が同一source commitへ含まれる。
  - `SOURCE_SHA != BEFORE_SHA`で、PR headとremote pushが一致する。
  - local / Training Copy / Run Artifact / remote CIのEvidenceが第三者追跡可能である。

## Approach

- `PLAN -> TASKS -> 事前再現 -> contract先行修正 -> source実装 -> focused / standard validation -> source commit -> Training Copy / machine Evidence -> Sanitizer / PR同期 -> non-force push -> 同一HEAD checks`の順に進める。
- repair-loopは1 bounded iterationとし、同一失敗の無目的な再試行やscope拡張を行わない。

## Definition of Done

- 指定された4 sourceファイルが`git diff --name-only BEFORE_SHA...HEAD`へ含まれる。
- P1-2 / P1-3の標準学習導線が`state-and-scenarios.md`、`seed_catalog.md`、`/guide`、current UI中心になり、Executable Sourceの具体ID確認はPlaywright実装後へ送られる。
- `Trace:`付きの危険Path 6種を拒否し、正当なURL・Artifact・output・Run参照を許可するcontract testがpassする。
- 指定検証、Training Copy、machine-managed Run evidence、Evaluation、Sanitizer、PR checks、branch safetyがすべて確認済みである。

## Risks / Unknowns

- `https:`のscheme内の`:`をWindows drive separatorと誤認しないこと。
- wrapper / runnerの環境問題が出た場合は最初の異常を切り分け、Evaluationのpass根拠へ推測で読み替えないこと。
- 未対応3件以外のNative / C09 / C12 / Training Workflowを変更しないこと。

## Thinking Log

- 2026-09-11 23:23 JST: `BEFORE_SHA`、current branch、PR headを確認し、`origin/main`をfetchした。PR headとcurrent HEADは指定値で一致した。
- 2026-09-11 23:24 JST: 新Run `20260911-232344-JST`を`repair / strict / safe`で初期化した。前回Runは再利用しない。
- 2026-09-12 00:20 JST: source push後のCI一次failureを調査した。Prettier不一致は今回diff由来として局所修正し、Native StaticのExpo Doctor patch mismatchは今回diff外かつ直前の旧SHAで成功したため、依存更新を行わない仮説を採用した。
