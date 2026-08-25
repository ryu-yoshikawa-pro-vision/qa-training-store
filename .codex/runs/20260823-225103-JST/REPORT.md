# Report (append-only)

- 行動のたびに追記する（調査/編集/判断も含む）
- コマンドや確認結果は必ず記録する

## Evidence Record

- 調査結果は `FACT` / `MISMATCH` / `GAP` / `DUPLICATION` / `COMPLEXITY` / `QUESTION` / `CANDIDATE` に分類する。
- Normative Specification、Observed Behavior、既存Test、Historical Runを区別する。

## 2026-08-23 22:51 (JST)

- Summary: 調査専用Standard Runを初期化し、変更禁止境界と5段階のEvidence収集手順を固定した。
- Completed:
  - `AGENTS.md`、`PLANS.md`、feature-plan Skill / planning reference、`docs/PROJECT_CONTEXT.md`を確認した。
  - 最近のADR（0019〜0013の範囲）と最近のRun一覧、最新Run `20260823-172927-JST`を確認した。
  - `scripts/new-run.ps1`の失敗時削除処理を確認し、今回のcommand-based deletion禁止に合わせて手動初期化した。
- Changes:
  - `.codex/runs/20260823-225103-JST/`の標準Artifact 4件だけを作成した。
  - Product / Test / Curriculum / Specification / ADR / Plan / CI / Configは変更していない。
- Commands:
  - `Get-Content AGENTS.md / PLANS.md / docs/PROJECT_CONTEXT.md` => 必須規約とCurrent contractを確認。
  - `Get-Content .agents/skills/feature-plan/SKILL.md` とplanning reference => repo mapping手順を確認。
  - `Get-ChildItem docs/adr / .codex/runs` と対象`Get-Content` => 最近のDecision / Runを確認。
  - `Get-Content scripts/new-run.ps1` => catch時に`Remove-Item -Recurse -Force`を含むことを確認し、未実行。
- Notes/Decisions:
  - `feature-plan`は調査計画だけに使用し、修正計画や`docs/plans/`保存は行わない。
  - Web検索は不要。Repository内Evidenceを優先する。
  - read-only subagentを使用し、ParentだけがRun Artifactを更新する。
- New tasks: なし。
- Remaining: Phase 0〜4、cross-check、sanitizer、最終統合。
- Progress: 13% (1/8)

## Deletion candidates

- なし。今回の調査では削除候補の整理も行わない。

## 2026-08-23 23:05 (JST)

- Summary: Phase 0のRepository MapとPhase 1 Curriculum Evidence Inventoryを完了し、Current契約、規模、Required境界、C01〜C12、Lesson、Training Harnessを相互照合した。
- Completed:
  - Root、`src/`、`tests/`、`e2e/`、`training/`、`maestro/`、`docs/`、Workflow、scriptを機械Inventoryした。
  - `README.md`、`package.json`、Playwright 2 config、Maestro／Training config、4 Workflow、QA／Review／Contribution入口を確認した。
  - Required Curriculum 22文書、Optional Agentic QA、Legacy Alias、Rubric、Workbook 4 CSV、Validator、Training Web／Native／Workflow templateを追跡した。
  - read-only `curriculum_evidence` subagentの調査を受領し、Parentの通読・検索結果と一致したため採用した。childは変更、Git、独自Run、追加subagentを実行していない。
- Evidence:
  - Repository概算: `src` 155 files / 37,750 lines、`tests` 86 / 19,741、`e2e` 8 / 2,252、`docs/curriculum` 24 / 5,742、`docs/spec` 22 Markdown / 2,011、`maestro` 23 / 1,223、Workflow 4 / 3,300。
  - 主要集中: `native-customer-application-repositories.ts` 2,643行、`native-ci.yml` 2,087行、`native-purchase-screens.tsx` 1,438行、`native-screens.tsx` 1,229行、`admin-product-pages.tsx` 1,220行、`native-customer-repositories.ts` 1,041行、`global.css` 5,160行。
  - Required境界: Curriculum README／Rubric／`validate-curriculum.ts`は22文書をcanonicalとし、Optional `09_specification-agentic-qa.md`とLegacy `10_part1-capstone.md`を除外する。
  - Competency: Part 1はC01〜C10 Level 2、Part 2はC01〜C12 Level 2以上。個別LessonにC IDはほぼなく、canonical Part 1 capstoneだけがC01〜C10を明示する。
  - Workbookは4 CSVともheader + sample 1行。Validatorは存在、schema、ID、参照path、Training／CI tokenを検査するが、Lesson完了、要求件数、実Evidence生成、C対応は検査しない。
