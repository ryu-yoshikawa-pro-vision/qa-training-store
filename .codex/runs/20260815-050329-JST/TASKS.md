# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. PLANを確定する
- [x] 2. repo docs / remote PR / local entry pointsを調査し、STATE Aを判定する
- [x] 3. CLIのRegistry list、batch manifest validation、all-or-nothing applyを実装する
- [x] 4. Native CIのsingle/all captureとbatch artifact uploadを実装する
- [x] 5. contract testsとpackage scriptを追加・修正する
- [x] 6. format/lint/typecheck/spec/native/contract validationを実行する
- [x] 7. Run artifactを更新し、sanitizerを実行する
- [x] 8. HANDOFF_A_PUSH_REQUIREDを出す、またはremote push済みならSTATE Bへ進む

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [ ] D1. push後にremote workflow gate、Actions dispatch/watch、artifact download、apply、materialize、Final validationを実行する。
- [ ] D2. 実capture後に代表6画面のPNG/WebPを目視確認し、canonical profile以外の画像はpromotionしない。
- [x] D3. State B dispatchを実行し、Run `31841614738`の最初の失敗をprofile normalizationまで特定する。
- [x] D4. API34 locale normalizationを最小修正し、local contract/format/related validationを再実行する。
- [x] D5. 修正をユーザーがpushした後、新HEADでState B remote gateとbatch dispatchを再実行する。
- [ ] D6. 同一runの25/25 artifact/APKを検証・apply・promotion・status transitionし、代表6画面を目視確認する。
- [ ] D7. materializeとFinal Visual Gate/verify/最新CIの完了を確認し、HANDOFF Bまたはmerge readinessを報告する。
- [x] D8. Expo DoctorのSDK 57 patch mismatch 7件と`expo-constants` overrideを同期し、local quality gatesを再実行する。
- [x] D9. Run `31850993052`のprofile normalization failureを完全ログで分類し、capture未実行・Artifact不採用を確認する。
- [x] D10. `setprop persist.sys.locale`のAPI34権限拒否だけをbest-effort化し、strict locale/profile validationを維持したlocal validationを完了する。
- [ ] D11. locale patchをユーザーがpushした後、新HEADでState Bのremote gate、dispatch、capture、apply、promotionを再実行する。

## Blocked

- B1. なし（現時点では実装を継続可能）。

Progress: 74% (14/19)
