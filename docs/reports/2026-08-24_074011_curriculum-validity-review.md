# Test Automation Curriculum Validity Review

- Review date: 2026-08-24 JST
- Repository baseline commit: `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c`（Repository Auditと同一の監査対象Repository状態）
- Scope: `docs/curriculum/test-automation/` のRequired 22文書、Optional / Legacy境界、Training assets、Workbook、Rubric、Validator、Curriculumに関係するCurrent CI契約
- Provenance: [Curriculum Review Run](../../.codex/runs/20260824-063354-JST/REPORT.md)
- Repository evidence baseline: [Repository Audit Run](../../.codex/runs/20260823-225103-JST/REPORT.md)
- Classification: Review FindingはSeverity、Category、Evidence、影響、推奨方向、Confidenceを分離する

本Reportは完成済みReviewのdurable outcomeである。Run Artifactは実行経緯と判断履歴、本Reportは後続作業が単独参照できる評価結果を担う。Product Code、Test Code、Curriculum本文、Specification、CIを変更するものではなく、実装Planでもない。

Evidence notation: `part1/`と`part2/`は`docs/curriculum/test-automation/part1/`と`docs/curriculum/test-automation/part2/`、単独の`README.md`、`00_learning-design.md`、`02_competency-rubric.md`、`03_instructor-reference.md`は`docs/curriculum/test-automation/`配下を指す。`path:line`はReview時点の行番号である。

## Executive Conclusion

現行Curriculumは大筋で妥当であり、全面再設計は不要である。特に、Normative SpecificationをOracleとし、Test Target分析、Risk、Test Design、Layer / Automation SelectionをTool実装より先に置き、Failure Analysis、Maintainability、Development Processへ接続する思想と大順序は維持すべきである。

一方、部分的な文言修正だけでは十分でない。現行の単一Required Pathは、Programming未経験者を含む幅広いAudienceに対し、Part 1だけでC01〜C10 Level 2、Web / Mobile、Physical Android / Maestro、Failure Analysis、Maintainability、統合Capstoneを同時に要求する。最重要論点は次の3点である。

1. AudienceとPart 1のRequired scope / Level 2要求が整合するか。
2. Lesson、Exercise、提出物からC01〜C12のMinimum Evidenceへ直接追跡できず、Level 2判定が講師解釈へ依存すること。
3. Web + Nativeを全員の共通卒業要件にするか、汎用Test Automation Engineerを共通卒業像としてNativeをspecializationにするかが未決定であること。

したがって、必要なのは新Lessonの大量追加ではなく、North StarとNative Decisionの明文化、CompetencyごとのMinimum Evidence確定、既存Lesson内のCore / Extension / Referenceの深さ調整である。

## 1. Current North Star

Repositoryから読み取れる現在の育成人材像は次である。

> PlaywrightやMaestroの操作だけでなく、Normative SpecificationとBusiness Riskを理解し、Test Condition、Test Layer、自動化可否を判断し、自動Testを実装・実行・分析・保守し、Git / GitHub / CI/CDへ組み込めるQA Automation実務者。

Evidence:

- `docs/curriculum/test-automation/README.md:3-29` はPart 1をTest Automation、Part 2をDevelopment Processへの接続として構成する。
- `docs/curriculum/test-automation/00_learning-design.md:5-27,168-205` はAnalysisからImplementation、Failure、Maintenance、Deliveryへの順序を定める。
- `docs/curriculum/test-automation/02_competency-rubric.md:15-28` はPurposeからContinuous ExecutionまでC01〜C12を定義する。

この像はPlaywright Operatorではなく、Test Automation EngineerまたはQA Automation Engineerに近い。ただし、単一RepositoryとScenario Shopの範囲でentry-level〜案件導入の初期設計を行う人材像であり、独立したAutomation Leadや複数組織を横断するPlatform Ownerまでを保証するEvidenceはない。

### Current core outcomes

1. Specification / Role / State / Data / JourneyからTest Targetを理解する。
2. Business RiskからTest Condition、Technique、Layer、Automation可否を判断する。
3. Web、現行ではNativeも含む自動Testを再現可能に実装する。
4. Failure Evidenceから仮説、分類、改善へ進む。
5. Test資産の重複、Flaky、責務、実行Costを理由付きで改善する。
6. 変更をGit / PR / CI / Quality Gateへ安全に接続する。

## 2. Recommended North Star

共通卒業像を一文に限定する場合の推奨案は次である。

> Normative SpecificationとBusiness Riskから代表的なTest Conditionを導き、適切なTest LayerとAutomation可否を判断し、再現可能な自動Testを実装・診断・保守し、安全なDevelopment ProcessとCIへ接続できるentry-level Test Automation Engineer。

この文はTool、Platform、Test本数を目的にせず、移転可能な判断能力を中心にする。ただし、過去Reviewで提示した「Web Core / Native Optional」はRepositoryから確定した事実ではない。汎用Test Automation Engineerを共通卒業像とする場合の設計案であり、Curriculum変更時に次のDecisionを確定する必要がある。

### Decision A: Web + Nativeを共通卒業要件とする

- C08をRequiredで維持する。
- P1-7 Maestro、Physical Android Flow、P2-6 Native CIをRequired範囲に残す。
- P1 CapstoneのAndroid chainを共通Evidenceとして維持する。
- Hardware / Toolchain failureとLearner skill failureをAssessmentで明確に分ける。

Evidence: `docs/curriculum/test-automation/part1/07_maestro-native-automation.md:5-10,27-40,296-304`、`part1/09_part1-capstone.md:18,31-37`、`02_competency-rubric.md:41-49`。

