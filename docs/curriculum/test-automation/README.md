# テスト自動化カリキュラム

## 目的

このカリキュラムは、テスト対象の理解からテスト分析・設計、自動化対象の選定、実装、実行、結果分析、保守、CI/CDへの組み込みまでを学びます。Playwright・Maestroに加え、OpenCodeとqa-workflow-skillsによるAIエージェント活用も実践し、生成された提案やコードを根拠に基づいて採否判断できることを目指します。

共通課程の卒業像は、テスト分析・設計の基礎を持ち、テスト自動化とAIエージェントによるQA支援を組み合わせて実務を進められる初級エンジニアです。共通課程で習得する能力と、対象範囲を限定したレベル2の評価基準の詳細は、[習熟度評価基準](./02_competency-rubric.md)を正本とします。

最終的には、受講者が次の2段階へ到達することを目指します。

### Part 1: テスト自動化の基礎と実践

- テスト自動化の目的、適用範囲、および限界を正しく説明できる。
- テスト対象を調査し、Googleスプレッドシート等を用いてテスト分析・設計を行える。
- 自動化に適したテストと適さないテストを的確に判断できる。
- Playwrightを用いてWeb UIテストを設計・実装・実行できる。
- OpenCodeとqa-workflow-skillsを使って分析・設計・実装の案を得て、仕様と実行証拠に基づき採用・修正・不採用を判断できる。
- モバイルアプリのUIテスト自動化を学ぶ選択課程において、MaestroによるUIテストを設計・実装・実行できる。
- Trace、Screenshot、Video、JUnitレポートなどの実行結果から失敗原因を分析できる。
- テストが増加する運用フェーズにおいて、Helper、Page Object Model（POM）、Fixture、Seed Scenarioなどの設計手法を選択肢として適切に使い分けられる。
- テスト資産を整理し、Flaky Test（不安定なテスト）の解消、重複排除、実行時間の短縮、保守性の向上を実現できる。

### Part 2: 開発プロセスへの組み込みと実務導入

- 一般的なソフトウェア開発の流れと変更管理プロセスを説明できる。
- Gitによるバージョン管理の基本概念を理解できる。
- GitHub上でBranch、Commit、Pull Request、Reviewを適切に扱える。
- AIが作成・修正したテストコードやレビュー提案について、差分・根拠・検証結果を確認し、責任を持って取り扱える。
- CIの目的を理解し、GitHub Actions上で自動テストを実行できる。
- 対象範囲を限定したWeb CI環境にPlaywrightを組み込み、Trigger、Gate、Artifact、および失敗調査用ログの記録について説明できる。
- PR作成時、mainブランチへのマージ時、Nightly、手動実行（Manual）など、目的に応じたテスト実行タイミングを設計できる。
- Quality Gate、Build、Preview、Production、およびデプロイ後のSmokeテストまでを含むCI/CDパイプラインの全体構成を比較教材として理解できる。
- Scenario Shopを題材として、実際のプロジェクトへテスト自動化を導入するためのテスト実行基盤を設計できる。

## この文書群のスコープ

このディレクトリは、テスト自動化学習における**カリキュラム本文と提供時の実行契約**を定義するものです。本文、習熟度評価基準、講師向け資料、CSV形式のワークブック、Training Web / Nativeの各エントリーポイント、検証用スクリプト、およびCIテンプレートを同一リポジトリ内で管理します。

期待される製品動作の判断基準については、[`docs/spec/README.md`](../../spec/README.md)を起点とする正式な仕様書を正本とします。既存のUI、既存テストコード、README、あるいは実際の観測動作から教材用の期待動作を逆算して固定することはしません。

## Lesson本文の共通契約

講師による都度の補足説明がなくても学習を円滑に進められるよう、標準の17レッスン（`P1-01`〜`P1-09`、`P2-01`〜`P2-08`）の本文内では、以下の項目を明示します（`P1-07`と`P2-06`はNativeアプリの選択課程です）。

