# Curriculum / Test Strategy / Refactoring Repository Audit

- Audit date: 2026-08-23〜2026-08-24 JST
- Durable report saved: 2026-08-24 JST
- Provenance: [Repository Audit Run](../../.codex/runs/20260823-225103-JST/REPORT.md)
- Follow-up review: [Curriculum Validity Review Run](../../.codex/runs/20260824-063354-JST/REPORT.md)
- Evidence basis: Current repository source、Normative Specification、Curriculum、Formal / Training Test、Harness、CI、recent ADR / Run / Plan
- Classification: `FACT` / `MISMATCH` / `GAP` / `DUPLICATION` / `COMPLEXITY` / `QUESTION` / `CANDIDATE`

本Reportは完成済みRepository全体調査のdurable outcomeである。Run Artifactは実行経緯、Progress、Command、判断履歴を保持し、本Reportは後続のCurriculum Review、Test Strategy / Perspective Review、Refactoring Reviewが単独参照できるEvidence inventoryを保持する。Observed behaviorや既存TestをNormative Specificationへ昇格させず、技術的負債候補を改善対象として確定しない。

Evidence notation: `part1/`と`part2/`は`docs/curriculum/test-automation/part1/`と`docs/curriculum/test-automation/part2/`、単独の`02_competency-rubric.md`等は`docs/curriculum/test-automation/`配下を指す。`path:line`は調査時点の行番号である。

## Executive Summary

調査目的は、次の3レビューを順番に判断できるだけのRepository Evidenceを収集することだった。

1. Curriculum validity
2. Test Strategy / Test Perspective validity
3. Technical debt / Refactoring necessity

目的を満たすEvidenceは揃った。Product、Specification、Curriculum、Formal / Training Test、Harness、Web / Native、Dexie / SQLite、CIの主要関係、Required Curriculum 22文書、C01〜C12、Formal risk 16件、Test layer概算、代表business ruleの双方向trace、指定Hotspotの責務・caller・test・transaction boundaryを確認した。

同時に、後続判断へ影響するConfirmed mismatch / gapも確定した。主なものは、Required Web E2E 12本というCurrent文書と現行14+13実行の差、Cross-role PR Gate差、Playwright project名差、Seed Version差、Nativeをfuture扱いするCurrent文書、iOS Build-only Required Gate差、Requirement / LessonからTest / Competencyへの直接trace不足、現行StrategyのTest layer inventory不足である。

ArchitectureではApplication→Infrastructure / Presentation、Infrastructure→Presentationのruntime importは確認されず、Web / Native composition rootとDexie / SQLite分離はADRと整合した。一方、Native Repository、Native screen、Admin Product UI、Native CI、Seed、Agentic QA Harnessには責務または依存が集中する。これは`COMPLEXITY` / `CANDIDATE`であり、行数だけを理由にRefactor必須とは判定しない。

## 1. Repository Map

### 1.1 End-to-end relationship

```text
docs/spec/ (Normative BR / AC / Role / State / UI contract)
  ├─ src/domain/ (entity / policy / domain service)
  ├─ src/application/ (use case / port / transaction contract)
  │    ├─ Web composition → Dexie adapters → IndexedDB
  │    └─ Native composition → SQLite adapters → expo-sqlite
  ├─ src/presentation/ + app/ (Web / Native route and UI)
  ├─ tests/ (Unit / Integration / Repository / Component / Static contract)
  ├─ e2e/web/ + maestro/ (Formal Web / Android Runtime regression)
  ├─ training/ + docs/curriculum/ (Learner exercise / baseline / workbook)
  ├─ scripts/ + src/test-controls/ + src/seeds/ (Harness / reset / clock / inspection)
  └─ .github/workflows/ (Build / Test / Artifact / Runtime / Gate)

Curriculum learning objective
  → C01〜C12
  → Scenario Shop rule / risk
  → technique / layer / automation decision
  → learner test / artifact
  → instructor rubric
```

Normative ownerは`docs/spec/README.md`以下であり、Current implementation、Regression test、README、Run resultはSupporting / Observed Evidenceである。Curriculumもこの優先順位を`docs/curriculum/test-automation/README.md:33-45`と`02_competency-rubric.md:5-11`で採用する。

### 1.2 Area inventory

行数は調査時点のtext/source概算であり、dependency、generated artifact、Run Artifactを除外または別集計した。

| Area | Files | Lines | Main responsibility |
|---|---:|---:|---|
| `src/` | 155 | 37,750 | Product / domain / application / infrastructure / presentation / seed / test control |
| `src/domain/` | 12 | 1,083 | Business policy、entity / domain service、repository contract |
| `src/application/` | 26 | 5,557 | Use case、port、transaction contract、service composition |
| `src/infrastructure/` | 29 | 9,016 | Dexie、SQLite、gateway adapter |
| `src/presentation/` | 65 | 17,812 | Web / Native screen、page、component、style |
| `src/seeds/` | 7 | 2,472 | Default dataset、scenario overlay、metadata、validation |
| `src/test-controls/` | 10 | 1,323 | Reset、Clock、Payment delay、inspection、Native contract harness |
| `tests/` | 86 | 19,741 | Unit / Integration / Repository / Component / Contract / Runtime |
| `e2e/web/` | 8 | 2,252 | Formal Playwright regression / smoke / visual capture |
| `training/` | 28 all files | 668 | Workbook、Training Playwright / Maestro、Workflow template、Agentic assets |
| `maestro/` | 23 | 1,223 | Formal Android Runtime flows / shared subflows |
| `docs/spec/` Markdown | 22 | 2,011 | Normative feature / role / state / UI specification |
| `docs/curriculum/` | 24 | 5,742 | Required 22 docs + Optional / Legacy material |
| `.github/workflows/` | 4 | 3,300 | Web / Native / iOS / report CI contracts |
| `scripts/` | 76 selected source/docs files | 23,079 | Validation、build、training、Agentic QA、Native helper |

### 1.3 Product and architecture boundaries

- Web route / composition: `app/` → `src/presentation/` → `src/application/create-application-services.ts` → `src/infrastructure/database/dexie/`。
- Native route / composition: `app/*.native.tsx` → `src/presentation/native-route.native.tsx` → `src/bootstrap/native-runtime.ts` → `src/infrastructure/database/sqlite/`。
- Shared business rule: `src/domain/`、`src/application/use-cases/`、shared repository / transaction contracts。
- Web persistence: Dexie 10 files / 3,530 lines。CapabilityごとにCart / Checkout、Product / Inventory、Order / Review、Storefront、basic repositoryへ分かれる。
- Native persistence: SQLite 6 files / 4,955 lines。Schema / mapper / seedは分離するが、customer application repositoriesが2,643 linesへ集中する。
- ADR alignment: `docs/adr/0003-platform-route-composition-root.md`のplatform composition分離、`docs/adr/0004-native-sqlite-transaction-test-strategy.md`、`docs/adr/0009-native-purchase-sqlite-capability.md`により、NativeへDexieをimportせずSQLite adapterを持つ。Web / Native UIのPixel parityは保証せず、Business semanticsとshared ruleを揃える。
- Import graph fact: Application→Infrastructure / Presentation、Infrastructure→Presentationは0。Domain repository / policyからApplication contractへのtype-level参照が4箇所あり、runtime cycleは確認していない。

### 1.4 Test and training boundaries

