# Tasks

## Now

- [x] 1. 正本Plan、branch、PR、開始HEAD、origin/main、Codex条件を固定する
- [x] 2. 現行source・contract test・ADR・raw evidence・dataset fingerprintを再確認する
- [x] 3. exact-shape bounded selectorを最小実装する
- [x] 4. detached HEAD preflightを最小実装する
- [x] 5. selector / absence / preflight回帰contract testを追加する
- [x] 6. focused contract testをPASSさせる
- [x] 7. dataset・Skill・Markdown・Prettier・diff validationをPASSさせる
+ [x] 8. `pnpm run verify`をPASSさせる
+ [x] 9. ADR-0023を実装結果で追補し、PROJECT_CONTEXT / historyとscopeを確認する
+ [x] 10. source / test / ADRをcommitしてEvaluator SHAを凍結する
- [x] 11. fresh independent Targetを作成し、全preflightをPASSさせる
- [x] 12. 同一Targetでnegative / positive Environment Qualificationを実行・判定する（negative PASS、positive FAIL）
- [x] 13. Qualification PASS時のみcanonical `all`、8/8 side、valid baseline、Run/PR/Git最終化を完了する（Qualification FAILのためcanonicalは停止し、Run/PR/Git最終化を完了）

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）

## Blocked

- 条件付きcanonical `all`、8/8 side、valid baselineはpositive Qualification FAILのため実行しない。未承認Host shapeの追加evidenceと契約判断が別途必要である。
