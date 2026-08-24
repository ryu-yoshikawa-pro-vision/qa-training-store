# Curriculum / Test Strategy Remediation Master Plan

## 1. Goal

PR #53 で `main` に保存された次の2レポートを入力として、Repository の Current Documentation、Formal Test Strategy、Curriculum、Training Evidence、Refactoring 判断を段階的に整合させる。

- `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
- `docs/reports/2026-08-24_074011_curriculum-validity-review.md`

完了時には次を満たすこと。

- Current Documentation が implementation / CI の事実と一致する。
- Formal Test Strategy が Current Formal Suite、Test Perspective、Execution / Platform / CI Gate を説明する。
- Requirement / Risk / Technique / Formal Test / CI Gate の最小 Traceability がある。
- Curriculum の共通卒業要件と Native specialization の境界が一意である。
- C01〜C12 の Minimum Evidence を Lesson / Exercise / Artifact から追跡できる。
- Training の Baseline と Learner-authored Evidence を区別できる。
- Technical Debt 候補は size 単独ではなく Evidence に基づいて分類される。

## 2. Current understanding

実装開始時に前提とする Current Repository の事実は次のとおり。

- Curriculum の canonical Learning Design file は `docs/curriculum/test-automation/00_learning-design.md`。
- `scripts/validate-curriculum.ts` は誤って `00_learning_design.md` を required file として要求している。
- Web CI は pull request で `format:check`、`lint:markdown`、`validate:spec`、`validate:curriculum` などを実行する。
- Current Seed Version の implementation SSOT は `src/config/versions.ts`。
- `CHANGELOG.md` は履歴であり、Current 値へ書き換える SSOT ではない。
- Current Web Training には `training:web:baseline`、`training:web:mobile`、`training:web:mobile:exercise` があり、Desktop learner exercise の canonical command はない。
- Current Native Training には `training:native:baseline` があり、learner exercise YAML は存在するが canonical package command / artifact contract は baseline より薄い。
- Training Copy は `training-ci.yml` と `training-native-ci.yml` を active workflow として配置する。
- Product Native の Current Guarantee は Android Runtime + iOS Build-only。iOS Runtime / Maestro PASS は Required Guarantee ではない。
- Repository Audit §4.1〜§4.16 は Refactoring candidate inventory の正本であり、`CANDIDATE` / `COMPLEXITY` は Refactor 必須を意味しない。

## 3. Assumptions / fixed decisions

次を固定条件として扱う。

- 共通卒業像は entry-level の汎用 Test Automation Engineer とする。
- Web Automation、Failure Analysis、Maintainability、Git / PR、bounded Web CI を Common Core とする。
- C08 Native Automation、Physical Android Hands-on、Native CI、Native Capstone は specialization とする。
- Native specialization 化は Curriculum learner の Required / specialization 境界だけを変更する。
- Product Formal Native Regression、Android Runtime Gate、iOS Build-only Gate は維持する。
- Native Lesson / Training asset は specialization の canonical asset として残す。
- Normative Specification を Expected Behavior の Oracle とする。
- Analysis → Design → Selection → Implementation → Failure → Maintainability → Development Process の大順序を維持する。
- Part 1 / Part 2 の Lesson 数と大順序は維持する。
- 各 Finding は Remediation Matrix で Primary owner を1つだけ持つ。
- 後続 PR の verification は Primary owner を置き換えない。

## 4. Non-goals

- Product behavior の変更。
- Curriculum 軽量化を理由に Formal Regression を削減すること。
- Product Native CI / iOS Build-only Gate の Optional 化。
- Curriculum 全面書き直しや Lesson の大量追加。
- POM の必須化。
- 新 LMS、Test Management Tool、learner-state DB、scoring framework の導入。
- 全 Formal Test title への BR / AC / Risk / Technique metadata 埋め込み。
- 新しい第三の Traceability 正本の追加。
- Stable Risk ID の無条件導入。
- Hotspot の行数だけを理由にした Refactor。
- Phase 6 のための常設 call graph / graph DB の導入。
- Pilot 実測完了を Repository remediation の blocker にすること。
- RA-M7 修正へ Curriculum semantic change、file rename、validator cleanup を混ぜること。

## 5. Impacted areas

### Current Documentation / Formal Strategy

- `docs/07_testability/seed_catalog.md`
- `docs/08_testing/e2e_design.md`
- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/12_quality/acceptance_criteria.md`
- `playwright.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`