- Formal Web: `e2e/web/` + `playwright.config.ts` + `output/playwright`。
- Training Web: `training/playwright/` + `playwright.training.config.ts` + port 8082 + `output/training/playwright`。
- Formal Native: `maestro/` + `.github/workflows/native-ci.yml` + Android build/runtime artifacts。
- Training Native: `training/maestro/` + `scripts/training/run-maestro-baseline.ts` + Training workflow template。Formal Android runtime jobはTraining baselineを再利用するが、flow path / artifactは分離する。
- Formal RegressionはLearner modification boundaryではない。LearnerはTraining Copy、Workbook、`training/playwright/exercises/`、`training/maestro/exercises/`、Training Workflow templateを使用する。

### 1.5 Major hotspots

| Path | Lines | Bytes | Observed concentration |
|---|---:|---:|---|
| `src/presentation/styles/global.css` | 5,160 | 84,324 | Web global / responsive cascade |
| `src/infrastructure/database/sqlite/native-customer-application-repositories.ts` | 2,643 | 98,414 | 13 repositories + 10 transaction scopes + factory |
| `.github/workflows/native-ci.yml` | 2,087 | 97,124 | 8 jobs、Android build/runtime、Training、iOS、verify |
| `src/presentation/native/native-purchase-screens.tsx` | 1,438 | 53,024 | 13 auth / account / checkout / order / review screens |
| `src/presentation/native/native-screens.tsx` | 1,229 | 44,864 | 8 storefront / search / product / cart screens |
| `src/presentation/pages/admin-product-pages.tsx` | 1,220 | 44,325 | list / new / edit + 586-line editor |
| `src/infrastructure/database/sqlite/native-customer-repositories.ts` | 1,041 | 38,185 | Catalog + Guest Cart compatibility surface |
| `scripts/agentic-qa/` | 26 files / 9,375 | 347,839 | schema / preparation / trust / artifact / evaluation contracts |

Recent change evidenceはGit履歴ではなくRun / Plan内path参照数へ限定した。`native-ci.yml` 72、`native-screens.tsx` 22、`admin-product-pages.tsx` 18、`native-customer-repositories.ts` 12、`native-purchase-screens.tsx` 10のartifactで参照された。これは変更頻度の完全測定ではなく、「大きく、最近の作業面にも継続して現れた」Evidenceである。

## 2. Curriculum Evidence Inventory

### 2.1 Final learning image and required boundary

Current CurriculumはPlaywright / Maestro operatorではなく、Specification、Risk、Test Design、Layer / Automation decision、Implementation、Failure、Maintainability、CI integrationを行うTest Automation practitionerを育成しようとしている。Evidenceは`docs/curriculum/test-automation/README.md:3-29`、`00_learning-design.md:5-27,168-205`、`02_competency-rubric.md:15-28`。

Required canonicalは22文書である。

- Common 5: `README.md`、`00_learning-design.md`、`01_spreadsheet-test-design.md`、`02_competency-rubric.md`、`03_instructor-reference.md`
- Part 1 canonical 9: `part1/01_test-automation-foundations.md`〜`part1/09_part1-capstone.md`
- Part 2 canonical 8: `part2/01_software-development-process.md`〜`part2/08_integration-design-capstone.md`
- Optional Reference: `part1/09_specification-agentic-qa.md`
- Legacy Alias: `part1/10_part1-capstone.md`

`scripts/validate-curriculum.ts:8-39`、Curriculum README `:104-127`、`tests/contracts/training-curriculum.test.ts:9-111`がこのNavigation / asset境界を検査する。

### 2.2 C01〜C12 inventory

| ID | Competency | Current part / level | Main lesson / exercise | Learner evidence / infrastructure | Completion evidence |
|---|---|---|---|---|---|
| C01 | Automation Purpose / Scope | P1 C01〜C10 L2、P2継続 | P1-1、候補3件 / 非自動化1件 | Workbook automation mapping | 価値、限界、Do not automateの理由 |
| C02 | Target / Specification Analysis | P1/P2 L2 | P1-2、Role / State / Data / Journey、Cart / Checkout分析 | `01_target-risk.csv`、Spec reference | BR / AC / Role / StateをOracleとして説明 |
| C03 | Risk Analysis | P1/P2 L2 | P1-3、Impact / Likelihood / priority | Workbook risk + capstone | RiskからCase / Layer / Automationへ接続 |
| C04 | Test Design | P1/P2 L2 | P1-3、10 cases、3 techniques以上 | `02_test-cases.csv` | EP / BVA / Decision / State / Roleを理由付きで選択 |
| C05 | Test Layer Selection | P1/P2 L2 | P1-3、少なくとも1件をUI E2E外へ | `03_automation-mapping.csv` | Unit / Contract / Component / Web / Native責務を説明 |
| C06 | Automation Selection | P1/P2 L2 | P1-1 / 3、Yes / Later / No | Workbook mapping | Risk、frequency、determinism、cost、maintenance理由 |
| C07 | Web Automation | P1/P2 L2 | P1-4 / 5、Playwright 2〜5件、Mobile | Training baseline / exercises / Artifact | Locator、Assertion、Reset、Evidenceが再現可能 |
| C08 | Native Automation | Current P1/P2 L2 | P1-7、Android flow、P1 capstone | Maestro baseline / learner exercise / physical device evidence | meaningful Native flow最低1本。共通Requiredかは後続Decision |
| C09 | Failure Analysis | P1/P2 L2 | P1-6、intentional / locator / timing failure | Trace / screenshot / console / memo | 分類、仮説、確認、改善、再発防止 |
| C10 | Maintainability | P1/P2 L2 | P1-8、3 problems / 1 improvement / lifecycle | diff、updated test、inventory | Flaky / duplication / responsibility / costの改善理由 |
| C11 | Change Management | P2 L2 | P2-1〜3、branch / diff / commit / PR / review | Git / GitHub history、PR description | Test資産変更を説明しReviewできる |
| C12 | Continuous Execution Design | P2 L2+、一部L3 | P2-4〜8、Web / Native CI、Gate、Artifact | Training workflow、CI Artifact、capstone design | Trigger、Gate、Platform、Cost、Reliabilityを説明 |

Rubric sourceは`docs/curriculum/test-automation/02_competency-rubric.md:15-69`。Part 1はC01〜C10、Part 2はC01〜C12である。個別Lesson本文にはC IDの直接記載がほぼなく、canonical P1 CapstoneのC01〜C10記載から逆算する必要がある。これは`GAP`であり、Competencyが不存在という意味ではない。

### 2.3 Lesson / exercise / completion chain

| Module | Learning objective → Scenario Shop use → exercise → artifact | Current boundary |
|---|---|---|
| P1-1 | Automation value / limit → Cart / Login / Checkout候補 → 3 automate + 1 do-not-automate → Workbook decision | Required |
| P1-2 | Role / State / Data / Journey → Storefront / Cart / Checkout探索 → Cart / Checkout analysis → target-risk | Required |
| P1-3 | Test design / layer / selection → Cart quantity、Payment state、Role matrix → 10 cases / 3 techniques / multiple layers → test-cases + mapping | Required |
| P1-4 | Minimal JS/TS / Playwright → product detail / cart → 2 learner tests / locator improvement → Training Playwright | Required |
| P1-5 | E2E implementation → Cart / Payment / Role / Mobile → 5 tests + Mobile → Playwright result / artifact | Required。A11yはadditional perspective |
| P1-6 | Failure diagnosis → expected / locator / timing failure → failure memo → Trace / screenshot / console | Required |
| P1-7 | Native transfer → Cart / boundary / restart → Maestro flow → physical Android evidence | Current Required、iOS Runtimeは非Required |
| P1-8 | Maintenance decision → Fixture / helper / flow / seed / virtual spec change → diagnose + improve + inventory → diff / rationale | Required。POM自体は非Required |
| P1-9 | Cart end-to-end trace → Spec / Risk / Layer / Web / Mobile / Android → capstone bundle | Core + Advanced tracks |
| P2-1〜3 | Development change → Part 1 asset → branch / commit / PR / review → Git evidence | Required |
| P2-4〜5 | CI / Web delivery → Training workflow → run / failure artifact / suite design → CI artifact | Required |
| P2-6 | Native CI → Android Runtime / iOS Build-only → workflow comparison / failure evidence | Current Required scope |
| P2-7〜8 | Gate / CD / integration → Scenario Shop CI → trade-off design → diagram / rationale / artifact lineage | Required、Agentic QA等はCore外 |

