# PR 4A child Plan: Curriculum Core / Extension / Reference / Self-study remediation

## Status

- 状態: **Implementation complete / Final validation and delivery pending**
- 実装開始: **2026-09-05 15:00 JST**
- base: `main` at `f8b50b7678b6fe669bd0c98286d9b9d91176f521`
- 作業branch: `docs/pr4a-curriculum-self-study-remediation-clean`
- 本PlanはPR 4Aの実装判断SSOTとする。
- Pre-change auditのHard Gateを満たすまでCurriculum / Referenceの実装変更を開始しない。
- 旧PR #115の教材実装・review correctionは引き継がない。必要な知見だけを本Planの監査候補として利用し、Current `main`へ再照合してから実装する。

## Goal

Master Plan §16のPR 4Aを実施し、PR #103で固定されたDecision B / Competency / Assessment Contractを維持したまま、Learner Required pathとlearner-facing Native specializationの学習体験・自己学習品質をboundedに改善する。

Issue #98 H98-1〜H98-4は**完了済みの監査入力**として扱う。Issue #98専用の教材・報告・チェックリスト・SSOTは作らず、必要な観点だけを既存Curriculum Finding / learner-facing material / self-study checklistへ統合する。

成果物は次を満たす。

- Common CoreがNative specialization / Extension / Referenceを暗黙前提にせず完了できる。
- Native specializationを選択するLearnerは、開始条件、branch、skip、rejoin、Evidence、Recoveryをlearner-facing materialだけで判断できる。
- Learnerが教材だけで、学習目標 → 説明 → Exercise / Practice → Evidence → Self-check → Recovery → Completion → Next actionを判断できる。
- Repository-required assetとLearner Required pathを混同しない。
- Instructor Referenceは環境・権限・端末・Training Copy・Infrastructure / Toolchainのsupport-only assetとする。
- 実装は必要最小限とし、教材全面rewrite、不要な構造変更、文章量を増やすだけの変更を行わない。

## Fixed decisions inherited from Master Plan / PR #103

### Competency / route

- target learnerはentry-levelの汎用Test Automation Engineer。Common CoreはWeb中心で成立する。
- Part 1 Common completion: `C01〜C07 + C09〜C10` bounded Level 2。
- Part 2 / Final Common completion: `C01〜C07 + C09〜C12` bounded Level 2。
- `C08`、Physical Android、Native automation / Native CIはNative specialization。Common completionには要求しない。
- Part 1 Common route: `P1-6 → P1-8 → P1-9`。
- Part 1 Native route: `P1-6 → P1-7 → P1-8 → P1-9`。
- Part 2 Common route: `P2-5 → P2-7 → P2-8`。
- Part 2 Native route: `P2-5 → P2-6 → P2-7 → P2-8`。
- Commonで前提にしてよいのはentry profileと先行Common Requiredだけ。specialization / Extension / Reference / 教材外経験を隠れた前提にしない。

### Evidence / asset boundary

- C08 Minimum Evidenceはlearner-authored Native exercise diff + successful Maestro execution artifact。
- Training baseline / stock flow / Repository-required assetの存在だけでlearner competencyを満たしたことにしない。
- Learner-facing materialが学習内容、Exercise、Self-check、learning Recovery、Completion、evaluationの正本。
- Instructor / 運営は環境、権限、端末、演習Repository / Training Copy、Infrastructure / Toolchainを支援してよい。
- `03_instructor-reference.md`はRepository-required support assetであり、Learner Required completionの正本ではない。
- `docs/spec/**`がNormative Oracle。Product behavior、Formal Test Strategy、Training runner / workflow / Artifact contractはPR 4Aで変更しない。

### Protected surfaces / no-change invariants

以下はPre-change auditで実不整合を確認しない限り再設計しない。

- `02_competency-rubric.md`のPR #103 competency / Minimum Evidence contract
- `scripts/validate-curriculum.ts`の既存required-file contract
- `tests/contracts/training-curriculum.test.ts`のPR #103 invariant
- Native baseline / Product / `docs/spec/**` behavior contract
- Optional Agentic QA / Legacy Capstoneの既存non-required classification

「正しいので変更しない」ものをFindingとして水増ししない。

## Scope

### In scope

- Learner Required Commonとlearner-facing Native specializationのfile / internal Lesson監査とbounded remediation
- Core / Extension / Reference / specializationの境界整理
- 学習フロー、前提知識、Self-check、Recovery、Completion、Next actionの自己完結性
- 確認問題をLearner自身で自己採点できる最低チェックポイント
- Instructor Reference内のlearner-facing情報の仕分け・移行
- `/guide`、Seed metadata、Test Control protocol、static address dictionary、Workbook / validator等の既存SSOTへの到達案内
- Issue #98 H98-1〜H98-4のboundedなCurriculum取り込み
- `docs/reference/curriculum-self-study-review.md`の再利用可能checklist
- `docs/spec/**`のGit-tracked Markdown / text contractに対するterminology / wording / internal consistency / semantic safety audit。PR 4Aでは実変更しない
- 監査結果から得られた将来も安定する最小のlanguage / terminology ruleを既存READMEまたは`00_learning-design.md`へ反映する

### Out of scope

- Product behavior、Seed Data、Test Clock、Test Control protocol、address lookupの変更
- `docs/spec/**`の実変更、PR 4B実装、Specification clarificationの推測解消
- Security Curriculum全般、XSS専門Lesson、脆弱性判定DB
- Formal Test Strategyの再設計
- Training runner / workflow / Artifact contract、PR 5の実行基盤
- Curriculum全面rewrite、P2/P3の無制限cleanup
- 新LMS、DB、Scoring基盤、Finding DB、監査台帳、第三SSOT、新Glossary
- ラベル改善で足りる場合のrename / directory migration
- 旧PR #115のcommit / implementationのcherry-pick

## Simplicity principles

実装量を増やさないため、次を固定する。