### Curriculum

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`
- `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/08_test-management-and-maintainability.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`
- `docs/curriculum/test-automation/part1/10_part1-capstone.md`（Legacy boundary 確認のみ）
- `docs/curriculum/test-automation/part2/02_git-version-control.md`
- `docs/curriculum/test-automation/part2/04_ci-github-actions.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- `docs/curriculum/test-automation/part2/07_ci-cd-quality-gates.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`

### Validation / Training

- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `training/github-actions/**`
- `scripts/training/**`

### Refactoring Evidence

Repository Audit §4.1〜§4.16 の次の16候補を全件扱う。

1. `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`
2. `src/infrastructure/database/sqlite/native-customer-repositories.ts`
3. `src/presentation/native/native-purchase-screens.tsx`
4. `src/presentation/native/native-screens.tsx`
5. `src/presentation/pages/admin-product-pages.tsx`
6. `src/application/use-cases/checkout-order-use-cases.ts`
7. `src/application/use-cases/review-user-use-cases.ts`
8. `src/application/use-cases/admin-product-use-cases.ts`
9. `.github/workflows/native-ci.yml`
10. `src/presentation/styles/global.css`
11. `src/seeds/**` の Seed SSOT
12. `scripts/agentic-qa/**`
13. Formal / Training Maestro cleanup helpers
14. `e2e/web/fixtures.ts`
15. Dexie / SQLite adapters
16. Domain → Application type dependency

## 6. Files to inspect before each change

各 child PR は、対象ファイルだけでなく次の正本を Current `main` で再確認してから変更する。

- `AGENTS.md`
- `PLANS.md`
- `.agents/skills/feature-plan/SKILL.md`
- `.agents/skills/feature-plan/references/planning-workflow.md`
- `docs/plans/TEMPLATE.md`
- 対象 Finding の元 Report
- 対象文書が参照する implementation / workflow / test / ADR
- 対象 Validation script / contract test

## 7. Remediation Matrix

この Matrix を Finding status の正本とする。