### 2.4 Learning volume and environment

- Part 1 canonical: 9 Lesson、約2,194 lines、48 objectives、約29 Hands-on。
- Part 2 canonical: 8 Lesson、約2,199 lines。
- P1-8単体: 383 lines、14 Lesson、6 Hands-on。
- P1 canonical Capstone: 約37 linesだが、Web / Mobile / Physical AndroidのEvidence chainを要求する。
- Web requirement: Node / pnpm / browser / Training port / Playwright。
- Native local requirement: physical Android、USB debug、JDK、Android SDK / ADB、Maestro、Release APK build / install。
- Part 2 requirement: Training Copy、Git / GitHub、Training Workflow、CI Artifact。外部LMSは前提にしない。
- 正式な想定時間、実測時間、講師支援量は未定義。負荷判断は項目 / concept / hands-on / environment / evidenceの構造値に限定する。

### 2.5 Formal implementation reveal timing

- P1前半はSeed / Reset / EvidenceをHarnessとして使用し、`e2e/web/fixtures.ts`の内部を答えとして読まない。`00_learning-design.md:191,221-243`。
- P1-4 / 5でLearnerが小さいPlaywright Testを書いた後、Formal Regressionと差分比較する。
- P1-6ではFixture内部よりFailure observationに集中する。
- P1-7でNativeのUI ID、Deep Link、Test Control、Flowを経験する。
- P1-8で初めてHelper、POM、Component Object、Fixture、Automation Flow、Seedを比較し、POMを必須にしない。
- CI / WorkflowはPart 2で完成実装と比較する。

設計意図は文書だけでなくExercise順にも現れる。ただしP1-8のlearner test volumeで十分な「痛み」が生じるか、P1 Capstoneのbaselineとlearner flowが同じCompetencyを測るかは後続Curriculum Review論点である。

## 3. Test Strategy / Perspective Evidence Inventory

### 3.1 Formal risk system

`docs/08_testing/test_strategy.md:3-22`は16件のPhase 1 riskを列挙するがstable Risk IDを持たない。以下では文書順の`R1`〜`R16`をaudit上の便宜的IDとして使い、Normative IDとして扱わない。

| Audit ID / risk | Spec / product rule area | Perspective / technique | Main formal layers / examples | Current CI gate |
|---|---|---|---|---|
| R1 Role / Ownership violation | Auth、Role、Admin User、Order ownership | Role Matrix、negative、state | Unit / Integration / Component / E2E #3/#12-14 / cross-role | Vitest + Chromium matrix |
| R2 Search / Filter result / page mismatch | Storefront、Admin query | Equivalence、boundary、facet、sort/page | Unit / Integration / Repository / Component / Web #1 / Native search | Vitest + Web / Native |
| R3 Price / Sale / member / shipping display | Storefront、Cart、Checkout | Equivalence、boundary、calculation | Unit pricing / Integration / Component / Web #1/#6 | Vitest + Chromium |
| R4 Oversell / double decrement | Inventory、Cart、Order | Boundary、data integrity、transaction | Unit / Integration / Repository transaction / Web #2/#11 / Native purchase | Vitest + Web / Native |
| R5 Cart / Checkout version mismatch | Cart、Checkout | State、conflict、recovery | Integration / Repository / Component / Web #6 / Native restart | Vitest + Web / Native |
| R6 Payment result / Order state mismatch | Checkout / Payment / Order | Decision、state、idempotency、recovery | Integration / Repository / Component / Web #4-7 / Native retry | Vitest + Web / Native |
| R7 Order / Shipment mismatch | Orders、Admin operations | State Transition、role、integrity | Unit / Integration / Component / Web #7/#11 / cross-role | Vitest + Chromium |
| R8 Review eligibility / summary / distribution | Reviews | Role、state、boundary、delta / rounding | Unit / Integration / Repository / Component / Web #8 / Native review | Vitest + Web / Native |
| R9 Product aggregate / SKU / image partial save | Admin catalog | Decision、transaction、rollback | Integration / Repository / Component / Web #9/#10 | Vitest + Chromium + build |
| R10 Guest Cart merge / Checkout resume | Auth、Cart、Checkout | State、role、transaction、idempotency | Integration / Repository / Web #3/#6 / Native session restart | Vitest + Web / Native |
| R11 Admin bulk / unsaved change | Admin catalog / operations | Decision、partial failure、navigation guard | Integration / Component / Web UI/UX / cross-role | Vitest + Chromium |
| R12 Keyboard / Focus / Mobile layout unusable | NFR accessibility / responsive | Role/name、keyboard、viewport boundary | Component / accessibility / mobile / UI review | Chromium matrix + UI review |
| R13 IndexedDB / UI reload mismatch | Web persistence | Persistence、recovery、reload | Repository / Component / Web reload flows | Vitest + Chromium |
| R14 boolean / null IndexedDB index misuse | Dexie schema / query | Contract、equivalence、unique/index | Repository Contract / static contract | Vitest |
| R15 Password hash / Seed auth contract mismatch | Authentication / seed | Format / verify、negative、contract | Unit / Integration / seed validation | Vitest |
| R16 Admin Page / Filter / Sort mismatch | Admin catalog / order / review / user query | Equivalence、boundary、sort/page | Integration / Repository / Component / Web admin flows | Vitest + Chromium |

R1〜R16はProduct ruleとのsemantic mappingであり、Formal test titleにRisk IDはない。Coverageの存在とTraceability metadataの存在を分ける必要がある。

### 3.2 Extracted test perspectives

#### Explicitly taught in Required Curriculum

- Normal / abnormal、equivalence partitioning、boundary value、Decision Table、State Transition、Role Matrix、Risk-based selection。
- Test Layer、Automate / Later / Do not automate、frequency、determinism、cost、maintenance。
- Locator / assertion / wait / failure evidence、responsive / mobile、supplementary accessibility。
- Persistence / reset / seed、Web / Native platform difference、CI trigger / gate / artifact。

Evidence: `docs/curriculum/test-automation/01_spreadsheet-test-design.md:212-317,384-398`、`part1/03_test-design-and-automation-selection.md:40-223,235-304`、`part1/05_playwright-e2e-practice.md:99-194`。

#### Used by Formal Regression but not explicit at the same curriculum depth

- Transaction rollback / FK / unique constraint。
- Idempotency、conflict recovery、clock consistency。
- Stable sort tie-break、facet aggregation、unrounded review average。
- Production bundle guard、artifact integrity / sanitizer、visual registry。
- Agentic QA trust boundary / canonical artifact chain。
- Native stale response / restart persistence / production validation。

これらはFormal Product Qualityに必要でもLearner Coreへ自動昇格しない。

#### Suggested by Specification but thin or absent as Required exercise

