# Tasks

## Now

- [x] 1. Repo mappingとP1根本原因を確認する
- [x] 2. 計画書・allowed scope・Run初期化を確定する
- [x] 3. Evaluator actual Challenge / Answer Key bindingを実装する
- [x] 4. Bootstrap / Initial State bindingを実装する
- [x] 5. Runtime Control bindingを実装する
- [x] 6. P1 negative testsとpositive/既存Trust Boundary testsを整備する
- [x] 7. 指定validationを実行し、failureを切り分ける
- [x] 8. Run Artifactをsanitizer/schema検証し、最終判定を記録する

## Discovered

- D1. 現行`validateOfficialArtifacts()`はBootstrap required operationの存在をschemaへ委譲しているが、exactly-once/status/Receipt operation IDの再比較をしていない。
- D2. 現行Runtime Control verifierはlog全体のrun/sessionのみを検証し、operation単位のallowlist/session/resultとsummary budgetを検証していない。
- D3. 現行Windows checkoutではCRLF由来の既存baseline failureが残る可能性があるため、P1差分起因かをvalidationで再確認する。

## Blocked

- なし
