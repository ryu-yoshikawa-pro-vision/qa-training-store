# Curriculum / Test Strategy Report Remediation Master Plan

## 0. 依頼概要

- 依頼内容:
  - PR #53 で `main` に確定した Repository Audit / Curriculum Validity Review の Findings を、過剰設計を避けながら段階的に解消する。
  - 後続実装は巨大 PR にせず、Current Fact / SSOT、Formal Test Strategy、Curriculum 契約、Lesson depth、Training Evidence、Refactoring Review を分離する。
- 参照 Report:
  - `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
  - `docs/reports/2026-08-24_074011_curriculum-validity-review.md`
- Audit baseline:
  - `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c`
- 本 Plan 作成開始時の `main`:
  - `74834bf9ac859db5d9aec1f34bd8c6337f4698c8`

### 期待成果

- 全 Finding が本 Plan の Remediation Matrix から一意に追跡できる。
- 各 Finding は Primary owner を1つだけ持ち、どの PR / Phase で解消判断するか迷わない。
- 各変更 PR の責務、対象候補、Exit criteria、Validation、停止条件が明確である。
- Current Fact、Formal Test Strategy、Curriculum、Training、Refactoring の責務を混同しない。
- 新しい管理基盤、全 Test への metadata 追加、根拠のない Refactor などを導入しない。

## 1. ゴール / 完了条件

### ゴール

Report の Findings を機械的に全部修正するのではなく、以下の依存順で Repository の正本と判断境界を整える。

1. Current Documentation と implementation / CI の事実差を解消する。
2. Current Formal Suite を基準に Test Strategy / Perspective / Execution Gate / Traceability を整える。
3. Formal Strategy を踏まえ、共通卒業像と Competency / Assessment 契約を確定する。
4. その契約に合わせて Curriculum の Core / Extension / Reference の深さを調整する。
5. Baseline / Learner Exercise / Artifact / Completion Evidence の実行契約を明確化する。
6. Technical Debt 候補は追加 Evidence を確認してから Refactoring 必要性を判断する。

### 完了条件（DoD）

- [ ] Master Plan の plan-only PR が `main` に merge されてから Phase 0 / child PR を開始している。
- [ ] Remediation Matrix の全 Finding が `fix` / `defer` / `reject` / `resolved` のいずれかに確定している。
- [ ] `fix` Finding は Primary owner が1つに定まり、Primary owner 完了時に `resolved` へ更新される。
- [ ] Follow-up verification は Primary owner を置き換えず、後続 PR で回帰確認だけを行う。
- [ ] Decision B を正式な Curriculum 設計判断として ADR に記録している。
- [ ] 共通卒業像は entry-level の汎用 Test Automation Engineer とし、C08 / Physical Android / Native CI / Native Capstone は specialization として扱う。
- [ ] Decision B が Product / Formal Native Regression / Android Runtime Gate / iOS Build-only Gate の保証を弱めていない。
- [ ] E2E command / Gate、Cross-role PR Gate、Playwright project 名、Seed Version、Native / iOS Gate などの Current Documentation Drift が解消されている。
- [ ] 変わりやすい件数・Versionを不要に文書へ重複保持せず、可能な箇所は executable / implementation SSOT 参照へ寄せている。
- [ ] Test Strategy が Test Level / Test Type、Test Perspective、Execution / Platform / CI Gate を区別している。
- [ ] Requirement / AC → representative regression と Risk / Technique / Level / Gate の最小 Traceability がある。
- [ ] C01〜C12 に bounded level、Minimum Evidence、Required / specialization / advanced の境界が定義されている。
- [ ] Lesson / Exercise / Artifact から Competency / Minimum Evidence を直接追跡できる。
- [ ] Baseline receipt と Learner-authored evidence が明確に分離されている。
- [ ] Native learner exercise に canonical local command があり、baseline と exercise の Evidence を区別できる。
- [ ] Learner exercise を Product Required Formal Gate に混入させていない。
- [ ] Part 1 / Part 2 の Lesson 数と大順序を維持しつつ、Core / Extension / Reference の深さが整合している。
- [ ] Technical Debt 候補は size 単独ではなく churn / repair history / blast radius / test protection / boundary の Evidence で判断されている。
- [ ] 実変更を伴う各 child PR に個別 Plan があり、各 PR 単体で正本間の矛盾を残さず Validation できる。

## 2. 現状理解と前提

### Current understanding

- PR #53 の2 Report は `main` に merge 済みで、後続判断の durable source of truth とする。
- Report の主要 Current mismatch / gap は以下。
  - Required Web E2E 件数 / command の文書差。
  - Cross-role を PR 外とする文書と Current PR Gate の差。
  - Playwright project 名の文書差。
  - Seed Version の Current Documentation / implementation 差。
  - Native を future / Phase 1 外とする Current Documentation の差。
  - iOS を manual-only / PR Required 外とする Curriculum と Current Native Build-only Gate の差。
  - Requirement / Risk / Technique → Formal Test の direct trace 不足。
  - Current Test Strategy が Native / Training / parity / operational contract を十分に説明していない。
  - Lesson → Competency → Minimum Evidence の direct mapping 不足。
  - Training Native で Baseline と Learner Exercise の direct entry / artifact / assessment 境界が薄い。
- `CHANGELOG.md` は履歴であり、過去 entry を Current 値へ書き換える正本ではない。
- Current Seed Version の implementation SSOT は `src/config/versions.ts` である。
- Native learner exercise YAML は既に存在するが、canonical package command / runner / CI artifact contract は baseline より薄い。
- `package.json` には `validate:curriculum`、`test:contracts`、Training Web / Native baseline 等の既存 validation entry がある。
- Report の `COMPLEXITY` / `CANDIDATE` は Refactor 必須を意味しない。

### Assumptions

- ユーザー承認済み方針として **Decision B** を採用する。
  - 共通卒業像: entry-level の汎用 Test Automation Engineer。
  - Web Automation / Failure / Maintainability / Git / PR / bounded Web CI を共通 Core とする。
  - C08 Native Automation、Physical Android Hands-on、Native CI、Native Capstone は specialization とする。
- Native specialization 化は Curriculum の learner Required / specialization 境界だけを変更する。
- Formal Product Regression、Android Runtime Gate、iOS Build-only Gate、Native implementation の保証は別契約であり弱めない。
- Native Lesson / Training asset は specialization の canonical asset として残す。specialization 化は asset 削除を意味しない。
- Normative Specification を Oracle とする既存方針を維持する。
- Analysis → Design → Selection → Implementation → Failure → Maintainability → Development Process の大順序を維持する。

### Non-goals

- Product behavior の変更。
- Curriculum 軽量化を理由に Formal Regression を削減すること。
- Native Product / Native CI の廃止・Optional 化。
- 新 LMS / Test Management Tool / Framework の導入。
- Curriculum 全面書き直し、Lesson の大量追加。
- POM の必須化。
- iOS Runtime / Maestro を Required Product Guarantee にすること。
- Hotspot の行数だけを理由にしたファイル分割。
- 全 Formal Test title への BR / AC / Risk / Technique ID 埋め込み。
- Pilot 実測の完了を Repository remediation の完了条件にすること。
- Refactoring Review の結果が出る前に Product refactor を実装すること。

## 3. 質問 / 曖昧性

### Blocking Question

- 現時点ではなし。
- Decision B はユーザー承認済みとして進める。

### 実装時に仮定してよい細部

- ADR 番号は実装開始時の最新 `main` で次の空き番号を採用する。
- Traceability は既存 Markdown / validator / contract test を優先し、新管理基盤を作らない。
- Risk ID は新設を前提にしない。既存 Risk 名・BR / AC で一意に追跡できない場合だけ stable ID を導入する。
- child branch は依存 PR merge 後の最新 `main` から作る。原則 stacked PR は使わない。

### Phase 内で Evidence を集めて判断する項目

- Risk / Technique Traceability を `docs/08_testing/test_strategy.md` と `docs/12_quality/requirements_traceability.md` のどちらへどこまで置くか。
- Domain → Application type dependency が intentional sharing か architecture violation か。
- Native Guest Cart compatibility surface の長期 owner / change protocol。
- Pilot の講師支援量・完了時間・Environment block の実測値。

## 4. 影響範囲

### Durable Evidence

- `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
- `docs/reports/2026-08-24_074011_curriculum-validity-review.md`