### Decision B: 汎用Test Automation Engineerを共通卒業要件とする

- C08をOptional specialization候補とする。
- 共通CoreをSpecification、Risk、Layer、Web Automation、Failure、Maintainability、Web CIへ限定する。
- Web / NativeのPlatform差と保証選択はC05 / C06 / C12の概念理解として残す。
- Physical Android execution、Native learner flow、Native CIをspecializationとして評価する。

Decision Bは推奨案の一つであり、既決事項ではない。以降の`Optional candidate`表記は常にこのDecisionに依存する。

## 3. Audience Assessment

`docs/curriculum/test-automation/00_learning-design.md:46-59` はManual Test経験者、No-code / Low-code経験者、Playwright経験者、WebからNativeへ広げたい人、CIで自動Testを実行したい人、案件へ自動化を導入したい人を対象とし、Programming経験を必須にしない。

### 成立している点

- P1-1はManual / No-codeの経験をScenario、Action、Assertion、再現性へ接続する。
- P1-4は高度なLanguage tutorialではなく、Playwrightを読むための最小JavaScript / TypeScript bridgeに限定する。`part1/04_playwright-foundations.md:47-155` はGenerics等をRequiredにしない。
- Git / GitHubをPart 1の前提にせず、まずTest Automationそのものを学ばせる。
- Playwright経験者にもSpecification、Risk、Layer、Do not automateの不足を補う経路がある。

### 単一Required Pathの緊張

- Part 1はC01〜C10 Level 2を一括要求する。`02_competency-rubric.md:39-49`。
- P1-3は10 Test Case、3技法以上、複数Layerを要求する。`part1/03_test-design-and-automation-selection.md:296-304`。
- P1-5はPlaywright E2E 5件、PaymentまたはRole横断、Mobile exerciseを扱う。`part1/05_playwright-e2e-practice.md:238-246`。
- P1-6はFailure分類とLocator / Timing改善を要求する。`part1/06_execution-and-failure-analysis.md:207-214`。
- P1-7はPhysical Android、JDK / SDK / ADB / Maestro、Build / Install / Flowを要求する。`part1/07_maestro-native-automation.md:27-122,296-304`。
- P1-8は保守問題3件、共通化1件、仮想仕様変更、Regression棚卸しを要求する。`part1/08_test-management-and-maintainability.md:375-383`。
- P1-9はこれらをWeb / Mobile / Android Evidenceとして統合する。`part1/09_part1-capstone.md:11-37`。

高度な概念を初心者へ教えること自体は問題ではない。問題は、前提構文、設計判断、複数Tool、Hardware環境、成果物、Level 2判定を同じRequired pathへ累積し、理解より手順消化になるRiskが高いことである。正式な学習時間、講師支援量、実測完了時間はRepositoryにないため、時間数は推測しない。

## 4. Curriculum Structure Assessment

### Part 1

現行はFoundation → Scenario analysis → Test design / selection → JS/TS / Playwright → E2E practice → Failure → Native → Maintainability → Capstoneである。`00_learning-design.md:168-191`。

大順序にPrerequisiteの逆転はない。Risk → Test Condition → Layer / Automation Selection → Playwrightを守り、P1-5 / P1-6ではHarnessを利用して問題を経験し、P1-8で初めて`e2e/web/fixtures.ts`の内部責務やPOM / Helper / Flowを比較する。`00_learning-design.md:191,221-243`、`part1/05_playwright-e2e-practice.md:27-43`、`part1/06_execution-and-failure-analysis.md:23,102`、`part1/08_test-management-and-maintainability.md:31`。

構造上の論点は順序ではなく深さである。P1-5にNormal / Abnormal / Boundary / State / Role / Internal Inspection / Mobile / Accessibilityが集中し、P1-8は14 Lesson / 6 Hands-onでPattern catalog、Lifecycle、Flaky、Suiteまで扱う。P1-7とP1-9のNative scopeはDecision A/Bに依存する。

### Part 2

現行はDevelopment Process → Git → GitHub / PR → CI / Actions → Playwright CI → Native CI → Quality Gate / CD → Integration Capstoneである。`00_learning-design.md:193-205`。

GitをPart 1へ前倒しせず、Part 1成果物を変更単位、Diff、Review、CIへ接続する境界は妥当である。CI概念はPart 1で配置判断の語彙として触れ、Workflow編集とGate設計はPart 2へ置くべきである。Failure AnalysisはTestそのものの能力なのでPart 1、Delivery failureとGate判断はPart 2に残す。

論点はP2-2 / P2-4 / P2-6 / P2-7にRepository固有のSHA、allowlist、runner、build metadata、workflow contractがCore判断と同じ深さで現れる点である。P2-8はRisk、Cost、Reliability、Evidence、Trade-offを要求し、GitHub Actions YAMLの模倣だけではPassできない点を維持すべきである。`part2/08_integration-design-capstone.md:317-372`。

## 5. Competency Assessment