1. **1 file ≒ 1 remediation pass**を基本とし、navigation / terminology / self-study等を可能な限り同じpassで閉じる。
2. Root文書はconfirmed Finding、Instructor migration、またはstable terminology ruleがある場合だけ変更する。
3. 既存Lesson構造が成立している場合、統一テンプレートへ強制しない。
4. 見出しを残すためだけの説明追加、文章量を増やすだけの変更は禁止する。
5. Practice Volumeの件数・technique数は練習量の目安として残してよいが、Rubricが要求しない限り単独のRequired completion条件にしない。
6. Current Repository固有のSHA、Job名、API Level、allowlist、Workflow topology等は学習目的に必要な場合だけReferenceとして残し、暗記をCompletionにしない。
7. long-form Answer Keyを新設しない。確認問題はLesson単位の最低Self-checkポイントで自己採点可能にする。
8. prose品質をvalidator / contract testでfreezeしない。
9. file rename / directory migrationよりclassification label / navigation修正を優先する。
10. Product / Spec / Training基盤を教材都合で変更しない。
11. bounded fixで足りる箇所に新しい抽象化・恒久管理レイヤーを追加しない。

## Task 0 — Baseline / freshness check

実装前にread-onlyで確認する。

- Current `main` SHAを確認し、本Planのbaseとの差分がある場合はrelevant changeだけ確認する。
- PR #103 fixed contractがCurrent `main`で維持されていることを確認する。
- Curriculum / Spec / validator / contract / Training入口に関係する`main`更新だけ再確認する。
- 無関係な更新だけを理由にfull auditをやり直さない。
- 実装対象外の差分をPR 4Aへ取り込まない。

## Task 1 — Pre-change audit（Hard Gate / 実装禁止）

Task 1完了までCurriculum / Referenceの実装変更を行わない。

### 1. Curriculum audit inventory

Current `validate:curriculum`のrequired file listを母集団として確認し、次へ分類する。

- Learner Required Common
- learner-facing Native specialization
- Repository-required support asset

`03_instructor-reference.md`をLearner Requiredとして扱わない。

Optional Agentic QA / Legacy Capstoneは、Required navigationへ誤認されないかだけ確認する。

Learner Required path、selected specialization、Instructor Referenceは全文を確認し、必要に応じて次を見る。

- start condition / prerequisite
- goal / explanation depth
- Exercise / Practice
- Evidence
- confirmation question / Self-check
- Recovery
- Completion
- Next action
- Common / specialization / Extension / Reference boundary
- terminology
- internal link / command / path / identifier

### 2. Specification audit inventory

- `git ls-files docs/spec`からGit-tracked fileを取得する。
- Markdown / text contractだけをaudit母集団にする。
- image / binary / generated visual assetは母集団外とする。
- Task 1完了時に `audited X / total X` を本Planへ記録する。
- 問題がないfileごとの`no_change` Findingを作らない。
- 全Product behaviorのCurrent implementation conformance auditへ広げない。

### 3. Finding finalization

実装前に、各Curriculum Findingを次の列で確定する。

| Field | Requirement |
| --- | --- |
| ID | `CUR-4A-NNN` |
| Severity | `P0` / `P1` / `P2` / `P3` |
| Disposition | `fix_now` / `defer` |
| Primary owner | Task / file ownerを1つだけ指定 |
| Exact target | exact `path` + heading / section |
| Current state / problem / impact | 実装理由を簡潔に記録 |
| Minimum fix | 実装者が再設計せず変更できる粒度 |
| Related contract | Master Plan / PR #103 / Rubric等 |
| Validation | 何を確認すればresolvedか |
| State | `pending` / `blocked`。実装後に`resolved`へ更新 |

`fix_now`は必ずfiniteなexact targetへ落とす。「不足Lessonを探して直す」「残っていれば直す」のような再監査型指示を実装入力にしない。

Severity / DispositionはMaster Plan §5.8に従う。

- P0 / P1: blocker。未決Specification clarification等に依存する場合は推測修正しない。
- P2: Goal / DoDへ直接必要でboundedなものだけ`fix_now`。それ以外は`defer`。
- P3: 実際に変更する周辺の局所修正だけ`fix_now`。

### 4. Instructor migration map

`03_instructor-reference.md`のsectionを次へ分類する。

- learner-facing learning content → 対象Lesson / Learning Design / README
- learner-facing Self-check / Recovery → 対象Lesson
- learner evaluation criteria → Rubric / 対象Lesson
- environment / account / permission / device support → Instructor Referenceに残す
- Repository / Training Copy / Infrastructure / Toolchain support → Instructor Referenceまたは既存public runbook

Learner-facing正本を先に確保してからInstructor Reference側を削除 / 参照化する。恒久的な重複を残さない。

### 5. Terminology Decision Table

新Glossaryは作らない。実際に判断が必要な語だけを本Planへ記録する。

| Category | Rule |
| --- | --- |
| 一般learner-facing説明 | 日本語中心 |
| Tool / Product / API / command / path / identifier | 公式literalを維持 |
| Locator / Fixture等の公式用語 | 必要に応じて初出で日本語説明 |
| Common Core / Native specialization / Extension / Reference | classification tokenを維持し意味を説明 |
| BR / AC / ID grammar / machine-consumed heading | canonical literalを維持 |
| UI copy | Product上のliteralが判断に必要な場合はそのまま使用 |

将来も安定する最小ルールだけを既存READMEまたは`00_learning-design.md`へ残す。

## Preliminary audit candidates

以下は旧レビューで確認した知見をCurrent `main`へ再照合するための**監査候補**であり、未確認のまま実装しない。Task 1で確認後、必要なものだけ前節のfinal Finding形式へ確定する。

