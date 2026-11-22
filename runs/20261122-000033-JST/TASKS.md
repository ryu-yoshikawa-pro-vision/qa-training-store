# Tasks

## Completed earlier in this Run

- [x] PR branch/HEAD/main/PR stateとreview Runを初期化し、対象範囲を確定する。
- [x] 49ファイル差分分類と正式仕様・製品経路の独立コードレビューを完了する。
- [x] 同一HEADのWeb/Mobile CI job・実test scope・artifactを照合する。
- [x] WSL2のE2E環境制約を分類し、E2E selector repairを含む最新製品HEADのWeb CIでrequired/cross-role/a11y/mobile-boundaryを確認する（`e3a9d130`のWeb CI success）。
- [x] 修正を含む最新製品HEADのNative CI component/Maestro/buildを確認し、visual/device未実施の範囲を正確に分類する（`e3a9d130`のMobile CI success、17 Maestro flow pass）。
- [x] 確定した不具合をbounded repair-loopで修正し、影響範囲の静的検査・targeted contract test・独立再レビューを完了する（full Maestro CIはtask 5で確認）。
- [x] Follow-up/REPORTをCI evidence・残受入事項で更新し、sanitizer/security/Git差分を最終確認する（format・security・sanitizer・diff check PASS）。
- [x] 受入記録を対象PR branchへ通常commit/pushし、更新後のPR HEAD `f22ca7b0`でrequired CIを取得する（Web/Mobile success）。
- [x] 仕様判断・未実施項目・PR merge前判定をPR本文と最終報告へ記録する（PR mergeはしない）。

## Now

- [x] 1. 最新HEAD `613a754e`、PR #210のOpen状態、`origin/main`、clean worktreeを再確認する。登録済みAndroid caseの実パラメータも`describe-case`で確認する。
- [x] 2. 税額表示の承認済み方針を現行仕様、DTO、pricing、Web/Nativeの表示、既存テストと照合する。仕様・実装の一致を確認し、受入記録を更新する。
- [x] 3. `maestro/native-purchase.yaml`の住所2行目入力・IME中/確認画面の証拠追加を独立read-only reviewし、既存assertionを保ったままflow契約テストを実行する。
- [x] 4. Follow-up/受入計画/Run記録を住所2行目・税額方針に同期し、sanitizer/security/format/spec validationを実行する。
- [x] 5. 受入記録と既存Maestro flowを8ファイルのみstageし、通常commit/pushとPR本文更新を行い、HEAD `f96a45e3`のWeb/Mobile required CIを確認する。両方success。
- [ ] 6. Android keyboard screenshotで確認した住所2行目のIME重なりを修復し、Native component回帰・独立再レビュー・Android pixel確認を完了する。第2修正後もAndroid Runtime画像で重なりが再現し、キーボード表示完了後の再スクロールを加える最終bounded iteration中。
- [x] 7. 最終修復差分のみstageし通常commit/push後、最新HEADのWeb/Mobile required CIと住所入力Maestro flowを確認する。HEAD `d30fd725`のWeb/Mobile CIとAndroid Runtime/Maestroは成功したが、IME表示中のpixel条件は未達。
- [ ] 8. 修復済み最終HEADからGitHub UIでユーザーが単発Android visual captureをdispatchし、同一runのvisual artifact/APKを取得・検証する。
- [ ] 9. canonical画像と正式仕様を比較し、必要なら登録済み`default`画像のみpromote、実行・仕様検証を再実行する。
- [ ] 10. PR本文とRunへcapture/CI結果・未実施項目を記録し、最終の作業ツリー・PR HEAD・マージ前判定を確認する。
- [x] 11. `13ee1f9a`で失敗したNative PurchaseのIME/Back状態依存をMaestro flowだけで修復し、commit `07ec3934`を通常push後、最新HEADのWeb/Mobile CIとAndroid Runtime artifactを再取得・確認した。両CI・flow成功、IME overlapは未受入。

## Discovered

