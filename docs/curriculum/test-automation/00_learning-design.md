# 学習方針と進め方

## このカリキュラムの考え方

このカリキュラムでは、テスト自動化を「ツール操作」ではなく、継続的なテスト活動として扱います。

学習の中心は次の循環です。

```text
テスト対象を理解する
↓
テストを分析・設計する
↓
自動化対象を選定する
↓
自動テストを実装する
↓
実行する
↓
結果を分析する
↓
改善する
↓
運用・保守する
```

Playwright、Maestro、GitHub Actionsはこの循環を実現するための手段として学びます。

## 教材

**すべての説明・演習では、このリポジトリのScenario Shopを使用します。**

別のサンプルアプリは使用しません。受講者は同じアプリを繰り返し観察し、Web、Native、テストデータ、テストコード、CI/CDを段階的に理解します。

## この文書群と教材実装の関係

このディレクトリでは、学習順序、教材内容、演習、到達条件を定義します。リポジトリには、本文を実行可能にするTraining Web / Nativeの入口、CSV Workbook、Validator、TypeScript gate、CI Templateも同じ計画のもとで実装済みです。

各Lessonは、次の2種類を明示的に区別します。

- **正式な仕様を読む学習**: [`docs/spec/README.md`](../../spec/README.md)とFeatureのBR / ACを起点にする。
- **Training境界で行う演習**: `training/`と`playwright.training.config.ts`を使い、Formal RegressionやProduction Workflowへ変更を混在させない。

既存の `e2e/web/`、`maestro/`、Formal CIは比較教材・正式Regressionであり、受講者用Testの保存先ではありません。本番Secret、OIDC、Deploy権限はTrainingへ持ち込みません。

リポジトリに存在することを検証する資材と、受講者が必ず学ぶ経路で扱う内容・演習・自己確認・修了条件・評価成果物は別の契約です。`03_instructor-reference.md`はリポジトリ上で必要な支援資料ですが、受講者が必ず学ぶ経路や共通課程の修了条件の正本ではありません。

## Lesson共通契約

このカリキュラムは講師の口頭説明を前提にしません。17個のCanonical Lesson（`P1-01`〜`P1-09`、`P2-01`〜`P2-08`）は、本文を読んだ受講者が次の情報だけで一巡できるようにします。`P1-07`（Native）と`P2-06`（Native CI）は選択課程です。

| 項目 | Lesson本文で明示する内容 |
| --- | --- |
| 目的 | 何を理解し、どの判断ができるようになるか |
| Input | 配布済みの資材、前のLessonの成果物、受講者が準備するものを分け、出所・参照先・準備完了の確認方法を書く |
| Activity | 読む、観察する、設計する、実装する、実行する、比較するなど、受講者が行う順番 |
| Observation | 画面、ログ、差分、実行結果、Artifactなど、活動後に何を見て理由を説明するか |
| Output | 何を残すか、形式の自由度、評価へ渡す場所、次のLessonでの用途 |
| Self-check | 質問と、回答に最低限含める要素。意味の理解は受講者自身の説明で確認する |
| Completion | ファイル、実行記録、自己確認など、第三者が観測できる完了条件。単なる操作回数やsuite全体のPASSとは分ける |
| Recovery | 学習上のつまずき、テスト／製品のFailure、環境不足を分け、それぞれの戻り方を書く |
| Handoff | 次の受け手、Test Case IDやLesson ID、ファイル、Evidence、次へ進む開始条件 |

### InputとOutputの受け渡し場所

受講者は、WorkbookやメモをGoogle Sheets、ローカルFolderなど任意の場所で編集できます。編集場所を固定することは学習目標にしません。ただし、Part 1からPart 2の最終確認へ渡す評価用の正本は、次の`handoff-root/`へ集約します。

```text
handoff-root/
  workbook/
    01_target-risk.csv
    02_test-cases.csv
    03_automation-mapping.csv
    04_execution-improvement.csv
  code/
  evidence/
  receipts/
  self-check/
```