- Search suggestionとviewer / clock-aware facet / sort。
- Securityはleast privilege / secret boundaryのstatic contract中心で、dynamic security exerciseはRequiredでない。
- PerformanceはStrategy記述があるがexecutable benchmark / learner outcomeは確認できない。
- Manual Screen ReaderのRepository-contained Required Evidenceはない。
- Concurrencyはtransaction / conflictとしてFormalに存在するが、一般的なconcurrency curriculum moduleはない。

### 3.3 Test design technique evidence

| Technique | Curriculum explanation / exercise | Scenario Shop application | Formal manifestation | Trace status |
|---|---|---|---|---|
| Equivalence Partitioning | Spreadsheet reference、P1-3 Cart | visibility、valid/invalid quantity、filter group | Unit / repository / component cases | Behavior exists、Technique IDなし |
| Boundary Value Analysis | P1-3 0/1/5/6、P1-5 | quantity、stock、text、viewport、page | Unit、Component、mobile / Cart E2E | Strong behavior、metadata gap |
| Decision Table | P1-3 Payment / Role | rejection reason、status / permission combinations | Integration / component / E2E | Strong behavior、metadata gap |
| State Transition | P1-2/3 Checkout / Order | checkout、payment、shipment、review lifecycle | Unit / Integration / Web / Native | Strong behavior、metadata gap |
| Role Matrix | P1-2/3 auth / admin | guest / customer / operator / admin / suspended | Integration / Web / cross-role | Strong behavior、metadata gap |
| Risk Based Testing | P1-1/3 / Capstones | Risk → layer / automate / evidence | Strategy layer assignment / CI | Explicit curriculum、Risk stable IDなし |

CurriculumはTechnique一覧を機械的に当てはめるだけではなく、Spec / Riskから条件を考え、Layerとautomationを選ばせる。`part1/03_test-design-and-automation-selection.md:140-223,270-282`は「全部E2E」「全部Unit」を否定する。一方、Rubricの5技法使い分けとLessonの3技法Practice量は後続Review対象である。

### 3.4 Actual test layer inventory

Static declaration概算であり、parameterized caseの展開数ではない。

| Layer | Files / declarations | Purpose / representative files | CI timing / gate |
|---|---:|---|---|
| Unit | 13 / 45 | pricing、permission、visibility、state、hash | Vitest matrix、PR / push required |
| Application Integration | 9 / 54 | catalog、auth、cart、checkout / payment、review / user、admin | Vitest matrix、required |
| Repository Contract | 5 / 25 | Dexie / SQLite CRUD、transaction、sort/page/facet | Vitest matrix、required |
| Component | 24 / 130 | form、screen、error、focus、Web / Native component | Vitest / Jest contract jobs、required |
| Static / Operational Contract | 31 / 229 | architecture、workflow、config、test API、artifact、spec / curriculum | Vitest / style / code quality、required |
| Runtime | 1 / 1 | Agentic QA deterministic preparation | Required Chromium job preparation step |
| Formal Web E2E | 8 files / 41 tests | required、A11y、mobile、cross-role、UI review、smoke | Chromium matrix / UI review / smoke; aggregate verify |
| Training Playwright | 3 files / 3 tests | baseline、starter exercise、expected failure | BaselineはPR matrix; exercisesはlearner path |
| Formal Maestro | 23 YAML | Android storefront / cart / purchase / review / recovery / control | Native change / dispatch; Android runtime required |
| Training Maestro | 2 YAML + failure README | baseline + learner exercise | Baseline reused in Native CI / template; exercise local |
| Deployed / Production smoke | Playwright smoke | build metadata / representative routes | local production smoke required、deploy smoke after deployment |
| Accessibility | 4 formal E2E tests + component semantics | axe、keyboard、focus | PR Chromium matrix |
| Responsive / Navigation | 4 mobile tests + UI review | breakpoints、logout route guard、page end | PR Chromium matrix / UI review |
| Platform parity | shared contract / Native repo / Maestro | business semantics and capability surface | Vitest + Native CI; no pixel parity gate |

`docs/08_testing/test_strategy.md:24-34`の現行表はUnit、Application、Repository、Static Asset、Component、Web E2E、Deployed Smokeまでで、Native E2E、Training、Platform parity、operational static contractを列挙しない。実装が存在しないのではなく、Strategy inventoryがCurrent suiteへ追随していない。

### 3.5 Formal Regression / Training Test boundary

| Concern | Formal | Training | Boundary evidence |
|---|---|---|---|
| Directory | `e2e/web/`、`maestro/`、`tests/` | `training/playwright/`、`training/maestro/` | Separate roots |
| Config | `playwright.config.ts` | `playwright.training.config.ts` | Separate project / testDir |
| Web runtime | port 8081 | port 8082 | Config and CI env fail closed |
| Native runtime | Formal Android APK / emulator | Local physical device baseline; CI may reuse Formal runtime | Same infrastructure allowed, distinct flow/artifact |
| Artifact | `output/playwright` / Native runtime artifact | `output/training/playwright` / Training baseline artifact | Separate paths / upload names |
| Gate | Product regression | Curriculum validator + baseline harness health | Learner exercise is not Formal gate |
| Modification | Maintainer-owned | Learner-owned Training Copy | Curriculum / workflow contract |

`tests/contracts/training-curriculum.test.ts:35-56`はTraining config / Workflowが`e2e/web/`を含まないことを検査する。Native Formal CI内でTraining baselineを実行すること自体は、User-resolved Q6によりMismatchではない。

### 3.6 Web / Native guarantee

- Shared: Domain/Application business semantics、repository / transaction contracts、seed dataset / metadata、role / state / price / inventory rules。
- Web: Expo Web / DOM / CSS / Dexie / IndexedDB、Playwright、Chromium required、Mobile boundary / A11y / UI review、cross-browser extended / smoke。
- Android: Release build + install + Runtime / Maestro。Native repository / component / contract testsもformal guarantee。
- iOS: Automation / Production Simulator Build-only、metadata / bundle guard。Simulator launch / Runtime / Maestro PASSは保証外。
- Pixel parity: non-goal。Business meaning、information order、Product Rule、basic shared token conceptを合わせ、Navigation / Header / platform component / DOM / Native conventionは異なってよい。

Current top-level Native workflowはNative変更時に`.github/workflows/native-ios-ci.yml`を`workflow_call`し、`native-ci.yml:2055-2078`がiOS successを要求する。Curriculumのmanual-only記述との差は`MISMATCH`だが、iOS RuntimeをRequiredにする根拠ではない。

### 3.7 Representative duplicate coverage

重複の必要性は後続Reviewで判断する。

| Business area | Lower layers | Component | Web E2E | Native | Preliminary evidence classification |
|---|---|---|---|---|---|
| Cart | quantity / merge unit、use case、Dexie / SQLite transaction | Web / Native cart screens | #2 / #3 / #6 | cart / limit / low-stock | Defense in depth + platform contract; some learner repetition |
| Inventory | state / boundary、admin use case、repository | admin inventory | #6 / #11 / cross-role | out-of-stock / purchase | Intentional integrity layers |
| Checkout / Payment | use case / idempotency / transaction | Web / Native checkout | #4-7 | purchase / retry / restart | Intentional state / recovery depth |
| Order | state transitions / repository snapshots | order pages / screens | #7 / #11 / cross-role | purchase / restart | Intentional business + UI state |
| Review | eligibility / summary / delta | customer / admin / Native | #8 / cross-role | native-review | Intentional role + aggregation depth |
| Auth / Role | policy / auth integration | login / admin / Native | #3 / #12-14 / cross-role | login paths / contracts | Intentional security / role boundary |
| Product | aggregate / asset / repository | admin editor / storefront | #1 / #9 / #10 | storefront / detail | Formal depth; UI duplication platform-specific |
| Search / Filter | domain / app / repository facet | catalog / combobox | #1 / mobile | native-search / storefront | Shared semantics + platform-specific UX |

