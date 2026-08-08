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

別の練習用Repositoryは作りません。Part 1で作成したPlaywright Testや教材用の小さな変更をGitで管理します。

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

## Lesson 8: Conflictの考え方

複数の変更が同じ箇所へ入るとConflictが起きることがあります。

ConflictはGitの不具合ではなく、「どちらの変更を採用するか人間の判断が必要」という状態です。

自動テストFileは複数人が触る可能性があり、巨大な1ファイルへ集約しすぎるとConflictが増えやすいことも考えます。

## ハンズオン1: Playwright Test変更をCommitする

Part 1で作成したTestへ小さな改善を加えます。

例:

- Test title改善
- Locator改善
- Assertion追加

その後、`status` → `diff` → `add` → `commit` の順で管理します。

## ハンズオン2: Branchを分ける

新しいTest Case追加用Branchを作り、`main`との差分を確認します。

## ハンズオン3: 意図しない変更を除外する

演習用に別Fileへ無関係な変更を作り、Commit対象から外します。

## 確認問題

1. Fileを保存した状態とCommitした状態の違いは何か。
2. Staging Areaがあることで何ができるか。
3. Branchを使う理由は何か。
4. Commit前にDiffを見る理由は何か。
5. Test Fileを巨大化するとGit運用上どんな問題が増えやすいか。

## 完了条件

- Branchを作成できる。
- 変更内容を`git diff`で確認できる。
- 意図したFileだけをStageできる。
- 意味のあるCommit MessageでCommitできる。
- `main`との差分を説明できる。
