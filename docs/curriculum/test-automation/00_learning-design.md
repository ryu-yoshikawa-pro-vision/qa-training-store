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

このディレクトリでは、学習順序、教材内容、演習、到達条件を定義します。Repositoryには、本文を実行可能にするTraining Web / Native入口、CSV Workbook、Validator、TypeScript gate、CI Templateも同じPlanで実装済みです。

各Lessonは、次の2種類を明示的に区別します。

- **Normative Oracleを読む学習**: [`docs/spec/README.md`](../../spec/README.md)とFeatureのBR / ACを起点にする。
- **Training境界で行う演習**: `training/`と`playwright.training.config.ts`を使い、Formal RegressionやProduction Workflowへ変更を混在させない。

既存の `e2e/web/`、`maestro/`、Formal CIは比較教材・正式Regressionであり、Learner Testの保存先ではありません。本番Secret、OIDC、Deploy権限はTrainingへ持ち込みません。

## 対象者

主な対象は次の受講者です。

- 手動テストを経験しており、自動化へ進みたい人
- Autify、MagicPodなどのノーコード・ローコード自動化経験者
- Playwrightを触ったことはあるが、テスト設計や運用に自信がない人
- Web自動化からNative自動化へ広げたい人
- CIで自動テストを回せるようになりたい人
- 実案件で自動化基盤を設計できるようになりたい人

プログラミング経験は必須前提にしません。Playwrightへ進む前に、テストコードを読み書きするために必要なJavaScript / TypeScriptの最小知識をPart 1で扱います。

フルの言語学習を目的にはせず、Scenario Shopの自動テストを書くために必要な範囲へ絞ります。

## 用語の使い分け

自動化では同じ単語が異なる意味で使われやすいため、このカリキュラムでは次の呼称を基本とします。

| 用語 | このカリキュラムでの意味 |
| --- | --- |
| Test Case ID | `CART-001` など、スプレッドシート上のテストケース識別子 |
| UI Test ID / `testId` | PlaywrightやMaestroからUI要素を安定して特定する識別子 |
| Seed Scenario | Scenario Shopを決定的な初期状態へResetするためのScenario |
| Test Scenario / User Journey | 複数の条件・画面を跨いで確認する業務上のテストシナリオ |
| Maestro Flow | MaestroのYAMLで記述する実行単位 |
| Automation Flow | 複数Pageを跨ぐ共通業務操作をコード上で表現する構造 |

教材本文では原則として上記の正式な呼称を使用し、単に「Test ID」「Scenario」「Flow」と省略して複数の意味を混在させません。

ただし、既存コードのAPI名や変数名、外部Tool固有の名称を引用するときは、その実装上の名称をそのまま使用します。その場合も、教材上どの概念に対応するかを区別します。

特に、**Test Case IDとUI Test ID、Seed ScenarioとUser Journey、Maestro FlowとAutomation Flowは同じものではありません。**

## Part 1の前提

Part 1ではGitHubアカウントを必須にしません。

受講者が必要なのは、Scenario ShopとPlaywrightをローカルで扱える環境です。Repository取得方法はGit Cloneに限定せず、必要に応じて配布ZIPなども利用できます。

Maestroへ進む時点ではNative実行環境が追加で必要です。開始確認は、Current RepositoryのAndroid runbook、Training baseline、Native CI contractで行います。

### Web / Playwright開始Gate

- 対応Node.js / pnpmを利用できる。
- DependencyをInstallできる。
- Scenario Shop Webをこのworktree専用の `PLAYWRIGHT_BASE_URL` で起動できる。
- `pnpm run training:web:baseline` が `training-chromium` で成功する。
- `pnpm run training:web:mobile` が `training-mobile-chromium` で成功する。

### Native / Maestro開始Gate

標準ハンズオンはAndroid Emulatorを基準とします。

- JDK / Android SDKを利用できる。
- Android Emulatorを起動できる。
- Scenario Shop NativeアプリをBuild / Installできる。
- Maestroから最小Flowを実行できる。

Android Runtimeを標準のNative learner pathとします。iOSはCurrent formal guaranteeがBuild-onlyのため、Part 1 / Part 2のRuntime完了条件にしません。iOS Simulatorを説明・比較に使う場合も、Runtime PASSとして記録しません。

Git、GitHub、Pull Request、GitHub ActionsはPart 2で扱います。

## Part 2の前提

Part 2ではGitHubを扱うため、GitHubアカウントを利用できることを前提とします。