`code/`にはRepository相対Pathを保った受講者コードを置きます。例えば`training/playwright/exercises/my-cart.spec.ts`は`code/training/playwright/exercises/my-cart.spec.ts`です。`evidence/`はTrace、Screenshot、Video、HTML Reportなど、`receipts/`は実行の事実を記録したExecution Receipt、`self-check/`は既存Lesson IDごとの自己確認を置く場所です。評価用のCompletion Receiptはこのroot直下に出力し、`receipts/`のExecution Receiptと混ぜません。

Lesson本文が示すInputは「前のLessonで作成済み」とだけ書かず、どのファイル・列・ID・実行結果が準備済みであるべきかを示します。例えばPlaywrightを実装するLessonでは、実装対象のTest Case ID、条件、前提、期待結果、Reset方法が先に準備されていることをInputに含めます。Outputは、受講者が編集した場所ではなく、上記rootへどのように集約すれば評価へ渡せるかを示します。

## 対象者

コース開始時の受講者像は、テスト自動化の目的・基本概念を理解し、ノーコード / ローコードの経験または概要理解があってもよい一方、Playwrightなどのコードベース自動化は未経験で、プログラミング経験を必須としない人です。

主な対象は次の受講者です。

- 手動テストを経験しており、自動化へ進みたい人
- Autify、MagicPodなどのノーコード・ローコード自動化経験者
- コードベースのPlaywright等は未経験だが、テスト設計や運用を学びたい人
- モバイルアプリのUIテスト自動化を選択して学び、Web自動化からNative自動化へ広げたい人
- Part 2でCI上の自動テスト実行を学びたい人
- 修了後に実案件で自動化基盤を設計したい人

プログラミング経験は必須前提にしません。Playwrightへ進む前に、テストコードを読み書きするために必要なJavaScript / TypeScriptの最小知識をPart 1で扱います。

プログラミング言語全体を学ぶことを目的とせず、Scenario Shopの自動テストを書くために必要な範囲へ絞ります。

### 共通課程の既習知識に関するルール

共通課程で前提にできる既習知識は、上記の受講者像と、それ以前に受講者必須の学習経路で明示的に学んだ共通課程の内容だけです。モバイルアプリ自動化の選択課程、発展課題、参考資料、教材外のPlaywright / TypeScript / Git / CI実務経験を隠れた前提にしません。

## 用語の使い分け

自動化では同じ単語が異なる意味で使われやすいため、このカリキュラムでは次の呼称を基本とします。

| 用語 | このカリキュラムでの意味 |
| --- | --- |
| Test Case ID | `TC-CART-001` など、スプレッドシート上のテストケース識別子 |
| UI Test ID / `testId` | PlaywrightやMaestroからUI要素を安定して特定する識別子 |
| Seed Scenario | Scenario Shopを決定的な初期状態へResetするためのScenario |
| テストシナリオ / 利用者の操作経路 | 複数の条件や画面をまたいで確認する業務上のテストシナリオ |
| Maestro Flow | MaestroのYAMLで記述する実行単位 |
| 共通操作 / Helper | 複数Pageにまたがる操作を必要に応じてまとめるコード上の構造 |

教材本文では原則として上記の呼称を使用し、単に「Test ID」「Scenario」「Flow」と省略して複数の意味を混在させません。

Test Case IDの形式とWorkbookの列契約は、[Training Workbook README](../../../training/workbook/README.md)を正本として確認します。

ただし、既存コードのAPI名や変数名、外部Tool固有の名称を引用するときは、その実装上の名称をそのまま使用します。その場合も、教材上どの概念に対応するかを区別します。

特に、**Test Case IDとUI Test ID、Seed ScenarioとUser Journey、Maestro Flowとコード上の共通操作は同じものではありません。**

### 安定表記ルール

- 受講者向けの一般的な説明は、日本語を中心に記述する。
- Tool、Product、API、command、path、identifierは公式のliteralを維持する。
- `Locator`、`Fixture`などの公式用語は、必要な場合だけ初出で日本語の意味を添える。
- 共通課程、モバイルアプリ自動化の選択課程、発展課題、参考資料は、本文でそれぞれの役割を説明する。
- `BR`、`AC`、ID grammar、machine-consumed headingはcanonical literalを変更しない。
- Product上の判断に必要なUI copyは、表示されるliteralをそのまま扱う。

