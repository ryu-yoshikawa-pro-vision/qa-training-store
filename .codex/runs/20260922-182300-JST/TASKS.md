# Tasks（タスク）

## 完了

- [x] 1. Issue #130と既存Planを再確認する。
- [x] 2. 再レビュー時の最新`main`を確認し、Native CI関連差分がないことを確認する。
- [x] 3. Phase 6後のPR #133でNative CIへ入った追加修正を確認する。
- [x] 4. GitHub Actions Reusable Workflowの公式仕様を確認する。
- [x] 5. Repository rulesetのrequired status checkを確認する。
- [x] 6. Android buildのshell helper案とReusable Workflow案を比較する。
- [x] 7. Production Bundle Guardを既存validatorへ寄せる方針へ修正する。
- [x] 8. runtime helperを独立した変更理由がある4責務へ絞る。
- [x] 9. workflowへ残すinline処理と理由を明記する。
- [x] 10. change detectionを通常PR経路とmanual visual経路に分ける。
- [x] 11. 検証計画、完了条件、リスク、対象外を更新する。
- [x] 12. 保存PlanとRun Artifactを同期し、実装・PR作成へ進まず終了する。

## 発見事項

- Phase 6後のPR #133でも`native-ci.yml`へlauncher stabilizationが追加され、Issue #130の問題が現在も継続している。
- `android-maestro-run.sh`は通常Android Runtimeで利用されるが、現在のNative change detection対象外。
- manual visual pathは通常PRでruntime実行されないため、通常`native_changed`へ追加しても変更箇所のruntime検証にはならない。
- Android buildの2 jobは約200行ずつあり、Gradle commandだけのhelper化よりReusable Workflowへbuild responsibilityを移す方がIssue #130の目的に合う。
- Production Bundle Guardは既存`validate-native-production-bundle.ts`が意味上の正本であり、新しいshell wrapperは不要。
- `main-protection`のrequired status checkは`validate`のみ。

## ブロック中

- なし。