| Candidate | Target / expected boundary |
| --- | --- |
| Self-study answerability | Learner Required / selected specializationの確認問題・Self-check・Recovery・Completion。知識問題は最低回答要素、Trade-off問題は最低考慮事項と許容理由を持つ |
| P1-2 / P2-1 learning flow | Next actionがExercise / confirmation / Self-check / Completionより前へ置かれていない |
| Practice Volume | `01_spreadsheet-test-design.md`、P1-3、P1-4、P1-5。件数・technique数を単独Required completionにしない |
| P1-4 entry bridge | JS/TS bridge、Playwright concept、`test` / `page` / Locator / Action / Assertionをentry learner向けに説明 |
| P1-5 boundary | Core=`Cart / explicit reset / representative Boundary / representative Mobile`、Extension=`Payment / Cross-role / Internal Inspection / Accessibility execution` |
| P1-6 failure analysis | Bug / UX / Suggestion / 未確定、Security成立条件、Evidence整合をboundedに補足。既存technical classificationを置換しない |
| P1-7 Native specialization | Physical Android、learner-authored Maestro / stable ID / Test Control / EvidenceをRequired。volatile値・Current platform比較はSSOT / Referenceへ |
| P1-8 maintainability | Common=`real Playwright maintainability issue 1件 + minimal improvement 1件`。Playwright-onlyで成立 |
| P1-9 capstone | concise Web Common。Native specialization EvidenceとBaseline / learner-authored Evidenceを分離 |
| P2-2 Git | Branch / Diff / CommitをCore。Training Copy exact SHA / allowlist / copy mechanicsはInstructor support / Reference |
| P2-3 PR / review | Fork / Remote / Push / PR + material diff self-reviewをCommon。第三者Review / provisioning /件数quotaをRequiredにしない |
| P2-4 CI basics | Trigger / Job / Failure / least privilegeをCore。allowlist / parser / Action pin等repo detailをReference |
| P2-5 Playwright CI | Training Web CI / Artifact / Failure stage・EvidenceをCommon。配置設計はP2-7、Current topologyはReference |
| P2-6 Native CI | learner-authored Native CI、工程別Failure、Artifact、Cost判断をspecialization Required。repo detailはReference |
| P2-7 Quality Gate | Common=`Gate / Artifact / fail-closed`。Level 3改善提案、vendor / production / Native detailはAdvanced / Reference |
| P2-8 final capstone | Common Required / Native specialization / Advanced-Referenceへ成果物を分類。Common=`Web CI / Gate / Artifact / Failure reasoning` |
| Risk ID example | canonical `RISK-<DOMAIN>-NNN`と教材例の整合 |
| Instructor Reference | learner learning / assessment / Recoveryをsupport-only assetへ残さない |
| reviewer checklist | 個別review result / PASS history / Evidence ledgerを持たない再利用可能criteriaだけを追加 |

## Task 1 audit result / final Curriculum Findings

### Audit coverage

- `validate:curriculum`のrequired file listは22件。Learner Required Common 19件、learner-facing Native specialization 2件（P1-7 / P2-6）、Repository-required support asset 1件（03 Instructor Reference）として全文確認した。
- Optional `part1/09_specification-agentic-qa.md` とLegacy Alias `part1/10_part1-capstone.md`も確認した。Required Navigation、Rubric、Validatorがcanonical `part1/09_part1-capstone.md`だけを参照する状態に問題はない。
- `docs/spec`のGit-tracked Markdown / textは `audited 22 / total 22`。画像・binary・generated visual assetは母集団外とした。Curriculumから参照するBR / AC、State / Scenario、Executable Canonical Sourceの到達先を確認した。
- PR #103のDecision B / Competency / Assessment Contract、Current `main`、本PlanのScopeに照合し、Current Product Behavior、PR 5、Security Curriculum、Training runner / workflow / Artifact contractの変更Findingは確定していない。
- P1-4のJS / TypeScript bridge、Playwrightの`test` / `page` / Locator / Action / Assertionの説明はentry learner向けに十分であり、bridge内容そのものの追加Findingは作成しない。

### Final Finding list

