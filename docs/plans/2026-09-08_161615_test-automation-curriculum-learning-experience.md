# テスト自動化カリキュラム 学習体験改善 実装計画

## 0. 目的

`docs/curriculum/test-automation/**`、`training/**`、関連する`docs/spec/**`を対象に、Scenario Shopを使ったテスト自動化学習を、コードベース自動化の初学者が途中で前提知識不足に詰まらず、仕様分析からPlaywright / Maestroの実装、失敗分析、保守、CIまで一貫して学べる構成へ改善する。

今回の改善は、学習順序、演習、評価、仕様書への導線、用語、Legacy文書を同じ目的の変更として**1 PRにまとめる**。

ただし、Scenario ShopのExpected Product Behaviorそのものを決め直す変更はこのPRへ混在させない。実装・Seed・仕様を確認した結果、Product Decisionやアプリ挙動変更が必要と判明した事項は別対応とする。

このPlanでは実装しない。実装時は本Planを正本として、必要な変更だけを行う。

---

## 1. 現状確認

`main` `f7cc237d8ca719646d9654fba2129732b6eab457`を基準に確認した。

### 1.1 カリキュラム全体

`docs/curriculum/test-automation/README.md`では、対象者をPlaywrightなどのコードベース自動化未経験、プログラミング経験を必須としない受講者としている。一方で、本文には次のような管理・評価用の英語表現が多く残っている。

- `Common`
- `Common route`
- `Common completion`
- `Learner Required`
- `Repository-required asset`
- `Native specialization`
- `bounded Level 2`
- `Current Guarantee`
- `Normative Specification`
- `Oracle`
- `Evidence`
- `completion contract`

Playwright、Maestro、Locator、Fixture、Trace、GitHub Actionsなどの技術的な正式名称とは性質が異なり、学習者が最初に理解する必要のない管理用語が本文へ露出している。

### 1.2 Part 1-2

`docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md`は、分析段階の教材として`src/seeds/metadata.ts`を挙げ、Lesson 6でも直接読む構成になっている。

同じ情報へ人間向けに到達できる`docs/07_testability/seed_catalog.md`が存在するため、TypeScriptをまだ学んでいない段階では、まず人間向け資料を利用し、実装ファイルの確認はPlaywright実装以降へ遅らせられる。

### 1.3 Part 1-4

`docs/curriculum/test-automation/part1/04_playwright-foundations.md`にはJavaScript / TypeScriptの最小説明があるが、Playwright実行前に必要な次の基礎操作がまとまっていない。

- terminalを開く
- current directoryを確認・移動する
- file / directory / pathを読む
- Node.jsとpackage managerの役割を理解する
- `package.json`と`scripts`の関係を理解する
- `pnpm install`、`pnpm run <script>`を実行する
- commandの成功・失敗を終了状態とError Messageから判別する
- 必要な環境変数を設定する

また、Playwrightの最初のLessonで学ぶ内容と、config / reporter / retries / trace / screenshot / videoなど後続のFailure Analysisで学ぶ内容の境界をさらに整理できる。

Locatorについては、教材本文ではRole / Label / Text / UI Test ID / CSSの順で候補を並べているが、Playwright公式は固定順位ではなく、user-facing attributeやexplicit contractを優先し、CSS / XPathへの強い依存を避ける方針を示している。実装時はこの原則に合わせて説明する。

### 1.4 Playwright learner exercise

`training/playwright/exercises/training-exercise-starter.spec.ts`は未編集でもPASSする。

現在の内容は次の状態である。

- `page.goto("/products")`
- CSS selector `a[href^="/products/"]:visible`
- `first()`
- `toBeVisible()`

コメントでは受講者がRisk-based assertionを追加することを求めているが、実行結果だけを見ると変更しなくても成功する。

また、初学者向け教材でsemantic locatorを教えている一方、starterがCSS selectorを完成済みの形で提示しているため、教材本文との整合を改善する必要がある。

### 1.5 Failure Analysis

`training/playwright/failure-exercises/expected-failure.spec.ts`は、`expect(true).toBe(false)`で必ず失敗する構成である。

