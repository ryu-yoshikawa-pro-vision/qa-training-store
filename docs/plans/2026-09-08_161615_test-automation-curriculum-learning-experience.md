# テスト自動化カリキュラム 学習体験改善 実装計画

## 0. 目的

`docs/curriculum/test-automation/**`、`training/**`、関連する`docs/spec/**`を対象に、Scenario Shopを使ったテスト自動化学習を、コードベース自動化の初学者が途中で前提知識不足に詰まらず、仕様分析からPlaywright / Maestroの実装、失敗分析、保守、Git / GitHub、CIまで一貫して学べる構成へ改善する。

今回の改善は、学習順序、演習、Workbook、評価、仕様書への導線、用語、Legacy / Optional文書、Training CI、validatorを同じ目的の変更として**1 PRにまとめる**。

ただし、Scenario ShopのExpected Product Behaviorそのものを決め直す変更はこのPRへ混在させない。Product behavior、Seedの意味、Application code、Formal Regressionの期待値を変える必要がある問題が見つかった場合は別対応とする。

このPlanでは実装しない。実装時は本Planを正本として、必要な変更だけを行う。

---

## 1. 基準と今回確認できている問題

基準:

```text
main: f7cc237d8ca719646d9654fba2129732b6eab457
plan branch: refactor/test-automation-curriculum-learning-experience
```

対象ブランチでは教材・Training資産・Application・CIの実装変更はまだ行っておらず、Planファイルだけを更新した状態を基準とする。

### 1.1 学習者の前提と実際の開始条件がずれている

カリキュラムはPlaywright等のコードベース自動化未経験、プログラミング経験を必須としない受講者を対象としている。

一方、`00_learning_design.md`のWeb / Playwright開始GateではNode.js、pnpm、Dependency Install、環境変数、Training baseline等の確認を要求しており、terminalや`pnpm run`をまだ説明していない受講者がCLI操作を先に求められる。

Playwright開始前に必要な最低限のCLI / Node知識をP1-4で説明するだけでなく、開始Gateの順序も合わせる必要がある。

### 1.2 P1-4より前にTypeScript実装へ到達する経路が複数ある

`02_scenario-shop-analysis.md`だけでなく、`01_spreadsheet-test-design.md`やP1-3にも`src/seeds/metadata.ts`等のExecutable Sourceへ到達する経路がある。

TypeScriptをまだ学んでいない段階では、Product Behavior、Role、State、Scenarioを人間向け資料から理解し、低レベル値が必要になる実装段階でExecutable Sourceを確認する順序へ揃える。

`docs/07_testability/seed_catalog.md`は人間向け資料として利用できるが、全内容を初学者の必須読解にしない。対象Scenario、Account、Dataなど、その演習で必要な節だけ参照する。

### 1.3 仕様を読む順序が教材内で揃っていない

`/guide`、Spec、State / Scenario、Seed、Executable Sourceの役割がLessonごとに異なる順序で提示されている。

Expected Behaviorを現在UIや実装から逆算しない原則を維持するため、学習者向けの基本順序を一本化する。

基本順序:

1. Product Scope
2. Roles / Permissions
3. 対象FeatureのPurpose
4. Business Rules
5. Acceptance Criteria
6. 必要なState / Scenario
7. 必要なSeed Catalogの節
8. `/guide`や現在UIで対象・入口・観測状態を確認
9. 実装時だけRoute / Test ID / Seed ID等のExecutable Sourceを確認

`/guide`はorientation / observationの入口として使う。Expected Product Behaviorの正本として扱わない。

### 1.4 P1-4のJavaScript / TypeScript導入が初回演習に対して広い一方、不足もある

現在のP1-4はObject、Array、function、`if`、型注釈等までまとめて説明するが、最初のPlaywright Testで使用するarrow function / callbackの説明が不足している。

初回Playwright Testを読んで小さく変更できる範囲を先に教え、後続Lessonで初めて必要になる構文はその段階で短く説明する。

P1-4で先に扱う範囲:

- `import`
- string
- `const`
- `test(...)`
- arrow function / callbackの最低限
- `async` / `await`
- `{ page }`
- method call
- Locator / Action / Assertionを読むために必要なObject literalの最低限

Array操作、汎用function、条件分岐、型注釈等は、その場で使う必要がなければ後段へ遅らせる。独立したJavaScript / TypeScript講座は作らない。

### 1.5 Playwright learner exerciseは未編集で能力Evidenceになっているように見える

`training/playwright/exercises/training-exercise-starter.spec.ts`は未編集でも実行でき、CSS selector + `.first()` + `toBeVisible()`の完成済みAssertionを持つ。

P1-4 / P1-5ではsemanticなLocatorや自分でTest Conditionをコードへ落とすことを教えているため、starterとの整合を直す必要がある。

重要なのはRepository既定資産を機械的に赤くすることではなく、**未編集starterだけではC07の修了Evidenceが成立しないこと**である。

### 1.6 Workbook sampleが新しいbaseline / exercise境界と矛盾する

既存Workbook schemaは次を表現できるため、schema自体は維持できる。

```text
Spec
→ Risk
→ Test Case
→ Automation Decision
→ Implementation
→ Execution / Improvement
```

一方、既存sampleには次の意味上のずれがある。

- `Later`なのに`implementation_path`が入っているCaseがある
- learner Test Caseの`run_context`が`Training Web baseline`になっている
- Part 1のCaseにPart 2のPR実行タイミングを先取りする表現がある

baselineを環境確認、exerciseをlearner-authored成果物と明確に分けるため、sample rowは今回の変更対象とする。新しいcolumnは追加しない。

### 1.7 Failure Analysisの教材目標と実資産が一致していない

`training/playwright/failure-exercises/expected-failure.spec.ts`は`expect(true).toBe(false)`による恒久的な単純Failureである。

Trace / Screenshot / Video / Reportを開く練習には使えるが、C09が要求するmeaningful diagnosisにはならない。

また、既存`run-expected-failure.ts`は`failure-exercises`配下をまとめて恒久Failureとして扱うため、修正してPASSさせる診断exerciseを同じ実行契約へ混在させない。

### 1.8 P1-6にFailure Analysisとは別責務のSecurity必須項目がある

P1-6には`<script>`入力、保存、escape、HTML解釈、JavaScript実行 / executable sinkまでの確認がCommonの自己確認へ含まれる。

内容自体を否定しないが、C09の必修能力はFailureのEvidence確認、原因分類、修正、再実行である。Security確認はCommon RequiredのC09から外し、必要ならExtension / Referenceとして残す。

新しいSecurity Lessonは作らない。

### 1.9 Maestro learner exerciseとLesson順序が学習目標に合っていない

`training/maestro/exercises/native-training-exercise.yaml`はbaselineを`runFlow`した後に`Scenario Shop`を確認するだけで、未編集でもC08のlearner-authored Business Conditionに見えやすい。

P1-7はMaestroの基本概念より前にPhysical Android Device、JDK、SDK、ADB、serial、PowerShell helper、runId、Artifact等の詳細を長く説明している。

概念は先に教えるが、actual exercise実行はDevice準備なしでは成立しないため、次の順序へする。

```text
Maestro / YAML / Flowの概念
→ Scenario Shop向けFlowを読む・下書きする
→ Physical Device / Doctor / Build / Install
→ baselineで環境確認
→ learner exerciseを実行
→ Evidence
```

過去PR固有の「PR5では...変更しません」等の履歴文言はlearner-facing本文から削除する。

### 1.10 C05の能力定義がFormal Test Strategyへ寄りすぎている

Rubric C05はPrimary learner-facing sourceをP1-6とFormal Test Strategyへ寄せ、bounded Level 2もFormal SSOTの複数軸を前提とする。

一方、初学者がTest Layer Selectionを学ぶのはP1-3である。

