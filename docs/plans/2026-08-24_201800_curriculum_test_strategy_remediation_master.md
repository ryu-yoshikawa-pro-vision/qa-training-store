# Curriculum / Test Strategy Report Remediation Master Plan

## 0. 依頼概要

- 依頼内容:
  - PR #53 で `main` に確定した Repository Audit / Curriculum Validity Review の Findings を、過剰設計を避けながら段階的に解消するための Master Plan を作成する。
  - 後続実装は一つの巨大 PR にまとめず、Current Fact、Curriculum 契約、Lesson depth、Test Strategy / Traceability、Training Evidence、Refactoring Review を分離する。
- 背景:
  - `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
  - `docs/reports/2026-08-24_074011_curriculum-validity-review.md`
  - 上記 Report は Repository baseline commit `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c` を対象に作成され、PR #53 で `main` にマージ済み。
  - 本 Plan 作成開始時の `main` は `74834bf9ac859db5d9aec1f34bd8c6337f4698c8`。
- 期待成果:
  - 全 Finding が Remediation Matrix で一意に追跡できる。
  - 各変更 PR の責務、対象ファイル、検証方法、停止条件が明確で、実装者が大きな設計判断を追加せずに進められる。
  - Current Fact の修正、Curriculum の設計変更、Formal Test Strategy、Training 実行契約、Refactoring 判断を混同しない。

## 1. ゴール / 完了条件

### ゴール

Report の Findings を機械的に全部修正するのではなく、次の順序で Repository の正本と判断境界を整える。

1. Current Documentation と実装 / CI の事実差を解消する。
2. 共通卒業像と Competency / Assessment 契約を確定する。
3. その契約に合わせて Curriculum の Core / Extension / Reference の深さを調整する。
4. Current Test Strategy / Test Perspective / Execution Gate / Traceability を実際の Formal Suite と一致させる。
5. Baseline / Learner Exercise / Artifact / Completion Evidence の役割を明確化する。
6. Technical Debt 候補は追加 Evidence を確認してから Refactoring 必要性を判断する。

### 完了条件（DoD）

- [ ] 本 Plan の Remediation Matrix で、Report の各 `MISMATCH` / `GAP` / Curriculum Finding が `fix` / `defer` / `reject` / `resolved` のいずれかに確定している。
- [ ] `fix` とした Finding は担当 PR / Phase が一意に決まり、完了後に Matrix が `resolved` へ更新される。
- [ ] Decision B を正式な Curriculum 設計判断として記録している。
- [ ] 共通卒業像は「entry-level の汎用 Test Automation Engineer」とし、C08 / Physical Android / Native CI / Native Capstone は specialization として扱う。
- [ ] Decision B が Product / Formal Native Regression / Android Runtime Gate / iOS Build-only Gate の保証を弱める変更に波及していない。
- [ ] E2E command / Gate、Cross-role PR Gate、Playwright project 名、Seed Version、Native / iOS Gate などの Current Documentation Drift が解消されている。
- [ ] 変わりやすい件数・Versionを Current Documentation に重複保持する必要がない場合は、値の単純更新ではなく SSOT 参照へ寄せている。
- [ ] C01〜C12 に bounded level と Minimum Evidence が定義され、Lesson / Exercise / Artifact から直接追跡できる。
- [ ] Baseline receipt と Learner-authored evidence が明確に分離されている。
- [ ] Part 1 / Part 2 の Lesson 数と大順序を維持しつつ、Core / Extension / Reference の深さが整合している。
- [ ] Test Strategy が Test Level、Test Perspective、Execution / Platform / CI Gate を混同せず説明できる。
- [ ] Risk → Technique → Layer → Representative Formal Test の最小 Traceability があり、全 Test title への ID 埋め込みは要求しない。
- [ ] Technical Debt 候補は size 単独ではなく、最低限 churn / defect・repair / blast radius / test protection・boundary の Evidence で判断される。
- [ ] 実際の変更を伴う各子 PR に個別 Plan があり、各 PR 単位で正本間の矛盾を残さず独立して Validation できる。

## 2. 現状理解と前提

### Current understanding

- PR #53 の 2 Report は `main` にマージ済みで、後続判断の durable source of truth として利用する。
- Repository Audit の baseline は `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c`、本 Plan 起点の `main` は `74834bf9ac859db5d9aec1f34bd8c6337f4698c8` である。
- Report で確認された主要な Current mismatch / gap は以下。
  - Required Web E2E 件数 / command の文書差。
  - Cross-role を PR 外とする文書と Current PR Gate の差。
  - Playwright project 名の文書差。
  - Seed Version の Current Documentation / implementation 差。
  - Native を future / Phase 1 外とする Current Documentation の差。
  - iOS を manual-only / PR Required 外とする Curriculum と Current Native Build-only Gate の差。
  - Lesson → Competency → Minimum Evidence の direct mapping 不足。
  - Requirement / Risk / Technique → Formal Test の direct trace 不足。
  - Current Test Strategy が Native / Training / platform parity / operational contract を十分に説明していない。
  - Training Native で Baseline と Learner Exercise の entry / artifact / assessment 境界が薄い。
- Report の `COMPLEXITY` / `CANDIDATE` は Refactor 必須を意味しない。
- `CHANGELOG.md` は履歴であり、過去 version entry を Current 値へ書き換える正本ではない。
- Current Seed Version の implementation SSOT は `src/config/versions.ts` である。
- `package.json` には `validate:curriculum`、`test:contracts`、Training Web / Native baseline 等の既存 validation entry がある。

### Assumptions

- ユーザー承認済み方針として **Decision B** を採用する。
  - 共通卒業像: entry-level の汎用 Test Automation Engineer。
  - Web Automation / Failure / Maintainability / Git / PR / bounded Web CI を共通 Core とする。
  - C08 Native Automation、Physical Android Hands-on、Native CI、Native Capstone は specialization とする。
- Native specialization 化は Curriculum の learner Required / specialization 境界のみを変更する。
- Formal Product Regression、Android Runtime Gate、iOS Build-only Gate、Native implementation の保証範囲は別契約であり、本 Plan では弱めない。
- Native Lesson / Training asset は specialization の canonical asset として残せる。Optional 化は asset 削除を意味しない。
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
- Pilot 実測の完了を今回の Repository remediation の完了条件にすること。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- 現時点で Blocking Question はなし。
- Decision B はユーザー承認済みとして進める。

### 仮定してよい細部

- ADR 番号は実装開始時の `main` で次の空き番号を採用する。
- Traceability は既存 Markdown / validator / contract test を優先し、新しい管理基盤を作らない。
- PR ごとの具体的な branch 名は実装開始時に一意な名前を付ける。
- Risk ID は新設を前提にしない。既存の Risk 名・BR / AC で一意に追跡できない場合だけ stable ID を導入する。

### 未回答の重要質問

以下は本 Master Plan を止めず、該当 Phase 内で Evidence を集めて判断する。

- Risk / Technique Traceability を `docs/08_testing/test_strategy.md` と `docs/12_quality/requirements_traceability.md` のどちらにどこまで置くか。
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

#### Current Test / Quality Documentation

- `docs/08_testing/test_strategy.md`
- `docs/08_testing/e2e_design.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/12_quality/acceptance_criteria.md`
- `docs/07_testability/seed_catalog.md`
- `CHANGELOG.md`（履歴として参照のみ。Current 値へ書き換えない）
- `src/config/versions.ts`
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
- `docs/curriculum/test-automation/part1/10_part1-capstone.md`（Legacy boundary 確認のみ）
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
- `training/github-actions/**`
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

## 5. Remediation Matrix

この表の ID は Master Plan 内の追跡用である。`CUR-*` は Curriculum Review の既存 ID、`RA-*` は Repository Audit の Confirmed Mismatch / Gap / Candidate を追跡するための Plan-local ID である。

Phase 0 では各行の `Current status` を Current `main` で再確認し、`Planned disposition` を `fix` / `defer` / `reject` / `resolved` のいずれかへ確定する。別の Phase 0 Plan / Report は作らず、この Matrix を正本として更新する。

| ID | Finding | Current status | Planned disposition | Owner |
|---|---|---|---|---|
| RA-M1 | Required Web E2E 件数 / command の文書差 | `to_revalidate` | `fix` | PR 1 |
| RA-M2 | Cross-role を PR 外とする文書と Current PR Gate の差 | `to_revalidate` | `fix` | PR 1 |
| RA-M3 | Playwright project 名の文書差 | `to_revalidate` | `fix` | PR 1 |
| RA-M4 | Seed Version の Current Documentation / implementation 差 | `to_revalidate` | `fix` | PR 1 |
| RA-M5 | Test Strategy / Acceptance / E2E 文書が Native を future / Phase 1 外として扱う | `to_revalidate` | `fix` | PR 1 |
| RA-M6 | Curriculum の iOS manual-only 説明と Native change 時 Build-only Required Gate の差 | `to_revalidate` | `fix` | PR 1 |
| RA-G1 | Requirement / Test ID → Product Regression code の direct reference 不足 | `to_revalidate` | `fix` | PR 4 |
| RA-G2 | Lesson → Competency → Minimum Evidence の direct mapping 不足 | `to_revalidate` | `fix` | PR 2 |
| RA-G3 | Technique → Formal Test mapping metadata 不足 | `to_revalidate` | `fix` | PR 4 |
| RA-G4 | Native learner exercise の direct entry / Artifact / assessment 境界が薄い | `to_revalidate` | `fix` | PR 5 |
| RA-G5 | Native failure exercise が README のみで executable flow がない | `to_revalidate` | `defer` を第一候補。Native specialization の Minimum Evidence に必要な場合だけ `fix` | PR 5 |
| RA-G6 | Test Strategy が Current Native / Training / parity / operational contract を十分に説明しない | `to_revalidate` | `fix` | PR 4 |
| RA-Q1 | Domain → Application type dependency の妥当性が未確定 | `to_revalidate` | `defer` して追加 Evidence で判断 | Phase 6 |
| RA-L1 | Legacy P1 Capstone の Maestro 2 flows と canonical / Rubric 1 flow の限定的差 | `to_revalidate` | `reject` を第一候補。Required navigation へ漏れている場合だけ `fix` | Phase 0 / PR 3 |
| RA-C1 | Hotspot / duplication / large file 等の Refactoring candidate 群 | `to_revalidate` | `defer` して Necessity Review | Phase 6 |
| CUR-H1 | Universal path と Audience / Level の不整合 | `to_revalidate` | `fix` | PR 2 / PR 3 |
| CUR-H2 | Lesson から Competency Minimum Evidence への Trace 不足 | `to_revalidate` | `fix` | PR 2 |
| CUR-H3 | C08 / Physical Android の共通卒業要件が未決定 | `decision_made` | `fix`。Decision B を正本化 | PR 2 |
| CUR-M1 | P1-5 への観点集中 | `to_revalidate` | `fix` | PR 3 |
| CUR-M2 | C04 Level 2 と Practice 量の非対称 | `to_revalidate` | `fix` | PR 2 / PR 3 |
| CUR-M3 | C09 Failure Evidence が弱くなり得る | `to_revalidate` | `fix` | PR 2 / PR 3 |
| CUR-M4 | P1-8 Core scope が広い | `to_revalidate` | `fix` | PR 3 |
| CUR-M5 | Native baseline と meaningful learner flow の Assessment 差 | `to_revalidate` | `fix` | PR 2 / PR 5 |
| CUR-M6 | Part 2 の Repository 固有運用詳細が Core と同深度 | `to_revalidate` | `fix` | PR 3 |
| CUR-M7 | Learner exercise の継続評価境界が薄い | `to_revalidate` | `fix` | PR 2 / PR 5 |
| CUR-M8 | C12 scope が広い | `to_revalidate` | `fix` | PR 2 / PR 3 |
| CUR-M9 | iOS Current Gate の Documentation Drift | `to_revalidate` | `fix` | PR 1 |
| CUR-L1 | Spiral と説明重複の境界が薄い | `to_revalidate` | `fix` は最小ラベル整理のみ | PR 3 |
| CUR-L2 | Pilot 実測値がない | `to_revalidate` | `defer`。Repository remediation 完了後の Follow-up | Follow-up |

## 6. 変更方針

### 基本原則

1. **Fact repair と design change を分ける。**
2. **Curriculum specialization 化を Product Quality Gate の弱体化へ波及させない。**
3. **Lesson 本文を先に大量編集せず、North Star / Competency / Evidence 契約を先に固定する。**
4. **各 PR 終了時点で正本間の矛盾を残さない。** 次 PR で直す前提の一時的不整合を merge しない。
5. **Volatile fact は SSOT 参照を優先する。** 件数・Versionを複数文書へ固定値として複製しない。
6. **Traceability は最小構成にする。** 全 Test title への ID 埋め込みや新 DB は作らない。
7. **Refactoring は最後に判断する。** size は investigation trigger であり refactor reason ではない。
8. 子 Plan を作るのは実際の変更を伴う PR 1〜5 と、`refactor_now` と判定した個別 Refactor のみとする。

### Phase 0 — Current `main` で Finding を再検証する

目的: Audit baseline から `main` が進んだことで、すでに解消・変質した Finding を誤って修正しない。

実施:

- Audit baseline `4ed5374...` と Phase 開始時 `main` の差分を確認する。
- Remediation Matrix の各行を Current implementation / workflow / docs で再確認する。
- `Current status` を次のいずれかへ更新する。
  - `still_valid`
  - `resolved_since_audit`
  - `scope_changed`
  - `decision_made`
- `Planned disposition` を `fix` / `defer` / `reject` / `resolved` のいずれかへ確定する。
- `resolved_since_audit` は再修正しない。
- Current implementation / workflow / docs の事実を再取得してから PR 1〜5 の子 Plan の対象ファイルを確定する。

成果物:

- 本 Master Plan の Remediation Matrix 更新のみ。
- Phase 0 専用 child Plan / durable report は作らない。

Exit criteria:

- 全 Matrix 行の Current status / disposition / owner が Current `main` 基準で確定している。
- 古い line number だけを根拠にした修正対象がない。

### PR 1 — Current Documentation Drift の最小修正

目的: 設計判断なしで修正できる Current Fact の不整合を先に除去する。

主対象:

- Required E2E の Current command /対象 spec / Gate の説明。
- Cross-role PR Gate の説明。
- Playwright project 名。
- Seed Version の Current SSOT 説明。
- Native を future / Phase 1 外とする古い Current Documentation。
- iOS の `manual dispatch`、`Native change 時 Required Build-only`、`Runtime 非保証` の区別。

SSOT repair rule:

- 固定値を最新値へ置換するだけで同じ Drift が再発する場合は、値の重複保持をやめて executable SSOT を参照する。
- Web E2E は「N本」を Current contract として重複保持する必要がなければ、`package.json` の `test:e2e:chromium`、対象 spec、CI matrix / verify を Current execution SSOT として説明する。
- Seed Version は `src/config/versions.ts` を Current implementation SSOT とする。`docs/07_testability/seed_catalog.md` は Current 値と一致させるか SSOT 参照へ寄せる。
- `CHANGELOG.md` の過去 entry は履歴なので Current 値へ書き換えない。
- Native の Current Guarantee は Product / Formal CI の現状を記述するだけで、Decision B の Curriculum Required / specialization 設計を PR 1 へ混ぜない。

対象候補:

- `docs/08_testing/e2e_design.md`
- `docs/08_testing/test_strategy.md` の factual statement のみ
- `docs/12_quality/requirements_traceability.md` の factual statement のみ
- `docs/12_quality/acceptance_criteria.md` の factual statement のみ
- `docs/07_testability/seed_catalog.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md` の Current Gate 事実のみ
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md` の Current Gate 事実のみ

Non-goal:

- Curriculum Required / specialization 再設計。
- Test Strategy table の全面再構成。
- CI / Test code の変更。
- Historical CHANGELOG の改変。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Current config / workflow / version SSOT との manual cross-check

Exit criteria:

- PR 1 で触れた Current fact は executable SSOT / ADR / implementation と一致する。
- 将来変わりやすい件数・Versionの不要な重複固定値を増やしていない。
- Curriculum の Required / specialization 境界はまだ変更していない。

### PR 2 — Decision B + Competency / Assessment Contract

目的: Lesson の深さを直す前に「何を共通卒業要件として、何を Evidence にして評価するか」を正本化する。

実施:

- 次の空き ADR で Decision B を記録する。
  - 共通卒業像: entry-level Test Automation Engineer。
  - C08 / Physical Android / Native CI / Native Capstone は specialization。
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
- Validator / contract test は、Native asset の存在を要求することと、Native を common graduation Required にすることを分離して検証する。

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
- TypeScript source / contract test を変更した場合は `pnpm run typecheck`

Exit criteria:

- Lesson を読まなくても Rubric から各 Competency の Minimum Evidence が分かる。
- Native specialization 化と Product Native Gate が明確に分離されている。
- P1-7 / P2-6 等の Native Lesson / Training asset は canonical asset として残りつつ、README / Learning Design / Rubric / Instructor Guidance 上で common graduation Required とは読めない。
- PR 3 で深さを調整する前でも、PR 2 単体で正本間に矛盾がない。

### PR 3 — Curriculum Core / Extension / Reference 再編

目的: PR 2 の契約に合わせ、Lesson 数と大順序を維持したまま Required depth と説明の重複を調整する。

Part 1:

- P1-3:
  - 技法数 quota より「Risk に対する適切な technique 選択」を中心にする。
- P1-5:
  - Core: Cart / explicit reset / 代表 Boundary / 代表 Mobile。
  - Extension: Payment / Cross-role / Internal Inspection / Accessibility execution。
- P1-6:
  - meaningful failure diagnosis を Completion Evidence にする。
- P1-7:
  - Native specialization として深さ・navigation・completion wording を整える。
  - Physical Android canonical path 自体は削除しない。
- P1-8:
  - Core: 実在する保守問題の診断 + 最小改善 1件。
  - Reference: POM / Helper / Fixture / Flow pattern catalog。
  - 仕様変更 Lifecycle / Regression inventory は Part 2 bridge に寄せる。
- P1-9:
  - Web Core Capstone を共通卒業 chain とする。
  - Native evidence は specialization として別 section にする。
  - Harness baseline と Learner-authored flow を分離する。
- Spiral repetition:
  - Role / State / Seed / Reset 等は新概念として再説明するのではなく、`Canonical Definition` と `Application Practice` を短く区別する。
- Legacy P1-10:
  - Required navigation 外であることを確認する。
  - canonical completion criteria へ漏れていなければ Historical / Legacy として書き換えない。

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
- PR 2 で確定した Competency / Minimum Evidence を再設計しない。必要な矛盾が見つかった場合は scope を広げず判断を戻す。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Curriculum navigation / required asset / specialization boundary の manual cross-check

### PR 4 — Test Strategy / Test Perspective / Traceability の再整備

目的: Current Formal Suite と Strategy の説明を一致させ、Coverage の存在、Test Perspective、Execution Gate、Traceability metadata を分けて管理する。

`test_strategy.md` は最低限次の3軸で整理する。これらを一つの「Test Layer」表へ混ぜない。

1. **Test Level / Test Type**
   - Unit
   - Application Integration
   - Repository Contract
   - Component
   - Static / Operational Contract
   - Web E2E
   - Native Component / Repository / Android Runtime E2E
   - Deployed / Production Smoke
2. **Test Perspective**
   - Accessibility
   - Responsive / Mobile Web
   - Role / State / Boundary / Failure 等、Risk に応じた代表 Perspective
3. **Execution / Platform / CI Gate**
   - Formal vs Training boundary
   - PR / main / periodic / manual
   - Android Runtime
   - iOS Build-only
   - Platform parity / operational contract

Traceability:

- Current Product Risk list を再確認する。
- stable Risk ID は既存 Risk 名・BR / AC だけでは一意に追跡できない場合だけ導入する。新 `R01` 体系を作ること自体を目的にしない。
- 最小 Traceability は次を結ぶ。
  - Risk または一意な Risk label
  - Normative Spec / AC
  - Representative technique / perspective
  - Primary level
  - Representative Formal Test / suite
  - CI gate
- Technique は Test title に埋め込まず Matrix 側で代表例を結ぶ。
- `docs/12_quality/requirements_traceability.md` と責務重複を避ける。
  - Requirement / AC → representative regression は requirements traceability を第一候補とする。
  - Risk / technique / level / gate の設計理由は test strategy を第一候補とする。
  - 実装時に重複が増える場合は、既存 Matrix を拡張して一方から参照し、新しい第三の traceability file は作らない。
- Formal Regression と Training Test を同じ coverage count として混ぜない。

対象候補:

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/08_testing/e2e_design.md`
- 必要最小限の contract test / validator

Non-goal:

- 全 test case への metadata tag 追加。
- 新 Test Management DB。
- Coverage を増やすためだけの Test 追加。
- Stable Risk ID の新設そのもの。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- Curriculum 文書を変更した場合のみ `pnpm run validate:curriculum`
- `playwright.config.ts` / `package.json` / workflow / Formal Test inventory との manual cross-check

Exit criteria:

- Test Level、Perspective、Execution / Platform Gate が区別されている。
- Requirement / AC → regression と Risk / technique / gate の責務が重複せず追跡できる。
- Traceability のために Formal Test implementation を大量変更していない。

### PR 5 — Training Baseline / Exercise / Artifact / Completion Evidence の整合

目的: Harness が正常であることと Learner が能力を示したことを混同しない実行入口を作る。

実施:

- Web / Native で以下を明記する。
  - Baseline: environment / harness health。
  - Exercise: learner modification boundary。
  - Artifact: learner execution evidence。
  - Completion Evidence: Rubric に渡す証拠。
- 必要な場合だけ package script / training workflow template に直接 Exercise entry を追加する。
- Native specialization では baseline success のみを C08 evidence としない。
- Native failure exercise は Web との見た目の対称性だけで executable flow を追加しない。
  - C08 / Native specialization の Minimum Evidence を満たすために failure exercise が必要なら最小実装する。
  - 既存 learner flow / artifact で十分なら `defer` または `reject` とし README の役割だけ明確化する。
- Formal CI が learner exercise を Product Required Gate として実行する設計にはしない。
- Web learner CI / Native specialization CI の artifact naming と保存先を分かる形にする。

対象候補:

- `package.json`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `training/github-actions/**`
- `scripts/training/**`
- Curriculum / Instructor Reference の Evidence section

Validation:

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- 対象 learner Exercise command
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Native specialization の runtime validation は実行環境がある場合のみ。Environment failure と learner / source failure を分離する。

Exit criteria:

- Baseline PASS と learner competency PASS の意味が文書・command・Artifactで区別できる。
- Native specialization の Completion Evidence が baseline だけに依存しない。
- Product Required Gate に learner exercise を混入させていない。

### Phase 6 — Refactoring Necessity Review（実装ではなく判断）

目的: Audit の `COMPLEXITY` / `CANDIDATE` を「大きいから直す」にしない。

対象候補ごとに最低限確認する Evidence:

- recent Git churn / change frequency
- defect / repair history または CI / runtime failure history
- actual blast radius / caller・dependency boundary
- test protection
- transaction / state / platform boundary

補助 Evidence:

- maintainer cognitive cost
- split 時に新たに発生する abstraction / duplication cost

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
- 行数、ファイルサイズ、見た目の巨大さ、主観的な cognitive cost だけでは `refactor_now` にしない。
- Evidence が弱い場合は `keep_as_is` または `needs_more_evidence` で終了してよい。

### Follow-up — Pilot Feedback

Pilot は Repository remediation の完了条件から外す。Curriculum を実運用した後の Follow-up として、必要最小限だけ記録する。

候補:

- Completion time
- Instructor support count / category
- Environment block
- Re-submission reason
- Competency ごとの失敗傾向
- Native specialization 選択率 / Environment failure

原則:

- 架空の Required Duration を先に定義しない。
- 実測値が貯まるまでは Repository remediation の blocker にしない。
- 専用システムは作らず、既存運用で記録できる最小形式から始める。

## 7. PR / 実行タスク

### 推奨 PR 順序

| Order | PR / Phase | 主目的 | 主な依存 |
|---|---|---|---|
| 0 | Phase 0 | Remediation Matrix を Current `main` で確定 | なし |
| 1 | Current Documentation Drift | Current Fact / SSOT の修正 | Phase 0 |
| 2 | Decision B + Competency / Assessment | 卒業像・Rubric・Evidence 契約 | PR 1 |
| 3 | Curriculum Core / Extension / Reference | Lesson depth の整合 | PR 2 |
| 4 | Test Strategy / Traceability | Formal strategy の正本化 | PR 1〜3 |
| 5 | Training Evidence | Baseline / Exercise / Artifact の実行契約 | PR 2〜4 |
| 6 | Refactoring Necessity Review | 候補の優先順位判断のみ | PR 1〜5 |
| 7 | Refactor child PRs | `refactor_now` のみ実装 | Phase 6 |

### 実行タスク

- [ ] 1. 本 Master Plan の Remediation Matrix を Current `main` で再検証し、全 Finding の status / disposition / owner を確定する。
- [ ] 2. PR 1 用 Plan を作成し、Current Documentation Drift / SSOT 修正のみ実装する。
- [ ] 3. PR 2 用 Plan を作成し、Decision B の ADR と Competency / Minimum Evidence 契約を実装する。
- [ ] 4. PR 3 用 Plan を作成し、既存 Lesson の Core / Extension / Reference を調整する。
- [ ] 5. PR 4 用 Plan を作成し、Test Level / Perspective / Execution Gate / Traceability を Current Formal Suite に合わせる。
- [ ] 6. PR 5 用 Plan を作成し、Training Baseline / Exercise / Artifact / Completion Evidence を整える。
- [ ] 7. Refactoring Necessity Review を実施し、`refactor_now` だけを別 Plan へ切り出す。

Pilot feedback は上記 remediation 完了後の Follow-up であり、実行タスク 1〜7 の完了を妨げない。

## 8. 検証方法

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
- 対象 learner Exercise command
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

#### TypeScript / workflow contract への影響がある場合

- `pnpm run typecheck`
- 対象 Test / contract test

#### Wider implementation impact がある場合のみ

- `pnpm run test`
- `pnpm run verify`

### 成功判定

- 文書と Current config / workflow / implementation に事実差がない。
- Current 値を重複保持する場合は、その必要性と SSOT が明確である。
- Curriculum Required / specialization / Advanced / Reference の境界が README、Learning Design、Rubric、Lesson、Instructor Reference 間で矛盾しない。
- C01〜C12 の Minimum Evidence が一意に追跡できる。
- Product Formal Gate と Curriculum Learner Gate を混同していない。
- Test Level、Perspective、Execution / Platform Gate を同じ概念として扱っていない。
- Traceability を追加したことで Test implementation の保守コストが不必要に上がっていない。
- Refactoring は追加 Evidence によって必要性が説明できる対象だけ実装候補になる。

## 9. リスクと未解決論点

### Risks

1. **Decision B を Native Product 保証の縮小と誤解するリスク**
   - 対策: ADR / Curriculum / Plan に「Learner Required boundary only」を明記し、Formal Native CI を変更しない。
2. **Documentation Drift 修正と Test Strategy 再設計を一つの PR に混ぜるリスク**
   - 対策: PR 1 は fact / SSOT repair、PR 4 は strategy design に限定する。
3. **Rubric より Lesson 本文を先に修正して再作業になるリスク**
   - 対策: PR 2 → PR 3 の順序を固定する。
4. **PR 2 と PR 3 の中間で正本が矛盾するリスク**
   - 対策: PR 2 単体で README / Learning Design / Rubric / Instructor Guidance / Validator の Required boundary を整合させ、PR 3 は深さ調整に限定する。
5. **Volatile fact の値だけ更新し Drift を再発させるリスク**
   - 対策: executable SSOT / version SSOT 参照を優先し、履歴文書を Current 値へ書き換えない。
6. **Traceability を過剰実装するリスク**
   - 対策: 既存 `test_strategy.md` / `requirements_traceability.md` + validator / contract test を第一候補とし、新 DB / 全 title ID 化を禁止する。
7. **Baseline PASS を Learner competency と誤認するリスク**
   - 対策: Baseline / Exercise / Artifact / Completion Evidence を別欄・別 entry として扱う。
8. **巨大ファイルを見ただけで refactor するリスク**
   - 対策: Phase 6 で churn / defect・repair / blast radius / test protection・boundary を中核 Evidence にする。
9. **Audit line number の陳腐化**
   - 対策: 各子 PR 開始時に Current `main` を再確認し、Report line number を patch target として盲信しない。
10. **Finding の取りこぼし**
    - 対策: Remediation Matrix 以外で Finding status を管理せず、PR 完了時に該当行を `resolved` へ更新する。

### Open questions

- Risk / Technique Matrix の最終配置は PR 4 の child Plan で、`docs/08_testing/test_strategy.md` と `docs/12_quality/requirements_traceability.md` の責務重複を比較して確定する。
- Refactoring candidate の優先順位は Phase 6 の追加 Evidence が揃うまで確定しない。
- Pilot の時間目標は実測前に固定しない。

## 10. 成果物

### 今回作成するもの

- 本 Master Plan
- 本作業の `.codex/runs/20260824-201800-JST/` Run Artifact

### 後続で作成するもの

- PR 1〜5 ごとの child Plan
- Decision B の ADR
- Current Documentation Drift / SSOT 修正
- Competency / Minimum Evidence 契約
- Curriculum Core / Extension / Reference 調整
- Test Strategy / Traceability 更新
- Training Evidence 実行契約
- Refactoring Necessity Review の durable report（複数ソース調査結果を後続判断で再利用する場合のみ）
- `refactor_now` と判定した対象のみ個別 Refactor Plan

### 作らないもの

- Phase 0 専用 child Plan / report
- Finding tracking 専用 DB / spreadsheet / third-party tool
- Pilot 管理専用システム
- 必要性が証明されていない Refactor PR

## 11. 実装時の停止条件

以下に当たった場合は、その PR の scope を広げず停止して判断を戻す。

- Current `main` で Report Finding がすでに解消済み。
- Product behavior / Formal CI Gate の変更が必要になった。
- Curriculum Decision B と矛盾する別の明示要件が見つかった。
- PR 2 単体で Required / specialization 正本の整合を取れず、Lesson 本文の大規模変更が不可避になった。
- 子 PR の intended files を大きく超える変更が必要になった。
- Traceability のために全 Test title / 全 Test file の大量編集が必要になった。
- Stable Risk ID を新設しないと追跡できない理由を説明できない。
- Refactor の必要性が size / 主観だけでしか説明できない。
- Native 実行環境 failure と learner / source failure を分離できない。

## 12. 優先順位

### P0

1. Current `main` で Remediation Matrix 再検証。
2. Fact / SSOT drift 修正。
3. Decision B / Competency / Minimum Evidence 契約。

### P1

4. Curriculum depth / repetition 調整。
5. Test Strategy / Traceability。
6. Training Evidence。

### P2

7. Refactoring Necessity Review と必要な child refactor。

### Follow-up

- Pilot feedback の収集と Curriculum 再評価。

## 13. 備考

- 本 Master Plan は Report の全 Finding を「全部直す」指示ではない。全 Finding を追跡し、根拠を持って `fix` / `defer` / `reject` / `resolved` を決める計画である。
- `MISMATCH` と Assessment 契約の High Finding を優先し、`CANDIDATE` は Evidence を増やしてから判断する。
- 詳細さのために Plan 階層や管理基盤を増やさない。Phase 0 は本 Plan の Matrix 更新で完了する。
- 目的は Repository を綺麗に見せることではなく、Curriculum / Test Strategy / Training / Formal Regression の責務境界を明確にし、今後の変更判断を容易にすることである。