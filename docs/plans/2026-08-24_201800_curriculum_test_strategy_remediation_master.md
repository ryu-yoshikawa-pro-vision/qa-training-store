# Curriculum / Test Strategy Report Remediation Master Plan

## 0. 依頼概要

- 依頼内容:
  - PR #53 で `main` に確定した Repository Audit / Curriculum Validity Review の Findings を、過剰設計を避けながら段階的に解消するための Master Plan を作成する。
  - 後続実装は一つの巨大 PR にまとめず、判断・文書整合・Curriculum 契約・Test Strategy / Traceability・Training Evidence・Refactoring Review を分離する。
- 背景:
  - `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
  - `docs/reports/2026-08-24_074011_curriculum-validity-review.md`
  - 上記 Report は Repository baseline commit `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c` を対象に作成され、PR #53 で `main` にマージ済み。
  - 本 Plan 作成開始時の `main` は `74834bf9ac859db5d9aec1f34bd8c6337f4698c8`。
- 期待成果:
  - Findings を「現在の事実との不整合」「Curriculum の設計契約」「Test Strategy / Traceability」「Training Evidence」「Refactoring 候補」に分解し、依存関係順に対応できる。
  - 各変更 PR の責務、対象ファイル、検証方法、停止条件が明確で、実装者が追加の大きな設計判断をせずに進められる。

## 1. ゴール / 完了条件

### ゴール

Report の Findings をそのまま機械的に修正するのではなく、以下の順序で Repository の正本を整える。

1. Current Documentation と実装 / CI の事実差を解消する。
2. 共通卒業像と Competency / Assessment 契約を確定する。
3. その契約に合わせて Curriculum の Core / Extension / Reference の深さを調整する。
4. Current Test Strategy / Test Perspective / Traceability を実際の Test Layer / CI Gate に合わせる。
5. Baseline / Learner Exercise / Artifact / Completion Evidence の役割を明確化する。
6. Technical Debt 候補は追加 Evidence を収集してから Refactoring 必要性を判断する。

### 完了条件（DoD）

- [ ] Report の各 `MISMATCH` / `GAP` / Curriculum Finding が、`fix` / `defer` / `reject` / `resolved` のいずれかへ明示的に分類されている。
- [ ] Decision B を正式な Curriculum 設計判断として記録している。
- [ ] 共通卒業像は「汎用 Test Automation Engineer」とし、C08 / Physical Android / Native CI は specialization として扱う。
- [ ] Decision B が Product / Formal Native Regression / Native CI の保証を弱める変更に波及していない。
- [ ] E2E 件数、Cross-role PR Gate、Playwright project 名、Seed Version、Native / iOS Gate などの Current Documentation Drift が解消されている。
- [ ] C01〜C12 に bounded level と Minimum Evidence が定義され、Lesson / Exercise / Artifact から直接追跡できる。
- [ ] Baseline receipt と Learner-authored evidence が明確に分離されている。
- [ ] Part 1 / Part 2 の Lesson 数と大順序を維持しつつ、Core / Extension / Reference の深さが整合している。
- [ ] Test Strategy が Current Web / Native / Training / A11y / Responsive / Operational Contract の Test Layer と CI Gate を説明できる。
- [ ] Risk → Technique → Layer → Representative Formal Test の最小 Traceability があり、全 Test title への ID 埋め込みは要求しない。
- [ ] Technical Debt 候補は size 単独ではなく churn / defect / failure / blast radius / cognitive cost の Evidence で優先順位付けされる。
- [ ] 各子 PR に個別 Plan があり、PR 単位で独立して Validation できる。

## 2. 現状理解と前提

### Current understanding

- PR #53 の 2 Report は `main` にマージ済みで、後続判断の durable source of truth として利用できる。
- Repository Audit の baseline は `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c`、本 Plan 起点の `main` は `74834bf9ac859db5d9aec1f34bd8c6337f4698c8` である。
- Report で確認された主要な Current mismatch / gap は以下。
  - Required Web E2E 件数の文書差。
  - Cross-role を PR 外とする文書と Current PR Gate の差。
  - Playwright project 名の文書差。
  - Seed Version の文書 / changelog / implementation 差。
  - Native を future / Phase 1 外とする Current Documentation の差。
  - iOS を manual-only / PR Required 外とする Curriculum と Current Native Build-only Gate の差。
  - Lesson → Competency → Minimum Evidence の direct mapping 不足。
  - Requirement / Risk / Technique → Formal Test の machine-readable / direct trace 不足。
  - Current Test Strategy layer table が Native / Training / platform parity / operational contract を十分に説明していない。
  - Training Native で Baseline と Learner Exercise の entry / artifact / assessment 境界が薄い。
- Report の `COMPLEXITY` / `CANDIDATE` は Refactor 必須を意味しない。
- `package.json` には `validate:curriculum`、`test:contracts`、Training Web / Native baseline 等の既存 validation entry がある。

### Assumptions

- ユーザー承認済み方針として **Decision B** を採用する。
  - 共通卒業像: entry-level の汎用 Test Automation Engineer。
  - Web Automation / Failure / Maintainability / Git / PR / bounded Web CI を共通 Core とする。
  - C08 Native Automation、Physical Android Hands-on、Native CI、Native Capstone は specialization とする。
- Native specialization 化は Curriculum の Required / Optional 境界のみを変更する。
- Formal Product Regression、Android Runtime Gate、iOS Build-only Gate、Native implementation の保証範囲は別契約であり、本 Plan では弱めない。
- Normative Specification を Oracle とする既存方針を維持する。
- Analysis → Design → Selection → Implementation → Failure → Maintainability → Development Process の大順序を維持する。

### Non-goals

- Product behavior の変更。
- Formal Regression の削減を Curriculum 軽量化の理由だけで行うこと。
- Native Product / Native CI の廃止・Optional 化。
- 新 LMS / Test Management Tool / Framework の導入。
- Curriculum 全面書き直し、Lesson の大量追加。
- POM の必須化。
- iOS Runtime / Maestro を Required Product Guarantee にすること。
- Hotspot の行数だけを理由にしたファイル分割。
- 全 Formal Test title への BR / AC / Risk / Technique ID の埋め込み。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- 現時点で Blocking Question はなし。
- Decision B はユーザー承認済みとして進める。

### 仮定してよい細部

- ADR 番号は実装開始時の `main` で次の空き番号を採用する。
- Traceability は既存 Markdown / validator / contract test を優先し、新しい管理基盤を作らない。
- PR ごとの具体的な branch 名は実装開始時に一意な名前を付ける。

### 未回答の重要質問

以下は本 Master Plan を止めず、該当 Phase 内で Evidence を集めて判断する。

- Risk / Technique Traceability の正本を `test_strategy.md` 内 Matrix に置くか、`requirements_traceability.md` に集約するか。
- Domain → Application type dependency を intentional sharing とするか architecture violation とするか。
- Native Guest Cart compatibility surface の長期 owner / change protocol。
- Pilot の講師支援量・完了時間・Environment block の実測値。

## 4. 影響範囲

### Impacted areas

- Current test documentation
- Curriculum design / competency rubric / instructor guidance
- Curriculum validator / contract test
- Training Web / Native entry points and evidence documentation
- Test Strategy / Test Perspective / Traceability
- CI documentation and Current gate explanation
- Refactoring review evidence

### 主な Files to inspect

#### Durable Evidence

- `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
- `docs/reports/2026-08-24_074011_curriculum-validity-review.md`

