# Part 2-3: GitHub・Pull Request・Review

## 学習目標

- GitとGitHubの役割の違いを説明できる。
- Repository、Remote、Push、Pull Requestの関係を理解できる。
- ForkとUpstream Repositoryの関係を理解できる。
- Pull Requestを単なるMerge手段ではなく、変更内容と検証結果を共有する単位として扱える。
- 自動テストの変更をReviewする観点を持てる。
- GitHub上のChecksが後続のCIとどのようにつながるか理解できる。

## 教材

**このモジュールでは、このリポジトリ `qa-training-store` と、その実際のPull Request構成を使用します。**

レビューの判断基準は [`docs/spec/README.md`](../../../spec/README.md)、対象FeatureのBR / AC、習熟度評価基準です。Training変更は `training/`とTraining Configへ置き、Formal Regressionへ混在させません。

教材用に別のテスト対象へ切り替えません。

ただし、受講者が `ryu-yoshikawa-pro-vision/qa-training-store` 本体へのPush権限を持つことは前提にしません。P2-01〜P2-03ではForkまたは準備済みTraining Copyを使えますが、C12／Training CIへ進む前に、自己学習開始前に用意された学習者書き込み可能なTraining Copyへ切り替えます。

## 演習Repositoryの標準形

GitHub演習では、次のいずれかを使用します。

1. `qa-training-store` を自分のGitHub AccountへForkする。
2. 運営者が開始前に用意した `qa-training-store` の演習用Copyを使用する。

どちらの場合もテスト対象・コードベースはScenario Shopのままです。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P2-2のBranch／Commit／Diff、P1成果物のCase IDとコードPath、Pull Requestで説明するTest結果。GitHubアカウントと、基礎学習に使うForkまたはTraining Copy |
| Activity | Remote、Fork、Push、Pull Request、Review、Checksの関係を確認し、Test Codeの変更・理由・実行記録をPR単位で共有する |
| Observation | Base／Headの差分、変更対象、Reviewコメント、Checkの状態、Test Case／Receipt／Artifact参照、学習者が書き込みできるRemoteかどうか |
| Output | Branch／Commit／Pull Request、PR説明、Review記録、Check参照、P2-4へ渡すTest Case・コードPath・実行記録。C11の機械確認へ渡す記録には、少なくとも`Branch:`、`Commit:`、`Diff:`、`Pull Request:`、`Review:`を記載する。形式と編集場所は自由で、self-checkは`handoff-root/self-check/P2-03.md`へ残す |
| Self-check | GitとGitHub、ForkとUpstream、PRとMerge、ReviewとChecksの役割を分け、Test CodeもReview対象にする理由を説明する |
| Completion | P2-2の変更をPRで共有し、レビューとCheckの結果を説明できる。`Branch:`、`Commit:`、`Diff:`、`Pull Request:`、`Review:`を含む自分の変更管理記録を残す。Forkを使った場合はP2-3までの基礎学習として完了し、C12／Training CIの正式経路はTraining Copyだと確認できる |
| Recovery | Remote／権限の問題はForkまたは準備済みTraining Copyの開始条件を確認する。Reviewの理解不足はDiffとPR本文へ戻り、管理者権限・Secrets・Workflow設定変更で解決しない |
| Handoff | P2-4へTraining CopyのURL、Branch／PR、Case ID、コードPath、Check／Review記録を渡す。ForkのPRは基礎学習の記録として扱い、C12の証跡と混同しない |

```text
Upstream / 教材元
qa-training-store
        ↓
Fork または演習用Copy
        ↓
training/* branch
        ↓
Pull Request
```

本体Repositoryへ直接Pushできることを学習要件にしません。

## Lesson 1: GitとGitHub

Gitは変更履歴を管理する仕組みです。

GitHubはGit RepositoryをHostingし、Pull Request、Review、Issues、Actionsなどの共同開発機能を提供するServiceです。

この違いを明確にします。

## Lesson 2: RemoteとFork

Local RepositoryとGitHub上のRepositoryは別の状態を持ちます。

代表的な確認:

```bash
git remote -v
```