No widespread fixed sleep or unstable point locator was found: Playwright locator inventory observed `getByRole` 286、`getByLabel` 69、`getByText` 45、`waitForTimeout` 0; Maestro ID selector 255、text 21、point 0。これは全Locatorのquality guaranteeではないが、指定debt候補を裏付ける広範なEvidenceはなかった。

## 4. Technical Debt Evidence Inventory

以下はReview候補であり、Refactor必須判定ではない。

### 4.1 Native customer application repositories

- Path / size: `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`、2,643 lines / 98,414 bytes。
- Responsibilities: User、Session、Address、Product、Review Summary、Inventory、Cart、Checkout、Order、Sequence、Payment、Shipment、Reviewの13 repository、row mapping、unsupported Admin placeholder、10 transaction scope、runner、factory。
- Public surface: `NativeCustomerApplicationRepositories` type `:2561`、`NativeCustomerTransactionRunner` `:2616`、`createNativeCustomerApplicationRepositories` `:2635`。
- Transaction: `NativeRepositoryContext.write` `:142-146`、scope list `:204-224`、runner `:2617-2632`。
- Callers: `src/bootstrap/native-runtime.ts:19,104`、`src/test-controls/native-contract-harness-runner.native.ts:18,301`。
- Contracts / tests: shared domain repository and application transaction contracts、`docs/spec/features/native-customer.md:9-18`、ADR-0009、`tests/repository-contract/native-customer-shared.test.ts`、`tests/contracts/native-customer-application-repositories.test.ts`、`native-sqlite-transactions.test.ts`。
- Change risk / why: 一ファイル変更がほぼ全Native customer capability、mapping、transaction boundaryへ波及し得る。
- Classification: `COMPLEXITY` / dependency concentration / `CANDIDATE`。AggregationがNative composition designへ違反するEvidenceはない。

### 4.2 Native customer catalog / compatibility repository

- Path / size: `src/infrastructure/database/sqlite/native-customer-repositories.ts`、1,041 lines / 38,185 bytes。
- Responsibilities: catalog home/search/suggest/detail/category、visibility / price mapping、Guest Cart compatibility API、cart transaction mutation。
- Public surface: `NativeCustomerSQLiteRepository` `:209`、methods `getHome`、`search`、`suggest`、`getProductDetail`、`getCategoryName`、`getCart`、`addItem`、`updateQuantity`、`removeItem`、schema version export `:1041`。
- Transaction: add `:439-498`、quantity update `:557-596`、Guest cart creation `:853-900`。
- Callers: `src/bootstrap/native-runtime.ts:18,103`、Native contract harness `:19,156,169-196`。
- Contracts / tests: `src/application/native/guest-storefront.ts:91`、Native spec、`native-customer-shared.test.ts`、`native-sqlite-transactions.test.ts`。
- Change risk / why: CatalogとCompatibility Guest Cartが同じclassにあり、production main Cart pathとcontract harness pathが異なる。
- Classification: `COMPLEXITY` / `DUPLICATION` / compatibility surface / `CANDIDATE`。削除期限はなく、production caller不在だけでdead codeとしない。

### 4.3 Native purchase screens

- Path / size: `src/presentation/native/native-purchase-screens.tsx`、1,438 lines / 53,024 bytes。
- Responsibilities / public surface: Login `:146`、Signup `:229`、Profile `:282`、Addresses `:397`、Checkout address/payment/confirm/processing/complete/failed `:697-1002`、Orders `:1106`、Order detail `:1149`、Review `:1302`の13 screens。
- Dependencies / callers: `src/presentation/native-route.native.tsx:17-25`、Native runtime、CheckoutOrder / Review use cases、domain checkout / review contracts。
- Tests: `tests/component/native/native-purchase-screens.test.tsx`、`native-runtime-service-surface.test.ts`、`expo-router-public-imports.test.ts`、purchase / retry / review Maestro。
- Change risk / why: Auth、Account、Checkout、Order、Reviewがshared provider / navigation / helperを通じて同一moduleに集中する。
- Classification: `COMPLEXITY` / `CANDIDATE`。purchase service boundaryとしての意図的groupingの可能性がある。

### 4.4 Native storefront screens

- Path / size: `src/presentation/native/native-screens.tsx`、1,229 lines / 44,864 bytes。
- Responsibilities / public surface: Home `:30`、Catalog `:118`、Search `:292`、Product detail `:583`、Cart `:777`、Guide `:969`、Legal `:981`、Unsupported `:992`。
- Dependencies / callers: `src/presentation/native-route.native.tsx:3-10`、Catalog / Cart use cases、Native runtime。
- Tests: Native catalog / product / cart component tests、`tests/contracts/native-visual-contract.test.ts`、storefront / search / cart Maestro。
- Change risk / why: Storefront、Search、Product、Cartとshared product / filter helperが同じfileへ集中する。
- Classification: `COMPLEXITY` / `CANDIDATE`。Platform presentation groupingはArchitecture意図と整合し、Web共通化を前提にしない。

### 4.5 Admin product pages

- Path / size: `src/presentation/pages/admin-product-pages.tsx`、1,220 lines / 44,325 bytes。
- Responsibilities / public surface: Products list `:47`、New `:335`、Edit `:413`、internal `ProductEditor` `:570-1155`約586 lines。Dirty navigation、beforeunload/history、preview、asset、variant、status / saveを管理。
- Callers: `app/admin/products/index.tsx`、`new.tsx`、`[productId].tsx`。
- Contracts / tests: AdminProductUseCases、`docs/spec/features/admin-catalog.md`、`tests/component/admin-product-pages.test.tsx`、formal E2E #9/#10、UI/UX dirty-navigation flows。
- Change risk / why: Browser history / focus / dirty guardと大きなform stateが結合し、list/new/edit変更面が交差する。
- Classification: `COMPLEXITY` / `CANDIDATE`。ProductEditorは意味のあるcohesive UI boundaryでもある。

### 4.6 Checkout / Order use case

- Path / size: `src/application/use-cases/checkout-order-use-cases.ts`、631 lines / 22,876 bytes。
- Public surface: `CheckoutOrderUseCases` `:84`、`resolveCheckoutResultKind` `:60`、12 dependencies `:41-54`、start / active / address / payment / confirmation / begin / resume / retry / list / get methods。
- Transaction boundaries: `:107,183,320,405,498`でcheckout start、order creation、retry / idempotency、state recoveryを覆う。
- Callers: service factory、Native runtime、Web checkout pages、Native purchase screens、contract harness。
- Contracts / tests: Checkout / Payment / Order specs、`checkout-order-use-cases.test.ts`、Web / Native component、E2E #4-7、purchase / retry / restart Maestro。
- Change risk / why: Checkout、Payment、Order read/recoveryと多数repository / gateway / clock / ID dependencyが同一lifecycleへ集中する。
- Classification: `COMPLEXITY` / `CANDIDATE`。責務はcustomer purchase lifecycleとして関連している。

### 4.7 Review / User use cases

