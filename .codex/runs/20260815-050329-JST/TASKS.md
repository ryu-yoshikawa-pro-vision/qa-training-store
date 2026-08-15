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
- [x] D12. Run `31852971377`の第二のroot権限 failureを確定し、`adb reboot`への最小workflow修正とlocal validationを完了する。
- [x] D13. ユーザーpush後のremote HEAD/workflowを再確認し、実効locale（`cmd activity get-config`）のrootless strict観測を追加してlocal validationを完了する。
- [x] D14. Run `31855909379`のNormalization failureをruntime evidenceで分類し、`dumpsys activity activities`による非root実効locale観測へ最小修正してlocal validationを完了する。
- [x] D15. Run `31860166187`のlocale normalization failureを実効Configurationのruntime evidenceで確定し、設計レビュー停止条件へ分類する。
- [x] D16. ユーザー確定のStrategy A/Bに基づき、実測adb root分岐とSettings UI fallbackを実装し、effective locale strict gateを維持する。
- [x] D17. locale provisioning変更のlocal format／workflow contract／full contract／native／typecheck／lint／spec validationを実行する。
- [x] D18. 必要ファイルを明示stageして対象branchへcommit/pushし、remote HEAD一致を確認する。
- [ ] D19. 新HEADでprofile normalization、25件capture、artifact検証、promotion、Final Gate、最新CI確認まで完了する。（remote gate確認済み、dispatch待ち）
- [x] D20. Run `31868358969`のNormalization failureを完全ログで分類し、rootless観測後の`settings` service readiness不足を最小修正する。
- [x] D21. Run `31869442478`の`not found`部分一致を特定し、settings service readiness matcherを厳密一致へ修正してlocal validationを完了する。
- [x] D22. Run `31870391806`でeffective locale/profile PASS後に発生したAutomation APKのmonkey起動failureをmanifest確認で分類し、明示MainActivity起動へ最小修正する。
- [x] D23. Run `31871497815`の最初のbatch capture failureを完全ログで分類し、空のsetup subflow pathがMaestro parserで拒否されることを確定する。
- [x] D24. setup意味論を変えずに空subflow用の無操作flowへ解決する最小修正とcontract/local validationを完了する。
- [x] D25. Run `31873026259`のprofile PASS後Automation起動failureを同Run APK／manifest／runtime evidenceで分類し、package resolver readiness不足を確定する。
- [x] D26. install後のlauncher activity resolver readinessを厳密に待つ最小修正とlocal validationを完了する。

## Blocked

- B1. なし（実装上の未解決ブロッカーはない）。
- B2. 解消済み（ユーザーがStrategy A: 実測adb root、Strategy B: Settings Locale UI、effective Configuration strict gateの設計を確定）。

Progress: 80% (24/30)

Progress: 81% (26/32)

Progress: 82% (28/34)
