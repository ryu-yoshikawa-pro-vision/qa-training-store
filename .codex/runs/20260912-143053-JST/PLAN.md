# Plan

## Objective

PR #143 のレビュー指摘3件を、Issue #141 の既存実装を再変更せずに修正する。

## Scope

- In:
  - `tests/contracts/app-config.test.ts` の `expo-sqlite` string / tuple 重複検出
  - `.codex/runs/20260912-081339-JST/` の正規writer/collectorによるmanifest同期、Strict evaluation、REPORT末尾の訂正checkpoint
  - 本Runの修復記録、検証、sanitization
- Out:
  - `app.config.ts`、`package.json`、`pnpm-lock.yaml`、workflow、既存Windows timeout、製品実装
  - `main`への反映、merge、force push、Issue close、branch削除、live E2E、main反映後no-op

## Assumptions

- 既存Runの実装・検証・PR CIの記録を観測事実として再利用し、未実施事項は成功に書き換えない。
- 元Runの `run.json` は直接編集せず、`codex-task` または `codex-safe` と公式collectorの経路だけで更新する。
- 作業用Runは、別タスクとしての今回のrepair loopと元Runの最終化を分離して記録する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。レビュー指摘と対象pathが明確で、破壊的判断も不要。
- 仮定してよい細部: 作業用RunはStrict `repair` とし、元Runの既存履歴は保持する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 公式manifest writer/collectorで元Runのbranch、validation、evaluation link、完了状態を実績に合わせて同期できる。
- H2: plugin entryをstringとtupleの両形式で抽出するcontract testにより、option付きtuple重複がFAILとして検出される。
- H3: REPORT末尾への訂正checkpointだけで時刻見出しの追記順不整合を説明でき、過去履歴の意味を保持できる。

## Research Plan

- Round 1 Query: repair-loop、Run Artifact、evaluation schema、writer/collector、既存Run、対象test、branch/PR状態を確認する。
- Round 2 Query: 修正後のfocused test、意図的tuple重複FAIL、config/runtime、schema、sanitizer、標準verify、最終diff、PR head CIを確認する。
- Exit Criteria:
  - H1〜H3を実績と検証結果で支持できる
  - `run.json` は正規経路でcompleted、validation/evaluationと整合する
  - tuple重複のpositive/negative regressionを確認し、正しいtreeへ復元する
  - 変更scope、sanitization、branch/head、PR CIを最終確認する

## Approach

1. 作業用Strict Runへ計画・タスクを保存する。
2. 対象testだけを最小差分で修正し、tuple重複のFAILを一時的に確認して復元する。
3. 元RunのREPORT末尾へ一度だけ訂正checkpointを追記し、評価JSONをschema準拠で作成する。
4. 公式writer/collector、指定focused validation、標準verify、sanitizerで結果を確定する。
5. scopeとbranch safetyを確認してreview-fixだけをcommit/pushし、新headのPR CIと本文を確認する。

## Definition of Done

- 3件のレビュー指摘が指定scope内で修正され、元Runの過去記録が保持されている。
- 元RunにStrict evaluationが存在し、公式経路でmanifestが実績と整合したcompleted状態になる。
- 対象testは正しい設定でPASSし、tuple重複の一時状態ではFAILする。
- 必須focused gate、標準verifyの結果、sanitizer、最終scope、PR新head CIが記録される。

## Risks / Unknowns

- 既存Runは実装commit後のため、collectorのchanged_filesは現在の観測可能なsource差分を中心に集約する。元実装の過去pathはREPORTとbranch diffで参照し、観測事実を手書きで捏造しない。
- Windowsローカルの既知launcher timeout、iOS local prebuild未実施、main no-op/live E2E未実施は、実績どおりpartial/warnとして残す。
- 公式writer実行時のcodex-task reportはRun配下の機械生成artifactとして保持し、raw logはRunの意味記録へ逐次転記しない。

## Thinking Log

- 2026-09-12 14:31 JST: 3件とも明確なmust_fix。修復は1回のbounded iterationに固定し、production/dependency/workflowへscopeを拡張しない。
- 2026-09-12 14:31 JST: 元Runの未完了manifestは今回の中心findingのため、作業用Runを新設しても元Runのfinalizeを省略しない。

## Follow-up: 元Run評価責務の訂正

今回の再レビューで、元Run `20260912-081339-JST` の `evaluation.json` がIssue #141の実装ではなく、後続repairのtuple重複検出を主題としていること、および両evaluationの人間向け説明文が英語であることが判明した。

- In: 元Run evaluationのIssue #141実装評価への修正、両evaluationの人間向け文面の日本語化、公式collectorによる両manifestの再同期、必要なREPORT末尾checkpoint、schema／sanitizer／scope／CI確認。
- Out: `app.config.ts`、`package.json`、`pnpm-lock.yaml`、`tests/contracts/app-config.test.ts`、workflow、Expo／React Native依存関係、既存Windows launcher timeout test、main操作、merge、force push、live E2E、main反映後no-op。
- 判断: collectorが現在の作業ツリーから取得した`changed_files`は、既にcommit済みのIssue #141実装履歴を再構成しない。元実装のpathと検証事実は、元Run REPORT、保存Plan、branch差分を参照して評価し、manifestへ手書きで補わない。
- Bounded iteration: 1回。evaluation、REPORT、公式manifest再同期、schema／sanitizer／lint／diff確認、branch／PR／push／最新head CI確認を完了条件とする。