- Path / size: `src/application/use-cases/review-user-use-cases.ts`、706 lines / 22,915 bytes。
- Public surface: `CustomerReviewUseCases` `:48`、`AdminReviewUseCases` `:335`、`AdminUserUseCases` `:502`、約13 public methods。
- Responsibilities: customer eligibility / CRUD、admin review search / visibility / bulk、admin user rank / role / suspension。
- Transaction: customer review `:119,169,200`、review visibility `:404`、user changes `:536,562,597`。
- Callers / tests: service factory、Native runtime / screens、Web pages、contract harness、`review-user-use-cases.test.ts`、review/user component、E2E #8/#12 / cross-role、Native review。
- Contracts: Review / Admin User specs、Acceptance Criteria。
- Change risk / why: Customer Review、Admin Review、Admin Userという異なるaccess surfaceがshared dependency / identity / transactionへ集中する。
- Classification: responsibility concentration / `COMPLEXITY` / `CANDIDATE`。

### 4.8 Admin product use case

- Path / size: `src/application/use-cases/admin-product-use-cases.ts`、618 lines / 21,082 bytes。
- Public surface: `AdminProductUseCases` `:61`、search / edit / asset / create / update / status / bulk / delete / duplicate / previewの10 operations。
- Responsibilities: aggregate validation / mutation、image asset、publishability、non-persistent preview、bulk result aggregation。
- Transaction: create `:121`、update `:170`、status `:208`、draft delete `:245`。
- Callers / tests: service factory、Admin Product pages、integration / component、E2E #9/#10、UI/UX product flows。
- Contracts: `docs/spec/features/admin-catalog.md:9-17,210-224`。
- Change risk / why: Persistent aggregate mutation、preview、bulk operationが同じclassへ集約する。
- Classification: `COMPLEXITY` / `CANDIDATE`。同じAdmin Product capability内のcohesionもある。

### 4.9 Native CI workflow

- Path / size: `.github/workflows/native-ci.yml`、2,087 lines / 97,124 bytes。
- Public / job surface: detect `:34`、native-static `:107`、automation build `:140`、production build `:353`、bundle guard `:550`、Android runtime `:633`、reusable iOS `:2031`、verify `:2039`。Actual 8 jobs、Maestro helper call 18 occurrences。
- Responsibilities: change detection、static / component contract、two builds、production bundle guard、Android emulator / Maestro、Training baseline、visual / failure artifact、iOS Build-only、fail-closed verify。
- Related contracts/tests: `native-ci-workflow.test.ts`、`ci-workflow.test.ts`、`native-test-control-maestro.test.ts`、ADR-0011、`native-ios-ci.yml`、Training Native workflow。
- Change risk / why: Build/runtime/artifact/gate changesが一fileへ集中し、Native change pathで高いblast radiusを持つ。
- Classification: `COMPLEXITY` / `CANDIDATE`。Formal / Training shared infrastructure自体はdebtではない。Current iOS教材差は`MISMATCH`。

### 4.10 Global Web CSS

- Path / size: `src/presentation/styles/global.css`、5,160 lines / 84,324 bytes。
- Structure: 823 selector lines、474 unique selector-line forms、13 media query blocks。
- Responsibilities: token / primitive、Storefront / Admin shell、form / dialog / table / pagination、product / cart / checkout / review、responsive / accessibility visual states。
- Caller / tests: `src/presentation/root-layout.web.tsx:3`、Web component / E2E / UI reviewが間接検証。
- Change risk / why: Cascadeとbreakpoint overrideのlocal reasoning costが高い可能性。
- Classification: `COMPLEXITY` / `CANDIDATE`。Repeated selectorはresponsive overrideを含み、dead CSSや分割必須を確認していない。

### 4.11 Seed SSOT

- Paths / size: `src/seeds/default-dataset.ts` 842 lines、`scenarios.ts` 657、`metadata.ts` 462、合計1,961 lines / 64,384 bytes。Metadataは約30 scenarioを管理。
- Public surface: `createDefaultDataset` `default-dataset.ts:683`、`createScenarioDataset` `scenarios.ts:20`、`SCENARIO_METADATA` `metadata.ts:74`、scenario type/list/guards `:407-460`。
- Responsibilities: base user / product / order / review / payment、scenario overlay、fixed clock、guest identity、payment delay、Guide metadata、version。
- Callers: SQLite seed、Web seed loader、Test Control、Native reset / contract harness、E2E fixture、integration / repository tests。
- Tests: `tests/integration/seeds.test.ts`、storefront / Native repository、UI/UX flow、SQLite transaction contracts。
- Change risk / why: Web、Native、Formal、Training、Guide / Curriculum exampleへ同時波及するhigh fan-in SSOT。
- Classification: dependency concentration / `COMPLEXITY` / `CANDIDATE`。Version 11実装とdoc 9 / Changelog 10は`MISMATCH`。

### 4.12 Agentic QA Harness

- Path / size: `scripts/agentic-qa/`、26 files / 9,375 lines / 347,839 bytes。Largestは`contracts.ts` 1,854、`prepare-challenge.ts` 1,215、`official-verification.ts` 1,154、`evaluate.ts` 1,151 lines。
- Responsibilities / public surface: Zod contracts、challenge preparation、learner bundle、isolation、resource boundary、runner input/output、trusted evidence、canonical manifest、official verification、black-box evaluation / scoring。
- Callers / tests: `package.json:25,54`、`.github/workflows/ci.yml:355-357`、`spec-agentic-qa.test.ts`、`official-black-box-contracts.test.ts`、`official-artifact-chain.test.ts`、runtime preparation test。
- Contracts: ADR-0012 / ADR-0015、`docs/reference/agentic-qa-workflow.md`、Optional Curriculum `part1/09_specification-agentic-qa.md`。
- Change risk / why: Schema / trust / artifact / scoringの小変更がpreparationからverificationまで波及する。
- Classification: operational contract / `COMPLEXITY` / `CANDIDATE`。ADR上のdeterministic supporting harness責務と整合し、Required Curriculum Coreではない。

### 4.13 Maestro cleanup helpers

- Formal: `scripts/native/android-maestro-run.sh` 99 lines / 2,656 bytes。force-stop、pm clear、process poll、Maestro / JUnitを実行し、Native CIで18回参照。
- Training: `scripts/training/run-maestro-baseline.ts` 135 lines / 4,620 bytes + `maestro-invocation.ts` 37 lines / 970 bytes。explicit Windows physical serial、readiness、cleanup、quoting、Training outputを扱う。
- Contracts / tests: `training/maestro/baseline/`、exercise、Training workflow、curriculum validator / contract test。
- Change risk / why: Cleanup semanticsがBash / TypeScriptへ重複し、driftの可能性がある。
- Classification: `DUPLICATION` / `CANDIDATE`。Linux CIとWindows physical-deviceのplatform差が重複理由であり、current failureや意味不一致は確認していない。

### 4.14 Web E2E fixture

- Path / size: `e2e/web/fixtures.ts`、142 lines / 5,602 bytes。
- Public surface: extended `test` `:11`、`expect` `:74`、`login` `:76`、session / address / checkout / mobile helpers。
- Responsibilities: explicit scenario reset / metadata、guest / session identity、context cleanup、console / pageerror collection、artifact attachment、postcondition。
- Callers: accessibility、cross-role、mobile、phase1-required、ui-review、ui-ux-improvementsの6 files。
- Contract / tests: `window.__TEST_API__.reset`、metadata validation。Scenario未使用testは`:60`でfail closed。
- Change risk / why: 小規模だが全Web formal scenario E2Eのshared prerequisite / artifactへ波及する。
- Classification: dependency concentration / `FACT` / `CANDIDATE`。Hidden global stateではなくexplicit resetを持つ。

### 4.15 Dexie / SQLite adapters

