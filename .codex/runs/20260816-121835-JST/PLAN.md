# Plan

## Objective

- PR #23の最新HEADに残るP1 3件を、既存Official Artifact Chain / Trust Boundaryの設計を維持したままfail-closeで修正する。

## Scope

- In:
  - `scripts/agentic-qa/official-verification.ts`
  - `scripts/agentic-qa/evaluate.ts`
  - `tests/contracts/official-artifact-chain.test.ts`
  - 今回のRun Artifactと計画書
- Out:
  - Product code、Agent Runner / Model Wrapper / Gateway、Host fake、schema redesign、無関係なformat、CI architecture、Challenge/Answer Key/Specification内容。

## Assumptions

- `evaluateBlackBox()`へ実際に読んだEvaluator input pathを渡し、file hashと採点引数の内容をOfficial verificationへ接続する。
- 既存schemaでschema-validなnegative fixtureを作れるため、`contracts.ts`は変更しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: failure messageは依頼指定のstable wordingを採用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Evaluator input pathをBenchmark Manifestのraw byte hashへbindし、pathから再読したobjectと採点引数を一致させれば、Answer Key / Challenge差し替えをactual evaluation boundaryでrejectできる。
- H2: Bootstrap required operationのexactly-once/status/Receipt IDをOfficial verifierで再検証すれば、後編集されたlogとReceiptの矛盾をrejectできる。
- H3: Runtime Control各operationのallowlist/session/resultとExecution Summaryのtool action下限を検証すれば、未許可・未検証・失敗・budget矛盾をrejectできる。

## Research Plan

- Round 1 Query: verifier、evaluator、contracts、bootstrap、runner output、既存official artifact-chain testsのbinding経路を確認する。
- Round 2 Query: 最小差分を実装し、P1 negative / positive / existing Trust Boundary testsと指定quality gatesで反証する。
- Exit Criteria:
  - H1/H2/H3それぞれに実装箇所とnegative testの根拠がある。
  - 残差があればfailure categoryと次アクションがRun Artifactに記録される。

## Approach

- Repo mapping -> change scope固定 -> source修正 -> P1 negative tests -> focused/full validation -> sanitizer/schema -> read-only handoff。

## Definition of Done

- P1 3件のpositive/negative contract testsが意図したmessageでPASSする。
- 既存Trust Boundary testsと全指定validationを実行し、結果をPASS/FAIL/BLOCKED/NOT RUNで記録する。
- Run Artifactは最終HEAD・変更ファイル・検証結果と一致し、sanitizer/schema checkを通過する。

## Risks / Unknowns

- Windows checkoutのCRLFとrepository-wide format baselineが既存test/gateへ影響する可能性がある。差分起因でない場合は追加の無関係修正をしない。
- Contract fixtureはsyntheticであり、Official Host execution / scoreの代替として扱わない。

## Thinking Log

- 2026-08-16 12:18 JST: HEAD `8cad552` が前回のPROJECT_CONTEXT conflict修正commitであることを確認。worktree clean。P1修正は別Runで開始。
- 2026-08-16 12:20 JST: 現行verifierの不足を、Evaluator actual input、Bootstrap operation、Runtime Control operationの3境界へ分離して実装する方針を確定。
- 2026-08-16 13:20 JST: H1/H2/H3を指定3ファイルへ実装し、P1 negative testsは意図したfailure messageでPASS。Windows CRLF/canonical JSONとrepository-wide format baselineだけが残差となったため、無関係な既存ファイルの整形は行わず、Run Artifactへ記録した。
