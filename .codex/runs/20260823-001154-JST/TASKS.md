# Tasks

## Now

- [x] 1. 最新main・作業ブランチ・依存・Native CI・baseline Doctorを確認する
- [x] 2. 実装前計画とRun Artifactを保存する
- [x] 3. package.jsonの7対象と`expo-constants` overrideをpatch alignmentする
- [x] 4. pnpm-lock.yamlを必要範囲だけ再生成し、差分を監査する
- [x] 5. `pnpm install --frozen-lockfile`とExpo Doctorを再実行する
- [x] 6. 指定local validation（Native component、route、EAS、typecheck、lint、format、markdown、diff check）を実行する
- [x] 7. 可能なら`pnpm run test`を実行し、failureの因果を分類する
- [x] 8. 最終差分、Run Artifact、Sanitizerを確認する
- [ ] 9. commit／push／PR作成とremote Native CIを確認する
- [ ] 10. 最終判定、未完了事項、次アクションを記録する

## Discovered

- D1. Baseline Doctorのconfig schema checkがExpo APIへの接続timeoutで失敗。patch mismatchとは別に、修正後の再実行で再分類する。

## Blocked

- なし