- Dexie: 10 files / 3,530 lines / 124,223 bytes。`cart-checkout-repositories.ts` 842、`product-repositories.ts` 694、`basic-repositories.ts` 546、`order-review-repositories.ts` 486、`storefront-repositories.ts` 450。Factory `application-repositories.ts:29`、transaction runner `transaction-runner.ts:131`。
- SQLite: 6 files / 4,955 lines / 185,272 bytes。Repository 2 filesに加え、seed 511、mappers 346、schema 337、database 77。
- Responsibilities: 同じApplication repository / transaction contractsをIndexedDBとSQLiteの異なるmodelへ実装。
- Callers / tests: Browser / Native composition roots、application integration、repository contract、SQLite schema / mapper / transaction contracts。
- Change risk / why: Shared business contract変更時に両adapterのsemantic parityを考慮する必要がある。
- Classification: intentional platform `DUPLICATION` / `CANDIDATE`。DexieのNative importやUI共通化を解決策として前提にしない。

### 4.16 Domain → Application type dependency

- Paths: `src/domain/repositories/contracts.ts:94,125,197`、`src/domain/policies/permissions.ts:8`。
- Responsibility: Domain repository / policyがApplicationのDTO / viewer typeをtype importする4 references / 2 files。
- Related contract test: `tests/contracts/architecture.test.ts`はApplication→Infrastructure/DexieやNative→Webを検査するが、Domain→Application directionをrejectしない。
- Change risk / why: Domain contractとApplication DTOの変更方向が読み取りにくくなる可能性。
- Classification: `CANDIDATE` / `QUESTION`。Runtime circular dependencyは確認せず、Architecture violationとして確定しない。

## 5. Traceability Matrix

| Learning objective | Competency | Product rule / AC | Risk | Perspective / technique | Test layer | Training | Formal regression | CI |
|---|---|---|---|---|---|---|---|---|
| Storefront visibility / search / filter / priceをSpecから分析 | C02-C07 | `docs/spec/features/storefront.md:9-19,206-220` BR/AC-STOREFRONT | R2/R3 | EP、BVA、facet、stable sort | Unit / Integration / Repository / Component / Web / Native | P1-2/3/4/5、Workbook、starter spec | catalog integration、storefront repository、Web #1、mobile、`native-storefront.yaml` / search | Web Vitest / Chromium、Native runtime |
| Cart quantity / invalid item / Guest mergeを設計 | C02-C08 | `docs/spec/features/cart.md:9-19,70-84` BR/AC-CART | R4/R5/R10 | BVA 0/1/5/6、state、role、decision | Unit / Integration / Repository / Component / Web / Native | P1-2/3/5/7/9、Workbook、Native exercise | cart use case / transaction、Web #2/#3/#6、cart / low-stock / reset Maestro | Web + Native required jobs |
| Checkout / Payment success / fail / retryをstateで設計 | C03-C09 | `checkout-and-payment.md:9-19,238-254`、Order spec | R5/R6 | Decision、State、idempotency、recovery | Integration / Repository / Component / Web / Native | P1-3/5/6、expected failure | checkout integration、Web #4-7、purchase / retry / restart Maestro | Web + Native required jobs |
| Auth / Role / Ownershipのallowed / deniedを説明 | C02-C08 | `authentication.md:9-15,116-124`、roles spec | R1/R15 | Role Matrix、negative、state、boundary | Unit / Integration / Component / Web / Native contract | P1-2/3/5 | auth integration、Web #3/#12-14、cross-role、Native contract | Vitest + Chromium + Native |
| Inventory / Order / Review整合をLayer選択 | C02-C10 | inventory / orders / reviews BR/AC | R4/R7/R8/R16 | boundary、state、role、data integrity、recovery | Unit / Integration / Repository / Component / Web / Native | P1-3/5/6/8 / Capstone extension | admin operations、review use case、Web #8/#11 / cross-role、purchase / review Maestro | Web + Native aggregate |
| Accessibility / Mobile riskを代表条件で確認 | C02/C04/C07 | A11y / UI NFR、`test_strategy.md:85-87` | R12 | role/name、keyboard、focus、viewport boundary | Component / A11y / mobile / UI review | P1-5 mobile、A11y supplementary | accessibility 4 tests、mobile 4、UI review capture | Chromium matrix + UI review |
| Native shared semanticsとplatform guaranteeを説明 | C08/C12 | `native-customer.md:9-18,25-33`、ADR-0009/0011 | platform/runtime/build risk | parity contract、persistence、build/runtime boundary | Native Component / Repository / Android E2E / iOS Build | P1-7、P2-6、baseline / exercise | Native contracts、formal Maestro、iOS builds | Native verify requires Android Runtime + iOS Build-only |
| Maintainability / CI: Failure / maintenanceをDevelopment Processへ接続 | C09-C12 | Test strategy / traceability / testability contracts | regression / delivery risk | diagnostic、cost、gate、artifact、fail-closed | Contract / E2E / Workflow / Runtime | P1-6/8、P2-1〜8 | architecture / workflow / config / sanitizer / runtime tests | Web verify / Native verify / Training templates |

### Reverse trace observations

- Formal-heavy but Curriculum-thin: Search suggestion、viewer / clock facet、Native stale response、SQLite transaction / FK、production bundle guard、artifact sanitizer、Agentic artifact chain。
- Curriculum-explicit but machine trace-thin: Technique names、C01〜C12 lesson mapping、Do not automate decisionのformal metadata。
- Product behavior with limited Required exercise: dynamic security、performance benchmark、manual Screen Reader。これらがCurriculum Required outcomeでない限り、absence自体をGapとしない。
- Workbook repository sampleはCart 1 row、automation=`Later`、execution=`Not run`、evidence空であり、template / starterであってLearner completion evidenceではない。

## 6. Confirmed Mismatches / Gaps

以下はCurrent repositoryから確認できたものだけであり、修正対象の優先度は確定しない。

