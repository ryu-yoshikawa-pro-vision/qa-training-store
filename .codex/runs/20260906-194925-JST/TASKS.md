# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. 開始状態、Plan、Skill、最近のADR / Runを確認しRunを初期化する
- [x] 2. `origin/main`をfetchし、PR branch一致とPlan指定direct Contract driftを確認する
- [x] 3. 既存実装・既存テスト・型を確認し、最小変更方針を確定する
- [x] 4. `feature-plan` pure graderとTest A〜Dを実装する
- [x] 5. `exploratory-qa` Test E〜Gを既存validator直接利用で実装する
- [x] 6. 実装前テスト実行前のdiffとscopeを自己レビューする
- [ ] 7. targeted testと`pnpm run verify`をPASSさせる
- [ ] 8. 最終diffを確認してcommitする
- [ ] 9. commit後`git diff --check main...HEAD`をPASSさせる
- [ ] 10. 指定branchへpushし、remote反映と最終working tree cleanを確認する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）

## Blocked

- B1. （ブロック時のみ記載）