ただし、受講者がこのRepository本体へのPush権限を持つことは前提にしません。

Git / GitHubの基本演習では、次の標準経路を利用できます。

- 自分のGitHub AccountへForkする。
- 講師または組織が用意した演習用Copyを使用する。

既存Repositoryの本番向けCI/CDやCloudflare Secretsを直接利用することは演習の前提にしません。既存Workflowは完成例として読み、演習用Workflowは安全に分離された環境で扱います。

**CIハンズオンでは、Production Workflowとの競合を避けるため、演習用Copyを標準経路とします。** Forkを使用してCIを学ぶ場合は、GitHub Actionsを利用可能にしたうえで、教材元から継承したProduction / Deploy Workflowが演習PRで同時起動しないように設定し、Training Workflowだけを意図どおり実行できることを開始Gateとします。

本番Secretを受講者へ配布し、既存Production Workflowを無理に成功させる方法は採用しません。

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
GitHub Remote / Fork / Pull Requestへ進む
```

ここで別の教材アプリへ切り替えるわけではありません。**コードベースとテスト対象は同じScenario Shopのまま、変更管理できる作業環境へ移行します。**

Part 1の作業Folderへ単純に `git init` して教材元のHistoryを失った状態を標準経路にはしません。`training:copy:prepare`へ完全なSource SHAを渡し、Git Historyを持つdisposable Training CopyへPart 1成果物を安全に引き継ぎます。

## ノーコード・ローコード経験との接続

AutifyやMagicPodの経験は捨てず、共通概念へ置き換えます。

| 共通概念 | ノーコード・ローコード | Playwright / Maestro |
| --- | --- | --- |
| テストシナリオ | GUI上のScenario | spec / Maestro Flow |
| 操作 | Step | Action |
| 要素指定 | Element指定 | Locator / UI Test ID |
| 検証 | Assertion Step | `expect` / `assertVisible` |
| 前提状態 | 初期化設定 | Seed / Seed Scenario / Reset |
| 共通処理 | Group / Shared Step | Helper / POM / Fixture / Automation Flow |
| 実行結果 | Dashboard | Report / Trace / JUnit / Artifact |

ツールが変わっても、テスト対象、前提条件、操作、期待結果、テストデータ、実行結果という基本構造は変わらないことを理解します。

## 学習順序

### Part 1

Part 1では、まずテスト自動化の一連の流れを最後まで体験します。

POM、Fixture、Automation Flowなどの保守設計は後半に置きます。最初から高度な共通化を行うと、学習者が「なぜ必要なのか」を理解せずにパターンだけ模倣するためです。

次の順序を基本とします。

1. テスト自動化を理解する。
2. Scenario Shopを探索する。
3. スプレッドシートでテスト分析・設計する。
4. 自動化対象を決める。
5. Playwrightで必要なJavaScript / TypeScriptの最小知識を学ぶ。
6. Playwrightで実装する。
7. 実行結果を分析する。
8. MaestroでNative自動化を行う。
9. Web / Nativeの自動テストが増えた状態を体験する。
10. テスト管理と保守上の問題を洗い出す。
11. Helper / POM / Fixture / Automation Flow / Seed Scenarioなどを使って改善する。
12. 総合演習を行う。

Part 1前半では、Seed Scenario ResetやEvidence収集の仕組みは教材側が提供するTest Harnessとして利用し、Fixture内部の責務分解や共通化設計はまだ学びません。既存 `e2e/web/fixtures.ts` の内部設計を教材として読むのは、Maestroまで一巡した後のテスト管理・保守性改善モジュールからとします。

### Part 2

Part 2では、Part 1で作成したテストを一般的な開発プロセスへ接続します。

1. ソフトウェア開発と変更管理を理解する。
2. Gitで変更履歴を管理する。
3. GitHubでPull RequestとReviewを行う。
4. CIの必要性を理解する。
5. GitHub Actionsでテストを実行する。
6. Playwright ReportやArtifactを管理する。
7. Android Build + Runtime E2Eと、iOS Build-onlyの保証境界を学ぶ。
8. Quality Gate、Build、Deploy、Smokeを設計する。
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
- Automation Flowを作るか
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
- 失敗時にどのEvidenceを確認したか。
- なぜその共通化方法を選んだか。
- なぜそのテストをPR / main / Nightlyのどこで回すか。
- なぜそのJobをQuality Gateに含めるか。
