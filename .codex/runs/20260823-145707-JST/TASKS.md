# Tasks

## Now

- [x] 1. 対象Plan・入口文書を確認し、active Run `20260823-145707-JST`のPLAN / TASKS / REPORT / run.jsonを初期化する。
- [x] 2. 直近Run・差分・Android preflight・Runtime利用条件を確認し、Native再現仮説と証跡保存先を確定する。ADB実機が`unauthorized`であることを確認し、後続Build/Installを停止した。
- [x] 3. Nativeを報告Runtimeで再現する。DoctorとADB状態確認で端末認証が成立せず、Runtime操作はBlockedとした。
- [x] 4. 画像から外側へlayout境界を追跡し、期待幅を最初に壊している直接原因を特定する。Runtime未接続のため原因layerは特定不能と記録し、推測修正を行わない。
- [x] 5. 実RuntimeでImage自身がpadding内側幅を越える直接原因を特定後、`styles.productImage`へ`maxWidth: "100%"`だけを最小適用し、`aspectRatio` / `resizeMode`は変更しない。
- [x] 6. 現在のworking treeを含むAPKをInstallし、Plan指定の代表画面であるHome hero / Catalog card / Product Detailを修正後Runtimeで再確認した。
- [x] 7. 変更箇所に対応する既存Native targeted test `pnpm run test:component:native`を実行し、13 suites / 62 tests passedを確認した。
- [x] 8. Native結果に関係なく、Web UI Reviewをbefore stageで2 route × 2 viewport実行し、overflowとscreenshotを確認する。retry stageでPASSした。
- [x] 9. Webが再現した場合だけ既存Web code / testを最小修正し、after stageで同じ2 route × 2 viewportを再確認する。390/320のscreenshot確認で非再現と判定し、変更しない。
- [x] 10. production / test code変更時は`pnpm run verify`、変更なし時は`pnpm run lint:markdown`を実行し、結果を分類する。`lint:markdown`は今回差分外の既存Planの末尾改行違反でFAILした。
- [x] 11. REPORT / TASKS / run.jsonを更新し、Run Artifact sanitizerのWrite / Checkを実行して完了判定する。端末認証は解消し、今回差分外のbaseline lint failureだけを未通過gateとして記録する。

## Discovered

- 作業中に実行必須となったタスクはここに追記する。
- [x] D1. 端末許可後にDoctorとAndroid Build前preflightを再実行し、実機・Toolchain・容量・生成状態を確認する。
- [x] D2. `android/`がないため、既存helperでNative ProjectをPrepareする。Nested Alias + `CI=true`条件でPASS。
- [x] D3. Prepare後のGradle preflightがPASSした場合だけ、現在のworking treeを含むRelease APKをBuildする。Virtual Store / Gradle / device preflight PASS、Buildへ進む。
- [x] D4. Build成功後にInstall → Smoke → `native-test-control.yaml`を実行し、上流失敗時は後続を止める。
- [x] D5. 現在のAPKを実機でHome → Catalog → Product Detailの順に操作し、商品画像と直接親から外側へ幅を追跡して直接原因を特定する。特定不能なら修正しない。
- [x] D6. 原因特定時の最小修正・修正後Runtime・targeted test・必要な`pnpm run verify`・Run Artifact更新を行う。`verify`は今回差分外の既存PlanのMD047で停止したため、baseline failureとして記録した。

## Blocked

- 実Runtime / UI Reviewが評価不能になった場合は、原因・確認済み範囲・未実施検証をここへ記録する。
- B1. Native実機がADB `unauthorized`で、端末側RSA許可後でなければ実Runtime再現・原因特定・修正後確認を実施できない。
- B2. `pnpm run lint:markdown`が既存の`docs/plans/2026-08-23_113300_mobile-web-image-overflow.md`のMD047でFAILした。今回の差分には当該Plan変更がなく、無関係な整形修正は行わない。

解消記録:

- B1は端末側RSA許可後にDoctor / preflightがPASSし、実機Runtime確認まで完了した。初期Blocked記録は履歴として保持する。

## Repair iteration 1

- [x] D7. 現在のレビュー指摘を`must_fix`に分類し、repairのallowed filesをNative画像component・対応test・Active Run Artifactへ限定する。
- [x] D8. React Native Androidのstatic `Image` source寸法注入と、Product Detail ImageViewの実機boundsを照合して、固定heightが`aspectRatio`を無効化する直接原因を確定する。
- [x] D9. 注入されたstatic heightを`height: "auto"`で解除し、既存`aspectRatio`を使う契約testを最小追加する。
- [x] D10. 修正を含むAPKでInstall / Smoke / Product Detailを再確認し、Home / Catalogのshared style影響も確認する。
- [x] D11. 既存Web UI Reviewを新stageで再確認し、Native変更によるWeb影響がないことを確認する。
- [x] D12. targeted test、`pnpm run verify`、Run Artifact sanitizerを実行し、repair iterationを記録する。

Progress: 100% (23/23)

## Repair iteration 2: quality gate policy and delivery

- [x] D13. 対象Planのsingle trailing newlineを修正し、品質ゲート失敗時の必須対応ルールをAGENTS.mdへ追記する。
- [x] D14. 修正後に`pnpm run lint:markdown`と`pnpm run verify`を実行し、全品質ゲートPASSを確認する。
- [x] D15. Active Run Artifactを更新し、sanitizerのWrite / CheckをPASSさせる。
- [x] D16. ユーザー指定のcommitを作成し、`fix/mobile-web-image-overflow`をoriginへpushする。

Progress: 100% (27/27)

## Repair iteration 3: review指摘の矛盾整理

- [x] D17. `AGENTS.md`の品質ゲートFAIL対応を§7の例外と§8の単一ルールへ整理し、§8.1の重複記載を削除する。
- [x] D18. `run.json`の旧「今回差分外」warningを最終状態に合う事実表現へ修正し、JSON parseを確認する。
- [x] D19. `pnpm run lint:markdown`、`git diff --check`、`pnpm run verify`、Run Artifact sanitizerを実行する。
- [ ] D20. 変更差分を確認してcommit / pushし、PR #49のHEADとrequired CI完了状態を確認する。

Progress: 97% (30/31)
