# PR #210 製品レビュー・受入

## Objective

最新PR #210 HEADの49ファイル差分を正式仕様・独立レビュー・Web/Native実行証拠と照合し、既知の未決仕様と未実施受入を明示したマージ前判定を行う。

## Scope

- In: `product/scenario-shop-maintenance`のPR #210全差分、Checkout・認可・Cart/在庫・決済・管理機能、共通ツール・安全性差分、正式仕様、既存CI、WSL2/Bash Web E2E、Native CI/Maestro/build/device evidence。
- Out: PR #210のmerge、main/PR #199/他PRの変更、外部決済、実顧客データ、未決仕様の推測による変更、新しいテスト基盤や外部レビューサービス。

## Assumptions / Ambiguity

- 作業開始時HEADは`7b0eaae1494afeef97f63048fb30cf9e50bbb4ed`。
- `origin/main`は`ddc451a7079bbc75cd1d6623f5ae1e4647caf635`。PR merge元からPR #227で進んだが、追加差分はPR #210と`AGENTS.md`のみ重なる。
- CI #44911578084 / #44911578122 は指定HEADで成功。CI成功は製品受入完了を意味しない。
- Native住所直接入力はユーザーが正式許可。`checkout-and-payment.md`へ反映済み。任意住所2行目の入力・表示と回帰を確認する。Webの登録済み住所選択は維持する。
- Android emulator/CIと実端末、iOS buildとiOS実機を区別する。

## Research Plan

1. Git/PR/CIと差分全体を確認し、差分分類と最新baseとの関係を固定する。
2. 独立read-only reviewersに製品backend、Web/Native、共通safetyを分担し、仕様・呼出経路・状態不変・テストを照合する。
3. Web/Mobile CI job/step/test suitesとartifactsの実際のcoverageを既存コマンド/設定から確認する。
4. WSL2/Bashの4つの指定Web E2Eを実行し、失敗はfirst failureから原因分類する。
5. Nativeのcomponent、Maestro、Android/iOS build、視覚・端末証拠を整理し、利用できる範囲のみ実行する。
6. Findingsを確定した後、仕様確定済みで安全な実不具合があればbounded repair-loopと独立再レビューを行う。
7. Follow-upとRun REPORTへ意味のある結果を追記し、artifact sanitization/security/Git状態を確認して判定する。

## Definition of Done

- 49ファイルすべてが差分分類され、コードレビューのfindingまたはno-finding根拠・残余範囲がある。
- 受入済みBR/AC、未受入BR/AC、未決判断、DB/version不変の実証範囲を区別する。
- Web実行結果とNative CI/runtime/build/device evidenceを、HEAD・環境・実際のtest scope付きで記録する。
- 実施していない画面/端末/視覚項目は未検証と明記する。
- PR #210をmergeせず、残る人間判断とマージ可否を根拠付きで結論する。

## Risks / Unknowns

- Native Checkoutの直接入力を認めるユーザー判断を受領。Webとの意図された差として扱う。住所2行目のfield-level実装・画面証拠は確認中。
- Branchは最新mainの#227を取り込んでおらず、最新base上のCI証拠ではない。
- 実端末またはiOS simulatorが使えない場合、視覚・実機受入は未完になる。
- Test concurrencyが本物のinterleavingを証明するか、逐次2回実行かを個別に判定する。

## Current Evidence

- Saved plan: `docs/plans/2026-11-21_235837_pr210-product-acceptance-review.md`
- PR head at review start: `7b0eaae1494afeef97f63048fb30cf9e50bbb4ed`
- PR status: open/unmerged; 49 changed files; GitHub mergeable; no inline review comments at start.
- Main update: `ddc451a7079bbc75cd1d6623f5ae1e4647caf635` (`#227`), added 15 paths; overlap with this PR is only `AGENTS.md`.
- Existing Web CI #44911578084 and Mobile App CI #44911578122 are successful at the target HEAD.

## Branch update authorized by user

- 2026-11-22: commit `37d5977c33b05e4c1cbd590fce9ae27c83e8b8fd` was created with existing Git hooks enabled and pushed normally to `origin/product/scenario-shop-maintenance`; no force push or PR merge.
- At post-push verification, PR #210 remained open/unmerged and its head matched the pushed SHA. The worktree was clean with zero unresolved paths.
- For commit `37d5977c33b05e4c1cbd590fce9ae27c83e8b8fd`, `wait_for_required_ci` returned Web failure #44925761465 while Mobile was still in progress; the subsequent push superseded those runs, so neither is latest-head evidence.
- Commit `054749f34d83eee2a7ccd018352b6ca655c934b7` updated CI: Web run #44927140722 success; Mobile run #44927140741 failure at Android Runtime / Maestro. Three flows could not locate `native-checkout-address-next`; Native static, Android automation/production builds, Production Bundle Guard and iOS automation/production-validation simulator builds were successful. The CI waiter returned `ci_failure` for this expected SHA.
- A read-only UI reviewer traced the shared flow gap: the flows did not all wait for the address session-ready marker and none scrolled the CTA into view. The screen gained an optional address-line-2 field before the CTA. Without a failure hierarchy, the exact immediate trigger (session timing or viewport visibility) is not proven. The three affected flows now wait for the marker and scroll to the CTA, retaining all assertions. Independent re-review found no issue; targeted flow contract tests and format check pass. At this point the next-head CI was pending; its completed result is recorded below.
- Commit `e3a9d130dd2ab9f79e6399f3df055e70465a18ce` is the latest code SHA and its CI passed: Web #44931433280 (27 success, 2 skipped) and Mobile #44931433660 (10/10 success). Android Runtime / Maestro job `136933362584` passed all 17 flows, including the three repaired flows. Current PR head at check: `e3a9d130dd2ab9f79e6399f3df055e70465a18ce`, open/unmerged, mergeable, 57 changed files, zero review threads.
- A Checkout tax-line policy decision is awaiting user response. The PR may be updated and CI checked, but do not declare product acceptance or merge readiness while this policy remains unconfirmed.
- The documentation update commit `f22ca7b0065f47411661b6e3b4b8e62a2111b9fb` was pushed normally after verifying its parent matched the PR/remote head. `wait_for_required_ci` observed the expected SHA: Web CI #44935568922 success (27 jobs success, 2 skipped), Mobile App CI #44935569071 success (10/10 jobs). The PR description now records the current evidence and unresolved acceptance items; PR #210 remains open/unmerged.
