# Part 2-4: CIとGitHub Actions

## 学習目標

- CIの目的を説明できる。
- GitHub Actions Workflowの基本構造を読める。
- Trigger、Job、Step、Runnerの関係を理解できる。
- Localで実行していたTest CommandをCIへ載せられる。
- PR、main、schedule、manual実行の違いを理解できる。
- Training CIと教材元のProduction Workflowを安全に分離できる理由を説明できる。
- CI Failureを「Workflowが悪い」「Testが悪い」「Environmentが悪い」に切り分ける観点を持てる。

## 教材

**このモジュールでは、このリポジトリの `.github/workflows/ci.yml` と `package.json` を使用します。**

ただし、現在の `.github/workflows/ci.yml` はCloudflare Preview / Productionなど実運用向け経路を含む完成済みWorkflowです。

受講者が最初からこれを直接編集・複製して実行することは前提にしません。

## 演習Workflowの境界

Git / GitHubの基本演習ではForkも利用できますが、**GitHub ActionsのCIハンズオンでは、Production Workflowとの競合を避けるため、講師または組織が用意した演習用Copyを標準経路**とします。

演習用Copyは、教材元のScenario Shopと同じコードベースを使用しながら、CI演習開始時に次の条件を満たすものとします。

- Training用Workflowを実行できる。
- 教材元から継承したProduction / Deploy Workflowが同時起動しない。
- 本番向けCloudflare Deployを実行しない。
- `CLOUDFLARE_API_TOKEN` など本番Secretを要求しない。
- 最初はUnit Test / Quality Checkだけを対象にする。
- 後続LessonでPlaywrightを追加できる。
- 本体RepositoryのRequired CheckやProduction Workflowへ影響しない。

### Forkを使ってCI演習する場合

個人Forkを利用する構成も可能ですが、Training Workflowを追加するだけでは安全な演習境界になりません。

教材元には `pull_request` で起動する既存Workflowが含まれており、Cloudflare Previewなど本番向けSecretを必要とする経路もあります。そのため、ForkでActionsを利用する場合は、教材提供時の開始手順で少なくとも次を確認します。

```text
Fork作成
↓
ForkでGitHub Actionsを利用可能にする
↓
教材元から継承したProduction / Deploy Workflowを演習中は無効化する
↓
Training Workflowだけが意図したTriggerで起動することを確認する
↓
Training CI演習開始
```

ここでいう「無効化」は、教材実装時に採用した方法に従います。受講者へ本番Secretを配布して既存Workflowを無理に成功させる方法は採用しません。

演習用CopyでもForkでも、**PRを作成したときにTraining Workflow以外の本番向けWorkflowが意図せず起動しないこと**を開始Gateとします。

この文書整備ではTraining用Workflowや演習Repository自体は追加しません。

現在の `ci.yml` は、最小構成を理解した後に「実案件ではどこまで発展するか」を読む比較教材とします。

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

Training用の最小例として次を読みます。