- Commands:
  - `rg --files`とPowerShell集計 => area別file / line / byte inventoryを作成。
  - `Get-Content` / `Select-String` => Curriculum、Rubric、Lesson、Workbook、Validator、Training asset、package scripts、Workflow tokenを行番号付き確認。
  - TypeScript export/import検索 => composition rootと主要Hotspotのsymbol / callerを抽出。
- Classification:
  - `FACT`: Formal Web／NativeとTraining Web／NativeはDirectory／config／artifactを分離し、Native Trainingだけ既存Formal runtime基盤を共有する。
  - `GAP`: 個別LessonのLearning Objective→C01〜C12、全LessonのBR/AC、Completion Criteria→Validator、Workbook ID→Formal Test codeに機械Traceがない。
  - `GAP`: Native exercise YAMLは存在するが、package script／Training Workflowの直接入口はbaselineより薄い。Native failure-exercisesはREADMEだけである。
  - `MISMATCH`: 非canonical Legacy capstoneはMaestro 2本を求め、canonical capstone／RubricのRequired 1本と異なる。ただしNavigation／ValidatorのRequired契約には影響しない。
  - `QUESTION`: 非プログラマ対象の総学習時間／環境構築時間と、Native exerciseの提出運用はRepositoryだけでは確定しない。
- Changes: この追記と`PLAN.md`／`TASKS.md`／`run.json`だけ。Product、Test、既存docs、CI、configは変更していない。
- Remaining: Phase 2 Test／CI、Phase 3 Architecture／Hotspot、Phase 4 cross-check、sanitizer、最終統合。
- Progress: 25% (2/8)

## 2026-08-23 23:13 (JST)

- Summary: Phase 2 Test Strategy／PerspectiveとPhase 3 Architecture／Hotspot調査を完了し、現行Test／CIと旧Phase記述、構造集中と意図的platform分離を区別した。
- Delegation:
  - `test_strategy_evidence`のread-only調査を受領し、Parentがpackage script、Playwright config、Workflow matrix、test declarationを再集計して採用した。
  - `architecture_hotspots`のread-only調査を受領し、Parentがimport graph、symbol、caller、transaction、Run／Plan参照数を再確認して採用した。
  - `spec_traceability`のread-only調査を受領し、Normative owner、23 BR／23 AC、代表Feature trace、iOS教材差分をParentが再確認して採用した。
  - 全childは変更、Git、test/build、独自Run、追加subagentを実行していない。
- Test Evidence:
  - Formal StrategyはPhase 1 Risk 16件を定義するがstable Risk IDを持たず、Test Level表はUnit／Application Integration／Repository Contract／Static Asset／Component／Web E2E／Deployed Smokeまでで、現行Native E2E、Platform Parity、Training、operational static contractを含まない。
  - Static declaration概算: Unit 13 files / 45、Integration 9 / 54、Repository 5 / 25、Component 24 / 130、Contracts 31 / 229、Runtime 1 / 1、Web E2E 8 / 41、Training Playwright 3 / 3。MaestroはFormal 23 YAML、Training 2 YAMLである。
  - Required Chromium commandは`phase1-required.spec.ts` 14件に加え`ui-ux-improvements.spec.ts` 13件を実行する。CI matrixはAccessibility、Mobile Boundary、Cross-role 4件、Training baselineも同じaggregate jobへ含める。
  - Formal Test内のBR／AC／Risk ID出現はAgentic QA／visual／curriculum validatorのsynthetic fixtureに限られ、Product Regression test titleからNormative IDへの機械Traceはない。
- Confirmed Test／Document mismatches:
  - E2E設計の必須12本に対し、Phase1 fileはLogout 2件を追加し、required scriptは別のUI/UX 13件も実行する。
  - StrategyはCross-roleをPR外とするが、現行PR CI matrixとverifyはCross-roleを含む`e2e-chromium`成功を必須にする。
  - E2E設計のproject名と現行Playwright project名が異なる。
  - Strategy／Acceptance／Testability文書はNative／MaestroをfutureまたはPhase 1外とするが、現行Spec／ADR／Android Runtime CIでは正式範囲である。
  - CurriculumはiOSを`workflow_dispatch`だけのmanual baselineと説明するが、top-level Native PR CIはreusable iOS Build-only jobを呼び、aggregate verifyで成功を要求する。
  - `seed_catalog.md`はSeed Version 9、`CHANGELOG.md`最新は10、現行`SEED_VERSION`とintegration/component期待値は11である。
- Test gaps / questions:
  - Technique（同値分割、Decision Table、State Transition、Role Matrix）とFormal Test IDの明示対応がない。
  - Screen Reader実行Evidence、dynamic security test、performance benchmark executable／resultはRepository内で確認できない。iOS Runtimeとfull pixel parityは現行保証外／未確定である。
  - Formal／Trainingはdirectory、config、port、artifactを分離するが、Webは同一CI matrix、Nativeは同一APK／emulator jobを意図的に共有する。