Forkを使う場合は、概念的に次を区別します。

- `origin`: 自分がPushできるFork
- `upstream`: 教材元のRepository

受講者の権限や教材配布方法によってRemote構成は異なるため、名前の暗記より「どこへPushし、どこを参照元にするか」を理解します。

Branchを共有するには、自分が書き込めるRemoteへPushします。

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

演習では自分のForkまたは演習用Copy内でPRを作成できます。本体RepositoryへのPR作成は必須にしません。

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

Scenario Shop本体では、現在のCIで次のような検証があります。

- Style Quality
- Code Quality
- Vitest
- Build
- Playwright E2E
- UI Review
- Smoke
- Native CI

ここでは詳細Workflowをまだ作り込まず、PRと自動検証結果が紐付く仕組みを理解します。

重要なのは、本体RepositoryのChecksをそのまま演習環境へ複製することではありません。受講開始前にTraining Copy、実行対象Workflow、SecretsやDeployの分離を確認します。共通課程の修了では、準備済みの演習環境でPRとTest変更をレビューします。

## Lesson 7: Merge判断

Merge判断では次を組み合わせます。

- Review内容
- 必須Checks
- Test結果
- 未解決Risk
- Scope

「CIが緑だから必ず正しい」わけではありません。CIが確認していないRiskは人間が判断します。

## ハンズオン1: Fork / Copyで作業Branchを共有する

自分が書き込める演習Repositoryで `training/*` Branchを作成し、GitHubへPushします。

次を確認します。

- Local Branch
- Remote Branch
- Base Branch
- Push先

## ハンズオン2: PR説明を書く

Part 1で作ったPlaywright Test追加を題材に、PR本文を作成します。

最低限次を含めます。

- Background
- Changes
- Test Designとの対応
- Validation
- Remaining Risk

## ハンズオン3: Test PRをReviewする

既存または演習用Diffを使い、Testの正確性・安定性・保守性に影響するmaterialなReview観点を選び、理由と確認結果を記録します。固定件数を満たすことではなく、変更のRiskを自分で説明できることを重視します。

単なる好みではなく、テストの正確性・安定性・保守性に影響するものを優先します。

## 確認問題

1. GitとGitHubの違いは何か。
2. Forkを使うと本体RepositoryへのPush権限がなくても演習できるのはなぜか。
3. Pull Requestを使う価値は何か。
4. Test CodeのReviewが必要な理由は何か。
5. CIが成功していてもMergeを止める判断があり得るのはなぜか。
6. Assertionを弱くする変更はなぜ危険か。

## 自己確認

次を自分のPR説明またはReviewメモで確認できれば、このLessonの判断を自己判定できます。

- Fork / Remote / Push / Pull Requestの役割と、自分が書き込める場所を説明できる。
- PR本文へ変更内容、理由、Test Designとの対応、Validation、Remaining Riskを記録できる。
- material diffについて、Test目的、Assertion、Locator、Data依存、Regression重複、Product条件の観点から必要な確認を選べる。
- Review観点を好みではなく、正確性・安定性・保守性への影響として説明できる。
- Training Copyの準備や第三者Reviewは共通課程の修了の前提ではなく、件数quotaなしで自分のレビューを完了できる。

### Recovery

PushやPRを作成できない場合は、まずLocal Branch、Remote URL、権限、Base Branchを確認し、環境・アカウント上の問題として切り分けます。レビューの判断が曖昧な場合は、変更の目的、期待するAssertion、失敗時の記録、既存Regressionとの重複へ戻り、重要な観点を1つずつ記録します。

## 完了条件

- Forkまたは演習用Copyと本体Repositoryの役割を説明できる。
- 自分が書き込めるRemoteへLocal BranchをPushできる。
- Pull Requestの役割を説明できる。
- Test変更の重要なレビュー観点を、変更のRiskと理由付きで選べる。固定件数や第三者Reviewを修了条件にしない。
- PR本文へTest Designとの対応とValidationを記録できる。

## 次の行動

PRとself-reviewをCIの実行契約へ接続するため、[P2-4: CIとGitHub Actions](04_ci-github-actions.md)へ進みます。