### Current Test / Quality Documentation

- `docs/08_testing/test_strategy.md`
- `docs/08_testing/e2e_design.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/12_quality/acceptance_criteria.md`
- `docs/07_testability/seed_catalog.md`
- `CHANGELOG.md`（参照のみ。Historical entry は Current 値へ書き換えない）
- `src/config/versions.ts`
- `playwright.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`

### Curriculum

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning_design.md`
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

### Refactoring Evidence Candidates

- `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`
- `src/infrastructure/database/sqlite/native-customer-repositories.ts`
- `src/presentation/native/native-purchase-screens.tsx`
- `src/presentation/native/native-screens.tsx`
- `src/presentation/pages/admin-product-pages.tsx`
- `.github/workflows/native-ci.yml`
- `src/presentation/styles/global.css`
- `src/seeds/**`
- `scripts/agentic-qa/**`
- Maestro cleanup duplication
- Domain → Application type dependency

## 5. Remediation Matrix

この Matrix だけを Finding status の正本とする。別 spreadsheet / DB は作らない。

- `Primary owner`: Finding の disposition / resolved 判断に責任を持つ唯一の PR / Phase。
- `Follow-up verification`: 後続変更で再確認する箇所。Primary owner ではなく、Finding を再オープンすべき回帰がないかだけ確認する。
- Phase 0 で Current `main` を再確認し、`Current status` と `Disposition` を確定する。

| ID | Finding | Current status | Disposition | Primary owner | Follow-up verification |
| --- | --- | --- | --- | --- | --- |
| RA-M1 | Required Web E2E 件数 / command の文書差 | `to_revalidate` | `fix` | PR 1 | PR 2 |
| RA-M2 | Cross-role を PR 外とする文書と Current PR Gate の差 | `to_revalidate` | `fix` | PR 1 | PR 2 |
| RA-M3 | Playwright project 名の文書差 | `to_revalidate` | `fix` | PR 1 | PR 2 |
| RA-M4 | Seed Version の Current Documentation / implementation 差 | `to_revalidate` | `fix` | PR 1 | なし |
| RA-M5 | Test Strategy / Acceptance / E2E 文書が Native を future / Phase 1 外として扱う | `to_revalidate` | `fix` | PR 1 | PR 2 / PR 3 |
| RA-M6 | Curriculum の iOS manual-only 説明と Native change 時 Build-only Required Gate の差 | `to_revalidate` | `fix` | PR 1 | PR 2 / PR 3 |
| RA-G1 | Requirement / Test ID → Product Regression code の direct reference 不足 | `to_revalidate` | `fix` | PR 2 | なし |
| RA-G2 | Lesson → Competency → Minimum Evidence の direct mapping 不足 | `to_revalidate` | `fix` | PR 3 | PR 4 / PR 5 |
| RA-G3 | Technique → Formal Test mapping metadata 不足 | `to_revalidate` | `fix` | PR 2 | PR 3 |
| RA-G4 | Native learner exercise の direct entry / Artifact / assessment 境界が薄い | `to_revalidate` | `fix` | PR 5 | なし |
| RA-G5 | Native failure exercise が README のみで executable flow がない | `to_revalidate` | `defer` を第一候補。C08 Minimum Evidence に不可欠な場合だけ `fix` | PR 5 | なし |
| RA-G6 | Test Strategy が Current Native / Training / parity / operational contract を十分に説明しない | `to_revalidate` | `fix` | PR 2 | PR 3 |
| RA-Q1 | Domain → Application type dependency の妥当性が未確定 | `to_revalidate` | `defer` して Evidence で判断 | Phase 6 | なし |
| RA-L1 | Legacy P1 Capstone の Maestro 2 flows と canonical / Rubric 1 flow の限定的差 | `to_revalidate` | `reject` を第一候補。Required navigation へ漏れている場合だけ `fix` | Phase 0 | PR 4 |
| RA-C1 | Hotspot / duplication / large file 等の Refactoring candidate 群 | `to_revalidate` | `defer` して Necessity Review | Phase 6 | なし |
| CUR-H1 | Universal path と Audience / Level の不整合 | `to_revalidate` | `fix` | PR 3 | PR 4 |
| CUR-H2 | Lesson から Competency Minimum Evidence への Trace 不足 | `to_revalidate` | `fix` | PR 3 | PR 4 / PR 5 |
| CUR-H3 | C08 / Physical Android の共通卒業要件が未決定 | `decision_made` | `fix`。Decision B を正本化 | PR 3 | PR 4 / PR 5 |
| CUR-M1 | P1-5 への観点集中 | `to_revalidate` | `fix` | PR 4 | なし |
| CUR-M2 | C04 Level 2 と Practice 量の非対称 | `to_revalidate` | `fix` | PR 3 | PR 4 |
| CUR-M3 | C09 Failure Evidence が弱くなり得る | `to_revalidate` | `fix` | PR 3 | PR 4 |
| CUR-M4 | P1-8 Core scope が広い | `to_revalidate` | `fix` | PR 4 | なし |
| CUR-M5 | Native baseline と meaningful learner flow の Assessment 差 | `to_revalidate` | `fix` | PR 3 | PR 5 |
| CUR-M6 | Part 2 の Repository 固有運用詳細が Core と同深度 | `to_revalidate` | `fix` | PR 4 | なし |
| CUR-M7 | Learner exercise の継続評価境界が薄い | `to_revalidate` | `fix` | PR 3 | PR 5 |
| CUR-M8 | C12 scope が広い | `to_revalidate` | `fix` | PR 3 | PR 4 |
| CUR-M9 | iOS Current Gate の Documentation Drift | `to_revalidate` | `fix` | PR 1 | PR 2 / PR 3 |
| CUR-L1 | Spiral と説明重複の境界が薄い | `to_revalidate` | `fix` は最小ラベル整理のみ | PR 4 | なし |
| CUR-L2 | Pilot 実測値がない | `to_revalidate` | `defer`。Repository remediation 後の Follow-up | Follow-up | なし |

## 6. 実行前提と Branch / PR 運用

### Master Plan merge prerequisite

- 本 Master Plan は plan-only PR として最初に `main` へ merge する。
- Phase 0、PR 1〜5、Phase 6 は Master Plan を含む最新 `main` を基準に開始する。
- Master Plan merge 前に Product / Curriculum / Test Strategy 実装へ進まない。

### Child branch rule

- 各 child branch は、依存 PR merge 後の最新 `main` から作成する。
- 原則 stacked PR は使わない。
- 各 child PR は、自分が Primary owner の Matrix 行だけを `resolved` へ更新する。
- Follow-up verification で回帰を発見した場合は、既存 `resolved` を黙って上書きせず、当該 child Plan で再オープン理由を記録する。

### Phase 0 の扱い

- Phase 0 専用 Plan / durable report は作らない。
- PR 1 branch 作成後、PR 1 child Plan を書く前に Current `main` を read-only で再検証する。
- Matrix の `Current status` / `Disposition` / Primary owner を Current `main` 基準で確定し、その更新を PR 1 に含める。
- Phase 0 の結果で PR 1 scope が変わった場合は、その結果を前提に PR 1 child Plan を作る。

## 7. 変更方針

### 基本原則

1. **Fact repair と design change を分ける。**
2. **Formal Test Strategy を Curriculum 契約より先に整える。** C05 / C12 などの評価契約が古い Test Strategy を前提にしないようにする。
3. **Curriculum specialization 化を Product Quality Gate の弱体化へ波及させない。**
4. **各 PR 終了時点で正本間の矛盾を残さない。** 次 PR で直す前提の一時的不整合を merge しない。
5. **Volatile fact は SSOT 参照を優先する。** 件数・Versionを複数文書へ固定値として複製しない。
6. **Traceability は最小構成にする。** 全 Test title ID化、新 DB、新しい第三の traceability file を作らない。
7. **Training は Baseline と Learner Evidence を分ける。** Formal Required Gate に learner exercise を混ぜない。
8. **Refactoring は Evidence 後に判断する。** size は investigation trigger であり refactor reason ではない。

### Phase 0 — Current `main` 再検証

実施:

- Audit baseline と Phase 開始時 `main` の差分を確認する。
- Matrix 全行を Current implementation / workflow / docs で再確認する。
- `Current status` を `still_valid` / `resolved_since_audit` / `scope_changed` / `decision_made` のいずれかへ更新する。
- `Disposition` を `fix` / `defer` / `reject` / `resolved` のいずれかへ確定する。
- `resolved_since_audit` は再修正しない。

Exit criteria:

- 全 Matrix 行の status / disposition / Primary owner が Current `main` 基準で確定している。
- PR 1 child Plan の scope が確定している。

### PR 1 — Current Documentation Drift / SSOT Repair

目的: 設計変更なしで直せる Current Fact の不整合を先に除去する。

主対象:

- Required Web E2E の Current command / target spec / Gate。
- Cross-role PR Gate。
- Playwright project 名。
- Seed Version の Current SSOT。
- Native を future / Phase 1 外とする古い Current Documentation。
- iOS の `manual dispatch`、Native change 時 Required Build-only、Runtime 非保証の区別。

SSOT rule:

- Web E2E は「N本」を Current contract として重複保持する必要がなければ、`package.json` の `test:e2e:chromium`、対象 spec、CI matrix / verify を Current execution SSOT として説明する。
- Seed Version は `src/config/versions.ts` を Current implementation SSOT とする。
- `docs/07_testability/seed_catalog.md` は Current 値と一致させるか、SSOT参照へ寄せる。
- `CHANGELOG.md` の過去 entry は履歴なので書き換えない。
- Native Current Guarantee の修正は事実説明だけとし、Decision B の learner Required / specialization 設計を混ぜない。

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
- Test Strategy 全面再設計。
- CI / Test code の変更。
- Historical CHANGELOG の改変。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Current config / workflow / version SSOT との manual cross-check

Exit criteria:

- Current fact が executable SSOT / ADR / implementation と一致する。
- 不要な volatile duplicate を増やしていない。
- PR 1 Primary owner の Matrix 行が `resolved` である。

### PR 2 — Formal Test Strategy / Perspective / Traceability

目的: Curriculum の評価契約を変える前に、Current Formal Suite と Test Strategy の正本を一致させる。

`test_strategy.md` は最低限3軸に分ける。

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
- stable Risk ID は既存 Risk 名・BR / AC だけでは一意に追跡できない場合だけ導入する。
- 最小 Traceability は以下を結ぶ。
  - Risk または一意な Risk label
  - Normative Spec / AC
  - Representative technique / perspective
  - Primary level
  - Representative Formal Test / suite
  - CI gate
- Requirement / AC → representative regression は `docs/12_quality/requirements_traceability.md` を第一候補とする。
- Risk / technique / level / gate の設計理由は `docs/08_testing/test_strategy.md` を第一候補とする。
- 重複が増える場合は既存 Matrix を拡張して相互参照し、新しい第三の traceability file は作らない。
- Formal Regression と Training Test を同じ coverage count として混ぜない。

対象候補:

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `docs/08_testing/e2e_design.md`
- 必要最小限の contract test / validator

Non-goal:

- 全 Test case への metadata tag 追加。
- 新 Test Management DB。
- Coverage 数を増やすだけの Test 追加。
- Stable Risk ID 新設そのもの。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- Curriculum 文書を変更した場合のみ `pnpm run validate:curriculum`
- `playwright.config.ts` / `package.json` / workflow / Formal Test inventory との manual cross-check

Exit criteria:

- Test Level、Perspective、Execution / Platform Gate が区別されている。
- Requirement / AC → regression と Risk / technique / gate の責務が重複せず追跡できる。
- Formal Test implementation の大量変更を必要としていない。
- PR 2 Primary owner の Matrix 行が `resolved` である。

### PR 3 — Decision B + Competency / Assessment Contract

目的: PR 2 の Formal Strategy を前提に、共通卒業像と評価契約を正本化する。

実施:

- 次の空き ADR で Decision B を記録する。
  - 共通卒業像: entry-level Test Automation Engineer。
  - C08 / Physical Android / Native CI / Native Capstone は specialization。
  - Product Native quality gate は変更しない。
- `README.md` / `00_learning_design.md` へ North Star と Required / specialization 境界を反映する。
- C01〜C12 それぞれに以下を定義する。
  - bounded Level 2 の意味。
  - Minimum Evidence。
  - Required / specialization / advanced の区分。
- C04 は「全技法を使う」ではなく、Spec / Risk に適切な technique を選び理由を説明できることを中心にする。
- C05 は PR 2 で確定した Test Level / Perspective / Gate の責務を前提にする。
- C09 は Assertion typo だけでなく Locator / Timing 等の meaningful diagnostic evidence を含める。
- C10 は「実在する保守問題の診断 + 理由付き最小改善」を共通 Core にする。
- C12 は bounded Web CI の Trigger / Gate / Artifact / Failure Evidence を共通 Level 2 とし、full multi-platform / delivery は Advanced / specialization とする。
- Baseline receipt と Learner-authored Exercise evidence を別物として定義する。
- Instructor が Lesson を再構成しなくても C01〜C12 を採点できる mapping を作る。
- Validator / contract test は Native asset の存在と、Native common graduation Required を別契約として検証する。

対象候補:

- `docs/adr/<next>-test-automation-curriculum-native-specialization.md`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning_design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- TypeScript / contract implementation を変更した場合は `pnpm run typecheck`

Exit criteria:

- Rubric だけで各 Competency の Minimum Evidence が分かる。
- Native specialization と Product Native Gate が明確に分離されている。
- Native Lesson / Training asset は canonical asset として残りつつ common graduation Required とは読めない。
- PR 4 前でも README / Learning Design / Rubric / Instructor Guidance / Validator に矛盾がない。
- PR 3 Primary owner の Matrix 行が `resolved` である。

### PR 4 — Curriculum Core / Extension / Reference

目的: PR 3 の契約に合わせ、Lesson 数と大順序を維持したまま Required depth と説明重複を調整する。

Part 1:

- P1-3:
  - 技法数 quota ではなく Risk に対する technique 選択を中心にする。
- P1-5:
  - Core: Cart / explicit reset / 代表 Boundary / 代表 Mobile。
  - Extension: Payment / Cross-role / Internal Inspection / Accessibility execution。
- P1-6:
  - meaningful failure diagnosis を Completion Evidence にする。
- P1-7:
  - Native specialization として depth / navigation / completion wording を整える。
  - Physical Android canonical path は削除しない。
- P1-8:
  - Core: 実在する保守問題の診断 + 最小改善1件。
  - Reference: POM / Helper / Fixture / Flow pattern catalog。
  - Lifecycle / Regression inventory は Part 2 bridge へ寄せる。
- P1-9:
  - Web Core Capstone を共通卒業 chain とする。
  - Native evidence は specialization section に分離する。
  - Harness baseline と Learner-authored flow を分ける。
- Spiral repetition:
  - Role / State / Seed / Reset は新概念として再定義せず、Canonical Definition と Application Practice を短く区別する。
- Legacy P1-10:
  - Required navigation 外であることを確認する。
  - canonical completion criteria へ漏れていなければ Historical / Legacy のまま変更しない。

Part 2:

- P2-2: Branch / Diff / Commit を Core、exact SHA / copy mechanics を Reference。
- P2-4: Trigger / Job / Failure / least privilege を Core、allowlist / parser / pin 詳細を Reference。
- P2-5: Web CI / Artifact / failure evidence を Core。
- P2-6: Native CI specialization。
- P2-7: Gate / Artifact / fail-closed を Core、vendor / production deployment detail を Advanced / Reference。
- P2-8: Web CI / Gate / Artifact / Failure reasoning を共通 Capstone、Native / iOS / full CD を specialization / Advanced。

ガードレール:

- Required content を削ること自体を目的にしない。
- Normative Spec、Risk、Do not automate、Lower Layer 選択、Failure Analysis、Maintainability、Git / PR / CI の本質は残す。
- 新 Lesson を増やさない。
- PR 3 の Competency / Minimum Evidence を再設計しない。矛盾があれば scope を広げず判断を戻す。

Validation:

- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Curriculum navigation / required asset / specialization boundary の manual cross-check

Exit criteria:

- Core / Extension / Reference が PR 3 の評価契約と一致する。
- Lesson 数と大順序を維持している。
- 重複削減のために新しい抽象概念を増やしていない。
- PR 4 Primary owner の Matrix 行が `resolved` である。

### PR 5 — Training Baseline / Exercise / Artifact / Completion Evidence

目的: Harness 正常性と Learner competency を実行入口・Evidenceでも分離する。

#### Web / Native 共通契約

- Baseline: environment / harness health。
- Exercise: learner modification boundary。
- Artifact: learner execution evidence。
- Completion Evidence: Rubric に渡す証拠。
- Formal Product CI と Training learner workflow を分ける。

#### Native learner exercise の最小実装方針

Current Native exercise YAML は保持し、直接実行入口を追加する。

- `package.json` に canonical command `training:native:exercise` を追加する。
- baseline と exercise で Android serial 解決、cleanup、Maestro invocation を丸ごと複製しない。
- 既存 `run-maestro-baseline.ts` の共通実行部分を最小限 parameterize / extract し、baseline と exercise が同じ実行処理を再利用する。
- baseline / exercise で flow path、JUnit / evidence 名を明確に分ける。
- `training/github-actions/training-native-ci.yml` は Training workflow として baseline の後に learner exercise を実行し、exercise evidence を識別可能に upload する。
- `.github/workflows/native-ci.yml` 等の Product Required Formal Gate には learner exercise を追加しない。
- Native failure exercise は Web との対称性だけを理由に executable flow 化しない。
  - C08 Minimum Evidence に不可欠なら最小実装する。
  - 既存 exercise / artifact で十分なら `defer` または `reject` とし README の役割だけ明確化する。

対象候補:

- `package.json`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `training/github-actions/training-native-ci.yml`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/maestro-invocation.ts`
- 必要な最小 shared runner / helper
- Curriculum / Instructor Reference の Evidence section

Validation:

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- Web learner exercise command
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `training:native:exercise` の structural / contract validation
- Native runtime validation は実行環境がある場合のみ。Environment failure と learner / source failure を分離する。

Exit criteria:

- Baseline PASS と learner competency PASS の意味が文書・command・Artifactで区別できる。
- `training:native:exercise` から learner YAML を直接実行できる。
- Native exercise evidence が baseline evidence と識別できる。
- Native specialization の Completion Evidence が baseline だけに依存しない。
- Product Required Formal Gate に learner exercise を混入させていない。
- PR 5 Primary owner の Matrix 行が `resolved` または根拠付き `defer` / `reject` で確定している。

### Phase 6 — Refactoring Necessity Review

目的: Audit の `COMPLEXITY` / `CANDIDATE` を「大きいから直す」にしない。

開始条件:

- PR 2 の Formal Test Strategy / Traceability が merge 済みであること。
- PR 3〜5 の完了は必須ではない。
- 調査自体は PR 3〜5 と並行してよい。

最低限確認する Evidence:

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

重要:

- Phase 6 では Product code を refactor しない。
- `refactor_now` の対象だけ別 Plan / 別 PR を作る。
- size / 見た目の巨大さ / 主観だけでは `refactor_now` にしない。
- Evidence が弱ければ `keep_as_is` または `needs_more_evidence` で終了してよい。
- 調査を PR 3〜5 と並行した場合、durable report / Matrix 更新を merge するときは最新 `main` から conflict なく反映する。

### Follow-up — Pilot Feedback

Pilot は Repository remediation 完了条件から外す。

必要最小限の候補:

- Completion time
- Instructor support count / category
- Environment block
- Re-submission reason
- Competency ごとの失敗傾向
- Native specialization 選択率 / Environment failure

原則:

- 架空の Required Duration を先に定義しない。
- 実測値が貯まるまでは blocker にしない。
- 専用システムを作らず、既存運用で記録できる最小形式から始める。

## 8. 実行順序（唯一の正本）

PR番号、依存順、実行順はこの checklist を正本とする。別の PR 順序表や P0 / P1 / P2 表は作らない。

- [ ] 0. 本 Master Plan の plan-only PR を作成・レビュー・`main` へ merge する。
- [ ] 1. 最新 `main` から PR 1 branch を作り、Phase 0 再検証 → Matrix 更新 → PR 1 child Plan → Current Documentation / SSOT Repair を行う。
- [ ] 2. PR 1 merge 後の最新 `main` から PR 2 branch を作り、Formal Test Strategy / Perspective / Traceability を整える。
- [ ] 3. PR 2 merge 後の最新 `main` から PR 3 branch を作り、Decision B / Competency / Assessment Contract を整える。
- [ ] 4. PR 3 merge 後の最新 `main` から PR 4 branch を作り、Curriculum Core / Extension / Reference を整える。
- [ ] 5. PR 4 merge 後の最新 `main` から PR 5 branch を作り、Training Evidence / Native learner exercise entry を整える。
- [ ] 6. PR 2 merge 後から Refactoring Necessity Review の調査を開始してよい。`refactor_now` のみ個別 Plan / PR へ切り出す。
- [ ] 7. Repository remediation 完了後、必要に応じて Pilot Feedback を収集する。

## 9. 検証方法

各 child Plan では対象変更に必要な Validation だけを選ぶ。無関係な full suite を機械的に毎回実行しない。

### Documentation / Curriculum

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

### Test Strategy / Specification

- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`

### Training implementation

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- 対象 learner exercise command
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

### TypeScript / workflow contract への影響がある場合

- `pnpm run typecheck`
- 対象 unit / contract test

### Wider implementation impact がある場合のみ

- `pnpm run test`
- `pnpm run verify`

### 成功判定

- 文書と Current config / workflow / implementation に事実差がない。
- Current 値を重複保持する場合は必要性と SSOT が明確である。
- Formal Strategy が Current Formal Suite と一致する。
- Curriculum Required / specialization / Advanced / Reference の境界が README、Learning Design、Rubric、Lesson、Instructor Reference 間で矛盾しない。
- C01〜C12 の Minimum Evidence が一意に追跡できる。
- Product Formal Gate と Curriculum Learner Gate を混同していない。
- Test Level、Perspective、Execution / Platform Gate を同じ概念として扱っていない。
- Traceability のために Test implementation の保守コストを不必要に増やしていない。
- Refactoring は追加 Evidence によって必要性を説明できる対象だけ実装候補になる。

## 10. リスクと停止条件

### 主な Risks

1. Decision B を Native Product 保証縮小と誤解する。
   - ADR / Curriculum に Learner Required boundary only と明記し、Formal Native CI を変更しない。
2. Fact Repair と Strategy redesign を混ぜる。
   - PR 1 を factual / SSOT repair、PR 2 を strategy design に限定する。
3. 古い Strategy のまま Competency を再定義して手戻りする。
   - PR 2 → PR 3 の順を固定する。
4. PR 3 と PR 4 の中間で正本が矛盾する。
   - PR 3 単体で README / Learning Design / Rubric / Instructor Guidance / Validator の境界を整合させる。
5. Volatile fact の値だけ更新して Drift を再発させる。
   - executable / implementation SSOT 参照を優先する。
6. Traceability を過剰実装する。
   - 既存2文書 + validator / contract test を優先し、新 DB / 全 title ID 化を禁止する。
7. Baseline PASS を Learner competency と誤認する。
   - Baseline / Exercise / Artifact / Completion Evidence を別 entry とする。
8. Native exercise runner を複製して maintenance cost を増やす。
   - baseline / exercise は共通実行処理を最小限再利用する。
9. 巨大ファイルを見ただけで refactor する。
   - churn / repair / blast radius / test protection / boundary を中核 Evidence にする。
10. Finding tracking 自体が Drift する。
    - Remediation Matrix だけを status 正本とし、Primary owner を1つに固定する。

### 実装時の停止条件

以下に当たった場合は scope を広げず判断を戻す。

- Current `main` で Finding がすでに解消済み。
- Product behavior / Formal CI Gate の変更が必要になった。
- Decision B と矛盾する別の明示要件が見つかった。
- PR 3 単体で Required / specialization 正本の整合を取れない。
- child PR の intended files を大きく超える変更が必要になった。
- Traceability のために全 Test title / 全 Test file の大量編集が必要になった。
- Stable Risk ID が必要な理由を説明できない。
- Native learner exercise を追加するために Product Formal Gate 変更が必要になった。
- Refactor の必要性が size / 主観だけでしか説明できない。
- Native Environment failure と learner / source failure を分離できない。

## 11. 成果物

### 本 Master Plan の次に作るもの

- PR 1〜5 ごとの child Plan
- Decision B ADR
- Current Documentation / SSOT 修正
- Formal Test Strategy / Traceability 修正
- Competency / Minimum Evidence 契約
- Curriculum Core / Extension / Reference 調整
- Training Evidence / Native learner exercise entry
- Refactoring Necessity Review の durable report（後続判断で再利用する必要がある場合のみ）
- `refactor_now` と判定した対象だけの個別 Refactor Plan

### 作らないもの

- Phase 0 専用 child Plan / durable report
- Finding tracking 専用 DB / spreadsheet / third-party tool
- 新しい第三の Traceability 正本
- Pilot 管理専用システム
- 必要性が証明されていない Refactor PR
- baseline / exercise ごとの重複した Native runner 実装

## 12. 備考

- 本 Master Plan は Report の全 Finding を「全部直す」指示ではない。全 Finding を追跡し、根拠を持って `fix` / `defer` / `reject` / `resolved` を判断する。
- `MISMATCH` と Curriculum High Finding を優先する。
- `CANDIDATE` は追加 Evidence を見てから扱う。
- Formal Test Strategy を Curriculum 評価契約より先に確定することで、C05 / C12 などの再作業を避ける。
- 目的は Repository を綺麗に見せることではなく、Curriculum / Formal Test Strategy / Training / Formal Regression の責務境界を明確にし、今後の変更判断を容易にすることである。