参照先だけでなく、C05のbounded Level 2とMinimum EvidenceをP1-3の学習目標へ合わせる。

初学者のC05では、Risk / Test Conditionに応じてUnit / Integration / Component / Web E2E / Native E2E等から適切な層を選び、理由を説明できることを中心にする。Formal Test Strategyは比較・Referenceとして扱う。

### 1.11 P1-8はproblem-firstだが、抽象化とTypeScript構文を整理できる

現在のP1-8にも「問題を見てから抽象化する」意図はあるため、全面再構成はしない。

ただしHelper、POM、Component Object、Fixture、Automation Flow、Seed Scenarioを一度に分類暗記させない。

POM例を残す場合、`class` / `constructor` / `this`等、その例を読むために必要な構文だけをその場で短く説明する。

`Automation Flow`はlearner-facingな独立実装資産としての必要性を確認できず、Maestro Flowとも紛らわしいため、独立した必須用語から外す。必要な内容は「共通操作」「Helper」等の一般的な説明へ置き換え、`00_learning_design.md`等の用語も同期する。

### 1.12 Part 2のCommon / Native経路に具体的不整合がある

少なくとも次を修正対象とする。

- P2-3に残るCommon完了条件と直接関係しないDelivery Readiness系の記述
- P2-5の次の行動がNative選択者でもP2-6を飛ばしてP2-7へ進むように読める箇所
- P2-8のCommon boundaryと、Maestro / Nativeが必須に見える学習目標・演習条件

P2-6はNative UI自動化を選択した場合だけ進む経路を維持する。

### 1.13 P2-5でlearner-authored Playwright TestがCIへ接続されていない

P2-5はLocalで動くPlaywright TestをGitHub Actions上で実行することを学習目標にする一方、現在のTraining Web workflowはbaselineを中心に実行し、learner-authoredな`training:web:exercise`をCIで実行する経路がない。

このままでは、Part 1で自分で作ったTestをPart 2でCIへ接続する学習が途切れる。

`training/github-actions/training-ci.yml`と`scripts/training/workflow-contract.ts`を対象へ含め、**Training Copy上でlearner-authored exerciseを実行できる経路**を用意する。

Repository本体のRequired Web CIではbaselineの責務を維持し、Production / Preview workflowは変更しない。

### 1.14 P2-4のYAML導入はTraining workflowを読めるところまで必要

最小YAMLとして`key: value`、list、indentation / nestingを説明するだけでは、すぐに読むTraining workflowの構造へつながらない。

YAML自体の講座にはせず、実際のTraining workflowに出る次のGitHub Actions keyを対応付ける。

- `on`
- `jobs`
- `runs-on`
- `steps`
- `uses`
- `with`
- `run`
- `env`
- `if`
- `${{ ... }}`
- `github` / `env` / `inputs`等、教材で実際に読む主要context

`${{ ... }}`はYAML自体の構文ではなくGitHub Actions expressionであることを分けて説明する。

### 1.15 Competency EvidenceをCapstoneで重複実施させる必要はない

C01〜C12は「教える → 練習する → 評価する → Evidenceを残す」を揃える。

Capstoneでは既存Lessonで作った成果物を統合して説明できればよいものを、同じ課題として再実装させない。

特に:

- C10はP1-8で作成したmaintainability EvidenceをP1-9で参照・統合する
- C11はP2-3で作成したPR / review recordをP2-8で再利用できるようにする
- C12はP2-5のlearner-authored TestをCIへ接続する体験と整合させる

### 1.16 Specification入口は管理概念よりProduct Behaviorを先に読めるようにする

`docs/spec/README.md`はNormative Product Behavior、Supporting / Operational、Executable Canonical Sources、Oracle Priority等の管理概念から始まる。

仕様管理上は必要だが、学習者がFeatureを読む入口では先にProduct Behaviorへ進めるようにする。

管理概念は削除せず、「仕様を管理・変更するときのルール」として後段へ置く。

### 1.17 AuthenticationとState / Scenarioに文書整合性修正が必要

#### Authentication

現状確認では、`storage-write-failure`はStorage write failure用Scenarioであり、Loginの必須入力validationとは別経路である。

`authentication.md`のLogin `validation-error`に`storage-write-failure`を紐付け、Expected UIを必須入力不足Summaryとしている組み合わせは、Product behavior変更ではなくCondition / Scenario metadataの文書不整合として扱う。

`validation-error`は`default` Scenarioで空のLogin Formをsubmitするvalidation経路へCondition / Scenario metadataを合わせる。Seed / Application / BR / ACは変更しない。Visual Reference画像そのものの再生成は、現在の画像が修正後Conditionと一致しないことを確認した場合だけ行う。

#### State / Scenario

`docs/spec/state-and-scenarios.md`の`e2e/fixtures/`参照は現在の`e2e/web/fixtures.ts`と一致しないstale pathとして修正対象にする。

どちらもProduct behaviorやApplication codeの変更には広げない。

### 1.18 Legacy / Optional文書は内容ではなく標準経路との境界を整理する

`10_part1-capstone.md`はLegacy Aliasでありながら旧Capstone全文を保持し、現在のWeb Common修了条件と矛盾する。

URL互換を考慮し、基本はcanonical `09_part1-capstone.md`へ案内する短いstubにする。Repository内外の参照を理由なく断ち切らない。

`09_specification-agentic-qa.md`はOptional Referenceと明記されており、Agentic QA本文自体を再設計する必要はない。Navigation上の明確化だけで標準Part 1と区別できるなら物理移動を行わない。移動が必要な具体的理由がある場合だけreference位置への移動を行う。

### 1.19 validatorは新規追加より既存prose assertionの整理が必要

`scripts/validate-curriculum.ts`はRequired file、Workbook、script、Training workflow等の構造契約だけでなく、P1-7やInstructor Referenceの自然文に近いtokenも固定している。

今回の教材順序変更・日本語整理と衝突する既存token assertionを棚卸しする。

残す・追加する検証は次のような安定した機械契約へ限定する。

- Required file / canonical file
- path / link
- package script
- Training workflow command
- canonical Playwright / Maestro entry
- Workbook schema / ID / reference
- Common / Nativeの構造的なNavigation契約を安定して判定できるもの

特定の日本語文言、旧文言が存在しないこと、教材の説明品質等をvalidatorへ固定しない。

### 1.20 Web learner exerciseから使えるScenario Reset入口が不足している

P1-5とC07は、決定的な初期状態からPlaywright Testを実行することを前提としている。

一方、現在のTraining WebではScenario Reset処理がbaseline内部のprivateな処理に閉じており、learner exerciseから簡単に再利用できる入口がない。受講者へ`page.evaluate()`、`window.__TEST_API__`、Test APIの内部契約等を自力実装させると、P1-4でJavaScript / TypeScriptを最小化する方針と矛盾する。

Formal Regressionのfixtureを早期に読ませたりコピーさせたりせず、既存Test API / baseline Reset処理を最小限共有し、受講者がScenario名を指定してResetできるTraining向け入口を用意する。新しいHarness frameworkは作らない。

### 1.21 Workbookの代表Case自体とEvidence契約に不整合がある

既存sampleはAutomation Decision / implementation path / run contextだけでなく、代表Caseの上流にも意味上のずれがある。

少なくとも`TC-CART-001`周辺では、購入上限と購入不可明細によるCheckout阻止という別のBusiness Rule / Acceptance Criteriaが同じCaseへ混在し、precondition / Scenarioとも一意に対応していない。また、同じTest Case IDが教材中で異なる条件の例として使われている箇所がある。

代表Caseは、1つの決定的な初期状態で実行できるBusiness Conditionへ揃える。`br_ids` / `ac_ids` / test condition / precondition / expected result / Scenarioを一致させ、同じTest Case IDを別の意味で使わない。必要なら既存schemaの行を分けるが、columnは増やさない。

