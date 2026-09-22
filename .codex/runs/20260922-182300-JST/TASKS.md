# Tasks（タスク）

## 完了

- [x] 1. 最新`main`とPlan branchの状態を再確認する。
- [x] 2. Android Automation / Production buildの現行差異を実コードから再確認する。
- [x] 3. Reusable Workflow inputを`build_kind`だけへ絞る。
- [x] 4. caller / calledの責務と`concurrency`禁止条件を明記する。
- [x] 5. Automation / ProductionのABI検証、Save / Verify順、Gradle log、Evidence差異を維持契約として記載する。
- [x] 6. Production Bundle Guardをshell adapter + 既存validatorの責務へ戻す。
- [x] 7. `android_adb_root`をworkflowへ残し、visual profile helperの境界をNormalize stepへ限定する。
- [x] 8. no-change skipを静的contract、Remote CIを`native_changed=true`へ分ける。
- [x] 9. change detection、contract test、実行タスク、検証、完了条件、リスクを同期する。
- [x] 10. 保存PlanとRun Artifactを更新し、実装・PR作成へ進まず終了する。

## 発見事項

- Reusable WorkflowへArtifact名をinputすると`build_kind`との矛盾状態を作れるため不要。
- Automation / Production buildは共通処理が多いが、ABI検証・Save / Verify順・Evidenceに現在の非対称性がある。
- 同じReusable Workflowを2回呼ぶため、called workflowへ同一`concurrency`を置くと相互cancelのリスクがある。
- `validate-native-production-bundle.ts`は`.hbc`のHermes policy ownerとして既に責務が明確で、APK ZIP展開まで持たせる必要はない。
- `android_adb_root`は後続stepのoutcome条件と環境変数を作る独立stepであり、Normalize helperへ吸収しない方が単純。
- 実装PR自身がNative pathを変更するため、同じPRで`native_changed=false`をRemote実測できない。

## ブロック中

- なし。