- **Input**: 配布物、前レッスンの成果物、受講者が自ら用意する前提物を明確に区別し、それぞれの出所、参照先、準備完了の確認手順を示します。
- **Activity / Observation**: 作業の手順と、画面・ログ・差分・実行結果・Artifactのどこを観察すべきかを具体的に示します。
- **Output**: 何を成果物として残すか、編集可能な範囲、評価対象となる形式、および次のレッスンでの活用方法を示します。
- **Self-check / Completion**: 自分で確認すべき問いと満たすべき要素、第三者が客観的に確認できる完了条件を明確に区別して示します。あらかじめ用意されたbaselineやstarterテストのPASSのみをもって完了とはみなしません。
- **Feedback / Recovery / Handoff**: 学習上のつまずき、テストや製品の不具合（Failure）、環境起因の不備を明確に区別し、リカバリー手順とともに、次の引き継ぎ先・ID・エビデンス・開始条件を示します。

受講者はGoogleスプレッドシートや任意のローカルフォルダで作業できますが、Part 1からPart 2の最終確認へ引き渡す評価用正本は、規定の `handoff-root/` ディレクトリ配下に集約します。4つのワークブックCSVは `handoff-root/workbook/`、リポジトリ相対パスの受講者コードは `handoff-root/code/`、実行エビデンスは `handoff-root/evidence/`、Execution Receiptは `handoff-root/receipts/`、レッスン別の自己確認結果は `handoff-root/self-check/` に配置します。また、Completion Receiptはルート直下へ出力します。なお、Training CopyはGitHub Actionsを実行するための作業環境であり、評価用正本の代用とはしません。

現在のプラットフォーム別保証範囲は以下のとおりです。

| Platform | 現在の保証範囲 | カリキュラムでの扱い |
| --- | --- | --- |
| Web | Formal RegressionとTraining baselineを分離して実行 | `training-chromium` / `training-mobile-chromium` |
| Android | Build + Runtime E2E | Training Maestroは既存のFormal Native Runtimeを再利用 |
| iOS | Build-only | Runtime / Simulator / MaestroのPASSとしては記録しない |

※ 上記の表はリポジトリ上で定義されている実行保証の範囲を示すものであり、受講者全員が必須で習得すべき共通課程の修了条件を表すものではありません。Native環境やNative CIを選択しない受講者も、共通経路のみで学習を完結できます。

学習用のテスト（Training Test）は `training/`、正式なリグレッションテスト（Formal Regression）は `e2e/web/` および `maestro/` に明確に分離します。また、`failure-exercises/` は明示的に指定して実行する場合にのみ使用し、通常の必須baselineへ混在させることはありません。

## 教材

**すべての教材および演習では、本リポジトリ `qa-training-store` の「Scenario Shop」を使用します。**

架空のTodoアプリや別のサンプルプロジェクトを途中で切り替えて使うことはせず、一貫して同一のテスト対象を扱います。学習の進行に伴い、同じ機能を多様な観点から分析・実装・改善していくことで、個々の技術や知識のつながりを深く理解できる設計となっています。

主に以下のリソースを教材として利用します。

- Scenario Shop Web / Native アプリケーション
- `src/seeds/metadata.ts` 内のSeed Scenario
- `e2e/web/` 内のPlaywright E2Eテスト
- `e2e/web/fixtures.ts` 内の共通処理およびSeed Scenario制御ロジック
- `playwright.config.ts` 内のProject、Reporter、Artifact設定
- `maestro/` 内のMaestro Flow定義
- `.github/workflows/ci.yml` 内のWeb CI/CDパイプライン
- `.github/workflows/native-ci.yml` 内のAndroid Build / Runtime / Maestroワークフロー
- `.github/workflows/native-ios-ci.yml` 内のiOS Build-only baselineワークフロー
- `tests/unit/`、`tests/integration/`、`tests/component/`、`tests/contracts/` 等の各テスト層の実装
- `/guide` ページおよびテストコントロールUI
- Cloudflare Pages Preview / Productionへのデプロイパイプライン

## 学習設計の原則

