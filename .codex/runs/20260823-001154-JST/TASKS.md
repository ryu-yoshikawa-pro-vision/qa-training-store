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
- [x] 9. commit／push／PR作成とremote Native CIを確認する
- [x] 10. 最終判定、未完了事項、次アクションを記録する

## Discovered

- D1. Baseline Doctorのconfig schema checkがExpo APIへの接続timeoutで失敗。patch mismatchとは別に、修正後の再実行で再分類する。
- [x] D2. 現行Issue #59、既存HEAD、origin、旧PR #47の状態を再確認する
- [x] D3. 現行Expo CLI／Expo Doctor契約を実測し、7 packageの期待値を確認する
- [x] D4. 7 direct dependency、`expo-constants` override、lockfileを最小範囲で更新・安定化する
- [x] D5. frozen install、Expo contract、Native Static相当を実行する
- [x] D6. format、verify、diff checkを実行し、warningとfailureの因果を分類する
- [x] D7. Follow-up Run Artifactを更新し、Sanitizer Write／Checkと最終差分を確認する
- [ ] D8. branch safety確認後にcommit／explicit refspec pushし、必要なら新PRを作成する
- [ ] D9. 最新headのGitHub Actions全required Native／Web／Android／iOS gateを確認する
- [ ] D10. PR／Issue／scope／merge状態を含む最終判定を記録する

## Blocked

- なし