## Part 1の前提

Part 1ではGitHubアカウントを必須にしません。

受講者が必要なのは、Scenario ShopとPlaywrightをローカルで扱える環境です。リポジトリの取得方法はGit Cloneに限定せず、必要に応じて配布ZIPなども利用できます。

Maestroへ進む時点ではNative実行環境が追加で必要です。開始確認は、現在のリポジトリにあるAndroid runbook、Training baseline、Native CI contractで行います。

### Web / Playwright開始Gate

- 対応Node.js / pnpmを利用できる。
- DependencyをInstallできる。
- Scenario Shop Webをこのworktree専用の `PLAYWRIGHT_BASE_URL` で起動できる。
- `pnpm run training:web:baseline` が `training-chromium` で成功する。

Mobile Webの基準確認は、P1-5でViewportと`training-mobile-chromium`を学んだ後に行います。P1-4の開始Gateではデスクトップの基準確認までを扱います。

### モバイルアプリ自動化の選択課程 / Maestro開始条件

Native / MaestroはPart 1の共通課程の必須前提ではありません。P1-6までを共通課程の必須前提とし、モバイルアプリ自動化の選択課程を選んだ受講者だけが次のMaestro開始条件を満たします。選択しない受講者はP1-7を飛ばしてP1-8へ進みます。P1-7を完了した受講者はP1-8へ合流します。

Windows Localの標準ハンズオンは、USB接続されたPhysical Android Deviceを基準とします。Android Emulator / AVDは任意の補助経路であり、Part 1完了条件ではありません。

- JDK / Android SDKを利用できる。
- Android端末でDeveloper Options、USB debugging、ADB authorizationを設定できる。
- `adb devices -l`で対象serialのstatusが`device`であることを確認できる。
- 端末を起動・unlockし、Maestroから操作できる状態にできる。
- Scenario Shop NativeアプリをBuild / Installできる。
- Maestroから最小Flowを実行できる。

Android Runtimeを標準のNative受講者向け経路とします。iOSは現在の正式な保証がBuild-onlyのため、Part 1 / Part 2のRuntime完了条件にしません。iOS Simulatorを説明・比較に使う場合も、Runtime PASSとして記録しません。

Git、GitHub、Pull Request、GitHub ActionsはPart 2で扱います。

## Part 2の前提

Part 2ではGitHubを扱うため、GitHubアカウントを利用できることを前提とします。

P2の選択課程を開始する前の共通課程の必須前提はP2-5までであり、P2-6のNative CIとMaestroは選択式の課程です。P2-6を選択しない受講者はP2-6を飛ばしてP2-7へ進み、完了した受講者はP2-7へ合流します。P2-6を選択する場合は、P1の選択課程で身につけるMaestro実行能力を、選択課程内の必須前提として先に満たします。P1の選択課程を修了せずにP2のNative課程を選ぶ場合も、同じ選択課程内の必須前提を先に満たします。

ただし、受講者がこのRepository本体へのPush権限を持つことは前提にしません。Part 2のGitHub操作では、受講開始前に利用可能になった学習者書き込み可能なTraining Copyを使います。

Git / GitHubの基本演習では、次の標準経路を利用できます。

- 自分のGitHub AccountへForkする。
- 講師または組織が自己学習開始前に用意したTraining Copyを使用する。

既存Repositoryの本番向けCI/CDやCloudflare Secretsを直接利用することは演習の前提にしません。既存Workflowは完成例として読み、演習用Workflowは安全に分離された環境で扱います。

**CIハンズオン、C12、Part 2の最終確認では、事前準備済みTraining Copyを正式経路とします。** ForkはP2-01〜P2-03のGit／GitHub基礎でのみ利用できます。Fork上のRun、Check、ArtifactはC12やPart 2最終修了の証跡へ読み替えません。Training Copyでは、受講者がBranch作成、Commit、Push、Pull Request、GitHub ActionsのRun／Check／Artifact確認まで行いますが、管理者権限、Secrets管理、Branch protection変更、Workflow権限変更、GitHub App設定は要求しません。

