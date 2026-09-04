# Part 2-1: ソフトウェア開発プロセスと変更管理

## 学習目標

- 一般的なソフトウェア開発の流れを説明できる。
- 要求、設計、実装、Review、Test、Build、Deployの関係を理解できる。
- テスト自動化が開発プロセスのどこで価値を持つか説明できる。
- 変更を安全に届けるために、履歴管理・Review・継続的な検証が必要な理由を理解できる。
- Part 1で作成した自動テストを、個人のローカル実行から開発プロセスへ接続する必要性を説明できる。

## 教材

**このモジュールでは、このリポジトリ `qa-training-store` の開発・検証構成を使用します。**

主に次を参照します。

- `README.md`
- `CONTRIBUTING.md`
- `docs/PROJECT_CONTEXT.md`
- `package.json`
- `.github/workflows/`
- `e2e/web/`
- `maestro/`

## Part 2の位置づけ

Part 1ではGitHubアカウントを前提にせず、ローカルでテスト自動化を一巡しました。

Part 2では、そのテストを「自分が必要なときに手動実行するもの」から、「変更と連動して継続的に実行される品質確認」へ発展させます。

GitやGitHubを学ぶこと自体が目的ではありません。

最終的な目的は、次を自分で考えられることです。

```text
変更が入る
↓
変更内容を管理する
↓
Reviewする
↓
必要なテストを自動実行する
↓
結果を確認する
↓
問題なければ次の工程へ進める
```

## Lesson 1: 一般的な開発の流れ

案件によって詳細は異なりますが、概念的には次の活動があります。

```text
要求・課題
↓
分析・設計
↓
実装
↓
Review
↓
Test
↓
Build
↓
Release / Deploy
↓
Monitoring / Improvement
```

実際には直線ではなく、FailureやFeedbackによって前工程へ戻ります。

## Lesson 2: 変更という単位で考える

ソフトウェア開発では、常に「現在の状態」に変更が加わります。

例:

- Cartの購入上限ルール変更
- Login UI変更
- Payment処理変更
- Locatorへ影響するUI Refactor
- Native機能追加

変更が入ったときに必要なのは、新機能だけの確認ではありません。

既存機能が壊れていないことを確認するRegressionが必要になります。

ここでPart 1の自動テストが開発プロセスとつながります。

## Lesson 3: なぜ変更履歴を管理するか

変更履歴がなければ、次を追いにくくなります。

- 何を変えたか。
- なぜ変えたか。
- いつ変えたか。
- どの変更で問題が入ったか。
- 以前の状態との差分は何か。

Gitはこの変更履歴を管理する仕組みとして後続モジュールで学びます。

## Lesson 4: Reviewの役割

Reviewはコードの書き方だけを確認する活動ではありません。

Scenario Shopを例にすると、次もReview対象です。

- 要求どおりの変更か。
- 既存Testが不足していないか。
- 自動テストが弱体化されていないか。
- Test DataやScenarioの契約を壊していないか。
- CIの必須Gateを迂回していないか。

## Lesson 5: Testの実行タイミング

自動テストは「書いたら終わり」ではありません。

変更に応じて実行する仕組みが必要です。

候補:

- 開発中のローカル実行
- Pull Request作成時
- mainへ統合後
- Nightly
- 手動実行
- Deploy後

どのテストをいつ実行するかはPart 2後半で設計します。

## Lesson 6: BuildとTest

WebやNativeでは、Source CodeだけでなくBuild Artifactも品質対象になります。

Scenario Shopでは次があります。

- Web `dist/`
- Android APK
- iOS `iphonesimulator` Build Artifact（Current formal guaranteeはBuild-only）

Source TestがPassしても、Buildに失敗したりBuild Artifactで問題が起きる可能性があります。

そのため、CIではTestとBuildの両方を扱います。

## Lesson 7: Deploy後の確認

Build成功と実際に公開された環境が動作することも同じではありません。

Scenario ShopではCloudflare PagesへのDeploy後にSmoke Testを実行する経路があります。

後続モジュールで、Build → Deploy → Smokeの責務を詳しく確認します。

## ハンズオン1: 変更からReleaseまでを図にする

Scenario Shopへ「Cart画面のUI変更」が入る想定で、次を図示します。

- 実装
- Local Test
- Review
- E2E
- Build
- Deploy
- Smoke

## ハンズオン2: Part 1のテストを配置する

Part 1で作成したTestを一覧化し、「開発プロセスのどこで実行すると価値が高いか」を仮置きします。

この時点では正解を決めず、理由だけ記録します。

## 自己確認とRecovery

「Cart画面のUI変更」を、要求・設計・実装・Review・Test・Build・Deploy・Smokeのどこへ接続したかを図と1文の理由で説明します。Local Testの成功、Buildの成功、Deploy後Smokeの成功を同じEvidenceとして扱わないことを確認します。

工程のつながりを説明できない場合は、Lesson 1〜7の該当工程へ戻り、変更が何を壊し得るかと、どのTest / Artifactが確認するかを書き直します。次はPart 2-2で、変更をBranch、Diff、Commitの単位へ分けます。

## 確認問題

1. Regression Testが変更管理と関係するのはなぜか。
2. Build成功とテスト成功は同じか。
3. Deploy前後で確認する対象が異なるのはなぜか。
4. ReviewでTest Codeも確認すべき理由は何か。
5. 自動テストをローカル実行だけにすると、どんな問題が残るか。

## 完了条件

- 一般的な開発プロセスを図示できる。
- 自動テストが開発プロセスのどこで使われるか説明できる。
- Source Test、Build、Deploy後Smokeの違いを説明できる。
- Part 1で作ったテストをどこで実行したいか仮説を持てる。
