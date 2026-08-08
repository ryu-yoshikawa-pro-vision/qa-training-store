# Part 2-5: PlaywrightをCIで実行する

## 学習目標

- Localで動くPlaywright TestをGitHub Actions上で実行できる。
- Browser Install、Application Build / Serve、Base URL、Environmentの関係を理解できる。
- HTML Report、Trace、Screenshot、VideoをCI Artifactとして残せる。
- Smoke、Required Regression、Extended RegressionなどのTest Suiteを実行タイミングに応じて分けられる。
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

また、Part 1で作成したTraining用Playwright TestをCIから明示的に実行できる入口が教材提供時に用意されていることを前提とします。現行 `playwright.config.ts` / `package.json` の正式Suiteへ演習specを混在させることは前提にしません。

現在の `.github/workflows/ci.yml` は、自分の最小Playwright CIを動かした後に比較教材として読みます。

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

そのためFailure EvidenceをArtifactとして残します。

Scenario ShopではFailure時のPlaywright出力をUploadしています。

候補:

- Trace
- Screenshot
- Video
- HTML Report
- Scenario Metadata
- Console Error

Artifactは「多ければ多いほどよい」ではなく、原因分析に必要なものを残します。

## Lesson 7: Smoke / Regression

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

Scenario Shopの現在のWorkflowでPRと非PRの差を確認します。

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

## Lesson 10: Production Artifact Smoke

Automation BuildとProduction Buildは同じとは限りません。

Scenario ShopではProduction ArtifactをLocal配信してSmoke Testします。

Test APIなどAutomation専用機能がProductionへ混入していないことも重要な品質条件です。

Training Workflowでは本番Deployや本番Secretを扱わず、Production Artifact Smokeの設計思想を既存CIから学びます。

## ハンズオン1: Chromium E2EをTraining CIへ追加する

Training Workflowに次を追加します。

1. Build
2. Chromium Install
3. Training用Playwright E2E

## ハンズオン2: Failure Artifact

Training用Testを意図的にFailさせ、Trace / ScreenshotなどをArtifactとして取得します。

Artifactだけから原因を説明します。

## ハンズオン3: Test Suiteを分ける

Part 1で作成したTestを次へ仮分類します。

- PR Required
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

## 完了条件

- Training Workflow上でScenario ShopのPlaywright Testを実行できる。
- Failure時にEvidence Artifactを取得できる。
- PR / main / NightlyのTest配置案を作成している。
- Training CIと実運用CIの責務差を説明できる。
- 現在のScenario Shop Playwright CI構成の主要な設計理由を説明できる。
