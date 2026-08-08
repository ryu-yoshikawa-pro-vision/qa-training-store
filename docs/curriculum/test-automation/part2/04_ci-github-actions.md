# Part 2-4: CIとGitHub Actions

## 学習目標

- CIの目的を説明できる。
- GitHub Actions Workflowの基本構造を読める。
- Trigger、Job、Step、Runnerの関係を理解できる。
- Localで実行していたTest CommandをCIへ載せられる。
- PR、main、schedule、manual実行の違いを理解できる。
- CI Failureを「Workflowが悪い」「Testが悪い」「Environmentが悪い」に切り分ける観点を持てる。

## 教材

**このモジュールでは、このリポジトリの `.github/workflows/ci.yml` と `package.json` を使用します。**

まず最小Workflowを自分で考えた後、現在の高度なWorkflowと比較します。

## Lesson 1: CIとは

Continuous Integrationでは、変更を統合する過程でBuildやTestなどを自動実行し、問題を早く検出します。

Part 1では、人間がローカルでコマンドを実行していました。

CIでは、その確認を変更イベントへ接続します。

```text
Push / Pull Request
↓
Runner起動
↓
Repository取得
↓
Dependency Install
↓
Test
↓
Result
```

## Lesson 2: GitHub Actionsの構造

最小例:

```yaml
name: Training CI

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.10.0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:unit
```

ここから次を読み分けます。

- Workflow
- Event
- Job
- Runner
- Step
- Action
- Command

## Lesson 3: Trigger

代表的なTrigger:

- `pull_request`
- `push`
- `schedule`
- `workflow_dispatch`

同じTestでも、実行コストや重要度に応じてTriggerを使い分けます。

この段階では「全部PRで回す」前提にしません。

## Lesson 4: LocalとCIの差

LocalでPassしてCIでFailする理由には次があります。

- OS差
- Node / pnpm Version差
- Browser未Install
- Environment Variable不足
- Secret不足
- File pathやCase sensitivity
- Timing / Performance差
- Localに残ったStateへ依存していた

CIは、Testをより再現可能な環境で実行する機会にもなります。

## Lesson 5: Dependency Install

Scenario ShopではNodeとpnpm Versionを固定し、Lockfileを使用します。

```bash
pnpm install --frozen-lockfile
```

CIで「手元では違うVersionが入っている」状態を減らします。

## Lesson 6: Jobを分ける理由

現在のScenario Shop CIでは、Style、Code Quality、Vitest、Build、E2Eなどが複数Jobへ分かれています。

Job分割には次の利点があります。

- 独立処理を並列化できる。
- Failure原因が分かりやすい。
- 再実行範囲を分けられる。

一方でJobを増やしすぎると、Runner起動やDependency Installの重複Costが増えます。

「分割すればするほど速い」わけではありません。

## Lesson 7: Matrix

複数Suiteや環境を同じJob定義で実行するときMatrixを使えます。

Scenario ShopではVitest SuiteやPlaywright検証でMatrixを利用しています。

Matrixは重複YAMLを減らせますが、何でもMatrixへ入れるのではなく、同じ責務を異なる条件で実行するときに利用します。

## Lesson 8: CI Failure分析

Failure時は最低限次を確認します。

1. Setupで落ちたか。
2. Buildで落ちたか。
3. Testで落ちたか。
4. Environment / Secret不足か。
5. Artifactは残っているか。

「Re-run jobs」を最初の操作にせず、LogからFailure Pointを確認します。

## ハンズオン1: Unit TestをCIへ載せる

演習用Workflowで `pnpm run test:unit` をPR時に実行します。

## ハンズオン2: Quality Checkを追加する

次から2つ以上を追加します。

- Format
- Markdownlint
- ESLint
- Typecheck

## ハンズオン3: Trigger比較

同じWorkflowを `workflow_dispatch` でも起動できるようにし、PR実行との違いを確認します。

## ハンズオン4: 現在の`ci.yml`を読む

自分の最小Workflow完成後に、現在の `.github/workflows/ci.yml` を読みます。

確認すること:

- なぜStyleとCode Qualityが分かれているか。
- なぜVitestがMatrixなのか。
- なぜBuild Jobが分かれているか。
- なぜ`verify`があるか。

## 確認問題

1. CIを導入すると何が変わるか。
2. Local Pass / CI Failが起きる代表例を3つ挙げる。
3. Jobを分けすぎるデメリットは何か。
4. Matrixが向く処理は何か。
5. `workflow_dispatch`はどんな用途に向くか。

## 完了条件

- GitHub Actionsの基本構造を説明できる。
- Scenario ShopでUnit TestまたはQuality CheckをCI実行できる。
- PR / Push / Manual / Scheduleの違いを説明できる。
- CI Failureの発生工程をLogから特定できる。
