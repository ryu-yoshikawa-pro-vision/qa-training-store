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

**Status: Planning / Pre-change audit in progress**

この child Plan は PR 4A の実装境界と実行順を固定するために先行作成する。Master Plan §16 が要求する Pre-change audit は、実装開始前にこのPlan上で完了させる。

### Hard gate

次をすべて満たすまで Curriculum 本文の remediation implementation を開始しない。

1. §8 の audit scope 全件を Current branch で確認している。
2. Curriculum Finding を §9 に追加し、各Findingへ `P0`〜`P3` と `fix_now` / `defer` を付与している。
3. 各 Curriculum Finding に Target、Current state / problem、Impact、Minimum bounded fix、Related contract / validation が記載されている。
4. 実際に判断対象となった Specification Finding を §10 に追加し、`no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` のいずれかへ分類している。
5. `03_instructor-reference.md` の learner-facing 情報について、削除前に移行先を決めた migration map が確定している。
6. §11 Terminology Decision Table を監査結果に合わせて確定している。
7. P0 / P1 に未解決の `Specification clarification` または learner completion を阻害する `Product implementation deviation` が紐づく場合、解消方法または停止判断を明示している。
8. 必要なP2が bounded change に収まらない場合、無理に `defer` せず scope review を実施している。

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

PR #103 / Master Plan で確定した次の契約は PR 4A で再設計しない。

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

ただし、learner-facing wording を細かく固定する大量の brittle contract test は追加しない。Validator / contract test の責務を新しい Curriculum SSOT に拡張しない。

### 5.3 Audit-only surface

- `docs/spec/**` の Markdown / text contract 全件

PR 4A では Audit-only surface のファイルを編集しない。

### 5.4 Optional / Legacy discoverability

Current RepositoryまたはCurriculum navigation上に Optional Agentic QA、Legacy Capstone、その他旧教材が存在する場合だけ、Learner Required completionと誤認されないことを確認する。

- 存在しないものを復活・新設しない。
- 存在しない場合は audit result を `N/A` とする。
- file rename / directory migrationは、ラベル・navigation修正で解消できない場合に限る。原則として実施しない。

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

Audit all top-level files and their internal Lessons.

- `part1/01_test-automation-foundations.md`
- `part1/02_scenario-shop-analysis.md`
- `part1/03_test-design-and-automation-selection.md`
- `part1/04_playwright-foundations.md`
- `part1/05_playwright-e2e-practice.md`
- `part1/06_execution-and-failure-analysis.md`
- `part1/07_maestro-native-automation.md`
- `part1/08_test-management-and-maintainability.md`
- `part1/09_part1-capstone.md`

Audit focus:

- internal Lesson が独立した学習単位として成立するか
- learning goal → explanation → practice / exercise → self-check → completion がつながるか
- Common learner が specialization / Extension / Reference 未受講でも理解できるか
- P1-7 skip / rejoin が周辺Lessonからも矛盾なく辿れるか
- Playwright Common と Maestro specialization の保守性内容が混ざっていないか
- Core / Extension 境界が completion / evidence にまで反映されているか
- P1-3が技法数quotaではなくRiskに対するtechnique選択を中心にしているか
- P1-4がコードベース自動化未経験・プログラミング非必須のentry profileに対して、JavaScript / TypeScript、Playwright、Locator / Assertionの初出説明を十分な深さで持つか
- P1-6のcompletionがmeaningful failure diagnosisへ接続しているか
- P1-8でPOM / Helper / Fixture / Flowを唯一の正解として扱っていないか
- P1-9がWeb Common CapstoneとNative specialization evidenceを混同していないか

### 8.3 Part 2 Learner Required / specialization

Audit all top-level files and their internal Lessons.

- `part2/01_software-development-process.md`
- `part2/02_git-version-control.md`
- `part2/03_github-pull-request-review.md`
- `part2/04_ci-github-actions.md`
- `part2/05_playwright-ci.md`
- `part2/06_native-ci-maestro.md`
- `part2/07_ci-cd-quality-gates.md`
- `part2/08_integration-design-capstone.md`