1. ツールの操作方法を覚える前に、テスト自動化の本来の目的とプロセスを学びます。
2. Part 1の学習において、GitHubアカウントの所持を前提条件とはしません。
3. テスト分析およびテスト設計の基礎演習には、スプレッドシートを標準教材として使用します。
4. Playwrightの構文暗記ではなく、テスト条件からコードへと論理的に落とし込む思考プロセスを重視します。
5. モバイルアプリ自動化の選択課程では、Playwrightを学んだ後にMaestroを扱い、WebとNativeにおける自動化の共通点と相違点を整理して理解します。
6. Helper、POM、Fixture、Seed Scenarioなどの共通化や初期状態管理の手法は、最初から「正解」として提示しません。
7. まず複数の自動テストを愚直に実装して運用上の課題を実際に経験した上で、保守・管理のためのプラクティスとしてそれらの手法を学びます。
8. POM（Page Object Model）は必須の絶対解ではなく、保守課題を解決するための有力な選択肢の一つとして位置づけます。
9. Part 2ではGit/GitHub自体の習得を自己目的化せず、実務開発プロセスと自動テストのスムーズな接続を学びます。
10. 最終演習では完成版のCI定義を先に見せることはせず、受講者自身で設計を行わせた後、本リポジトリの実装と比較・検証します。
11. 学習用コード（Training実装）は、既存のリグレッションテストスイートや本番向けCI/CDパイプラインに意図せず混入しないよう、明確な実行境界を維持します。
12. 学習者が教材リポジトリへ直接Pushできる権限を持つことを前提とせず、`P2-01`〜`P2-03`のGit/GitHub基礎演習ではFork環境を活用できます。
13. Part 1をZIP配布などのGit管理外の環境で進めた受講者は、Part 2を開始する前に、Git履歴を保持し自身が書き込み可能な「Training Copy」へと成果物を移行します。
14. CIハンズオン、C12の評価、およびPart 2の最終確認ではTraining Copyを正式な検証経路とし、Training Workflowと教材元のProduction/Deploy Workflowが重複起動しないことを開始条件とします。受講者に対して、本番環境のSecret、管理者権限、Workflow権限の変更、あるいはGitHub Appの設定などを要求することはありません。
15. AIは分析・設計・実装・レビューの支援に利用できます。受講者が生成結果を仕様・証拠と照合して採否を判断し、その理由を説明することを評価します。
16. OpenCodeの有料プランや特定モデルの利用、qa-workflow-skillsの全Skillの習得は要求しません。環境上の制限がある場合は運営側が支援します。

## 全体構成

### 受講者向け標準導線

受講者は、まずPart 1-1でScenario Shopの概要とテスト自動化の目的を学びます。続くP1-2でテスト対象とリスクの分析を行い、P1-3でテストケースの作成と自動化対象の選定を行うため、Playwrightの実装に着手する前に「実装すべきテストケースがどのような根拠から導かれたか」を本文に沿って確認できます。ワークブックはP1-2およびP1-3で使用し、評価基準は各課題の達成度を確認する際に参照します。

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

### 共通Referenceと運営支援

- [学習方針と進め方](./00_learning-design.md)
- [スプレッドシートによるテスト分析・設計](./01_spreadsheet-test-design.md) — P1-2 / P1-3の演習時に参照します。
- [習熟度評価基準（評価の正本）](./02_competency-rubric.md) — 各課題の達成基準を確認する際に参照します。
- [AIエージェントを活用したQA演習](./05_ai-agent-workflow.md) — OpenCodeとqa-workflow-skillsによる各工程の実習を扱います。
- [AI活用演習のテスト対象](../../../training/ai-assisted-qa/README.md) — 既存Scenario ShopとSeedを使用する演習対象を示します。
- [講師向け資料（運営支援）](./03_instructor-reference.md) — 受講者の必須学習経路や修了要件の正本ではありません。

## 学習経路と修了契約

### Entry / graduation（受講前提と卒業像）

本コース受講開始時の想定対象者は、テスト自動化の目的や基本概念を大枠で理解しており、ノーコード/ローコードツールでのテスト作成経験または概要理解があってもよい一方、Playwrightなどのコードベース自動化は未経験であり、本格的なプログラミング経験を必須とはしない受講者です。共通課程の範囲内では、この受講開始時の前提知識と、それ以前の必須レッスンで明示的に学んだ内容のみを前提としてカリキュラムを進行します。

