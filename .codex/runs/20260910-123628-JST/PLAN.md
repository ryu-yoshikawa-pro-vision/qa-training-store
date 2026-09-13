# Plan

今回のRunでは、PR #133の実装・CI修復後に残ったRun Manifest、lockfile、PR本文の記録不整合だけを修復する。

## Objective

- PR #133の成立済み実装・CI結果と、残っているRun Manifest、lockfile、PR本文の記録を実態へ同期する。
- 既存のRun管理契約を再利用し、今回の修正を記録・検証・non-force pushまで完了する。

## Scope

- In:
  - `.codex/runs/20260909-161425-JST/run.json`の最小修復、および同RunのREPORT追記。
  - 今回の修正結果を記録するRun Artifact。
  - `pnpm-lock.yaml`のPR #133由来でないpeer snapshot差分の除去。
  - GitHub上のPR #133本文のExpo、回帰テスト、iOS timeout、Training Copy、CI run記述の同期。
- Out:
  - `src/**`、Product Behavior、BR / AC、Seed Scenario、Maestro Flow、Playwright教材、Workbook schema、Training Workflow構造。
  - Android launcher修復、iOS timeout、runner、Xcode、CocoaPods、cache、dependency version、Run管理script / collector / schema。
  - 既存commitのrewrite、rebase、force push、外部Full Review。

## Assumptions

- 現在の対象branch、PR HEAD、base、Remote CI結果は開始時確認を正本とする。
- 対象RunはREPORT / TASKS上で完了しているが、`run.json`だけが初期template状態に残った単発事例である。
- `changed_files`はcollectorの作業ツリー観測値であり、cleanなRunで空のままでも契約違反ではない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。既存script、docs、履歴、Run Artifact、PR、CIから判断できる。
- 仮定してよい細部: 既存の専用close/finalize commandがない場合、ユーザー指示の例外に従い対象`run.json`だけを最小更新する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `collect-run-artifacts`は既存の`status` / `validation`を引き継ぎ、REPORTから完了を推測しない。専用終了経路がないため、今回だけ最小直接修復が必要になる。
- H2: lockfileの16行はTraining script追加から導けず、mainのExpo依存同期とも重複するpeer snapshot表現の差分であるため、`origin/main`へ戻せる。
- H3: PR本文のExpo bullet、Formal Regressionの表現、特定分数、Training Copy SHAは、現在の差分・実証跡・最終source SHAへ同期できる。

## Research Plan

- Round 1 Query: Run writer / collector / template / reference / target Runを調査し、status・validation・branch・changed_filesの更新契約を確定する。
- Round 2 Query: `package.json` / lockfile / main履歴、PR metadata、最終CIを照合し、必要最小の修正を適用する。
- Round 3 Query: frozen install、Repository標準検証、最終SHAのTraining Copy、Sanitizer、push後の新HEAD CIを確認する。
- Exit Criteria:
  - Manifestの正規経路または直接修復例外の根拠がREPORTにある。
  - lockfile差分の判断とfrozen install結果がある。
  - 最終HEADに対応するTraining Copy、Web CI、Mobile App CIを確認する。
  - scope、Sanitizer、PR本文、worktree cleanを確認する。

## Approach

- まず開始時点を再取得し、既存Run更新経路とlockfile差分を調査する。
- source差分を最小変更し、対象Run REPORTへappend-onlyで判断と検証を記録する。
- 専用Run終了経路がないことを確認した後、対象`run.json`をschema v2の既存形状のまま最小同期する。
- frozen installと必須検証を実施し、最終commit SHAでTraining Copyを再検証する。
- branch safetyを再確認してcommit / pushし、新HEADのRemote CIを確認後、PR本文を日本語で更新する。
- 標準フロー: `PLAN -> repo docs / existing contract -> TASKS -> 修正 -> 検証 -> REPORT -> commit / push -> PR同期`

## Definition of Done

- ユーザー指定の完了条件をすべて確認し、未確認事項を残さない。
- target `run.json`の`status=completed`、`validation.status=passed`が実証済み結果と一致する。
- lockfile不要差分が除去され、frozen installが成功する。
- 最終source SHAでTraining Copy prepare / validateが成功し、source / resolved SHAが一致する。
- 必須local検証、Sanitizer、non-force push、新HEADのWeb / Mobile CI、PR本文同期、clean worktreeが完了する。

## Risks / Unknowns

- `run.json`の直接更新が通常契約に抵触しないよう、専用経路の不存在とユーザー指定例外をREPORTへ明記する。
- lockfileを戻した後の依存再現性を`pnpm install --frozen-lockfile`で確認し、再変更がないことを確認する。
- source変更でRemote CI runが新しく生成されるため、過去runを流用せず新HEADの結果だけを完了根拠にする。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-09-10: 対象branchは`refactor/test-automation-curriculum-learning-experience`、HEADは`397a1a0...`、`origin/main`とmerge-baseは`55cb43a...`で一致した。PR #133はopen、baseはmain、既存Web / Mobile CIはsuccess。
- 2026-09-10: repair-loop skillを適用し、入力Findingを`must_fix`（stale Run Manifest、説明と差分の不整合、不要lockfile差分）としてbounded scopeへ限定する。source実装やCI構成の追加修正は行わない。
