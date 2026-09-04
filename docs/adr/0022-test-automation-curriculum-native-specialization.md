# ADR-0022: Test Automation CurriculumのCommon / Native specialization契約

- Status: Accepted
- Date: 2026-09-04

## Context

既存のTest Automation Curriculumは、Web、Native、CIを一続きの必須経路として読める箇所があり、Commonの卒業能力、Native specialization、Learner Required asset、評価Evidenceの境界が一意ではなかった。Decision Bとして、既存のLesson番号・Training入口・Product / Formal CIを維持したまま、能力・修了・評価の責任分担を固定する必要がある。

## Decision

1. Commonの卒業像は **entry-levelの汎用 Test Automation Engineer** とする。Part 1 Commonは`C01〜C07 + C09〜C10`、Part 2 / final Commonは`C01〜C07 + C09〜C12`のbounded Level 2とする。
2. `C08`、Physical Android、Native CIはNative specializationとし、Common completionには要求しない。C08のcompletionはlearner-authored evidenceで判定し、baseline / stock PASSだけでは代替しない。
3. Native specializationは既存Lesson番号のままbranch / skip / rejoinする。Part 1はP1-6を共通前提としてP1-7へ分岐し、P1-8へrejoinする。Part 2はP2-5を共通前提としてP2-6へ分岐し、P2-7へrejoinする。P2 Nativeの内部前提はP1 Native specialization由来のMaestro実行能力とする。
4. Repository-required assetの存在とLearner Required path / completionを分離する。Instructor / 運営は環境、アカウント、端末、Training Copy、Infrastructure / Toolchainの支援を担えるが、学習内容、self-check、completion、evaluationのRequired基準はlearner-facing materialを正本とする。
5. RubricのC01〜C12、path classification、bounded Level 2、Primary learner-facing source(s)、Minimum Evidenceを評価の正本とする。外部提出や第三者ReviewをCommon completionの暗黙の前提にしない。C12 CommonはTrigger / Gate / Artifact / Failure Evidenceを含むbounded Web CIに限定する。
6. Product behavior、Product Native CI Gate、Formal Test Strategy / Traceability、Training runner / workflow / Artifact実装はこのADRの対象外とする。

## Consequences

- Common routeだけを選ぶ受講者は、Native実行環境がなくてもPart 1 / Part 2のCommon completionへ進める。
- Nativeを選択した受講者は、P1-7またはP2-6の具体的なNative開始条件と、learner-authored exercise Evidenceを満たしてCommon routeへ戻る。
- Rubricへ評価詳細を集約し、README / Learning Design / Capstoneは集合、境界、経路の案内に留めることで、同じEvidenceの二重管理を避ける。

## Guardrails

- `scripts/validate-curriculum.ts`はrepository asset existenceの検証として維持し、Learner RequiredやCommon completionの判定へ拡張しない。
- P1-7の既存Physical Android、serial、baseline、artifact、Evidence契約を変更しない。
- Lesson本文のdepth、Practice、self-check、Recovery、Instructor Reference本文、Product、Formal / Training workflowはPR 3で全面改訂しない。これらの改善は後続PRのscopeとする。
