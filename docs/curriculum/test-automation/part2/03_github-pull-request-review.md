# Part 2-3: GitHub・Pull Request・Review

## 学習目標

- GitとGitHubの役割の違いを説明できる。
- Repository、Remote、Push、Pull Requestの関係を理解できる。
- Pull Requestを単なるMerge手段ではなく、変更内容と検証結果を共有する単位として扱える。
- 自動テストの変更をReviewする観点を持てる。
- GitHub上のChecksが後続のCIとどのようにつながるか理解できる。

## 教材

**このモジュールでは、このリポジトリ `qa-training-store` と、その実際のPull Request構成を使用します。**

教材用に別Repositoryへ切り替えません。

## Lesson 1: GitとGitHub

Gitは変更履歴を管理する仕組みです。

GitHubはGit RepositoryをHostingし、Pull Request、Review、Issues、Actionsなどの共同開発機能を提供するServiceです。

この違いを明確にします。

## Lesson 2: Remote

Local RepositoryとGitHub上のRepositoryは別の状態を持ちます。

代表的な確認:

```bash
git remote -v
```

BranchをGitHubへ共有するにはPushします。

```bash
git push -u origin training/cart-e2e
```

## Lesson 3: Pull Request

Pull Requestでは、作業BranchをBase Branchへ統合する前に変更内容を確認します。

PRで最低限伝える内容:

- 何を変更したか。
- なぜ変更したか。
- どんなTestを追加・変更したか。
- どの検証を実行したか。
- 未確認事項やRiskは何か。

## Lesson 4: Diff Review

Reviewでは「コードが動くか」だけを見ません。

テスト自動化では次を確認します。

- Test Caseの目的が分かるか。
- Assertionが弱くなっていないか。
- 固定待機が追加されていないか。
- Locatorが不安定ではないか。
- Test Data依存が増えていないか。
- 既存Regressionと重複していないか。
- POMやHelperが過剰に複雑化していないか。
- TestをPassさせるためにProduct側の品質条件を弱めていないか。

## Lesson 5: Test CodeもProduction Codeと同じくReviewする

自動テストは継続的に保守するCodeです。

誤ったTestがMergeされると、次の問題があります。

- 本当の不具合を見逃す。
- False Failureが増える。
- FlakyによってCIへの信頼が落ちる。
- 保守コストが増える。

「テストだから多少雑でもよい」という扱いを避けます。

## Lesson 6: PRとChecks

GitHub Actionsを設定すると、PRへChecksが表示されます。

Scenario Shopでは、現在のCIで次のような検証があります。

- Style Quality
- Code Quality
- Vitest
- Build
- Playwright E2E
- UI Review
- Smoke
- Native CI

ここでは詳細Workflowをまだ作り込まず、PRと自動検証結果が紐付く仕組みを理解します。

## Lesson 7: Merge判断

Merge判断では次を組み合わせます。

- Review内容
- Required Checks
- Test結果
- 未解決Risk
- Scope

「CIが緑だから必ず正しい」わけではありません。CIが確認していないRiskは人間が判断します。

## ハンズオン1: PR説明を書く

Part 1で作ったPlaywright Test追加を題材に、PR本文を作成します。

最低限次を含めます。

- Background
- Changes
- Test Designとの対応
- Validation
- Remaining Risk

## ハンズオン2: Test PRをReviewする

既存または演習用Diffを使い、最低3件のReview観点を記録します。

単なる好みではなく、テストの正確性・安定性・保守性に影響するものを優先します。

## 確認問題

1. GitとGitHubの違いは何か。
2. Pull Requestを使う価値は何か。
3. Test CodeのReviewが必要な理由は何か。
4. CIが成功していてもMergeを止める判断があり得るのはなぜか。
5. Assertionを弱くする変更はなぜ危険か。

## 完了条件

- Local BranchをGitHubへPushできる。
- Pull Requestの役割を説明できる。
- Test変更をReviewする観点を5つ以上挙げられる。
- PR本文へTest Designとの対応とValidationを記録できる。