```yaml
name: Training CI

on:
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
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
- Permissions
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

また、Repository内に複数Workflowがある場合、同じ`pull_request`で複数Workflowが起動し得ることも理解します。Training Workflowだけを設計しても、既存WorkflowのTriggerを確認しなければ演習環境全体は制御できません。

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

## Lesson 6: SecretとPermissionの境界

GitHub Actionsでは、Workflowがどの権限・Secretを必要とするかを意識します。

Training用Workflowでは本番Deploy Secretを必要としない構成から始めます。

学習者は次を区別します。

- Test実行に必要な通常の環境変数
- Repository権限
- Secret
- Deploy Credential

「動かすために本番Secretを配る」という設計を避けます。

既存WorkflowがSecretを要求する場合は、Training CIへSecretを追加して成功させるのではなく、演習環境からProduction Workflowを分離します。

## Lesson 7: Jobを分ける理由

現在のScenario Shop CIでは、Style、Code Quality、Vitest、Build、E2Eなどが複数Jobへ分かれています。

Job分割には次の利点があります。

- 独立処理を並列化できる。
- Failure原因が分かりやすい。
- 再実行範囲を分けられる。

一方でJobを増やしすぎると、Runner起動やDependency Installの重複Costが増えます。

「分割すればするほど速い」わけではありません。

## Lesson 8: Matrix

複数Suiteや環境を同じJob定義で実行するときMatrixを使えます。

Scenario ShopではVitest SuiteやPlaywright検証でMatrixを利用しています。

Matrixは重複YAMLを減らせますが、何でもMatrixへ入れるのではなく、同じ責務を異なる条件で実行するときに利用します。

## Lesson 9: CI Failure分析

Failure時は最低限次を確認します。

1. どのWorkflowが起動したか。
2. Training Workflowか、意図しない既存Workflowか。
3. Setupで落ちたか。
4. Buildで落ちたか。
5. Testで落ちたか。
6. Environment / Secret不足か。
7. Permission問題か。
8. Artifactは残っているか。

「Re-run jobs」を最初の操作にせず、WorkflowとFailure Pointを確認します。

Training CIが成功していても別の既存WorkflowがFailureしている場合は、Test Codeを修正する前に演習境界が正しいかを確認します。

## ハンズオン0: CI演習環境を確認する

Training Workflowを書く前に、演習Repositoryで次を確認します。

- GitHub Actionsを利用できる。
- 教材元から継承したProduction / Deploy Workflowが演習PRで起動しない。
- Training Workflow用に本番Secretを追加する必要がない。
- Training Branch / PRの変更が本体Repositoryへ影響しない。

Forkを利用する場合は、教材で指定された方法で既存Production Workflowを無効化したことも確認します。

このGateを満たしていない状態ではCIハンズオンへ進みません。

## ハンズオン1: Unit TestをCIへ載せる

安全なTraining環境で `pnpm run test:unit` をPR時に実行します。

PRのChecksでは、意図したTraining Workflowだけが学習対象として動いていることも確認します。

## ハンズオン2: Quality Checkを追加する

次から2つ以上を追加します。

- Format
- Markdownlint
- ESLint
- Typecheck

## ハンズオン3: Trigger比較

同じTraining Workflowを `workflow_dispatch` でも起動できるようにし、PR実行との違いを確認します。

## ハンズオン4: 現在の`ci.yml`を読む

自分の最小Workflow完成後に、教材元の `.github/workflows/ci.yml` を読みます。

確認すること:

- なぜStyleとCode Qualityが分かれているか。
- なぜVitestがMatrixなのか。
- なぜBuild Jobが分かれているか。
- なぜ`verify`があるか。
- なぜPreview DeployにはSecretが必要か。
- なぜPR時にPreview経路が起動するのか。
- Training Workflowへ本番Deployを含めない理由は何か。
- ForkでこのWorkflowをそのまま起動すると、Training CIと競合し得るのはなぜか。

## 確認問題

1. CIを導入すると何が変わるか。
2. Local Pass / CI Failが起きる代表例を3つ挙げる。
3. Repositoryに複数Workflowがある場合、Training Workflowだけ見ていてはいけない理由は何か。
4. Jobを分けすぎるデメリットは何か。
5. Matrixが向く処理は何か。
6. `workflow_dispatch`はどんな用途に向くか。
7. Training CIで本番Secretを必要としない構成にする理由は何か。
8. Forkで既存Production Workflowを演習中に分離する必要があるのはなぜか。

## 完了条件

- GitHub Actionsの基本構造を説明できる。
- Training CI開始前に、既存Production / Deploy Workflowが同時起動しない演習境界を確認している。
- 演習用Copy、または安全に設定されたForkでScenario ShopのUnit TestまたはQuality CheckをCI実行できる。
- PR / Push / Manual / Scheduleの違いを説明できる。
- CI Failure時に、意図したWorkflowかどうかを含めて発生工程をLogから特定できる。
- Training Workflowと本体の実運用Workflowを分ける理由を説明できる。
