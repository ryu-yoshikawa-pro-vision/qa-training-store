# テスト自動化カリキュラム

## 目的

このカリキュラムは、単にPlaywrightやMaestroの操作方法を覚えるのではなく、テスト対象の理解からテスト分析・設計、自動化対象の選定、実装、実行、結果分析、保守、CI/CDへの組み込みまでを一連の流れとして学ぶことを目的とします。

共通課程の卒業像は、実務に入りたての汎用テスト自動化エンジニアです。共通課程で身につける能力と、対象範囲を限定したレベル2の評価詳細は[習熟度評価基準](./02_competency-rubric.md)を正本とします。

最終的には、受講者が次の2段階へ到達することを目指します。

### Part 1: テスト自動化の基礎と実践

- テスト自動化の目的、適用範囲、限界を説明できる。
- テスト対象を調査し、Google Sheetsなどのスプレッドシートでテスト分析・設計を行える。
- 自動化に向くテストと向かないテストを判断できる。
- PlaywrightでWeb UIテストを設計・実装・実行できる。
- モバイルアプリのUIテスト自動化を学ぶ選択課程では、MaestroによるUIテストを設計・実装・実行できる。
- Trace、Screenshot、Video、JUnitなどの実行結果から失敗原因を分析できる。
- テストが増えた運用フェーズで、Helper、Page Object Model、Fixture、Seed Scenarioなどを選択肢として使い分けられる。
- テスト資産を整理し、Flaky Test、重複、実行時間、保守性を改善できる。

### Part 2: 開発プロセスへの組み込みと実務導入

- 一般的なソフトウェア開発と変更管理の流れを説明できる。
- Gitによるバージョン管理の基本を理解できる。
- GitHub上でBranch、Commit、Pull Request、Reviewを扱える。
- CIの目的を説明し、GitHub Actions上で自動テストを実行できる。
- 対象範囲を限定したWeb CIにPlaywrightを組み込み、Trigger、Gate、Artifact、失敗を確認するための記録について説明できる。
- PR、main、Nightly、Manualなどの実行タイミングを目的に応じて設計できる。
- Quality Gate、Build、Preview、Production、Deploy後Smokeまで含むCI/CDの構成を比較教材として理解できる。
- Scenario Shopを題材に、案件へテスト自動化を導入するための実行基盤を設計できる。

## この文書群のスコープ

このディレクトリは、テスト自動化学習の**カリキュラム本文と提供時の実行契約**を定義するものです。本文、習熟度評価基準、講師向け資料、CSV Workbook、Training Web / Nativeの入口、検証Script、CI Templateを同じリポジトリで管理します。

期待される製品動作は、[`docs/spec/README.md`](../../spec/README.md)を入口とする正式な仕様を判断の正本とします。既存UI、既存Test、README、観測した動作から教材用の期待動作を逆算して固定しません。

現在の保証は次のとおりです。

| Platform | 現在の保証範囲 | カリキュラムでの扱い |
| --- | --- | --- |
| Web | Formal RegressionとTraining baselineを分離して実行 | `training-chromium` / `training-mobile-chromium` |
| Android | Build + Runtime E2E | Training Maestroは既存Formal Native Runtimeを再利用 |
| iOS | Build-only | Runtime / Simulator / Maestro PASSとして記録しない |

この表はリポジトリ上で必要な実行保証を示すものであり、受講者が必ず学ぶ共通課程の修了条件を意味しません。Native環境やNative CIを選択しない受講者も、共通経路で学習を完了できます。

Training Testは `training/`、Formal Regressionは `e2e/web/` と `maestro/` に分離します。`failure-exercises/` は明示実行時だけ使い、通常の必須baselineへ混在させません。

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
- `.github/workflows/native-ios-ci.yml` のiOS Build-only baseline
- `tests/unit/`、`tests/integration/`、`tests/component/`、`tests/contracts/` などのテスト層
- `/guide` とTest Control
- Cloudflare Pages Preview / Productionのデプロイ経路

## 学習設計の原則