| ID | Current Role | Required Level | Assessment | Decision | Rationale / Evidence |
|---|---|---:|---|---|---|
| C01 | Automation Purpose / Scope | Part 1/2 Level 2 | 自動化の価値、限界、非自動化をNorth Starへ直接接続する | Keep | `02_competency-rubric.md:17`; P1-1は候補3件と非自動化1件を要求する。`part1/01_test-automation-foundations.md:123-156` |
| C02 | Test Target / Specification Analysis | Part 1/2 Level 2 | Role、State、Data、BR、AC、JourneyをSpecから整理する基礎能力 | Keep | `02_competency-rubric.md:18`; `part1/02_scenario-shop-analysis.md:3-8,168-213` |
| C03 | Risk Analysis | Part 1/2 Level 2 | Impact / Likelihoodと優先順位を説明し、後続選択の根拠にする | Keep | `02_competency-rubric.md:19`; `part1/03_test-design-and-automation-selection.md:16-20,249,270-282` |
| C04 | Test Design | Part 1/2 Level 2 | 5技法の使い分けを要求するが、Practiceは10件 / 3技法以上 | Modify | `02_competency-rubric.md:20`; `part1/03_test-design-and-automation-selection.md:235-304`。全技法暗記ではなくRiskに適した技法選択をbounded Level 2とする |
| C05 | Test Layer Selection | Part 1/2 Level 2 | Unit〜Native E2Eの責務を分け、少なくとも1件をUI E2E以外へ置く | Keep | `02_competency-rubric.md:21`; `part1/03_test-design-and-automation-selection.md:140-196,270-304` |
| C06 | Automation Selection | Part 1/2 Level 2 | Automate / Later / Do not automateをRisk、Cost、Determinism、保守性で判断する | Keep | `02_competency-rubric.md:22`; `part1/01_test-automation-foundations.md:58-81`; `part1/03_test-design-and-automation-selection.md:198-282` |
| C07 | Web Automation | Part 1/2 Level 2 | Locator、Assertion、Reset、Evidenceを伴うPlaywright実装 | Keep | `02_competency-rubric.md:23`; `part1/04_playwright-foundations.md:249-337`; `part1/05_playwright-e2e-practice.md:196-246` |
| C08 | Native Automation | Part 1/2 Level 2 | Android Maestro、Stable Test ID、Deep Link、Test Control | Decision Required | `02_competency-rubric.md:24`; `part1/07_maestro-native-automation.md:5-10,262-304`。Decision AならKeep Required、BならOptional candidate |
| C09 | Failure Analysis | Part 1/2 Level 2 | Evidenceから分類、仮説、確認、改善、再発防止へ進む | Modify evidence | `02_competency-rubric.md:25`; `part1/06_execution-and-failure-analysis.md:162-214`。単純Assertion誤りだけでなくmeaningful diagnosticをMinimum Evidenceにする |
| C10 | Maintainability | Part 1/2 Level 2 | Flaky、重複、責務混在、不要Test、実行時間を改善する | Modify / Move一部 | `02_competency-rubric.md:26`; `part1/08_test-management-and-maintainability.md:3-11,295-383`。診断+最小改善はP1、仕様変更Lifecycle / Regression運用はP2 bridge候補 |
| C11 | Change Management | Part 2 Level 2 | Git、PR、ReviewでTest資産変更を説明する | Keep | `02_competency-rubric.md:27`; `part2/02_git-version-control.md:184-282`; `part2/03_github-pull-request-review.md:148-193` |
| C12 | Continuous Execution Design | Part 2 Level 2以上、一部Level 3 | Trigger、Gate、Artifact、Platform、Cost、Reliabilityを設計する | Modify | `02_competency-rubric.md:28,53-69`; `part2/08_integration-design-capstone.md:303-372`。bounded Web CI Level 2とfull multi-platform / Delivery Advancedを分ける |

C01/C06、C09/C10、C11/C12は近接するが、それぞれPurposeと選択、障害診断と長期保守、変更説明と継続実行設計で責務が異なる。現時点でMergeまたはRemoveを支持するEvidenceはない。

## 6. Part 1 Assessment

Part 1 canonical 9 Lesson、約2,194行、48 Learning Objective、約29 Hands-onを全件確認した。行数は負債判定ではなく、累積scopeを理解する補助値である。

| Lesson | Learning Purpose | Cognitive Load / Practice | Completion / Boundary | Assessment |
|---|---|---|---|---|
| P1-1 Foundations | Automationの目的、限界、手動との差 | 候補3件、非自動化1件。Manual / No-codeへの入口あり | C01 / C06の初回Evidence | Keep。`part1/01_test-automation-foundations.md:3-9,123-156` |
| P1-2 Scenario Analysis | Role、State、Data、Journey、SeedからTarget分析 | Cart / Checkoutを画面単位でなく関係として整理 | C02の基礎 | Keep。`part1/02_scenario-shop-analysis.md:3-8,61-166,168-213` |
| P1-3 Design / Selection | Equivalence、Boundary、Decision、State、Role、Layer、Yes/No/Later | 10 Case、3技法、複数Layer。Curriculum中核 | 5技法Level 2との差を限定する必要 | Modify depth。`part1/03_test-design-and-automation-selection.md:3-10,235-304` |
| P1-4 Playwright Foundations | 最小JS/TS、Action、Assertion、Locator、Auto-wait | 2 Test以上。Programming未経験者のbridge | Formal完成例はLearner実装後に比較 | Keep。`part1/04_playwright-foundations.md:47-155,249-337` |
| P1-5 Playwright E2E | Test DesignをCart / Payment / Role / Mobileへ実装 | Cart 3件、Payment Failure、Mobile、Formal比較、計5 E2E | Internal Inspection / A11yまで一Moduleに集中 | Modify。`part1/05_playwright-e2e-practice.md:3-10,156-246` |
| P1-6 Failure Analysis | Intentional、Locator、Timing FailureとEvidence分析 | Trace、Screenshot、Console、Failure memo | 単純FailureだけではC09 L2が弱い | Keep / evidence Modify。`part1/06_execution-and-failure-analysis.md:3-9,55-195,207-214` |
| P1-7 Native | PlaywrightからMaestroへPlatform transfer | Physical Android、Toolchain、Cart / Boundary / Restart | Universal RequiredかはDecision A/B次第 | Decision Required。`part1/07_maestro-native-automation.md:5-10,27-122,262-304` |
| P1-8 Maintainability | Test増加後の重複、Fixture、Pattern、Lifecycle、Flaky、Suite | 383行、14 Lesson、6 Hands-on、3問題+1共通化 | Pattern catalog消化と判断能力が混在 | Modify / Move一部。`part1/08_test-management-and-maintainability.md:3-11,31-195,295-383` |
| P1-9 Capstone | C01〜C10をCart traceへ統合 | Web / Mobileに加えPhysical Android full chain | Baseline receiptとLearner meaningful flowが非対称 | Modify。`part1/09_part1-capstone.md:3-37` |