本番Secretを受講者へ配布し、既存Production Workflowを無理に成功させる方法は採用しません。

## 共通課程の修了条件

共通課程の卒業像は、実務に入りたての汎用テスト自動化エンジニアです。評価詳細と最低限必要な成果物は[習熟度評価基準](./02_competency-rubric.md)を正本とし、共通課程の修了にNative環境の実行結果を要求しません。

- Part 1の共通課程: `C01〜C07 + C09〜C10`、対象範囲を限定したレベル2
- Part 2 / 最終共通課程: `C01〜C07 + C09〜C12`、対象範囲を限定したレベル2
- `C08`はモバイルアプリ自動化の選択課程であり、共通課程の修了条件には含めません。

成果物や実行記録はリポジトリ内へ保存・記録すれば成立し、外部提出を共通課程の修了条件にはしません。

### 自習と講師支援の境界

学習内容、演習で判断すること、自己確認、学習上のRecovery、完了条件、評価観点は受講者向け教材を正本とします。講師・運営は環境準備、アカウント・権限、端末、演習Repository / Training Copy、Infrastructure / Toolchainの準備・障害対応を支援できますが、非公開情報や個別判断を必須の修了条件にはしません。

### Part 1からPart 2への移行

Part 1を配布ZIPなどGit管理されていないCopyで進めた受講者もいるため、Part 2開始時に作業環境を明示的に切り替えます。

標準的な移行は次の流れです。

```text
Part 1
Scenario ShopのZIP / Local Copyで学習
↓
Part 2開始
Git管理されたqa-training-storeの演習用Copyを用意
↓
Part 1で作成したTraining Testや学習成果物を引き継ぐ
↓
Gitで変更履歴を管理する
↓
準備済みTraining CopyのRemote / Pull Requestへ進む
```

ここで別の教材アプリへ切り替えるわけではありません。**コードベースとテスト対象は同じScenario Shopのまま、変更管理できる作業環境へ移行します。**

Part 1の作業Folderへ単純に `git init` して教材元のHistoryを失った状態を標準経路にはしません。Git Historyを持つdisposable Training CopyへPart 1成果物を安全に引き継ぎます。Source SHA、allowlist、copy mechanicsの準備・検証は既存の提供手順で行い、受講者必須の学習内容に隠れた前提として加えません。受講者は渡されたTraining CopyでBranch、Commit、Push、Pull Request、Run／Check／Artifact確認を行います。

## ノーコード・ローコード経験との接続

AutifyやMagicPodの経験は捨てず、共通概念へ置き換えます。

| 共通概念 | ノーコード・ローコード | Playwright / Maestro |
| --- | --- | --- |
| テストシナリオ | GUI上のScenario | spec / Maestro Flow |
| 操作 | Step | Action |
| 要素指定 | Element指定 | Locator / UI Test ID |
| 検証 | Assertion Step | `expect` / `assertVisible` |
| 前提状態 | 初期化設定 | Seed / Seed Scenario / Reset |
| 共通処理 | Group / Shared Step | Helper / POM / Fixture |
| 実行結果 | Dashboard | Report / Trace / JUnit / Artifact |

ツールが変わっても、テスト対象、前提条件、操作、期待結果、テストデータ、実行結果という基本構造は変わらないことを理解します。

## 学習順序

### Part 1

Part 1では、まずテスト自動化の一連の流れを最後まで体験します。

POM、Fixtureなどの保守設計は後半に置きます。最初から高度な共通化を行うと、学習者が「なぜ必要なのか」を理解せずにパターンだけ模倣するためです。

次の順序を基本とします。