1. ツールより先に、テスト自動化の目的とプロセスを学びます。
2. GitHubアカウントをPart 1の前提条件にしません。
3. テスト分析・設計はスプレッドシートを基本教材とします。
4. PlaywrightのSyntax暗記ではなく、テスト条件からコードへ落とす流れを重視します。
5. モバイルアプリ自動化の選択課程を選んだ場合は、Playwrightの後にMaestroを学び、WebとNativeの共通点・相違点を理解します。
6. Helper、POM、Fixture、Seed Scenarioなどの共通化や初期状態管理は最初から正解として教えません。
7. まず自動テストを複数実装し、運用上の問題を体験した後に保守・管理手法として学びます。
8. POMは必須パターンではなく、保守上の問題を解決する選択肢の一つとして扱います。
9. Part 2ではGit/GitHub自体を目的化せず、一般的な開発プロセスと自動テストの接続を学びます。
10. 最終演習では完成済みのCI構成を先に正解として見せず、自分で設計した後に現在のリポジトリと比較します。
11. Training実装では、学習用の変更が現在のRegression Suiteや本番向けCI/CDへ意図せず混入しない境界を使用します。
12. 学習者がリポジトリへ直接Pushできることを前提にせず、Part 2ではForkや演習用コピーを利用できる構成にします。
13. Part 1をZIPなどGit管理されていないコピーで進めた受講者は、Part 2開始時にGit履歴を持つ同じ `qa-training-store` の演習用コピーへ成果物を引き継ぎます。
14. CIハンズオンでは、Training Workflowと教材元のProduction / Deploy Workflowが同時起動しないことを開始条件とし、本番Secretを配布して既存Workflowを通す方法は採用しません。

## 全体構成

### 受講者向け標準導線

受講者は、まずPart 1-1でScenario Shopとテスト自動化の目的を学びます。WorkbookはP1-2 / P1-3で使い、評価基準は各課題の達成度を確認するときに参照します。

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

### 共通の参考資料と運営支援

- [学習方針と進め方](./00_learning-design.md)
- [スプレッドシートによるテスト分析・設計](./01_spreadsheet-test-design.md) — P1-2 / P1-3で必要な段階で参照します。
- [習熟度評価基準（評価の正本）](./02_competency-rubric.md) — 各課題の評価基準を確認するときに参照します。
- [講師向け資料（運営支援）](./03_instructor-reference.md) — 受講者が必ず学ぶ経路や修了条件の正本ではありません。

## 学習経路と修了契約

### Entry / graduation

コース開始時の対象者は、テスト自動化の目的・基本概念を理解し、ノーコード / ローコードの経験または概要理解があってもよい一方、Playwrightなどのコードベース自動化は未経験で、プログラミング経験を必須としない受講者です。共通の学習範囲では、受講開始時の受講者像と、それ以前に受講者必須の学習経路で明示的に学んだ内容だけを前提にします。

共通課程の卒業像は **実務に入りたての汎用テスト自動化エンジニア** です。修了集合は次のとおりです。

- Part 1の共通課程の修了条件: `C01〜C07 + C09〜C10`、対象範囲を限定したレベル2
- Part 2 / 最終共通課程の修了条件: `C01〜C07 + C09〜C12`、対象範囲を限定したレベル2
- `C08`、Physical Android、Native CIはモバイルアプリ自動化の選択課程に属し、共通課程の修了条件には含めません。

### 共通課程と選択課程のナビゲーション

モバイルアプリ自動化の選択課程は、トップレベルのLesson番号や配置を変えない選択経路です。次の経路を使います。

- Part 1 Common: P1-6 → P1-8 → P1-9
- Part 1 Native: P1-6 → P1-7 → P1-8 → P1-9
- Part 2 Common: P2-5 → P2-7 → P2-8
- Part 2 Native: P2-5 → P2-6 → P2-7 → P2-8

モバイルアプリ自動化を選択しない場合はP1-7 / P2-6を飛ばして共通経路を進みます。P1-7の完了後はP1-8、P2-6の完了後はP2-7へ合流します。P2-6を選択する場合は、P1の選択課程で身につけたMaestro実行能力を、選択課程内の必須前提として先に満たします。

### 教材分類と支援境界