また、Workbookの`evidence`はruntimeで生成されるTrace、Screenshot、GitHub Actions Artifact等への参照を記録する項目として扱う。`implementation_path`と異なり、静的validatorでruntime Artifactの実在fileを要求しない。`Not run`ではEvidence / failure / cause / action / improvementを先に埋めない。

### 1.22 P2-4 / P2-5とTraining Copyのworkflow契約がまだつながっていない

現在のP2-4はTraining workflowへQuality commandや`workflow_dispatch`を追加する演習を含むが、prepared Training Copyではrepository-owned templateをactive `.github/workflows/**`へ展開し、その境界をvalidationで守っている。`workflow_dispatch`も既存templateに存在する。

P2-4はprepared Training workflowを読み、Trigger / Job / Step / `uses` / `run` / `with` / `env` / `if` / contextを理解することを中心にする。learner-authored Playwright Testを実際のCIへ接続する変更はP2-5へ集約する。

P2-5ではmanual実行だけでなく、Training Copyの`pull_request`からbaseline確認後に`training:web:exercise`へ到達することを外部契約とする。repository-owned templateとTraining Copy上のactive workflow、provisioning時の`training:copy:validate`、learner編集後のruntime検証を区別する。

### 1.23 Training CI変更と衝突する既存contract testがある

`tests/contracts/training-curriculum.test.ts`は現在、Training Web workflowに`training:web:exercise`を含めないことを明示的に検証している。また、learner-facing本文の表現へ依存するliteral assertionも持つ。

P2-5のTraining CI変更と同時にこのcontract testを更新し、旧契約を残さない。prose assertionの棚卸しも`validate-curriculum.ts`だけでなくこのtestへ適用する。

### 1.24 README / P2-7 / Rubricに学習経路の残存不整合がある

Curriculum READMEは共通資料をP1-1より前に並べており、初学者がWorkbookやRubricから読み始めるように見える。受講者向けの標準NavigationはP1-1から開始し、WorkbookはP1-2 / P1-3で必要になった段階、Rubricは評価基準を確認するときに参照する構成へ揃える。

CommonのPart 2経路ではP2-5とP2-8の間にP2-7があるため、P2-7もbounded Web CIへ同期する。Preview / Productionを含むfull deliveryの内容はCommon必須から外し、必要ならAdvanced / Referenceとして残す。

RubricではC01〜C04の`rationale` / `reason`等を、存在しないWorkbook columnへ暗黙に要求しない。既存fieldで評価できる内容へ揃え、文章説明が必要な場合は自己確認 / Capstone等のEvidence surfaceを明示する。C12はP2-5で実際に動いたlearner-authored exerciseのCI Run / Artifactを再利用し、その実行を根拠にTrigger / Gate / Artifact / Failure reasoningを説明する。

### 1.25 Spreadsheet教材と`Automation Flow`は簡略化できる

`01_spreadsheet-test-design.md`は4つのCanonical CSVと複数のSheet風conceptual viewを併記しているため、初学者が実際にどの成果物を作るのか分かりにくい。4 CSVを実体として中心に据え、conceptual viewは削除または既存columnへの対応説明へ圧縮する。

`Automation Flow`はlearner-facingな独立実装資産としての必要性を確認できず、Maestro Flowとも紛らわしい。独立した必須用語から外し、必要な説明は「共通操作」「Helper」等の一般的な表現へ置き換える。

---

## 2. 完了時に目指す状態

### 2.1 学習者

- P1-1〜P1-3はPlaywright runtimeを自分で起動できなくても仕様分析・テスト設計を進められる。
- P1-4で初めて自分でCLI / Node / pnpmを操作する前に、必要最低限の説明を読める。
- Product BehaviorをSpecから判断し、`/guide`や現在UIをExpected Behaviorの正本と混同しない。
- Playwright / Maestroのbaselineを環境確認、exerciseを自分の成果物として区別できる。
- 未編集starterだけではC07 / C08の修了Evidenceにならない。
- Spec / Risk / Test Case / Automation Decision / Implementation / Execution / EvidenceをWorkbookと実装で一巡できる。
- Failure Artifactを開くだけでなく、Evidenceから原因を判断し、修正して再実行できる。
- Part 1 CommonはWeb中心で完了でき、Native UI自動化は選択式のまま維持される。
- Part 2でPart 1のlearner-authored Playwright TestをTraining CopyのPull RequestからGitHub Actionsへ接続できる。
- P1-5でFormal fixtureやTest API内部を読まずに、決定的なScenario Resetを利用できる。

### 2.2 教材

- 「教える → 練習する → 評価する → Evidenceを確認する」がC01〜C12までつながっている。
- 学習者向け、Instructor向け、Repository Maintainer向け情報の境界が分かる。
- 同じ概念を複数の管理用語で表現しない。
- 技術的な正式名称は維持し、一般的な説明は自然な日本語にする。
- Common / Native選択経路がREADME、各Lesson、Rubric、Capstoneで一致する。
- Legacy / Optional文書が標準学習経路と矛盾しない。
- READMEの受講者向け標準NavigationはP1-1から始まり、Workbook / Rubricは必要な段階で参照できる。

### 2.3 Repository

- Formal Regression、Product code、Production / Preview workflow、Product Behaviorを教材改善の都合で変更しない。
- Training baselineはRepositoryの環境確認として安定して実行できる。
- learner exerciseはlearner-authoredな成果物を要求する。
- Training Copyにはlearner exerciseをCI実行できる既存思想に沿った経路がある。
- Workbook schemaは維持し、sampleのBusiness Condition、実装状態、実行状態が現在の学習契約へ揃っている。
- Workbookの`evidence`はruntime Evidenceへの参照として扱われ、runtime Artifactの静的なfile存在を要求しない。
- validatorは構造的な回帰を検出し、learner-facing proseの表現を不必要に固定しない。

---

## 3. 変更対象

### 3.1 Curriculum共通

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning_design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- 必要最小限の`docs/curriculum/test-automation/03_instructor-reference.md`

### 3.2 Part 1

- `docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md`
- `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/08_test-management-and-maintainability.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`
- `docs/curriculum/test-automation/part1/09_specification-agentic-qa.md`
- `docs/curriculum/test-automation/part1/10_part1-capstone.md`

### 3.3 Part 2

最低限、次を明示対象とする。

- `docs/curriculum/test-automation/part2/03_github-pull-request-review.md`
- `docs/curriculum/test-automation/part2/04_ci-github-actions.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/07_ci-cd-quality-gates.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`

用語・リンク・Evidence契約の変更に直接影響する他のPart 2文書も確認するが、理由なく全面改稿しない。

### 3.4 Training / Workbook

- `training/playwright/baseline/**`（Scenario Reset処理を共有する場合の最小範囲）
- `training/playwright/exercises/**`
- `training/playwright/failure-exercises/**`
- `training/maestro/exercises/**`
- `training/workbook/**`
- `training/github-actions/training-ci.yml`
- learner exercise / Failure / Training Copy契約の変更に必要な範囲だけ`scripts/training/**`
- `scripts/training/workflow-contract.ts`

Playwright Training config、Maestro shared runner、Training Copy基盤は、必要な契約変更がない限り作り直さない。

### 3.5 Specification / reference

- `docs/spec/README.md`
- `docs/spec/glossary.md`
- `docs/spec/change-process.md`
- `docs/spec/features/authentication.md`
- `docs/spec/state-and-scenarios.md`
- 学習者向けNavigation変更に直接影響する`docs/spec/**`

### 3.6 Validation

- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- 既存validator / contract testの関連箇所

---

## 4. 非対象

今回のPRでは次を行わない。