#### Current Test Documentation

- `docs/08_testing/test_strategy.md`
- `docs/08_testing/e2e_design.md`
- `docs/08_testing/requirements_traceability.md`
- `docs/08_testing/acceptance_criteria.md`
- `docs/07_testability/seed_catalog.md`
- `playwright.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`

#### Curriculum Core

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
- `docs/curriculum/test-automation/part2/02_git-version-control.md`
- `docs/curriculum/test-automation/part2/04_ci-github-actions.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- `docs/curriculum/test-automation/part2/07_ci-cd-quality-gates.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`

#### Validation / Training

- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `scripts/training/**`

#### Refactoring Evidence Candidates

- `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`
- `src/infrastructure/database/sqlite/native-customer-repositories.ts`
- `src/presentation/native/native-purchase-screens.tsx`
- `src/presentation/native/native-screens.tsx`
- `src/presentation/pages/admin-product-pages.tsx`
- `src/application/use-cases/checkout-order-use-cases.ts`
- `src/application/use-cases/review-user-use-cases.ts`
- `src/application/use-cases/admin-product-use-cases.ts`
- `.github/workflows/native-ci.yml`
- `src/presentation/styles/global.css`
- `src/seeds/**`
- `scripts/agentic-qa/**`

## 5. 変更方針

### 基本原則

1. **Fact repair と design change を分ける。**
2. **Curriculum Optional 化を Product Quality Gate の弱体化へ波及させない。**
3. **Lesson 本文を先に大量編集せず、North Star / Competency / Evidence 契約を先に固定する。**
4. **Traceability は最小構成にする。** 全 Test title への ID 埋め込みや新 DB は作らない。
5. **Refactoring は最後に判断する。** size は investigation trigger であり refactor reason ではない。
6. 各 Phase の実装開始前に子 Plan を `docs/plans/` へ保存する。

### Phase 0 — Current `main` で Finding を再検証する

目的: Audit baseline から `main` が進んだことで、すでに解消・変質した Finding を誤って修正しない。

実施:

- Audit baseline `4ed5374...` と Phase 開始時 `main` の差分を確認する。
- Report の `MISMATCH` / `GAP` / Curriculum Finding ごとに次を記録する。
  - `still_valid`
  - `resolved_since_audit`
  - `scope_changed`
  - `decision_only`
- `resolved_since_audit` は再修正しない。
- Current implementation / workflow / docs の事実を再取得してから子 Plan の対象ファイルを確定する。

Exit criteria:

- 対応対象 Finding が Current `main` 基準で固定されている。
- 古い line number だけを根拠にした修正がない。

### PR 1 — Current Documentation Drift の最小修正

目的: 設計判断なしで修正できる Current Fact の不整合を先に除去する。

主対象:

- Required E2E 件数 / command の説明。
- Cross-role PR Gate の説明。
- Playwright project 名。
- Seed Version。
- Native を future / Phase 1 外とする古い説明。
- iOS の `manual dispatch` と `Native change 時 Required Build-only` と `Runtime 非保証` の区別。

対象候補:

- `docs/08_testing/e2e_design.md`
- `docs/08_testing/test_strategy.md` の factual statement のみ
- `docs/08_testing/requirements_traceability.md`
- `docs/08_testing/acceptance_criteria.md`
- `docs/07_testability/seed_catalog.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md` の Current Gate 事実
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md` の Current Gate 事実

Non-goal:

- Curriculum Required / Optional 再設計。
- Test Strategy table の全面再構成。
- CI / Test code の変更。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Current config / workflow との manual cross-check

### PR 2 — Decision B + Competency / Assessment Contract

目的: Lesson を直す前に「何を共通卒業要件として、何を Evidence にして評価するか」を正本化する。

実施:

- 次の空き ADR で Decision B を記録する。
  - 共通卒業像: entry-level Test Automation Engineer。
  - C08 / Physical Android / Native CI は specialization。
  - Product Native quality gate は変更しない。
- `README.md` / `00_learning-design.md` へ一文の North Star と Required / specialization 境界を反映する。
- C01〜C12 それぞれに以下を定義する。
  - bounded Level 2 の意味。
  - Minimum Evidence。
  - Required / specialization / advanced の区分。
- C04 は「5技法すべてを使う」ではなく、Spec / Risk に適切な technique を選択し理由を説明できることを Level 2 の中心にする。
- C09 は Assertion typo だけでなく Locator / Timing 等の meaningful diagnostic evidence を含める。
- C10 は「実在する保守問題の診断 + 理由付き最小改善」を共通 Core にする。
- C12 は bounded Web CI の Trigger / Gate / Artifact / Failure Evidence を共通 Level 2 とし、full multi-platform / delivery は Advanced / specialization に分ける。
- Baseline receipt と Learner-authored Exercise evidence を別物として定義する。
- Instructor が C01〜C12 を再構成しなくても採点できる mapping を作る。

対象候補:

- `docs/adr/<next>-test-automation-curriculum-native-specialization.md`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `pnpm run typecheck:app` if validator / contract implementation changes require it

Exit criteria:

- Lesson を読まなくても Rubric から各 Competency の Minimum Evidence が分かる。
- Native specialization 化と Product Native Gate が明確に分離されている。

### PR 3 — Curriculum Core / Extension / Reference 再編

目的: PR 2 の契約に合わせ、Lesson 数と大順序を維持したまま Required depth を調整する。

Part 1:

- P1-3:
  - 技法数 quota より「Risk に対する適切な technique 選択」を中心にする。
- P1-5:
  - Core: Cart / explicit reset / 代表 Boundary / 代表 Mobile。
  - Extension: Payment / Cross-role / Internal Inspection / Accessibility execution。
- P1-6:
  - meaningful failure diagnosis を Completion Evidence にする。
- P1-7:
  - Native specialization として再位置付けする。
  - Physical Android canonical path 自体は削除しない。
- P1-8:
  - Core: 実在する保守問題の診断 + 最小改善 1件。
  - Reference: POM / Helper / Fixture / Flow pattern catalog。
  - 仕様変更 Lifecycle / Regression inventory は Part 2 bridge に寄せる。
- P1-9:
  - Web Core Capstone を共通卒業 chain とする。
  - Native evidence は specialization として別 section にする。
  - Harness baseline と Learner-authored flow を分離する。

Part 2:

- P2-2: Branch / Diff / Commit を Core、exact SHA / copy mechanics を Reference。
- P2-4: Trigger / Job / Failure / least privilege を Core、allowlist / parser / pin の詳細を Reference。
- P2-5: Web CI / Artifact / failure evidence を Core。
- P2-6: Native CI specialization。
- P2-7: Gate / Artifact / fail-closed を Core、vendor / production deployment detail は Advanced / Reference。
- P2-8: Web CI / Gate / Artifact / Failure reasoning を共通 Capstone、Native / iOS / full CD は specialization / Advanced。

ガードレール:

- Required content を削ること自体を目的にしない。
- Normative Spec、Risk、Do not automate、Lower Layer 選択、Failure Analysis、Maintainability、Git / PR / CI の本質は残す。
- 新 Lesson を増やさない。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Curriculum navigation / required asset boundary を確認

### PR 4 — Test Strategy / Test Perspective / Traceability の再整備

目的: Current formal suite と Strategy の説明を一致させ、Coverage の存在と Traceability metadata を分けて管理する。

実施:

- `test_strategy.md` の Current layer inventory を更新する。
  - Unit
  - Application Integration
  - Repository Contract
  - Component
  - Static / Operational Contract
  - Web E2E
  - Accessibility / Responsive
  - Training boundary
  - Native Component / Repository / Android Runtime
  - iOS Build-only
  - Deployed / Production smoke
  - Platform parity contract
- Product Risk に strategy-owned stable ID を付ける。
  - Audit 上の便宜 ID をそのまま無条件昇格させず、Current risk list を再確認してから `R01` 等を確定する。
- 最小 Traceability Matrix を正本化する。
  - Risk
  - Normative Spec / AC
  - Representative technique
  - Primary layer
  - Representative Formal Test / suite
  - CI gate
- Technique は Test title に埋め込まず Matrix 側で代表例を結ぶ。
- `requirements_traceability.md` と責務重複を避ける。
  - Requirement / AC → representative regression は requirements traceability。
  - Risk / technique / layer / gate の設計理由は test strategy。
- Formal Regression と Training Test を同じ coverage count として混ぜない。

対象候補:

- `docs/08_testing/test_strategy.md`
- `docs/08_testing/requirements_traceability.md`
- `docs/08_testing/e2e_design.md`
- 必要最小限の contract test / validator

Non-goal:

- 全 test case への metadata tag 追加。
- 新 Test Management DB。
- Coverage を増やすためだけの Test 追加。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `playwright.config.ts` / `package.json` / workflow との manual cross-check

### PR 5 — Training Baseline / Exercise / Artifact / Completion Evidence の整合

目的: Harness が正常であることと Learner が能力を示したことを混同しない実行入口を作る。

実施:

- Web / Native で以下を明記する。
  - Baseline: environment / harness health。
  - Exercise: learner modification boundary。
  - Artifact: learner execution evidence。
  - Completion Evidence: Rubric に渡す証拠。
- 必要なら package script / training workflow template に直接 Exercise entry を追加する。
- Native specialization では baseline success のみを C08 evidence としない。
- Formal CI が learner exercise を Product Required Gate として実行する設計にはしない。
- Web learner CI / Native specialization CI の artifact naming と保存先を分かる形にする。

対象候補:

- `package.json`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `scripts/training/**`
- Training workflow template
- Curriculum / Instructor reference の Evidence section

Validation:

- `pnpm run training:web:baseline`
- 対象 Exercise command
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Native specialization の runtime validation は実行環境がある場合のみ。環境 failure と learner failure を分離する。

### Phase 6 — Refactoring Necessity Review（実装ではなく判断）

目的: Audit の `COMPLEXITY` / `CANDIDATE` を「大きいから直す」にしない。

対象候補ごとに以下を追加調査する。

- recent Git churn / change frequency
- defect / repair history
- CI / runtime failure history
- caller / dependency fan-in
- transaction / state boundary
- test protection
- actual blast radius
- maintainer cognitive cost
- split 時の新しい abstraction / duplication cost

判定:

- `refactor_now`
- `refactor_when_touched`
- `keep_as_is`
- `needs_more_evidence`

優先レビュー対象:

1. `native-customer-application-repositories.ts`
2. `.github/workflows/native-ci.yml`
3. `global.css`
4. `native-purchase-screens.tsx` / `native-screens.tsx`
5. `admin-product-pages.tsx`
6. shared Seed / Agentic QA Harness / Maestro cleanup duplication
7. Domain → Application type dependency

重要:

- Phase 6 では Product code を refactor しない。
- `refactor_now` の対象だけ別 Plan / 別 PR を作る。
- 行数、ファイルサイズ、見た目の巨大さだけでは `refactor_now` にしない。

### Phase 7 — Pilot Feedback（P2 / Follow-up）

目的: Repository だけでは判定できなかった Curriculum の実運用負荷を測る。

最低限記録する項目:

- Completion time
- Instructor support count / category
- Environment block
- Re-submission reason
- Competency ごとの失敗傾向
- Native specialization 選択率 / Environment failure

原則:

- 架空の Required Duration を先に定義しない。
- 実測値が貯まるまでは Curriculum structure の blocker にしない。

## 6. PR / 実行タスク

### 推奨 PR 順序

| Order | PR | 主目的 | 主な依存 |
|---|---|---|---|
| 1 | Current Documentation Drift | Current Fact の修正 | Phase 0 |
| 2 | Decision B + Competency / Assessment | 卒業像・Rubric・Evidence 契約 | PR 1 |
| 3 | Curriculum Core / Extension / Reference | Lesson depth の整合 | PR 2 |
| 4 | Test Strategy / Traceability | Formal strategy の正本化 | PR 1〜3 |
| 5 | Training Evidence | Baseline / Exercise / Artifact の実行契約 | PR 2〜4 |
| 6 | Refactoring Necessity Review | 候補の優先順位判断のみ | PR 1〜5 |
| 7 | Refactor child PRs | `refactor_now` のみ実装 | PR 6 |

### 実行タスク

- [ ] 1. Phase 0 の Current `main` 再検証 Plan を作成し、全 Finding の status を固定する。
- [ ] 2. PR 1 用 Plan を作成し、Current Documentation Drift のみ修正する。
- [ ] 3. PR 2 用 Plan を作成し、Decision B の ADR と Competency / Minimum Evidence 契約を実装する。
- [ ] 4. PR 3 用 Plan を作成し、既存 Lesson の Core / Extension / Reference を調整する。
- [ ] 5. PR 4 用 Plan を作成し、Test Strategy / Traceability を Current formal suite に合わせる。
- [ ] 6. PR 5 用 Plan を作成し、Training Baseline / Exercise / Artifact / Completion Evidence を整える。
- [ ] 7. Refactoring Necessity Review を実施し、`refactor_now` だけを別 Plan へ切り出す。
- [ ] 8. Pilot data を収集できる最小の運用記録方法を決める。

## 7. 検証方法

### Plan-level validation

各子 Plan で、対象変更に応じて以下から必要最小限を選ぶ。無関係な full suite を機械的に毎回実行しない。

#### Documentation / Curriculum

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

#### Test Strategy / Specification

- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`

#### Training implementation

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- 対象 learner exercise command
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

#### Wider implementation impact がある場合のみ

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run verify`

### 成功判定

- 文書と Current config / workflow / implementation に事実差がない。
- Curriculum Required / specialization / Advanced / Reference の境界が README、Rubric、Lesson、Instructor Reference 間で矛盾しない。
- C01〜C12 の Minimum Evidence が一意に追跡できる。
- Product Formal Gate と Curriculum Learner Gate を混同していない。
- Traceability を追加したことで Test implementation の保守コストが不必要に上がっていない。
- Refactoring は追加 Evidence によって必要性が説明できる対象だけ実装候補になる。

## 8. リスクと未解決論点

### Risks

1. **Decision B を Native Product 保証の縮小と誤解するリスク**
   - 対策: ADR / Curriculum / Plan に「Learner Required boundary only」を明記し、Formal Native CI を変更しない。
2. **Documentation Drift 修正と Test Strategy 再設計を一つの PR に混ぜるリスク**
   - 対策: PR 1 は fact repair、PR 4 は strategy design に限定する。
3. **Rubric より Lesson 本文を先に修正して再作業になるリスク**
   - 対策: PR 2 → PR 3 の順序を固定する。
4. **Traceability を過剰実装するリスク**
   - 対策: Markdown Matrix + 既存 validator / contract test を第一候補とし、新 DB / 全 title ID 化を禁止する。
5. **Baseline PASS を Learner competency と誤認するリスク**
   - 対策: Baseline / Exercise / Artifact / Completion Evidence を別欄・別 entry として扱う。
6. **巨大ファイルを見ただけで refactor するリスク**
   - 対策: Phase 6 で churn / failure / blast radius / cognitive cost を必須 Evidence にする。
7. **Audit line number の陳腐化**
   - 対策: 各子 PR 開始時に Current `main` を再確認し、Report line number を patch target として盲信しない。

### Open questions

- Risk / Technique Matrix の最終配置は PR 4 の child Plan で、既存 `test_strategy.md` / `requirements_traceability.md` の重複を比較して確定する。
- Refactoring candidate の優先順位は Phase 6 の追加 Evidence が揃うまで確定しない。
- Pilot の時間目標は実測前に固定しない。

## 9. 成果物

### 今回作成するもの

- 本 Master Plan
- 本作業の `.codex/runs/20260824-201800-JST/` Run Artifact

### 後続で作成するもの

- Phase / PR ごとの child Plan
- Decision B の ADR
- Current Documentation Drift 修正
- Competency / Minimum Evidence 契約
- Curriculum Core / Extension / Reference 調整
- Test Strategy / Traceability 更新
- Training Evidence 実行契約
- Refactoring Necessity Review の durable report（複数ソース調査結果を後続判断で再利用する場合）
- `refactor_now` と判定した対象のみ個別 Refactor Plan

## 10. 実装時の停止条件

以下に当たった場合は、その PR の scope を広げず停止して判断を戻す。

- Current `main` で Report Finding がすでに解消済み。
- Product behavior / Formal CI Gate の変更が必要になった。
- Curriculum Decision B と矛盾する別の明示要件が見つかった。
- 子 PR の intended files を大きく超える変更が必要になった。
- Traceability のために全 Test title / 全 Test file の大量編集が必要になった。
- Refactor の必要性が size 以外の Evidence で説明できない。
- Native 実行環境 failure と learner / source failure を分離できない。

## 11. 優先順位

### P0

1. Current `main` で Finding 再検証。
2. Fact drift 修正。
3. Decision B / Competency / Minimum Evidence 契約。

### P1

4. Curriculum depth 調整。
5. Test Strategy / Traceability。
6. Training Evidence。

### P2

7. Refactoring Necessity Review と必要な child refactor。
8. Pilot feedback の収集と Curriculum 再評価。

## 12. 備考

- 本 Master Plan は Report の全 Finding を「全部直す」指示ではない。
- `MISMATCH` と Assessment 契約の High Finding を優先し、`CANDIDATE` は Evidence を増やしてから判断する。
- 目的は Repository を綺麗に見せることではなく、Curriculum / Test Strategy / Training / Formal Regression の責務境界を明確にし、今後の変更判断を容易にすることである。
