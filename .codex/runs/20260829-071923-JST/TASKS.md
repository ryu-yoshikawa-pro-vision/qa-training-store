# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. Plan-only gate、branch、`IMPLEMENTATION_BASE_SHA`、active implementation Runを確定する
- [x] 2. Current entrypointとsemantic contractをread-onlyで再確認する
- [x] 3. Requirement Group / WE-CORE / Current下位label / Risk mappingをpre-auditする
- [x] 4. `test_strategy.md`をchild Plan §5.1に従い最小修正する
- [x] 5. `requirements_traceability.md`をchild Plan §5.2に従い最小修正する
- [x] 6. PR 1 follow-upとmanual cross-checkを完了する
- [x] 7. Required validation（contractsは環境依存timeout exceptionとして記録）、scope check、Sanitizer Write / Checkを完了する
- [x] 8. Run Artifactを最新化し、DoDとStop conditionの完了判定を記録する

## Discovered

- 作業中に発見したタスクはここに追記する。

## Blocked

- なし（必須`pnpm run test:contracts`のtimeoutはpre-existing / environment-sensitive validation exceptionとして確定し、Required validationはPASSではなくinconclusiveとして記録する。implementation scope内のunresolved item / Stop conditionはない。）