- Scenario ShopのBR / AC / Expected UIの意味変更
- Seed Scenarioの意味変更
- `src/**`のApplication / Product code変更
- Formal RegressionのテストケースやLocatorの一括リファクタリング
- `playwright.config.ts`のFormal Regression再設計
- Formal `maestro/**`の再設計
- Production / Preview / Deploy workflowの再設計
- `.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml`のarchitecture変更
- Android Physical Device保証やiOS Build-only保証の変更
- Maestro / Playwrightの新しい汎用実行基盤作成
- 新規package導入
- JavaScript / TypeScriptの独立入門コース追加
- YAMLの独立講座追加
- Git / GitHub教材の全面書き直し
- Specification System全体の再設計・大規模分割
- Workbook schema / column追加（不足が実証された場合を除く）
- 汎用Failure fixture framework
- learner completion専用の新しいgrader / AST checker / content hash判定
- Scenario Resetのための新しいTraining Harness framework
- Training Copyのrepository-owned workflow trust boundaryを教材都合で緩和すること
- generic document validator framework
- Agentic QAの仕様・Harness・scoring / benchmark変更
- `docs/reports/**`をCurrent Specificationとして扱うこと

---

## 5. 実装原則

### 5.1 1 PRで整合状態まで持っていく

学習経路、exercise、Workbook、Rubric、Capstone、Training CIを別々のPRへ分けて一時的な矛盾を残さない。

ただしProduct behaviorやApplication変更が必要になった場合だけ別対応へ分離する。

### 5.2 Workbookをexerciseより先に確定する

今回の教材はWorkbook上のCaseをPlaywright / Maestro exerciseへ接続するため、先にsampleの意味を揃える。

実装順は次を基本とする。

```text
学習経路・前提知識・Common/Native境界
→ Workbook sample
→ Web / Failure / Native exerciseとTraining CI
→ Lesson本文
→ Rubric / Capstone
→ Specification learner navigation
→ 日本語・内部管理用語
→ Legacy / Optional
→ validator
→ 全体検証
```

### 5.3 技術用語と管理用語を分ける

維持する例:

- Playwright
- Maestro
- Locator
- Fixture
- Trace
- Git
- GitHub
- Pull Request
- GitHub Actions
- YAML
- CI/CD
- Page Object Model
- Deep Link

日本語化またはlearner-facing本文から除く候補:

- Common route → 共通学習経路
- Common completion → 共通修了条件
- Learner Required → 受講必須
- Native specialization → Native UI自動化（選択）
- Current Guarantee → 現在保証している範囲
- completion contract → 修了条件
- Repository-required asset → Repository運用上必要な資料、またはInstructor / Maintainer側へ分離

`Normative`、`Oracle`、`Executable Canonical Sources`等は仕様管理上必要な箇所に限定し、Product Behaviorを理解する最初の説明へ置かない。

### 5.4 既存経路を再利用する

- Seedの人間向け入口は既存`docs/07_testability/seed_catalog.md`を必要な節だけ使う。
- Training baseline / exercise / failure-exerciseの既存責務分離を維持する。
- Playwright Training config、Maestro shared runner、Training Copyを作り直さない。
- Workbookの既存4 CSVを維持する。
- Formal Regressionは比較教材として維持する。
- Training CIは既存`training/github-actions/training-ci.yml`とworkflow contractを拡張して使う。
- Scenario Resetはbaselineで既に使っているTest API / Reset処理を小さく共有する。
- Training Copyではrepository-owned template、active `.github/workflows/**`、provisioning validationの既存境界を維持する。

### 5.5 exerciseのprocess exitとCompetency成立を混同しない

Web / Nativeとも、未編集starterについて固定する契約は次である。

- baselineはRepository環境確認として成功できる。
- starterはTypeScript / YAMLとして壊れたファイルを配布しない。
- 未編集starterだけではC07 / C08の修了Evidenceにならない。
- C07 / C08にはlearner-authored diffが必要。
- learner-authoredなBusiness Condition、Action / Locator / AssertionまたはFlow / Assertionが実際に実行される必要がある。
- 完成状態では既存`training:*:exercise` commandで成功できる。
- skip、0 test、TODOコメント、completion markerだけを成功Evidenceにしない。
- `expect(false)`等の人工Failureをstarter completion判定のためだけに置かない。
- 完成解答をstarterへ含めない。

未編集starterのprocess exit code自体を学習能力の判定基準にはしない。実装方法は上記契約を満たす最小構成を選ぶ。

### 5.6 実装Pathとruntime Evidenceを分ける

Workbookでは、Repository内の実装を指す`implementation_path`と、実行時に生成されるEvidenceへの参照を混同しない。

- `implementation_path`: Repository内の実在するlearner implementation
- `evidence`: Trace / Screenshot / Video / GitHub Actions Artifact / Run等の実行Evidenceへの参照

`evidence`はclean checkout時に必ず存在するtracked fileとは限らない。validatorはruntime Artifactのfile存在を要求せず、形式や状態遷移など静的に安定して検証できる契約だけを扱う。新しいArtifact管理基盤は作らない。

---

## 6. 実装手順

## Phase 1: 学習経路・前提知識・Common / Native境界を整える

### 6.1 Learner / Instructor / Maintainerの境界

`README.md`と`00_learning_design.md`を中心に、受講者の標準学習経路と、環境準備・運営・Repository管理の資料を分ける。

- Learner: 学習内容、演習、自己確認、修了条件、評価観点、実行に必要な最低限の手順
- Instructor: Toolchain準備、アカウント、端末、Training Copy、トラブル対応、採点支援
- Maintainer: validator、Formal Regressionとの境界、Production / Training infrastructure、仕様管理契約

学習者がLessonを進めるためにRepository管理用の分類を理解する必要がない状態にする。

READMEの受講者向け標準NavigationはP1-1から開始する。`01_spreadsheet-test-design.md`はP1-2 / P1-3でWorkbookを使う段階、`02_competency-rubric.md`は評価基準を確認する段階で参照する。ファイル番号やpathは変更しない。

### 6.2 Start GateとCLI学習順序を整合させる

`00_learning_design.md`のWeb / Playwright開始Gateを、P1-4でCLI基礎を説明した後に受講者が自分で確認する実行Gateとして再定義する。

P1-1〜P1-3はTraining Web baselineを自分で起動できなくても、仕様・画面・Workbookを使って学習できる構成にする。

Instructor側のEnvironment readiness確認と、受講者が自分で実行するStart Gateを混同しない。

### 6.3 P1-4以前のExecutable Source参照を横断修正する

対象:

- `01_spreadsheet-test-design.md`
- P1-2
- P1-3
- これらから直接参照されるlearner-facing navigation

学習者向けの基本読書順を次へ統一する。

1. Product Scope
2. Roles / Permissions
3. 対象FeatureのPurpose / BR / AC
4. 必要なState / Scenario
5. 必要な`seed_catalog.md`の節
6. `/guide` / Current UIで対象を観察
7. 実装時だけExecutable Source

`src/seeds/metadata.ts`を削除することが目的ではない。低レベル値や実装契約を確認するときの後段参照として残す。

### 6.4 P1-4へ最低限のCLI / Node知識を追加する

Lesson番号を増やさず、`04_playwright-foundations.md`冒頭へScenario ShopのTraining commandを実行するために必要な範囲だけ追加する。

- terminal
- current directory
- relative path
- file / directory
- Node.js
- package manager / pnpm
- `package.json`
- `scripts`
- `pnpm install`
- `pnpm run <script>`
- command success / failure
- Error MessageのFile / Line / Error Typeを見る
- 必要な環境変数

Windows / macOS / Linuxの一般的なCLI講座には広げない。

### 6.5 P1-4のJavaScript / TypeScriptを初回Testに必要な範囲へ絞る

P1-4の先行Required:

- `import`
- string
- `const`
- `test(...)`
- arrow function / callbackの最低限
- `async` / `await`
- `{ page }`
- method call
- Playwright optionを読むためのObject literalの最低限

後続で必要になるArray、汎用function、`if`、型注釈等は、初めて使うLessonで短く説明するかReferenceへ下げる。

