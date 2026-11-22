# PR #210 製品レビュー・受入計画

## 目的

`product/scenario-shop-maintenance` のPR #210について、最新HEADの全差分、正式仕様、独立レビュー、既存CI、Web/Nativeの実行証拠を照合し、未受入条件とマージ可否を根拠付きで判定する。

## 現在の理解

- 作業開始時のHEADは`7b0eaae1494afeef97f63048fb30cf9e50bbb4ed`。作業branchは`product/scenario-shop-maintenance`で、作業ツリーはclean。
- `origin/main`はPR merge元の`581fac744cd8fe575e36cb070114f406d8b91288`から`ddc451a7079bbc75cd1d6623f5ae1e4647caf635`へPR #227で進んでいる。追加差分はPR #210と`AGENTS.md`の1パスだけ重なる。今回、main取り込みやPR mergeは行わない。
- PR #210の指定HEADに対し、既存Web CI #44911578084とMobile App CI #44911578122はいずれも成功。これは仕様受入・実機受入の代替ではない。
- Checkout仕様にはWebの登録済み住所選択とNativeの住所直接入力の差がある。2026-11-22、ユーザーがNativeの未保存住所直接入力を正式に許可。仕様へ反映し、任意の住所2行目の入力・保存snapshot・確認表示をテストで確認する。Webは登録済み住所選択を維持する。
- 住所2行目を含む更新後Native画面のcanonical Android screenshotが古く、視覚受入は未完了。2026-11-22、ユーザーはCheckoutで税額を独立明細に表示しない方針を承認済み。現行DTOと表示を維持し、税額計算やフィールドは追加しない。

## 前提・非目標

- 実課金、実データ、個人情報、秘密情報は使わず、既存のtest fixture・seed・ローカルモックを使用する。
- レビュー中は実装を変更しない。指摘を確定した後、仕様が確定済みで安全に直せる不具合だけ、repair-loopへ切り替えて対象を限定する。
- main、PR #199、他PR、PowerShell互換コード・テスト、セキュリティ保護、既存assertionは変更しない。
- 新しいテスト基盤や重複仕様・受入正本は作らない。必要な結果は既存follow-up計画とRun Artifactへ記録する。
- 実機・シミュレーターを利用できない場合、CI emulator/build evidenceと区別して未実施として残す。

## 対象範囲

- PR #210の49ファイル全差分を製品実装、正式仕様、製品テスト、共通ツール・安全性、設定・運用文書、計画・Run Artifactへ分類する。
- 認証・認可失効、Checkout Session / Cart version、支払・冪等性、金額・在庫、管理更新、Web/Nativeの共通契約をコード・テスト・BR/ACで照合する。
- GitHubのPR metadata、レビュー状態、最新HEADのWeb/Mobile jobとjob stepsを取得し、CI coverageと限界を整理する。
- 指定されたChromium E2E、cross-role、accessibility、mobile-boundaryをWSL2/Bashで実行し、実行環境・build kind・mode・seed・base URLを記録する。必要なら既存artifactとtraceを確認する。
- Nativeは既存component、Android Runtime/Maestro、Android/iOS build evidenceを評価し、利用できる実行環境で不足する既存検証だけ追加する。CI buildやemulatorを実機確認とは扱わない。

## 進め方

1. Git branch/HEAD/main/PR差分/レビューとRun状態を再確認し、この計画と今回のreview Runを初期化する。
2. PR差分と正式仕様、呼び出し元・Repository・transaction・Web/Native画面・回帰テストを確認し、独立read-onlyレビューを完了する。
3. 最新HEADのWeb/Mobile CI job、step、テスト範囲および既存Playwright/Maestro/visual artifactsを確認する。
4. WSL2/Bashの既存E2Eを順次実行し、失敗は最初の原因から追跡する。外部決済・製品データを使わない。
5. Native runtime/deviceの利用可否を確認し、既存手順で検証可能な範囲を実施する。利用不可は具体的な未実施範囲・必要環境を残す。
6. レビューfindingを確定し、必要な場合だけrepair-loopのbounded iterationを実施して独立再レビューと影響範囲テストを行う。
7. Checkout仕様差と他の未決事項を受入済み項目から分離し、既存follow-up記録・Run REPORTを更新する。sanitizer/security checks後にGitとCI証拠を最終確認する。

