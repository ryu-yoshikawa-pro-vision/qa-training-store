# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. branch、remote head、PR #65、既存source/test、既存Runを確認する
- [x] 2. 既存planと今回Runの実装計画を更新する
- [x] 3. token normalization、`switch -`／`checkout -`、Push／Pop-Locationの変更を実装する
- [x] 4. 必須regression testを追加し、source/testの実差分を確認する
- [x] 5. focused contractを実行する
- [x] 6. 全contracts、format、markdown lint、lint、typecheck、verify、diff checkを実行する
- [x] 7. code-review／repair-loop観点でself-reviewし、必要ならboundedに修正する
- [x] 8. Run Artifactを更新し、sanitizerとcommit前確認を行う
- [ ] 9. 通常追加commitを作成し、明示refspecでpushする
- [ ] 10. GitHub上のsource/test、PR本文、metadata、new-head CIを確認する
- [ ] 11. REPORT／evaluation／run manifestを最終同期し完了判定する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] 12. PowerShell alias `popd`を既存cwd transition guardへ追加し、DENY／ALLOW regressionを既存test blockへ統合する
- [x] 13. `popd`追加後のfocused／全contracts／品質ゲートとself-reviewを完了する

## Blocked

- なし