| ID | Finding | Initial disposition | Primary owner | Follow-up verification |
| --- | --- | --- | --- | --- |
| RA-M1 | Required Web E2E 件数 / command の文書差 | fix | PR 1 | PR 2 |
| RA-M2 | Cross-role を PR 外とする文書と Current PR Gate の差 | fix | PR 1 | PR 2 |
| RA-M3 | Playwright project 名の文書差 | fix | PR 1 | PR 2 |
| RA-M4 | Seed Version の Current Documentation / implementation 差 | fix | PR 1 | なし |
| RA-M5 | Test Strategy / Acceptance / E2E 文書が Native を future / Phase 1 外として扱う | fix | PR 1 | PR 2 / PR 3 |
| RA-M6 | Curriculum の iOS manual-only 説明と Native change 時 Build-only Required Gate の差 | fix | PR 1 | PR 2 / PR 3 |
| RA-M7 | Curriculum canonical filename と `validate:curriculum` required-file contract の差 | fix | Master Plan publication PR | PR 3 |
| RA-G1 | Requirement / Test ID → Product Regression code の direct reference 不足 | fix | PR 2 | なし |
| RA-G2 | Lesson → Competency → Minimum Evidence の direct mapping 不足 | fix | PR 3 | PR 4 / PR 5 |
| RA-G3 | Technique → Formal Test mapping metadata 不足 | fix | PR 2 | PR 3 |
| RA-G4 | Native learner exercise の direct entry / Artifact / assessment 境界が薄い | fix | PR 5 | なし |
| RA-G5 | Native failure exercise が README のみで executable flow がない | defer を第一候補。C08 Minimum Evidence に不可欠な場合だけ fix | PR 5 | なし |
| RA-G6 | Test Strategy が Current Native / Training / parity / operational contract を十分に説明しない | fix | PR 2 | PR 3 |
| RA-Q1 | Domain → Application type dependency の妥当性が未確定 | Evidence で判断 | Phase 6 | なし |
| RA-L1 | Legacy P1 Capstone の Maestro 2 flows と canonical / Rubric 1 flow の限定的差 | reject を第一候補。Required navigation に影響する場合だけ fix | Phase 0 | PR 4 |
| RA-C1 | Hotspot / duplication / large file 等の Refactoring candidate 群 | Necessity Review | Phase 6 | なし |
| CUR-H1 | Universal path と Audience / Level の不整合 | fix | PR 3 | PR 4 |
| CUR-H2 | Lesson から Competency Minimum Evidence への Trace 不足 | fix | PR 3 | PR 4 / PR 5 |
| CUR-H3 | C08 / Physical Android の共通卒業要件 | Decision B を正本化 | PR 3 | PR 4 / PR 5 |
| CUR-M1 | P1-5 への観点集中 | fix | PR 4 | なし |
| CUR-M2 | C04 Level 2 と Practice 量の非対称 | fix | PR 3 | PR 4 |
| CUR-M3 | C09 Failure Evidence が弱くなり得る | fix | PR 3 | PR 4 |
| CUR-M4 | P1-8 Core scope が広い | fix | PR 4 | なし |
| CUR-M5 | Native baseline と meaningful learner flow の Assessment 差 | fix | PR 3 | PR 5 |
| CUR-M6 | Part 2 の Repository 固有運用詳細が Core と同深度 | fix | PR 4 | なし |
| CUR-M7 | Learner exercise の継続評価境界が薄い | fix | PR 3 | PR 5 |
| CUR-M8 | C12 scope が広い | fix | PR 3 | PR 4 |
| CUR-M9 | iOS Current Gate の Documentation Drift | fix | PR 1 | PR 2 / PR 3 |
| CUR-L1 | Spiral と説明重複の境界が薄い | 最小ラベル整理 | PR 4 | なし |
| CUR-L2 | Pilot 実測値がない | defer | Follow-up | なし |

Phase 0 で RA-M7 以外の行を Current `main` で再検証し、`fix` / `defer` / `reject` / `resolved` を確定する。Primary owner が完了した行は Matrix 上で `resolved` に更新する。

## 8. Change strategy and execution order

実行順序は次のとおり。

1. Step 0: Master Plan publication PR に含める RA-M7 の最小修正と local validation を完了する。
2. Master Plan publication PR を作成し、GitHub CI / review を通して `main` へ merge する。
3. 最新 `main` から PR 1 branch を作り、Phase 0 → PR 1 child Plan → Current Documentation / SSOT Repair を実施する。
4. PR 1 merge 後の最新 `main` から PR 2 branch を作り、Formal Test Strategy / Perspective / Traceability を実施する。
5. PR 2 merge 後の最新 `main` から PR 3 branch を作り、Decision B / Competency / Assessment Contract を実施する。
6. PR 3 merge 後の最新 `main` から PR 4 branch を作り、Curriculum Core / Extension / Reference を実施する。
7. PR 4 merge 後の最新 `main` から PR 5 branch を作り、Training Evidence / learner exercise / specialization workflow を実施する。
8. Phase 6 は PR 2 merge 後から PR 3〜5 と並行して調査してよい。decision-only PR は最新 `main` へ追従して確定する。
9. Repository remediation 完了後、必要に応じて Pilot Feedback を収集する。

### Branch / PR rules

- Child branch は依存 PR merge 後の最新 `main` から作る。
- 原則 stacked PR は使わない。
- PR 1〜5 はそれぞれ child Plan を `docs/plans/` に保存してから実装する。
- Phase 6 decision-only PR は本 Master Plan を直接使用する。candidate inventory、Evidence criteria、output scope が変わる場合だけ別 Plan を作る。
- `refactor_now` と判定した実装だけ Phase 6 decision-only PR merge 後に別 Plan / 別 PR を作る。