## 検証計画

- PR head / CI / review metadata: GitHub read-only API。対象SHAとrun IDを各結果に記録する。
- Local E2E: `pnpm run test:e2e:chromium`、`pnpm run test:e2e:cross-role`、`pnpm run test:a11y`、`pnpm run test:e2e:mobile-boundary`。WSL2 Ubuntu/Bashと実際のPlaywright build/test settingsを記録する。
- Native evidence: `pnpm run test:component`の既存HEAD結果、Android Runtime/Maestro job artifacts、Android/iOS automation・production-validation builds。実端末検証は環境を確認して個別に判定する。
- コード変更が発生した場合は、変更範囲に対応するtypecheck、integration、component、repository、E2E、security、format/buildを再実行する。
- Run Artifact更新後は既存sanitizerと`pnpm run security:check`を実行し、差分検査・unmerged path確認を行う。

## リスク・未決事項

- Nativeの直接入力ポリシーはユーザー承認済みで、住所2行目の任意入力と確認表示を追加済み。既存Android正本画面参照は住所2行目を表示していないため、更新後のcanonical captureを視覚確認する必要がある。
- PR #210のHEADは現在の`origin/main`から#227分遅れている可能性がある。#227は主に共通Hook/runtime変更で、今回の受入中に自動で取り込まない。最新base上のCI証拠と混同しない。
- Commit `37d5977c33b05e4c1cbd590fce9ae27c83e8b8fd`のWeb required CI #44925761465は`e2e/web/ui-ux-improvements.spec.ts:98`のrole=status strict-mode衝突で失敗した。Cart transfer toastと新Checkout開始通知の2件を同じlocatorが選んだため、製品表示は維持し、該当通知を個別に識別するtest selectorへ修正。別のread-only reviewerが2 assertion維持とlocatorの明確さを確認し、追加findingなし。新HEAD CIは未完了。
- `054749f34d83eee2a7ccd018352b6ca655c934b7`のWeb CI #44927140722はsuccess。Mobile CI #44927140741ではAndroid Maestro job `136922330221`内の3 flowが全て`native-checkout-address-next`を見つけられず失敗。Native Static、Android automation/production build、Production Bundle Guard、iOS automation/production-validation buildはsuccess。独立read-only reviewでは、3 flowにaddress session-ready待ちとCTA scrollが不足していることを確認。新たに追加したNative住所2行目のためCTAが画面外になった可能性もあるが、失敗時Hierarchyは確認できず直接トリガーは未確定。3 Maestro flowへ待機とスクロールを追加し、既存assertionを維持。別レビュアーは変更に指摘なし、targeted contract tests 78件とformat checkはsuccess。新HEAD CIで再確認する。
- Linux/CI環境でiOS simulator、物理Android/iOS端末が得られない場合、画面・視覚・実機の実証は未完了となる。
- 修復後のcode SHA `e3a9d130dd2ab9f79e6399f3df055e70465a18ce`はWeb CI [#44931433280](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/44931433280)とMobile App CI [#44931433660](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/44931433660)がsuccess。Webは27 jobs success、`Extended E2E (mobile-chromium)`と`deploy-production`がskip。Chromium required/cross-role/accessibility/mobile-boundary、Vitest unit/integration/component/repository/contracts、build/verify等がsuccess。Mobileは10/10 jobs success。Android Runtime/Maestro job `136933362584`で17 flowsすべてsuccessし、native-purchase、native-payment-retry、native-session-checkout-restartを含む。Native Static、Android automation/production builds、Production Bundle Guard、iOS automation/production-validation simulator builds、iOS Native CI Verifyもsuccess。これらはemulator/build evidenceであり実機/iOS runtime evidenceではない。
- GitHub CLIの保存認証は無効で、通常shellからのGitHub API接続はsandbox DNS/network制限を受ける。GitHub connectorにworkflow dispatch機能がない場合、canonical visual captureは未取得として記録する。Windows/WSL設定・権限・sandboxは変更しない。
- 同時更新の状態不変は、既存integration testのinterleavingが実際に証明する範囲と、単なる連続呼出しを区別する。

## 完了判定

- 独立レビューfindings、仕様照合、CI coverage、実行済みWeb/Native範囲、状態不変の証拠、未検証と人間判断を個別に報告する。
- 未検証・未決の項目をPASS扱いしない。
- PR #210をmainへmergeしない。作業branchへの通常commit/pushは、既存のGit safety規約とユーザーの明示承認に従う。

## Android視覚受入の追加作業（2026-11-22）

- 税額表示判断は承認済み。正式仕様、`calculateOrderTotals()`、`CheckoutConfirmationDto`、Web/Nativeの4項目表示が一致するため、実装変更は不要。Checkout税額の独立明細を表示しないことは本プロジェクトの表示契約であり、一般的な税務要件の判断ではない。
- Android canonical `SCREEN-CHECKOUT-ADDRESS/default/android` は空欄の任意住所2行目欄が欠落している。default状態は空欄のplaceholderを表示するため、正確なAPI 34 canonical profileのCI captureだけで更新する。
- 登録済みcapture caseは住所2行目を入力しない。既存の `maestro/native-purchase.yaml` に限り、テスト用日本語住所を入力し、IME表示中と確認画面のスクリーンショットおよび既存IDの値assertionを追加する。入力済み画像をdefault canonicalへ昇格しない。
- CIはMaestro 2.8.0をpinする。現行公式`inputText`仕様は2.7.0以降のAndroid日本語を含むnon-ASCII入力をサポートし、pin版の実装もUnicode経路を持つ。古い互換性記述を見て入力方法を変える必要はない。flow contract 78件と独立read-only reviewは完了したが、実Android CIでの確認はこれから行う。
- `native-ci.yml` のcapture workflow dispatchは必須。通常のLinux側 `gh` 認証は無効で、GitHub接続にdispatch操作がないため、最終HEADをpushしてCIを確認後、ユーザーへGitHub UIから単発dispatchを依頼する。token/secretは要求しない。
- Allowed files: `maestro/native-purchase.yaml`、`maestro/native-session-checkout-restart.yaml`、`docs/plans/2026-11-01_pr210-product-followups.md`、本計画、`runs/20261122-000033-JST/PLAN.md`、`runs/20261122-000033-JST/TASKS.md`、`runs/20261122-000033-JST/REPORT.md`、QA charter/snapshot/findings、既存Android canonical画像1点（manifest検証後のみ）。PR本文更新は最新検証完了後。
- Validation: 該当Maestro flow契約テスト、Native component/既存住所保持テスト、`validate:spec`、visual final validation、`build:spec`、format/security、sanitizer、Git差分確認。commit/push後のWeb/Mobile required CIを同一HEADで確認し、captureではraw PNG・manifest・Automation APKの同一run/source/profile/hashを検証する。Maestro screenshot/JUnitは既存 `native-android-runtime-evidence-<run_id>` Artifactを利用し、CI設定の追加変更は不要。
- Runtime recheck: HEAD `f96a45e3feda3e50880a2a90a4d6e5b57484d63f` のWeb CI #44972608948 / Mobile App CI #44972608972はsuccess。Mobile job `137059323442`の`native-purchase`と`native-session-checkout-restart`がsuccessし、日本語入力、戻り、アプリ再起動後の復元、確認画面のartifact screenshotを取得した。ただしkeyboard-open screenshotでIMEがline 2 field下部に重なる問題を確認。focused-input scrollを追加するbounded repairを行い、最新HEAD Android runtimeを取り直す。通常CIではcanonical capture stepがskipのため、default canonical image比較/更新は未完了。
- Runtime repair update: 独立reviewでReact Native scroll helperのScrollView-local field Yとkeyboard screen Yの原点差が指摘された。`getNativeScrollRef().measureInWindow()`のScrollView window Yを追加offsetへ含める第2修正を行い、Native component 48 tests PASS、独立read-only re-reviewで新findingなし。typecheck PASS。新headのAndroid Runtime pixel confirmation、registered visual artifact/APK/manifest verificationは引き続き必要。
- Runtime pixel recheck: repair HEAD `75f649a35d8d646e5d9e0e4342d21f1b92312c84`のWeb CI #44977825833 / Mobile App CI #44977825780はsuccess（Android Runtime/Maestro job `137075464249`を含む）。Artifact `native-android-runtime-evidence-44977825780`のkeyboard screenshotでも入力欄と日本語文字の一部がIMEに重なり、視覚条件は未達。React Nativeの`keyboardDidShow`後にScrollView helperを再実行する限定修正と、最終headでの再撮影が必要。canonicalは変更しない。
- Keyboard timing repair: focus targetを保持して`onKeyboardDidShow`後に測定済みScrollView window Y + spacingで再スクロールする。keyboardが既に表示済みならfocus時の即時経路を使う。Native component 90 tests / typecheck / format PASS、独立read-only reviewは新規findingなし。Android Runtime pixelsでのみ視覚条件を最終確認する。
- Android Runtime final check at d30: Web CI #44981409676 and Mobile App CI #44981409641 succeeded; job `137085547600` and same-run runtime artifact `14738885970` correspond to source SHA `d30fd725f29898701b726b3dc5413c235bdda539`. Maestro confirms Japanese line-2 entry, return, restart restoration, and one confirmation display after line 1. Keyboard-open screenshot still shows the line-2 field/text covered by the IME. Device logcat records IME `onShown` before screenshot, so this is not an early capture. The keyboard screenshot SHA is identical to the previous repair run; callback-vs-scroll-coordinate cause remains unobserved in available logs. Bounded repair decision: `stop_no_progress` after three scroll repairs. No additional speculative source change.
- Remaining acceptance: GitHub UI dispatch for registered `SCREEN-CHECKOUT-ADDRESS/default/android` has not been obtained; normal push CI skipped Screen Catalog capture, so same-run manifest/raw PNG/Automation APK/profile validation and canonical comparison/update are incomplete. Current canonical is stale and omits the optional line-2 field; update only from validated registered default capture. Physical Android and iOS runtime were not run. Merge is not recommended while keyboard visibility and canonical comparison remain unaccepted.

## 2026-11-22 最新HEAD CI再確認

- Tax display decision: user-approved policy is reflected in the formal Checkout specification and prior acceptance record. `calculateOrderTotals()`, `CheckoutConfirmationDto`, and Web/Native confirmation views already show subtotal, member discount, shipping, and total only; no tax implementation change is required.
- At documentation-only HEAD `13ee1f9a8f484a7ed4d1c38a5e8f50063de1faee`, Web CI #44984564223 succeeded and Mobile App CI #44984564190 failed in Android Runtime/Maestro `native-purchase`. Japanese line-2 entry and its assertion passed. After the screenshot, an unconditional `hideKeyboard` sent Android Back after the IME had already disappeared; the subsequent hierarchy was Cart, so `native-checkout-address-next` was absent. The Android production-validation build's initial Gradle plugin resolution failure passed when the same job was rerun (`137099066375`).
- A test-flow-only repair in `maestro/native-purchase.yaml` retaps `native-checkout-line2` after the value assertion and waits up to 5 seconds for animation completion before the existing keyboard screenshot. The original `hideKeyboard`, CTA scroll/tap, and order-confirmation assertions remain. The 78 related contract tests and Prettier/diff checks passed; independent read-only re-review found no new issue. This runtime behavior has not yet been revalidated on Android.
- The d30 Android screenshot remains a visual acceptance failure: the IME covered the lower edge of the optional line-2 field and part of its text. The bounded product scroll repair stopped after three no-progress pixel checks; no further product change was made. The `SCREEN-CHECKOUT-ADDRESS/default/android` GitHub workflow dispatch could not be performed from the available environment and no run ID was obtained. The stale canonical lacks the empty optional line-2 field and remains unchanged pending a validated same-run capture, manifest, profile, and APK.
- Merge status: not accepted. Latest-head CI after the flow repair, registered default screenshot/canonical comparison, and physical-device/iOS runtime evidence remain outstanding. Do not treat CI success alone as visual acceptance.

## 2026-11-22 Android Runtime follow-up — HEAD `07ec39347ef764260eac6b90b26081665b5610a2`

- Web CI #44990802514 and Mobile App CI #44990802546 succeeded for the expected/observed PR HEAD. Android Runtime/Maestro job `137114080802` succeeded; Native Purchase XML reports SUCCESS on `native-api34`. Artifact `native-android-runtime-evidence-44990802546` (`14741574872`) belongs to the same workflow run/head. `apk-sha256.txt` records Automation APK SHA-256 `edf36c83ccba7a0260257dd03ab839889aaeb324d6b1283cd3451d9d0691a439`.
- The repaired flow now reopens the IME after Unicode entry, captures the keyboard state, dismisses it, finds/taps the address-next CTA, returns to the address screen, confirms line-2 retention, proceeds through payment, verifies confirmation, and completes the order. Relevant commands all completed. The confirmation screenshot shows `青山ビル101` once after line 1 and only subtotal/member discount/shipping/total.
- **Visual acceptance remains failed**: keyboard screenshot SHA-256 `049b7ea08ea0ad2c3f630667d559a71a46d5dbdc6a69f52f5e8525cd4d57587c`, 1080×1920, shows the Android keyboard covering the lower part of the optional line-2 input and some text. This repairs the Maestro flow failure, not the previously observed product overlap.
- The user could not initiate the requested UI `workflow_dispatch`; no registered `SCREEN-CHECKOUT-ADDRESS/default/android` run ID or raw visual-capture artifact exists. Normal push CI skips Screen Catalog capture. The existing default canonical lacks the optional empty line-2 field and remains unchanged; profile-matched canonical comparison/promotion is still blocked. Physical Android and iOS runtime acceptance also remain unverified.
- **Merge recommendation: no.** Tax display is resolved by the approved no-separate-tax-line policy; line-2 storage/confirmation works, but the keyboard-open visual contract and canonical comparison remain unaccepted.

## 2026-11-22 Android視覚受入・最終CI確認

- Tax display is accepted: Checkout shows subtotal, member discount, shipping, and total only. The formal spec, `calculateOrderTotals()`, `CheckoutConfirmationDto`, Web/Native views, and existing tests agree; no tax implementation change was needed.
- At latest checked HEAD `0ea9cd3315f9331fe1115985733948b3889a47f6`, Web CI [#44993416238](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/44993416238) passed. Mobile App CI [#44993416249](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/44993416249) initially failed both Android builds while Gradle could not resolve plugins/artifacts. Retrying only those failed jobs succeeded; Android Runtime/Maestro job `137129234648`, iOS Simulator builds, Production Bundle Guard and `native-ci / verify` succeeded. `wait_for_required_ci` observed the expected HEAD and returned success. The retry's runtime evidence artifact `native-android-runtime-evidence-44993416249` (`14744372796`) belongs to the same branch/head. The initial log did not include an HTTP status, so the transient external dependency resolution classification is based on same-job retry success, not a proven outage.
- Android Runtime evidence at code HEAD `07ec39347ef764260eac6b90b26081665b5610a2` confirms Japanese line-2 input, return and confirmation rendering. Keyboard-open screenshot SHA-256 `049b7ea08ea0ad2c3f630667d559a71a46d5dbdc6a69f52f5e8525cd4d57587c` (1080×1920) still shows the IME covering the lower field edge and part of the text. Visual acceptance therefore remains **FAIL**, regardless of the passing Maestro flow. The confirmation screen shows line 2 once after line 1 and only the approved four amount rows.
- The registered `SCREEN-CHECKOUT-ADDRESS/default/android` workflow dispatch could not be performed from the available agent environment; `gh` authentication was invalid, the GitHub connector did not expose dispatch, and the user reported being unable to start it from UI. No run ID exists. Therefore the registered capture manifest/raw PNG/profile/APK/source-SHA validation and canonical comparison were not done. The existing default image remains unchanged and visibly stale because it lacks the optional empty line-2 field. No unverified Runtime image was promoted as canonical.
- The latest Mobile CI used an Android API 34 emulator. Physical Android interaction and iOS runtime interaction remain unverified; iOS Simulator build success is not runtime acceptance.
- **Merge recommendation: no.** Required CI is green at the latest checked HEAD, but the visible IME overlap and missing registered canonical capture/comparison keep Android visual acceptance incomplete. The approved tax decision is closed; no tax-related user decision remains.

## 2026-11-22 Android IME修復・Screen Catalog受入

- 修復HEAD `79eadf9fc0479f9c63ef5e64bd6caeffcc8b3f` のMobile App CI #45009590998でAndroid Runtime/Maestroと登録済みScreen Catalog captureがsuccess。Web CI #45009590974もsuccess。CI waiterは両runのexpected/observed HEAD一致を確認した。PR #210はOpen・未merge。
- Android Runtimeの同run evidenceでは、住所2行目にフォーカスした画面、`青山ビル101`入力後のIME表示画面、戻り画面、注文確認画面、およびsession restart後の復元画面を確認した。入力欄と日本語文字はIME表示中も全体が視認でき、戻り後・restart後も値を保持する。確認画面では住所2行目が住所1行目の次に一度だけ表示される。Maestroは住所2行目の再入力、キーボード表示、次画面、戻り、支払い・注文確認を含むAndroid Runtimeでsuccess。旧画像で欄を覆っていたGboard Clipboard UIは再現せず、新しいIME中画面でも欄は隠れない。初回focus画像のAndroidキーボードレイアウト選択表示も欄を覆っていない。
- Screen Catalog raw artifact `native-android-screen-catalog-visuals-45009590998`（artifact ID `14749473171`）とAutomation APK `native-android-apk-45009590998`（`14749767587`）は同じMobile CI runから取得。workflow eventは`pull_request`、PR headは`79eadf9f...`、manifest `source_commit_sha`は実際のGitHub merge ref `eac384aab0a2653acb2129ad1a228bc9295d79be`。値の書換えはしていない。manifest、batch manifest、GitHub run metadataでcase `SCREEN-CHECKOUT-ADDRESS/default/android`とrun IDが一致する。APK実体SHA-256 `510c47fded22b026f39b4828876fa5f38f8842b4167cd4363be0657e2bda9583` はcase manifestとruntime evidenceの値に一致する。Screen Catalog artifact ZIP digestは`ef9505e25b1aaace40fe4e958fd9ef6ae8def4f6b03fe0006f0ca56545a6bed0`、APK artifact ZIP digestは`12397c6b5150d9904fd61bc4e8971b9d4e96b600d79a52fc67d074705c2e3d66`。
- Android canonical profileはAPI 34 / `google_apis` / `x86_64` / `pixel_2` / `ja-JP` / font scale 1 / Light / Portrait / 1080×1920 / density 440。raw PNGは1080×1920で、SHA-256 `7b5a13abaa2b847514748d8fd7c4e04920310fbeda98a1c550cd92bd922da319`。既存default画像は現行仕様にある空の任意住所2行目欄（住所1行目と電話の間）を欠いていたため、検証済みの同case raw PNGを既存`promote`でcanonicalへ反映した。住所入力済み状態はdefault canonicalへ混ぜていない。
- 住所2行目のfocus時に旧実装はfocus targetをキーボード表示イベントで破棄し、IME反映後のレイアウトを再測定していなかった。修正後はフォーカス対象を保持し、`onKeyboardDidShow`後の次animation frameでScrollView window座標を再測定してスクロールし、blur/unmountでは解除する。Native componentは13 suites / 91 tests PASS。製品テストのassertionを削除・弱体化していない。
- Checkout税額は独立明細を表示しない承認済み方針のまま。正式仕様、`calculateOrderTotals()`、`CheckoutConfirmationDto`、Web/Native表示の既存契約を再確認し、実装変更なし。Session/Cart/version、未保存住所、注文snapshotについて既存回帰を維持する。
- captureを有効にするためのPR #210限定workflow条件と、その一時契約テストは撮影後に元のworkflow_dispatch専用条件へ復元した。最終差分では一時条件を残さない。
- Android Emulatorでの視覚受入はPASS。物理Android端末およびiOS runtime操作は今回のCI Emulator結果とは区別し、未実施として記録する。CI build成功を実機操作へ読み替えない。
