# PR #23 P1 Trust Boundary Repair 計画

## 0. 依頼概要

- 依頼内容: Official Black-box Scored E2EのP1 3件を、最新HEAD `8cad552ac55870aa236abebfb986254d5a93bfd9` に対して修正する。
- 背景: `valid_for_scoring=true` の前提となるEvaluator入力、Initial State Bootstrap、Runtime ControlのArtifact identity/runtime contractがOfficial verifierで十分に再検証されていない。
- 期待成果: 不明・不一致・未実行をOfficial invalidへfail-closeし、正常なOfficial chainと既存Trust Boundary攻撃テストを維持する。

## 1. ゴール / 完了条件

- ゴール:
  - Evaluatorが実際に使用するChallenge / Answer KeyのbytesをBenchmark Manifestへ直接bindする。
  - Initial State ReceiptとBootstrap Operation Logをrun/session/status/operation identityで再bindする。
  - Runtime Control Operation LogをRunner Input allowlist、current runner session、usable runtime result、Execution Summaryのtool budgetへbindする。
- 完了条件（DoD）:
  - 指定negative testsが期待failure messageでPASSする。
  - `valid fixture passes validateOfficialArtifacts` と `valid complete Official chain reaches valid_for_scoring` がPASSする。
  - Fully-rebound Specification / Challenge / Runbook、exact file set、trusted evidence、Host fail-close等の既存テストがPASSする。
  - typecheck、lint、markdown、spec、security、format、diff check等の指定validationを実行し、環境依存差異を明示する。

## 2. 現状理解と前提

- Current understanding:
  - `validateOfficialArtifacts()` はRunner InputとBenchmark ManifestのSpecification / Challenge / Runbook bindingを持つが、Evaluator actual input pathのbindingを持たない。
  - `bootstrapOperationLogSchema` はoperation種別の存在とoperation ID一意性を検証するが、種別ごとのexactly-onceと全required operationのpassed、Receipt operation IDとの再比較はOfficial verifierにない。
  - Runtime Controlはログ全体のrun/sessionを検証するが、各operationのallowlist/session/resultとExecution Summaryのtool action下限は検証していない。
  - `evaluate.ts` のCLIはRepositoryのChallenge / Answer Keyを読み、`evaluateBlackBox()`へ渡している。実際に読んだpathをEvaluationOptionsへ渡せる。
  - 現在のbranchは `feat/implement-official-black-box-scored-e2e`、`main` は `600b5ca2a04a060d5be802fcd5a876538bf65fc4`。worktreeは開始時点でcleanだった。
- Assumptions:
  - Existing schemaで表現できるため、`contracts.ts`のschema redesignは行わない。
  - Evaluator pathはsource fileまたはtest fixtureのregular fileとして渡し、hash比較に加えて、pathから読み直したobjectが採点引数と一致することを検証する。
  - Contract fixtureはTrusted Host Capabilityの実証ではない既存設計を維持する。
- Non-goals:
  - Agent Runner、Model Wrapper、Session Manager、Gateway、Host abstraction、Product/CI/Specification/Challenge/Answer Key内容の変更。
  - repository-wide format修正、既存Trust Boundaryの再設計、Official Host Receiptのfake生成。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象P1、変更候補、fail-close方針、validationが明示されている。
- 仮定してよい細部: 安定したfailure messageは依頼記載の文言を採用し、既存naming conventionに合わせる。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Official verificationのtrusted artifact比較。
  - Evaluator CLI/APIの実入力identity伝達。
  - Official artifact-chain contract tests。
- Files to inspect:
  - `scripts/agentic-qa/official-verification.ts`
  - `scripts/agentic-qa/evaluate.ts`
  - `scripts/agentic-qa/contracts.ts`
  - `scripts/agentic-qa/initial-state-bootstrap.ts`
  - `scripts/agentic-qa/runner-output-import.ts`
  - `tests/contracts/official-artifact-chain.test.ts`

## 5. 変更方針

- Change strategy:
  1. EvaluationOptionsとOfficialArtifactLocationsへ実Evaluator input pathを追加し、CLIから実際に読んだpathを渡す。
  2. Official verifierでBenchmark ManifestのChallenge / Answer Key hashとactual file hashを比較し、採点引数とfileから再読したschema objectの一致もfail-closeで確認する。
  3. Bootstrapでrequired operationのexactly-once、passed、run/session、Receipt operation ID bindingを検証する。
  4. Runtime Controlでoperation allowlist、operation/current session、passed/verified/usable、Execution Summary tool budget下限を検証する。
  5. 意図したP1 failure messageを固定したnegative testsを追加し、positiveと既存攻撃テストを再確認する。
- 実行タスク:
  - [ ] 1. Evaluator input identity bindingを実装する。
  - [ ] 2. Bootstrap / Initial State bindingを実装する。
  - [ ] 3. Runtime Control bindingを実装する。
  - [ ] 4. P1 negative testsを追加する。
  - [ ] 5. Official focused testsと全指定validationを実行する。

## 6. 検証方法

- Validation plan:
  - Official focused Vitest（2 contract files、single worker）。
  - `pnpm run test:agentic-qa:preparation`、`pnpm exec tsx scripts/agentic-qa/validate-contracts.ts`、`pnpm run test:contracts`。
  - `pnpm run typecheck`、`pnpm run lint`、`pnpm run lint:markdown`、`pnpm run validate:spec`、`pnpm run build:spec`、`pnpm run security:check`、`pnpm run format:check`、`git diff --check`。
  - 可能なら `pnpm run test:e2e:chromium` と `pnpm run verify`。
- 成功判定:
  - P1 negative testsは各指定のfailure messageを含んでOfficial invalidになる。
  - Positive chain、既存fully-rebound攻撃、exact file set、evidence、Host fail-closeは退行しない。
  - Failureが残る場合、変更起因・baseline・環境依存を根拠付きで分類する。

## 7. リスクと未解決論点

- Risks:
  - 既存fixtureはRuntime Controlが空であるため、追加検証はpositive chainを壊さないよう空集合を許容する。
  - Windows CRLF / repository-wide formatter baselineがテスト結果へ影響する可能性があるため、差分起因か環境起因かを分離する。
  - Evaluator input pathだけでなく採点引数との内容一致を確認しないと、path hash確認だけでは別object採点を許してしまう。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - `scripts/agentic-qa/official-verification.ts`
  - `scripts/agentic-qa/evaluate.ts`
  - `tests/contracts/official-artifact-chain.test.ts`
- 付随ドキュメント:
  - `.codex/runs/20260816-121835-JST/` の標準Run Artifact一式。

## 9. 備考

- Git mutation（add/commit/push/rebase等）は実行しない。
- Official Host Capability Receiptが実在しない場合のOfficial execution / score statusは既存どおりBLOCKED / NOT EXECUTED、NOT PRODUCEDを維持する。