## 9. Step 0 — RA-M7 CI unblocker and PR-ready validation

### Changes

Master Plan branch 上で次だけを変更する。

- `scripts/validate-curriculum.ts` の required curriculum path を `00_learning_design.md` から `00_learning-design.md` へ変更する。
- `tests/contracts/training-curriculum.test.ts` が同じ誤 literal を直接保持している場合だけ、その literal を最小修正する。
- Remediation Matrix の RA-M7 を `resolved` へ更新する。
- active Run Artifact を実状態へ更新する。

次は変更しない。

- canonical Curriculum file の rename
- Curriculum wording / Required boundary
- validator cleanup / refactor
- Product behavior / Formal Test / Product CI
- PR 1 以降の remediation

### Run Artifact handling

- active Run `20260824-201800-JST` を継続使用する。
- `run.json.task_type` は `plan` のまま維持する。
- 実変更は `run.json.changed_files` に追加する。
- Validation 実行結果は `run.json.validation` と `REPORT.md` に記録する。
- `REPORT.md` は append-only とする。
- 全タスク完了時の `run.json.status` は Repository convention に合わせて `complete` とする。

### Local validation

次を実行する。

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `pnpm run typecheck`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Write`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check`

Sanitizer Write が Run Artifact を変更した場合は、その変更を確認してから Check を再実行する。

### Step 0 completion

次を満たした時点で Step 0 完了とする。

- RA-M7 の filename mismatch が解消されている。
- `validate:curriculum` / `test:contracts` が filename mismatch で失敗しない。
- typecheck / format / markdown lint が PASS する。
- Sanitizer Check の residual finding が0件である。
- diff が Master Plan、active Run Artifact、RA-M7最小修正だけに限定されている。
- PRを作成できる状態になっている。

GitHub pull request の作成、PR-triggered CI、review、merge は Step 0 に含めない。

## 10. Master Plan publication PR

Step 0 完了後に Master Plan publication PR を作成する。

### PR contents

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- `.codex/runs/20260824-201800-JST/**`
- RA-M7 の最小修正

### Required checks

- PR diff が Step 0 scope 内であることを確認する。
- GitHub Actions の pull request CI を完了させる。
- Required check がすべて PASS していることを確認する。
- review finding がある場合は、今回の diff に起因するものだけ修正する。
- review / CI 完了後に `main` へ merge する。
- merge 後の `main` で RA-M7 が解消済みであることを確認する。

Master Plan publication PR が merge されるまで PR 1〜5 / Phase 6 の実変更を開始しない。

## 11. Phase 0 — Current main revalidation

PR 1 branch を最新 `main` から作成した直後に read-only で実施する。

### Actions

- Audit baseline と Current `main` の差分を確認する。
- RA-M7 以外の Matrix 行を implementation / workflow / docs で再確認する。
- 各行を `fix` / `defer` / `reject` / `resolved` へ確定する。
- 既に解消済みの Finding は再修正しない。
- RA-M7 は regression がないことだけ確認する。
- Phase 0 の結果を反映して PR 1 child Plan の scope を確定する。

### Completion

- 全 Matrix 行の disposition と Primary owner が Current `main` 基準で確定している。
- PR 1 の scope が確定している。

## 12. PR 1 — Current Documentation / SSOT Repair

### Objective

設計変更なしで直せる Current Fact の不整合を解消する。

### Changes

- Required Web E2E の Current command / target / Gate を実装と一致させる。
- Cross-role の Current PR Gate を文書と一致させる。
- Playwright project 名を Current config と一致させる。
- Seed Version の文書を `src/config/versions.ts` と一致させるか、SSOT参照へ寄せる。
- Native を future / Phase 1 外とする古い Current Documentation を修正する。
- iOS について次を区別して記載する。
  - manual dispatch
  - Native change 時の Required Build-only
  - Runtime 非保証