### P1-5詳細

P1-5はCart Regression最低3件、Payment Failure、Mobile baseline / learner exercise、Formal差分比較を同時に扱う。`part1/05_playwright-e2e-practice.md:196-226`。さらにNormal、Abnormal、Boundary、State、Role、Internal Inspection、Accessibilityを説明する。内容は有用だが、全観点を同じRequired深度で実装させると、設計理由より手順完了が優勢になり得る。Cart / Reset / 代表Boundary / 代表MobileをCore、Payment / Cross-role / Internal Inspection / Accessibility executionをextension候補として分離する方向が妥当である。

### P1-7 Native詳細

Physical AndroidはCurrent canonical local pathであり、BaselineはEnvironment / Harness正常性、ExerciseはLearnerが編集・実行する対象である。この区別は前提として確定済みである。`part1/07_maestro-native-automation.md:27-40`、`scripts/validate-curriculum.ts:384-437`、`training/maestro/baseline/native-training-baseline.yaml`、`training/maestro/exercises/native-training-exercise.yaml`。

ただし、C08を全員へRequiredにするかはDecision A/B次第である。Decision Aでも、API / ABI / ADB / APK integrity等のEnvironment receiptと、Stable ID / Deep Link / Test Controlを使うLearner skill evidenceを分ける必要がある。

### P1-8 Maintainability詳細

Fixture内部を初めて読むタイミングをMaestro後に置くことは意図どおり成立している。`00_learning-design.md:191,221-243`、`part1/08_test-management-and-maintainability.md:31`。POMを必須にせず、Helperが適切なら理由説明を認める。`part1/08_test-management-and-maintainability.md:97-130,299-316`。

問題は、Helper、POM、Component Object、Fixture、Automation Flow、Seed、仮想仕様変更、Assertion、Tag、Flaky、Suiteを一度に扱い、Completionが3問題、1構造改善、Lifecycle、Regression棚卸しまで求める点である。Coreは「実在する保守問題を診断し、選択理由付きで最小改善を1件行う」へ絞り、Pattern catalogはReference、仕様変更LifecycleとRegression inventoryはPart 2 bridge候補とする。

### P1-9 Capstone詳細

CoreはNormative Cart Spec → Workbook Risk / Test Case → Layer / Automation → Training Web → Mobile → Evidenceへ接続する。`part1/09_part1-capstone.md:11-17,31-37`。一方、Step 6はPhysical AndroidのBuild、Install、Smoke、Test Control、Training baseline、JUnit、Screenshot、UI hierarchy、logcat等を集約する。`part1/09_part1-capstone.md:18`。

Rubricはmeaningful Native Flow最低1本を求める。`02_competency-rubric.md:41-49`。したがって、Harness baselineが通ったEvidenceとLearner-authored Native Flowの能力Evidenceを分離し、Decision Aなら両方の関係を評価し、Decision BならNative extensionへ移すべきである。

## 7. Part 2 Assessment

Part 2 canonical 8 Lesson、約2,199行を全件確認した。

| Lesson | Learning Purpose | Cognitive Load / Practice | Completion / Boundary | Assessment |
|---|---|---|---|---|
| P2-1 Development Process | 変更、Review、Test、Build、Deployへの接続 | Part 1 Testを実行時点へ配置する | Part 1→2の橋渡し | Keep。`part2/01_software-development-process.md:3-9,25-47,154-185` |
| P2-2 Git | Working Tree、Staging、Commit、Branch、Diff、History | Part 1成果物を変更単位へする | Git基礎はCore、exact SHA / Copy mechanicsはReference候補 | Keep / depth Modify。`part2/02_git-version-control.md:3-10,20-73,184-282` |
| P2-3 GitHub / PR | Fork、Remote、PR、Review、Checks | PR説明と3観点Review | Tool操作をTest変更説明へ接続 | Keep。`part2/03_github-pull-request-review.md:3-10,148-193` |
| P2-4 CI / Actions | Trigger、Job、Step、Runner、Training境界、Failure | Unit / Quality check / Trigger比較 | CI基礎はCore、allowlist / exact action内部はReference | Modify depth。`part2/04_ci-github-actions.md:3-11,21-59,223-288` |
| P2-5 Playwright CI | Build、Browser、Artifact、Suite、Failure | Learner Training CI、Artifact、Suite分類 | Web CIのCore。Learner exercise Evidenceを明示する必要 | Keep / evidence Modify。`part2/05_playwright-ci.md:3-10,24-32,196-249` |
| P2-6 Native CI | Android Build / Emulator / Maestro、iOS Build-only、Cost | Native Workflow比較、Failure Evidence | Decision AならRequired、Bならspecialization | Decision Required。`part2/06_native-ci-maestro.md:3-12,30-58,244-348` |
| P2-7 Quality Gate / CD | Required、PR/main/Nightly/Manual、Artifact、Deploy、Smoke | Gate / Diagram / 改善案 | Gate判断はCore、vendor / deployment内部はAdvanced | Modify depth。`part2/07_ci-cd-quality-gates.md:3-11,212-282` |
| P2-8 Integration Capstone | Process、Git、Web/Native CI、Gate、Cost、Reliability、Evidence | 11 Phaseの導入設計 | Reasoningは良いがfull platform / CD scopeは広い | Modify scope。`part2/08_integration-design-capstone.md:3-25,303-372` |

