# Part 2-4: CIとGitHub Actions

## 学習目標

- CIの目的を説明できる。
- GitHub Actions Workflowの基本構造を読める。
- YAMLのインデントと、演習用Workflowに現れるGitHub Actionsの主要なKeyを対応付けられる。
- Trigger、Job、Step、Runnerの関係を理解できる。
- Localで実行していたTest CommandをCIへ載せられる。
- PR、main、schedule、manual実行の違いを理解できる。
- Training CIと教材元のProduction Workflowを安全に分離できる理由を説明できる。
- CI Failureを「Workflowが悪い」「Testが悪い」「Environmentが悪い」に切り分ける観点を持てる。

## 教材

**このモジュールでは、このリポジトリの `.github/workflows/ci.yml` と `package.json` を使用します。**

ただし、現在の `.github/workflows/ci.yml` はCloudflare Preview / Productionなど実運用向け経路を含む完成済みWorkflowです。

受講者が最初からこれを直接編集・複製して実行することは前提にしません。共通範囲では、準備済みのTraining Workflowを読み、実行対象の`.github/workflows/**`を編集しません。

## 共通課程の必須範囲

共通課程の修了では、Training環境のTrigger、Job / Step、Failure工程、least privilege（必要最小限のPermission）を説明できることを求めます。TrainingとProduction / Deployの責務を分け、失敗や想定外SkipをSuccessとして扱わない理由も説明します。

## 演習Workflowの境界（開始前に確認する条件）

Git / GitHubの基本演習ではForkも利用できますが、CIハンズオンはProduction Workflowと分離された、運営者が開始前に用意した準備済みTraining環境で行います。

演習開始時に、自己学習開始前に準備された学習者書き込み可能なTraining Copyで、意図したTraining Workflowだけが動き、本番SecretやDeployを要求せず、教材元Repositoryの必須Checkへ影響しないことを確認します。確認できない場合はCIの学習を始めず、環境の準備問題として提供手順へ戻ります。

Training Copyの準備、実行対象Workflowのallowlist、Action pin、現在の構成、Native実行環境などのRepository固有の詳細は、開始前に提供された準備情報と、このRepositoryの実資材で確認します。受講者はこれらの値の暗記や準備作業を共通課程の修了条件にしません。

現在の `ci.yml` は、最小構成を理解した後に「実案件ではどこまで発展するか」を読む比較教材とします。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P2-3のPRと、P1／P2-3で作成したTest Case・Training code・実行記録。C12へ進むための、事前準備済みTraining CopyのURLと学習者書き込み権限 |
| Activity | Training WorkflowのYAML、Trigger、Job、Step、Runner、権限、Local commandとの対応を読み、PRからActionsを実行してRun／Job／Check／Artifactを確認する |
| Observation | どのEventでWorkflowが動いたか、各Stepの入力・出力、baselineとexercise、失敗段階、最小権限、Artifact、想定外Skipの扱い |
| Output | Workflowの読み取りメモ、Local／CI command対応、Run／Job／Check／Artifactの人間可読Evidence、P2-5へ渡すCI実行参照。CIが自動生成したReceipt／`ci.md`は機械メタデータであり、GitHub画面を確認したEvidenceの代わりにしない。編集場所は自由で、self-checkは`handoff-root/self-check/P2-04.md`へ残す |
| Self-check | CIの価値、Trigger／Job／Step／Runner、TrainingとProductionの境界、`contents: read`で十分な理由、FailureとSkipをSuccessにしない理由を説明する |
| Completion | 準備済みTraining CopyでTraining Workflowを実行し、GitHub画面でRun／Check／Artifactと結果を確認して、対象Caseごとの人間可読Evidenceへ記録しP2-5へ渡せる。Fork上のCI実行はC12の正式証跡にしない。管理者権限、Secrets、Workflow権限変更は不要 |
| Recovery | Workflowが動かない場合はCopyの権限、Actions有効化、Trigger、Runner、Browser／Buildの順で環境問題を切り分ける。YAMLの理解不足は該当Lessonへ戻り、Production Workflowを直接変更しない |
| Handoff | P2-5へTraining Copy URL、PR／Branch、Run ID、Job／Check、Artifact名、実行したCase／code Path、Evidenceを渡す |

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

Training用の最小例は [`training-ci.yml`](../../../../training/github-actions/training-ci.yml) と [`training-native-ci.yml`](../../../../training/github-actions/training-native-ci.yml) を参考資料として読みます。Actionのfull commit SHA、exact allowlist、現在のWorkflow構成は現在の資材と開始前の準備情報で確認し、日本語の暗記やRepositoryの準備作業を修了条件にはしません。

概念としては、Event → least-privilege Permission → Job / Runner → Dependency Setup → Test Command → Artifact / Resultの関係を読み分けます。remote ActionのpinやVersionを更新する場合は、official sourceとSecurity Advisoryを確認します。

ここから次を読み分けます。

- Workflow
- Event
- Permissions
- Job
- Runner
- Step
- Action
- Command

