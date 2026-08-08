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

## 対象者

主な対象は次の受講者です。

- 手動テストを経験しており、自動化へ進みたい人
- Autify、MagicPodなどのノーコード・ローコード自動化経験者
- Playwrightを触ったことはあるが、テスト設計や運用に自信がない人
- Web自動化からNative自動化へ広げたい人
- CIで自動テストを回せるようになりたい人
- 実案件で自動化基盤を設計できるようになりたい人

## Part 1の前提

Part 1ではGitHubアカウントを必須にしません。

受講者が必要なのは、Scenario ShopとPlaywright/Maestroをローカルで扱える環境です。Repository取得方法はGit Cloneに限定せず、必要に応じて配布ZIPなども利用できます。

Git、GitHub、Pull Request、GitHub ActionsはPart 2で扱います。

## ノーコード・ローコード経験との接続

AutifyやMagicPodの経験は捨てず、共通概念へ置き換えます。

| 共通概念 | ノーコード・ローコード | Playwright / Maestro |
| --- | --- | --- |
| テストシナリオ | GUI上のScenario | spec / Flow |
| 操作 | Step | Action |
| 要素指定 | Element指定 | Locator / Test ID |
| 検証 | Assertion Step | `expect` / `assertVisible` |
| 前提状態 | 初期化設定 | Seed / Scenario / Reset |
| 共通処理 | Group / Shared Step | Helper / POM / Fixture / Flow |
| 実行結果 | Dashboard | Report / Trace / JUnit / Artifact |

ツールが変わっても、テスト対象、前提条件、操作、期待結果、テストデータ、実行結果という基本構造は変わらないことを理解します。

## 学習順序

### Part 1

Part 1では、まずテスト自動化の一連の流れを最後まで体験します。

POM、Fixture、Flowなどの保守設計は後半に置きます。最初から高度な共通化を行うと、学習者が「なぜ必要なのか」を理解せずにパターンだけ模倣するためです。

次の順序を基本とします。

1. テスト自動化を理解する。
2. Scenario Shopを探索する。
3. スプレッドシートでテスト分析・設計する。
4. 自動化対象を決める。
5. Playwrightで実装する。
6. 実行結果を分析する。
7. MaestroでNative自動化を行う。
8. Web / Nativeの自動テストが増えた状態を体験する。
9. テスト管理と保守上の問題を洗い出す。
10. Helper / POM / Fixture / Flow / Scenarioなどを使って改善する。
11. 総合演習を行う。

### Part 2

Part 2では、Part 1で作成したテストを一般的な開発プロセスへ接続します。

1. ソフトウェア開発と変更管理を理解する。
2. Gitで変更履歴を管理する。
3. GitHubでPull RequestとReviewを行う。
4. CIの必要性を理解する。
5. GitHub Actionsでテストを実行する。
6. Playwright ReportやArtifactを管理する。
7. MaestroをAndroid / iOS CIで実行する。
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

## 「正解」より判断基準を学ぶ

特に次は単一の正解を教えません。

- E2Eへ含める範囲
- 自動化するテスト
- POMを使うか
- Helperで十分か
- Fixtureへ前提処理を入れるか
- Flowを作るか
- Test IDを使うか
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