1. テスト自動化を理解する。
2. Scenario Shopを探索する。
3. スプレッドシートでテスト分析・設計する。
4. 自動化対象を決める。
5. Playwrightで必要なJavaScript / TypeScriptの最小知識を学ぶ。
6. Playwrightで実装する。
7. 実行結果を分析する。
8. モバイルアプリ自動化の選択課程を選んだ場合は、P1-7でMaestroによるNative自動化を行う。
9. 共通課程の受講者はP1-6完了後にP1-7を飛ばしてP1-8へ進み、選択課程を選んだ受講者はP1-7完了後に同じP1-8へ合流する。P1-8では共通課程としてPlaywright Testの保守課題を扱い、選択時だけNative成果物が追加される。
10. テスト管理と保守上の問題を洗い出す。
11. Helper / POM / Fixture / Seed Scenarioなどを使って改善する。
12. 総合演習を行う。

Part 1前半では、Seed Scenario Resetや実行記録の収集の仕組みは教材側が提供するTest Harnessとして利用し、Fixture内部の責務分解や共通化設計はまだ学びません。既存 `e2e/web/fixtures.ts` の内部設計を教材として読むのは、P1-6までの共通課程の学習を完了し、P1-7を飛ばすか完了してP1-8へ到達した後です。

### Part 2

Part 2では、Part 1で作成したテストを一般的な開発プロセスへ接続します。

1. ソフトウェア開発と変更管理を理解する。
2. Gitで変更履歴を管理する。
3. GitHubでPull RequestとReviewを行う。
4. CIの必要性を理解する。
5. GitHub Actionsでテストを実行する。
6. Playwright ReportやArtifactを管理する。
7. モバイルアプリ自動化の選択課程を選んだ場合は、P2-6でAndroid Build + Runtime E2Eと、iOS Build-onlyの保証境界を学ぶ。
8. 共通経路ではP2-6を飛ばし、P2-7でWeb Quality Gate、Build / Test Artifact、失敗時の記録、fail-closed条件を設計する。Deploy / Smokeなどは発展課題・参考資料として比較する。
9. Scenario Shopを題材に導入設計演習を行う。

## 教材の進め方

各モジュールは、原則として次の構造を持ちます。

1. 学習目標
2. 背景・考え方
3. Scenario Shopで確認する対象
4. ハンズオン
5. 考察
6. 確認問題
7. 完了条件

受講者には「手順どおり操作したら終わり」ではなく、自分の判断理由を残すことを求めます。

## 完成済み実装を先に見せすぎない

Scenario Shopにはすでに高度な自動化実装があります。

例えば次があります。

- `e2e/web/fixtures.ts`
- `e2e/web/phase1-required.spec.ts`
- `playwright.config.ts`
- `maestro/`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`

これらは重要な教材ですが、演習前に正解としてコピーさせません。

まず受講者自身が小さな設計・実装を行い、その後にRepositoryの実装を読み、次を比較します。

- 自分の設計と何が違うか。
- なぜRepository側ではその構造になっているか。
- 自分の実装のままで問題になる条件は何か。
- Repositoryの実装が常に正解とは限らない点は何か。

`e2e/web/fixtures.ts` については、Part 1前半では内部を正解として読まず、後半の保守設計で初めて責務を分析します。

## 「正解」より判断基準を学ぶ

特に次は単一の正解を教えません。

- E2Eへ含める範囲
- 自動化するテスト
- POMを使うか
- Helperで十分か
- Fixtureへ前提処理を入れるか
- 複数画面の共通操作を切り出すか
- UI Test IDを使うか
- Retryを使うか
- PRでどこまでテストするか
- Nightlyへ何を回すか
- CIをどこまで並列化するか

Scenario Shopの具体的な条件を使い、メリット、デメリット、コスト、リスクから判断します。

## 到達度の評価

知識確認だけではなく、成果物と説明能力で評価します。

受講者が次を説明できれば、単なる操作習得より一段高い理解と判断します。

- なぜそのテストを自動化したか。
- なぜその初期状態を使ったか。
- なぜそのLocatorを選んだか。
- 失敗時にどの実行記録を確認したか。
- なぜその共通化方法を選んだか。
- なぜそのテストをPR / main / Nightlyのどこで回すか。
- なぜそのJobをQuality Gateに含めるか。
