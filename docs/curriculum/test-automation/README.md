# テスト自動化カリキュラム

## 目的

このカリキュラムは、単にPlaywrightやMaestroの操作方法を覚えるのではなく、テスト対象の理解からテスト分析・設計、自動化対象の選定、実装、実行、結果分析、保守、CI/CDへの組み込みまでを一連の流れとして学ぶことを目的とします。

最終的には、受講者が次の2段階へ到達することを目指します。

### Part 1: テスト自動化の基礎と実践

- テスト自動化の目的、適用範囲、限界を説明できる。
- テスト対象を調査し、Google Sheetsなどのスプレッドシートでテスト分析・設計を行える。
- 自動化に向くテストと向かないテストを判断できる。
- PlaywrightでWeb UIテストを設計・実装・実行できる。
- MaestroでNative UIテストを設計・実装・実行できる。
- Trace、Screenshot、Video、JUnitなどの実行結果から失敗原因を分析できる。
- テストが増えた運用フェーズで、Helper、Page Object Model、Fixture、Automation Flow、Seed Scenarioなどを選択肢として使い分けられる。
- テスト資産を整理し、Flaky Test、重複、実行時間、保守性を改善できる。

### Part 2: 開発プロセスへの組み込みと実務導入

- 一般的なソフトウェア開発と変更管理の流れを説明できる。
- Gitによるバージョン管理の基本を理解できる。
- GitHub上でBranch、Commit、Pull Request、Reviewを扱える。
- CIの目的を説明し、GitHub Actions上で自動テストを実行できる。
- PlaywrightとMaestroをCIへ組み込み、ReportやArtifactを残せる。
- PR、main、Nightly、Manualなどの実行タイミングを目的に応じて設計できる。
- Quality Gate、Build、Preview、Production、Deploy後Smokeまで含めたCI/CDの構成を理解できる。
- Scenario Shopを題材に、案件へテスト自動化を導入するための実行基盤を設計できる。

## この文書群のスコープ

このディレクトリは、テスト自動化学習の**カリキュラム設計と教材要件**を定義するものです。

この段階では、次の実装そのものは行いません。

- 受講者専用のPlaywright ProjectやConfigの追加
- 受講者専用のspec実行Scriptの追加
- 演習用GitHub Actions Workflowの追加
- Google SheetsへImportするCSVや実ファイルテンプレートの追加
- Root READMEやApplication Codeの変更

各モジュールに記載する「実装する」「実行する」という表現は、**カリキュラム提供時に必要な教材実行環境が用意されていることを前提とした学習行為**を表します。

現行Repositoryの完成済みPlaywright / Maestro / CI/CDは、参照教材・比較教材として利用します。受講者向けの安全な実行境界をどのように用意するかは、このカリキュラム設計をもとに後続の教材実装で決定します。

## 教材

**すべての教材・演習では、このリポジトリ `qa-training-store` のScenario Shopを使用します。**

架空のTodoアプリや別のサンプルプロジェクトへ切り替えず、同じテスト対象を継続して利用します。学習が進むにつれて、同じ機能を異なる観点から分析し、実装し、改善することで、知識のつながりを理解できる構成とします。

主に次の実装を教材として利用します。

- Scenario Shop Web / Nativeアプリ
- `src/seeds/metadata.ts` のSeed Scenario
- `e2e/web/` のPlaywright E2E
- `e2e/web/fixtures.ts` の共通処理とSeed Scenario制御
- `playwright.config.ts` のProject、Reporter、Artifact設定
- `maestro/` のMaestro Flow
- `.github/workflows/ci.yml` のWeb CI/CD
- `.github/workflows/native-ci.yml` のAndroid Build / Runtime / Maestro
- `.github/workflows/native-ios-ci.yml` のiOS Simulator / Maestro
- `tests/unit/`、`tests/integration/`、`tests/component/`、`tests/contracts/` などのテスト層
- `/guide` とTest Control
- Cloudflare Pages Preview / Productionのデプロイ経路

## 学習設計の原則

1. ツールより先に、テスト自動化の目的とプロセスを学びます。
2. GitHubアカウントをPart 1の前提条件にしません。
3. テスト分析・設計はスプレッドシートを基本教材とします。
4. PlaywrightのSyntax暗記ではなく、テスト条件からコードへ落とす流れを重視します。
5. MaestroはPlaywrightの後に学び、WebとNativeの共通点・相違点を理解します。
6. Helper、POM、Fixture、Automation Flow、Seed Scenarioは最初から正解として教えません。
7. まず自動テストを複数実装し、運用上の問題を体験した後に保守・管理手法として学びます。
8. POMは必須パターンではなく、保守上の問題を解決する選択肢の一つとして扱います。
9. Part 2ではGit/GitHub自体を目的化せず、一般的な開発プロセスと自動テストの接続を学びます。
10. 最終演習では完成済みのCI構成を先に正解として見せず、自分で設計した後に現在のRepositoryと比較します。
11. 教材実装では、学習用の変更が現在のRegression Suiteや本番向けCI/CDへ意図せず混入しない境界を用意します。
12. 学習者がRepositoryへ直接Pushできることを前提にせず、Part 2ではForkや演習用Copyを利用できる構成にします。
13. Part 1をZIPなどGit管理されていないCopyで進めた受講者は、Part 2開始時にGit Historyを持つ同じ `qa-training-store` の演習用Copyへ成果物を引き継ぎます。