Audit focus:

- Git / GitHub / CI の一般能力と repository-specific operation を分離できているか
- bounded Web CI Common と Native / multi-platform / full CD advanced scope を分離できているか
- P2-6 skip / rejoin と Native internal prerequisite が一意か
- final capstone の Required artifact / evaluation が Common completion 契約を超えていないか
- Common learner に production secret / deploy permission / Native environment を暗黙要求していないか
- P2-2でBranch / Diff / Commit等のVCS semanticsとTraining Copy exact SHA / copy mechanicsを分離できているか
- P2-3で実際の第三者ReviewをRequired completionにしていないか。公開されたreview観点とself-reviewでC11を自己確認できるか
- P2-4でTrigger / Job / Step / Runner / Failure / least privilege等のCI基礎とrepository-specific allowlist / parser / pin detailを分離できているか
- P2-5でWeb CI / Artifact / failure evidenceがCommon Coreとして成立するか
- P2-6でNative CIのrepository-specific detailをReferenceへ寄せつつ、選択learner向けself-study completenessが成立するか
- P2-7でGate / Artifact / fail-closedとvendor / production deployment detailを分離できているか
- P2-8でCommon Capstoneをbounded Web CIへ限定し、Native / iOS / full CDをspecialization / Advancedへ分離できているか

### 8.4 Repository-required support asset boundary

次を横断して、Repository上必要なassetとLearner Required materialを混同していないことを確認する。

- Curriculum README / Learning Design
- Instructor Reference
- Curriculum validatorのrequired-file説明
- Workbook / Training入口への参照文
- Lesson中の「必須」「Required」「完了条件」表現

### 8.5 Specification text contract

`docs/spec/**` 配下の Markdown / text document 全件を対象とする。

Audit focus は次に限定する。

- canonical terminology / glossaryとの不整合
- template / ID grammar / heading contractとの不整合
- learner / maintainerの読解へ実害がある表記・用語の不整合
- Curriculumが参照するExpected Behaviorを一意に読めるか
- editorial correctionで意味を変えず修復できるか
- Specification自体が曖昧・不足・複数解釈か
- 明確なSpecificationとCurrent implementationが、Curriculum判断に必要な範囲で食い違うか

全 Product behavior を実装と総当たりする conformance audit へ拡張しない。

### 8.6 Optional / Legacy discoverability audit

- `09_part1-capstone.md` が canonical Part 1 Learner Required Capstone として一意か
- Native specialization がCommon completionではない一方、選択したLearnerには正規learner pathであることが明確か
- Optional / Legacy教材が存在する場合、Learner Required completionと誤認されないか
- `03_instructor-reference.md` がLearner Required pathとして案内されていないか

存在しないOptional / Legacy targetは `N/A` とし、人工的なFindingを作らない。

### 8.7 Audit completion evidence

Pre-change audit 完了時に、このPlanを更新して次を残す。

- coverage対象ごとの `audited` / `N/A` 状態
- 実際に発生した Curriculum Finding
- 実際に判断対象となった Specification Finding
- Finding相互参照
- Instructor Reference migration map
- Terminology Decision Table 最終版
- blocker / stop condition の有無

問題がないSpec fileごとに人工的な `no_change` Findingを作らない。

---

## 9. Curriculum Finding register

### 9.1 Finding schema

Pre-change audit完了時、各 Curriculum Finding は次を持つ。

| Field | Requirement |
| --- | --- |
| ID | `CUR-4A-xxx` |
| Target | file / heading / Lesson |
| Current state / problem | Current branch上の具体的事実 |
| Impact | learner path / completion / evaluation / self-study / maintainabilityへの影響 |
| Severity | `P0` / `P1` / `P2` / `P3` |
| Disposition | `fix_now` / `defer` |
| Minimum bounded fix | Goal達成に必要な最小変更 |
| Related contract / validation | PR3 contract、Rubric、BR/AC、manual check、validator等 |

この情報を監査段階で確定し、実装段階でscopeを再設計しない。

