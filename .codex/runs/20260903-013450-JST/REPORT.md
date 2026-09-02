# Report (append-only)

- TASK完了、blocker、重要判断、計画変更、Run完了のcheckpointだけ追記する。
- repository scriptsを実行できていない結果はPASSとして記録しない。

## 2026-09-03 01:34 (JST)

- Summary: PR #78 merge後のGitHub Current `main` `b36c4d3e0f631801a9c9e4aae38990dac9e8d436` を確認し、同名branch不存在を確認した上で `docs/decision-b-competency-assessment-contract` を作成した。Master PlanとCurrent Curriculum / validator / contract test / Formal docs / Training evidence / ADRをpre-change auditし、PR 3 child Planの実装境界を確定した。
- Branch baseline: `b36c4d3e0f631801a9c9e4aae38990dac9e8d436` (`docs: Formal Test Strategy / Traceability を Current contract に整合する (#78)`).
- Child Plan: `docs/plans/2026-09-03_013450_pr3_decision_b_competency_assessment_contract.md`
- Decision B: Current ADR / normative requirementとの明確なconflictなし。
- Next ADR: `docs/adr/0020-test-automation-curriculum-native-specialization.md`.

### Key audit findings

- README / Learning DesignはNative lessonをlinear pathに見せ、fixed entry profile / Common prior knowledge / learner asset classificationが不足している。
- RubricはPart 1をC01〜C10 Level 2 + Android Maestroとしており、C08がCommon completionへ残っている。C04 / C09 / C10 / C12とLevel定義にもMaster Planとの差がある。
- P1-07はPhysical Android / Maestroを標準修了条件に読め、P1-09はCore-only可という説明とPhysical Android / C01〜C10 requirementが衝突する。
- P2-06はNative specialization / skip / rejoin / internal prerequisiteが弱い。P2-08はCommon C12をfull Native / multi-platform deliveryまで広げている。
- Instructor Referenceはsupport assetとしての意図はあるが、learner-facing SSOTではないこととPR 4A transition noticeが不足している。
- `scripts/validate-curriculum.ts` はrepository-required asset existenceを検証しており、Learner Required path / Common graduationを固定していない。Current auditでは変更不要。
- `tests/contracts/training-curriculum.test.ts` はDecision Bのexact Common sets、C08 specialization、branch / skip / rejoin、asset/evidence boundaryを固定していないため、future PR 3でtargeted assertionsが必要。
- PR 2 Formal docsはTest Level / Perspective / Execution・Platform Gate / Formal vs TrainingをCurrent化済み。C05は参照だけにする。
- Current Trainingにはbaseline commands、Playwright / Maestro learner exercise assets、workbook evidence fieldsがありMinimum Evidenceを地に足の付いた形で定義できる。一方、Native learner-authored runner / canonical Artifact generationはPR 5へ残す。

### Finding matrix

| Finding | Role | Current state | Disposition | Planned owner/file |
| --- | --- | --- | --- | --- |
| RA-G2 | Primary | Lesson→Competency→Minimum Evidence mapping不足 | close in PR 3 | Rubric + README/LD references |
| CUR-H1 | Primary | linear Native path / audience mismatch | close in PR 3 | README, LD, four boundary files |
| CUR-H2 | Primary | Minimum Evidence trace不足 | close in PR 3 | Rubric |
| CUR-H3 | Primary | C08 / Physical AndroidがCommonに残る | close in PR 3 | Rubric, P1-07/P1-09/P2-06/P2-08 |
| CUR-H6 | Primary | repository-required / learner-required境界不足 | close in PR 3 | README, LD, Instructor notice |
| CUR-M2 | Primary | C04 technique volume寄り | close in PR 3 | Rubric |
| CUR-M3 | Primary | C09 diagnostic evidence弱い | close in PR 3 | Rubric |
| CUR-M5 | Primary | Native baselineとlearner evidence混同 | close contract in PR 3; runner PR 5 | Rubric, Native boundary files |
| CUR-M7 | Primary | learner exercise completion boundary弱い | close contract in PR 3; runner PR 5 | Rubric |
| CUR-M8 | Primary | C12 Common scope過大 | close in PR 3 | Rubric, P2-08 |
| CUR-M12 | Primary | self-check / external評価契約分散 | close in PR 3 | Rubric, Instructor notice |
| CUR-M13 | Primary | target learner / hidden prerequisite曖昧 | close in PR 3 | README, LD |
| RA-M5 | Verification | PR 1でCurrent化済み | verify / no additional change | read-only |
| RA-M6 | Verification | iOS Build-onlyへCurrent化済み | verify / no additional change | Formal/Curriculum read-only |
| RA-M7 | Verification | current canonical filesとvalidator一致 | verify / no additional change | validator read-only |
| RA-G3 | Verification | PR 2でFormal mapping Current化 | verify / no additional change | Formal docs read-only |
| RA-G6 | Verification | PR 2でNative/Training/parity boundary Current化 | verify / no additional change | Formal docs read-only |
| CUR-M9 | Verification | iOS Current Gate=Build-only | verify / no additional change | Formal docs read-only |

