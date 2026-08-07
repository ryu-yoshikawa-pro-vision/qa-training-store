# Tasks

## Now
- [x] 1. PLANを確定する
- [x] 2. 指定資料・実装・CI・Schemaを調査し、CI failureをtriageする
- [x] 3. サニタイザーの行分割・固定Redaction・診断出力を修正する
- [x] 4. PowerShell FixtureとSanitization Contractを強化する
- [x] 5. Native検索FlowとContractを修正する
- [x] 6. 方針文書・Run Artifactを実態に合わせて更新する
- [x] 7. PowerShell 5.1/7、Focused Contract、Native Static相当、Verify、サニタイズを検証する
- [x] 8. REPORT/evaluationを確定し、Remote CIをNOT RUNとして完了判定する

## Discovered
- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. `Add-CodexKnownPathFindings`にも`-split '\r?\n', -1`があるため、専用Helperの適用範囲を確認する
- D2. 指定Run ArtifactのAlias残存とJSON/JSONLのParse状態をWrite前に確認する
- D3. `expo-doctor@1.17.6`は依存マニフェスト一致後も、プロジェクト`.npmrc`のpnpm virtual store設定に起因する環境依存の1件を報告する。`expo install --check`はPASS。対応は隠蔽ではなく評価・Remote再確認へ記録した。

## Blocked
- （なし）