### 9.2 Confirmed findings at Plan creation

| ID | Target | Current state / problem | Impact | Severity | Disposition | Minimum bounded fix | Related contract / validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CUR-4A-001` | P1-8 `08_test-management-and-maintainability.md` | 「複数の Playwright Test と Maestro Flow を作成済み」を前提とし、P1-7をskipするCommon learnerにNative経験を要求する | Common routeにhidden Native prerequisiteが入る | P1 | `fix_now` | Common部分をPlaywrightだけで成立させ、Maestro固有内容は選択learner向け追加例 / specialization / Extensionへ分離する | PR3 Common/Native route。Common learner walkthrough |
| `CUR-4A-002` | P1-5 `05_playwright-e2e-practice.md` | completion / evidence表現にPayment / Role系が残り、Master PlanのCore / Extension境界が曖昧 | Common completionを必要以上に拡張する | P1 | `fix_now` | CommonをCart E2E + representative boundary + representative mobileへ揃え、Payment / cross-role / broad internal inspection等をExtensionへ明示分離する | PR3 completion contract。P1 Common walkthrough |
| `CUR-4A-003` | `03_instructor-reference.md` + migration destinations | learner判断・Recovery・評価に関するtransitional contentがInstructor Referenceに残る | learner-facing materialだけでself-study completionを判断できない可能性 | P1 | `fix_now` | Audit時にmigration mapを確定し、必要情報を対応Lesson / Rubric / public referenceへ移してからInstructor Referenceをsupport-onlyへ縮小する | PR3 learner/instructor boundary。Instructor-free walkthrough |
| `CUR-4A-004` | P2-2 `02_git-version-control.md` | Training Copy commit SHA / repository-specific copy mechanicsがCommon学習内容として強く入る | VCS学習とrepository-specific operationの境界が曖昧 | P2 | `fix_now` | Branch / Diff / Commit等のVCS semanticsをCoreに残し、exact SHA / copy mechanicsをReferenceへ分離する | Master Plan P2-2 boundary。Common walkthrough |
| `CUR-4A-005` | P2-8 `08_integration-design-capstone.md` | Common completionをbounded Web CIと宣言する一方、学習目標・シナリオ・記録成果物にNative / multi-platform / full delivery要求が混在する | Common learnerへC12範囲外のcompletionを要求し得る | P1 | `fix_now` | Common Required artifact / evaluationをbounded Web CIへ限定し、Native / iOS / multi-platform / full CDをspecialization / Advancedへ分離する | PR3 C12 contract。P2 Common walkthrough |
| `CUR-4A-006` | learner-facing curriculum横断 | 一般語の日本語と英語が混在する。P1-5では `Learning Goal` / `Expected Product Behavior` / `Alternative Design` / `Failure Analysis` / `Exercise` / `Completion Evidence` 等を確認 | 初学者の読解・用語一貫性を損なう | P2 | `fix_now` | §11に従い一般learner-facing語を日本語中心へ揃え、Tool / API / code / ID / UI literalは保持する | Terminology Decision Table。manual terminology cross-check |
| `CUR-4A-007` | Learner Required / selected specialization横断 | P1-2等の「確認問題」は問いを提示するが、learner自身が正誤を判断するanswer criterion / recoveryへの接続が弱い | Instructorなしのself-study loopが閉じない | P2 | `fix_now` | 必要箇所だけ自己確認基準・Recovery・次の行動を追加する。全Lessonへの定型section追加はしない | §12 Self-study implementation rule。manual self-study walkthrough |

### 9.3 Carry-forward candidates requiring Current State revalidation

旧Audit / Master Plan由来の次の論点は、Pre-change auditでCurrent Stateを確認してからFinding化する。未確認のまま `fix_now` としない。

- internal Lessonが短すぎ、独立学習単位として目的・説明・Practice・到達確認を持たない箇所
- P1-1のfoundationsがentry profileに対して不足または過剰でないか
- P1-2のScenario Shop分析でRole / State / Seed / Resetのcanonical definitionとapplication practiceが混ざっていないか
- P1-3が技法数quotaではなくRiskに対するtechnique選択を中心にしているか
- P1-4のJavaScript / TypeScript bridge、Playwright concept、Locator / Assertion初出説明がentry profileに対して十分か
- P1-5のCore / Extension境界とcompletion整合
- P1-6のmeaningful failure diagnosisとCompletion Evidence整合
- P1-7のNative specialization開始条件 / practice / evidence / rejoin
- P1-8のPlaywright maintainability Common、Native追加例、POM / Helper / Fixture / Flow Reference境界
- P1-9のWeb Common CapstoneとNative evidenceの分離
- P2-1の一般開発プロセスとrepository-specific operationの境界
- P2-2のVCS semanticsとTraining Copy mechanicsの境界
- P2-3のGitHub / PR / Reviewで第三者ReviewをRequiredにしていないか
- P2-4のCI / GitHub Actions基礎とrepository-specific detailの境界
- P2-5のWeb CI / Artifact / failure evidence Common completionとの整合
- P2-6のNative CI specializationとrepository-specific Reference境界
- P2-7のGate / Artifact / fail-closed Coreとvendor / production detailの境界
- P2-8のbounded Web CI Common CapstoneとNative / full delivery Advancedの境界
- Lesson間の説明重複、hidden prerequisite、navigation断絶
- Test Case ID / Evidence / Artifact等のcanonical contractとの表記不整合
- Optional / Legacy / Instructor Referenceのdiscoverability誤認

### 9.4 Severity rule

- `P0`: completion不能、誤ったExpected Behavior、危険な手順等で学習を成立させない
- `P1`: learner path / prerequisite / completion / evaluation / specialization境界の実質的矛盾
- `P2`: 用語、重複、発見性、説明深度、self-study品質、保守性へ影響する
- `P3`: 軽微な表記・文章cleanup

`P0` / `P1` はPR 4A blocker。`P2` はMaster Plan Goalへ直接必要かつboundedなものだけ `fix_now`。`P3` は変更箇所周辺だけ局所修正する。

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
| learner-facing一般heading | 日本語を基本とする | `Learning Goal` → `学習目標`, `Exercise` → `演習`, `Completion Evidence` → 文脈に応じ `完了証跡` / canonical label併記 |
| learner-facing一般説明 | 日本語中心。不要な英語混在を避ける | `Failure Analysis` → `失敗原因の分析` |
| Tool / Product official name | 公式名を維持 | Playwright, Maestro, Git, GitHub Actions, Node.js, pnpm, TypeScript, Expo |
| API / code identifier | literalを維持 | `page.getByRole`, `PLAYWRIGHT_BASE_URL`, `workflow_dispatch` |
| command / file path / config key | literalを維持 | `pnpm run training:web:baseline`, `docs/spec/README.md` |
| ID grammar | canonical literalを維持 | `TC-CART-001`, `BR-*`, `AC-*`, `CT-*`, `CP-*` |
| machine-consumed heading / token | parser / validator contractを確認し、PR4Aでは機械翻訳しない | template heading, required token |
| Specification canonical heading | Spec contractとして英語を維持。PR4Aで変更しない | `Overview`, `Business Rules`, `Acceptance Criteria`, `UI Contract` |
| Curriculum classification | canonical tokenを維持し、日本語説明を添える | `Common Core（共通必修）`, `Extension（発展）`, `Reference（参照）`, `Native specialization（専門選択）` |
| Competency canonical label | PR3 contractを維持し、日本語で意味を補足 | `Minimum Evidence（最小完了証跡）`, `bounded Level 2` |
| Gherkin canonical terms | literalを維持し、日本語説明を添える | Given / When / Then |
| Product UI copy | 実UI / Normative Specのliteralを維持 | ボタン名・ラベル名 |
| Test Case ID / UI Test ID / Seed Scenario / User Journey | Learning Designの区別を維持し、省略で意味を混ぜない | `Test Case ID` と `UI Test ID` を別概念として扱う |

用語統一を理由に code identifier、Spec ID、UI copy、machine-consumed contractを変更しない。

Pre-change auditで確定したうち、将来も安定する最小の言語・用語ルールだけを `00_learning-design.md` または Curriculum README の既存責務へ反映する。新しいGlossaryファイルは作らない。

---

## 12. Implementation rules

### 12.1 Default remediation rule

実装は次をDefaultとする。

- Top-level Lesson番号・ファイル名・配置は変更しない。
- file rename / directory migrationは原則行わない。
- Findingがない箇所を均一化目的だけで書き換えない。
- 既存構造でself-study contractを満たせる場合、新しい定型sectionを追加しない。
- internal Lessonの統合は同一file内を原則とし、明確なlearning-unit Findingがある場合だけ行う。
- classification labelを全paragraphへ付けず、誤認可能な境界だけ明示する。
- 1つのfileは原則1 remediation passで、そのfileに紐づくclassification / learning depth / self-study / Instructor migration / terminology Findingをまとめて解消する。
- 同じfileを「Part修正 → Instructor移行 → terminology → self-study」の順で何度も機械的に触らない。
- 文章量を増やすこと自体を目的にしない。既存説明が十分なら最小修正または変更なしとする。

### 12.2 Internal Lesson rule

- 数行でも目的が明確なshort referenceなら残してよい。
- 目的・説明・Practice・前後関係が弱く、単独で切る意味がなければ同一file内で統合する。
- 見出しを残すためだけの説明追加は禁止する。

### 12.3 Self-study implementation rule

Learner Required path と selected specialization について、必要な場合だけ次を補う。

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

`講師に確認する`、`レビューしてもらう`、`答え合わせしてもらう`ことをRequired completionにしない。

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

---

## 13. Implementation tasks

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
- learner-facing情報には具体的な移行先を付ける。
- 移行先不明のまま削除対象にしない。

#### Specification audit

§8.5のbounded text-contract観点だけを全件確認する。

#### Plan finalization

- §8 stateを `audited` / `N/A` へ更新
- §9 actual Findingを確定
- §10 actual Specification Findingを記録
- Instructor migration mapを確定
- §11 terminology tableを確定
- blocker有無を明記

**Stop**: Task 1完了前にTask 2以降へ進まない。

### Task 2 — Stabilize canonical route / classification / durable terminology rules

Primary targets:

- `README.md`
- `00_learning-design.md`
- 必要な範囲の `02_competency-rubric.md`
- 必要な各Lesson intro / navigation

Actions:

1. Common / Native specialization / Extension / Referenceのlearner-facing定義を一意にする。
2. P1 / P2のskip / branch / rejoinを、Top-levelだけでなく実際のLesson導線でも矛盾なく辿れるようにする。
3. Common prerequisiteにspecialization / Extension / Referenceを要求する表現を除去する。
4. classification自体は新しいレイヤーを追加せず、既存4区分で表現する。
5. Optional / Legacy / Instructor ReferenceがLearner Requiredと誤認されるnavigationだけ最小修正する。
6. §11のうち将来も安定する最小ルールを既存Learning Design / README責務へ反映する。

### Task 3 — Remediate learner-facing curriculum in one pass per file

Task 1で確定したFinding / migration map / terminologyに従い、Part 1 / Part 2を原則1file 1 remediation passで修正する。

#### Part 1 responsibility map

- **P1-1 — Test Automation Foundations**: entry profileに合う自動化の目的・限界・全体像。未説明の高度知識を前提にしない。
- **P1-2 — Scenario Shop Analysis**: Role / State / User Journey / Seed / Resetを使ったテスト対象分析。canonical definitionとapplication practiceの不要な重複を整理する。
- **P1-3 — Test Design and Automation Selection**: 技法数quotaではなく、Spec / Riskに対して適切なtechniqueを選び理由を説明できることを中心にする。
- **P1-4 — Playwright Foundations**: JavaScript / TypeScript minimum bridge、Playwright concept、Locator / Action / Assertion。コードベース自動化未経験・プログラミング非必須のentry profileで理解可能な初出説明にする。
- **P1-5 — Playwright E2E Practice**: Common CoreはCart E2E + explicit reset + representative boundary + representative mobile。Payment / Cross-role / Internal Inspection / broad advanced execution等はExtensionへ分離する。
- **P1-6 — Execution and Failure Analysis**: meaningful failure diagnosisを中心にし、Trace / Screenshot / Video等からProduct Bug / Test Bug / Environment / Flakyを区別する。Completion Evidenceもdiagnostic evidenceへ接続する。
- **P1-7 — Maestro Native Automation**: Native specialization。必要なCommon prerequisite、開始Gate、one learner-authored Maestro flow、runtime evidence、P1-8へのrejoinをlearner-facingに一意化する。
- **P1-8 — Test Management and Maintainability**: CommonはPlaywrightだけで実在する保守問題の診断 + 最小改善1件が成立する。Maestro固有比較はselected specialization向け追加例。POM / Helper / Fixture / Flow patternは唯一の正解にせずReferenceとして扱う。
- **P1-9 — Part 1 Capstone**: Web Common Capstoneを簡潔にし、Common completionとNative specialization evidenceを分離する。

#### Part 2 responsibility map

- **P2-1 — Software Development Process**: software development / change flowの一般概念をCoreとし、repository-specific operationはReferenceへ寄せる。
- **P2-2 — Git Version Control**: Branch / Diff / Commit等のVCS semanticsとdiff safetyをCore。Training Copy exact SHA / copy mechanicsはReference。
- **P2-3 — GitHub / Pull Request / Review**: Remote / Push / PR / Reviewを学ぶ。第三者ReviewをRequired completionにせず、公開review観点、既存 / 教材用Diff、自分のPRのself-reviewでC11を自己確認できるようにする。演習RepositoryのProvisioning自体はInstructor / 運営が担当してよい。
- **P2-4 — CI and GitHub Actions**: Trigger / Job / Step / Runner / Failure / least privilege等をCore。repository-specific allowlist / parser / pin等の詳細はReference。
- **P2-5 — Playwright in CI**: bounded Web CI、Artifact、failure evidenceをCommon Coreとして成立させる。
- **P2-6 — Native CI and Maestro**: Native specialization。repository-specific detailはReferenceへ寄せ、必要なCommon prerequisite、Native internal prerequisite、開始Gate、evidence、P2-7へのrejoinを一意化する。
- **P2-7 — Quality Gate / CI/CD**: Gate / Artifact / fail-closedをCommon Core。vendor固有・production deployment detailはAdvanced / Referenceへ分離する。
- **P2-8 — Integration Design Capstone**: Common Required artifact / evaluation / completionはbounded Web CIのTrigger / Gate / Artifact / Failure reasoningへ限定する。Native / iOS / multi-platform / full deliveryはspecialization / Advanced。

各fileの修正時に、そのfileへ紐づく次の要素をまとめて処理する。

- classification / prerequisite / navigation
- learning depth / duplication
- practice / self-check / Recovery / completion
- Instructor Referenceからの移行情報
- terminology / heading

### Task 4 — Finalize Instructor Reference

Task 3でlearner-facing情報の移行が完了した後だけ実施する。

1. 移行済みlearner-facing情報を削除または正本参照へ置き換える。
2. environment / account / permission / device / repository / Training Copy / infrastructure / toolchain等の受講内容外supportへ限定する。
3. PR3 transition noticeを恒久責務表現へ整理する。
4. Learner Required path / selected specialization completionの正本として読める記述を残さない。

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

Curriculum修正で既存canonical contractのregression guardが必要な場合だけ実施する。

Candidate examples:

- Common routeからP1-7 / P2-6をRequiredへ戻すregressionの防止
- Instructor ReferenceをLearner Required pathと誤認させる契約の防止
- canonical Test Case ID grammar等、既存contractと教材文言の再不整合防止

新しい自然言語headingすべてを固定するcontract testは作らない。

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

Manual:

- Common learnerがNative specialization未受講でP1 / P2 Common completionへ到達できる
- Native specialization learnerがbranch / prerequisite / rejoinを一意に辿れる
- Common lessonが後続のspecialization / Extension / Referenceをhidden prerequisiteにしていない
- learner-facing materialだけで演習判断・自己確認・Recovery・完了判定ができる
- 知識確認問題には回答例 / 理由またはminimum checkpointsがある
- Trade-off問題は一意解を強制せず、必要観点と判断理由条件を持つ
- Specification参照self-checkはBR / AC / sectionを特定できる
- command / artifact self-checkで学習FailureとEnvironment blockを区別できる
- Instructor Referenceが受講内容外supportだけになっている
- Core / Extension / Reference / specialization境界がLesson本文・演習・completion・evaluationで一致する
- P1-4の説明深度がentry profileと矛盾しない
- P1-6のcompletionがmeaningful failure diagnosisへ接続する
- P2-3が第三者ReviewをRequired completionにしていない
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
3. Finding registerの `fix_now` が全て解消済みか確認する。
4. `defer` がMaster Plan Goal / DoDを破壊していないか確認する。
5. Specification Findingのうち `PR 4B` 件数を確定する。
6. `PR 4B = 0` の場合はIssue #72へ `Not required` と反映できる状態にする。
7. `PR 4B >= 1` の場合は、PR 4Aへ実変更を混ぜず、merge後のfollow-upとして明記する。
8. Issue #72へ child Plan / PR / statusを反映する。
9. PR descriptionにscope / non-goal / validation / remaining follow-upを記載する。

---

## 14. Stop conditions / escalation rules

次に該当したら、その場でExpected Behaviorを推測して進めない。

### S1 — Specification clarification blocks Curriculum P0 / P1

Normative Specification自体が曖昧・不足・複数解釈で、learner-facing Expected Behaviorを一意に書けない。

Action:

- `Specification clarification` Findingを記録
- 関連Curriculum Findingと相互参照
- 該当P0/P1をopen blockerのまま維持
- 別Issue / Planで仕様判断を求める

### S2 — Product implementation deviation blocks learner completion

Specificationは一意だがCurrent implementationが異なり、Learner Required completion / selected specialization completion / Master Plan DoDを阻害する。

Action:

- `Product implementation deviation` Finding
- SpecificationをObserved Behaviorへ合わせて変更しない
- Product修正follow-upを作る
- blockerならCurriculum P0/P1をopenのままにする

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

---

## 15. Definition of Done

PR 4Aは次をすべて満たしたときのみ完了とする。

### Audit

- §8全対象を `audited` / `N/A` で確認済み
- Curriculum Finding registerがCurrent Stateに基づき確定
- 各Curriculum FindingにMinimum bounded fixとvalidationがある
- 実際のSpecification Findingが必要なものだけ記録されている
- Instructor Reference migration mapが確定している
- Terminology Decision Tableが確定している

### Curriculum

- P0 / P1 `fix_now` が全て解消済み、またはMaster Plan規則に沿う明示blockerとして扱われている
- 必要なbounded P2が解消済み
- Common learnerがNative / Extension / ReferenceなしでCommon routeを完了できる
- selected specialization learnerがlearner-facing materialだけで開始・演習・自己確認・完了・rejoinできる
- internal Lessonが独立学習単位として成立するか、必要な場合だけ同一file内で統合されている
- learning goal → explanation → practice / exercise → self-check → completion が成立する
- Instructor Referenceが受講内容外supportへ限定される
- learner-facing一般語が日本語中心で一貫する
- code / Tool / API / ID / machine contractは意味を壊さず保持される
- P1 / P2 Lesson責務が§7.8 / §13 Task 3のCurrent mappingからずれていない

### Specification safety

- PR 4Aは`docs/spec/**`を変更していない
- `PR 4B` disposition件数が確定している
- clarification / implementation deviationをeditorial fixで隠していない

### Review checklist

- `docs/reference/curriculum-self-study-review.md` が追加されている
- reusable checklistのみを保持し、個別review result/historyを持たない

### Validation

- `pnpm format:check` PASS
- `pnpm lint:markdown` PASS
- `pnpm validate:curriculum` PASS
- `pnpm test:contracts` PASS
- `git diff --check` PASS
- TypeScript contract変更時のみ `pnpm typecheck` PASS
- §13 Task 7 manual cross-check PASS

### Scope

- Product behavior変更なし
- PR5 scope前倒しなし
- Spec実変更なし
- unrelated refactor / cleanupなし
- Findingのない箇所を均一化目的だけで大量編集していない
- file rename / directory migrationを安易に実施していない

---

## 16. Review checklist for this Plan before implementation

Plan reviewでは、実装の細部より先に次を反証する。

1. Master Plan §16のPrimary ownerを漏らしていないか。
2. PR3で確定したCommon / Native contractを再設計していないか。
3. §7.8 / §13 Task 3のP1 / P2番号とCurrent file責務が一致しているか。
4. 全文監査と全件修正を混同していないか。
5. P2 / P3を無制限にscopeへ取り込む余地がないか。
6. PR 4BとPR 4Aの変更面が混ざっていないか。
7. Specification conformance auditへscope creepしていないか。
8. Instructor Referenceから情報を削除するだけになっていないか。migration mapが先にあるか。
9. self-study改善が「説明文を増やす」「全Lessonに定型headingを足す」だけになっていないか。
10. Common learnerにNative / Training Copy / production deployment等のhidden prerequisiteを残していないか。
11. terminology統一でmachine contract / code / UI copyを壊す余地がないか。
12. validator / contract testを過剰に増やす設計になっていないか。
13. PR5のTraining implementationを前倒ししていないか。
14. stop conditionが実際に実装停止へ使える具体性を持つか。
15. DoDが自動Validationだけでなくlearner pathのmanual contradiction checkを含むか。
16. PR 4A完了後にPR 4B要否を一意に判断できるか。
17. 実装が原則1file 1 remediation passになり、観点ごとの多重編集を前提にしていないか。
18. Optional / Legacyが存在しない場合に不要な成果物やFindingを作らない設計か。

---

## 17. Execution order

```text
Task 0  Baseline / freshness baseline
  ↓
Task 1  Full Pre-change audit
        + Finding finalization
        + Instructor migration map
        + Terminology finalization
  ↓
[Implementation gate]
  ↓
Task 2  Canonical route / classification / durable terminology rules
  ↓
Task 3  Learner-facing curriculum remediation
        └ 原則1file 1 remediation pass
           classification + depth + self-study
           + Instructor migration + terminology を同時処理
  ↓
Task 4  Instructor Reference finalization
  ↓
Task 5  Reusable self-study checklist
  ↓
Task 6  Minimal validator / contract protection (only if needed)
  ↓
Task 7  Automated validation + manual contradiction review
  ↓
Task 8  Freshness check + final review + PR / Issue #72 update
```

Task単位をcommitへ1:1対応させる必要はない。重要なのは Finding → minimum fix → changed file → validation を追跡できることである。

---

## 18. Expected outcome before implementation starts

次のレビュー時点では、少なくとも以下が揃っていることを期待する。

- branch / baseが正しい
- child PlanがRepositoryに保存されている
- P1 / P2 Lesson responsibility mappingがCurrent Repositoryと一致している
- Pre-change audit coverageが明示されている
- Curriculum Finding schemaが実装判断を再発明しなくてよい具体性を持つ
- Instructor Reference migration mapの作成手順が明示されている
- Terminology Decision Tableが存在する
- implementationを1file 1 remediation passへ単純化するルールが明示されている
- scope / non-goal / PR 4B split / stop conditionsが明示されている
- **ただし、Task 1の全文監査が完了するまでは implementation-ready と判定しない**

この状態でPlanを反証レビューし、問題がなければPre-change auditを完遂してFinding register / migration map / terminologyを確定する。その後にのみCurriculum remediation implementationへ進む。