YAMLの`key: value`、リスト、インデントによる入れ子を確認したうえで、準備済みのTraining Workflowを次の対応で読みます。

| WorkflowのKey | 読み取る内容 |
| --- | --- |
| `on` | どのEventでWorkflowを起動するか |
| `jobs` | どの単位の処理を実行するか |
| `runs-on` | Jobを動かすRunner |
| `steps` | Job内の処理順序 |
| `uses` | 再利用するAction |
| `with` | Actionへ渡す設定 |
| `run` | Runner上で実行するCommand |
| `env` | Workflow / Job / Stepへ渡すEnvironment Variable |
| `if` | StepやJobを実行する条件 |

`${{ ... }}`はYAMLの値そのものではなく、GitHub ActionsのExpressionです。`github`はEventやRepository、`env`はEnvironment Variable、`inputs`は`workflow_dispatch`の入力値を参照するContextです。すべてのExpressionを暗記せず、実際のWorkflowで読める範囲を扱います。

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

P2-01〜P2-03でForkを利用していた場合は、ここへ進む前に自己学習開始前から用意されているTraining Copyへ切り替えます。Fork上でProduction Workflowを無効化する操作を受講者へ要求せず、Training CopyでTraining Workflowだけが動くことを確認します。Training Copyまたは必要な権限がない場合は、CIの実行を始めずPart 2をBLOCKEDとして記録します。

このGateを満たしていない状態ではCIハンズオンへ進みません。共通範囲では、Workflowを新規作成・編集するのではなく、準備済みのWorkflowを読むことから始めます。

Runが完了したら、CIが生成した`ci.md`をそのまま確認Evidenceにはしません。GitHubのRun画面、Check、Artifactを自分で開いて確認し、Caseごとに次のような人間可読Fileを`handoff-root/evidence/`へ残します。`Result`は画面で確認した実際の結論に合わせます。

```text
Run ID: <Run ID>
Run attempt: <Attempt>
Check: <Workflow> / <Job>
Artifact: <Artifact name or URL>
Result: success
Case: <Test Case ID>
```

## ハンズオン1: 準備済みTraining Workflowを読む

リポジトリ管理の[`training-ci.yml`](../../../../training/github-actions/training-ci.yml)を開き、`on`、`permissions`、`jobs`、`runs-on`、`steps`、`uses`、`with`、`run`、`env`、`if`を1つずつ指し示します。基準確認のStepと失敗確認のStepが、どの条件で実行されるかを書きます。

## ハンズオン2: Local CommandとCI Stepを対応付ける

Training Workflowに書かれた`pnpm run validate:curriculum`、`pnpm run build:web`、`pnpm run training:web:baseline`などを、Part 1で使ったLocal Commandと対応付けます。共通範囲ではWorkflowへ新しいCommandを追加せず、既存の許可されたStepを読んで説明します。

## ハンズオン3: TriggerとContextを比較する

準備済みWorkflowの`pull_request`と`workflow_dispatch`を比較し、PR時の`github.event_name`、手動実行時の`inputs.mode`が`if`へどう影響するかを記録します。`workflow_dispatch`をYAMLへ追加することは修了条件にしません。

## ハンズオン4: 現在の`ci.yml`を読む

準備済みのTraining Workflowを読んだ後に、教材元の `.github/workflows/ci.yml` を比較教材として読みます。

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

## 自己確認

次をWorkflowまたはFailure Logを指しながら確認できれば、このLessonのCoreを自己判定できます。

- Trigger、Job、Step、Runnerの関係を説明できる。
- TrainingとProduction / Deployの境界、`permissions: contents: read`などleast privilegeの意味を説明できる。
- FailureがSetup、Build、Test、Environment / Secret、Permissionのどの工程かをLogから切り分けられる。
- 失敗または想定外Skipを最終GateでSuccessにしない理由を説明できる。
- Action pin、allowlist、現在のWorkflow構成はRepository固有の準備情報・参考資料であり、共通課程の概念と区別できる。

### Recovery

Workflowが動かない場合は、最初に起動WorkflowとEvent、次にRunner / Dependency Setup、Build、Test、Artifact、Permissionの順でFailure Pointを確認します。本番SecretやDeployが必要になった場合はTrainingへ追加せず、演習境界の環境・準備上の問題として記録し、準備条件へ戻ります。

## 完了条件

- GitHub Actionsの基本構造、Trigger、Job、Failure工程、least privilegeを説明できる。
- 準備済みのTraining Workflowを読み、Trigger、Job、Step、Command、Contextの関係を説明できる。
- PR / Push / Manual / Scheduleの違いを説明できる。
- CI Failure時に、意図したWorkflowかどうかを含めて発生工程をLogから特定できる。
- Training Workflowと本体の実運用Workflowを分ける理由を説明できる。

## 次の行動

共通課程のCI構造とFailure切り分けをWeb Testの実行へ接続するため、[P2-5: PlaywrightをCIで実行する](05_playwright-ci.md)へ進みます。Action pinやTraining Copyの詳細確認は必要な場合だけ参考資料として行います。
