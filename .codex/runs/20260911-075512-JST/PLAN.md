# Plan

## Objective

- PR #133の複数モデルレビュー指摘を、現行HEADと証拠で再判定し、成立した指摘だけをbounded repairとして修正・検証・報告する。

## Scope

- In: レビュー対象の既存validator、contract test、Native workflow/helper、Training Workflow、Workbook、P1/P2教材・rubric、正本Planの限定追記、iOS history / Run Artifact / PR説明。
- Out: `src/**`、Product Behavior、BR / AC、Seed Scenarioの意味、Workbook schema、Training全体再設計、Maestro Flowの意味、iOS Build-only保証、runner / Xcode / CocoaPods / cache、新規grader / schema / framework / dependency、merge / close / force push。

## Assumptions

- ユーザー指示により対象branchへのnon-force pushと、成立した指摘の局所修正は許可されている。
- 既存のparser、validator、collector、Training Copy経路を再利用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。指摘、scope、禁止事項、DoDは十分具体的である。
- 仮定してよい細部: fixtureの実装方法、checkpoint時刻、commit分割。
- 未回答の重要質問: 実証不能なNative条件は`unverified`として記録する。

## Hypotheses

- H1: Android helper、Evidence境界、Training Workflow step条件の不足は、現在のcontractのnegative fixtureで検出可能か、または検出できず修正が必要である。
- H2: C09 / C12 / P1-6 / P1-9 / P1-8とRun evaluationの指摘は、現行教材・Artifact・collector・ログを横断すると一部のみ成立する。
- H3: mainの進行は現行PRの対象ファイルへ直ちに競合を生じさせない可能性があるが、差分と依存を確認して判断する。

## Research Plan

- Round 1 Query: 現行validator / contract / workflow / 教材 / Workbook / Run / CIログを読み、14項目を再現・既存対応済み・未確認へ分類する。
- Round 2 Query: 成立した項目だけを最小修正し、focused fixture、標準verify、Training Copy、Sanitizer、Remote CIで回帰確認する。
- Exit Criteria:
  - 各指摘に支持または反証の具体的根拠がある。
  - 変更scopeが宣言範囲内で、未確認事項の次アクションが記録されている。
  - 最終HEAD、Run Artifact、PR本文、CI、worktreeの状態が一致している。

## Approach

- `PLAN -> TASKS -> 指摘別再現 -> 成立分の局所修正 -> focused / standard validation -> Training Copy / Remote -> REPORT / PR同期`の順で進める。
- 修復は1 bounded iterationとして扱い、同一エラー再試行やscope拡張を行わない。

## Definition of Done

- 14項目の判定、修正、未確認理由がRun REPORTにある。
- 成立分の回帰テスト、`pnpm run verify`、Training Copy、Sanitizer、必要なRemote CIがPASSする。
- `run.json`を直接編集せず、evaluation Evidenceが実Artifact / command / GitHub runへ追跡できる。
- PR本文は日本語で現在の実差分・検証結果へ同期し、対象branchはnon-force push後cleanである。

## Risks / Unknowns

- mainがレビュー後に進んでいるため、対象ファイルの競合・依存だけを確認してrebase要否を判断する。
- ja-JP ANRとPixel Launcherの実UI / logが取得できない場合、推測修正せず未確認として残す。
- collectorが既存Runのstatusやvalidationを推測しない場合、schema / toolingを拡張せず、評価の追跡可能性を実証できる範囲で記録する。

## Thinking Log

- 2026-09-11 07:55 JST: 前回Runは完了済みのため、新しい依頼としてRun `20260911-075512-JST`を作成した。現行HEADとPR required checksは前回修正済み状態でpassしているが、今回の14項目は別途再判定する。
- mainは`13cc542`へ進んでいる。自動rebase / mergeはせず、対象ファイルの競合・依存調査後に必要性を決める。
- 2026-09-11 08:32 JST: `HEAD..origin/main`には大規模な別作業の追加・削除が含まれるが、PRはmergeableであり、今回の対象ファイルを最新mainへ自動rebase / mergeする必要性は確認できなかった。現行PRのレビュー修復は現在のPR HEADを基準に続ける。
- 2026-09-11 08:32 JST: Round 2のbounded repair対象を、Android workflow / Native contract、Evidence validator / contract、Training Workflow contract、Workbook、P1/P2教材、正本Plan、iOS訂正、Run Artifactへ限定する。Product / `src/**`、BR / AC、Seedの意味、Maestro Flow、schema / framework / dependencyは対象外のままとする。