### Minimum Evidence anchors

- C01: Target / Spec ref / scope rationale
- C02: Spec ref / Test Condition / Expected Result
- C03: Impact / Likelihood / Priority / rationale
- C04: technique selection + Spec / Risk fit + rationale
- C05: PR 2 Formal SSOTに基づくLevel / Perspective / Gate mapping + reason
- C06: Automate / Later / Do not automate + tool / entry/spec + reason
- C07: learner-authored Playwright change + successful Web execution evidence
- C08: learner-authored Native exercise diff + successful Maestro execution artifact
- C09: Locator / Timing / Assertion等のmeaningful diagnosis + cause/action/re-run
- C10: real maintainability issue diagnosis + reasoned minimal improvement + re-run
- C11: learner-authored Git / PR change + reviewable diff + rationale / review evidence
- C12: bounded Web CI Trigger / Gate / Artifact / Failure Evidence

### Scope decision

Future PR 3 must change:
- ADR 0020
- README
- 00 Learning Design
- 02 Rubric
- 03 Instructor Reference transition notice only
- P1-07 / P1-09 / P2-06 / P2-08 minimal boundary wording
- `tests/contracts/training-curriculum.test.ts` targeted assertions

Current audit says no change:
- `scripts/validate-curriculum.ts`

Read-only:
- PR 2 Formal docs
- package / Training / workflows
- Product behavior / Product tests
- existing ADRs

### Validation

Requested local baseline:
- `pnpm run format:check`: NOT RUN — repository clone unavailable in runtime
- `pnpm run lint:markdown`: NOT RUN — repository clone unavailable in runtime
- `pnpm run validate:curriculum`: NOT RUN — repository clone unavailable in runtime
- `pnpm run test:contracts`: NOT RUN — repository clone unavailable in runtime
- `git diff --check`: repository-local form NOT RUN

Cause:
- Runtime has no local `qa-training-store` clone.
- Direct `git clone` attempt cannot resolve `github.com` in the container.
- GitHub connector audit remains available, so planning continued without touching any local user worktree.
- These results are environment-dependent / unverified, not PASS.
- Before PR 3 implementation, local clean-tree preflight and full baseline are mandatory; dirty tree or unexplained baseline failure is a stop condition.

### Blocker / Remaining

- Decision/spec blocker: none.
- Environment limitation: local working-tree state and pnpm baseline are unverified.
- Next: save/commit/push Plan + Run, verify remote allowlist diff, update Issue #72, then owner review.
- Do not create PR or start PR 3 implementation.

## 2026-09-03 01:42 (JST)

- Child Plan commit / push: `docs: add PR 3 competency assessment plan` as `250fbbb4bf30c931c00f49fc4aaa17749997790b` on `docs/decision-b-competency-assessment-contract`.
- Scope at this checkpoint: child Plan 1 file only. PR 3 implementation files are untouched.
- Run Artifact: this checkpoint and machine records are committed in the follow-up Run Artifact commit. Its final remote branch HEAD is verified after the ref update and reported in the final task response.
- PR: not created.
