# Tasks

## Now

- [x] 1. 正本Plan、AGENTS、PROJECT_CONTEXT、最近のADR/Run、開始branch/PR/HEADを確認し、新しいStrict Runを初期化する
- [x] 2. source/test/ADRと既存relative・compound・candidate契約を確認し、変更scopeとDoDをRun PLANへ固定する
- [x] 3. Target-aware bounded absolute canonical path recognitionと必要なcontext threadingを実装する
- [x] 4. 必須absolute/fail-close/candidate prefix/relative回帰contract testを追加する
- [x] 5. focused contract testを実行し、first anomalyがあればPlan範囲内で最小修正する
- [x] 6. dataset validation、`validate:skills`、Markdown lint、Prettier、diff check、`pnpm run verify`を完了する
- [x] 7. 実装確定後にADRと必要なliving documentation/historyを追補し、doc gateを再確認する
- [x] 8. source/test/docsをcommitしてEvaluator SHAを固定し、fresh independent Routing Targetを作成する
- [x] 9. Target preflight（detached、clean、分離、SHA、Skill、dataset、output、process）をPASSさせる
- [x] 10. 同じTargetでNegative Qualificationを1回だけ実行し、trusted absenceを判定する
- [x] 11. Negative PASS時だけ同じTargetでPositive Qualificationを1回だけ実行し、absolute candidate prefixを判定する（Negative FAILの停止条件により未実行）
- [x] 12. Negative/Positiveの結果からEnvironment Qualificationを確定し、FAIL時はcanonicalを実行せず停止記録する
- [x] 13. Environment Qualification PASS時だけ同じTargetでcanonical `all`を1回実行し、24/24と8/8 side validityを判定する（Qualification FAILのため未実行）
- [x] 14. valid baseline条件、Result schema/provenance/lifecycle、evaluationを証拠に基づき判定する（canonical未実行のためvalid baseline未取得）
- [x] 15. Run Artifactを更新し、evaluation schema、sanitizer Write/Check、strict collector、scope/self-reviewを完了する
- [ ] 16. PR本文、commit/non-force push、working tree、PR head/base/state、CI状態を実結果どおりに最終確認する

## Discovered

- なし

## Blocked

- 条件付きtask 13/14はNegativeまたはPositive Qualification FAIL時には実行せず、未実行理由をRun/PRへ記録する。
