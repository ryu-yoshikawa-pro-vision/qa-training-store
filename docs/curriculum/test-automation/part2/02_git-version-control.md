# Part 2-2: Gitによるバージョン管理

## 学習目標

- Gitが何を管理する仕組みか説明できる。
- Working Tree、Staging、Commitの関係を理解できる。
- Branchを使って変更を分離できる。
- Diffから変更内容を確認できる。
- Commitを「保存ボタン」ではなく、意味のある変更単位として扱える。
- Scenario Shopへ加えた変更をGitで安全に管理できる。

## 教材

**このモジュールでは、このリポジトリ `qa-training-store` をGit教材として使用します。**

別の教材アプリや別コードベースへ切り替えません。Part 1で使用したScenario Shopと、Part 1で作成したPlaywright Testや学習成果物を引き続き使います。

Forkや演習用Copyを利用する場合も、中身は同じ `qa-training-store` を基にします。

## Part 1からの作業環境移行

Part 1ではGitHubアカウントを必須にしていないため、配布ZIPなどGit Historyを持たないFolderで学習している場合があります。

その場合、Part 2では最初に**Git Historyを持つ `qa-training-store` の演習用Copyへ移行**します。

標準的な流れ:

```text
Part 1のZIP / Local Copy
├ Training Playwright Test
├ Maestro Flow
└ 学習成果物
        ↓ 必要な成果物だけを引き継ぐ
Git管理されたqa-training-store
├ mainとRepository History
├ Part 2用作業Branch
├ Part 1成果物
└ 以降のGit演習
```

### 移行時の安全な手順（Instructor support / Reference）

Training Copyの準備と引継ぎはInstructor support / Referenceです。受講者のCommon completionは、準備済みのGit管理Copy上でBranch、Diff、Staging、Commitを扱うことに置き、Source SHA、allowlist、copy mechanicsの準備を自力で行うことは要求しません。

具体的な準備・検証、引継ぎ対象のallowlist、既存Workflowとの分離は [Instructor Reference](../03_instructor-reference.md) のsupport手順を使用します。受講者は、準備済みCopy上で自分のPart 1成果物とGit上の既存資産をDiffから区別し、必要な変更だけを作業Branchへ扱います。

作業Branchの作成、`git status`、`git diff`、`git diff --staged`などのLocal Git操作は、このモジュールのCommon学習対象として扱います。Copy準備の失敗や成果物不足は、Gitの理解不足ではなくEnvironment / provisioning blockとしてSupportへ戻します。

Part 1のZIP Folderで単純に `git init` し、教材元のHistoryがない状態を標準経路にはしません。

このモジュールではまずLocal Gitを学びます。GitHub上のFork、Remote、Push、Pull Requestは次のPart 2-3で扱います。

## Lesson 1: Gitとは

GitはSource Codeや文書などの変更履歴を管理する分散Version Control Systemです。

主に次を追跡できます。

- どのFileが変わったか。
- どのLineが変わったか。
- いつCommitされたか。
- どのCommitを起点にBranchが分かれたか。

## Lesson 2: Working Tree

Fileを編集しただけではCommitされていません。

まず現在の状態を確認します。

```bash
git status
```

変更内容はDiffで確認します。

```bash
git diff
```

自分が意図していない変更が混ざっていないことを確認する習慣を付けます。

## Lesson 3: Staging

Commitへ含める変更を選びます。

```bash
git add path/to/file
```

何でも `git add -A` するのではなく、今回の変更範囲を理解してStageすることを学びます。

## Lesson 4: Commit

Commitは意味のある変更単位として作ります。

例:

```text
test: add cart out-of-stock E2E
```

次を避けます。

```text
fix
update
work
```

Commit Messageから変更目的がある程度分かる状態を目指します。

## Lesson 5: Branch

既存の`main`へ直接変更を積み重ねるのではなく、作業Branchへ分けます。

```bash
git switch -c training/cart-e2e
```

Branchにより、現在安定している状態と作業中の変更を分けて扱えます。

Git演習でも、最初の変更・Commitを `main` 上で行ってからBranchを作る順序にはしません。Part 1からの移行時点で作業Branchを用意し、そのBranch上で変更・Stage・Commitを行います。

## Lesson 6: Diffを読む

Commit前に必ずDiffを確認します。

確認観点:

- 意図したFileだけか。
- Debug Codeが残っていないか。
- Testを弱くしていないか。
- Secretや個人情報が入っていないか。
- 大量の無関係なFormat変更が入っていないか。

Test Automationでは、LocatorやAssertionを誤って削除していないかも重要です。

## Lesson 7: History

代表的な確認方法:

```bash
git log --oneline
```

Historyから、「いつこのテストが追加されたか」「どの変更で挙動が変わったか」を追えることを理解します。

Part 1をZIPで進めていた受講者にとっては、ここで初めて「自分が受け取ったSnapshot」と「Repositoryが持つ変更履歴」の違いを具体的に確認します。

## Lesson 8: Conflictの考え方