| ID | Severity | Disposition | Primary owner | Exact target | Current state / problem / impact | Minimum fix | Related contract | Validation | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CUR-4A-001 | P2 | fix_now | Task 2 / `README.md` | `## 全体構成` / `### 共通` | Instructor ReferenceがCommon navigationの4番目にあり、support assetがLearner Required pathと誤認され得る。 | Common listから外し、support assetとして別見出しで1回だけ案内する。 | PR #103のLearner Required / support asset境界 | Common routeに03が必須として現れず、support linkだけが残ることをmanual確認する。 | resolved |
| CUR-4A-002 | P2 | fix_now | Task 2 / `00_learning-design.md` | `## 用語の使い分け` | 用語表はあるが、日本語中心・literal維持・classification token維持の安定ルールが単独で明示されていない。 | 同じ節の末尾へPlanの最小language ruleを追加し、新Glossaryは作らない。 | Plan §5 Terminology Decision Table | 追加ルールと既存用語表が矛盾せず、literalが保持されることを確認する。 | resolved |
| CUR-4A-003 | P1 | fix_now | Task 3 / `01_spreadsheet-test-design.md` | `## 設計ビュー` / `### \`04_テストケース\``、`## 完了条件` | 例の`RISK-CART-01`がcanonical `RISK-<DOMAIN>-NNN`と不整合で、ID traceabilityを誤って学ぶ可能性がある。完了条件の件数も判断品質と混在している。 | Risk例を`RISK-CART-001`へ局所修正し、件数をPractice Volumeの目安へ移し、Spec → Risk → Case → Layer / Tool → Evidenceの品質判定とself-checkを追加する。 | Training Workbook ID grammar、Master Plan §5.8 / §5.9 | `training/workbook`とのID整合、traceability、self-check / Recoveryを確認する。 | resolved |
| CUR-4A-004 | P1 | fix_now | Task 3 / P1-1 `01_test-automation-foundations.md` | `## 確認問題`、`## 完了条件` | 知識問題に短い回答要素・理由がなく、Environment blockと学習上の未理解から復帰する手順もない。 | 問題ごとの最低回答要素、学習上のRecovery、完了後のP1-2へのNext actionを追加する。候補件数は理由付き判断のEvidenceとして扱う。 | Master Plan §5.9、Common prior-knowledge rule | Instructorの非公開知識なしに回答を自己判定し、P1-2へ進めることをmanual確認する。 | resolved |
| CUR-4A-005 | P1 | fix_now | Task 3 / P1-2 `02_scenario-shop-analysis.md` | `## Lesson 6: \`/guide\` とScenario Metadata`、`## 確認問題`、`## 完了条件` | Role / State / Journeyは説明されるが、Test Clock、Seed / Reset、address lookup、Test Controlの既存SSOTへ戻る導線と、回答後のRecoveryが有限でない。 | 値を複製せず、`docs/spec/state-and-scenarios.md`、`src/seeds/metadata.ts`、既存UI / seed SSOTへの参照経路を追加し、問題の最低回答要素・Recovery・P1-3へのNext actionを追加する。 | H98-1、PR #103のSpec / Learner evidence境界 | 参照先が存在し、値の第三SSOTを作らず、Scenario / Reset / dependencyを自己確認できることを確認する。 | resolved |
| CUR-4A-006 | P1 | fix_now | Task 3 / P1-3 `03_test-design-and-automation-selection.md` | `## ハンズオン1`、`## 確認問題`、`## 完了条件` | `10件以上`と`3技法以上`がRequired completionとして残り、Risk / Spec適合・選択理由より数を優先し得る。 | 10件・3技法をPractice Volumeの目安へ移し、選択した技法がRisk / BR / ACへ適合し、Layer / Tool /理由を説明できることをCore completionへする。最低回答要素とRecoveryを追加する。 | Master Plan §5.8、PR #103 C06 | 件数を満たさなくても品質条件で自己判定でき、NativeをCommonの暗黙前提にしないことを確認する。 | resolved |
| CUR-4A-007 | P1 | fix_now | Task 3 / P1-4 `04_playwright-foundations.md` | `## 確認問題`、`## 完了条件` | JS / TypeScript bridgeはあるが、`2本以上`がcompletionに見え、回答要素・Syntax / Runtime / Assertion failureからのRecoveryが明示されていない。 | 2本はPractice Volumeの目安へ移し、learner-authored exercise・semantic Locator・状態AssertionをCore evidenceとする。問題の最低回答要素、エラー種別別Recovery、P1-5へのNext actionを追加する。 | Master Plan §5.9、PR #103 C07 | 1件の意味あるTraining exerciseでCore判定でき、Formal Suiteへ混入しないことを確認する。 | resolved |
| CUR-4A-008 | P1 | fix_now | Task 3 / P1-5 `05_playwright-e2e-practice.md` | `## Lesson 4`〜`## Lesson 8`、`## ハンズオン1`〜`## 完了条件` | Payment、Cross-role、Internal Inspection、AccessibilityがCoreと同列で、PaymentまたはRole横断がcompletionに入り、Common learnerがExtensionを必須と誤認し得る。 | CoreをCart / explicit reset / representative Boundary / representative Mobileに限定し、Payment / Cross-role / Internal Inspection / Accessibility executionをExtensionと明示する。3 / 5件はPractice Volumeの目安へ移し、self-check / Recovery / P1-6へのNext actionを追加する。 | Master Plan §16、PR #103 C07 / C09、Common boundary | Common routeがCoreだけで成立し、Extensionを選択しなくてもcompletionできることをmanual確認する。 | resolved |
| CUR-4A-009 | P1 | fix_now | Task 3 / P1-6 `06_execution-and-failure-analysis.md` | `## Lesson 2: Failureを分類する`、`## ハンズオン4: Failure分析メモ`、`## 確認問題`、`## 完了条件` | technical failure分類はあるが、Bug / UX / Suggestion / 未確定、Security成立条件、対象・操作・事象・Evidenceの整合が判断基準へ接続されていない。意図的Failureだけでmeaningful diagnosisを満たしたと誤認し得る。 | 既存technical分類を残したままOutcome分類、入力→保存→escape表示→HTML解釈→実行 / executable sinkの最小境界、Evidence不足時の断定回避を追加し、原因仮説・Evidence整合・最小修正・再実行をcompletionへ接続する。 | H98-2〜H98-4、Master Plan §5.9 | Training Failure / Evidenceを使い、分類と断定範囲を自己判定できることを確認する。Security専門LessonやProduct変更を追加しない。 | resolved |
| CUR-4A-010 | P1 | fix_now | Task 3 / P1-7 `07_maestro-native-automation.md` | `## Lesson 6: 最初のMaestro Flow`、`## ハンズオン1`〜`## 完了条件` | specializationの入口とC08条件はあるが、learner-authored diffの対象、self-check / Recovery、Environment blockとlearning blockの分離が不足する。iOS / Current platform比較もcompletionへ混ざりやすい。 | Physical Androidで自分のFlow差分を作り、Stable UI Test ID / Test Control / Evidenceを確認する有限手順を追加する。Baseline / stockを代替にせず、iOS / volatile値はReference / SSOTへ分離し、問題の判定基準・Recovery・P1-8へのNext actionを追加する。重複する比較文1行は同じpassで除く。 | PR #103 C08、ADR-0022、H98-1 | `training/maestro/exercises/`のlearner-authored diffとAndroid execution artifact、skip / rejoin、iOS Build-only境界をmanual確認する。 | resolved |
| CUR-4A-011 | P1 | fix_now | Task 3 / P1-8 `08_test-management-and-maintainability.md` | `## ハンズオン1`〜`## 完了条件` | Common completionが保守問題3件以上と読め、Native / Maestro / CIの比較がPlaywright-only Commonの境界を曖昧にする。self-check / Recoveryもない。 | Commonを実在Playwright保守問題1件の診断 + 最小改善1件へする。Native / CIはExtension / Referenceへ明示し、POMを必須化しない。問題の最低回答要素、仮想仕様変更の未実装境界、P1-9へのNext actionを追加する。 | Master Plan §16、PR #103 C10 | Playwrightだけでcompletionでき、変更前Impact Analysisと最小改善のEvidenceを説明できることを確認する。 | resolved |
| CUR-4A-012 | P1 | fix_now | Task 3 / P1-9 `09_part1-capstone.md` | `## Core: Cart Journey`、`## Native specialization（選択時）`、`## 完了条件` | Common capstoneの完了条件にAndroid Build / RuntimeとiOS Build-onlyの保証差が入り、Native specializationのEvidenceとbaseline / Core Evidenceの境界が十分に分離されていない。 | Commonはconcise Web Cart Journey / Traceability / Failure reasoningへ限定し、Native Evidenceとbaselineを選択時の別判定へ置く。Core self-check、Recovery、Part 2移行へのNext actionを追加する。 | Master Plan §16、PR #103 C01〜C10、ADR-0022 | Nativeを選択しなくてもPart 1 Commonが成立し、Native選択時だけC08 Evidenceを自己判定できることをmanual確認する。 | resolved |
| CUR-4A-013 | P1 | fix_now | Task 3 / P2-1 `01_software-development-process.md` | `## 確認問題`、`## 完了条件` | 開発 / 変更フローの説明はあるが、回答の最低要素、Build / Test / Deployの区別からのRecovery、P2-2へのNext actionがない。 | 5問の最低回答要素、最初に戻る確認箇所、Environment blockと理解不足の区別、P2-2へのNext actionを追加する。 | Master Plan §5.9、PR #103 C09 | 変更からReleaseまでの図と判断理由を自己確認できることをmanual確認する。 | resolved |
| CUR-4A-014 | P1 | fix_now | Task 3 / P2-2 `02_git-version-control.md` | `## Part 1からの作業環境移行`、`### 移行時の安全な手順`、`## 完了条件` | Branch / Diff / CommitのCoreに対し、Training Copyのexact SHA / allowlist / copy mechanicsがLearner Required completionへ入り、provisioningを自力で用意することが隠れ前提になっている。 | Branch / Diff / Staging / CommitをCoreへ整理し、Training Copy exact SHA / allowlist / mechanicsはInstructor Reference / supportへ移す。必要なPart 1成果物の安全な引継ぎ意図は残し、回答要素・Recovery・P2-3へのNext actionを追加する。 | Master Plan §16、ADR-0014、PR #103 support asset境界 | Common completionがprepared Copyを利用してBranch / Diff / Commitを自己判定でき、Copy運用の詳細がRequiredでないことを確認する。 | resolved |
| CUR-4A-015 | P1 | fix_now | Task 3 / P2-3 `03_github-pull-request-review.md` | `## Lesson 6: PRとChecks`、`## ハンズオン3: Test PRをReviewする`、`## 完了条件` | Training Copy provisioningの詳細と第三者Review・最低3件がCommon completionへ混ざり、受講者が自分でmaterial diffをreviewできることより運用条件を優先し得る。 | Fork / Remote / Push / PRとmaterial diffのself-reviewをCommonへ残し、第三者Review・provisioning・件数quotaをRequiredから外す。Support参照を追加し、回答要素・Recovery・P2-4へのNext actionを追加する。 | Master Plan §16、PR #103 C11 | self-reviewだけでcompletionでき、PR説明へ変更・理由・Validation・Riskを記録できることをmanual確認する。 | resolved |
| CUR-4A-016 | P1 | fix_now | Task 3 / P2-4 `04_ci-github-actions.md` | `## 演習Workflowの境界`、`## Lesson 2: GitHub Actionsの構造`、`## 完了条件` | Trigger / Job / Failure / least privilegeのCoreに、allowlist / parser / Action pin / current workflow topologyのRepository detailとprovisioningが混在している。 | Core説明を抽象契約へ整理し、exact allowlist / parser / Action pin / Copy preparationはInstructor Referenceへ参照化する。Failure工程、Secret / permission境界のself-check・Recovery・P2-5へのNext actionを追加する。 | Master Plan §16、ADR-0014、PR #103 C12 | Core completionがrepo detail暗記なしで成立し、Training / Production境界とFailure工程を説明できることをmanual確認する。 | resolved |
| CUR-4A-017 | P1 | fix_now | Task 3 / P2-5 `05_playwright-ci.md` | `## Lesson 7: Smoke / Regression`、`## Lesson 10: Production Artifact Smoke`、`## ハンズオン3`、`## 完了条件` | Training Web CI / Artifact / Failure Evidenceに加え、Current CI topology、Production Smoke、PR / main / Nightly配置がCommon completionへ入り、P2-7やReferenceとの責務が重なる。 | Training WebのBuild / Browser / Artifact / Failure stageをCommonへ限定し、配置設計はP2-7、Current topology / Production Artifact SmokeはReference / Advancedへ移す。回答要素・Failure Recovery・P2-7へのNext actionを追加する。 | Master Plan §16、PR #103 C12、ADR-0014 | CommonがTraining Web CIとFailure Evidenceだけで成立し、Production / current topologyがRequiredでないことをmanual確認する。 | resolved |
| CUR-4A-018 | P1 | fix_now | Task 3 / P2-6 `06_native-ci-maestro.md` | `## 現在のRepositoryにおけるAndroid / iOS CIの位置づけ`、`## ハンズオン1`〜`## 完了条件` | Native specializationなのにCurrent formal job topologyの説明とbaseline実行が中心で、learner-authored Native CI / Failure / Artifact / Cost判断がMinimum Evidenceとして明示されない。 | selected specializationのLearner Requiredを、自分のbounded Training Native CI変更 + Android工程別Failure / Artifact + Cost判断へする。Current topology / iOS detailはReference / comparisonへ分け、self-check・Recoveryを追加する。 | Master Plan §16、PR #103 C08 / C12、ADR-0022 | P2-6をskip可能なCommon routeを維持し、選択時だけlearner-authored Native CI evidenceを自己判定できることをmanual確認する。 | resolved |
| CUR-4A-019 | P1 | fix_now | Task 3 / P2-7 `07_ci-cd-quality-gates.md` | `## Lesson 4: CIとCD`〜`## Lesson 12`、`## 完了条件` | Common completionがPreview / Production / Deploy後Smoke、Android / iOS差、CI/CD改善まで要求し、bounded Web CIのGate / Artifact / fail-closedを超えている。 | Common completionをGate / Artifact / fail-closedへ限定し、Preview / Production / vendor / Native / Level 3改善はAdvanced / Referenceへ明示する。回答要素・Gate failure Recovery・P2-8へのNext actionを追加する。 | Master Plan §16、PR #103 C12、ADR-0014 / 0022 | Common routeがWeb bounded Gate / Artifact / fail-closedで成立し、Native / deliveryを必須としないことをmanual確認する。 | resolved |
| CUR-4A-020 | P1 | fix_now | Task 3 / P2-8 `08_integration-design-capstone.md` | `## Phase 5`、`## Phase 8`、`## 記録する成果物`、`## Part 2完了条件` | Optional Native / full deliveryは本文で説明されるが、記録成果物と評価観点にCommon / specialization / Advanced-Referenceの分類が一貫していない。Common self-studyの判定入口もない。 | Common RequiredをWeb CI / Gate / Artifact / Failure reasoningへ明示し、Native specializationとAdvanced-Reference成果物を別区分へする。phaseごとのself-check、Recovery、DoD判定を追加する。 | Master Plan §16、PR #103 C12、ADR-0022 | Common設計だけでcompletionでき、Native / preview-prod deliveryを選択しない場合のskip / rejoinをmanual確認する。 | resolved |
| CUR-4A-021 | P1 | fix_now | Task 4 / `03_instructor-reference.md` | `## Public Reference`、`## Expected Contract`、`## Alternative Design`、`## Anti-pattern`、`## Facilitation`、`## Troubleshooting prompts`、`## Fresh Learner observation` | Learner learning、evaluation、Recovery、Current topologyがsupport asset内に重複し、Instructor Referenceがcompletion / judgmentの別SSOTになっている。 | learner-facing learning / self-check / completion / evaluationを各Lesson・Rubricへ移したうえで、Referenceをenvironment / account / permission / device / Training Copy / Repository provisioning / Infrastructure / Toolchain support-onlyへ整理する。既存validatorが要求する見出し語はsupport意味で保持する。 | Plan §4、PR #103 support boundary、ADR-0014 | Referenceにlearner answer / completion判定が残らず、support-only導線と既存asset contractが確認できることをmanual確認する。 | resolved |