共通課程の卒業像は **「テスト自動化とAIエージェントによるQA支援を両立できる初級エンジニア」** です。修了要件となるコンピテンシー基準は以下のとおりです。

- Part 1 共通課程の修了条件: `C01〜C07 + C09〜C10` において、対象範囲を限定したレベル2を達成すること
- Part 2 / 最終共通課程の修了条件: `C01〜C07 + C09〜C12` において、対象範囲を限定したレベル2を達成すること
- なお、`C08`、実機Android環境、およびNative CIはモバイルアプリ自動化の選択課程に属するため、共通課程の修了条件には含みません。

### 共通課程と選択課程のナビゲーション

モバイルアプリ自動化の選択課程は、全体のレッスン番号やファイル配置を変更しないオプション経路として設計されています。受講者は次の経路を選択して進めます。

- Part 1 共通経路: P1-6 → P1-8 → P1-9
- Part 1 Native選択経路: P1-6 → P1-7 → P1-8 → P1-9
- Part 2 共通経路: P2-5 → P2-7 → P2-8
- Part 2 Native選択経路: P2-5 → P2-6 → P2-7 → P2-8

モバイルアプリ自動化を選択しない受講者は、P1-7およびP2-6をスキップして共通経路を進みます。P1-7を完了した受講者はP1-8へ、P2-6を完了した受講者はP2-7へそれぞれ合流します。なお、P2-6を選択する場合は、Part 1の選択課程（P1-7）で身につけたMaestro実行スキルを、選択課程内の前提条件として事前に満たしている必要があります。

AI活用演習はP1-2・P1-3・P1-5・P1-6・P1-8・P2-3・P2-8の既存内容へ組み込みます。AIが生成しただけの成果物は修了の証拠にはなりません。詳細は[AIエージェント活用演習](./05_ai-agent-workflow.md)と[習熟度評価基準](./02_competency-rubric.md)を参照してください。

### 教材分類と支援境界

- **受講者必須の共通課程**: 共通経路の学習内容、演習、自己確認、修了認定、および評価に必要な受講者向けコア教材です。
- **モバイルアプリ自動化の選択課程**: P1-7、P2-6、およびこれらを選択した場合に必要となるNative環境・実行成果物です。共通課程の修了条件には含まれません。
- **リポジトリ必須の資材**: バリデータが整合性を検証するカリキュラムファイル、ワークブック、Training用エントリーポイント、ワークフローテンプレート等のリポジトリ管理資材です。リポジトリ内に存在していること自体が、直ちに受講者の必須学習範囲や共通課程の修了条件となるわけではありません。
- `03_instructor-reference.md` はリポジトリ上で必要な運営支援資料であり、受講者の必須学習経路や、共通課程・選択課程の修了条件を定義する正本ではありません。
- 講師および運営側は、受講環境、アカウント・権限、端末、演習用リポジトリ / Training Copy、インフラおよびツールチェーンのセットアップや障害対応をサポートできます。一方、学習内容、自己確認項目、完了条件、評価観点については、受講者向け教材本文を正本とします。

## Part 1とPart 2を分ける理由

Part 1は、GitHubアカウントやCI環境が手元にない受講者でも学習を開始できるように設計されています。AutifyやMagicPodといったノーコード・ローコード自動化ツールの経験者も、テスト対象分析、テスト設計、テストシナリオ / ユーザージャーニー、Action、Assertion、Test Dataといった自動化共通の基礎概念を整理した上で、コードベースの自動化へスムーズに移行できます。

Part 2では、Part 1で作成した自動テストを「開発プロセスへどのように組み込み、継続的に運用・実行するか」を学びます。GitやGitHubは自動化それ自体の前提条件ではなく、変更管理、コードレビュー、CI、品質ゲートを実現するための基盤技術として位置づけて学習します。

Part 1を配布ZIPなどのGit管理外環境で実施した場合でも、Part 2で別の教材に切り替える必要はありません。同一のScenario ShopのGit履歴を持つ演習用コピーへ、Part 1の成果物を引き継いで継続して演習を行えます。

