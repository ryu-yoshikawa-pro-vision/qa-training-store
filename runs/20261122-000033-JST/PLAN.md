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
- The user approved omitting a separate tax line in Checkout. The policy matches the formal spec, DTO, pricing function, Web/Native renderers and existing tests; no tax implementation change is needed. Android keyboard-overlap visual acceptance and the registered canonical capture/comparison remain unresolved.
- The documentation update commit `f22ca7b0065f47411661b6e3b4b8e62a2111b9fb` was pushed normally after verifying its parent matched the PR/remote head. `wait_for_required_ci` observed the expected SHA: Web CI #44935568922 success (27 jobs success, 2 skipped), Mobile App CI #44935569071 success (10/10 jobs). The PR description now records the current evidence and unresolved acceptance items; PR #210 remains open/unmerged.

## Android visual acceptance continuation (2026-11-22)

- Approved display policy: Checkout shows subtotal, member discount, shipping, and total only. The spec, pricing function, DTO, Web/Native renderers, and existing tests already agree; do not add tax computation/model fields.
- The existing Android default canonical is stale because it omits the optional empty address-line-2 field. Keep the registered default case empty and promote only from its validated API 34 canonical capture. Treat a populated line 2 as supplemental execution evidence, not a new canonical state.
- Scope includes the two existing Native purchase/restart Maestro flows, acceptance records, current Run artifacts, and (only after evidence validation) the single registered Android WebP. No production-code, CI upload, or new capture framework change is needed: the existing runtime evidence collector copies all Maestro output directories and JUnit files into the run-specific Android runtime evidence Artifact.
- The two existing purchase/restart Maestro flows add Japanese line-2 input, keyboard, return/restart and confirmation screenshots, with exact line-1/line-2 assertions. Existing checkout/payment/order assertions remain. The workflow pins Maestro 2.8.0; current official documentation and the pinned implementation support non-ASCII Android `inputText` since 2.7.0. An older compatibility page suggested otherwise, but it does not apply to this pinned runner. The existing flow-contract tests passed; actual Android execution remains pending latest Mobile CI.
- Before Runtime interaction: use the validated charter mission from this task (Native Checkout address at Android API 34 emulator; regular-member seeded flow; inspect default capture and Japanese line-2 entry/confirmation; do not write product data outside seeded test environment; stop after the registered capture and current purchase Maestro flow; no external payment). Current capture case and profile must be revalidated from the registry/manifest.
- GitHub API dispatch cannot be performed with available tools (`gh` credential invalid; GitHub connector has GET/read but no workflow dispatch). After normal commit/push and same-head Web/Mobile CI, request a one-time user workflow_dispatch from the GitHub Actions UI using `capture_spec_visuals=true` and `capture_case_key=SCREEN-CHECKOUT-ADDRESS/default/android`; then validate same-run manifest, APK digest, profile, PNG decoding, and source SHA before visual comparison or promotion. The typed-state Maestro screenshots are available from the same run's existing `native-android-runtime-evidence-<run_id>` Artifact.
- If no dispatch/artifact is returned, keep the canonical unchanged and report visual acceptance blocked. Never alter source SHA/APK digest metadata to synthesize provenance.
- The first new-head Android runtime artifact revealed an actual issue: while the line-2 field is focused, Android IME covers its lower edge and part of the text. Repair the existing `PurchaseKeyboardScrollView` / focused-field behavior and add Native component regression before requesting capture from the repaired HEAD. Preserve the current canonical until a validated matching-profile capture is available.
- The first repair iteration was independently reviewed and found to omit the NativeShell ScrollView window origin from React Native's keyboard scroll offset. The second iteration measures `getNativeScrollRef().measureInWindow()` and adds that Y coordinate to the spacing; targeted Native tests and typecheck pass, and independent re-review found no new issue. Post-repair Android Runtime pixels remain required before deciding whether to promote the default canonical.
- Runtime recheck at `75f649a35d8d646e5d9e0e4342d21f1b92312c84`: Web/Mobile CI and all Maestro flows passed, but the keyboard screenshot still shows IME overlap. The scroll helper must run after Android `keyboardDidShow` supplies keyboard metrics; one final scoped repair is in progress. Do not treat prior CI success as pixel acceptance.
- Final scoped repair retains the focused target and reruns the measured-origin scroll after React Native's `keyboardDidShow` callback, with immediate handling when keyboard metrics already exist. Native purchase-screen 49 tests, full Native component 90 tests, typecheck, format, and independent read-only review pass; final Android Runtime pixels remain required.

## Updated execution path (2026-11-22, supersedes the manual-dispatch step above)

- The user explicitly requested no Android Studio, no GitHub UI action, and no credential setup. Use the existing `pull_request` event, not `workflow_dispatch`, for this one capture.
- A temporary guard in `native-ci.yml` enables the existing Screen Catalog capture only for a case-sensitive match of PR #210, exact head branch `product/scenario-shop-maintenance`, and same-repository PR. Event fields enter Bash only through environment variables. The case is fixed to `SCREEN-CHECKOUT-ADDRESS/default/android`; existing manual-dispatch inputs, `contents: read`, checkout credential protection, normal CI, and artifact upload remain.
- Once the capture artifact is validated and its canonical comparison is complete, restore the workflow and contract test to their prior manual-only form in a subsequent commit. Do not retain a PR-specific capture trigger.
- Repair HEAD `79eadf9fc0479f9c63ef5e64bd6caeffcccb8b3f` has been pushed normally. `wait_for_required_ci` is running. Do not claim visual success until same-run Android Runtime/Screen Catalog screenshots are decoded and visually inspected.
- The previous sandbox contract run failed `EPERM`; trusted execution resolved the process/localhost restrictions. Windows PowerShell was then auto-detected from WSL PATH and its six UNC path tests failed `GetFullPath`. The test suite was rerun with only this shell's `/mnt/c/*` PATH entries filtered, preserving Linux Node/pnpm/Git; 803 passed and 7 skipped, including the six PowerShell cases. Do not remove Windows compatibility tests.