All final findings are finite. There is no `find remaining` instruction. `CUR-4A-004`〜`CUR-4A-020`のself-study criteriaは、各対象文書の既存Question / Exercise / Completionに合わせた最小追記であり、全Lessonを同一templateへ書き換える指示ではない。

### Issue #98 handoff disposition

- H98-1（Test Clock / Seed / address / Test Control）はCUR-4A-005およびCUR-4A-010へ統合する。値は複製せず、既存SSOTへの到達経路だけを追加する。
- H98-2（Bug / UX / Suggestion / 未確定）はCUR-4A-009とTask 5 checklistへ統合する。
- H98-3（Security成立条件）はCUR-4A-009へ最小説明として統合する。Security専門教育、追加Finding DB、Product変更は行わない。
- H98-4（Evidenceと報告内容の整合）はCUR-4A-009、CUR-4A-012、Task 5 checklistへ統合する。専用Evidence台帳は作らない。

### Specification Finding disposition

`docs/spec` text contractについてSpecification Findingはなし。したがってSpecification clarification、Product implementation deviation、PR 4Bへのhandoffは発生していない。22件すべてで、Curriculum側から参照するNormative / Supporting / Executable Canonical Sourceの責務と、CurrentのBR / AC / State / Scenario / Native boundaryに判断を要する不整合は確認されなかった。