### 6.6 P1-4のPlaywright初回内容を絞る

初回の到達点:

- `test`
- `page`
- `goto`
- Locator
- Action
- Assertion
- Auto-wait / retrying assertionの基本
- `pnpm run training:web:exercise`

Reporter、Retry設定、Trace、Screenshot、Video、詳細configはP1-6やPart 2で必要になる段階へ移す。

Locatorは固定順位を暗記させない。

原則:

- user-facing attributeを優先する
- explicit testing contractも利用する
- Role / Label / Text / Test ID等を対象の意味から選ぶ
- CSS / XPathはDOM実装へ強く依存する場合があるため、より意味のあるLocatorがない場合に使う

Locator方針は本文だけでなく、学習目標、例、ハンズオン、自己確認、修了条件まで同期する。

実装時参照:

- https://playwright.dev/docs/locators
- https://playwright.dev/docs/actionability
- https://playwright.dev/docs/test-assertions

### 6.7 P2-4へ実Training workflowを読める最低限を追加する

YAML:

- `key: value`
- list
- indentation / nesting
- string

GitHub Actions:

- `on`
- `jobs`
- `runs-on`
- `steps`
- `uses`
- `with`
- `run`
- `env`
- `if`
- `${{ ... }}`
- 教材で使う`github` / `env` / `inputs` context

Workflow syntax全体や高度なexpression講座にはしない。

P2-4はprepared Training workflowを題材に、既存のTrigger / Job / Step / commandを読むことを中心にする。既に存在する`workflow_dispatch`を追加させたり、YAML学習のためだけに`test:unit`、lint、format、typecheck等をworkflow contractのallowlistへ大量追加したりしない。

受講者がworkflow変更を体験する必要がある場合も、P2-5で自分のPlaywright TestをCIへ接続する変更と重複させない。P2-4ではTrust Boundaryを緩めずに学べる最小演習へ修正する。

実装時参照:

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.github.com/en/actions/concepts/workflows-and-actions/expressions

### 6.8 Part 2のCommon / Native navigationを同期する

P2-3 / P2-5 / P2-7 / P2-8を確認し、次を揃える。

- Common: P2-5 → P2-7 → P2-8
- Native選択時: P2-5 → P2-6 → P2-7 → P2-8

P2-8のCommon学習目標・演習ではWeb CIだけで成立することを明示し、Maestro / Native CIは選択時だけ追加する。

P2-3のCommon完了条件から外れたDelivery Readiness等の運用説明は、学習上必要でなければ削除またはReferenceへ移す。

P2-7はCommonではbounded Web CIのGate / Artifact / Failure reasoningへ集中する。Preview / Production / Smoke等を含むfull deliveryの図示・改善課題は、Common必須である具体的理由がなければAdvanced / Referenceへ下げる。P2-5で得たlearner exercise CI EvidenceからP2-8へ連続する説明にする。

---

## Phase 2: Workbook sampleの意味を揃える

### 6.9 既存schemaを維持する

新しいCSVやcolumnは追加しない。

対象:

- `01_target-risk.csv`
- `02_test-cases.csv`
- `03_automation-mapping.csv`
- `04_execution-improvement.csv`
- `training/workbook/README.md`の説明

### 6.10 一貫したCaseをP1-3 → P1-5へ接続する

少なくとも代表Caseについて次を一巡させる。

```text
Spec BR / AC
→ Risk
→ Test Case
→ Automation Decision
→ Implementation Path
→ Playwright exercise
→ Execution
→ Evidence / Improvement
```

sampleの意味を確認する。

- 代表Caseは1つの決定的な初期状態で実行できるBusiness Conditionへ絞る
- `br_ids` / `ac_ids` / test condition / precondition / expected result / Scenarioを一致させる
- 同じTest Case IDを別Lessonで別の意味に使わない
- 複数の独立したBusiness Ruleを1 Caseへ束ねる必要がなければ既存schemaの行を分ける
- `Later`なら未実装の`implementation_path`を埋めない
- `Automate`でも受講者がまだ実装していないsource templateでは`implementation_path`を完成済みとして先に埋めない
- 実装するCaseではAutomation Decisionとlearnerが後から記録するPathを一致させる
- learner-authored Testの実行Contextを`Training Web baseline`にしない
- `Not run`ではEvidence / failure / cause / action / improvementを先に埋めない
- Part 1のCaseへPart 2のPR timingを必須前提として先取りしない

`01_spreadsheet-test-design.md`は4つのCanonical CSVを実際に作成・更新する成果物として中心に置く。複数のSheet風conceptual viewは、4 CSVと別の成果物を作るように見える場合は削除または大幅に圧縮し、残す場合も各観点を既存columnのどこへ記録するかだけを説明する。

`04_execution-improvement.csv`の`evidence`はruntime Evidenceへの参照として扱う。Trace / Screenshot / GitHub Actions Artifact等はgitignoredまたはremote上の生成物になり得るため、validatorで実在するtracked file pathを要求しない。

---

## Phase 3: Web / Failure / Native exerciseとTraining CIを修正する

### 6.11 Playwright baselineとexerciseの責務を明示する

baseline:

- Environment / Runtime / Training harness確認
- clean repositoryで実行できる
- C07の能力Evidenceではない

exercise:

- WorkbookのTest Caseから受講者が実装する
- learner-authored diffが必要
- 意味のあるLocator / Action / Assertionが必要
- 完成状態で`pnpm run training:web:exercise`が成功する

starterから完成済みCSS selector + `.first()`の答えを取り除く。

P1-5のnormal / boundary等の既存練習量を、代表1本のtraceability exerciseへ縮小しない。代表CaseでSpecからEvidenceまで一本につなぎつつ、現在必要な複数の練習は維持する。

P1-5で決定的なScenarioから始められるよう、learner-facingな最小Reset入口を用意する。

要件:

- 既存Test API / baseline Reset処理を再利用する
- 受講者がScenario名等の学習上必要な値だけ指定できる
- `page.evaluate()`や`window.__TEST_API__`の内部plumbingをP1-5の必須知識にしない
- Formal `e2e/web/fixtures.ts`をコピーさせない
- 新しいFixture / Harness frameworkは作らない
- C07では、明示したScenario Resetを含む再現可能なTestであることを確認する

### 6.12 Failure AnalysisをArtifact確認とdiagnosisへ分ける

#### Artifact確認用

既存の単純Failureを利用し、次を学ぶ。

- Error Message
- Trace
- Screenshot
- Video
- HTML Report

これは恒久Failureの実行契約として残してよい。

#### diagnosis用

C09のために、決定的に再現できるmeaningful Failureを**最低1件**用意する。

候補:

- 誤ったExpected value
- 誤ったLocator
- 誤ったInitial State / Seed

TimingをRequired fixtureにしない。実際にflakyな教材fixtureも作らない。

最低1件ではC09の学習が成立しない具体的理由が確認された場合だけ追加する。

診断exerciseは恒久Failure runnerの対象へ無造作に混在させない。1ケースずつ再現、Evidence確認、原因判断、修正、再実行できる実行経路にする。

C09 Evidence:

```text
Failure
→ Evidence
→ 原因仮説
→ 確認結果
→ cause
→ action / fix
→ re-run result
```

`04_execution-improvement.csv`へ接続する。

### 6.13 P1-6のSecurity詳細をCommon Requiredから分離する

C09の自己確認・修了条件からSecurity pipelineを外す。

有用な説明として残す場合はExtension / Referenceとし、Failure Analysisの必修成果物へ含めない。

### 6.14 Maestroを概念-first、実行はDevice準備後にする

P1-7の順序:

