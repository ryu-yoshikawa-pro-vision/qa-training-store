# PR 4A — Curriculum Learning Experience Remediation Child Plan

## 1. Goal

PR #61 の Master Plan と PR #103 で確定した Decision B / Competency / Assessment Contract を維持したまま、Curriculum の learner-facing material を **Common Core / Native specialization / Extension / Reference** の境界に沿って整理し、コードベース自動化未経験者が Instructor の非公開判断へ依存せず自己学習できる状態へ修復する。

PR 4A では、次を同一の bounded change として扱う。

- Learner Required path 全文の学習単位・説明深度・前提知識・演習・自己確認・Recovery・完了条件の整合
- Native specialization を選択しない Common learner が後続 Common Core を完走できること
- Native specialization を選択した learner が specialization 内の learner-facing material だけで進行・自己確認できること
- Core / Extension / Reference / specialization の責務境界
- learner-facing な一般用語の日本語中心への統一
- `03_instructor-reference.md` に残る学習内容・判断・Recovery・評価観点の learner-facing 正本への仕分け・移行
- Repository-required asset と Learner Required path の境界
- `docs/spec/**` text contract の Pre-change audit と Specification Finding の disposition 決定
- 継続的な受講者視点レビュー用チェックリスト `docs/reference/curriculum-self-study-review.md` の追加

このPRは Product behavior、Formal Test Strategy、Training runner / workflow / Artifact contract を変更するPRではない。

---

## 2. Status / implementation gate

**Status: Plan reviewed / Ready for Pre-change audit**

この child Plan は PR 4A の実装境界と実行順を固定するために先行作成する。Master Plan §16 が要求する Pre-change audit は、Curriculum remediation implementation 開始前にこのPlan上で完了させる。

### Hard gate

次をすべて満たすまで Curriculum 本文の remediation implementation を開始しない。

1. §8 の audit scope 全件を Current branch で確認している。
2. Curriculum Finding を §9 に追加し、各Findingへ `P0`〜`P3` と `fix_now` / `defer` を付与している。
3. 各 `fix_now` Curriculum Finding に Target、Current state / problem、Impact、Minimum bounded fix、Related contract / validation が記載されている。
4. すべての `fix_now` Finding の Target が有限の `path + heading / section` 集合として確定している。`横断`、`全教材`、`必要箇所すべて` のような unbounded Target を implementation input として残さない。
5. 実際に判断対象となった Specification Finding を §10 に追加し、`no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` のいずれかへ分類している。
6. `03_instructor-reference.md` の learner-facing 情報について、削除前に移行先を決めた migration map が確定している。
7. §11 Terminology Decision Table を監査結果に合わせて確定している。
8. P0 / P1 に未解決の `Specification clarification` または learner completion を阻害する `Product implementation deviation` が紐づく場合、依存する Finding / file / Task だけを停止し、解消に必要な follow-up と dependency boundary を明示している。依存しない PR 4A remediation は継続してよいが、未解決 P0 / P1 が残る限り PR 4A 全体を completion / merge-ready にしない。
9. 必要なP2が bounded change に収まらない場合、規模だけを理由に `defer` せず scope review を実施している。
10. §13 の Task ownership で各変更対象の primary owner が一意になっている。

単にファイルを列挙しただけでは Pre-change audit 完了としない。各対象について learner path / learning unit / terminology / self-study / classification / specification semantic safety の該当観点を実際に確認する。

---

## 3. Branch / base / freshness

- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Branch: `docs/pr4a-curriculum-learning-experience-remediation`
- Base: latest `main` after PR #103 merge
- Base commit at Plan creation: `010dfc8d564818c4484fdf908e43961a2b2b7cc2`
- Predecessor: PR #103 — Decision B / Competency / Assessment Contract
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`

PR 4A は stacked PR にしない。PR 4B が必要になった場合も PR 4A へ混在させず、PR 4A merge 後の最新 `main` から別branchを作る。

### Freshness rule

Pre-change audit完了後またはPR作成前に `main` が進んでいる場合、Repository全体の再監査は行わない。次だけを確認する。

1. `main...HEAD` と audit baseline 以降の `main` 差分を確認する。
2. §5 Primary change surface、§5.3 Audit-only surface、validator / contract、navigation / referenced support asset に関連する変更があるか判定する。
3. 関連pathに変更がある場合だけ、そのpathに紐づく Finding / terminology / migration / validation を再確認する。
4. 無関係な変更だけなら全件auditをやり直さない。

---

## 4. Inherited fixed decisions

PR #103 / Master Plan で確定した契約は PR 4A で再設計しない。

### 4.1 Graduation / competency

- Common graduation profile: **entry-level の汎用 Test Automation Engineer**
- Part 1 Common completion: `C01〜C07 + C09〜C10` bounded Level 2
- Part 2 / Final Common completion: `C01〜C07 + C09〜C12` bounded Level 2
- `C08` Native Automation は Common completion に含めない Native specialization
- Native runtime evidence は Native specialization completion にのみ要求する
- `C11` は第三者ReviewをRequiredとしない
- `C12 Common` は bounded Web CI の Trigger / Gate / Artifact / Failure Evidence に限定する

### 4.2 Learner route

- Part 1 Common: `P1-6 → P1-8 → P1-9`
- Part 1 Native: `P1-6 → P1-7 → P1-8 → P1-9`
- Part 2 Common: `P2-5 → P2-7 → P2-8`
- Part 2 Native: `P2-5 → P2-6 → P2-7 → P2-8`
- Common Core が前提にできるのは entry profile と、それ以前に Learner Required path 上で明示的に学んだ Common Core 内容だけ
- specialization / Extension / Reference / 教材外実務経験を Common Core の hidden prerequisite にしない

### 4.3 Learner / Instructor responsibility

- 学習内容、演習判断、自己確認、Recovery、完了条件、評価観点は learner-facing material を正本とする
- Instructor / 運営は、環境、アカウント・権限、端末、演習Repository / Training Copy、Infrastructure / Toolchain 等の受講内容外支援を担当できる
- `03_instructor-reference.md` は Repository-required support asset だが Learner Required path / completion の正本ではない
- PR 3 で Instructor Reference の最終仕分けは行わず、PR 4A が Primary owner として実移行する

### 4.4 Specification safety

- Normative Specification は `docs/spec/**`
- PR 4A では `docs/spec/**` を監査するが **実変更しない**
- Product behavior を Observed Behavior に合わせて仕様変更しない
- `PR 4B` disposition が1件以上ある場合のみ PR 4B を作る
- `Specification clarification` と `Product implementation deviation` は PR 4B に含めない

---

## 5. Scope

### 5.1 Primary change surface

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`
- `docs/curriculum/test-automation/part1/**`
- `docs/curriculum/test-automation/part2/**`
- `docs/reference/curriculum-self-study-review.md` — new

### 5.2 Conditional minimal contract surface

既存 canonical contract と教材の整合を壊さないために必要な場合だけ、次を最小変更してよい。

- `tests/contracts/training-curriculum.test.ts`
- `scripts/validate-curriculum.ts`

Contract / validator 変更は §13 Task 6 の条件を満たす場合だけ行う。learner-facing wording を細かく固定する大量の brittle contract test は追加しない。Validator / contract test の責務を新しい Curriculum SSOT に拡張しない。

### 5.3 Audit-only surface

- `docs/spec/**` の Git tracked files から抽出した Markdown / text contract 全件

PR 4A では Audit-only surface のファイルを編集しない。

### 5.4 Optional / Legacy discoverability

Current RepositoryまたはCurriculum navigation上に Optional Agentic QA、Legacy Capstone、その他旧教材が存在する場合だけ、Learner Required completionと誤認されないことを確認する。

- 存在しないものを復活・新設しない。
- 存在しない場合は audit result を `N/A` とする。
- file rename / directory migrationは、ラベル・navigation修正で解消できない場合に限る。原則として実施しない。
- Git history を掘って削除済み教材を復元対象として探さない。

---

## 6. Non-goals

次は PR 4A に含めない。

- Product behavior の変更
- Product implementation deviation の修正
- Specification clarification の決定
- `docs/spec/**` の editorial 実修正
- Formal Regression / Formal Test Strategy / Traceability の再設計
- Training baseline / learner exercise command / workflow / Artifact contract の新規実装
- PR 5 scope の前倒し
- Native Product CI Gate の変更
- iOS Runtime guarantee の追加
- Curriculum 全面書き直し
- 新しい恒久的な Audit SSOT / Glossary / Tracking layer の追加
- P3 の全件cleanup
- 学習者レビュー結果・履歴のRepository保存
- Pilot実施や実受講者によるPASSをPR 4A merge conditionにすること
- 全Lessonへ同じ定型headingを機械的に追加すること
- 全paragraphへCore / Extension / Referenceラベルを付けること
- 自然言語品質をcontract testで網羅的に固定すること

---

## 7. Current repository facts confirmed at Plan creation

Plan作成時点で Current branch を確認し、少なくとも次を確認済み。

1. `README.md` / `00_learning-design.md` は PR #103 の Common / Native route、entry profile、Repository-required asset / Learner Required path 境界を記載している。
2. `03_instructor-reference.md` は transition notice を持つが、既存の Facilitation / learner判断 / Recovery / 評価ガイダンスを PR 4A で仕分け・移行する前提の transitional content が残る。
3. `part1/05_playwright-e2e-practice.md` は learner-facing heading に `Learning Goal` / `Expected Product Behavior` / `Alternative Design` / `Failure Analysis` / `Exercise` / `Completion Evidence` 等の一般英語を残している。また Common completion の説明に Payment / Role 系を含み、Master Plan が Extension とする範囲との境界が曖昧。
4. `part1/08_test-management-and-maintainability.md` は対象受講者として「複数の Playwright Test と Maestro Flow を作成済み」を前提とし、Common route で P1-7 をskipする learner に hidden Native prerequisite を課す。
5. `part2/02_git-version-control.md` は Training Copy の commit SHA / copy mechanics 等、Master Plan が Reference とする repository-specific detail を Common learner path に強く含む。
6. `part2/08_integration-design-capstone.md` は冒頭で Common completion を bounded Web CI と明示する一方、学習目標・シナリオ・記録成果物の一部で Maestro / Android / iOS / full delivery を広く要求する表現が残り、Common Level 2 と specialization / advanced の境界を再整理する必要がある。
7. `docs/spec/glossary.md` は canonical terminology の参照先であり、`docs/spec/_templates/feature-spec.md` には BR / AC 等のID grammarや英語headingを含むため、learner-facing一般語の日本語化を機械的な全文翻訳として行ってはならない。
8. Current file responsibility は次であり、Task / FindingのLesson番号はこの対応からずらさない。
   - P1-1 `01_test-automation-foundations.md`
   - P1-2 `02_scenario-shop-analysis.md`
   - P1-3 `03_test-design-and-automation-selection.md`
   - P1-4 `04_playwright-foundations.md`
   - P1-5 `05_playwright-e2e-practice.md`
   - P1-6 `06_execution-and-failure-analysis.md`
   - P1-7 `07_maestro-native-automation.md`
   - P1-8 `08_test-management-and-maintainability.md`
   - P1-9 `09_part1-capstone.md`
   - P2-1 `01_software-development-process.md`
   - P2-2 `02_git-version-control.md`
   - P2-3 `03_github-pull-request-review.md`
   - P2-4 `04_ci-github-actions.md`
   - P2-5 `05_playwright-ci.md`
   - P2-6 `06_native-ci-maestro.md`
   - P2-7 `07_ci-cd-quality-gates.md`
   - P2-8 `08_integration-design-capstone.md`

これらは §9 の初期 Finding に反映する。旧Audit ReportのFindingは Current Stateで再確認してから採用し、PR 2 / PR 3 で解消済みのFindingを重複修正しない。

---

## 8. Pre-change audit coverage

### 8.1 Curriculum root / learning SSOT

| Target | Audit focus | State |
| --- | --- | --- |
| `README.md` | entry / route / classification / navigation / learner-facing terminology | partial — current route contract confirmed |
| `00_learning-design.md` | prior-knowledge rule / route / completion / terminology / learner support boundary | partial — current contract confirmed |
| `01_spreadsheet-test-design.md` | learning unit / technique explanation / Workbook bridge / self-check / terminology | pending full audit |
| `02_competency-rubric.md` | learner-readable Minimum Evidence / public evaluation / terminology | pending full audit |
| `03_instructor-reference.md` | learner content migration / remaining operational-only scope | partial — transition state confirmed |

### 8.2 Part 1 Learner Required / specialization

全 `part1/*.md` を全文監査する。最低限次を確認する。

- P1-1: Test Automation Foundations — entry profileに対して説明が飛んでいないか
- P1-2: Scenario Shop Analysis — Role / State / User Journey / Seed / Reset の分析責務
- P1-3: Test Design and Automation Selection — technique quotaではなくSpec / Risk起点の選択になっているか
- P1-4: Playwright Foundations — JavaScript / TypeScript minimum bridge、Locator / Action / Assertion 初出説明
- P1-5: Playwright E2E Practice — Core=`Cart / explicit reset / representative Boundary / representative Mobile`、Extension=`Payment / Cross-role / Internal Inspection / Accessibility execution` の境界と completion 整合
- P1-6: Execution and Failure Analysis — meaningful failure diagnosis と Completion Evidence
- P1-7: Maestro Native Automation — Native specialization開始条件 / evidence / Physical Android canonical path / rejoin
- P1-8: Test Management and Maintainability — Playwright-only Common、Native追加例、POM / Helper / Fixture / Flow Reference、Lifecycle / Regression inventory の Part 2 bridge
- P1-9: Part 1 Capstone — 簡潔な Web Common Capstone、Native specialization evidence、Baseline / learner-authored flow の分離

### 8.3 Part 2 Learner Required / specialization

全 `part2/*.md` を全文監査する。最低限次を確認する。

- P2-1: Software Development Process — 一般開発プロセスとrepository-specific operationの境界
- P2-2: Git Version Control — Branch / Diff / Commit Core と Training Copy exact SHA / copy mechanics Reference の境界
- P2-3: GitHub Pull Request Review — Fork / Remote / Push / PR が Learner Required として成立し、repository provisioningや第三者ReviewをRequired completionにしていないか。material diff / self-review / public review criteriaでC11を自己確認できるか
- P2-4: CI / GitHub Actions — Trigger / Job / Failure / least privilege Core と allowlist / parser / pin detail Reference の境界
- P2-5: Playwright CI — bounded Web CI / Artifact / failure evidence Common completionとの整合
- P2-6: Native CI / Maestro — Native specializationとrepository-specific Reference境界、skip / rejoin
- P2-7: CI/CD Quality Gates — Gate / Artifact / fail-closed Core と vendor / production detail の境界
- P2-8: Integration Design Capstone — Web CI / Gate / Artifact / Failure reasoning の bounded Common Capstone と Native / iOS / full delivery Advanced の境界

### 8.4 Repository-required support asset boundary

以下の参照・表現を確認する。

- Instructor Reference
- Curriculum validatorのrequired-file説明
- Workbook / Training入口への参照文
- Lesson中の「必須」「Required」「完了条件」表現
- Optional / Legacy navigationがCurrent treeに存在する場合のdiscoverability

### 8.5 Specification text contract inventory

`docs/spec/**` は「目視で見つけたファイル」ではなく、Current branch の Git tracked files から Markdown / text contract を抽出し、その集合を audit inventory とする。

Inventory作成時は次を基準にする。

```bash
git ls-files docs/spec
```

1. 出力されたtracked filesから Markdown / text contractだけを audit inventoryへ含める。
2. image / binary / generated visual asset 等、text contractでないものは audit inventory 自体へ含めず、N/A計数もしない。
3. 別のpermanent audit report / ledgerは作らない。
4. §8上で text-contract inventory 件数と `audited` 件数を記録し、一致することをaudit完了条件とする。
5. 問題がない各fileをSpecification Findingの `no_change` として水増ししない。

Audit focus は次に限定する。

- canonical terminology / glossary / alias
- Spec template / heading / ID grammar
- curriculumが参照するBR / AC / sectionの一意性
- learner-facing説明がSpec semanticsを誤って変えていないか判断するためのminimum semantic safety
- reader / maintainerに実害のあるbounded editorial inconsistencyの有無

次は実施しない。

- Product implementation全体とSpecの完全conformance audit
- 全画面 / 全API / 全状態の再検証
- Spec全面リライト
- typo / punctuation / spacingだけを目的とする全件cleanup

### 8.6 Audit completion record

Task 1完了時にこのsectionへ最低限次を追記する。

- Curriculum root: `audited X / N`
- Part 1: `audited X / N`
- Part 2: `audited X / N`
- Instructor Reference sections: `classified X / N`
- Spec text-contract inventory: `audited X / total X`
- Optional / Legacy: `audited` または `N/A`
- Open P0 / P1 blocker count

新しいaudit成果物を追加せず、このPlanを唯一のPR 4A audit記録として使う。

---

## 9. Curriculum Finding register

### 9.1 Finding rule

実装する変更は原則としてCurrent Stateで確認したFindingに紐づける。

| Field | Requirement |
| --- | --- |
| ID | `CUR-4A-xxx` |
| Severity | `P0` / `P1` / `P2` / `P3` |
| Decision | `fix_now` / `defer` |
| Target | finite `path + heading / section` list |
| Current state / problem | 何が現在矛盾・不足しているか |
| Impact | learner path / completion / self-study等への影響 |
| Minimum bounded fix | 最小修正 |
| Related contract / validation | fixed decision / manual validation / contract等 |
| State | `candidate` / `confirmed` / `resolved` / `blocked` |

### 9.2 Severity / decision rule

- `P0`: completion不能、誤ったExpected Behavior、危険な手順等で学習を成立させない
- `P1`: learner path / prerequisite / completion / evaluation / specialization境界の実質的矛盾
- `P2`: 用語、重複、発見性、説明深度、self-study品質、保守性へ影響する
- `P3`: 軽微な表記・文章cleanup

`P0` / `P1` はPR 4A completion blocker。ただし blocker が依存しない Finding / file / Task の実装まで無条件に止める意味ではない。依存範囲だけを停止し、他の bounded remediation は継続してよい。`P2` はMaster Plan Goalへ直接必要かつboundedなものだけ `fix_now`。`P3` は変更箇所周辺だけ局所修正する。

必要なP2がboundedでない場合、サイズだけを理由に`defer`してDoDを弱めない。scope / splitを再レビューする。

### 9.3 Initial confirmed / candidate findings

Pre-change auditでCurrent Stateを再確認し、Targetを最終確定する。

#### CUR-4A-001 — Common routeのhidden Native prerequisite

- Severity: `P1`
- Decision: `fix_now`
- Target: `part1/08_test-management-and-maintainability.md` の対象受講者 / prerequisite / Native関連箇所
- Current state / problem: 「複数の Playwright Test と Maestro Flow を作成済み」を前提にし、P1-7をskipするCommon learnerへNative経験を要求する。
- Impact: Common routeが単独完結しない。
- Minimum bounded fix: Playwright maintainabilityをCommon prerequisiteだけで成立させ、Native例はspecialization / Extensionとして明示する。
- Validation: P1 Common full-route walkthroughでP1-7未受講のままP1-8へ進める。
- State: `confirmed`

#### CUR-4A-002 — P1-5 Core / Extension completion境界

- Severity: `P1`
- Decision: `fix_now`
- Target: `part1/05_playwright-e2e-practice.md` の learning goal、Seed Scenario / Reset、境界値、Payment、Cross-role、Internal Inspection、Mobile Web、Accessibility、exercise / completion / evidence 関連section。Task 1で実際に修正が必要な heading だけへ有限化する。
- Current state / problem: Current lessonは複数品質観点を同列に提示しており、Common Core と Extension のRequired completion境界が曖昧に読める箇所がある。
- Impact: Common completionがMaster Planのbounded scopeを超える、またはCoreであるrepresentative Mobile / explicit resetがExtension扱いされる可能性がある。
- Minimum bounded fix: Coreを `Cart / explicit reset / representative Boundary / representative Mobile` に固定し、`Payment / Cross-role / Internal Inspection / Accessibility execution` はExtensionとして分離する。既存内容を不要に削除せず、学習目標・演習・完了条件のRequired境界を一致させる。
- Validation: P1 Common learnerがCoreだけでP1-5を完了でき、representative Mobile / resetを含み、Extension実行を要求されない。
- State: `confirmed`, exact target headings pending Task 1 finalization

#### CUR-4A-003 — Instructor Reference transitional learner content

- Severity: `P1`
- Decision: `fix_now`
- Target: `03_instructor-reference.md` のlearner-facing section。具体sectionと移行先はTask 1 migration mapで有限化する。
- Current state / problem: learner判断 / Recovery / evaluation等のlearner-facing情報がInstructor Reference側に残る。
- Impact: 自己学習にInstructor private knowledgeが必要になり得る。
- Minimum bounded fix: learner-facing情報を既存の対応Lesson / Learning Design / Rubricへ一度だけ移行し、Instructor Referenceはsupport責務へ限定する。
- Validation: migration map全項目がdestination反映済みで、Learner Required completionの正本がInstructor Referenceに残らない。
- State: `confirmed`, target sections pending Task 1 finalization

#### CUR-4A-004 — Training Copy mechanicsのCommon過重化

- Severity: `P2`
- Decision: `fix_now`
- Target: `part2/02_git-version-control.md` のTraining Copy SHA / copy mechanics / repository-specific operation箇所
- Current state / problem: Master PlanがReferenceとするrepository固有mechanicsがCommon learner pathへ強く含まれる。
- Impact: 一般VCS能力と演習repository運用が混ざり、Common scopeが過重になる。
- Minimum bounded fix: Branch / Diff / Commit とVCS semanticsをCoreに残し、Training Copy exact SHA / copy mechanicsをReferenceとして明示する。
- Validation: P2 Commonの学習目標・演習・完了判定がrepository-specific mechanicsを必須能力として扱わない。
- State: `confirmed`

#### CUR-4A-005 — P2-8 bounded Web CIとNative / full deliveryの混在

- Severity: `P1`
- Decision: `fix_now`
- Target: `part2/08_integration-design-capstone.md` のlearning goal / scenario / required artifact / completion箇所
- Current state / problem: Common completionをbounded Web CIと明示しながら、Maestro / Android / iOS / full deliveryをRequiredに読める記述が混在する。
- Impact: Common CapstoneがNative / Advancedをhidden requirement化する。
- Minimum bounded fix: Web CI Trigger / Gate / Artifact / Failure EvidenceをCommon completionへ固定し、Native / full deliveryをspecialization / Advancedへ分離する。
- Validation: P2 Common full-route walkthroughがNativeなしで完了する。
- State: `confirmed`

#### CUR-4A-006 — learner-facing一般英語headingの混在

- Severity: `P2`
- Decision: `fix_now`
- Initial Target: `part1/05_playwright-e2e-practice.md` の `Learning Goal` / `Expected Product Behavior` / `Alternative Design` / `Failure Analysis` / `Exercise` / `Completion Evidence` 等、Current Stateで確認済みの一般heading
- Additional Target rule: Task 1で同種Findingが確認された場合のみ、具体的な `path + heading` をこのFindingへ追記する。`learner-facing curriculum横断` のようなTargetへ拡張しない。
- Current state / problem: 日本語教材内で一般概念の英語headingが場当たり的に混在する。
- Impact: 初学者の可読性と教材全体の予測可能性を下げる。
- Minimum bounded fix: §11に従い一般heading / 一般説明を日本語中心にする。official term、code、ID、UI copy、machine contractは変更しない。
- Validation: Targetに列挙したheadingのみ確認し、Findingのないfileを均一化目的で書き換えていない。
- State: `confirmed for initial target`, additional targets pending Task 1 only if observed

#### CUR-4A-007 — self-study判断基準 / Recovery不足

- Severity: `P2`
- Decision: `fix_now`
- Initial Target: `part1/02_scenario-shop-analysis.md` のCurrent Stateで確認済みself-check / confirmation question箇所
- Additional Target rule: Task 1でself-studyが実際に成立しないsectionを確認した場合のみ、具体的な `path + heading` を追記する。全Lessonへの定型section追加Findingにはしない。
- Current state / problem: learnerが質問へ答えた後、自分で正誤・判断妥当性を確認するminimum checkpoint / recovery pathが弱い箇所がある。
- Impact: Instructorなしの自己学習完結性を下げる。
- Minimum bounded fix: 問題種別に応じ、回答例 / minimum checkpoints / 判断観点 / reference location / failure-recoveryのいずれか必要最小限を補う。
- Validation: Target sectionごとにlearnerがInstructor private answerなしで次行動を判断できる。
- State: `candidate` — initial target observed; confirmation / finite target finalization pending Task 1

### 9.4 Carry-forward candidate handling

旧Audit Report / 過去PlanのFindingは自動で`fix_now`にしない。

1. Current branchで再現・残存を確認する。
2. PR2 / PR3で解消済みならclose扱いとし、PR4Aで再修正しない。
3. 残存する場合だけCurrent Target / severity / minimum fixを付けて§9へ追加する。
4. 同じ根本原因を細かいFindingへ過剰分割しない。

---

## 10. Specification Finding register

Plan作成時点では **確定済み Specification Finding はまだ登録しない**。

これは `docs/spec/**` に問題がないという意味ではなく、全件Pre-change audit未完了のためである。問題のないfileを `no_change` として水増ししない。

Auditで実際に判断対象が見つかった場合のみ、次の形式で追加する。

| Field | Requirement |
| --- | --- |
| ID | `SPEC-4A-xxx` |
| Target | path / heading |
| Observation | 具体的な問題または判断対象 |
| Disposition | four dispositionsのいずれか |
| Disposition reason | なぜその分類か |
| Curriculum impact | linked CUR finding または none |
| Minimum bounded fix | `PR 4B` の場合だけ必須 |
| Validation / follow-up | semantic check、clarification issue、product follow-up等 |

Disposition:

- `no_change`: 問題・判断対象として記録価値はあるが、本remediationで変更不要
- `PR 4B`: canonical terminology / glossary / templateとの不整合等で、semantics-preservingかつboundedに修正可能
- `Specification clarification`: Specification自体が曖昧・不足・複数解釈でProduct Decisionが必要
- `Product implementation deviation`: Specificationは一意だがCurrent implementationが異なる

PR 4Aでは `docs/spec/**` を編集しない。

---

## 11. Terminology Decision Table

この表をPR 4Aのlearner-facing変更判断の正本として使う。Pre-change auditで新しい判断が必要になったら、先にこの表へ追記してから本文を変更する。

| Category | Rule | Example |
| --- | --- | --- |
| learner-facing一般heading | 日本語を基本とする | `Learning Goal` → `学習目標`, `Exercise` → `演習` |
| learner-facing一般説明 | 日本語中心。不要な英語混在を避ける | `Failure Analysis` → `失敗原因の分析` |
| canonical curriculum / competency term | canonical labelを維持し、必要なら初出で日本語補足 | `Minimum Evidence（最小完了証跡）`, `bounded Level 2` |
| domain conceptで英語名称が参照価値を持つもの | 日本語のみへ潰さず、初出で日本語 + canonical Englishを併記可能 | `期待されるプロダクト挙動（Expected Product Behavior）` |
| Tool / Product official name | 公式名を維持 | Playwright, Maestro, Git, GitHub Actions, Node.js, pnpm, TypeScript, Expo |
| API / code identifier | literalを維持 | `page.getByRole`, `PLAYWRIGHT_BASE_URL`, `workflow_dispatch` |
| command / file path / config key | literalを維持 | `pnpm run training:web:baseline`, `docs/spec/README.md` |
| ID grammar | canonical literalを維持 | `TC-CART-001`, `BR-*`, `AC-*`, `CT-*`, `CP-*` |
| machine-consumed heading / token | parser / validator contractを確認し、機械翻訳しない | template heading, required token |
| Specification canonical heading | Spec contractとして英語を維持。PR4Aで変更しない | `Overview`, `Business Rules`, `Acceptance Criteria`, `UI Contract` |
| Curriculum classification | canonical tokenを維持し、日本語説明を添える | `Common Core（共通必修）`, `Extension（発展）`, `Reference（参照）`, `Native specialization（専門選択）` |
| Gherkin canonical terms | literalを維持し、日本語説明を添える | Given / When / Then |
| Product UI copy | 実UI / Normative Specのliteralを維持 | ボタン名・ラベル名 |
| Test Case ID / UI Test ID / Seed Scenario / User Journey | Learning Designの区別を維持し、省略で意味を混ぜない | `Test Case ID` と `UI Test ID` を別概念として扱う |

用語統一を理由に code identifier、Spec ID、UI copy、machine-consumed contractを変更しない。

Pre-change auditで確定したうち、将来も安定する最小の言語・用語ルールだけを `00_learning-design.md` または Curriculum README の既存責務へ反映する。新しいGlossaryファイルは作らない。

---

## 12. Implementation rules

### 12.1 Default remediation rule

- Top-level Lesson番号・ファイル名・配置は変更しない。
- file rename / directory migrationは原則行わない。
- Findingがない箇所を均一化目的だけで書き換えない。
- 既存構造でself-study contractを満たせる場合、新しい定型sectionを追加しない。
- internal Lessonの統合は同一file内を原則とし、明確なlearning-unit Findingがある場合だけ行う。
- classification labelを全paragraphへ付けず、誤認可能な境界だけ明示する。
- 1つのfileは原則1 remediation passで、そのfileに紐づくclassification / learning depth / self-study / Instructor migration / terminology Findingをまとめて解消する。
- 同じfileを「route修正 → Lesson修正 → terminology → self-study」のようにTaskごとに何度も機械的に触らない。
- 文章量を増やすこと自体を目的にしない。既存説明が十分なら最小修正または変更なしとする。
- FindingのMinimum bounded fixより広いcleanupを同時実施しない。

### 12.2 Internal Lesson rule

- 数行でも目的が明確なshort referenceなら残してよい。
- 目的・説明・Practice・前後関係が弱く、単独で切る意味がなければ同一file内で統合する。
- 見出しを残すためだけの説明追加は禁止する。
- 複数fileのmerge / renameを前提にしない。

### 12.3 Self-study implementation rule

Learner Required path と selected specialization について、Findingがあるsectionだけ必要な要素を補う。

候補要素:

- 開始条件 / prerequisite
- 何を学ぶか、なぜ必要か
- practice / exercise
- self-check
- Recovery
- completion / Minimum Evidence connection
- next action / branch / rejoin

Self-checkは問題種別に応じて次を使い分ける。

1. **知識確認問題**: 回答例と理由、または正答に最低限含むべき具体的チェックポイントを示す。
2. **設計・Trade-off問題**: 一意の模範解答を強制せず、最低限考慮すべき観点と、許容できる判断理由の条件を示す。
3. **Specification参照**: 「仕様を見る」だけで終わらせず、該当BR / AC / sectionを特定する。
4. **command / test / validator / artifact**: Learnerが成功、学習上の失敗、Environment / Toolchain blockを区別できる確認方法を示す。

全Lessonへ一律にanswer key / Recovery sectionを追加しない。`講師に確認する`、`レビューしてもらう`、`答え合わせしてもらう`ことをRequired completionにしない。

Environment / account / permission / device / repository / Training Copy / toolchain の準備を Instructor / 運営が支援してよい。ただし支援を受けた後、learner-facing material から再開地点・必要な確認・次行動を判断できることを維持する。

### 12.4 Instructor Reference migration rule

Pre-change audit中に `03_instructor-reference.md` をsection単位で分類し、実装前に migration map を確定する。

| Category | Destination / treatment |
| --- | --- |
| learner-facing learning content | 対応LessonまたはLearning Designへ移行 |
| learner-facing self-check / Recovery | 対応Lessonへ移行 |
| learner-facing evaluation criterion | Rubricまたは対応Lessonの公開基準へ移行 |
| environment / account / permission / device support | Instructor Referenceに残してよい |
| repository / Training Copy / infrastructure / toolchain support | Instructor Referenceまたは既存public runbookへの参照 |

Learner-facing情報は移行先へ反映してからInstructor Reference側を削除または正本参照へ置き換える。同じ情報を両方に恒久保持しない。

Migration destinationのprimary ownerは§13に従う。Task 4は移行先本文を再編集するTaskではなく、移行完了後のInstructor Reference finalizationだけを担当する。

---

## 13. Implementation tasks / primary ownership

### 13.0 Ownership matrix

同じfileを複数Taskのprimary ownerにしない。

| Task | Primary owned files | Purpose |
| --- | --- | --- |
| Task 2 | `README.md`, `00_learning-design.md`, 必要時のみ `02_competency-rubric.md` | confirmed root Finding / migration / durable terminology ruleだけを反映 |
| Task 3 | `01_spreadsheet-test-design.md`, `part1/**`, `part2/**` | learner-facing curriculum remediationをfileごとに一括実施 |
| Task 4 | `03_instructor-reference.md` | migration完了後のsupport-only finalization |
| Task 5 | `docs/reference/curriculum-self-study-review.md` | reusable checklist追加 |
| Task 6 | conditional contract files only | 最小regression protection |

Task 2はLesson fileを直接修正しない。Lesson-level navigation / prerequisite / labelは、そのLessonをTask 3で修正するとき同じpassで処理する。

### Task 0 — Baseline / branch integrity

1. branchがPR #103 merge後の `main` をbaseにしていることを確認する。
2. Pre-change audit開始時の `main` SHAをPlanへ記録する。
3. 実装開始前に `git diff main...HEAD` がPlan関連だけであることを確認する。
4. Master Plan / PR #103 / Issue #72 のCurrent statusを再確認する。
5. PR 4A以外の進行中変更を混入させない。

### Task 1 — Complete Pre-change audit and finalize this Plan

§8全対象を全文監査する。

#### Curriculum audit per file / internal Lesson

最低限次を確認する。

- learner role: Common / Native specialization / Extension / Reference
- entry / prerequisite
- learning objective
- explanation sufficiency
- practice / exercise
- self-check / expected judgment
- Recovery
- completion / Minimum Evidence connection
- next action / navigation
- hidden specialization dependency
- terminology
- duplicated or misplaced content
- Normative Specification reference safety

#### Instructor migration audit

- §12.4の分類で `03_instructor-reference.md` 全sectionを仕分ける。
- learner-facing情報には具体的な `destination path + heading / section` を付ける。
- 移行先不明のまま削除対象にしない。

#### Specification audit

- §8.5の方法でGit tracked Markdown / text-contract inventoryを確定する。
- bounded text-contract観点だけを全件確認する。
- `audited = inventory total` を§8.6に記録する。

#### Plan finalization

- §8 state / countを `audited` / `N/A` へ更新
- §9 actual Findingを確定
- §9のすべての `fix_now` Targetを有限化
- §10 actual Specification Findingを記録
- Instructor migration mapを確定
- §11 terminology tableを確定
- blocker有無とdependency boundaryを明記

**Stop**: Task 1完了前にTask 2以降へ進まない。

### Task 2 — Apply confirmed root-level findings / migrations

Primary targets:

- `README.md`
- `00_learning-design.md`
- 必要な場合のみ `02_competency-rubric.md`

Task 2は PR3 の root canonical contract を再設計・再整理するためのTaskではない。Task 1で以下のいずれかが確定した場合だけ該当fileを修正する。

1. そのroot fileをTargetとする `confirmed` / `fix_now` Findingがある。
2. Instructor migration mapでそのroot fileがdestinationになっている。
3. Master Planが要求する将来も安定する最小のlanguage / terminology ruleを既存Learning Design / README責務へ残す必要がある。

Actions:

- confirmed Finding / migration entry のMinimum bounded fixだけ反映する。
- Common / Native specialization / Extension / Reference、route / skip / branch / rejoin、prior-knowledge contractはPR3決定を維持し、矛盾が監査で確認された場合だけ最小修正する。
- Optional / Legacy / Instructor Referenceのroot navigationは誤認Findingがある場合だけ修正する。
- `02_competency-rubric.md` は confirmed Finding または migration map のdestinationになった場合だけ変更し、PR3で確定したcompetency / Minimum Evidence contract自体は変更しない。
- root-level Finding / migrationがなく、stable terminology ruleも既に満たされているfileは変更しない。

**Do not**: `part1/**` / `part2/**` のLesson introやnavigationをTask 2で先回りして修正しない。

### Task 3 — Remediate learner-facing curriculum in one pass per file

Task 1で確定したFinding / migration map / terminologyに従い、以下を原則1file 1 remediation passで修正する。

Primary targets:

- `01_spreadsheet-test-design.md`
- `part1/**`
- `part2/**`

各fileで必要な観点を同じpassにまとめる。

- classification / scope
- prerequisite / navigation
- explanation depth
- practice / self-check / Recovery
- completion / evidence
- Instructor migration destination
- terminology
- duplicated / misplaced content

#### Part 1 responsibility map

- **P1-1 — Test Automation Foundations**: entry profileに合う自動化の目的・限界・全体像。未説明の高度知識を前提にしない。
- **P1-2 — Scenario Shop Analysis**: Role / State / User Journey / Seed / Resetを使ったテスト対象分析。canonical definitionとapplication practiceの不要な重複を整理する。
- **P1-3 — Test Design and Automation Selection**: 技法数quotaではなく、Spec / Riskに対して適切なtechniqueを選び理由を説明できることを中心にする。
- **P1-4 — Playwright Foundations**: JavaScript / TypeScript minimum bridge、Playwright concept、Locator / Action / Assertion。コードベース自動化未経験者がP1-5へ進める深度にする。
- **P1-5 — Playwright E2E Practice**: Core=`Cart / explicit reset / representative Boundary / representative Mobile`。Extension=`Payment / Cross-role / Internal Inspection / Accessibility execution`。学習目標・演習・completionをこの境界へ揃える。
- **P1-6 — Execution and Failure Analysis**: 実行、Evidence、meaningful failure diagnosisをCommon Coreとして成立させ、meaningful diagnosisをCompletion Evidenceへ接続する。
- **P1-7 — Maestro Native Automation**: Native specialization。必要なCommon prerequisite、depth / navigation / Practice、Physical Android canonical path、specialization completion / evidence、P1-8へのrejoinをlearner-facingに一意化する。
- **P1-8 — Test Management and Maintainability**: Commonは実在するPlaywright保守問題の診断 + 最小改善1件をPlaywright-onlyで成立させる。Native / Maestro比較はspecialization選択者向け追加例、POM / Helper / Fixture / FlowはReference、Lifecycle / Regression inventoryはPart 2 bridgeへ寄せる。
- **P1-9 — Part 1 Capstone**: Web Common Capstoneを簡潔に成立させ、Native specialization evidenceをCommon completionから分離し、Baseline receiptとlearner-authored flow / evidenceを混同しない。P1-8のmaintainability責務を新たに持ち込まない。

#### Part 2 responsibility map

- **P2-1 — Software Development Process**: software development / change flow conceptsをCore。repo-specific operationはReference。
- **P2-2 — Git Version Control**: Branch / Diff / Commit とVCS semantics / diff safetyをCore。Training Copy exact SHA / copy mechanicsはReference。
- **P2-3 — GitHub Pull Request Review**: Fork / Remote / Push / PRをCommonとして学ぶ。Learnerは提供済み演習Repositoryまたは自分のForkを使い、書き込み可能RemoteへのPushとPR作成を学ぶ。Repository / Training Copy provisioning自体はInstructor / 運営が担当してよく、Learner自身のprovisioningや第三者ReviewをRequired completionにしない。C11はmaterial diff / self-review / learner-facing public review criteriaで自己確認できるようにする。
- **P2-4 — CI / GitHub Actions**: Trigger / Job / Failure / least privilegeをCore。allowlist / parser / Action pin等のrepository-specific detailはReference。
- **P2-5 — Playwright CI**: Web CI Trigger / Artifact / failure evidenceをCommon。
- **P2-6 — Native CI / Maestro**: Native specialization。repository-specific detailはReferenceへ寄せ、必要なCommon prerequisite / specialization内前提 / completion / skip / rejoinを明示し、Common completionのhidden prerequisiteにしない。
- **P2-7 — CI/CD Quality Gates**: Gate / Artifact / fail-closedをCore。vendor / production deployment detailはAdvanced / Reference。
- **P2-8 — Integration Design Capstone**: Web CI / Gate / Artifact / Failure reasoningをbounded Common Capstoneとする。Native / iOS / full CDはspecialization / Advanced。

### Task 4 — Finalize Instructor Reference

Task 2 / Task 3でmigration map上の全learner-facing destinationへの反映が完了した後だけ実施する。

1. migration map各項目のdestination反映を確認する。
2. 移行済みlearner-facing情報を削除または正本参照へ置き換える。
3. environment / account / permission / device / repository / Training Copy / infrastructure / toolchain等の受講内容外supportへ限定する。
4. PR3 transition noticeを恒久責務表現へ整理する。
5. Learner Required path / selected specialization completionの正本として読める記述を残さない。
6. Task 2 / Task 3のdestination fileをTask 4で再編集しない。追加修正が必要なら元Finding / ownerへ戻る。

### Task 5 — Add reusable self-study review checklist

新規追加:

- `docs/reference/curriculum-self-study-review.md`

最低限次を確認できるreviewer / maintainer向けチェックリストとする。

- 対象受講者像と説明深度
- navigation / skip / branch / rejoin
- hidden prerequisite
- learning goal → explanation → exercise → self-check → completion
- answerability without instructor private knowledge
- Recovery
- Core / Extension / Reference / specialization境界
- command / Artifact / Environment block
- terminology
- specification reference safety

個別レビューの Yes / No、Finding、コメント、未検証理由、Evidence等を保存する結果フォームにはしない。新LMS / DB / review ledgerを作らない。

### Task 6 — Minimal validator / contract protection only if necessary

Contract / validator変更を許可するのは次のどちらかを満たす場合だけ。

**Condition A — Existing machine contract changes**

今回のCurriculum remediationにより、既存validator / contractが検証するcanonical token、required path、route構造等そのものを意図的に変更する必要がある。

**Condition B — Stable P0/P1 regression guard**

PR 4Aで解消するP0/P1の再発を、自然言語全文を固定せず、安定した構造 / canonical token / required-path関係として小さく検証できる。

Candidate examples:

- Common routeからP1-7 / P2-6をRequiredへ戻すregressionの防止
- Instructor ReferenceをLearner Required pathと誤認させるmachine contractの防止

次はcontract testへ追加しない。

- 日本語表現そのもの
- 説明深度
- self-check / Recovery文章の質
- Instructor Referenceの具体文言
- Lesson readability
- headingの全面固定

Condition A / Bのどちらにも当てはまらない場合、Task 6は `N/A` とする。

### Task 7 — Validation / contradiction review

Automated:

```bash
pnpm format:check
pnpm lint:markdown
pnpm validate:curriculum
pnpm test:contracts
git diff --check
```

`pnpm typecheck` は `scripts/validate-curriculum.ts`、`tests/contracts/training-curriculum.test.ts`、その他TypeScript contractを変更した場合だけ実行する。

Manual validationは、Task 5で作成した `docs/reference/curriculum-self-study-review.md` を観点として使い、learner-facing pathを **shared entry → Part 1 branch → Part 1→Part 2 bridge → Part 2 branch** の順にwalkthroughする。共通区間を各routeで機械的に二重レビューせず、共通教材は一度確認し、branch差分だけ追加確認する。

Shared entry / bridge:

1. Shared entry: `README.md → 00_learning-design.md → 01_spreadsheet-test-design.md → P1-1`
2. Part 1 → Part 2 bridge: `P1 completion → 00_learning-design.md の「Part 1からPart 2への移行」→ P2-1`

Branch routes:

1. P1 Common: `P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 → [P1-7 skip] → P1-8 → P1-9`
2. P1 Native: `P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 → P1-7 → P1-8 → P1-9`
3. P2 Common: `P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → [P2-6 skip] → P2-7 → P2-8`
4. P2 Native: `P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → P2-6 → P2-7 → P2-8`

Walkthrough中、各 Learner Required Lesson / Exercise と selected specialization の learner-facing Lesson / Exercise について、必要な checklist 観点を確認する。Checklistを別の独立レビュー工程として重複実施しない。

Assertions:

- Shared entryから `01_spreadsheet-test-design.md` を経てP1-1へ一意に進め、Part 1 completion後にLearning DesignのbridgeからP2-1へ再開できる
- Common learnerがNative specialization未受講でP1 / P2 Common completionへ到達できる
- Native specialization learnerがbranch / prerequisite / rejoinを一意に辿れる
- Common lessonが後続のspecialization / Extension / Referenceをhidden prerequisiteにしていない
- learner-facing materialだけで演習判断・自己確認・Recovery・完了判定ができる
- Instructor / 運営の環境支援後、learner-facing materialから再開地点・確認・次行動を判断できる
- 知識確認問題には回答例 / 理由またはminimum checkpointsがある
- Trade-off問題は一意解を強制せず、必要観点と判断理由条件を持つ
- Specification参照self-checkはBR / AC / sectionを特定できる
- command / artifact self-checkで学習FailureとEnvironment blockを区別できる
- Instructor Referenceが受講内容外supportだけになっている
- Core / Extension / Reference / specialization境界がLesson本文・演習・completion・evaluationで一致する
- Part 1 Common=`C01〜C07 + C09〜C10` bounded Level 2、Part 2 / Final Common=`C01〜C07 + C09〜C12` bounded Level 2、`C08`=Native specialization が README / Learning Design / Rubric / Lesson completion で一致し、PR3 contractがregressionしていない
- P1-4の説明深度がentry profileと矛盾しない
- P1-5がCart / reset / representative Boundary / representative MobileをCoreとし、Payment / Cross-role / Internal Inspection / Accessibility executionをExtensionとして扱う
- P1-6のcompletionがmeaningful failure diagnosisへ接続する
- P1-9がWeb Common Capstoneとして成立し、Native evidence / Baseline / learner-authored evidenceを混同しない
- P2-3でFork / Remote / Push / PRを学べ、provisioning / third-party ReviewをRequired completionにせずC11を自己確認できる
- P2-4がTrigger / Job / Failure / least privilegeをCoreとし、repository-specific allowlist / parser / pin detailをReferenceとして扱う
- Part 2 Common Capstoneがbounded Web CIで成立する
- Optional / Legacy / Instructor ReferenceがLearner Requiredと誤認されない
- `docs/spec/**` にPR 4A差分がない
- Specification Finding dispositionがMaster Plan規則に従う
- terminologyが§11に従い、code / command / ID / official termを破壊していない
- checklistのcommand / Artifact / Environment観点がCurrent Training入口と矛盾しない
- PR5のTraining implementationを前倒ししていない

### Task 8 — Final review / PR preparation / tracker update

1. freshness ruleに従い、必要な関連pathだけ再確認する。
2. `git diff main...HEAD` を全件レビューする。
3. Finding registerの `fix_now` が全て `resolved` か確認する。
4. 未解決P0 / P1 blockerが0件であることを確認する。1件でもあればPR 4Aをcompletion / merge-readyにしない。
5. `defer` がMaster Plan Goal / DoDを破壊していないか確認する。
6. Specification Findingのうち `PR 4B` 件数を確定する。
7. `PR 4B = 0` の場合はIssue #72へ `Not required` と反映できる状態にする。
8. `PR 4B >= 1` の場合は、PR 4Aへ実変更を混ぜず、merge後のfollow-upとして明記する。
9. Issue #72へ child Plan / PR / statusを反映する。
10. PR descriptionにscope / non-goal / validation / remaining follow-upを記載する。

---

## 14. Stop conditions / escalation rules

次に該当したら、その場でExpected Behaviorを推測して進めない。停止範囲は原則として該当Findingとその依存先だけに限定し、独立したPR 4A remediationを不必要に止めない。ただしroot canonical contract自体が未決で広範囲に影響する場合は、その契約へ依存するTask全体を停止する。

### S1 — Specification clarification blocks Curriculum P0 / P1

Normative Specification自体が曖昧・不足・複数解釈で、learner-facing Expected Behaviorを一意に書けない。

Action:

- `Specification clarification` Findingを記録
- 関連Curriculum Findingと相互参照
- 該当P0/P1をopen blockerのまま維持
- 別Issue / Planで仕様判断を求める
- 該当Findingと依存するfile / Taskだけimplementationを停止する
- 依存しないPR 4A remediationは継続してよい
- **該当blockerが解消するまでPR 4A全体をcompletion / merge-readyにしない**

### S2 — Product implementation deviation blocks learner completion

Specificationは一意だがCurrent implementationが異なり、Learner Required completion / selected specialization completion / Master Plan DoDを阻害する。

Action:

- `Product implementation deviation` Finding
- SpecificationをObserved Behaviorへ合わせて変更しない
- Product修正follow-upを作る
- blockerならCurriculum P0/P1をopenのままにする
- 該当Findingと依存するfile / Taskだけimplementationを停止する
- 依存しないPR 4A remediationは継続してよい
- **Product側でblockerが解消するまでPR 4A全体をcompletion / merge-readyにしない**

### S3 — Required P2 is not bounded

Goal / Fixed decisions / DoD成立に必要なP2が、PR 4Aのbounded scopeへ収まらない。

Action:

- 規模だけを理由に`defer`しない
- child Plan scopeを再レビュー
- 必要ならMaster Plan側のscope / split判断へ戻す

### S4 — Specification edit would be semantic or broad

semantics-preserving editorialを超える、または広範囲cleanupになる。

Action:

- PR 4A / 4Bで修正しない
- `Specification clarification` または別Planへ分離

### S5 — Training implementation is required

新しい learner command、Training runner、Workflow、Artifact生成、Environment contract実装が必要になる。

Action:

- PR 5へ送る
- PR 4Aでrunner/workflowを前倒し実装しない

### S6 — Formal strategy / regression change is required

Formal Test Strategy / Formal Regression / Product Native Gate の変更が必要になる。

Action:

- PR 4Aから分離
- 既存Formal owner / follow-upへ送る

### S7 — File restructuring would exceed bounded remediation

Learning-unit Findingを解消するために複数fileの大規模merge / rename / directory再編が必要になる。

Action:

- まず同一file内の統合、navigation / label改善で解消できないか確認する
- それで解消できない場合だけscopeを再レビューする
- 「教材をきれいに揃える」目的だけでは再構成しない

### S8 — Finding target remains unbounded

Task 1終了時点でも `横断` / `全教材` 等のまま具体Targetが閉じない。

Action:

- implementationへ進まない
- actual affected path / headingを追加監査してfinite targetへ落とす
- affected scopeが大きすぎる場合はFinding / scope自体を再レビューする

---

## 15. Definition of Done

PR 4Aは次をすべて満たしたときのみ完了とする。

### Audit

- §8全対象を `audited` / `N/A` で確認済み
- `docs/spec/**` はGit tracked Markdown / text-contract inventoryに対して `audited = total` が成立
- Curriculum Finding registerがCurrent Stateに基づき確定
- 各 `fix_now` Curriculum Findingにfinite Target、Minimum bounded fix、validationがある
- 実際のSpecification Findingが必要なものだけ記録されている
- Instructor Reference migration mapが確定している
- Terminology Decision Tableが確定している

### Blocker

- **未解決P0 / P1 blockerが0件である**
- P0 / P1を正しく`blocked`として記録しただけではDoD達成としない
- Specification clarification / Product implementation deviationに依存するP0 / P1は、その上流blocker解消後にのみ`resolved`とできる
- blocker発生時に依存しないremediationを継続してもよいが、未解決blockerを残したままPR 4Aをcompletion / merge-readyにしない
- 必要なbounded P2が解消済み

### Curriculum

- Common learnerがNative / Extension / ReferenceなしでCommon routeを完了できる
- selected specialization learnerがlearner-facing materialだけで開始・演習・自己確認・完了・rejoinできる
- internal Lessonが独立学習単位として成立するか、必要な場合だけ同一file内で統合されている
- learning goal → explanation → practice / exercise → self-check → completion がFinding対象箇所で成立する
- Instructor Referenceが受講内容外supportへ限定される
- learner-facing一般語がTarget箇所で日本語中心かつ一貫する
- code / Tool / API / ID / machine contractは意味を壊さず保持される
- P1 / P2 Lesson責務が§7 / §13 Task 3のCurrent mappingからずれていない
- `01_spreadsheet-test-design.md` のFindingがある場合、Task 3で解消されている

### Specification safety

- PR 4Aは`docs/spec/**`を変更していない
- `PR 4B` disposition件数が確定している
- clarification / implementation deviationをeditorial fixで隠していない

### Review checklist

- `docs/reference/curriculum-self-study-review.md` が追加されている
- reusable checklistのみを保持し、個別review result/historyを持たない
- Task 7のshared entry / Part 1→Part 2 bridge / branch walkthrough内で、各Learner Required Lesson / Exerciseとselected specialization learner-facing Lesson / Exerciseへ必要なchecklist観点を適用済み

### Validation

- `pnpm format:check` PASS
- `pnpm lint:markdown` PASS
- `pnpm validate:curriculum` PASS
- `pnpm test:contracts` PASS
- `git diff --check` PASS
- TypeScript contract変更時のみ `pnpm typecheck` PASS
- §13 Task 7のshared entry / Part 1→Part 2 bridge + 4 branch route walkthrough + checklist assertions PASS
- PR3 competency contract（Part 1 Common=`C01〜C07 + C09〜C10`, Part 2 / Final Common=`C01〜C07 + C09〜C12`, `C08`=Native specialization）がREADME / Learning Design / Rubric / Lesson completionで一致

### Scope

- Product behavior変更なし
- PR5 scope前倒しなし
- Spec実変更なし
- unrelated refactor / cleanupなし
- Findingのない箇所を均一化目的だけで大量編集していない
- file rename / directory migrationを安易に実施していない
- 同じfileを複数Taskで機械的に再編集していない
- Task 2でPR3のroot contractをFindingなしに再整理していない
- Contract / validator変更はTask 6 Condition A / Bのいずれかを満たす場合だけ

---

## 16. Review checklist for this Plan before implementation

Plan reviewでは、実装の細部より先に次を反証する。

1. Master Plan §16のPrimary ownerを漏らしていないか。
2. PR3で確定したCommon / Native contractを再設計していないか。
3. §7 / §13 Task 3のP1 / P2番号とCurrent file責務が一致しているか。
4. P1-5 / P1-9 / P2-3 / P2-4のCore / Extension / Reference責務がMaster Planと一致しているか。
5. 全文監査と全件修正を混同していないか。
6. P2 / P3を無制限にscopeへ取り込む余地がないか。
7. `fix_now` Findingがfinite Targetへ閉じているか。
8. PR 4BとPR 4Aの変更面が混ざっていないか。
9. Specification conformance auditへscope creepしていないか。
10. Spec audit inventoryがGit tracked Markdown / text contractから決定的に作られているか。
11. Instructor Referenceから情報を削除するだけになっていないか。migration mapが先にあるか。
12. self-study改善が「説明文を増やす」「全Lessonに定型headingを足す」だけになっていないか。
13. Common learnerにNative / Training Copy / production deployment等のhidden prerequisiteを残していないか。
14. terminology統一でmachine contract / code / UI copyを壊す余地がないか。
15. validator / contract testをTask 6 Condition A / B以外で増やしていないか。
16. PR5のTraining implementationを前倒ししていないか。
17. stop conditionがblocker依存範囲だけを止め、無関係なPR 4A remediationまで不必要に停止しないか。
18. 未解決P0 / P1を記録しただけでDoD達成にしていないか。
19. DoDが自動Validationだけでなくshared entry / Part 1→Part 2 bridge + 4 branch routeのmanual contradiction checkを含むか。
20. Task 5のself-study checklistがTask 7のwalkthroughへ統合され、別の重複レビュー工程を作っていないか。
21. PR3 competency contractがREADME / Learning Design / Rubric / Lesson completionでregressionしていないか。
22. PR 4A完了後にPR 4B要否を一意に判断できるか。
23. 実装が原則1file 1 remediation passになり、Task 2 / Task 3でLessonを二重編集しないか。
24. Task 2がconfirmed root Finding / migration / durable terminology ruleだけを変更し、PR3 contractの再整理になっていないか。
25. `01_spreadsheet-test-design.md` を含むPrimary change surfaceすべてに一意なownerがあるか。
26. Optional / Legacyが存在しない場合に不要な成果物やFindingを作らない設計か。

---

## 17. Execution order

```text
Task 0  Baseline / freshness baseline
  ↓
Task 1  Full Pre-change audit
        + Git tracked spec text-contract inventory
        + Finding finalization / finite targets
        + Instructor migration map
        + Terminology finalization
        + blocker dependency boundary
  ↓
[Implementation gate]
  ↓
Task 2  Confirmed root Finding / migration only
        README / Learning Design / optional Rubric
        └ PR3 contractをFindingなしに再整理しない
  ↓
Task 3  Learner-facing curriculum remediation
        spreadsheet design + Part 1 + Part 2
        └ 原則1file 1 remediation pass
           classification + navigation + depth + self-study
           + Instructor migration + terminology を同時処理
  ↓
Task 4  Instructor Reference finalization
        └ destination反映後にsupport-onlyへ縮退
  ↓
Task 5  Reusable self-study checklist
  ↓
Task 6  Minimal validator / contract protection
        └ Condition A / Bを満たさなければN/A
  ↓
Task 7  Automated validation
        + shared entry / Part 1→Part 2 bridge
        + 4 branch route walkthrough
        + checklist reviewを同じwalkthroughへ統合
        + PR3 competency contract regression check
  ↓
Task 8  Freshness check + final review + PR / Issue #72 update
```

Task単位をcommitへ1:1対応させる必要はない。重要なのは Finding → minimum fix → primary-owned changed file → validation を追跡できることである。

---

## 18. Expected outcome before implementation starts

Pre-change audit完了時点で、最低限以下が揃っていなければimplementation-readyと判定しない。

- branch / baseが正しい
- §8 audit inventory / countが閉じている
- P1 / P2 Lesson responsibility mappingとCore / Extension / Reference境界がMaster Planと一致している
- 全 `fix_now` Findingがfinite `path + heading / section` Targetを持つ
- Instructor Reference migration mapが具体destinationまで確定している
- Terminology Decision Tableが確定している
- Task ownershipが一意で、Lesson fileをTask 2 / Task 3で二重編集しない
- Task 2はconfirmed root Finding / migration / durable terminology ruleだけを対象にし、PR3 contractを不要に再編集しない
- `01_spreadsheet-test-design.md` のownerがTask 3として明示されている
- validator / contract変更要否がCondition A / Bで判断できる
- scope / non-goal / PR 4B split / stop conditionsが明示されている
- 未解決P0 / P1 blockerがある場合、依存するFinding / file / Taskだけを停止し、dependency boundaryが記録されている
- 未解決P0 / P1 blockerが残る限りPR 4A completion / merge-readyにはしない
- Task 7でshared entry / Part 1→Part 2 bridge / 4 branch routeとself-study checklist reviewを一つのmanual validationとして実施できる
- Task 7でPR3 competency contractのregressionを明示的に確認できる
- **Task 1の全文監査が完了するまでは implementation-ready と判定しない**

この状態でのみCurriculum remediation implementationへ進む。