## 全体構成

### 共通

1. [学習方針と進め方](./00_learning-design.md)
2. [スプレッドシートによるテスト分析・設計](./01_spreadsheet-test-design.md)

### Part 1: テスト自動化の基礎と実践

1. [テスト自動化の基礎](./part1/01_test-automation-foundations.md)
2. [Scenario Shopの探索とテスト対象分析](./part1/02_scenario-shop-analysis.md)
3. [テスト設計と自動化対象選定](./part1/03_test-design-and-automation-selection.md)
4. [Playwright基礎](./part1/04_playwright-foundations.md)
5. [Playwright E2E実践](./part1/05_playwright-e2e-practice.md)
6. [テスト実行・結果分析・改善](./part1/06_execution-and-failure-analysis.md)
7. [MaestroによるNative UI自動化](./part1/07_maestro-native-automation.md)
8. [テスト管理と保守性改善](./part1/08_test-management-and-maintainability.md)
9. [Part 1 総合演習](./part1/09_part1-capstone.md)

### Part 2: 開発プロセスへの組み込みと実務導入

1. [ソフトウェア開発プロセスと変更管理](./part2/01_software-development-process.md)
2. [Gitによるバージョン管理](./part2/02_git-version-control.md)
3. [GitHub・Pull Request・Review](./part2/03_github-pull-request-review.md)
4. [CIとGitHub Actions](./part2/04_ci-github-actions.md)
5. [PlaywrightをCIで実行する](./part2/05_playwright-ci.md)
6. [Native CIとMaestro](./part2/06_native-ci-maestro.md)
7. [Quality GateとCI/CD](./part2/07_ci-cd-quality-gates.md)
8. [Part 2 導入設計演習](./part2/08_integration-design-capstone.md)

## Part 1とPart 2を分ける理由

Part 1はGitHubアカウントやCI環境がなくても進められるようにします。Autify、MagicPodなどのノーコード・ローコード自動化経験者も、テスト対象分析、テスト設計、Test Scenario / User Journey、Action、Assertion、Test Dataといった共通概念からコードベースの自動化へ移行できます。

Part 2では、Part 1で作成した自動テストを「どのように開発プロセスへ組み込み、継続的に実行するか」を学びます。Git/GitHubは自動化そのものの前提ではなく、変更管理、Review、CI、品質ゲートを実現するための仕組みとして扱います。

Part 1を配布ZIPなどで実施した場合も、Part 2で別教材へ切り替えるわけではありません。Git Historyを持つ同じScenario Shopの演習用CopyへPart 1成果物を引き継いで続行します。

## 学習成果物

カリキュラムを通して、受講者は最低限次の成果物を作成します。

- Scenario Shopのテスト対象分析表
- リスク・テスト観点整理
- テストケース一覧
- 自動化対象選定表
- Playwright E2E
- Maestro Flow
- Failure分析メモ
- テスト管理・リファクタリング結果
- Part 1総合演習成果物
- Git/GitHub操作履歴
- GitHub Actions Workflow演習
- CI実行結果とArtifact分析
- Scenario ShopへのCI導入設計

## 教材提供前に必要な後続実装

このカリキュラムを実際の受講教材として提供する際は、別対応として最低限次を用意します。

1. Part 1用のPlaywright演習コードを既存Regressionと分離して実行できる入口。
2. Web起動、Playwright、Android Emulator、Maestroまでの環境準備手順と開始確認。
3. Google Sheetsで利用するWorkbookテンプレート、または同等の複製可能なひな形。
4. Part 2で既存本番向けCI/CDやSecretsへ影響せずGitHub Actionsを試せる演習境界。
5. Repositoryへ直接Push権限がなくても進められるFork / Copy方式。
6. Part 1をZIPなどで進めた受講者が、Git Historyを持つ演習用CopyへTraining Test・学習成果物を安全に引き継ぐ手順。
7. 教材入口からこのカリキュラムへ迷わず到達できるナビゲーション。

これらはカリキュラムの学習内容を成立させるための**教材実装要件**であり、この文書整備ブランチでは実装しません。

## 完成済みコードの扱い

このRepositoryにはすでに高度なPlaywright、Maestro、CI/CD実装が存在します。教材では、最初から完成形を模倣することを目的にしません。

学習者はまず小さな実装を自分で作り、問題を経験し、改善案を考えます。その後に既存実装を参照し、自分の設計との差分と理由を分析します。

この順序により、「このRepositoryではこう書いているから」ではなく、「なぜこの構造が必要なのか」を理解することを重視します。