- 変わりやすい件数 / Version は不要に複製せず、実行 SSOT を参照する。
- Historical `CHANGELOG.md` entry は書き換えない。

### Candidate files

- `docs/07_testability/seed_catalog.md`
- `docs/08_testing/e2e_design.md`
- `docs/08_testing/test_strategy.md` の factual statement
- `docs/12_quality/requirements_traceability.md` の factual statement
- `docs/12_quality/acceptance_criteria.md` の factual statement
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md` の Current Gate factual statement
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md` の Current Gate factual statement

### Validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Current config / workflow / version SSOT との manual cross-check

### Completion

- Current Documentation が implementation / workflow / ADR と一致する。
- RA-M7 が regression していない。
- 不要な volatile duplicate を増やしていない。
- PR 1 Primary owner の Matrix 行が `resolved` である。

## 13. PR 2 — Formal Test Strategy / Perspective / Traceability

### Objective

Current Formal Suite と Test Strategy / Traceability の正本を一致させる。

### Changes

`docs/08_testing/test_strategy.md` を最低限次の3軸で整理する。

1. Test Level / Test Type
   - Unit
   - Application Integration
   - Repository Contract
   - Component
   - Static / Operational Contract
   - Web E2E
   - Native Component / Repository / Android Runtime E2E
   - Deployed / Production Smoke
2. Test Perspective
   - Accessibility
   - Responsive / Mobile Web
   - Role / State / Boundary / Failure など Risk に応じた代表 Perspective
3. Execution / Platform / CI Gate
   - Formal / Training boundary
   - PR / main / periodic / manual
   - Android Runtime
   - iOS Build-only
   - Platform parity / operational contract

Traceability は次を最小単位として結ぶ。

- Risk または一意な Risk label
- Normative Spec / AC
- Representative technique / perspective
- Primary test level
- Representative Formal Test / suite
- CI gate

配置は次を優先する。

- Requirement / AC → representative regression: `docs/12_quality/requirements_traceability.md`
- Risk / technique / level / gate の設計契約: `docs/08_testing/test_strategy.md`

既存2文書で表現できる限り第三の Traceability file は作らない。Stable Risk ID は既存 label で一意に追跡できない場合だけ導入する。