Part 2がGit / GitHub / Actions講座へ脱線しているとは断定しない。各LessonはTest資産の変更、Evidence、Gate判断へ接続している。ただし、exact commit SHA、Workflow allowlist parser、Action pin、Android/iOS build metadata等はRepositoryの安全運用には重要でも、全Learnerが同じ深度で暗記すべきCore outcomeではない。原則と判断をCore、正確なCurrent contractをReference / Instructor materialへ寄せる余地がある。

## 8. Practice / Assessment Assessment

RubricのLevel 2は「自力で実施し、判断理由とEvidenceを説明できる」である。`02_competency-rubric.md:30-37`。Test本数は単独合否でなくPractice Volumeである。`02_competency-rubric.md:71`、`part1/05_playwright-e2e-practice.md:240`、`part1/07_maestro-native-automation.md:298`。

| Competency range | Practice adequacy assessment |
|---|---|
| C01〜C03 / C06 | Workbook、分析、Automation decision、Capstoneが一つのtraceになればbounded Level 2を評価可能 |
| C04 | 10件 / 3技法はexposureとして有効だが、5技法すべてを自力で使い分けるLevel 2の証明ではない |
| C05 | 少なくとも1件をUI E2E以外へ置き理由説明する課題はLayer選択のbounded Level 2に適合 |
| C07 | Learner-authored Web Test、Reset、Locator、Assertion、Artifactを接続すればbounded Level 2に適合 |
| C08 | meaningful flow 1件は限定したNative能力のEvidence。Native全般のLevel 2と解釈するとPracticeが狭い |
| C09 | Locator / Timing FailureとArtifactを扱えば妥当。単純な誤Assertionだけでは仮説・切り分け・再発防止を測れない |
| C10 | 人工的に3問題を列挙するより、実在の痛み1件を診断し最小改善する方が理由説明を測りやすい |
| C11 | Branch、Diff、Commit、PR、Reviewを一つの変更へ適用すればbounded Level 2を評価可能 |
| C12 | Web Trigger / Gate / Artifact設計ならbounded Level 2。full multi-platform CI/CDとLevel 3一般化は過大 |

### Confirmed assessment asymmetry

- Rubric: meaningful Native Flow最低1本。`02_competency-rubric.md:41-49`。
- Capstone: Android Build / Install / Smoke / Test Control / Training baseline / Environment evidence。`part1/09_part1-capstone.md:18,31-37`。

BaselineはHarness正常性、ExerciseはLearner modification boundaryであり、両者を同じ提出物として扱うとC08を評価できない。中央LMSは不要だが、Workbook、Learner test、Playwright / Maestro / CI Artifact、Git履歴、講師Rubricのどれが各CompetencyのMinimum Evidenceかを明示する必要がある。

## 9. Required / Optional Recommendation

### Core Required

- C01 Automation Purpose / Scope
- C02 Test Target / Specification Analysis
- C03 Risk Analysis
- C05 Test Layer Selection
- C06 Automation Selection
- C07 Web Automation
- C09 meaningful Failure Analysis
- C10の保守問題診断と理由付き最小改善
- C11 Change Management
- C12のbounded Web CI、Trigger、Gate、Artifact、Failure Evidence

### Required

- Normative SpecificationをObserved behaviorや既存Testより優先すること
- WorkbookでSpec / Risk / Case / Layer / Automation / Evidenceを接続すること
- Seed / Resetを再現性のために使用すること
- 代表的なMobile Web観点
- Training / Formal / Production boundary
- Git Diff / PR / Review
- Secret不要、least privilege、no-deployのTraining CI境界

### Optional candidate — Decision Required

- C08 Native Automation
- P1-7 Physical Android hands-on
- P2-6 Native CI
- Native Capstone

上記はDecision AならRequiredを維持し、Decision BならOptional specialization候補となる。

### Optional candidate

- Accessibility automated scanの実行Evidence
- Internal State Inspectionの実装詳細
- Payment / Cross-role / Purchase / Recovery extension
- Full Browser / Viewport / Platform matrix

Accessibilityは重要なPerspectiveとしてRequired exposureを残し、axe操作だけを独立Competencyへしない。Manual Screen Readerの外部Evidenceは仮定しない。

### Advanced

- Full Purchase Journey、Payment Failure / Recovery、Cross-role Lifecycle
- Full Native CIとAndroid / iOS execution strategy
- Full CI/CD、Deploy-after-Smoke、Production artifact guard
- Cross-browser / UI review matrix
- Agentic QAのprotocol、benchmark、scoring

### Reference