| Classification | Confirmed item | Evidence | Impact boundary |
|---|---|---|---|
| `MISMATCH` | Required E2E 12というCurrent文書に対し、`phase1-required.spec.ts`は14 tests、required commandは`ui-ux-improvements.spec.ts` 13 testsも含む | `docs/08_testing/e2e_design.md:12-35`; `test_strategy.md:67-75`; `requirements_traceability.md:48-91`; `e2e/web/phase1-required.spec.ts:12-270`; `playwright.config.ts:40-45` | Formal strategy / curriculumが現行Gate規模を誤認し得る |
| `MISMATCH` | Cross-roleをPR外とする文書と、PR Chromium matrix / verifyがcross-roleをrequired jobへ含める現状 | `e2e_design.md:29-35`; `.github/workflows/ci.yml:303-322,539-590` | C12 / CI cost判断に影響 |
| `MISMATCH` | Project名`chromium-desktop`等と現行`chromium` / `mobile-chromium` / `cross-role-chromium`等の差 | `e2e_design.md:3-10`; `playwright.config.ts:40-104` | Learner / maintainer command理解 |
| `MISMATCH` | Seed Version 9 / Changelog 10 / Current implementation & integration test 11 | `docs/07_testability/seed_catalog.md:9`; `CHANGELOG.md:8`; `src/config/versions.ts:4`; `tests/integration/seeds.test.ts:126` | Fixed seed expectation / Curriculum example |
| `MISMATCH` | Test strategy / acceptance / E2E文書がNativeをfuture / Phase 1外として扱う | `e2e_design.md:59-61`; `acceptance_criteria.md:146-159`; Current Native spec / ADR / workflow | Current formal guaranteeの説明差 |
| `MISMATCH` | CurriculumがiOS manual-only / PR Required外と説明するが、Current Native changeはiOS Build-only successを要求 | `part2/06_native-ci-maestro.md:40-46,340-348`; `part2/08_integration-design-capstone.md:17-25`; ADR-0011; `native-ci.yml:2031-2078` | C12 / Required / Manual判断。iOS Runtimeは依然非保証 |
| `GAP` | Requirement/Test IDからProduct Regression codeへのdirect reference不足 | `requirements_traceability.md:3-5,48-94`; Product test titlesにはWE-CORE / UT / CT / BR / ACが原則ない | Coverage absenceではなくmachine trace absence |
| `GAP` | Lesson→Competency→Minimum Evidenceのdirect mapping不足 | `02_competency-rubric.md:15-59`; individual lessons; `validate-curriculum.ts:487-556` | Instructor assessmentの再構成が必要 |
| `GAP` | Technique→Formal Test mapping metadata不足 | Curriculum technique sections vs Formal test titles | Behavioral coverageとdesign rationaleを直接追跡できない |
| `GAP` | Training Native exercise YAMLにdirect package / workflow entryと提出Artifact契約が薄い | `training/maestro/exercises/native-training-exercise.yaml`; `package.json:41`; Training native workflow | Baselineとlearner exerciseを区別した評価が難しい |
| `GAP` | Native failure exerciseはREADMEのみでexecutable flowがない | `training/maestro/failure-exercises/README.md` | Web expected-failureと非対称。RequiredかはCurriculum判断次第 |
| `GAP` | Test Strategy layer tableがCurrent Native / Training / parity / operational contractを含まない | `test_strategy.md:24-34`; actual inventory | Strategy coverage / cost / gateの全体像不足 |
| `CANDIDATE` / `QUESTION` | Domain→Application type dependency 4 refsをArchitecture contractが検査しない | Domain contracts/policy imports、`tests/contracts/architecture.test.ts` | Runtime cycle / violationは未確認 |
| `MISMATCH` limited | Legacy P1 CapstoneはMaestro 2 flows、canonical / Rubricはmeaningful 1 flow | `part1/10_part1-capstone.md`; `part1/09_part1-capstone.md`; rubric | LegacyはRequired Navigation外なのでCurrent completionへ影響しない |

Current stateから除外した過去Findingもある。2026-08-20 Native Catalog / Checkout audit findingsは2026-08-22 implementation / validation evidenceとCurrent codeで解消済みのため、本ReportのCurrent mismatchへ再利用しない。

## 7. Open Questions / Resolved Assumptions

### Resolved assumptions

| Original question | Resolved direction | Audit consequence |
|---|---|---|
| Phase 1文書はHistorical Snapshotか | 明示history / archive / legacy以外はCurrent Documentation | Native future、件数、project、seed、CI差をDrift / Mismatchとして扱う |
| Learner evidenceはどこに保存するか | Training / Local Copy、Workbook、Learner tests、Playwright / Maestro / CI artifacts、Part 2 Git history、Instructor rubric | 外部LMSを仮定せず、提出物→Competencyが曖昧ならCurriculum issue |
| 学習時間 / 支援量はあるか | 正式値なし | 架空時間を置かず、concept / hands-on / environment / evidenceで構造評価 |
| Native exercise canonical entryは何か | Local physical Android + Maestro。BaselineはHarness、ExerciseはLearner編集対象 | Baselineだけの実行をC08 evidenceにしない。教材から読めなければGap |
| Screen Reader / security / performance evidenceは外部にあるか | Repository外正式基盤を仮定しない | Required outcomeでなければabsenceを問題にしない |
| Compatibility API / shared runtimeの扱い | Cart compatibilityに期限なし。Formal / Training shared CI infrastructureは境界明確なら可 | 古さ・shared runnerだけでdebt / mismatchとしない |
| Full Web / Native Pixel Parity | 非保証。Business semantics / information / ruleを合わせ、platform UI差を許容 | Pixel mismatchをGap / Curriculum goalにしない |

### Remaining open questions

- Common graduation requirementをWeb + Nativeとするか、generic Test Automation Engineerとするか。これは後続Curriculum変更Decision A/Bで確定する。
- Learner pilotの完了時間、講師支援量、Environment block、再提出理由。Repositoryには実測値がない。
- C01〜C12のMinimum EvidenceをどのgranularityでInstructorが採点し、講師間差をどう較正するか。
- Requirement / Risk / Technique metadataをFormal test title、manifest、別matrixのどこへ置くか。Gapは確認したが解決方式は未決。
- Domain→Application type dependencyを意図的contract sharingとするか、Architecture directionとして制約するか。Runtime cycleはない。
- Native Guest Cart compatibility surfaceの長期owner / change protocol。削除期限は設定しない。
- Test Strategy / acceptance / testability Current documentationのownerと更新cadence。

## 8. Next Review Inputs

### 8.1 Curriculum Reviewへ渡すEvidence

- Current North Star、C01〜C12、Required 22 docs、P1 9 / P2 8 Lessonのobjective / exercise / completion。
- Part 1 / Part 2の概算量、P1-5 / P1-7 / P1-8 / Capstoneの集中、physical Android barrier。
- Lesson→Competency→Minimum Evidence gap、baseline / exercise非対称、iOS Current Gate drift。
- Agentic QA、SQLite / bundle guard / sanitizer等Formal-heavy contractをLearner Coreへ自動昇格しない境界。
- Decision A/B: Web + Native common graduateか、generic Test Automation Engineer + Native specializationか。

不足情報はpilot dataとprimary graduation roleのorganizational decisionである。これらがなくても構造的validity reviewは可能だが、Native Required / Optionalの最終決定は組織判断を伴う。

### 8.2 Test Strategy / Perspective Reviewへ渡すEvidence

- Risk 16件、stable ID不在、Current layer inventory、CI trigger / gate。
- Taught techniqueとFormal behaviorの対応、Technique / Requirement direct trace gap。
- Unit〜Native / A11y / Mobile / parity / operational contractのactual coverage。
- Formal / Training boundary、Seed / Test Control / Clock / Inspection、Web / Android / iOS guarantee。
- Cart、Inventory、Checkout、Payment、Order、Review、Auth、Product、Searchのduplicate coverage examples。
- StrategyがNative / Training / operational layerへ追随していないCurrent mismatch。

不足情報はRisk owner、Risk acceptance / residual risk、test runtime / flake / defect-detection実測、manual QA / production monitoring evidenceである。

### 8.3 Refactoring Reviewへ渡すEvidence

- 指定Hotspotのpath / size / public API / callers / transaction / tests / recent artifact references。
- Dexie / SQLiteのintentional platform duplication、compatibility surface、shared Seed / Test Control / Harness fan-in。
- Native CI、global CSS、Agentic QA、Maestro cleanup、E2E fixtureの責務と境界。
- Architecture import directionとDomain→Application type reference。
- Product / Formal debt、Training intentional complexity、Legacy / compatibility、currently harmless structureの区別。

不足情報はGit historyに基づく実際のchurn / defect density、runtime performance profile、flake trend、owner cognitive costである。後続Reviewでも、sizeだけを理由に分割せず、変更頻度、契約、failure history、blast radiusを組み合わせる必要がある。

## Audit limits

- 本調査は静的Repository Evidenceと保存済みRun / CI resultを中心とし、新規Runtime exploratory QAを実行していない。
- Test件数はstatic declaration概算であり、parameterized expansionやall platform invocation回数ではない。
- Change frequencyはGit履歴でなくRun / Plan artifact参照数の補助Evidenceである。
- `CANDIDATE`は後続Reviewで改善対象になる可能性を示すだけで、Finding / Refactor必須を確定しない。
- Report作成時点でProduct、Test、Curriculum、Specification、CIは変更していない。
