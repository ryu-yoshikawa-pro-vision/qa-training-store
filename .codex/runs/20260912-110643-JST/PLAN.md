# Plan

## Objective

- Issue #142「Windows環境でCodex Hook contractがtimeoutする問題を解消する」を、正本Plan `docs/plans/2026-09-12_071400_windows-codex-hook-contract-timeout.md` の順序・停止条件・完了条件に従って実装・検証する。
- #140の2件、Hook matrix、その他の再現caseを同一原因と仮定せず、まずWindows上の再現境界とtest内の累積時間を確定する。

## Scope

- In:
  - `tests/contracts/codex-hook-contract.test.ts` を第一候補とするfocused/file/suite検証、必要最小限のtest固有timeout調整。
  - test-onlyで説明できない場合に限る、Planで指定されたproduction Hook / config / CIの調査・最小修正。
  - strict Run Artifact、環境情報、実測分布、検証結果、GitHub Actions確認、Sanitizer Write/Check。
- Out:
  - contractのskip、policy case削減、assertion弱体化、fail-closed緩和、Windows contract削除。
  - 根拠のない30秒timeout化、Vitest都合のruntime timeout変更、原因未確認のproduction最適化。
  - launcher全体の抽象化・リファクタリング、新規benchmark/process manager/cache/framework、#140 branchへの実装。
  - commit、push、PR本文更新、merge、Issue close。

## Assumptions

- 対象branch `fix/windows-codex-hook-contract-timeout`、PR #144、base `main`を作業対象の正本とする。
- 実装開始時の最新mainは取得済みの `origin/main` とし、local `main`をswitch/mergeせず比較する。
- 現在のworking treeは事前変更なしであり、branch差分は指定Planだけである。これが変化した場合は標準計測を停止して再確認する。
- PowerShell、Node、pnpm、Gitが利用可能であることを環境probeで確認し、不足はtimeoutと分類しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザー指定Planがscope、優先順位、DoD、検証順、禁止事項を固定している。
- 仮定してよい細部: 測定用の最小一時probeの配置・保存先はPlanとrepo規約に従い、最終source差分へ残さない。
- 未回答の重要質問: focused/file/suiteの実測後にのみ、test-onlyかproduction調査かを判断する。

## Hypotheses

- H1: #140の2件は、単一launcher異常ではなく、test内の直列3回の正常なWindows process起動がVitest 5000ms境界を超えるaggregate timeoutである。
- H2: Hook matrixが再現する場合、contextなしcaseの実Hook entrypointを保ったNode process反復の累積が主因であり、保証範囲を変えないtest固有timeout調整がbatch化より小さい。
- H3: 上記で説明できないcaseだけが存在する場合に限り、単一launcher/Hook/process/configured経路またはhistorical baselineを追加調査する。

## Research Plan

- Round 1 Query: 正本Plan、AGENTS、PROJECT_CONTEXT、PLANS、関連ADR、最近のRun、Issue/PR、最新main・merge base・差分・環境を固定する。
- Round 2 Query: 指定された順にfocused baseline → file → `test:contracts` → 必要時のみ `test` / `verify` を実行する。再現したcaseだけを、#140の6 launcher総時間、matrixの各Node invocation、またはPlan指定のproduction/historical測定へ進める。
- Exit Criteria:
  - 再現caseと境界、各caseのtimeout/所要時間、環境条件をRun Artifactへ記録する。
  - 原因がtest-onlyで閉じる場合はproductionへ進まず、保証範囲を維持する最小修正を採用する。
  - production異常がなければHook/configを変更しない。現行コードで因果を閉じられない場合だけhistorical比較を段階的に行う。
  - Plan §1/§9/§10の必須検証、Windows CI判断、Sanitizer後確認を満たすか、未達を具体的blockerとして記録する。

## Approach

