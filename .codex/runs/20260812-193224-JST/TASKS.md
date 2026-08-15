# TASKS

## Now

- [x] 1. 入口文書、関連ADR、直近Run、対象Plan、Current spec / validator / generator / app / UI Review / Native経路を読む
- [x] 2. Wave 0/1のCurrent rebaselineと安全な変更面を`docs/plans/`とRun PLANへ記録する
- [x] 3. Screen Catalog / ownership / Important State grammarをNormative Specへ実装する
- [x] 4. typed Capture Registryと既存UI Review setupの共有接続を実装する
- [x] 5. Web capture / WebP promotion / canonical asset budgetを実行する
- [x] 6. Markdown / Generated HTML image supportとsafe asset copyを実装する
- [x] 7. Spec / route / ownership / state / target / case / asset 4-way validatorとcontract testsを実装する
- [x] 8. Android canonical capture契約、Native CI dispatch integration、必要なNative evidenceを実装・実行する
- [x] 9. Documentation / ADR / PROJECT_CONTEXT / historyを更新する
- [ ] 10. 全Validation、self-review、scope audit、Run Artifact sanitizer、Android release markerを完了する

## Discovered

- [x] D1. Current route / state / capture到達性の再走査で、旧Native route inventoryのplaceholder記録とCurrent Native route実装の差分を確認し、Currentを採用する
- [x] D2. Android / Web runtime上でNormative SpecとCurrent UIが不一致になったTargetはProduct Fixへ昇格せずblocked記録へ分離する

## Blocked

- B1. Canonical API34 Android 25 targetは、localがAPI30 ARM physical deviceのみで、API34/google_apis/x86_64/Pixel 2 canonical runtimeが未実行。明示Virtual Store修正後のlocal API30 Build/Install/Smoke/Suiteは通過したが、canonical CI successful Runとpromotionは未完了。
- B2. Web checkout processing targetはCurrent routeがfailedへ解決され、Normative processing UIのProduct Fix別PRが必要。

## Resolved

- [x] B3. Prettier baselineは`pnpm run format`で意味非変更整形し、`pnpm run format:check`と`pnpm run verify`をPASSへ回復した。
- [x] B4. Review FlowはMaestro-MCPの段階診断で、先頭から7件目への`speed: 10`タイムアウトと物理日本語IMEの非同期dismiss raceを分離した。最初のscrollを`speed: 50`へ変更し、`hideKeyboard`後にanimation待機とIME表示時だけの条件付きBackを追加した結果、標準Native入口で1/1 PASSした。

Progress: 90% (9/10)