- Architecture Evidence:
  - Application→Infrastructure／Presentation、Infrastructure→Presentationのimportは0件で、Web／Native composition root分離はADRと一致する。
  - 一方Domain repository/policyはApplication contractを4箇所type importし、PresentationはDomainを11箇所参照する。特にDomain↔Applicationはtype-levelの双方向layer依存で、runtime cycleとは確認していない。現行architecture contractはこの方向を検査しない。
  - `native-customer-application-repositories.ts` 2,643行／98,414 bytesは13 Repository、mapping、10 Native transaction scope、Transaction Runner、factoryを集約する。
  - `native-customer-repositories.ts` 1,041行／38,185 bytesはCatalogと旧Guest Cart portを同じclassで実装する。Production bootstrapはCatalogだけを接続し、Cart APIはContract Harness／testsで直接利用される。Compatibility adapterの`createNativeCustomerCartGateway`にproduction callerはない。
  - `native-purchase-screens.tsx` 1,438行は13 screen、`native-screens.tsx` 1,229行は8 screen、`admin-product-pages.tsx` 1,220行はlist/new/editと586行のProductEditorを集約する。
  - `e2e/web/fixtures.ts`は142行で、scenario reset、console/pageerror artifact、login、address、checkout、mobile guardを6 E2E fileへ提供する。Global stateは利用するがexplicit resetとpostconditionを持つ。
  - `native-ci.yml`は2,087行／97,124 bytes、実job 8、Maestro step 17、共通Android runner呼出し18件。Formal CIと埋込みTrainingはbash helper、standalone Trainingは同等cleanupをTypeScript helperで実装する。
  - `global.css`は5,160行、823 selector lines／474 unique selector表記、refresh前後のresponsive blockと同一selectorの複数overrideを持つ。Media query差を含むため重複を直ちに負債とはしない。
- Change-frequency Evidence:
  - Git履歴は使わず、Run／Planのpath参照を集計した。`native-ci.yml` 72 artifacts、`native-screens.tsx` 22、`admin-product-pages.tsx` 18、`native-customer-repositories.ts` 12、`native-purchase-screens.tsx` 10であり、少なくともNative CI／screen／repositoryは大きく最近の変更面にも現れる。
  - 2026-08-20監査のNative Catalog／Checkout結果Findingは、2026-08-22 Run／PlanとCurrent codeで修正済み。過去Findingを現行Findingへ再利用しない。
- Commands:
  - `Select-String` / `rg`でRisk、test declaration、BR/AC ID、CI job、Playwright project、spec/test/curriculum対応を確認。
  - PowerShell import graph集計でinternal fan-in／fan-outとlayer方向を確認。
  - Hotspotのexport/class/function/transaction/caller/testを行番号付き抽出。
  - Run／Planに対するtarget pathのread-only参照件数を集計。
- Changes: Run Artifactのみ。Product、Test、既存docs、CI、configは変更していない。
- Remaining: Phase 4双方向matrix、最終classification、sanitizer、最終統合。
- Progress: 63% (5/8)

## 2026-08-23 23:18 (JST)

- Summary: Phase 4双方向Traceabilityを完了し、Learning Objective→Competency→Product Rule→Risk→Technique→Layer→Training→Formal→CIの代表連鎖と逆向きの孤立を確定した。
- Representative chains:
  - Storefront Search／Visibility／Facet: Part 1-2/3 → C02-C06 → BR/AC-STOREFRONT → Risk 2/3 → equivalence/boundary/facet/stable sort → Integration/Repository/Component/Web/Native → Training catalog starter → Formal E2E／Maestro → Web／Native CI。
  - Cart quantity／invalid item: Part 1-2/3/5/7/9 → C02-C08 → BR/AC-CART → Risk 4/5/10 → boundary/state → Unit/Integration/Repository/Component/Web/Native → Workbook sample／learner starter → Formal #2/#3/#6/#7／Native cart → CI。
  - Checkout／Payment recovery: Part 1-3/5/6 → C04/C07/C09 → Checkout/Payment BR/AC → Risk 5/6 → decision/state/idempotency/recovery → Integration/Repository/Component/Web/Native → expected-failure exercise → Formal #4-#7／Maestro purchase/retry/restart → CI。
  - Auth／Role／Ownership: Part 1-2/3/5 → C02/C04/C05/C07 → roles/auth spec → Risk 1/15 → role matrix/negative/boundary → Unit/Integration/Component/Web/Native contract → learner role exercise → Formal #3/#12-14/cross-role → CI。
  - Inventory／Order／Review: Part 1 risk/design/capstone → C02/C04/C05/C07-C09 → inventory/order/review spec → Risk 4/7/8 → boundary/state/role/data integrity → lower layers/Web/Native → advanced/capstone → Formal #8/#11/cross-role／purchase/review → CI。
  - Accessibility／Mobile: Part 1-5 → C07 → NFR-AX/UX → Risk 12 → role/name/keyboard/boundary → Component/A11y/Mobile/UI Review → mobile exercise → formal a11y/mobile/UI review → PR aggregate。
  - Native guarantee: Part 1-7 + Part 2-4〜8 → C08/C12 → Native Spec/ADR-0011 → platform/runtime risk → shared contract + Android runtime + iOS build-only → Training Maestro/workflow → Formal Maestro/iOS build → Native verify。
