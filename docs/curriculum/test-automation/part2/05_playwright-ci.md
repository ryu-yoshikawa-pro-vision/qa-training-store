# Part 2-5: PlaywrightをCIで実行する

## 学習目標

- Localで動くPlaywright Testが、準備済みTraining WorkflowからCI上でどのように実行されるか説明できる。
- Part 1で作成した受講者向けPlaywright Testが、準備済みTraining WorkflowのPull Requestから継続実行される流れを説明できる。
- Browser Install、Application Build / Serve、Base URL、Environmentの関係を理解できる。
- HTML Report、Trace、Screenshot、VideoがCI Artifactとして生成・保存されたことを確認し、Failure分析に利用できる。
- Smoke、必須Regression、拡張RegressionなどのTest Suiteを実行タイミングに応じて分けられる。
- Browser / Viewport Matrixと実行時間のTrade-offを理解できる。
- Scenario Shopの既存Playwright CI構成を読み、その設計理由を説明できる。

## 教材

**このモジュールでは、このリポジトリのPlaywright E2E、`playwright.config.ts`、`.github/workflows/ci.yml` を使用します。**

主な参照先:

- `playwright.config.ts`
- `e2e/web/`
- `scripts/serve-web-dist.ts`
- `.github/workflows/ci.yml`
- `package.json`

## 演習の前提

このモジュールはPart 2-4で用意した**Secret不要・DeployなしのTraining Workflow**を拡張して進めます。

受講者は本体Repositoryの `.github/workflows/ci.yml` を直接変更してPlaywright演習を行いません。

Part 1で作成したTraining用Playwright Testは `playwright.training.config.ts` と `training-ci.yml`から明示的に実行します。現行 `playwright.config.ts` / `package.json` のFormal Suiteへ演習specを混在させません。

準備済みTraining CopyのTraining Workflowには、`pull_request`で基準確認を行った後にReceipt付きの`training:web:exercise:with-receipt`を実行するStepがあらかじめ接続されています。受講者は実行用`.github/workflows/**`へStepを追加するのではなく、Part 1で作成した`training/playwright/exercises/`の変更をTraining CopyのPull Requestへ送り、同じTest、Execution Receipt、Failure ArtifactがCIで生成されることを確認します。`training:copy:validate`はWorkflowの配布元とactive allowlistを確認する生成時検証であり、受講者TestのCI成功とは別です。

現在の `.github/workflows/ci.yml` は、自分の最小Playwright CIを動かした後に比較教材として読みます。

現在のworkflow構成、PR / main / Nightlyの配置、Production Artifact Smokeは参考・発展比較の範囲です。P2-5の共通課程の修了は、準備済みTraining WorkflowのWeb Build、Playwright実行、Failure Artifactで成立します。

## 出力場所の役割

同じTest結果でも、保存場所によって役割が違います。

| 場所 | 役割 |
| --- | --- |
| Localの`handoff-root/` | Workbook、受講者Code、Evidence、Execution Receipt、self-checkを集約する学習成果物の正本。Local実行時は`--root <handoff-root>`を指定する |
| CI Runner上の`.` | GitHub Actionsが一時的にCheckoutしたRepository root。Training Workflowではこの一時DirectoryをReceipt出力rootとして`--root .`で使う。Run終了後もLocalの正本にはならない |
| GitHub Actions Artifact | CI Runの後から確認できるようにUploadされた保存物。Run／Checkと結び付いたCI側のEvidenceであり、Localの`handoff-root/`へ自動的に昇格しない |

Training Workflowの受講者Exercise Artifactは、ActionsのRun Summaryから次の名前で開きます。

| Artifact | 主な内容 | 学習者が確認する場所 |
| --- | --- | --- |
| `training-web-<run_id>-<run_attempt>` | `output/training/playwright`（HTML Report、Screenshot、Trace、Video）、`receipts`、`evidence` | PR → Checks → `Scenario Shop Training Web` → Run Summary → Artifacts |
| `web-dist-automation` | Production／既存CIのBuild再利用用Artifact。Training ExerciseのReceiptとは別物 | Production Workflowの該当Run。Commonの完了証跡へ読み替えない |

Artifact名の`<run_id>`と`<run_attempt>`は実際のRun画面の値へ置き換えます。Workflowの説明とArtifact境界は [`training/github-actions/README.md`](../../../../training/github-actions/README.md) と突き合わせます。