Git / GitHubの基本操作演習ではForkも利用できますが、Fork環境を利用するのは `P2-01`〜`P2-03` の範囲に限定されます。C12の評価、Training CI、およびPart 2の最終修了認定は、自己学習開始前に準備された受講者が書き込み権限を持つTraining Copyを正式な検証経路とします。`training:copy:prepare` および `training:copy:validate` スクリプトにより、教材元から引き継がれたProduction / Deploy Workflowをactive allowlistから除外し、Training Workflowのみを検証対象とします。Fork上でのRun、Check、ArtifactをC12の達成証跡とみなすことはできません。

なお、`part1/09_specification-agentic-qa.md` は任意の参考資料、`part1/10_part1-capstone.md` は過去の参照リンクを維持するための別名ファイルとして保管されています。必須のナビゲーション、評価基準、およびバリデータが対象とするのは、規定の正本である `part1/09_part1-capstone.md` のみです。

## 学習成果物

共通経路において、受講者は最低限以下の成果物を作成・記録します。

- Scenario Shopのテスト対象分析表
- リスクおよびテスト観点の整理表
- テストケース一覧
- 自動化対象選定表
- PlaywrightによるE2Eテストコード
- Failure分析メモ
- テスト管理およびリファクタリング結果
- Part 1 総合演習の成果物
- Git / GitHubの操作履歴
- GitHub Actions Workflow演習ファイル
- CI実行結果およびArtifactの分析メモ
- Scenario ShopへのCI導入設計書

これらの成果物は、単に指定されたフォルダにファイルを置くこと自体を目的とするものではありません。各レッスンのInputとOutputの定義に従って作業を進め、最終的に規定の `handoff-root/` ディレクトリ配下へ「4つのCSVワークブック」「リポジトリ相対コード」「実行エビデンス」「Execution Receipt」「レッスン別自己確認結果」を集約します。CSV内の空欄や `Not run` の表記は、未実行または未判断の状態を正確に示すものであるため、見栄えを整える目的で架空の実行結果を入力してはなりません。

モバイルアプリ自動化の選択課程を受講した場合は、P1-7およびP2-6において自身が作成した演習コードと、Native環境での実行成果物を追加で作成・提出します。Nativeのbaselineやstock flow、あるいはリポジトリ必須資材がファイルとして存在しているだけでは、共通課程または選択課程の習熟度を満たしたとはみなされません。

## 提供済みのTraining入口

本リポジトリでは、学習・検証を円滑に行えるよう、以下のエントリーポイントがあらかじめ接続されています。

1. `playwright.training.config.ts` で定義された `training-chromium` / `training-mobile-chromium`
2. `training/playwright/baseline/`、`exercises/`、`failure-exercises/`
3. `training/maestro/` のbaseline / exercise、および既存のFormal Runtimeを再利用する実行スクリプト
4. `training/workbook/` のCSV正本テンプレート
5. `scripts/validate-curriculum.ts`、`scripts/training/`、およびTraining TypeScriptのtypecheck設定
6. `.github/workflows/` へコピーして使用するための、最小権限で構成されたTraining Workflowテンプレート
7. `ci.yml` における必須のPhase 1カリキュラム検証 / Training Web baseline、および `native-ci.yml` におけるTraining Maestro baseline接続

受講者が使用するWebのBase URLは、環境変数 `PLAYWRIGHT_BASE_URL` で明示的に指定します。未指定時にローカル環境で代替されるポートは、本worktree専用の `http://127.0.0.1:8082` であり、FormalやVisual Runtimeのポートとは重複しないよう分離されています。

## 完成済みコードの扱い

本リポジトリには、すでに完成度の高いPlaywright、Maestro、CI/CDの実装が存在しています。しかし教材の演習では、最初から完成形を模倣することを目的としていません。

学習者はまず自身の力で小さな実装を作成し、直面した課題を経験した上で、その改善策を検討します。その後に既存の完成実装を参照し、自身の設計との差分や、なぜそのような設計になっているのかという理由を分析します。

この学習プロセスを踏むことにより、「このリポジトリにそう書いてあるから」という形骸化した理解ではなく、「なぜこの構造や設計が必要なのか」を本質的に理解できるようになります。