- **受講者必須の共通課程**: 共通経路の学習内容、演習、自己確認、修了、評価に必要な受講者向け教材です。
- **モバイルアプリ自動化の選択課程**: P1-7 / P2-6と、選択した場合に必要なNative環境・実行成果物です。共通課程の修了条件には含めません。
- **リポジトリ必須の資材**: validatorが存在を確認するカリキュラム、Workbook、Training入口、Workflow Templateなどのリポジトリ資材です。存在することだけで、受講者必須の学習内容や共通課程の修了条件にはなりません。
- `03_instructor-reference.md`はリポジトリ上で必要な支援資料であり、受講者必須の学習経路や、共通課程・選択課程の修了条件の正本ではありません。
- 講師・運営は環境、アカウント・権限、端末、演習用リポジトリ / Training Copy、インフラ / ツールチェーンの準備・障害対応を支援できます。学習内容、自己確認、完了条件、評価観点は受講者向け教材を正本とします。

## Part 1とPart 2を分ける理由

Part 1はGitHubアカウントやCI環境がなくても進められるようにします。Autify、MagicPodなどのノーコード・ローコード自動化経験者も、テスト対象分析、テスト設計、テストシナリオ / 利用者の操作経路、Action、Assertion、Test Dataといった共通概念からコードベースの自動化へ移行できます。

Part 2では、Part 1で作成した自動テストを「どのように開発プロセスへ組み込み、継続的に実行するか」を学びます。Git/GitHubは自動化そのものの前提ではなく、変更管理、Review、CI、品質ゲートを実現するための仕組みとして扱います。

Part 1を配布ZIPなどで実施した場合も、Part 2で別教材へ切り替えるわけではありません。Git履歴を持つ同じScenario Shopの演習用コピーへPart 1成果物を引き継いで続けます。

Git / GitHubの基本操作ではForkも利用できますが、CIハンズオンはProduction Workflowとの競合を避けるため、安全に分離された演習用コピーを標準とします。`training:copy:prepare`と`training:copy:validate`で、教材元から継承したProduction / Deploy Workflowをactive allowlistから外し、Training Workflowだけを検証します。

`part1/09_specification-agentic-qa.md` は任意の参考資料、`part1/10_part1-capstone.md` は過去の参照先を保つ別名として保存しています。必須ナビゲーション、評価基準、Validatorはcanonical `part1/09_part1-capstone.md`だけを対象にします。

## 学習成果物

共通経路で、受講者は最低限次の成果物を作成・記録します。

- Scenario Shopのテスト対象分析表
- リスク・テスト観点整理
- テストケース一覧
- 自動化対象選定表
- Playwright E2E
- Failure分析メモ
- テスト管理・リファクタリング結果
- Part 1総合演習成果物
- Git/GitHub操作履歴
- GitHub Actions Workflow演習
- CI実行結果とArtifact分析
- Scenario ShopへのCI導入設計

モバイルアプリ自動化の選択課程を選んだ受講者は、P1-7 / P2-6で自分が作成した演習と、Native実行の成果物を追加で作成します。Nativeのbaseline / stock flowや、リポジトリ必須資材が存在するだけでは、共通課程または選択課程の習熟度達成とはみなしません。

## 提供済みのTraining入口

本計画では、次の入口を現在のリポジトリ上の実装へ接続しています。

1. `playwright.training.config.ts` の `training-chromium` / `training-mobile-chromium`。
2. `training/playwright/baseline/`、`exercises/`、`failure-exercises/`。
3. `training/maestro/` のbaseline / exerciseと、既存Formal Runtimeを再利用する実行Script。
4. `training/workbook/` のCSV canonical template。
5. `scripts/validate-curriculum.ts`、`scripts/training/`、Training TypeScript typecheck。
6. `.github/workflows/`へコピーするための最小権限のTraining Workflow Template。
7. `ci.yml`の必須のPhase 1カリキュラム検証 / Training Web baseline、`native-ci.yml`のTraining Maestro baseline接続。

受講者が使用するWeb Base URLは `PLAYWRIGHT_BASE_URL` で明示します。未指定時のローカル代替値はこのworktree専用の `http://127.0.0.1:8082` であり、Formal / Visual RuntimeのPortを再利用しません。

## 完成済みコードの扱い

このリポジトリにはすでに高度なPlaywright、Maestro、CI/CD実装が存在します。教材では、最初から完成形を模倣することを目的にしません。

学習者はまず小さな実装を自分で作り、問題を経験し、改善案を考えます。その後に既存実装を参照し、自分の設計との差分と理由を分析します。

この順序により、「このリポジトリではこう書いているから」ではなく、「なぜこの構造が必要なのか」を理解することを重視します。