1. Maestroとは
2. YAMLの最低限
3. Flow
4. `launchApp`
5. `tapOn`
6. `inputText`
7. selector / Stable UI Test ID
8. Assertion
9. automatic retry / waitの基本
10. 長時間処理で必要な場合だけ`extendedWaitUntil`
11. scroll
12. `runFlow` / subflow
13. Deep Link / Test Control / parameter
14. Scenario Shop向けFlowを読む・下書きする
15. Physical Android Device / Toolchain Doctor / Build / Install
16. Training Native baseline
17. learner exercise実行
18. Artifact / Evidence

既存Physical Deviceの安全条件や実行契約は維持する。

過去PR番号や「このPRでは変更しない」等の履歴文言は削除する。

実装時参照:

- https://docs.maestro.dev/maestro-flows
- https://docs.maestro.dev/api-reference/selectors
- https://docs.maestro.dev/reference/commands-available/assertvisible
- https://docs.maestro.dev/maestro-flows/flow-control-and-logic/wait-commands
- https://docs.maestro.dev/api-reference/commands/runflow

### 6.15 Maestro exerciseのlearner contractを揃える

`native-training-exercise.yaml`について次を満たす。

- learner-authored diffが必要
- canonical entryから受講者のBusiness Conditionへ到達できる
- Stable UI Test ID等、安定したselectorを使う
- Business Conditionに対応するAssertionを持つ
- 完成状態では`training:native:exercise`で成功できる
- baselineのstock PASSだけをC08 Evidenceにしない

Source Repository / Fresh Training Copy / learner編集後の状態を区別する。

- Source Repository: Required CIを壊さない
- Fresh Training Copy: 未編集starterだけでC08修了とみなさない
- learner編集後: learner-authored Flow + successful execution artifactでC08を確認する

Native環境が利用できない場合はEnvironment blockとして扱い、Common修了条件へ昇格させない。

### 6.16 P2-5でlearner exerciseをTraining CIへ接続する

対象:

- `training/github-actions/training-ci.yml`
- `scripts/training/workflow-contract.ts`
- 必要なTraining Copy validation

目的:

```text
Part 1で作ったlearner-authored Playwright Test
→ Localでtraining:web:exercise
→ Git / PR
→ Training CopyのGitHub Actions
→ 同じlearner exerciseを継続実行
→ Artifact / Failure Evidence
```

要件:

- Repository本体のRequired Web CIはTraining baselineを維持する
- Prepared Training Copyの`pull_request`経路でbaseline確認後に`pnpm run training:web:exercise`へ到達する
- manual `workflow_dispatch`だけでexerciseを実行できる状態をCommonの継続実行体験として完了扱いしない
- `expected-failure`はmanual経路のまま分離してよい
- Production / Preview workflowを変更しない
- 既存Training workflow contractを`training:web:exercise`に必要な範囲だけ拡張する
- `training/github-actions/training-ci.yml`はRepository-owned templateであり、prepared Training Copyで実際に動くのは`.github/workflows/training-ci.yml`であることをP2-4 / P2-5で説明する
- `training:copy:validate`はprovisioning時のtemplate / active workflow境界確認として扱い、learner編集後のruntime成功判定と混同しない
- source templateを配布する既存Training Copy経路を再利用する
- 新しいworkflow frameworkを作らない
- `tests/contracts/training-curriculum.test.ts`の旧「exerciseを含めない」契約を同じPhaseで更新する

---

## Phase 4: Lesson本文・Rubric・Capstoneを実資産へ合わせる

### 6.17 P1-5をWorkbook / exerciseへ合わせる

P1-5で受講者が、Workbookで決めたTest Caseから実際のPlaywright codeへ進むことを明示する。

baselineの既存PASSを自分のTest CaseのEvidenceとして扱わない。

### 6.18 C01〜C12を横断確認する

各Competencyについて次を対応付ける。

```text
どこで教えるか
→ どこで練習するか
→ 何をEvidenceとして残すか
→ どこで修了確認するか
```

特に:

#### C01〜C04

RubricのMinimum Evidenceを既存Workbookで実際に確認できる内容へ揃える。

- 存在しない`rationale` / `reason`専用columnを暗黙に要求しない
- C03は`impact` / `likelihood` / `priority`等、既存fieldの一貫性から判断できる内容を中心にする
- C04は`risk_id` / `spec_ref` / test condition / precondition / expected result / design technique等の対応で確認する
- 文章による理由説明が必要な場合は、Workbook column追加ではなく自己確認 / Capstone等のEvidence surfaceを明記する

#### C05 Test Layer Selection

Primary learner-facing sourceをP1-3へ合わせる。

bounded Level 2 / Minimum Evidenceも、初学者がP1-3で学ぶLayer Selectionへ合わせる。

Formal Test Strategyは後段の比較 / Referenceとして残す。

#### C07 Web Automation

- learner-authored diff
- Workbook Caseとの対応
- meaningful Locator / Action / Assertion
- successful `training:web:exercise` evidence

#### C08 Native Automation

- learner-authored Flow
- canonical entryから到達
- Business Condition / Assertion
- successful Native exercise artifact

#### C09 Failure Analysis

- meaningful diagnosis
- cause / action
- fix
- re-run result

Artifactを開いただけでは完了としない。

#### C10 Maintainability

P1-8で実際の保守問題を診断し、最小改善と再実行Evidenceを作る。

P1-9では同じrefactorをやり直させず、P1-8のEvidenceを統合して説明できるようにする。

#### C11 Change Management

P2-3で作成したPR / review recordをP2-8で再利用できるようにする。同じPR課題を二重に要求しない。

#### C12 Continuous Execution Design

P2-5でlearner-authored Playwright TestをTraining CIへ接続する実体験と整合させる。

Minimum Evidenceには、Training CopyのPull Requestでlearner-authored exerciseが実際に実行されたRun / Artifactを含める。その同じEvidenceを根拠にTrigger / Gate / Artifact / Failure reasoningを説明し、P2-8でも再利用する。

### 6.19 P1-8をproblem-firstへ整理する

順序:

1. 重複 / 不安定 / setup cost / 可読性の問題を観察
2. 何が問題か説明
3. Helper等の最小手段を選ぶ
4. 必要ならPOM / Fixture等を選ぶ
5. 再実行して改善を確認

POMを扱う場合は`class` / `constructor` / `this`だけ必要な場所で短く説明する。

`Automation Flow`は独立した必須用語から外す。必要な内容は「共通操作」「Helper」等の一般的な表現へ置き換え、`00_learning_design.md`等の関連文書も同期する。

### 6.20 P1-9 CapstoneをEvidence統合の場にする

Common:

- Web中心で完了できる
- Nativeは選択時だけ追加
- baselineだけをC07 / C08 Evidenceにしない
- Spec → Risk → Case → Layer → Tool → Implementation → Evidenceを説明できる
- C09はdiagnosis → fix → re-runまで含む
- C10はP1-8で作成したEvidenceを再利用できる

### 6.21 P2-8をCommon Web + 選択Nativeへ揃える

- Common学習目標からMaestro必須に見える表現を除く
- Native / MaestroはP2-6を選択した場合だけ統合対象にする
- P2-3のC11 Evidenceを再利用できる
- P2-5のlearner-authored CI EvidenceをP2-7のbounded Web CI理解とC12へ接続する

---

## Phase 5: Specification learner navigationと文書不整合を修正する

### 6.22 `docs/spec/README.md`でProduct Behaviorへの入口を先にする

学習者向け順序:

1. `product-scope.md`
2. `roles-and-permissions.md`
3. 対象`features/*.md`のPurpose
4. Business Rules
5. Acceptance Criteria
6. 必要な`state-and-scenarios.md`
7. 必要な`ui-ux-contract.md` / Screen state
8. 実装時だけExecutable Canonical Sources

`Normative Product Behavior`、`Oracle Priority`、Known Deviation、ADR等は「仕様を管理・変更するときのルール」として後段へ置く。

仕様管理上の意味や優先順位自体は変えない。

### 6.23 glossary / change-processの読者境界を整理する

