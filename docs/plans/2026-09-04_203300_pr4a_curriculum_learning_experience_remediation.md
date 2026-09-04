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
3. 実際に判断対象となった Specification Finding を §10 に追加し、`no_change` / `PR 4B` / `Specification clarification` / `Product implementation deviation` のいずれかへ分類している。
4. §11 Terminology Decision Table を監査結果に合わせて確定している。
5. P0 / P1 に未解決の `Specification clarification` または learner completion を阻害する `Product implementation deviation` が紐づく場合、解消方法または停止判断を明示している。
6. 必要なP2が bounded change に収まらない場合、無理に `defer` せず scope review を実施している。

単にファイルを列挙しただけでは Pre-change audit 完了としない。各対象について learner path / learning unit / terminology / self-study / classification / specification semantic safety の該当観点を実際に確認する。

---

## 3. Branch / base

- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Branch: `docs/pr4a-curriculum-learning-experience-remediation`
- Base: latest `main` after PR #103 merge
- Base commit: `010dfc8d564818c4484fdf908e43961a2b2b7cc2`
- Predecessor: PR #103 — Decision B / Competency / Assessment Contract
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`

PR 4A は stacked PR にしない。PR 4B が必要になった場合も PR 4A へ混在させず、PR 4A merge 後の最新 `main` から別branchを作る。

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
- 明確なSpecificationとCurrent implementationが必要な範囲で食い違うか

全 Product behavior を実装と総当たりする conformance audit へ拡張しない。

### 8.6 Audit completion evidence

Pre-change audit 完了時に、このPlanを更新して次を残す。

- coverage対象ごとの `audited` 状態
- 実際に発生した Curriculum Finding
- 実際に判断対象となった Specification Finding
- Finding相互参照
- Terminology Decision Table 最終版
- blocker / stop condition の有無

問題がないSpec fileごとに人工的な `no_change` Findingを作らない。

---

## 9. Curriculum Finding register

### 9.1 Confirmed findings at Plan creation

| ID | Severity | Disposition | Current evidence | Required remediation |
| --- | --- | --- | --- | --- |
| `CUR-4A-001` | P1 | `fix_now` | P1-8 が「複数の Playwright Test と Maestro Flow を作成済み」を前提としており、P1-7をskipするCommon learnerにNative経験を要求する | P1-8のCommon部分をPlaywright中心で独立させ、Maestro固有の保守内容はNative specialization / Extensionへ明示分離する |
| `CUR-4A-002` | P1 | `fix_now` | P1-5のcompletion/evidence表現にPayment / Role系が残り、Master PlanでExtensionとされた範囲とCommon completion境界が曖昧 | Common completionをCart E2E + boundary + mobile等のfixed Coreへ揃え、Payment / cross-role / broad failure diagnosisはExtensionとして明示する |
| `CUR-4A-003` | P1 | `fix_now` | Instructor Referenceはtransition notice後もlearner判断・Recovery・評価に関するtransitional contentを保持する | Learner Required / selected specializationで必要な情報をlearner-facing正本へ移し、Instructor Referenceを受講内容外支援へ限定する |
| `CUR-4A-004` | P2 | `fix_now` | P2-2にTraining Copy commit SHA / repository-specific copy mechanicsがCommon学習内容として強く入る | Git/VCS semantics・diff safetyをCoreに残し、Training Copyの具体操作・exact SHA / copy mechanicsをReferenceへ分離する |
| `CUR-4A-005` | P1 | `fix_now` | P2-8はCommon completionをbounded Web CIと宣言する一方、学習目標・演習シナリオ・記録成果物にNative / multi-platform / full deliveryの要求が混在する | Common Required artifact / evaluationをbounded Web CIへ限定し、Native / iOS / multi-platform / full CDを明示的なspecialization / advanced branchへ分離する |
| `CUR-4A-006` | P2 | `fix_now` | learner-facing material内で一般語の日本語と英語が混在する。P1-5では `Learning Goal` / `Expected Product Behavior` / `Alternative Design` / `Failure Analysis` / `Exercise` / `Completion Evidence` 等を確認 | §11のTerminology Decision Tableに従い、一般learner-facing語を日本語中心へ揃え、Tool/API/code/ID等は保持する |
| `CUR-4A-007` | P2 | `fix_now` | P1-2等の「確認問題」は問いを提示するが、learner自身が正誤を判断するanswer criterion / recoveryへの接続が弱い。旧Curriculum Validity Reviewのself-study Findingとも整合 | 全Learner Required / selected specializationを監査し、必要箇所へ自己確認方法・期待する判断基準・Recovery・次の行動を追加する |

### 9.2 Carry-forward candidates requiring Current State revalidation

旧Audit / Master Plan由来の次の論点は、Pre-change auditでCurrent Stateを確認してからFinding化する。未確認のまま `fix_now` としない。

- internal Lessonが短すぎ、独立学習単位として目的・説明・Practice・到達確認を持たない箇所
- P1-2のCart normal/boundary CoreとPayment/status/refund/async Extension境界
- P1-3のauth State/Role Coreとmulti-role/refresh等Extension境界
- P1-4のspec / risk → test design Coreの説明深度
- P1-6のtest design artifact / trace Coreとformal suite detail Reference境界
- P1-9のcross-cutting improvement Commonとbroader regression identification Advanced境界
- P2-1の一般開発プロセスCoreとrepository-specific operations Reference境界
- P2-3のJS/TS minimum logic Coreとadvanced language feature Extension境界
- P2-4のNode/runtime/package basics Coreとrepo-specific pnpm scripts Reference境界
- P2-5のPlaywright basics Coreとadvanced config Extension境界
- P2-7のGate / Artifact / fail-closed Coreとvendor / production deployment detail Advanced / Reference境界
- Lesson間の説明重複、hidden prerequisite、navigation断絶
- Test Case ID / Evidence / Artifact等のcanonical contractとの表記不整合

### 9.3 Severity rule

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

| ID | Target | Observation | Disposition | Curriculum impact | Follow-up |
| --- | --- | --- | --- | --- | --- |
| `SPEC-4A-xxx` | path / heading | concrete observation | one of four dispositions | linked CUR finding or none | action |

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

---

## 12. Implementation tasks

### Task 0 — Baseline / branch integrity

1. branchが最新PR #103 merge後の `main` をbaseにしていることを確認する。
2. 実装開始前に `git diff main...HEAD` がchild Planのみであることを確認する。
3. Master Plan / PR #103 / Issue #72 のCurrent statusを再確認する。
4. PR 4A以外の進行中変更を混入させない。

**Evidence**

- base SHA
- initial diff summary

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

#### Specification audit

§8.5のbounded text-contract観点だけを全件確認する。

#### Plan finalization

- §8 stateを `audited` へ更新
- §9 actual Findingを確定
- §10 actual Specification Findingを記録
- §11 terminology tableを確定
- blocker有無を明記

**Stop**: Task 1完了前にTask 2以降へ進まない。

### Task 2 — Stabilize learner route and classification wording

Primary targets:

- `README.md`
- `00_learning-design.md`
- 必要な各Lesson intro / navigation

Actions:

1. Common / Native specialization / Extension / Referenceのlearner-facing定義を一意にする。
2. P1 / P2のskip / branch / rejoinを、Top-levelだけでなく実際のLesson導線でも矛盾なく辿れるようにする。
3. Common prerequisiteにspecialization / Extension / Referenceを要求する表現を除去する。
4. classification自体は新しいレイヤーを追加せず、既存4区分で表現する。

### Task 3 — Remediate Part 1 learning experience

Master Planの固定境界に従う。

- P1-1: route / framework = Core
- P1-2: Cart normal / boundary = Core、product / payment / status / refund / async variants = Extension
- P1-3: auth State / Role = Core、multi-role / refresh / additional expansion = Extension
- P1-4: spec / risk → test design = Core
- P1-5: Cart E2E + boundary + mobile = Core、payment / cross-role / broad failure diagnosis = Extension
- P1-6: test design artifact + trace = Core、full formal suite detail = Reference
- P1-7: Native entry + one Maestro flow = Native specialization
- P1-8: Playwright maintainability = Common、Native maintainability = Native specialization / Extension
- P1-9: cross-cutting improvement = Common、broader regression identification = Advanced

各Lessonで、必要に応じて次を明示する。

- 開始条件
- 何を学ぶか
- なぜ必要か
- 最小演習
- 自己確認方法
- 失敗時Recovery
- 完了条件
- 次のLesson / branch

内容を増やすこと自体を目的にしない。既存説明が十分なら構造だけ整える。

### Task 4 — Remediate Part 2 learning experience

Master Planの固定境界に従う。

- P2-1: software development / change flow概念 = Core、repo-specific operations = Reference
- P2-2: VCS semantics / diff safety = Core、Training Copy exact SHA / copy mechanics = Reference
- P2-3: JS / TS minimum logic = Core、advanced language = Extension
- P2-4: Node / runtime / package basics = Core、repo-specific pnpm script detail = Reference
- P2-5: Playwright basics = Core、advanced config = Extension
- P2-6: Native / Maestro = Native specialization
- P2-7: Gate / Artifact / fail-closed = Core、vendor / production deployment detail = Advanced / Reference
- P2-8: Web CI / Gate / Artifact / Failure reasoning = Common Capstone、Native / iOS / full CD = specialization / Advanced

特にP2-8では、Common Required artifacts / evaluation / completionがNative設計を要求しないように揃える。

### Task 5 — Migrate Instructor Reference content

1. `03_instructor-reference.md` の各sectionを分類する。
   - learner-facing learning content
   - learner-facing self-check / Recovery
   - learner-facing evaluation criterion
   - environment / account / permission / device support
   - repository / training-copy / infrastructure / toolchain support
2. learner-facingに必要なものを対応するLesson / Rubric / public referenceへ移す。
3. 同じ情報をInstructor Referenceへ重複保持しない。
4. 最終的なInstructor Referenceは受講内容外支援へ限定する。
5. PR3のtransition noticeは、移行後の恒久責務表現へ整理する。

**Do not**: learner-facing情報を移す前に削除する。

### Task 6 — Apply terminology and editorial normalization

§11に従い、learner-facing materialを横断修正する。

Priority:

1. 学習構造heading
2. Common / specialization / Extension / Reference表記
3. self-study / completion / evidence用語
4. Test Case / Scenario / Flow等の曖昧な省略
5. 同一概念の日本語・英語混在

P3 cleanupは変更箇所周辺に限定する。

### Task 7 — Complete self-study loop and add reusable review checklist

Learner Required path と選択したspecializationについて、必要箇所へ次を補う。

- prerequisite / start gate
- self-check
- expected judgment / answer criteria
- Recovery
- completion criteria
- next action

新規追加:

- `docs/reference/curriculum-self-study-review.md`

Checklistに含める観点:

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

Checklistには個別レビューのPASS/FAIL記録欄や履歴を持たせない。

### Task 8 — Minimal validator / contract protection if necessary

Curriculum修正で既存canonical contractのregression guardが必要な場合だけ実施する。

Candidate examples:

- Common routeからP1-7 / P2-6をRequiredへ戻すregressionの防止
- Instructor ReferenceをLearner Required pathと誤認させる契約の防止
- canonical Test Case ID grammar等、既存contractと教材文言の再不整合防止

ただし新しい自然言語headingすべてを固定するcontract testは作らない。

### Task 9 — Validation / manual cross-check

Automated:

```bash
pnpm format:check
pnpm lint:markdown
pnpm validate:curriculum
pnpm test:contracts
pnpm typecheck
git diff --check
```

Manual:

- Common learnerがNative specialization未受講でP1 / P2 Common completionへ到達できる
- Native specialization learnerがbranch / prerequisite / rejoinを一意に辿れる
- Common lessonが後続のspecialization / Extension / Referenceをhidden prerequisiteにしていない
- learner-facing materialだけで演習判断・自己確認・Recovery・完了判定ができる
- Instructor Referenceが受講内容外supportだけになっている
- Core / Extension / Reference / specialization境界がLesson本文・演習・completion・evaluationで一致する
- Part 2 Common Capstoneがbounded Web CIで成立する
- `docs/spec/**` にPR 4A差分がない
- Specification Finding dispositionがMaster Plan規則に従う
- terminologyが§11に従い、code / command / ID / official termを破壊していない
- checklistのcommand / Artifact / Environment観点がCurrent Training入口と矛盾しない
- PR5のTraining implementationを前倒ししていない

### Task 10 — Final review / PR preparation / tracker update

1. `git diff main...HEAD` を全件レビューする。
2. Finding registerの `fix_now` が全て解消済みか確認する。
3. `defer` がMaster Plan Goal / DoDを破壊していないか確認する。
4. Specification Findingのうち `PR 4B` 件数を確定する。
5. `PR 4B = 0` の場合はIssue #72へ `Not required` と反映できる状態にする。
6. `PR 4B >= 1` の場合は、PR 4Aへ実変更を混ぜず、merge後のfollow-upとして明記する。
7. Issue #72へ child Plan / PR / statusを反映する。
8. PR descriptionにscope / non-goal / validation / remaining follow-upを記載する。

---

## 13. Stop conditions / escalation rules

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

---

## 14. Definition of Done

PR 4Aは次をすべて満たしたときのみ完了とする。

### Audit

- §8全対象を監査済み
- Curriculum Finding registerがCurrent Stateに基づき確定
- 実際のSpecification Findingが必要なものだけ記録されている
- Terminology Decision Tableが確定している

### Curriculum

- P0 / P1 `fix_now` が全て解消済み、またはMaster Plan規則に沿う明示blockerとして扱われている
- 必要なbounded P2が解消済み
- Common learnerがNative / Extension / ReferenceなしでCommon routeを完了できる
- selected specialization learnerがlearner-facing materialだけで開始・演習・自己確認・完了・rejoinできる
- internal Lessonが独立学習単位として成立するか、前後へ統合されている
- learning goal → explanation → practice / exercise → self-check → completion が成立する
- Instructor Referenceが受講内容外supportへ限定される
- learner-facing一般語が日本語中心で一貫する
- code / Tool / API / ID / machine contractは意味を壊さず保持される

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
- `pnpm typecheck` PASS
- `git diff --check` PASS
- §12 Task 9 manual cross-check PASS

### Scope

- Product behavior変更なし
- PR5 scope前倒しなし
- Spec実変更なし
- unrelated refactor / cleanupなし

---

## 15. Review checklist for this Plan before implementation

Plan reviewでは、実装の細部より先に次を反証する。

1. Master Plan §16のPrimary ownerを漏らしていないか。
2. PR3で確定したCommon / Native contractを再設計していないか。
3. 全文監査と全件修正を混同していないか。
4. P2 / P3を無制限にscopeへ取り込む余地がないか。
5. PR 4BとPR 4Aの変更面が混ざっていないか。
6. Specification conformance auditへscope creepしていないか。
7. Instructor Referenceから情報を削除するだけになっていないか。
8. self-study改善が「説明文を増やす」だけになっていないか。
9. Common learnerにNative / Training Copy / production deployment等のhidden prerequisiteを残していないか。
10. terminology統一でmachine contract / code / UI copyを壊す余地がないか。
11. validator / contract testを過剰に増やす設計になっていないか。
12. PR5のTraining implementationを前倒ししていないか。
13. stop conditionが実際に実装停止へ使える具体性を持つか。
14. DoDが自動Validationだけでなくlearner pathのmanual contradiction checkを含むか。
15. PR 4A完了後にPR 4B要否を一意に判断できるか。

---

## 16. Initial execution order

```text
Task 0  Baseline
  ↓
Task 1  Full Pre-change audit + Plan finalization
  ↓
[Implementation gate]
  ↓
Task 2  Route / classification
  ↓
Task 3  Part 1 remediation
  ↓
Task 4  Part 2 remediation
  ↓
Task 5  Instructor Reference migration
  ↓
Task 6  Terminology normalization
  ↓
Task 7  Self-study loop + reusable checklist
  ↓
Task 8  Minimal contract protection (only if needed)
  ↓
Task 9  Automated + manual validation
  ↓
Task 10 Final review / PR / Issue #72 update
```

Task 3〜7は実装上同一fileを複数回触る場合があるため、commit単位を機械的にTaskへ1:1対応させる必要はない。ただし、Finding → change → validation の追跡可能性は維持する。

---

## 17. Expected outcome before implementation starts

次のレビュー時点では、少なくとも以下が揃っていることを期待する。

- branch / baseが正しい
- child PlanがRepositoryに保存されている
- initial Current State findingsが具体化されている
- Pre-change audit coverageが明示されている
- Terminology Decision Tableが存在する
- scope / non-goal / PR 4B split / stop conditionsが明示されている
- **ただし、Task 1の全文監査が完了するまでは implementation-ready と判定しない**

この状態でPlanを反証レビューし、問題がなければPre-change auditを完遂してFinding registerを確定する。その後にのみCurriculum remediation implementationへ進む。