- Exact SHA、Workflow allowlist、Action pin、parser内部
- Android API / ABI / ADB / APK、低レベルdevice診断
- Xcode / CocoaPods / iOS build metadata
- Formal Workflow内部Contract
- POM / Helper / Fixture / Automation Flow pattern catalog
- Legacy `part1/10_part1-capstone.md`

## 10. Findings

### CUR-H1 — Universal pathとAudience / Levelの不整合

- Severity: High
- Category: Audience / Scope / Cognitive Load
- Evidence: `docs/curriculum/test-automation/00_learning-design.md:46-59`; `02_competency-rubric.md:41-49`; `part1/05_playwright-e2e-practice.md:238-246`; `part1/08_test-management-and-maintainability.md:375-383`
- Why it matters: Programming未経験者を含む単一路線でC01〜C10 Level 2、Web / Mobile / Native、Failure、Maintainabilityを同時に要求し、理解、Tool、Hardware、提出Evidenceの負荷を分離できない。
- Recommended direction: Universal Core、Required supporting、specialization、Referenceの境界をNorth Starから確定する。
- Confidence: High

### CUR-H2 — LessonからCompetency Minimum EvidenceへのTrace不足

- Severity: High
- Category: Competency / Assessment
- Evidence: `docs/curriculum/test-automation/02_competency-rubric.md:15-59`; `scripts/validate-curriculum.ts:487-556`; `tests/contracts/training-curriculum.test.ts:9-111`
- Why it matters: Validatorは文書、Workbook schema、Training asset、CI tokenを検査するが、Lesson→C ID、C ID→Minimum Evidence、Level判定を保証しない。講師が何を提出すればLevel 2か再構成する必要がある。
- Recommended direction: 新LMSではなく、既存Workbook / Learner test / Artifact / Git / Instructor RubricをC01〜C12へ直接対応付ける。
- Confidence: High

### CUR-H3 — C08 / Physical Androidの共通卒業要件が未決定

- Severity: High / Decision Required
- Category: Required/Optional / Web/Native / Audience
- Evidence: `docs/curriculum/test-automation/part1/07_maestro-native-automation.md:5-10,27-40,296-304`; `part1/09_part1-capstone.md:18,31-37`; `02_competency-rubric.md:41-49`
- Why it matters: Current CurriculumではPhysical Androidが標準かつCapstoneの一部だが、最終育成人材をWeb + Native共通担当にするか、汎用Test Automation EngineerにするかでRequired境界が変わる。
- Recommended direction: Decision A/BをCurriculum変更時に明示し、Bを既決事項として扱わない。
- Confidence: High

### CUR-M1 — P1-5への観点集中

- Severity: Medium
- Category: Cognitive Load / Practice
- Evidence: `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md:3-10,99-246`
- Why it matters: Boundary、State、Role、Inspection、Mobile、Accessibilityを一度に実装すると、Riskから選ぶ学習よりTechnique checklistになり得る。
- Recommended direction: Cart / Reset / 代表Boundary / MobileをCore、他をextension候補へ分ける。
- Confidence: High

### CUR-M2 — C04のLevel 2とPractice量の非対称

- Severity: Medium
- Category: Competency / Practice
- Evidence: `docs/curriculum/test-automation/02_competency-rubric.md:20`; `part1/03_test-design-and-automation-selection.md:235-304`
- Why it matters: Rubricは5技法の使い分け、Lessonは3技法以上を要求し、同じ到達を測っていない。
- Recommended direction: 技法数でなく、Specification / Riskに対し適切なTechniqueを選び理由を説明するbounded Level 2へ合わせる。
- Confidence: High

### CUR-M3 — C09のFailure Evidenceが弱くなり得る

- Severity: Medium
- Category: Practice / Assessment
- Evidence: `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md:162-214`; `training/playwright/failure-exercises/expected-failure.spec.ts:3-8`
- Why it matters: 単純な誤Assertionだけでは原因分類、仮説、確認、再発防止までを評価しにくい。
- Recommended direction: LocatorまたはTimingを含むmeaningful diagnosticをMinimum Evidenceへ含める。
- Confidence: High

### CUR-M4 — P1-8のCore scopeが広い

- Severity: Medium
- Category: Maintainability / Cognitive Load
- Evidence: `docs/curriculum/test-automation/part1/08_test-management-and-maintainability.md:3-11,31-195,295-383`
- Why it matters: 小規模なLearner test群にPattern catalog、Fixture、Seed、Lifecycle、Flaky、Suiteを同時に適用し、判断能力より用語消化になり得る。
- Recommended direction: Coreを実在問題の診断+最小改善へ限定し、Pattern catalogをReference、LifecycleをPart 2 bridge候補にする。
- Confidence: High

### CUR-M5 — Native baselineとmeaningful learner flowのAssessment差

- Severity: Medium
- Category: Assessment / Web/Native
- Evidence: `docs/curriculum/test-automation/part1/09_part1-capstone.md:11-19,31-37`; `02_competency-rubric.md:41-49`
- Why it matters: CapstoneのEnvironment / Harness receiptが、RubricのLearner-authored C08 Evidenceより大きく、何を採点するかが曖昧になる。
- Recommended direction: Baseline receiptとExercise evidenceを分離する。
- Confidence: High

### CUR-M6 — Part 2のRepository固有運用詳細

- Severity: Medium
- Category: Scope / CI/Delivery
- Evidence: `docs/curriculum/test-automation/part2/02_git-version-control.md:41-73`; `part2/04_ci-github-actions.md:21-59,83-125`; `part2/06_native-ci-maestro.md:60-230`; `part2/07_ci-cd-quality-gates.md:15-26`
- Why it matters: SHA、allowlist、Action pin、runner、build metadataが移転可能なCI判断と同深度でRequiredに見える。
- Recommended direction: 原則と判断をCore、Current implementation detailをReference / Advancedにする。
- Confidence: High