### Candidate files

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/08_testing/e2e_design.md`
- 必要最小限の contract test / validator

### Validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- Curriculum 文書を変更した場合のみ `pnpm run validate:curriculum`
- `playwright.config.ts` / `package.json` / workflow / Formal Test inventory との manual cross-check

### Completion

- Test Level、Perspective、Execution / Platform Gate を別軸として読める。
- Requirement / AC → regression と Risk / technique / gate を追跡できる。
- Formal Regression と Training Test を同じ coverage count として扱っていない。
- 全 Test title / file の大量編集を行っていない。
- PR 2 Primary owner の Matrix 行が `resolved` である。

## 14. PR 3 — Decision B / Competency / Assessment Contract

### Objective

共通卒業像、C01〜C12 の評価契約、Required / specialization 境界を正本化する。

### Changes

- 次の空き ADR で Decision B を記録する。
- README / Learning Design に共通卒業像と Required / specialization 境界を記載する。
- C01〜C12 に次を定義する。
  - bounded Level 2
  - Minimum Evidence
  - Required / specialization / advanced
- C04 は技法数 quota ではなく、Spec / Risk に適切な technique を選び理由を説明できることを中心にする。
- C05 は PR 2 の Test Level / Perspective / Gate 契約を前提にする。
- C09 は Assertion typo だけでなく Locator / Timing 等を含む meaningful diagnostic evidence を要求する。
- C10 は実在する保守問題の診断と理由付き最小改善を Common Core にする。
- C12 は bounded Web CI の Trigger / Gate / Artifact / Failure Evidence を Common Level 2 とする。full multi-platform / delivery は Advanced / specialization とする。
- Baseline receipt と Learner-authored Exercise evidence を分離する。
- C08 Minimum Evidence は `learner-authored native exercise diff + successful Maestro execution artifact` とする。
- stock Native exercise の無変更 PASS は C08 completion としない。
- Instructor が C01〜C12 を直接採点できる Lesson / Exercise / Artifact mapping を追加する。
- Validator / contract test では Native asset の存在と Native common graduation Required を別契約として扱う。

PR 3 で次の4文書は Required / specialization boundary と completion wording だけ同期する。

- `part1/07_maestro-native-automation.md`
- `part1/09_part1-capstone.md`
- `part2/06_native-ci-maestro.md`
- `part2/08_integration-design-capstone.md`

Lesson depth、Practice量、Core / Extension / Reference の整理は PR 4 に残す。Training workflow / runner の実装は PR 5 に残す。

### Candidate files

- `docs/adr/<next>-test-automation-curriculum-native-specialization.md`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`
- 上記4 Lesson / Capstone
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`

### Validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- TypeScript contract を変更した場合は `pnpm run typecheck`
- README / Learning Design / Rubric / Instructor Reference / 対象Lesson の manual cross-check

### Completion

- 各 Competency の Minimum Evidence を Rubric から確認できる。
- Native specialization と Product Native Gate が分離されている。
- Native実行なしでも Common Core completion が成立する。
- C08 completion は learner-authored change と successful runtime evidence の両方を要求する。
- PR 4 前でも Curriculum 正本間の Required / specialization 境界が一致している。
- PR 3 Primary owner の Matrix 行が `resolved` である。

## 15. PR 4 — Curriculum Core / Extension / Reference

### Objective

PR 3 の評価契約を維持したまま Lesson の深さと説明重複を整理する。

### Part 1 changes

- P1-3: 技法数 quota ではなく Risk に対する technique 選択を中心にする。
- P1-5:
  - Core: Cart / explicit reset / 代表 Boundary / 代表 Mobile
  - Extension: Payment / Cross-role / Internal Inspection / Accessibility execution
- P1-6: meaningful failure diagnosis を Completion Evidence にする。
- P1-7: Native specialization 内の depth / navigation / Practice量を整理する。Physical Android canonical path は残す。
- P1-8:
  - Core: 実在する保守問題の診断 + 最小改善1件
  - Reference: POM / Helper / Fixture / Flow pattern catalog
  - Lifecycle / Regression inventory は Part 2 bridge へ寄せる
- P1-9: Web Core Capstoneを簡潔化し、Native specialization evidence と Baseline / learner-authored flow を分ける。
- Role / State / Seed / Reset の反復は Canonical Definition と Application Practice を区別する。
- Legacy P1-10 は Required navigation 外であることを確認し、Required completion に影響しなければ変更しない。

### Part 2 changes

- P2-2: Branch / Diff / Commit を Core、exact SHA / copy mechanics を Reference。
- P2-4: Trigger / Job / Failure / least privilege を Core、allowlist / parser / pin 詳細を Reference。
- P2-5: Web CI / Artifact / failure evidence を Core。
- P2-6: Native CI specialization 内の Repository 固有詳細を Reference へ寄せる。
- P2-7: Gate / Artifact / fail-closed を Core、vendor / production deployment detail を Advanced / Reference。
- P2-8: Web CI / Gate / Artifact / Failure reasoning を Common Capstone とし、Native / iOS / full CD を specialization / Advanced とする。

### Validation

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Curriculum navigation / specialization boundary の manual cross-check

### Completion

- Core / Extension / Reference が PR 3 の評価契約と一致する。
- PR 3 の Required / specialization 境界を変更していない。
- Lesson 数と大順序を維持している。
- 重複削減のために新しい抽象概念を増やしていない。
- PR 4 Primary owner の Matrix 行が `resolved` である。

## 16. PR 5 — Training Baseline / Exercise / Artifact / Completion Evidence

### Objective

Harness 正常性と Learner competency の実行入口と Evidence を分離し、Native specialization を Common Core learner へ暗黙強制しない。

### Web changes

- `package.json` に `training:web:exercise` を追加する。
- `training:web:exercise` は `training/playwright/exercises` を `training-chromium` で実行する。
- `training:web:mobile:exercise` は Mobile learner exercise として維持する。
- stock exercise の PASS は harness / starter evidence とし、learner competency evidence としない。
- Web Training CI へ learner exercise を Required 実行として追加するのは、PR 3 の Minimum Evidence で必要と確定した場合だけとする。

### Native changes

- `package.json` に `training:native:exercise` を追加する。
- Current learner exercise YAML を canonical exercise として使用する。
- baseline と exercise は Android serial resolution、cleanup、Maestro invocation を共通化して再利用する。
- baseline / exercise で flow path と JUnit / evidence 名を区別する。
- C08 Completion Evidence は learner-authored exercise diff + successful Maestro artifact とする。
- Training Copy の source SHA / Git diff を利用し、新しい learner-state DB / scoring system は作らない。
- `training/github-actions/training-native-ci.yml` を specialization opt-in にする。
  - `workflow_dispatch` を維持する。
  - `pull_request` は Native specialization asset / runner / workflow に関係する変更だけを対象にする。
  - broad な `training/**` や Curriculum docs 全体を trigger にしない。
- Native workflow が起動した場合は baseline と learner exercise の evidence を識別できるようにする。
- Product `.github/workflows/native-ci.yml` へ learner exercise を追加しない。
- Native failure exercise は C08 Minimum Evidence に不可欠な場合だけ executable 化する。不要なら `defer` / `reject` とする。

### Candidate files

- `package.json`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `training/github-actions/training-native-ci.yml`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/maestro-invocation.ts`
- `scripts/training/serial-resolution.ts`
- 必要最小限の shared runner / helper
- Training workflow contract / Training Copy validation
- Curriculum / Instructor Reference の Evidence section

### Validation

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- `pnpm run training:web:exercise`
- `pnpm run training:web:mobile:exercise`
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Training workflow contract test
- Native runtime validation は利用可能な実行環境がある場合だけ実施し、Environment failure と source / learner failure を分離する。

### Completion

- Baseline と learner exercise を別commandで実行できる。
- C08 completion は learner-authored diff + successful Maestro artifact の両方を要求する。
- Training Native workflow は specialization opt-in である。
- Web / Common Core learner PR に Native runtime を無条件要求しない。
- Product Required Formal Gate に learner exercise が入っていない。
- PR 5 Primary owner の Matrix 行が `resolved` または根拠付き `defer` / `reject` で確定している。

## 17. Phase 6 — Refactoring Necessity Review

### Objective

Repository Audit §4.1〜§4.16 の全 candidate を Evidence で分類し、必要な Refactor だけを後続実装へ送る。

### Start condition

- PR 2 が `main` に merge 済みであること。
- 調査開始時の `main` SHA を durable report に記録する。
- PR 3〜5 と並行して調査してよい。

### Evidence

各 candidate で最低限次を確認する。

- recent Git churn / change frequency
- defect / repair history または CI / runtime failure history
- actual blast radius / consumer / dependency / reference boundary
- test protection
- transaction / state / platform boundary

補助 Evidence:

- maintainer cognitive cost
- split による abstraction / duplication cost

### Classification

- `refactor_now`
- `refactor_when_touched`
- `keep_as_is`
- `needs_more_evidence`

### Freshness check

PR作成前とmerge直前に Current `main` で candidate 関連差分を再確認する。

- candidate 自身
- 初回調査で確認した consumer / dependency / reference path
- protecting test / workflow
- Current `main` で追加・削除された関連 path

関連集合に変化がある candidate だけ blast radius / test protection / boundary / classification を再確認する。Repository 全体の全面再Auditは行わない。

### Output

- `docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`
- 必要な Remediation Matrix 更新

Durable report には全16 candidate の Evidence / classification / rationale、investigation baseline SHA、merge直前の最終確認 `main` SHA を記録する。

Decision-only PR に Product refactor を含めない。`refactor_now` だけ decision-only PR merge 後に別 Plan / 別 PR へ切り出す。

### Completion

- 16 candidate 全件に classification がある。
- size 単独で `refactor_now` を付けていない。
- RA-C1 は Necessity Review 完了として `resolved`。
- RA-Q1 は根拠付きで確定できた場合 `resolved`。`needs_more_evidence` の場合は `defer` とし、不足 Evidence と再判断条件を記録する。
- decision-only PR に Product code change がない。

## 18. Validation plan

各 child Plan で、変更面に必要な Validation を選ぶ。無関係な full suite は機械的に実行しない。

### Markdown / Curriculum

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

### Test Strategy / Specification

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`

### TypeScript / workflow contract

- `pnpm run typecheck`
- 対象 unit / contract test

### Training implementation

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- `pnpm run training:web:exercise`
- `pnpm run training:web:mobile:exercise`
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

### Wider impact

Product runtime / broad contract に影響する場合だけ次を追加する。

- `pnpm run test`
- `pnpm run verify`

## 19. Risks / stop conditions

次の場合は scope を広げず、Plan または判断を見直す。

- RA-M7 が path literal の最小修正だけで解消できない。
- RA-M7 修正後の失敗が filename mismatch と無関係で、今回 diff との因果を分離できない。
- Current `main` で対象 Finding が既に解消済み。
- Product behavior / Formal CI Gate の変更が必要になる。
- Decision B と矛盾する Current ADR / Normative requirement が見つかる。
- PR 3 の Required boundary 修正が対象4 Lesson / Capstoneの最小 wording変更を超えて構造変更を必要とする。
- Traceability のために全 Test title / file の大量編集が必要になる。
- Stable Risk ID の必要性を説明できない。
- Native learner exercise のために Product Formal Gate 変更が必要になる。
- Native specialization opt-in のために Common Core workflow を複雑に分岐させる必要がある。
- C08 evidence 判定に新しい専用 DB / scoring framework が必要になる。
- `training:web:exercise` に新 runner / framework が必要になる。
- Phase 6 の Evidence が不足し、推測で `refactor_now` を付ける必要がある。
- Phase 6 freshness のために新しい常設解析基盤が必要になる。
- Refactor 必要性を size / 主観だけでしか説明できない。
- Native Environment failure と source / learner failure を分離できない。

## 20. Open questions

Blocking question はなし。

実装時に Current Repository から決定する細部:

- ADR番号: PR 3開始時の次の空き番号を使用する。
- child branch名: Repository conventionに従う。
- Traceabilityの最終表形式: 既存文書内で最小変更になる形式を選ぶ。
- Phase 6 candidate ごとの consumer / dependency / reference の具体的取得方法: 既存 code search / Git history / tests で確認し、新しい常設解析基盤は作らない。

## 21. Follow-up notes

Repository remediation 完了後、必要に応じて Pilot で次を収集する。

- completion time
- instructor support count / category
- environment block
- re-submission reason
- competency ごとの失敗傾向
- Native specialization 選択率 / environment failure

実測値がない状態で Required Duration や専用管理システムを作らない。

## 22. Definition of Done

- Master Plan publication PR が `main` に merge 済みで、RA-M7 が解消されている。
- Phase 0 で全 Matrix 行の disposition / owner が Current `main` 基準で確定している。
- PR 1 の Current Documentation / SSOT drift が解消されている。
- PR 2 の Formal Test Strategy / Traceability が Current Formal Suite と一致している。
- PR 3 の Common Core / Native specialization / Competency / Minimum Evidence 契約が一意である。
- PR 4 の Core / Extension / Reference が PR 3 の評価契約と一致している。
- PR 5 の Baseline / Exercise / Artifact / Completion Evidence と Native specialization workflow が一意である。
- Product Formal Native Regression / Android Runtime / iOS Build-only Gate が維持されている。
- Repository Audit §4.1〜§4.16 の全 candidate が Phase 6 durable report で分類されている。
- `refactor_now` 以外を不要に実装タスクへ変換していない。
- 新 LMS / DB / Test Management / third traceability SSOT / permanent call graph 基盤を追加していない。
