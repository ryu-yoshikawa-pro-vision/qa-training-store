# Tasks

## Now

- [x] 1. Repair findingをtriageし、allowed scopeと非目標を確定する
- [x] 2. Registry、setup、capture flow、seed、Normative specificationを再確認する
- [x] 3. Address mapping、regular-member active session不在、Payment／Confirm／Category契約を確認する
- [x] 4. format、markdown、spec、typecheck、lint、targeted contract、Native componentを実行する
- [x] 5. full contract／full testの結果を切り分け、repository／web componentを個別確認する
- [x] 6. build、native static、Final Visual Gate、Android runtime可否を確認する
- [x] 7. REPORT、run.json、sanitizerを更新し、Final DoDを判定する

## Discovered

- [x] D1. full contractは222/222 testsまでPASSしたが、`serve-web-dist`のWindows Temp cleanupでEPERMが発生した
- [x] D2. full testのmany-products／web componentは既定timeoutを超えたが、単独suiteは全件PASSした
- [x] D3. `build:web`は別worktreeの長時間Native buildとcurrent Expo export processが残る環境でtimeoutしたため、processを停止せず記録する

## Blocked

- B1. API34 `google_apis`／`x86_64`／`pixel_2` canonical emulatorがローカルにないため、Android runtime／canonical capture／promotionは未実行

Progress: 100% (10/10)
