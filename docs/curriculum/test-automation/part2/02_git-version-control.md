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

## Part 1からの作業環境移行（Instructor support / Reference）

Part 1ではGitHubアカウントを必須にしていないため、配布ZIPなどGit Historyを持たないFolderで学習している場合があります。その場合、Part 2開始前にGit Historyを持つ `qa-training-store` の演習用Copyを用意します。**演習Repository / Training Copyのprovisioningやcopy mechanicsそのものはCommon completionではなく、Instructor / 運営が支援できる環境準備です。**

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

### 移行時の安全な手順

Training Copyでは、次の順序で移行します。

1. Git Historyを持つ `qa-training-store` の演習用Copyを取得する。
   - 教材の配布方法が`git clone`の場合は、教材で指定されたRepositoryをcloneする。
   - Remote / Forkの概念自体はPart 2-3で学ぶため、ここでは「教材元のHistoryを持つ作業Copyを取得する」ことを目的とする。
2. `main` とRepository Historyを確認し、移行前のWorking TreeがCleanであることを確認する。
3. Part 1成果物をコピーする**前に**、`main`を基準にPart 2用の作業Branchを作成する。
4. Part 1から、教材で引継ぎ対象として指定された**受講者自身のTraining Test、Maestro Flow、分析・設計結果などの学習成果物だけ**をコピーする。
5. `.git`、教材元の既存Regression、未指定のApplication Code、Config、Workflow、Package / LockfileなどをFolder単位で上書きしない。
6. 同名Fileがすでに存在する場合は、そのまま上書きせずDiffを確認し、教材の指示に従って必要な変更だけを手動で統合する。
7. `git status`、`git diff --stat`、必要に応じて`git diff`で、引き継いだ変更範囲が意図どおりであることを確認する。

例えば作業Branchは次のように作成できます。

```bash
git switch -c training/git-basics
```

Training Copyの準備は `pnpm run training:copy:prepare -- --source-sha <40桁SHA> --target <disposable-folder>` で行います。Source SHAを省略した曖昧なBranch先頭や、別Worktreeの未確認変更を教材正本へしません。準備後は `pnpm run training:copy:validate -- --root <disposable-folder>` でactive Workflow allowlistとSHA一致を検証します。

受講者は準備済みの演習環境を受け取った後、Common Coreへ進む前に次だけを確認できれば十分です。

- `git status` が実行できる。
- `main` Branchが存在する。
- Part 2用の作業Branch上にいる、または自分で作成できる。
- 自分の変更を`git diff`で確認できる。

Source SHA、active Workflow allowlist、Formal Workflowとの分離、copy手順の詳細はReferenceです。Part 1のZIP Folderで単純に `git init` し、教材元のHistoryがない状態を標準経路にはしません。

このモジュールではまずLocal Gitを学びます。GitHub上のFork、Remote、Push、Pull Requestは次のPart 2-3で扱います。

> **Reference boundary:** Source SHA、`training:copy:prepare`、active Workflow allowlist、既存Fileのcopy手順は、このRepositoryの安全なTraining Copyを理解するためのReferenceです。Common Coreで必須なのは、作業Branchを分け、Diffを読み、意図した変更だけを意味のあるCommitへまとめる判断です。特定のCopy運用を暗記してcompletionとしません。

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

## 自己確認とRecovery

1件の変更について、作業Branch、Working Tree、Staging、Commitの差分を示し、「なぜこの変更単位にしたか」を説明します。Part 1成果物の移行を行う場合は、`.git`や未指定Fileを上書きしない境界も確認します。Source SHAやallowlistのCurrent値は必要な場合だけReferenceへ戻ります。

Git状態が説明できない場合は、`git status` → `git diff` → `git diff --staged`の順に戻り、意図しないFileをStageから外します。移行方法の環境差はInstructor supportへ相談できますが、Branch / Diff / Commitの判断を置き換えません。次はPart 2-3でRemote、Pull Request、Reviewへ進みます。

## 完了条件

- Working Tree、Staging、Commitの違いを自分の変更で説明できる。
- `main`へ直接演習Commitを作らず、作業Branchで変更を管理できる。
- 変更内容を`git diff`で確認し、意図したFileだけをStageできる。
- Staged Diffを確認してから、意味のある変更単位としてCommitできる。
- `main`との差分と、自分のCommitが持つ変更内容を説明できる。
- Training CopyのSource SHA、allowlist、copy mechanicsを暗記・実施しなくてもCommon completionが成立する。
