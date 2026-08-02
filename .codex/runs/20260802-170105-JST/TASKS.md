# Tasks

## Now
- 実行順に並べる（上から順に処理）
- [x] 1. PLANを確定する
- [x] 2. 不足知識を repo docs / tickets / logs / 必要なWeb検索で補い、証跡を run-local REPORT に残す
- [x] 3. 実行タスクへ落とし込む
- [x] 4. 実行・検証する
- [x] 5. REPORTへ記録し完了判定する

### Repair Iteration 1 (PR #6)
- [x] 6. `ci.yml` を `verify` → `deploy-preview` → 最終 `validate` の fail-closed 構造へ修正し、`pr-gate` を削除する
- [x] 7. `tests/contracts/ci-workflow.test.ts` を新しいJob／Artifact／Smoke／Secret契約へ更新する
- [x] 8. ADR、PROJECT_CONTEXT、計画書を `verify`／最終 `validate` 構造へ同期する
- [x] 9. 重複Run `20260802-171344-JST` を削除せず `superseded` として終了する
- [x] 10. 指定された契約・全体テスト・静的検証を再実行する
- [x] 11. active RunのREPORT／run.jsonを更新し、残差と最終判定を確定する

## Discovered
- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. （必要になったら追記）

## Blocked
- B1. テスト修正の main 反映と、main の既存 CI 成功が確認できるまで CI 構造の実装を開始しない（ユーザーの明示許可により今回解除）。
- B2. 旧契約テストとの衝突は PR #6 指示により契約テストを新構造へ更新して解消する（解除済み）。

Progress: 100% (11/11)