Artifactを生成してTrace / Screenshot / Videoの開き方を学ぶ用途としては成立するが、Locator、期待値、初期状態、同期などをEvidenceから切り分ける実践にはならない。

一方、`docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`の完了条件はmeaningful diagnosisを要求しているため、教材と演習の強さを合わせる必要がある。

### 1.6 Maestro learner exercise

`training/maestro/exercises/native-training-exercise.yaml`は次だけで構成されている。

```yaml
- runFlow: ../baseline/native-training-baseline.yaml
- assertVisible: "Scenario Shop"
```

未編集でもbaselineを再実行してPASSできるため、C08で要求しているlearner-authored Native exercise diffと実際の演習体験が一致していない。

`docs/curriculum/test-automation/part1/07_maestro-native-automation.md`は、Maestroの基本概念より前にPhysical Android Device、JDK、SDK、ADB、serial、PowerShell helper、runId、Artifactなどの詳細な実行契約が長く続く。Native specializationを選択した初学者に対しては、まずMaestro Flowの読み方・書き方を学び、その後にScenario Shop固有の実行手順へ進む方が学習順序として自然である。

### 1.7 Competency Rubric

`docs/curriculum/test-automation/02_competency-rubric.md`のC05 `Test Layer Selection`は、Primary learner-facing sourceをPart 1-6と`docs/08_testing/test_strategy.md`としている。

一方、テスト設計・自動化対象選定はPart 1-3で学ぶため、少なくとも「教える場所」「練習する場所」「評価する場所」の対応を再確認する必要がある。

C07 / C08 / C09はlearner-authored changeやmeaningful diagnosisをMinimum Evidenceとしているため、starter / failure exerciseもその評価契約に合わせる。

### 1.8 Specification入口

`docs/spec/README.md`は、冒頭から次の管理概念を説明している。

- Normative Product Behavior
- Supporting / Operational
- Executable Canonical Sources
- Oracle Priority
- Known Deviation
- ADR

仕様管理上は必要だが、学習者がCartやAuthenticationなどのProduct Behaviorを理解する入口としては情報量が多い。

学習者向けには、まず次の順で読める導線を用意する。

1. Product Scope
2. Roles and Permissions
3. 対象FeatureのPurpose
4. Business Rules
5. Acceptance Criteria
6. State / Scenario
7. 必要なScreen / UI state
8. 実装時だけRoute / Test ID / Seed ID等の低レベル値

仕様管理ルールは削除せず、学習者向け導線より後へ分離する。

### 1.9 Legacy / Optional文書

`docs/curriculum/test-automation/part1/10_part1-capstone.md`はLegacy Aliasと明記されているが、本文にはPlaywrightとMaestroの両方を必須とする旧完了条件が残っている。現在のcanonical `09_part1-capstone.md`ではNative specializationは選択式であり、内容が一致していない。

`docs/curriculum/test-automation/part1/09_specification-agentic-qa.md`はOptional Referenceと明記されているが、Required Part 1と同じ`part1/`配下で`09_`番号を持つため、学習順序の把握を難しくしている。

### 1.10 Validator / CI

`scripts/validate-curriculum.ts`はcanonicalなPart 1の9 Lesson、Part 2の8 Lesson、Training資産、Workbook、各scriptを検証している。

`10_part1-capstone.md`と`09_specification-agentic-qa.md`はRequired Curriculumの一覧には含まれない。

`.github/workflows/ci.yml`で自動実行しているTraining Webは`pnpm run training:web:baseline`であり、learner exerciseはCIのrequired baselineとして実行していない。このため、learner exerciseを「未編集のまま学習完了に見えないstarter」へ変更しても、baseline CIとの責務分離は維持できる。

---

## 2. 完了時に目指す状態

### 学習者

- プログラミング未経験でも、Playwright実行前に必要なterminal / Node.js / pnpmの最低限を理解できる。
- Product Behaviorを先に読み、管理用の仕様概念に阻まれずテスト分析へ進める。
- Playwright / Maestroのbaselineと自分が実装するexerciseを区別できる。
- starterを実行しただけでは演習完了にならず、自分でテスト条件をコードまたはFlowへ落とす必要がある。
- Failure Artifactを開くだけでなく、複数種類のFailureから原因を切り分けられる。
- Part 1 CommonはWeb中心で完了でき、Nativeは選択式のまま維持される。