### Instructor migration map

| Current `03_instructor-reference.md` section | Disposition / destination |
| --- | --- |
| `Public Reference` / Expected Contractのlearner contract | Learner-facing route、`00_learning-design.md`、各対象Lesson、Rubricへ移す。Referenceには正本へのlinkとsupport boundaryだけを残す。 |
| `Alternative Design`のRisk / Layer / POM / Mobile / iOS判断 | P1-3、P1-5、P1-8、P2-7、P2-8のlearner-facing Core / Extension / Advanced-Referenceへ移す。Reference側はprovisioning / environment alternativeだけを残す。 |
| `Anti-pattern`の学習判断 | P1-1、P1-5、P1-6、P2-2〜P2-8のself-check / checklistへ移す。Reference側はSecret、Production Workflow、Formal asset混入など運用上の禁止だけを残す。 |
| `Facilitation` | 学習順序、Exercise、self-check、Recovery、Completionは各Learner Required文書へ移す。Instructor側は環境準備・支援時の境界だけを残す。 |
| `Troubleshooting prompts` | Environment / account / permission / device / Training Copy / Infrastructure / Toolchainのsupport playbookとして残す。学習内容の回答や評価基準は残さない。 |
| `Fresh Learner observation` | 受講者の回答を補う手順ではなく、Environment blockと教材不足を切り分ける運用支援メモへ縮約する。 |

### Confirmed terminology decision table

| Category | Confirmed rule |
| --- | --- |
| 一般learner-facing説明 | 日本語中心 |
| Tool / Product / API / command / path / identifier | 公式literalを維持 |
| Locator / Fixture等の公式用語 | 必要に応じて初出で日本語説明 |
| Common Core / Native specialization / Extension / Reference | classification tokenを維持し意味を説明 |
| BR / AC / ID grammar / machine-consumed heading | canonical literalを維持 |
| UI copy | Product上のliteralが判断に必要な場合はそのまま使用 |

### Hard Gate result

1. Task 0 baseline / freshness: satisfied。
2. Learner Required Common、selected specialization、Instructor Reference全文確認: satisfied。
3. `docs/spec` text contract coverage `audited 22 / total 22`: satisfied。
4. Curriculum Findingのfinal形式確定: satisfied。全21件にSeverity / Disposition / Primary owner / exact target / minimum fix / related contract / validation / Stateがある。
5. 全`fix_now`の実装入力がfinite: satisfied。
6. Specification FindingのDisposition: satisfied。該当なしを確認済み。
7. Instructor migration map: satisfied。
8. Terminology Decision Table: satisfied。
9. unresolved blockerと依存境界: satisfied。P0/P1 blockerはなく、CUR-4A-021完了後にTask 5へ進む。PR 5 / Security / Product / Spec clarificationはscope外。
10. bounded P2の再検討: satisfied。CUR-4A-001〜003をfix_nowとし、sizeだけを理由にdeferしていない。