### CUR-M7 — Learner exerciseの継続評価境界が薄い

- Severity: Medium
- Category: CI/Delivery / Assessment
- Evidence: `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md:186-188`; `part2/05_playwright-ci.md:24-32,196-208`; `part2/06_native-ci-maestro.md:244-260`; `03_instructor-reference.md:42-55`
- Why it matters: BaselineはHarness正常性、ExerciseはLearner変更対象だが、どのCI ArtifactとWorkbookを使ってLearner testを継続評価するかが一意でない。
- Recommended direction: Baseline、exercise、CI Artifact、completion evidenceの役割を明示する。
- Confidence: High

### CUR-M8 — C12のscopeが一つのCapstoneに対して広い

- Severity: Medium
- Category: Competency / CI/Delivery
- Evidence: `docs/curriculum/test-automation/02_competency-rubric.md:53-69`; `part2/08_integration-design-capstone.md:303-372`
- Why it matters: Single Repositoryの設計演習からfull multi-platform CI/CDのLevel 2/3能力を一般化しにくい。
- Recommended direction: Web CI bounded Level 2とmulti-platform / full Delivery Advancedを分ける。
- Confidence: Medium

### CUR-M9 — iOS Current GateのDocumentation Drift

- Severity: Medium
- Category: Documentation Drift / CI/Delivery
- Evidence: `docs/curriculum/test-automation/part2/06_native-ci-maestro.md:40-46,340-348`; `part2/08_integration-design-capstone.md:17-25`; `.github/workflows/native-ios-ci.yml:3-10`; `.github/workflows/native-ci.yml:2031-2087`; `docs/adr/0011-native-ci-ios-build-only-gate.md:12-23`
- Why it matters: Curriculumはmanual-only / PR Required外と説明するが、Current top-level Native workflowはNative変更時にreusable iOS Build-onlyを呼び、verifyが成功を要求する。C12のRequired / Manual判断を誤らせる。
- Recommended direction: iOS Runtime非保証、manual dispatch、Native変更時Required Build-onlyを分けて説明する。
- Confidence: High

### CUR-L1 — 意図的Spiralと説明重複の境界

- Severity: Low
- Category: Learning Order / Scope
- Evidence: P1-2、P1-3、P1-5、P1-7、P1-8にRole / State / Seed / Resetが反復する。
- Why it matters: 概念→適用→Platform transferの反復自体は良いが、初回定義と再適用が区別されない箇所は新概念が増えたように見える。
- Recommended direction: Lesson削除ではなく、Canonical DefinitionとApplication Practiceを明示する。
- Confidence: Medium

### CUR-L2 — Pilot実測値がない

- Severity: Low
- Category: Audience / Practice
- Evidence: `docs/curriculum/test-automation/00_learning-design.md:46-59,80-109`; Part 1約2,194行、Part 2約2,199行。正式な時間・支援量・完了実績はRepository内にない。
- Why it matters: 構造的な認知負荷は評価できるが、実際の完了時間、Environment block、講師支援量は確定できない。
- Recommended direction: Pilotで時間、支援、Environment block、再提出理由を計測し、架空のRequired Durationは定義しない。
- Confidence: High

Critical Findingは0件である。現行思想と大順序が成立しており、Curriculum全体が目的を失っているEvidenceはないためである。

## 11. What Should NOT Be Changed

次の設計は現状のまま維持すべきである。

- Normative SpecificationをOracleとし、Application、既存Test、Observed behaviorを昇格させない。`README.md:33-35`、`02_competency-rubric.md:5-11`。
- Analysis → Design → Selection → Implementationの順序。`00_learning-design.md:168-191`。
- Scenario Shopを全Lessonで一貫利用し、同じBusiness Ruleを異なる段階で深める。`README.md:49-66`。
- Do not automateを明示的に学ばせる。`part1/01_test-automation-foundations.md:71-81`、`part1/03_test-design-and-automation-selection.md:270-282`。
- Lower Layerへ置く判断を評価する。`part1/03_test-design-and-automation-selection.md:140-196,270-304`。
- Test Pyramidを機械的な本数規則にしない。`part1/03_test-design-and-automation-selection.md:188-196`。
- POMを必須化せず、Helper / Fixture / Flowとの比較後に理由で選ぶ。`README.md:75-79`、`part1/08_test-management-and-maintainability.md:97-130,299-316`。
- 完成済みFixture / Helper / POMを最初から答えとして見せず、問題経験後にMaintainabilityで扱う。
- Failure AnalysisをMaintainabilityより前に置く。
- Git / GitHub / CIの実装をPart 2へ置く。
- Formal Regression、Training Test、Production Workflowの境界。`README.md:37-45,147-157`。
- Formal / Trainingが同じCI infrastructureを安全に再利用すること自体は問題にしない。
- Optional Agentic QAをRequiredへ混ぜない。`README.md:127`。
- Legacy AliasをRequired Navigation / Validatorから除外する。`README.md:127`。
- Accessibilityを重要Perspectiveとして扱いつつ、axe操作だけを目的にしない。
- Web / NativeのFull Pixel ParityをLearning Goalにしない。
- iOS Runtime / MaestroをRequired保証にしない。Build-only Gateとは別に扱う。
- 新LMS、Framework、Test Management Toolを導入しない。

