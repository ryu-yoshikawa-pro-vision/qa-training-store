# Plan（計画）

## Objective（目的）

- common smoke の `workspace-write` fixture を `os.tmpdir()` から sanitized Target の親へ移し、各 predicate の結果を blocked result に保存する。
- 新しい実装修正commitを固定し、そのrevisionで canonical live Workflow E2E を一度だけ実行する。

## Scope（対象範囲）

- In: `scripts/evals/run-skill-workflow-evals.ts`、`tests/repository-contract/skill-workflow-evals.test.ts`、今回のRun Artifact、指定された回帰検証、PR #168の実装commitとcanonical run記録。
- Out: fixed 5 case、status分類、Semantic criteria、Case B trust boundary、Case E Doctor contract、Plan、Hook/G10、config、CI workflow、Runtime controlsの変更。

## Assumptions（仮定）

- latest PR head `a1beb3361bcb26e722daa45ec41807a8e4c9bb80` と `9ea92af...` 以降の差分はRun Artifactのみ。ローカルbranchは3 commit behindで、fast-forwardはHost policyが拒否した。sourceは同一の `9ea92af...` 上で検証中。
- canonical runは新しい実装修正commitと必須CIの成功後にだけ開始する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 細い共通helperとpure smoke predicate summarizerを追加し、既存schema v1の`smoke_probe`を使う。
- 未回答の重要質問: 最新PR headへの通常fast-forwardがHost policyで拒否されたため、commit前に同一branchの更新可能性を再確認する。

## Hypotheses（仮説）

- H1: `os.tmpdir()`下のnested Codex `workspace-write` cwd がHost Runtimeの書込可能領域と合っていない。
- H2: boolean predicateの内訳がresultにないため、過去blocked runでは不成立条件を特定できなかった。

## Research Plan（調査計画）

- Round 1 Query: 呼び出し経路から各 `executeCodexTurn()` のcwdと `workspace-write` 利用を列挙する。
- Round 2 Query: pure predicate summaryとresult-first blocked経路が各診断を保存するか、focused contract testで確認する。
- Exit Criteria:
  - `executeCodexTurn()` の `workspace-write` cwdだけをTarget親へ配置する。
  - common smoke fail時にpredicate booleanを記録し、PASS条件を維持する。

## Approach（進め方）

- 現行Plan・結果・runner経路を確認し、agent workspace helperとsmoke診断関数を最小追加する。
- focused test、repository test、markdown lint、verify、diff checkを順に実行し、source差分をreviewする。
- 実装をcommit/pushし最新head CIを確認する。fresh Targetを作り、detach完了後にcanonical runnerを一度実行する。

## Definition of Done（完了条件）

- 指定検証が成功し、self-reviewで対象範囲が保たれ、新しいEvaluator revisionのcanonical runとRun Artifactが記録・sanitization済みである。
- PR本文と最新head CIを更新・確認する。canonical E2Eの成功判定はPlanの全成功条件に従う。

## Risks / Unknowns（リスク・未知点）

- branch fast-forwardのHost policy拒否。迂回せず、source作業後に通常Git経路で扱えるか確認する。
- nested runtimeが依然blockする可能性。predicate別resultを残し、同じrevisionをretryしない。

## Thinking Log（判断記録）

- 2026-09-23: remote PR headは`a1beb336...`。`9ea92af...`以降にRun Artifact外の差分なし。ローカルbranchのfast-forwardはpolicyに拒否されたためsource同一性を根拠に調査・実装を先行し、ref mutationは迂回しない。
- Agent workspaceの対象はcommon smoke、Case A/C/D/E context、Case A Artifact reuse、Case B main Agent context。runner-only tempとread-only Skill probe tempは維持する。