- Confirmed reverse-direction gaps:
  - `requirements_traceability.md`はCritical ruleをTest IDからRequirement IDへ直接参照すると定め、WE-CORE／UT／CT IDを列挙するが、実Product Regression codeにはこれらのIDがない。BR/AC出現もAgentic QA／visual／curriculum validatorのsynthetic fixtureに限られる。
  - Required CurriculumはTechnique名を明示するが、Formal test title／metadataにTechnique IDがない。
  - Search Suggestion、viewer/clock-aware facet/sort、Native stale response、SQLite transaction/FKはSpec／Formalに厚いが、Core Lessonの明示exercise traceが薄い。
  - Agentic QA protocol／artifact chain、Native production bundle guard、Codex artifact sanitization、visual registry/captureはFormal operational contractに厚いが、Required Competencyへの直接mappingは限定的である。
  - Workbook sampleはCart 1行、automation=`Later`、execution=`Not run`、evidence空欄であり、Repository教材状態はLearner competency completion evidenceではない。
- Coverage quality observations:
  - Playwright locator概算は`getByRole` 286、`getByLabel` 69、`getByText` 45、`waitForTimeout` 0。MaestroはID指定255、text指定21、point指定0。広範な不安定locator／固定sleepのEvidenceは確認しなかった。
  - E2E fixtureは全scenario利用testへexplicit resetを要求し、console/page errorとmetadataをartifact化する。Seed依存は強いが暗黙ではなくfail-closedである。
  - Seed SSOTは`default-dataset.ts` 842行、`scenarios.ts` 657行、`metadata.ts` 462行／30 scenarioで、Web／Native／Formal／Trainingの変更集中点である。
- Open questions fixed for final:
  - Phase 1 testing／acceptance文書はhistorical snapshotか、現行Strategyの更新漏れか。
  - Learner実Evidenceの保存／評価運用と想定学習時間。
  - Native exerciseのcanonical実行／提出入口、manual Screen Reader／security／performance Evidenceの外部有無。
  - Formal／Training baselineを同一CI runtimeに置く意図と、Compatibility Native Cart APIの残存期間。
  - full Web/Native pixel parityはSpec上明示的に未確定。
- Changes: Run Artifactのみ。修正Plan、改善提案、既存成果物変更はない。
- Remaining: Evidence再確認、Sanitizer、最終8セクション統合。
- Progress: 75% (6/8)

## 2026-08-23 23:22 (JST)

- Summary: Current／Historical Evidenceを再確認し、指定された8セクションへ調査結果を統合して完了判定した。
- Classification: Repositoryから直接確認した事項をFACT、契約間の実証可能な不一致をMISMATCH、追跡Linkの欠落をGAP、重複をDUPLICATION、責務集中をCOMPLEXITY、意図未確定をQUESTION、後続レビュー対象候補をCANDIDATEとして分離した。
- Current boundary: 2026-08-20 RunのNative Catalog／Checkout findingsは2026-08-22の実装・検証Evidenceで解消済みのため、現行Mismatchへ含めなかった。変更頻度はGit履歴ではなくRun／Plan内のPath参照数として限定して扱った。
- Validation:
  - `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260823-225103-JST -Write -Check`: PASS（4 files scanned、0 changed、0 replacements、0 residual local absolute paths）。
  - `run.json` JSON parse、標準4 Artifact存在確認、最終Sanitizer Checkを完了前Gateとした。
  - Product/Test/Build/Runtimeの品質Gateは、read-only調査という依頼scopeに従い再実行していない。直近Runの`pnpm run verify`およびNative CI PASSはHistorical Evidenceとしてのみ参照した。
- Changes: `.codex/runs/20260823-225103-JST/`の標準Run Artifact 4件のみ。Product Code、Test Code、既存docs、CI、package/config、`docs/reports/`、Git stateは変更していない。
- Result: 修正Plan・改善提案・Finding確定を行わず、後続3レビューの判断材料となるRepository Evidence Inventoryを完成した。
- Progress: 100% (8/8)