- `origin/main`はmerge後にPR #227で1 commit進んだ。追加15パスのうち重複は`AGENTS.md`だけ。branchのmain追従状況とCIのbaseはPR head CIと区別する。
- Native住所直接入力の許容はユーザー回答済み・仕様反映済み。任意住所2行目の入力・snapshot・確認表示は実装とcomponent/SQLite回帰で確認済み。Canonical Android画像は古いため視覚受入は未完了。
- 独立レビューで5件の契約不備、1件のE2E assertion gap、さらに再現された認可/Cart version raceとNative UI表示の問題を修正。修正後のbackend/UI read-only re-reviewで追加findingなし。
- Playwright Chromium 1234は導入済みだが、修正前のWSL local実行はLinux host library不足でbrowser起動前に失敗。required 36件に製品操作到達なし、残るE2E 3 suiteは未実行。最新HEAD CIでの代替確認が残る。
- `CustomerReviewUseCases`の認可失効と`setAddress` / `setPayment`のCart version不一致を決定的fixture interleavingで再現。拒否結果とDB state不変を確認する回帰テストを追加し、integration/repository testsでPASS。
- Commit `37d5977c33b05e4c1cbd590fce9ae27c83e8b8fd`のWeb CI #44925761465ではrequired Chromium E2Eが1 assertionで失敗。guest cart toastと新Checkout開始通知の両方がstatus領域に出たため、既存テストの単一role=status locatorが2件に一致した。製品通知は保持し、テスト側を通知別に識別する修正を行い、独立再レビューは指摘なし。新HEAD CI待ち。
- Commit `054749f34d83eee2a7ccd018352b6ca655c934b7`のWeb CI #44927140722はsuccess。Mobile App CI #44927140741はAndroid Maestroの3 flowが`native-checkout-address-next`の未検出で失敗し、その他のNative static/build/Production Bundle GuardとiOS buildsはsuccess。3 flowのsession-ready待機とCTA scrollを補い、既存assertionを維持。独立reviewは指摘なし。targeted YAML contract tests 78件とformat checkはsuccess。最新CI再実行が残る。
- Latest code SHA `e3a9d130dd2ab9f79e6399f3df055e70465a18ce`: Web CI #44931433280 passed (27 success, Extended E2E mobile-chromium and deploy-production skipped); Mobile App CI #44931433660 passed (10/10 jobs). Required Chromium E2E, cross-role, accessibility and mobile-boundary passed. Android Runtime / Maestro job `136933362584` passed all 17 flows including purchase, payment retry, session restart and production validation. Android automation/production builds, Native Static, Production Bundle Guard, iOS automation/production-validation simulator builds and iOS verify passed. No physical device or iOS simulator runtime was used.
- Current verified head `613a754ec92ab0cd03c3fa408a61ef5fc89ec97c`: PR open/unmerged, remote head matches, Web CI #44938734407 and Mobile App CI #44938734490 success. This is prior to the new Maestro evidence change.
- `docs/spec/features/checkout-and-payment.md` already records the approved no-separate-tax-line display policy. Existing pricing DTO and Web/Native UI use subtotal, member discount, shipping, and total only. No tax implementation change is authorized or needed.
- `SCREEN-CHECKOUT-ADDRESS/default/android.webp` was visually inspected and is stale: it omits the current empty optional `建物名・部屋番号（任意）` input between line 1 and phone. The registered case is an empty default state; the existing purchase/restart flows add supplemental Japanese input, keyboard, return/restart and confirmation evidence. The flow reviewer found no issue and the 78 targeted flow-contract tests passed; Android runtime evidence is pending the latest Mobile CI.
- The workflow pins Maestro 2.8.0. Current official `inputText` documentation and the pinned implementation support Japanese Unicode on Android since 2.7.0. An older compatibility page/search result said Unicode was unsupported; that statement does not apply to this pinned version. No clipboard workaround or flow change is needed; Mobile CI must still confirm execution.
- The first pushed visual-evidence head `f96a45e3feda3e50880a2a90a4d6e5b57484d63f` passed Web/Mobile CI. Runtime artifact screenshots confirm Japanese line-2 entry, return, app-restart restoration, and confirmation rendering, but the keyboard-open screenshot shows the IME overlaying the field's lower edge and part of the input text. This is a confirmed Native UI issue and is now in a bounded repair loop; repeat Android CI after the repair.
- Latest repair HEAD `d30fd725f29898701b726b3dc5413c235bdda539` passed Web CI #44981409676 and Mobile App CI #44981409641; Android Runtime/Maestro job `137085547600` succeeded, including purchase and session-restart flows. Same-run artifact `native-android-runtime-evidence-44981409641` (ID `14738885970`) is tied to this source SHA. The typed Japanese value survives return/restart and is shown once after address line 1 in confirmation. Its keyboard-open screenshot still has the line-2 field and part of its text behind the IME; its SHA-256 is identical to the prior repair screenshot.
- The `commands.json` sequence shows input and the screenshot while the keyboard is open. Maestro/device log records IME `onShown` at 03:59:03.820 and 03:59:05.470; the screenshot starts at 03:59:06.757, so this is not an early-capture artifact. No app callback/scroll trace is present to distinguish callback non-delivery from a still-incorrect scroll calculation. The three scoped scroll repairs have made no pixel progress; repair decision is `stop_no_progress`, with no further speculative scrolling change.
- On docs-only HEAD `13ee1f9a`, Web CI #44984564223 succeeded; Mobile CI #44984564190 failed when `native-purchase` looked for the address-next CTA after `hideKeyboard`. The screenshot before that command showed the Checkout CTA while the IME was already hidden; the later failure hierarchy was Cart. A flow-only retap/wait repair passed 78 related contract tests and independent review, but awaits new Android Runtime evidence.
- Repair HEAD `07ec3934`: Web CI #44990802514 and Mobile App CI #44990802546 succeeded. Android Runtime job `137114080802`, `native-purchase`, and Session Checkout Restart passed. The new keyboard screenshot proves the flow reopens IME and continues, while still showing line-2 clipping; visual acceptance remains failed.

## Blocked

- Android canonical visual capture用workflow dispatchはGitHub MCP/CLIから実行できない（connectorはread-only、保存済み`gh` credential無効）。ユーザーからdispatch run IDは受領していない。canonical visual artifact/APK未取得のため比較とcanonical更新は保留。
- Android/iOS実機、Android SDK/emulator、iOS simulatorがWSL環境にない。physical-device / iOS runtime受入は未実施。