したがって、Localの正式入口では`--root <handoff-root>`、CIのStepでは`--root .`となります。値が違うのは環境が違うためで、Receiptの役割が違うわけではありません。受講者はCI Artifactを開いて結果を確認し、その確認内容を人間可読EvidenceとしてLocalの`handoff-root/evidence/`へ記録します。CI出力をコピーしただけの`ci.md`や、Artifactを見ていない記録をCompletionの根拠にはしません。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P2-4で確認したTraining CopyのPR／Runと、P1-5／P1-6のCase ID、Repository相対コード、Local Receipt／Evidence。Secret不要・Deployなし・`contents: read`のTraining Workflowを前提にする |
| Activity | Build、Serve、Browser Install、Playwright、Retry、Report／Trace／Screenshot／Videoのつながりを読み、準備済みTraining Workflowが受講者CodeをどのStepでCI実行するか確認する。WorkflowへStepを追加・編集しない |
| Observation | LocalとCIの差、実行したCase、Run／Check／Artifact、失敗Step、Retry、Execution Receiptのrun／case／attempt、Artifactへの人間可読参照 |
| Output | CI上のExecution Receipt、Run／Check／Artifactの参照、Failure Artifactの分析メモ、P2-7へ渡すCase／コード／Evidence対応。CI Receiptの機械メタデータとは別に、GitHub画面で確認したRun／Check／Artifact／結果／対象Caseを人間可読Evidenceへ記録する。Evidenceの必須項目はArtifact名で、URLは任意の別項目です。編集場所は自由で、ローカルの正本は固定`handoff-root/`に集約する |
| Self-check | CIで必要なBuild／Browser／Base URL／Testの関係、Localの`handoff-root`・CI Runnerの`.`・GitHub Artifactの役割、Artifactの用途、Retryと修正後再実行の違い、正式Training Copy経路を説明する |
| Completion | Training CopyのPRに紐付く準備済みWorkflowのRunを開き、受講者CaseのReceiptとFailure Artifact、Run／Check／Artifactを確認して、Caseごとの人間可読EvidenceとともにP2-7へ渡せる。CI自身が生成した`ci.md`だけではC12完了としない。Fork上のCI結果をC12の証跡へ読み替えない |
| Recovery | Build／Browser／Base URL／権限／Runnerの問題は環境として分ける。TestやWorkflowのFailureは最初の異常へ戻り、完成済みFormal CIやWorkflow権限変更で解決しない |
| Handoff | P2-7へTraining Copy URL、PR／Branch、Run／Job／Check、Artifact名、Case ID、code Path、Receipt／Evidence、Failure分類を渡す |

## Lesson 1: CIでPlaywrightを動かすために必要なもの

Playwright TestだけをRunnerへ置いても実行できません。

最低限次が必要です。

```text
Source Code
↓
Dependencies
↓
Browser
↓
Test対象Application
↓
Playwright Test
```

Scenario ShopではWeb Buildを作り、それを配信してPlaywrightからアクセスできます。

## Lesson 2: Browser Install

CI Runnerでは必要なBrowserが事前に存在するとは限りません。

例:

```bash
pnpm exec playwright install --with-deps chromium
```

Browser BinaryだけでなくOS Dependencyが必要な点も理解します。

## Lesson 3: BuildしてからTestする

Scenario ShopのPlaywright Configは、Localでは必要に応じてWeb BuildとServer起動を行います。

一方、現在のCIではAutomation Buildを専用Jobで一度作り、ArtifactとしてE2E Jobへ渡します。

まずTraining Workflowで単純構成を考えます。

```text
E2E Job
├ Install
├ Build
├ Browser Install
└ Playwright
```

その後、現在のRepositoryの構成と比較します。

```text
Build Job
↓
web-dist-automation Artifact
↓
E2E Job
```

## Lesson 4: Build Artifact再利用

同じ`dist/`を複数E2E Jobで毎回Buildすると、時間とResourceが重複します。

Scenario Shopでは `PLAYWRIGHT_USE_PREBUILT_DIST=true` を利用し、Download済みArtifactを配信します。

この設計の利点:

- Build回数を減らす。
- 同じArtifactへ複数Testを実行できる。
- Build結果とTest対象を一致させやすい。

Trade-off:

- Job間Artifactの管理が増える。
- Build Jobへの依存が増える。

## Lesson 5: CI向けRetry

`playwright.config.ts` ではCI時だけRetryを設定しています。

Retryが存在する理由を考える一方で、Flakyを放置する免罪符にしないことを再確認します。

次を区別します。

- 一時的なRunner / Browser揺らぎ
- Test自体の同期不足
- ProductのRace Condition

## Lesson 6: Failure Artifact

CIではLocalのようにその場でBrowserを見ることができません。

そのため失敗時の記録をArtifactとして残します。

Scenario ShopではFailure時のPlaywright出力をUploadしています。

候補:

- Trace
- Screenshot
- Video
- HTML Report
- Scenario Metadata
- Console Error

Artifactは「多ければ多いほどよい」ではなく、原因分析に必要なものを残します。

## Lesson 7: Smoke / Regression（参考: suiteの配置）

全部のPlaywright Testを同じ頻度で実行する必要はありません。

例:

### PR

- Critical Chromium E2E
- Accessibility
- Mobile Boundary

### main / Nightly候補

- Firefox
- WebKit
- Extended Mobile

Scenario Shopの現在のworkflowでPRと非PRの差を確認します。Test Suiteの配置設計はP2-7で扱うため、このLessonでは参考比較として確認します。

## Lesson 8: Browser Strategy

Cross-browser品質を考えるとChromium、Firefox、WebKitを確認したくなります。

しかし全Browserで全E2EをPRごとに回すとCostが増えます。

次を考えます。

- Browser固有Risk
- Application利用者のBrowser比率
- Critical Flow
- PR Feedback時間
- Nightlyで補完できるか

## Lesson 9: UI Review

Scenario ShopではDesktop、Tablet、Mobile、Small MobileのScreenshotをCI Artifactとして収集します。

これは通常のFunctional Assertionとは異なる目的です。

- Layout確認
- Responsive差分
- 人間によるVisual Review

Visual確認をFunctional E2Eへ無理に混ぜない設計を理解します。

## Lesson 10: Production Artifact Smoke（発展課題・参考資料）

Automation BuildとProduction Buildは同じとは限りません。

Scenario ShopではProduction ArtifactをLocal配信してSmoke Testします。

Test APIなどAutomation専用機能がProductionへ混入していないことも重要な品質条件です。

Training Workflowでは本番Deployや本番Secretを扱わず、Production Artifact Smokeの設計思想を既存CIから学びます。

## ハンズオン1: 受講者TestをTraining CIへ接続する

準備済みのTraining Workflowで、次の順序を確認します。

1. Build
2. Chromium Install
3. `training:web:baseline`による基準確認
4. `pnpm run training:web:exercise:with-receipt -- --suite exercise --project training-chromium --root . --run-context ci-exercise`による受講者向けPlaywright E2EとExecution Receipt生成。ここでの`.`はCI Runner上の一時的なRepository rootです

ローカルで次の正式入口を成功させた自分の変更を、準備済みTraining CopyのPull Requestへ送ります。

```text
pnpm run training:web:exercise:with-receipt -- --suite exercise --project training-chromium --root <handoff-root> --run-context local-exercise
```

`<handoff-root>`にはP1-6で受講者Codeを集約した固定rootを指定します。Pull Requestでは基準確認後に同じReceipt付きExerciseが1回だけ実行され、Execution Receipt、成功またはFailureのArtifactをP2-8のCI設計の根拠へ再利用します。既存の`training:web:exercise`は互換性確認用の直接入口です。

このLocal入口で受講者specが`../support/reset-scenario`などをimportする場合、Canonical HelperはTraining CopyまたはRunnerが提供するものを利用します。`reset-scenario.ts`を`<handoff-root>/code/`へコピーしません。P1-5で追加した受講者Helperも同じ`code/training/playwright/`配下へ集約します。別の一時Directoryへ暗黙に依存したり、CI Runner上の`.`をLocalの正本として扱ったりしません。

Run完了後は、CIが自動生成した`ci.md`を人間確認の証拠にしません。GitHubのRun／Check／Artifactを自分で確認し、対象Caseごとに`handoff-root/evidence/`へ次の項目を含む記録を作成します。`Result`は実際に確認した結論を記録し、機械ReceiptのRun ID・Artifact名を単に転記しただけのFileにはしません。