`glossary.md`:

- Product / QA学習に必要な用語を先にする
- Atomic Finding、Learner-safe、Instructor-only等のAgentic QA / Repository管理用語を標準学習経路の前提にしない
- 新しい用語体系を作らない

`change-process.md`:

- Maintainer向け仕様変更手順として維持
- Featureを読む学習者の前提から外す
- リンクと対象読者を明示する

### 6.24 Authenticationのdocumentation metadataを修正する

`authentication.md` Login `validation-error`のCondition / Scenarioを、現行Visual Registry、Seed、Login実装、関連Testと照合する。

確認済みの境界:

- `storage-write-failure`はStorage write failure用Scenario
- 必須入力validationとは別経路
- Expected Product Behavior自体を変える必要はない

Product behaviorを変更せず、`default` Scenarioで空のLogin Formをsubmitするvalidation経路へCondition / Scenario metadataを合わせる。Seed / Application / BR / ACは変更しない。

画像再生成は、既存Visual Referenceが修正後Conditionと一致しないことを確認した場合だけ行う。

### 6.25 `state-and-scenarios.md`のstale pathを修正する

`e2e/fixtures/`への参照を現行`e2e/web/fixtures.ts`等の実際のpathへ修正する。

責務・Product behavior・fixture実装自体は変えない。

---

## Phase 6: 日本語・内部管理用語・Legacy / Optionalを整理する

### 6.26 全文一括置換はしない

各Lessonの意味を確認しながら次の順で行う。

1. 学習者が不要なRepository内部分類をlearner-facing本文から外す
2. 一般的な日本語で十分な英語を日本語にする
3. 技術的な正式名称・定着した用語は維持する
4. identifier、command、path、script名は変更しない

### 6.27 Legacy Capstoneを短いstubへする

`10_part1-capstone.md`は旧Capstone本文を保持しない。

基本内容:

- canonical `09_part1-capstone.md`への案内
- 現在の標準Lessonではないこと

Repository内参照を確認する。外部参照を完全には把握できないため、理由なく削除しない。

### 6.28 Optional Agentic QAはNavigationで分離できるなら移動しない

`09_specification-agentic-qa.md`の内容は今回変更しない。

標準Part 1のNavigationから明確にOptionalと分かる状態を優先する。

物理移動は、現在配置のままではRequired Part 1と誤認する具体的な問題が残る場合だけ行う。移動する場合はRepository内リンクと必要なcompatibility stubを最小範囲で更新する。

---

## Phase 7: validatorを新しい安定契約へ合わせる

### 6.29 既存prose assertionを棚卸しする

`scripts/validate-curriculum.ts`と`tests/contracts/training-curriculum.test.ts`で、今回の教材整理と衝突する自然文token checkを確認する。

例えばP1-7のToolchain説明、Instructor Referenceの英語見出し、READMEの説明フレーズ等、**表現を固定すること自体に意味がないcheck**は削除または構造的なcheckへ置き換える。Training CIについては旧「`training:web:exercise`を含めない」契約も新しいPull Request経路へ更新する。

新しい日本語文言を同じ方法で再固定しない。

### 6.30 維持・追加するvalidatorの基準

次をすべて満たす場合だけ追加・維持する。

- 今回の変更で実際に回帰しやすい
- 機械的に決定的に検証できる
- `validate-curriculum.ts`の責務に合う
- 自然言語表現を固定しなくてよい

対象候補:

- Required curriculum file
- relative link
- Workbook schema / ID / Spec reference
- package script
- Training asset path
- canonical Playwright / Maestro entry
- Training workflow command allowlist / contract
- Common / Native navigationを構造的に安定して判定できる既存契約

### 6.31 追加しないもの

- 旧日本語 / 英語文言が存在しないことの全文検索validator
- 教材が「分かりやすい」ことの判定
- generic orphan detector
- Repository全体向けの新しいMarkdown anchor validator
- learner completion用grader
- 新しいDSL / schema framework

具体的な回帰を現在の既存validatorで防げない場合にだけ、狭いcheckを追加する。

---

## 7. Product Behavior不整合の扱い

### 7.1 同じPRで修正してよい

- stale link / path
- 明らかなCondition / Scenario metadataの参照ミス
- learner navigation
- 説明順序
- 用語
- Product behaviorを変えないdocumentation correction

今回確認済みの対象:

- Authentication `validation-error`のScenario / Condition整合
- `state-and-scenarios.md`のstale fixture path

### 7.2 別対応にする

- BR / ACの意味変更
- Expected UIの変更
- Seedの意味変更
- Application code変更
- Formal Regressionの期待値変更
- Product Decisionが必要な曖昧仕様の確定

実装中にこの境界へ到達した場合、このPRで都合よく判断して変更しない。

---

## 8. commitの分け方

PRは1つにする。commitはレビューしやすい責務へ分ける。

推奨:

1. 学習経路・前提知識・Common / Native境界
2. Workbook sample整合
3. Playwright / Failure / Maestro exercise + Training CI + CI contract test
4. Lesson本文 + Rubric / Capstone
5. Specification learner navigation + documentation correction
6. 日本語・Legacy / Optional整理
7. validator / link / workflow contract整合

実際の差分量に応じて隣接commitを統合してよい。無関係な変更を1 commitへ混在させない。

---

## 9. 検証

作業途中は変更領域に応じたtargeted checkを使い、すべての重いcommandを毎回実行しない。実装完了時にRepository標準の`verify`を実行する。

