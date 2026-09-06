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
- [x] 8. 最終diffを確認してcommitする
- [ ] 9. commit後`git diff --check main...HEAD`をPASSさせる
- [x] 10. 指定branchへpushし、remote反映と最終working tree cleanを確認する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] D1. Code Quality Typecheckのstrict型エラーを再現し、grader内だけを最小修正する
- [x] D2. 正本PlanのMD038 / MD010 / line 550 trailing tabを意味変更なしで修正する
- [ ] D3. PR #126本文を実装済み状態へ更新し、remote headを確認する

## Blocked

- B1. （ブロック時のみ記載）