```text
Run ID: <Run ID>
Run attempt: <Attempt>
Check: <Workflow> / <Job>
Artifact: <Artifact name>
Artifact URL: <optional>
Result: success
Case: <Test Case ID>
```

## ハンズオン2: GitHub ActionsのExpected Failure Artifact

P2-5の正式なFailure Artifact学習は、ローカルcommandだけで完了させず、準備済みTraining CopyのGitHub Actions Runで行います。受講者自身が次の順序を実施します。

```text
GitHub
↓
Actions
↓
Scenario Shop Training Web
↓
Run workflow
↓
mode = expected-failure
↓
Run
↓
Failureを確認
↓
Run Summary
↓
Artifacts
↓
training-web-<run_id>-<run_attempt>
↓
Trace / Screenshot / Video / HTML Report
↓
原因を説明
```

Expected Failureは通常baselineへ含めません。Run Summaryで最初のFailureを確認し、Artifactを開いてTrace、Screenshot、Video、HTML Reportから原因を説明します。確認したRun ID、Attempt、Check、Artifact名、Result、対象Caseを人間可読Evidenceへ記録してください。

`training:web:check-expected-failure`はCI前の確認や、手元でEvidence構造を確認する補助入口として残します。ただし、GitHub ActionsのRun／Check／Artifactを確認した正式な学習成果には読み替えません。

## ハンズオン3: Test Suiteを分ける

Part 1で作成したTestを次へ仮分類します。

- PRで必須
- main
- Nightly
- Manual

各分類の理由を記録します。

## ハンズオン4: 既存CI比較

現在の `.github/workflows/ci.yml` を読み、自分のTraining構成と比較します。

最低限次を説明します。

- Buildを別Jobにしている理由
- Artifact再利用の理由
- Chromium E2EをMatrix化している理由
- Extended E2EをPRでSkipする理由
- UI Reviewを独立させている理由
- Preview / ProductionをTraining CIへそのまま含めない理由

## 確認問題

1. CIでPlaywrightを実行するためにBrowser以外に何が必要か。
2. Build Artifactを再利用する利点は何か。
3. 全Browser全TestをPRごとに回さない判断があり得るのはなぜか。
4. Failure Artifactが必要な理由は何か。
5. Automation BuildとProduction Buildを分ける価値は何か。
6. Training Playwright CIを本体のDeploy Workflowから分ける理由は何か。

## 自己確認

次をTraining Workflowの実行結果またはArtifactを指しながら確認できれば、P2-5の共通課程の到達度を自己判定できます。

- Browser Install、Application Build / Serve、Base URL、Playwright Testの関係を説明できる。
- BuildしたArtifactを再利用する理由と、Failure工程に応じて必要なTrace / Screenshot / Reportを選べる。
- Training Web CIとProduction Deploy / Smokeの責務を分け、Production SecretをTrainingへ持ち込まない理由を説明できる。
- `pull_request`の基準確認後に`training:web:exercise`が実行されることと、生成時の`training:copy:validate`を受講者TestのCI成功と区別できる。
- Expected Failureを通常のbaseline PASSへ混ぜず、失敗時の記録から原因の範囲を説明できる。
- PR / main / Nightlyの配置や現在のCI構成はP2-7または参考比較であり、P2-5の共通課程の修了の隠れた前提ではない。

### Recovery

CIで失敗した場合は、Browser / Dependency Setup、Application Build / Serve、Base URL、Playwright Assertion、Artifact Uploadの順にFailure stageを確認します。Artifactが残らない場合はまずWorkflow設定と環境上の問題を切り分け、Testの理解不足と決めつけません。Production環境やSecretが必要になった場合はTraining Workflowへ追加せず、発展課題の条件として切り分けます。

## 完了条件

- Training Workflow上でScenario ShopのPlaywright Testを実行できる。
- Failure時に記録用Artifactを取得できる。
- Build / Browser / Serve / Base URLとPlaywright Testの関係を説明できる。
- Training CIと実運用CIの責務差を説明でき、Production SecretやDeployへ依存しない境界を守れる。
- Failure stageと記録用Artifactの対応を1件説明できる。

## 次の行動

Training Web CIの実行結果をQuality Gate、Artifact、Fail-closedの設計へ接続するため、[P2-7: Quality GateとCI/CD](07_ci-cd-quality-gates.md)へ進みます。