### 9.1 文書 / Curriculum

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
```

### 9.2 Training TypeScript / contract test

Training script / Playwright spec / workflow contractを変更した場合:

```bash
pnpm run typecheck:training
```

`tests/contracts/training-curriculum.test.ts`を変更した場合は、Repositoryの既存package scriptからこのcontract testを対象実行する。正確なcommandは実装時の`package.json`を確認し、存在しないscript名をPlanで作らない。

### 9.3 Training Web baseline

clean repositoryで環境確認として成功することを確認する。

```bash
pnpm run training:web:baseline
```

### 9.4 Playwright learner exerciseの2状態確認

#### tracked starter

- TypeScriptとして壊れていない
- learner-authored成果物ではない
- C07 Evidenceとして成立しない
- baseline CIの成功を壊さない

#### learner完成状態

実装作業中に一時的なlearner-authored Testを作成し、既存のTraining用Scenario Reset入口を利用して決定的な初期状態から次を確認する。

```bash
pnpm run training:web:exercise
```

確認後、その完成答案をtracked starterへ残さない。

skip、0 test、markerだけで成功扱いにしない。

### 9.5 Failure Analysis

Artifact確認用:

```bash
pnpm run training:web:check-expected-failure
```

確認:

- expected non-zero Playwright runをrunnerが正しく扱う
- Trace / Screenshot / Video / Reportが確認できる

診断用:

- 代表Failureを1ケースずつ再現できる
- Evidenceから原因を説明できる
- 修正後に対象Testが成功する
- `04_execution-improvement.csv`へcause / action / re-runを記録できる

### 9.6 Training Copy / learner CI

`training-ci.yml`またはworkflow contractを変更した場合、disposableなTraining Copyで既存prepare / validate経路を使用する。

既存scriptの正確な引数は実装時のcurrent usage / help / codeを確認して使用し、Plan内の例を新しい契約として固定しない。

確認事項:

- source templateからactive Training workflowが生成される
- baseline用経路が維持される
- `pull_request`でbaseline後にlearner-authored exerciseへ到達する
- repository-owned templateとactive `.github/workflows/**`の役割が一致する
- `training:copy:validate`はprovisioning確認として通る
- learner編集後のremote GitHub Actions runtimeはprovisioning validationと分けて確認する
- Production workflowへ依存しない
- Training workflow contract / contract testが通る

可能ならdisposableなremote Training CopyでPull Requestを作成し、learner exercise RunとArtifactを確認する。remote実行環境を利用できない場合は未確認と記録し、prepare / validate成功をremote runtime成功として扱わない。

### 9.7 Specification

Spec文書を変更した場合:

```bash
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run build:spec
```

AuthenticationでVisual Referenceの再生成が不要な文書metadata修正だけなら、不要な画像再生成を行わない。

### 9.8 Training Native

YAML / Native learner exerciseを変更した場合、利用可能なNative環境で既存経路を確認する。

```bash
pnpm run training:native:baseline
pnpm run training:native:exercise
```

確認する状態:

- baselineは環境 / Runtime確認として成功
- stock starterだけをC08 Evidenceにしない
- temporaryなlearner-authored Flowからcanonical entry経由でsuccessful executionを確認できる

Physical Android Deviceを利用できない場合は未実行と明示する。静的確認や別CIのPASSを実機実行成功として扱わない。

`training/maestro/**`変更によって既存Native CIのchange detection対象になる場合は、そのCI結果も確認する。

### 9.9 Repository全体

実装完了時:

```bash
pnpm run verify
```

`verify`失敗を教材変更だからと無視しない。今回変更による失敗か既存状態かを切り分ける。

---

## 10. 完了条件

次をすべて満たす。

### 学習順序

- P1-1〜P1-3で、まだ説明していないCLI操作を受講者の必須前提にしていない。
- P1-4でCLI / Node / pnpmの最低限を説明した後にWeb / Playwright実行Gateへ進む。
- P1-4より前のlearner-facing資料で`src/seeds/metadata.ts`を必須の第一参照にしていない。
- Product Scope / Roles / Feature BR/AC / State / Scenarioの読書順が教材間で一致している。
- READMEの受講者向け標準NavigationがP1-1から開始し、Workbook / Rubricを必要な段階で参照できる。
- `/guide` / Current UIがExpected Product Behaviorの正本として扱われていない。

### Playwright / Workbook

- P1-4の初回JS/TSがfirst Playwright exerciseに必要な範囲へ絞られ、arrow function / callback等の実際に使う構文に説明漏れがない。
- Locatorの方針が学習目標、本文、演習、自己確認、修了条件で一致する。
- Workbook sampleの代表Caseが1つのBusiness Conditionへ揃い、BR / AC / Scenario / precondition / expected resultが一致する。
- Workbook sampleのAutomation Decision、implementation path、run context、実行前後の状態遷移が新しい学習経路と一致する。
- `evidence`がruntime Evidenceへの参照として扱われ、gitignored / remote Artifactのfile存在を静的validatorで要求していない。
- Playwright baselineは環境確認であり、C07 Evidenceとして扱われない。
- 未編集starterだけではC07修了Evidenceにならない。
- temporaryなlearner-authored完成状態で、Training用Scenario Reset入口を使って`training:web:exercise`成功を確認できる。

### Failure Analysis

- Artifact確認用の恒久Failureと、meaningful diagnosis用exerciseが別契約になっている。
- diagnosisではEvidence → cause → fix → re-runまで一巡できる。
- C09のCommon必須成果物へSecurity専門確認を混在させていない。
- Failure fixtureを必要以上に増やしていない。

### Maestro / Native

- Maestro概念とFlow下書きをToolchain詳細より先に学べる。
- actual exercise実行はDevice準備 / baseline後に行う順序になっている。
- automatic retryと`extendedWaitUntil`の役割を区別できる。
- 過去PR固有の履歴文言がlearner-facing本文に残っていない。
- 未編集starterだけではC08修了Evidenceにならない。
- Native UI自動化はCommon必須へ戻っていない。

### Rubric / Capstone

- C01〜C12で「教える・練習する・Evidence・修了確認」に明確な矛盾がない。
- C01〜C04のMinimum Evidenceが既存Workbookまたは明示された自己確認 / Capstoneで確認でき、存在しないcolumnを要求していない。
- C05の能力定義とMinimum EvidenceがP1-3のLayer Selectionへ合っている。
- C10 / C11は前LessonのEvidenceを不要に作り直さずCapstoneへ統合できる。
- C12がP2-5のlearner exercise CI体験へ接続し、Pull Request上のactual Run / ArtifactをMinimum Evidenceとして再利用できる。
- P1-9はWeb Commonだけで完了できる。
- P2-8もWeb Commonだけで完了でき、Nativeは選択時だけ追加される。

### GitHub Actions

- P2-4のYAML / GitHub Actions説明だけでTraining workflowの基本構造を読める。
- P2-5でPart 1のlearner-authored Playwright TestをTraining Copyの`pull_request` CIへ接続できる。
- P2-4でTraining CopyのTrust Boundaryを壊す自由編集を必須化していない。
- P2-7のCommon内容がbounded Web CIへ揃い、full deliveryをCommon必須にしていない。
- Repository本体のRequired Web CIでbaselineの責務を壊していない。
- Production / Preview workflowを教材都合で再設計していない。

### Specification / 文書

- `docs/spec/README.md`から学習者がProduct Behaviorへ先に進める。
- `Normative` / `Oracle` / Executable Source等が初学者の最初の読解前提になっていない。
- Authenticationの`validation-error` Scenario / Condition metadataが`default` Scenario + empty login submitのvalidation経路と整合している。
- `state-and-scenarios.md`に存在しないfixture path参照が残っていない。
- Product behavior変更が教材改善へ混入していない。

### Legacy / validator

- `10_part1-capstone.md`がcanonical Capstoneと矛盾する旧本文を持たない。
- Optional Agentic QAがRequired Part 1の標準経路と混同されない。
- Agentic QA本文そのものを不要に再設計していない。
- `validate-curriculum.ts`と`training-curriculum.test.ts`が今回整理したlearner proseの表現を不必要に固定していない。
- Training CIの旧「exerciseを含めない」contractが残っていない。
- Workbook / path / script / canonical entry等の必要な構造契約は維持されている。
- `Automation Flow`が独立した必須用語として残っていない。

### 検証

- targeted validationを変更領域ごとに実施している。
- `pnpm run validate:curriculum`が通る。
- Spec変更に応じたvalidation / buildが通る。
- `pnpm run verify`が通る。
- Native実機を利用できなかった場合は未実行として記録し、成功したように扱っていない。

---

## 11. 実装時に避けること

- 文言を変えるためだけのRepository全体一括置換
- Lesson番号の大規模な振り直し
- 新しいCLI / JavaScript / YAML入門コースの追加
- 既存Training runnerの作り直し
- starterを完成済みサンプルへ戻すこと
- learner completion判定のためだけにtracked starterを人工Failureへすること
- skip / markerだけをlearner Evidenceとして扱うこと
- Failure fixtureの全分類網羅
- 本当にflakyなTiming fixtureを教材として作ること
- Workbook schemaの不要な拡張
- runtime Artifactをtracked Repository fileとして扱うこと
- 4 Canonical CSVとは別に8つのSheet成果物を必須化すること
- Capstoneで既存LessonのEvidenceを同じ課題として作り直させること
- POM / Fixture等を使うこと自体を修了条件にすること
- `Automation Flow`を独立した必須概念として残すこと
- Product Behaviorの曖昧さを教材側で勝手に確定すること
- Formal Regressionを教材のLocator例へ合わせて一括変更すること
- NativeをCommon必須へ戻すこと
- Production / Preview / Native CI基盤を教材都合で再設計すること
- P2-4のためだけにworkflow command allowlistを大量に広げること
- `training:copy:validate`成功をlearner編集後のremote Actions成功とみなすこと
- Agentic QAを通常のテスト自動化初学者向けLessonへ混在させること
- Optional Agentic QAの物理移動を目的化すること
- validatorで自然言語の良し悪しを判定すること
- 新しい日本語文言をliteral assertionとして固定し直すこと
- 将来の教材追加だけを理由にした抽象化、framework、dependencyの追加