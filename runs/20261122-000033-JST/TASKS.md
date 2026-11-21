# Tasks

## Now

- [x] 1. PR branch/HEAD/main/PR stateとreview Runを初期化し、対象範囲を確定する。
- [x] 2. 49ファイル差分分類と正式仕様・製品経路の独立コードレビューを完了する。
- [x] 3. 同一HEADのWeb/Mobile CI job・実test scope・artifactを照合する。
- [ ] 4. WSL2のE2E環境制約を分類し、E2E selector repairを含む最新HEADのWeb CIでrequired/cross-role/a11y/mobile-boundaryを確認する。
- [ ] 5. 修正を含む最新Native CIのcomponent/Maestro/buildを確認し、visual/device未実施の範囲を正確に分類する。
- [x] 6. 確定した不具合をbounded repair-loopで修正し、影響範囲の静的検査と独立再レビューを完了する（E2E実行はtask 4の最新CI確認に含む）。
- [ ] 7. Follow-up/REPORTを確定更新し、sanitizer/security/Git差分を最終確認する。
- [ ] 8. CI修復を対象PR branchへ通常commit/pushし、更新後のPR HEADでrequired CIを取得する。
- [ ] 9. 仕様判断・未実施項目・PR merge前判定を報告する（PR mergeはしない）。

## Discovered

- `origin/main`はmerge後にPR #227で1 commit進んだ。追加15パスのうち重複は`AGENTS.md`だけ。branchのmain追従状況とCIのbaseはPR head CIと区別する。
- Native住所直接入力の許容はユーザー回答済み・仕様反映済み。任意住所2行目の入力・snapshot・確認表示は実装とcomponent/SQLite回帰で確認済み。Canonical Android画像は古いため視覚受入は未完了。
- 独立レビューで5件の契約不備、1件のE2E assertion gap、さらに再現された認可/Cart version raceとNative UI表示の問題を修正。修正後のbackend/UI read-only re-reviewで追加findingなし。
- Playwright Chromium 1234は導入済みだが、修正前のWSL local実行はLinux host library不足でbrowser起動前に失敗。required 36件に製品操作到達なし、残るE2E 3 suiteは未実行。最新HEAD CIでの代替確認が残る。
- `CustomerReviewUseCases`の認可失効と`setAddress` / `setPayment`のCart version不一致を決定的fixture interleavingで再現。拒否結果とDB state不変を確認する回帰テストを追加し、integration/repository testsでPASS。
- Commit `37d5977c33b05e4c1cbd590fce9ae27c83e8b8fd`のWeb CI #44925761465ではrequired Chromium E2Eが1 assertionで失敗。guest cart toastと新Checkout開始通知の両方がstatus領域に出たため、既存テストの単一role=status locatorが2件に一致した。製品通知は保持し、テスト側を通知別に識別する修正を行い、独立再レビューは指摘なし。新HEAD CI待ち。

## Blocked

- Android canonical visual capture用のworkflow dispatchはGitHub MCPに操作がなく、ローカル`gh`も無効credentialとnetwork制限で利用不可。参照画面の更新・視覚比較に必要なartifactが未取得。
- Android/iOS実機、Android SDK/emulator、iOS simulatorがWSL環境にない。physical-device / iOS runtime受入は未実施。
