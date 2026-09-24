# Tasks（タスク）

## Now（現在）

- 実行順に並べる（上から順に処理）。
- [x] 0. PR #180のopen/head branchとclean working treeを確認し、実装Runを初期化する。
- [x] 1. latest `main`へrebaselineし、指定領域のmaterial driftとfile-delete Safety条件を確認する。
- [x] 2. focused regression baselineを実行する。
- [x] 3. 20 Repository Port contractをApplicationへ追加する。
- [x] 4. Application / Infrastructure consumerのimportを移行する。
- [x] 5. 未使用Repository abstractionを削除する。
- [x] 6. Domain Repository moduleを明示承認・Safety条件・旧path 0確認後に物理削除する。
- [x] 7. Domain policyから`ProductViewer`依存を除去し、4 callerとunit testを更新する。
- [x] 8. architecture static contractとsynthetic self-testを追加する。
- [x] 9. 対象documentationをCurrent sourceへ同期する。
- [x] 10. focused validationを実行し、Current root Repository suiteを確認する。
- [ ] 11. Repository標準gateを実行する。
- [x] 12. final inventoryを全件確認する。
- [x] 13. Run Artifactを更新しcollector / sanitizerを完了する。
- [ ] 14. scope再確認後にcommit、通常push、PR #180本文を更新する。
- [ ] 15. PR #180最新headのWeb CI / Mobile App CI / 対象security workflowを確認する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- file-changing taskの適用条件、除外、commit / push / PR / CI lifecycle、CI連動Progress: `docs/reference/codex-implementation-harness.md`
- 品質ゲートfailureのRepository固有repair policy: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- 修正後の最新PR headでの必須CI再確認: `docs/reference/codex-implementation-harness.md`
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

checkbox taskの完了はfinal commit前のtracked task進捗であり、task全体の完了を意味しない。詳細契約は上記の正本へ従う。

## Discovered（発見事項）

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）。

## Blocked（ブロック中）

- Task 11の`corepack pnpm run verify`はローカルignored `output/**`内の古い生成コピーをVitest / Jestが拾い、root外のtest failureとなる。Current root各test suiteは`output/**`を除外した実行でPASS。さらに`codex-text-quality`の固定30秒fixture testがfull serial suite実行時に一度timeoutし、単独再実行ではPASS。標準gateの無条件PASSは未確認であり、Task 11は完了扱いにしない。