Hard Gate: **PASS**。Task 2以降の実装へ進める。

### Issue #98 handoff candidates

| Input | PR 4A boundary |
| --- | --- |
| H98-1 Test Clock / Seed / address / Test Control | 値を複製せず既存SSOTへ到達させる |
| H98-2 Bug / UX / Suggestion / 未確定 | 新Finding DBを作らずlearner-facing判断として必要箇所へ統合 |
| H98-3 Security成立条件 | 入力→保存→escape表示→HTML解釈→実行 / executable sinkの差を最小説明。Security Curriculumへ拡張しない |
| H98-4 Evidenceと報告内容 | 対象・操作・事象・Evidenceの一致、Evidence不足時の断定回避。専用台帳を作らない |

## Specification Finding disposition

Specification Findingは実際に判断対象が見つかった場合だけ作成する。

- `Specification clarification`: Normative Specificationが曖昧・不足・複数解釈可能、またはProduct Decisionが必要。
- `Product implementation deviation`: Normative Specificationは明確だがCurrent implementationが異なる。SpecをObserved Behaviorへ合わせない。
- `PR 4B`: semantics-preservingでboundedなeditorial correctionが必要。
- `no_change`: 判断対象として記録価値があるが変更不要。問題のないfileを表す用途には使わない。

Specification FindingにはCurriculum用P0〜P3 severityを付けない。

## Hard Gate — Task 2以降へ進む条件

次をすべて満たすまで実装しない。

1. Task 0 baseline / freshness確認済み。
2. Learner Required Common、selected specialization、Instructor Referenceを全文確認済み。
3. `docs/spec/**` text contractを `audited X / total X` でcoverage確認済み。
4. Curriculum Findingがfinal Finding形式へ確定している。
5. 全`fix_now`がexact path + heading / section + Primary owner + minimum fix + validationまでfinite。
6. 実際に発生した全Specification FindingへDispositionがある。
7. Instructor migration mapが確定済み。
8. Terminology Decision Tableが確定済み。
9. unresolved blockerと依存Finding / file / Taskの境界が明示済み。
10. 必要なP2がboundedに実装できない場合、sizeだけを理由にdeferせずscopeを再検討済み。

P0/P1 blockerに依存するFinding / file / Taskだけ停止し、独立remediationは継続してよい。ただし未解決P0/P1が残る限りPR 4A全体をmerge-readyにしない。

## Task 2 — Root-level confirmed findings / migrations only

対象候補:

- `README.md`
- `00_learning_design.md`ではなくcanonical `00_learning-design.md`
- 必要な場合のみ`02_competency-rubric.md`

次の場合だけ変更する。

1. confirmed `fix_now`がroot fileをtargetにする。
2. Instructor migration mapの移動先である。
3. stable language / terminology ruleの保存先が必要。

PR #103 contractを一般的に書き直さない。

## Task 3 — Learner-facing curriculum remediation

final Findingに従い、対象fileを原則1回のpassで処理する。

### Entry / shared material

- `01_spreadsheet-test-design.md`
  - Risk → Test Case → Layer / Tool → Evidenceのtraceabilityを維持。
  - canonical Risk / Test Case ID grammarへ局所整合。
  - Practice VolumeをRequired completionへしない。
  - 必要なら確認問題へ最低Self-checkポイントを追加。

### Part 1 responsibility

- P1-1: automationの目的 / 限界 / automationしない判断。
- P1-2: Role / State / User Journey / Seed / Reset、既存SSOTへの到達。
- P1-3: technique数ではなくRisk / Specificationへの適合と選択理由。
- P1-4: JS/TS bridge、Playwright基本概念、Locator / Action / Assertion。
- P1-5: Core / Extension境界をMaster Planどおりにする。
- P1-6: meaningful failure diagnosisをCompletion Evidenceへ接続。H98-2〜4をboundedに統合。
- P1-7: Native specialization。Physical Android、learner-authored Maestro / Test Control / Evidence、skip / rejoin。
- P1-8: Playwright-only Common。実在保守問題1件の診断 + 最小改善1件。
- P1-9: concise Web Common Capstone。Native / baseline / learner-authored Evidenceを分離。

### Part 2 responsibility

- P2-1: development / change flowをCore。
- P2-2: Branch / Diff / CommitをCore。
- P2-3: Fork / Remote / Push / PR + material diff self-reviewをCommon。
- P2-4: Trigger / Job / Failure / least privilegeをCore。
- P2-5: Training Web CI / Artifact / Failure stage・EvidenceをCommon。
- P2-6: Native specialization。learner-authored Native CI / Failure / Artifact / Cost。
- P2-7: Gate / Artifact / fail-closedをCommon。
- P2-8: bounded Web CI / Gate / Artifact / Failure reasoning Common Capstone。

### Self-study implementation rule

必要な箇所だけ次を満たす。

- start condition
- goal / explanation
- Exercise / Practice
- Evidence
- confirmation / Self-check
- Recovery
- Completion
- Next action

確認問題:

- 知識問題: 最低限含むべき要素、または短い回答例 + 理由。
- 設計 / Trade-off: 一意の模範解答ではなく最低考慮事項 + 許容理由。
- Spec参照: BR / AC / sectionを特定。
- command / test / artifact: success / learning failure / Environment blockを区別。

全fileへ同じheadingセットを強制しない。

## Task 4 — Instructor Reference finalization

learner-facing移動先を先に完成させてから`03_instructor-reference.md`をsupport-onlyへ整理する。

残してよい:

- environment
- account / permission
- device
- Training Copy / Repository provisioning
- Infrastructure / Toolchain troubleshooting

残してはいけない:

- non-public Answer Key
- learner completionの正本
- learner evaluationの独自基準
- learner-facing learning / Self-check / Recoveryの重複正本

## Task 5 — Continuous learner review checklist

`docs/reference/curriculum-self-study-review.md`を追加する。

reviewer / maintainer向けの再利用可能criteriaだけを持つ。

最低限:

- audience / prerequisite depth
- navigation / skip / branch / rejoin
- hidden prerequisite
- goal → explanation → Exercise → Evidence → Self-check → Completion
- answerability without Instructor private knowledge
- Recovery
- Common / Extension / Reference / specialization boundary
- command / Artifact / Environment block
- terminology
- spec reference safety
- 専門的なFindingの成立条件とEvidence

個別review result、reviewer、日付、PASS履歴、Finding、Evidence、progressを保存する欄は作らない。

## Task 6 — Validator / contract change（原則N/A）

次の場合だけ変更する。

A. PR 4Aでmachine contractそのものを変更する必要が生じた。

B. stableなP0/P1 regressionを自然言語表現をfreezeせずguardできる。

禁止:

- 日本語文言exact match
- prose depth / readability test
- Self-check exact heading / wording test
- Instructor Reference exact prose test
- 「念のため」のvalidator refactor

## Task 7 — Validation / learner-route walkthrough

### Automated

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
pnpm run test:contracts
git diff --check
```

Conditional:

- `pnpm run validate:spec`: spec / spec contractを変更した場合のみ。
- `pnpm run typecheck`: TypeScript validator / contractを変更した場合のみ。

### Manual walkthrough

`docs/reference/curriculum-self-study-review.md`の観点をこのwalkthrough内で利用し、別の重複review passを作らない。

Shared entry:

`README → 00_learning-design → 01_spreadsheet-test-design → P1-1`

Part 1 Common:

`P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 → [P1-7 skip] → P1-8 → P1-9`

Part 1 Native:

`P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 → P1-7 → P1-8 → P1-9`

Part 1 → Part 2:

`P1 completion → 00_learning-designの移行説明 → P2-1`

Part 2 Common:

`P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → [P2-6 skip] → P2-7 → P2-8`

Part 2 Native:

`P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → P2-6 → P2-7 → P2-8`

### Manual assertions

- CommonがNative / Extension / Reference未受講で完了できる。
- Native branch / skip / rejoinが一意。
- Competency / routeがPR #103 contractと一致。
- Practice Volumeが単独合否条件へ逆流していない。
- P1-5 Core / Extension、P1-8 Playwright-only Commonが成立。
- P2各LessonでRepository固有詳細がRequiredへ逆流していない。
- 確認問題をLearner自身で採点できる。
- Next actionがExercise / Self-check / Completionより前にない。
- Instructor Referenceがsupport-only。
- Optional / Legacy / Instructor assetをLearner Requiredと誤認しない。
- `docs/spec/**`にPR 4A実変更がない。
- PR 5 / Product / Formal Test Strategyを前倒ししていない。

## Stop conditions

以下を推測で解消しない。

- Normative Specificationが曖昧 / 不足 / 複数解釈可能。
- Product Decision / Product behavior変更が必要。
- 明確なSpecとCurrent implementationのdeviationがLearner completionを阻害する。
- PR #103 fixed contractと矛盾する変更が必要。
- PR 4A scopeを超えてPR 5 / Security Curriculum / Product改修へ広がる。
- `docs/spec/**`の実変更が必要。

停止単位はblockerへ依存するFinding / file / Taskとする。独立remediationは継続してよい。

## Definition of Done

- Task 0 / Task 1 / Hard Gateが完了。
- final Curriculum FindingがSeverity / Disposition / Primary owner / exact target / minimum fix / validationを持つ。
- unresolved P0/P1 blocker = 0。
- DoDに必要なbounded P2が解消。
- `docs/spec/**` text auditが`audited X / total X`でcoverage確認されている。
- CommonがNative / Extension / Referenceなしで成立。
- selected Native specializationがlearner-facing materialだけで開始・実行・自己確認・復帰可能。
- Practice Volume、Repository固有provisioning / copy mechanics / Current CI topologyがRequired completionへ逆流していない。
- 確認問題がSelf-study可能な最低判定基準を持つ。
- Instructor Referenceがsupport-only。
- stable language / terminology ruleが既存READMEまたはLearning Designへ最小反映。
- reviewer checklistが追加されTask 7 walkthroughで使用可能。
- `docs/spec/**`にPR 4A実変更がない。
- Required automated validationがPASS。
- unrelated cleanup / refactor / rename / directory migrationがない。
- proseをfreezeする不要なvalidator / contract testを追加していない。
- Curriculum / Reference実変更がconfirmed `fix_now` Findingのbounded outcomeに限定され、Plan / Run / history等の必要process artifact以外のunrelated差分がない。
- PR本文がcurrent Finding / audit coverage / current head / Validation / blocker状態と一致する。
- Open PRのままreview可能。mergeはユーザー承認まで行わない。

## Execution order

1. Task 0 — baseline / freshness
2. Task 1 — Pre-change audit / finite Finding finalization / Spec inventory / Instructor migration / Terminology
3. **Hard Gate**
4. Task 2 — confirmed root finding / migration / stable terminology only
5. Task 3 — learner-facing remediation（1 file ≒ 1 pass）
6. Task 4 — Instructor Reference support-only finalization
7. Task 5 — reusable self-study review checklist
8. Task 6 — conditional validator / contract（通常N/A）
9. Task 7 — automated validation + learner-route walkthrough
10. Final freshness / scope review
11. PR本文をcurrent stateへ同期
12. Tracking Issue更新

## PR handling

- このPlanを含むPRを実装PRとして使用する。
- 実装は同一branch / PRへ追加する。
- Pre-change audit結果・final Finding・必要なDispositionを本Planへ反映してから実装する。
- PR本文は実装前提で記載し、実装後にcurrent結果へ更新する。
- mergeはしない。

## Follow-up boundary

- Pilot実測値は別pilot / measurement計画へ送る。
- Native runner / workflow / Artifact contract、Training failure executable flowはPR 5または既存ownerへ戻す。
- Preview / Production / full multi-platform delivery、第三者Review、Security専門教育はCommon completionへ追加しない。
- Specification clarificationやProduct deviationはPR 4Aへ混ぜず、対象ownerの別Issue / PRへhandoffする。