## 12. Proposed Target Curriculum Structure

新Lessonを大量追加せず、現行Part 1の9 ModuleとPart 2の8 Moduleを維持する。

### Target Part 1

1. P1-1〜P1-4: Core Required。目的、Target、Risk、Design、Layer、Automation decision、最小JS/TS、Playwright基礎。
2. P1-5: Cart / Reset / 代表Boundary / 代表MobileをCore。Payment / Cross-role / Internal Inspection / Accessibility executionをextension候補。
3. P1-6: Core Required。meaningful Failure EvidenceをMinimumにする。
4. P1-7: Decision AならRequired、Decision BならNative specialization。Physical Android canonical path自体は正本として維持。
5. P1-8: 実在問題の診断+理由付き最小改善をCore。Pattern catalogをReference。仕様変更Lifecycle / Regression inventoryをPart 2 bridgeへ寄せる候補。
6. P1-9: Web Core Capstoneを明示し、NativeはDecision AならRequired chain、Bならextension。Baseline receiptとLearner exerciseを分離。

### Target Part 2

1. P2-1: Core Required。Part 1成果物をDevelopment Processへ接続。
2. P2-2: Branch / Diff / CommitをCore、SHA / Training Copy mechanicsをReference。
3. P2-3: PR説明、Review、ChecksをCore。
4. P2-4: Trigger / Job / Failure / least privilegeをCore、Action pin / allowlist内部をReference。
5. P2-5: Web CI、Failure Artifact、Suite配置、Learner exercise evidenceをCore。
6. P2-6: Decision AならRequired、Decision BならNative CI specialization。
7. P2-7: Gate、Artifact、Fail-closedをCore、vendor / production deployment contractをAdvanced / Reference。
8. P2-8: Web CI / Gate / Artifact / Failure reasoningをCore。Native / iOS / full CDをDecision AまたはAdvanced extensionとして扱う。

## 13. Curriculum Change Candidates

これは実装Planではなく、変更判断時の候補優先度である。

### P0

- Primary Audienceと一文のNorth Starを確定する。
- Native Decision A/Bを確定する。
- C01〜C12ごとのbounded LevelとMinimum Evidenceを定義する。
- CapstoneでHarness baseline receiptとLearner-authored exercise evidenceを分離する。
- iOS Current Gate説明をCurrent Workflow / ADRと一致させる。

### P1

- P1-5をCore / extensionへ深さ調整する。
- C04のTechnique quotaとLevel 2定義を整合させる。
- C09のmeaningful diagnostic Evidenceを明確にする。
- P1-8のCoreを診断+最小改善へ絞り、LifecycleをPart 2へ接続する。
- Part 2のRepository固有運用詳細をReference化する。
- Training baseline / exercise / CI Artifact / completion evidenceを明示する。

### P2

- Pilotで完了時間、支援量、Environment block、再提出理由を計測する。
- Instructor間のRubric判定差を較正する。
- Spiral反復箇所のCanonical DefinitionとApplication Practiceを明示する。

### Decision Required

- A: Web + Nativeの両方を扱える人材を共通卒業要件とし、C08をRequired維持する。
- B: 汎用Test Automation Engineerを共通卒業要件とし、C08をOptional specialization候補とする。

### Won't Fix / No Change

- Normative Spec Oracle
- Analysis → Design → Selection → Implementation
- Scenario Shop一貫利用
- Do not automate / Lower Layer判断
- POM非必須
- Failure先行、Maintainability後置
- Git / CIをPart 2へ置く
- Formal / Training boundary
- Agentic QA Optional
- Pixel parity非目標
- iOS Runtime非Required

## 14. Test Strategy ReviewへのInput

次回のTest Strategy / Test Perspective Reviewへ渡すのは、Curriculumから要求される次の境界だけである。Test Strategy自体の全面評価は本Reportのscope外である。

1. C04 / C05 / C06でLearner Coreに使う代表Risk、Technique、Layerの組合せ。
2. Web共通CoreとNative specialization、またはWeb + Native共通卒業要件の保証境界。
3. C09 Level 2に必要な最低Failure Artifactとmeaningful failure type。
4. Training baseline、Learner exercise、Formal Regression、CI Artifactの責務境界。
5. AccessibilityをRequired Perspectiveとしてどこまで教え、自動検査とManual確認をどう区別するか。
6. Android Build + Runtime、iOS Build-only、Native変更時のiOS reusable Required Gateを一貫して説明するCurrent guarantee。
7. Formal Regressionに存在するSQLite transaction / FK、bundle guard、artifact sanitizer、Agentic QA artifact chain等をCurriculum Coreへ自動昇格させない境界。
8. Risk / Technique / LayerからFormal exampleへ追跡できる最小の代表例。全Formal TestをLearner scopeへ含めることは要求しない。

## Assumptions and review limits

- 通常文書はCurrent Documentationとして評価し、明示history / archive / legacy以外の古い記述はDriftとして扱った。
- Learner EvidenceはLocal / Training Copy、Workbook、Learner test、Playwright / Maestro / CI Artifact、Part 2 Git履歴、Instructor Rubricで構成し、外部LMSを仮定しない。
- 正式な学習時間とpilot実測がないため、時間数を固定せず構造的負荷だけを評価した。
- Native baselineはEnvironment / Harness確認、exerciseはLearner modification boundaryである。
- Full Pixel Parityは目標外である。
- ReportはCurriculum変更を実施せず、必要最小限の改善方向を確定する。