- 手順1: strict Runを初期化し、branch/PR、最新 `origin/main`、merge base、working tree、環境情報を記録する。
- 手順2〜3: デフォルトreporter・現行timeoutで#140の2件とmatrixを各2〜3回focused実行し、file → `test:contracts` → 必要時のみ `test` → `verify` の再現境界を固定する。
- 手順4: #140が再現した場合だけ、helper外側から6回の`runWindowsLauncher()`総時間を測り、3回累積で説明できるか判定する。説明できればproduction内部調査を打ち切る。
- 手順5: matrixが再現した場合だけ、`runNodeHook()`の所要時間と実Hook entrypoint保証を確認し、test固有timeout調整と既存batch helper再利用を比較する。保証範囲を変えない方を優先する。
- 手順6〜8: test-onlyで閉じない異常がある場合だけ、必要な単一process/configured経路を測定し、最後の手段としてPR #139 baseを段階比較する。
- 手順7/9以降: 実測に対応する最小修正のみを行い、修正前再現経路とPlan指定の連続検証、CI確認、Sanitizer、最終scope確認を行う。

## Definition of Done

- 正本Planの#140 2件、matrix、その他Hook timeoutの再現結果と共通/別原因の判断を根拠付きで説明できる。
- Windows/Node/pnpm/PowerShell/Gitのversion・path、`process.execPath`とPowerShell側Node解決、branch/HEAD/merge base/working treeを記録する。
- source/test/configを変更した場合、対象contract file 3回連続、`pnpm run test:contracts` 3回連続、修正前に再現した経路、必要条件の `pnpm run test` / `pnpm run verify` を成功させる。
- timeout変更時は修正前の同一条件の生値（min/median/max）と設定値・余裕幅の根拠を記録する。30秒値を根拠なく流用しない。
- policy case、assertion、fail-closed、Windows transportを弱めず、一時計測/raw timing/一時ファイルを最終source差分へ残さない。
- Web CI `Vitest (contracts)`を確認し、Windows CI追加要否を最終原因に基づいて判断・記録する。
- Run ArtifactのSanitizer Write/Check後に `pnpm run lint:markdown`、`git diff --check`、`git status --short` を実行する。
- commit/push/PR本文更新/merge/Issue closeは行わない。

## Risks / Unknowns

- 5秒launcher系、15秒matrix系、PR #133のその他caseを一括して同一原因と扱わない。
- 測定自体がtimingへ影響するため、verbose・一時計測・`--testTimeout=30000`は性能基準から分離する。
- suite/verify前段failureをWindows timeoutの成功/失敗に数えない。連続同一failureはPlanの停止条件に従う。
- Windows CIは実装前に決めず、原因・修正・既存Ubuntu検出可能性・維持コストを比較してから判断する。

## Thinking Log

- 2026-09-12: PR #144のhead `a618a29...`はPR base `12fff8e...`を12 commit先行し、branch差分は指定Planのみ。`origin/main`をfetchして確認した。
- 2026-09-12: Issue本文が参照する `.codex/runs/20260911-232344-JST/`はこのworkspaceに存在しなかった。既存の関連Run（2026-09-03/05）とADR-0016/0020/0021を確認し、履歴として扱う。
- 2026-09-12: ここまでproduction、test、config、CIのsource変更は行っていない。次はPlan手順2の標準focused baselineへ進む。

## 最終確認・反映の追加方針（2026-09-12）

- ユーザーの最終指示により、実装差分・active Run Artifactの最終レビュー、Issue #142のみのcommit、対象branchへの明示push、PR #144本文更新までを今回のRunへ追加する。
- merge、Draft化、Issue #142 / #140のclose、Issue #140 branchへの変更、無関係な修正は行わない。
- PR本文では、matrix timeoutとその他Hook timeoutについて「今回のRunでは再現せず、#140の5秒aggregate timeoutとの共通原因を確認できなかったため変更対象外」と記述し、別原因を証明したとは記述しない。
- push後はremote HEAD、PR state、PR本文、GitHub Actionsの新head結果を確認し、CIが実行中の場合は完了まで状態を監視する。
