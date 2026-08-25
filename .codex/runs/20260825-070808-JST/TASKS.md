# Tasks

## Now

- [x] 1. 初期状態、PR/Issue/Alert、R2差分、既存CI failureを固定する
- [x] 2. repair planとallowed scopeを確定する
- [x] 3. Issue #54本文、前Run Artifact、evaluation/run manifestを最新事実へ同期する
- [ ] 4. PR #58本文をR2/local validation/CI状態へ同期する
- [x] 5. dependency差分不変、local validation、Artifact sanitizer/schemaを確認する
- [ ] 6. 明示stage、commit、ordinary pushを行う
- [ ] 7. 新headのCIを確認し、同一headのfailed jobsを1回だけrerunする
- [ ] 8. rerun後のjob単位結果、Maestro実flow、独立failureを判定する
- [ ] 9. 最終CIをGitHub metadataへ記録し、merge可否を判断する
- [ ] 10. REPORT/evaluation/runを完了し、brace-expansionで停止する

## Discovered

- D1. 同一headの既存Mobile App CIはNative StaticとAndroid Automation Buildの2つがroot gate failureである。
- D2. `Android Runtime / Maestro` jobのsuccessはAutomation APK依存flowの実行成功を意味しない。
- D3. `native-ci / verify`はNative Static、Production Bundle Guard、Android Automation Build、Android Production Build、Android Runtime、Native iOSを要求する集約gateである。

## Blocked

- なし（rerun後に同一failureが再現した場合も、別Issueへ分離してmerge判断を明示する）。
