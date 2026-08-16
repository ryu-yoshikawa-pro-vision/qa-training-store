# Tasks

## Now

- [x] 1. rebase status、branch、conflict file、main / PR側の内容を確認する
- [x] 2. AGENTS、PROJECT_CONTEXT、直近ADR / Run、feature-planの計画規約を確認する
- [x] 3. 統合計画を`docs/plans/`とRun Artifactへ保存する
- [x] 4. `docs/PROJECT_CONTEXT.md`をmain正本＋PR #23 Official履歴として意味統合する
- [x] 5. Official ADRを0015へ移行し、mainの0013 / 0014と旧path参照を確認する
- [x] 6. Agentic QA implementation / contract / preparation / documentationのTrust Boundaryをself-reviewする
- [x] 7. conflict marker、ADR参照、diff check、formatを検証する
- [x] 8. focused validationとcontract validatorを実行する
- [x] 9. full contract / typecheck / lint / spec / security / build / format等を可能な範囲で実行する
- [x] 10. sanitizer、Run Artifact、Git state、ユーザーの次操作を確定する

## Discovered

- [x] D1. 後続rebase commitにも旧Official ADR pathの変更があるため、current migration後のcontinueで追加conflictが起こり得る。後続commitのdiffを確認し、必要ならユーザーへ引き継ぐ。
- [x] D2. `AD`（index追加 / worktree削除）を追加として解釈するBenchmark revision parserの不具合を検出し、削除として扱う最小修正と回帰テストを追加した。

## Blocked

- なし

Progress: 100% (12/12)
