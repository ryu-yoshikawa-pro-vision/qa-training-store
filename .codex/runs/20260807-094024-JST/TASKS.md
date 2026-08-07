# Tasks

## Now
- [x] 1. PLANを確定する
- [x] 2. 既存実装・文書・CI・テストとsubagent調査結果を確認する
- [x] 3. サニタイザのfinding出力、EOL/alias/long JSONL契約を修正する
- [x] 4. Nativeのstable testID、hydration、Maestro assertionと低層永続化テストを修正する
- [x] 5. Native CIのPersistence and Boundary 5 flowを個別stepへ分割する
- [x] 6. Native文書、PROJECT_CONTEXT、ADR、Run Artifactを更新する
- [x] 7. focused validation、品質ゲート、可能な実機検証を実行する
- [x] 8. 選定Run ArtifactをWrite+Checkし、REPORT/evaluationを確定する

## Discovered
- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. ユーザー指示の論理Native flow名と現行repoの実ファイル名が一致しないため、現行5 flowへマッピングする。
- D2. サニタイザの共通EOL helperとalias boundaryは前回修正済みだが、構造化bounded finding出力と追加fixtureが未完了である。
- D3. 物理実機/Expo Doctorの前回結果は別Runに記録済み。今回の変更後に再実行可否を判定する。
- D4. 初回修正APKのRuntimeSuiteで、画面外にある追加成功メッセージを文字列assertionしたため2 Flowが失敗した。stable testIDとscroll assertionへ最小修正し、再検証で解消した。
- D5. Native component testはformat/contractとの並列実行時に一度timeoutしたが、単独再実行では成功した。最終品質ゲートは単独の正式入口で完了した。

## Blocked
- なし。初回Buildの容量不足はユーザーの容量確保後に解消し、Build以降の実機検証まで完了した。
