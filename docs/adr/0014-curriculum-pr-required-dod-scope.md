# ADR-0014: Curriculum PRのRequired DoDとTraining Delivery運用境界

- Status: Accepted
- Date: 2026-08-14

## Context

PR #25の目的は、テスト自動化カリキュラムとTraining Environmentを完成させることである。既存Planには、Instructor管理のremote Training Copy、Final Deliveryの3 run、候補SHA freeze、Run間のSHA equality、Final Delivery RecordをPR Merge前のRequired Gateとして扱う記述があった。

これらはProduction-gradeなTraining Delivery Platformの運用・受入試験に属し、今回PRのCurriculum / Training Environment完成には必須ではない。

## Decision

1. PR #25のRequired Definition of Doneは、Required Curriculum、Workbook / Training assets、Formal / Training境界、Curriculum validator、Training Playwright desktop / mobile、learner exercise、expected-failure lifecycle、Windows Local Physical AndroidのTraining Maestro baseline、GitHub Native CI API34 EmulatorのTraining baseline、`pnpm run verify`、Current PR HEADのPhase 1 / Native CI、Critical / High Source findingの解消とする。
2. Windows LocalのCanonical Physical Android Device契約と、GitHub Native CIのAPI34 / `google_apis` / `x86_64` Emulator契約は変更しない。
3. `prepare-training-copy` / `validate-training-copy`は、安全な教材Copyを作成・検証するRequired Assetとして維持する。
4. Instructor管理remote Training Copyへのpublish、remote 3 run、`FINAL_CANDIDATE_SHA` freeze、PR HEAD / resolved SHA equality、Final Delivery Recordは、Future operational validation / optional instructor validationとする。本PRのTask、DoD、Merge blockerには含めない。
5. Owner Decision後のRun Artifactは、remote Delivery未実施をcurrent failureとして扱わず、過去の計画・実行履歴はREPORTのappend-only記録として保持する。

## Consequences

- Task 14は「Deferred by Owner Decision / not required for PR #25」としてRequired Progressの分母から除外する。
- Current Required DoDが満たされ、Current PR HEADのRequired CIがgreenであれば、remote Delivery未実施でもPR #25をMerge Readyとして評価できる。
- 将来remote運用を導入する場合は、別のOperational ValidationとしてTraining Copyの運用主体、実行条件、Evidence保存方針を定義する。