### 教材

- 「教える → 練習する → 評価する」の対応がRubricまでつながっている。
- 同じ概念を複数の管理用語で表現しない。
- 技術的な正式名称は維持し、一般的な説明は自然な日本語にする。
- Learner / Instructor / Maintainer向け情報の境界が分かる。
- Legacy文書がcanonical教材と矛盾しない。

### Repository

- Formal Regression、Production CI/CD、Product Behaviorを教材改善の都合で変更しない。
- Training baselineは未編集で環境確認としてPASSする。
- learner exerciseはlearner-authoredな変更を要求する。
- 既存validatorは必要な契約だけを検証し、教材の新構造と矛盾しない。

---

## 3. 対象範囲

主な変更候補は次のとおり。

### Curriculum

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`
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
- `docs/curriculum/test-automation/part2/04_ci-github-actions.md`
- 必要に応じてPart 2の関連Lesson

### Training

- `training/playwright/exercises/**`
- `training/playwright/failure-exercises/**`
- `training/maestro/exercises/**`
- 必要に応じて`training/workbook/**`
- learner exerciseの実行契約変更に必要な範囲だけ`scripts/training/**`

### Specification / reference

- `docs/spec/README.md`
- `docs/spec/glossary.md`
- `docs/spec/change-process.md`
- 必要に応じて学習者向けNavigationに関係する`docs/spec/**`

### Validation

- `scripts/validate-curriculum.ts`
- 必要な場合だけ関連validator test

---

## 4. 非対象

今回のPRでは次を行わない。

- Scenario ShopのProduct Behavior変更
- `src/**`のアプリ機能変更
- Formal Regressionのテストケース再設計
- Production / Preview / Deploy workflowの再設計
- Maestro / Playwrightの新しい実行基盤作成
- 新規package導入
- JavaScript / TypeScript全般を教える独立プログラミング講座の追加
- Git / GitHub / CIの教材をゼロから作り直すこと
- 仕様ファイル全体の分割・再構築
- 将来用途だけを理由にした教材frameworkや汎用validator基盤の追加
- Agentic QA自体の仕様・Harness・評価方式の変更
- `docs/reports/**`をCurrent Specificationとして扱うこと

---

## 5. 実装方針

### 5.1 1 PR内で段階的に進める

PRは1つにまとめるが、変更は次の順で行う。

1. 学習経路と前提知識
2. Playwright / Failure / Maestro演習
3. Competency RubricとCapstone
4. Specificationの学習者向け導線
5. 日本語・用語・Legacy整理
6. Validator調整

前段で確定した構造を後段が参照する。先に全文の用語置換を行い、その後に教材構造を変更する進め方は避ける。

### 5.2 技術用語と管理用語を分ける

維持する例:

- Playwright
- Maestro
- Locator
- Fixture
- Trace
- GitHub Actions
- Page Object Model
- Deep Link

日本語化または学習者向け本文から除く候補:

- Common route → 共通学習経路
- Common completion → 共通修了条件
- Learner Required → 受講必須
- Native specialization → Native UI自動化（選択）
- Current Guarantee → 現在保証している範囲
- completion contract → 修了条件
- Repository-required asset → Repository運用上必要な資料、またはInstructor / Maintainer側へ移動

`Normative`、`Oracle`、`Executable Canonical Sources`などは仕様管理上必要な箇所に限定し、学習者がProduct Behaviorを理解するための最初の説明には使わない。

### 5.3 既存の仕組みを再利用する

- Seed情報の初学者向け入口には既存`docs/07_testability/seed_catalog.md`を使う。
- Training baseline / exercise / failure-exerciseの既存ディレクトリ境界を維持する。
- Playwright Training config、Maestro runner、Training Copyを新しく作り直さない。
- Workbookの既存4 CSVを維持する。
- Formal Regressionは比較教材として維持する。

---

## 6. 実装手順

## Phase 1: 学習経路と前提知識を修正する

### 6.1 Learner / Instructor / Maintainerの境界を明確にする

`README.md`と`00_learning-design.md`を中心に、受講者が読む標準経路と、運営・Repository管理のための資料を分ける。

学習者向け標準経路では、Repository運用上の分類名を必要最小限にする。

`03_instructor-reference.md`へ移した方が自然な環境準備、保証範囲、運用契約は、learner-facing Lessonへ重複して残さない。

### 6.2 Part 1-2のSeed参照順を修正する

`02_scenario-shop-analysis.md`では、最初の分析時に`src/seeds/metadata.ts`を必須読解させない。

基本順序を次にする。

1. Scenario Shop `/guide`
2. `docs/spec/state-and-scenarios.md`
3. `docs/07_testability/seed_catalog.md`
4. 実装段階で必要になったときだけ`src/seeds/metadata.ts`

Executable Sourceを確認する考え方自体は残すが、TypeScriptの読解を分析Lessonの前提にしない。

### 6.3 Playwright開始前の最低限のPC / Node操作を追加する

Lesson番号を増やして全体をずらすことは避け、`04_playwright-foundations.md`の冒頭で、コードを書く前に必要な最低限の操作を短く追加する。

対象:

- terminal
- current directory
- relative path
- Node.js
- pnpm
- `package.json`
- `scripts`
- `pnpm install`
- `pnpm run ...`
- command success / failure
- 必要な環境変数

Windows / macOS / Linuxの詳細なOS入門にはしない。Scenario Shopを起動・Training commandを実行するために必要な範囲に限定する。

### 6.4 Part 1-4の初回Playwright内容を絞る

最初の到達点を次に絞る。

- `test`
- `page`
- `goto`
- Locator
- Action
- Assertion
- `async` / `await`の最低限
- Auto-wait
- `pnpm run training:web:exercise`

Reporter、Retry、Trace、Screenshot、Video、詳細configはP1-6との重複を確認し、最初のLessonで必須にしない。

### 6.5 Locator説明をPlaywright公式方針へ合わせる

固定順位を暗記させず、次の原則へ整理する。

- user-facing attributeを優先する
- UIの意味を表すexplicit contractも利用する
- Test IDは用途に応じて有効
- CSS / XPathはDOM実装へ強く依存する場合があるため最後の手段とする

実装時はPlaywright公式の現行ドキュメントを確認する。

- https://playwright.dev/docs/locators
- https://playwright.dev/docs/actionability

### 6.6 Part 2-4へ最小YAML説明を追加する

Maestroを選択しない受講者でもGitHub ActionsでYAMLを読むため、`04_ci-github-actions.md`の冒頭に次だけを追加する。

- `key: value`
- list
- indentation / nesting
- string
- GitHub Actionsの`${{ ... }}`がYAML自体の構文ではないこと

YAML仕様全体の解説には広げない。

---

## Phase 2: learner exerciseを実際の演習へ変更する

### 6.7 Playwright baselineとexerciseの責務を明示する

定義を統一する。

- baseline: 環境・Training harness・対象アプリが動くことを確認する。未編集でPASSしてよい。
- exercise: 受講者がSpec / Risk / Test Caseを基に実装しなければ完了しない。

`training/playwright/exercises/training-exercise-starter.spec.ts`は、未編集の状態を完成済みテストとして扱えない形へ変更する。

具体的な方式は実装時に、次を満たす最小構成から選ぶ。

- learner-authoredなLocator / Action / Assertionが必要
- TypeScriptとしては理解しやすい
- 完成形を先に見せない
- CIのTraining baselineを壊さない
- `pnpm run training:web:exercise`で受講者が自分の完成結果を確認できる

現在のCSS selector完成例は削除するか、「改善前の例」として明示的な課題へ変える。

### 6.8 Playwright exerciseをWorkbookへ接続する

少なくとも1つのexerciseについて、次を一巡させる。

```text
Spec BR / AC
→ Risk
→ Test Case
→ Automation decision
→ Playwright実装
→ 実行
→ Evidence
```

新しいWorkbook形式は作らず、既存CSVを使う。

### 6.9 Failure exerciseを2種類へ分ける

1. Artifactを開く練習
   - 意図的に単純失敗させる
   - Trace / Screenshot / Video / Reportを確認する

2. 原因分析の練習
   - Evidenceを見ないと原因を特定しづらいFailureを用意する

原因分析用は代表的な複数原因にする。

候補:

- Locator誤り
- Expected value誤り
- Seed / initial state誤り
- Timing / synchronizationの誤解

すべてを網羅するfixture集にはしない。P1-6のC09を満たすのに必要な代表例へ絞る。

`expect(true).toBe(false)`はArtifactの開き方教材として残してよいが、それだけでC09 completionにはしない。

### 6.10 Maestro LessonをFlow-firstへ並べ替える

P1-7の本文順を次へ変更する。

1. Maestroとは
2. YAMLの最小構造
3. Flow
4. `launchApp`
5. `tapOn`
6. `inputText`
7. selector / Stable UI Test ID
8. `assertVisible`等のAssertion
9. 自動待機の考え方
10. 必要な場合だけ`extendedWaitUntil`
11. scroll
12. `runFlow` / subflow
13. Deep Link / Test Control / parameter
14. Scenario Shop learner exercise
15. Physical Android Deviceの詳細な準備・実行
16. Artifact / Evidence

既存Physical Device契約は削除しない。概念学習より前に長く出ている順序を修正する。

実装時はMaestro公式の現行Documentationでcommand名と推奨動作を確認する。

### 6.11 Maestro exerciseも未編集完了を防ぐ

`native-training-exercise.yaml`はbaseline再実行だけで完了しない形へ変更する。

必要条件:

- learner-authoredなFlow変更が必要
- baselineは別commandで確認済みという前提を維持
- Stable UI Test IDを1つ以上使う
- Business Conditionに対応するAssertionを持つ
- canonical entryから到達できる
- `training:native:exercise`で実行できる

Android環境を利用できない受講者の扱いは現在どおりNative選択時のEnvironment blockとし、Common修了条件へ昇格させない。

---

## Phase 3: 評価とCapstoneを合わせる

### 6.12 Competencyごとに「教える・練習する・評価する」を確認する

C01〜C12について、Primary learner-facing sourceとMinimum Evidenceを実際の教材へ合わせる。

特に確認する。

- C05 Test Layer Selection
- C07 Web Automation
- C08 Native Automation
- C09 Failure Analysis
- C10 Maintainability

C05はPart 1-3で学習している内容との関係を明示し、Formal Test Strategyだけを初学者のPrimary sourceにしない。

### 6.13 Part 1-8の抽象化を減らす

Helper、POM、Component Object、Fixture、Automation Flow、Seed Scenarioを同時に分類暗記させない。

次の順にする。

1. 実際の重複・不安定・準備コストを観察する
2. 問題を特定する
3. 最小の改善手段を選ぶ
4. 再実行して改善を確認する

`Automation Flow`が一般的な用語として不要で、Maestro Flowとも紛らわしい場合は削除または通常の「共通操作」「Helper」等へ置き換える。

### 6.14 CapstoneをRubricと一致させる

canonical `09_part1-capstone.md`について次を確認する。

- CommonはPlaywright中心で完了できる
- Nativeは選択時だけ要求する
- baseline PASSだけではC07 / C08のEvidenceにならない
- C09はmeaningful diagnosisを含む
- Spec → Risk → Test Case → Layer → Tool → Evidenceが追跡できる

---

## Phase 4: Specificationの学習者向け入口を整理する

### 6.15 `docs/spec/README.md`の最初に学習者向け読書順を置く

仕様管理ルールを削除せず、Product Behaviorを読む入口を先にする。

推奨順:

1. `product-scope.md`
2. `roles-and-permissions.md`
3. 対象`features/*.md`
4. 必要な`state-and-scenarios.md`
5. 必要な`ui-ux-contract.md`
6. 実装段階でExecutable Canonical Sources

`Normative Product Behavior`、`Oracle Priority`、Known Deviation等の管理ルールは、その後に「仕様を管理・変更するときのルール」としてまとめる。

### 6.16 glossaryをProduct用語と管理用語に分ける

`docs/spec/glossary.md`を確認し、通常のテスト自動化学習で必要なProduct / QA用語と、Agentic QA / Repository管理用語が混在している場合は、学習者の標準経路から後者を分離する。

新しい大規模な用語体系は作らない。

### 6.17 `change-process.md`を標準学習経路から外す

仕様変更を行うMaintainerには必要だが、Featureを読む受講者の前提にはしない。

リンクは残し、対象読者を明記する。

### 6.18 具体的な仕様不整合を再確認する

実装時に少なくとも次を再確認する。

#### Authentication

`docs/spec/features/authentication.md`のLogin `validation-error`は、Condition / Scenarioが`storage-write-failure`なのに、Expected UIは必須入力不足のSummaryになっている。

次を照合する。

- `src/seeds/metadata.ts`
- `src/application/use-cases/auth-use-cases.ts`
- Login UI実装
- 必要なら関連Test

単純な文書上のScenario参照誤りで、Expected Product Behaviorを変更しないことが確認できる場合だけ本PRで修正する。

Product Decisionまたはアプリ挙動変更が必要なら、本PRでは変更せず別対応へ分離する。

#### State / Scenario reference

`docs/spec/state-and-scenarios.md`からfixture等への参照が現在のRepository pathと一致するか再確認する。

単純なstale pathなら本PRで修正する。責務変更を伴う場合は別途判断する。

---

## Phase 5: 日本語・用語・Legacyを整理する

### 6.19 全文一括置換はしない

各Lessonの意味を確認しながら、次の優先順位で直す。

1. 学習者が理解する必要のないRepository内部分類を本文から外す
2. 一般的な日本語で十分な英語を日本語にする
3. 技術的な正式名称は維持し、初出で必要なら短く説明する
4. identifier、command、path、script名は変更しない

### 6.20 Legacy Capstoneを最小stubへ縮小する

`10_part1-capstone.md`はcanonical `09_part1-capstone.md`と矛盾する旧教材本文を持たせない。

Repository内参照を確認したうえで、既存リンク互換性が必要なら次だけを持つLegacy Aliasへ縮小する。

- canonical documentへのリンク
- 現在の標準Lessonではないこと

外部参照を完全には把握できないため、理由なく削除しない。

### 6.21 Optional Agentic QAをPart 1標準Lessonと混同しない配置へ整理する

`09_specification-agentic-qa.md`へのRepository内参照を確認する。

第一候補は、Required Part 1とは別のreference位置へ移し、Repository内リンクを更新することとする。

旧pathの互換性が必要なら短い案内stubを残す。Agentic QA本文の内容変更は今回の目的ではない。

移動による差分の方が大きく、Navigation上の明確化だけで十分な場合は、無理にfile moveを行わない。実装時に最小変更を選ぶ。

---

## Phase 6: Validatorを必要な範囲だけ更新する

### 6.22 canonical Lessonの検証を維持する

現在の`REQUIRED_CURRICULUM_FILES`でPart 1 1〜9、Part 2 1〜8を正本とする考え方は維持する。

Legacy / OptionalファイルをRequiredへ戻さない。

### 6.23 learner exerciseの契約を必要なら検証する

教材変更後、同じ問題が戻る可能性が高く、簡単に決定的に検証できるものだけ追加する。

候補:

- baselineとexerciseのpath境界
- canonical Maestro exercise entry
- Legacy Capstoneが旧完了条件本文を持たないこと
- Optional ReferenceがRequired navigationへ混入していないこと

自然言語の品質や学習効果をvalidatorで無理に判定しない。

### 6.24 汎用validator frameworkは作らない

今回必要なチェックは`scripts/validate-curriculum.ts`の既存構造へ追加する。

新しいDSL、schema framework、generic document linterは導入しない。

---

## 7. Product Behavior不整合の扱い

今回のPRの境界を次で固定する。

### 同じPRで修正してよい

- stale link
- stale path
- 明らかな文書内のScenario参照ミス
- learner navigation
- 説明順序
- 用語
- Product Behaviorを変えないmetadata / documentation correction

### 別対応にする

- BR / ACの意味を変更する
- Expected UIを変更する
- Seedの意味を変更する
- Application codeを変更する
- Regressionの期待値を変更する
- Product Decisionが必要な曖昧仕様を確定する

判断できない場合は、このPRで都合よく解釈して修正しない。

---

## 8. 実装時の変更単位

PRは1つだが、commitは次の責務ごとに分ける。

1. 学習前提と学習順序
2. Playwright learner exercise
3. Failure Analysis exercise
4. Maestro learner exerciseとLesson順序
5. Rubric / Capstone / Maintainability
6. Specification learner navigation
7. 日本語・用語・Legacy整理
8. Validator / link整合

実際の差分量に応じて隣接commitを統合してよいが、無関係な変更を1 commitへ混在させない。

---

## 9. 検証

### 9.1 文書・契約

最低限、次を実行する。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run typecheck:training
```

Specification生成物への影響を確認する。

```bash
pnpm run build:spec
```

### 9.2 Training Web

baselineは未編集状態でPASSすることを確認する。

```bash
pnpm run training:web:baseline
```

learner exerciseは、starterの意図した未完成状態と、完成例を一時的に作った場合のPASSを分けて確認する。

実装上、starterを意図的Failureにする場合は、それを`pnpm run verify`やCI required jobへ誤って含めない。

Expected Failure runnerを変更した場合は次を確認する。

```bash
pnpm run training:web:check-expected-failure
```

### 9.3 Training Native

YAML / runnerを変更した場合は、可能な環境で次を確認する。

```bash
pnpm run training:native:baseline
pnpm run training:native:exercise
```

Physical Android Deviceを利用できない環境では、実行できなかったことを明示し、TypeScript / YAML / validatorの静的確認結果と混同しない。

### 9.4 最終確認

実装完了後はRepository標準の最終検証を行う。

```bash
pnpm run verify
```

`verify`失敗を教材変更だからと無視しない。失敗原因が今回の変更か、既存状態かを切り分ける。

---

## 10. 完了条件

次をすべて満たしたら完了とする。

- コードベース自動化未経験者向けのterminal / Node.js / pnpm前提がPlaywright実行前に説明されている。
- P1-2でTypeScript実装ファイルを最初の分析入口にしていない。
- P1-4の最初のPlaywright学習内容がLocator / Action / Assertion / Auto-wait中心に整理されている。
- Playwright starterを未編集で実行しただけではC07 completionにならない。
- Maestro starterを未編集で実行しただけではC08 completionにならない。
- Artifactを開くための単純Failureと、C09向けの原因分析exerciseが区別されている。
- P1-7でMaestro概念をAndroid toolchain詳細より先に学べる。
- P2-4にGitHub Actionsを読むための最小YAML説明がある。
- C01〜C12のPrimary source / exercise / Minimum Evidenceに明確な矛盾がない。
- Common修了条件とNative選択経路が全教材で一致している。
- `docs/spec/README.md`から学習者がProduct Behaviorへ直接進める。
- Maintainer向け仕様管理概念が学習者の最初の前提になっていない。
- `10_part1-capstone.md`がcanonical Capstoneと矛盾する旧本文を持たない。
- Optional Agentic QAがRequired Part 1の学習順序と混同されない。
- 技術名称を除き、不必要な英語・内部管理用語がlearner-facing本文から減っている。
- Product Behavior変更が教材改善に紛れ込んでいない。
- `pnpm run validate:curriculum`、関連spec validation、`pnpm run verify`が通る。

---

## 11. 実装時に避けること

- 文言を変えるためだけの全Repository一括置換
- Lesson番号の大規模な振り直し
- 既存Training runnerの作り直し
- starterを完成済みサンプルへ戻すこと
- exerciseのPASS数を増やすこと自体を目的にすること
- Product Behaviorの曖昧さを教材側で勝手に確定すること
- NativeをCommon必須へ戻すこと
- Agentic QAを通常のテスト自動化初学者向けLessonへ混在させること
- Validatorで自然言語の良し悪しまで機械判定しようとすること
- 将来の教材追加を理由にした抽象化や新規dependency