複数の変更が同じ箇所へ入るとConflictが起きることがあります。

ConflictはGitの不具合ではなく、「どちらの変更を採用するか人間の判断が必要」という状態です。

自動テストFileは複数人が触る可能性があり、巨大な1ファイルへ集約しすぎるとConflictが増えやすいことも考えます。

## ハンズオン1: Part 1成果物をGit管理下で確認する

Part 1から引き継いだTraining Testまたは学習成果物を1つ選びます。

次を確認します。

- どのFileを自分が追加・変更したか。
- `main` の状態との差分は何か。
- Git Historyに含まれている既存Fileと、自分が追加した成果物を区別できるか。
- `.git`や既存Regressionなど、引継ぎ対象外のFileを上書きしていないか。

ZIPから移行した場合は、成果物を引き継いだ直後のDiffを確認します。

この時点ではまだCommitしません。まず「現在どんな変更を持っているか」を把握します。

## ハンズオン2: 作業Branchとmainの境界を確認する

Part 1成果物の移行時に作成した作業Branchを確認します。

```bash
git branch --show-current
```

次を確認します。

- 現在のBranchが `main` ではない。
- Part 1から引き継いだWorking Treeの変更が作業Branch上にある。
- `main` を安定した基準として残したまま演習を続けられる。
- `main` と現在のWorking Tree / Branchの差分を説明できる。

Branchを作ること自体が目的ではなく、**変更とCommitをどの作業単位へ所属させるかを先に決める**ことを学びます。

## ハンズオン3: Playwright Test変更をCommitする

作業Branch上で、Part 1で作成したTestへ小さな改善を加えます。

例:

- Test title改善
- Locator改善
- Assertion追加

その後、次の順で確認・Commitします。

```text
status
↓
diff
↓
add
↓
diff --staged
↓
commit
```

最初の演習Commitを `main` へ直接作らないことも確認します。

## ハンズオン4: 意図しない変更を除外する

演習用に別Fileへ無関係な変更を作ります。

`git status` と `git diff` で変更を確認した後、今回のCommitへ必要なFileだけをStageします。

目的は「すべての変更を一括でCommitする」のではなく、意味のある変更単位を選べるようになることです。

## ハンズオン5: mainとの差分とHistoryを確認する

作業BranchでCommitした後、次を確認します。

- `main` と作業Branchの差分
- 作成したCommit
- Part 1成果物と今回の改善の関係

自分の変更がどのBranch・Commitに属しているか説明します。

## 確認問題

1. Fileを保存した状態とCommitした状態の違いは何か。
2. Staging Areaがあることで何ができるか。
3. Branchを使う理由は何か。
4. 最初の変更・Commitより前に作業Branchを作る理由は何か。
5. Commit前にDiffを見る理由は何か。
6. Test Fileを巨大化するとGit運用上どんな問題が増えやすいか。
7. Part 1をZIPで進めた場合、Part 2開始時にGit Historyを持つCopyへ移行する理由は何か。
8. Part 1のFolderへ単純に `git init` するだけでは教材元のHistoryを学べないのはなぜか。
9. Part 1 Folderを丸ごとGit管理済みCopyへ上書きしてはいけないのはなぜか。

## 自己確認

次を自分のBranchとDiffを指しながら確認できれば、Common completionの判断材料になります。

- Working Tree、Staging、Commitの差を説明できる。
- Part 1成果物、教材元のHistory、自分の変更をDiffで区別できる。
- 最初の演習変更・Commitを`main`へ作らず、先に作業Branchを選んだ理由を説明できる。
- 意図したFileだけをStageし、Staged Diffと意味のあるCommit Messageを確認できる。
- Training CopyのSource SHA / allowlist / copy mechanicsはSupport / Referenceであり、準備済みCopyを使うCommon completionの隠れた前提ではないと説明できる。

### Recovery

BranchやDiffが分からない場合は、作業を止め、`git status` → `git branch --show-current` → `git diff` → `git diff --staged`の順に状態を確認します。準備済みCopyやPart 1成果物が手元にない場合はEnvironment / provisioning blockとしてInstructor supportへ戻り、Gitの理解不足と決めつけません。

## 完了条件

- 準備済みのGit管理された `qa-training-store` Copy上で、Part 1成果物と自分の変更を区別できる。
- 教材元のGit Historyと自分の変更を区別できる。
- Part 1成果物を扱う前に作業Branchを作成し、`.git`や既存Regressionを無差別に上書きしない境界を説明できる。
- `main` へ直接演習Commitを作らず、作業Branchで変更を管理できる。
- 変更内容を`git diff`で確認できる。
- 意図したFileだけをStageできる。
- Staged Diffを確認してから意味のあるCommit MessageでCommitできる。
- `main`との差分と、自分のCommitが持つ変更内容を説明できる。

## 次の行動

Branch・Diff・Commitの変更単位をGitHub上の共有へ接続するため、[P2-3: GitHub・Pull Request・Review](03_github-pull-request-review.md)へ進みます。
