# Part 2-8: 導入設計演習

## 学習目標

Part 2で学んだ開発プロセス、Git、GitHub、CI、Playwright、Maestro、Quality Gate、CI/CDを使い、Scenario Shopへテスト自動化を導入する設計を自分で作成します。

この演習では提案資料の作成を目的にしません。

目的は、対象案件に対して「何を、いつ、どこで、どのように自動実行し、失敗時に何を確認するか」を技術設計として決められることです。

## 教材

**この総合演習では、このリポジトリ `qa-training-store` だけを使用します。**

現在の `.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml` は完成例として存在しますが、最初から正解として読みません。

まず「CIがまだ存在しないScenario Shop」という前提で自分の設計を作り、その後で現在の実装と比較します。

## 演習シナリオ

次の状態を想定します。

> Scenario ShopではWebとNativeの機能開発が進んでいる。
>
> Unit / Integration / Component Test、Playwright、Maestroのテストはローカルで実行できる。
>
> 開発者はGitとPull Requestを使って変更を管理している。
>
> しかし、自動テストの実行は担当者が必要に応じて手動で行っており、Merge前に必ず実行される保証はない。
>
> WebはBuildして公開し、NativeはAndroid / iOSでBuild・実行する必要がある。

この状態からCI/CD設計を作成します。

## Phase 1: 現状把握

Repositoryを確認し、次を一覧化します。

### Test

- Unit
- Integration
- Repository Contract
- Component
- Contract
- Playwright Functional E2E
- Accessibility
- Mobile Boundary
- Cross-role
- UI Review
- Maestro

### Build

- Web Automation Build
- Web Production Build
- Android Build
- iOS Simulator Build

### Deploy

- Preview
- Production

### Evidence

- Playwright Trace
- Screenshot
- Video
- HTML Report
- JUnit
- Maestro Artifact
- Native Log

この段階では現在のWorkflow Job構成をコピーしません。

## Phase 2: Riskを整理する

最低限次を考えます。

- PR Merge前に絶対検出したいFailureは何か。
- mainへ統合された後に確認すればよいものは何か。
- Nightlyで十分なものは何か。
- 高コストなNative Testをどの頻度で回すか。
- Deploy Failureをどう検出するか。
- FlakyなTestをRequiredにしてよいか。

## Phase 3: Test Suiteを分類する

次の実行タイミングへTestを配置します。

### Pull Request

Merge前の短時間Feedbackとして必要なもの。

### main

統合後に必要なもの。

### Nightly

高コスト・広範囲のRegression。

### Manual

調査、Release前、特定条件など必要時に起動するもの。

各配置には理由が必要です。

## Phase 4: Web CIを設計する

最低限次を決めます。

- Trigger
- Quality Check
- Unit / Integration / Component
- Web Build
- Playwright
- Browser Strategy
- Artifact
- Final Gate

### 設計質問

- ChromiumだけをPR Requiredにするか。
- Firefox / WebKitはいつ回すか。
- AccessibilityはRequiredか。
- Mobile BoundaryはRequiredか。
- UI Review ScreenshotはRequiredか、Evidence収集か。
- Automation BuildとProduction Buildを分けるか。
- E2E Jobで毎回Buildするか、Artifactを再利用するか。

## Phase 5: Native CIを設計する

AndroidとiOSについて次を決めます。

- Build Trigger
- Native変更判定
- Static Check
- Build
- Emulator / Simulator
- Maestro
- Artifact
- Evidence
- Final Gate

### 設計質問

- Android BuildとRuntimeを同じJobにするか。
- APKをArtifact化するか。
- Maestro FlowごとにJobを分けるか。
- AndroidとiOSを同じRequired条件にするか。
- macOS Runner Costをどう考えるか。
- PRで両Platformを毎回実行するか。

## Phase 6: Failure時の調査経路を設計する

各Job Failureで、最初に確認するEvidenceを定義します。

例:

| Failure | 最初に確認するもの |
| --- | --- |
| Lint | GitHub Actions Log |
| Playwright Assertion | Trace / Screenshot |
| Browser起動 | Setup Log |
| Gradle Build | Gradle Log |
| APK Install | adb / Runtime Log |
| Maestro Assertion | JUnit / Screenshot |
| iOS Launch | simctl / Xcode Log |
| Deploy | Deploy Log / URL |
| Deploy後Smoke | Playwright Evidence |

「失敗したら担当者が頑張って調べる」ではなく、調査可能なEvidenceを設計へ含めます。

## Phase 7: Quality Gateを設計する

Mergeを止めるRequired条件を定義します。

次を考えます。

- Required Test
- Required Build
- Native Required範囲
- Preview Smoke
- Final Verify

次のような弱体化は禁止とします。

- 不安定だから`continue-on-error`
- 遅いから重要なTestを削除
- FailするからAssertionを弱くする
- 原因不明のままRetry回数だけ増やす

必要ならTest自体を改善するか、Required配置を見直します。

## Phase 8: CI/CDを設計する

Webについて、Build後のDelivery / Deployまで設計します。

候補:

```text
Pull Request
↓
CI
↓
Preview Deploy
↓
Preview Smoke
↓
Merge
↓
Production Deploy
↓
Production Smoke
```

次を決めます。

- PreviewをRequiredにするか。
- Productionへ何のArtifactをDeployするか。
- Deploy Failure時にどう扱うか。
- Production Smokeで何を確認するか。

## Phase 9: Workflow Diagramを作成する

最終設計をJob Graphとして図示します。

例の形だけを参考にし、内容は自分で決めます。

```text
PR
├ Quality
├ Tests
├ Build
└ Native
    ↓
Final Gate
    ↓
Preview
    ↓
Smoke
```

## Phase 10: 現在のScenario Shop CIと比較する

自分の設計完成後、現在の次のFileを読みます。

- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`

次を比較します。

1. Job構成
2. Required範囲
3. Test Suite配置
4. Browser Strategy
5. Artifact再利用
6. Native変更判定
7. Android Build / Runtime境界
8. iOS Simulator経路
9. Preview / Production
10. Failure Evidence

## Phase 11: 差分を評価する

「Repositoryの現在の構成が正解だから自分の設計を合わせる」のではありません。

差分ごとに次を評価します。

- 現在のRepository設計の方がよい理由
- 自分の設計の方が単純でよい可能性
- 現在の規模だから必要な複雑性
- 別案件なら不要になり得る構成
- 今後改善できる点

## 提出物

- Current State一覧
- Risk整理
- PR / main / Nightly / Manual Test配置表
- Web CI設計
- Android CI設計
- iOS CI設計
- Failure Evidence設計
- Quality Gate定義
- CI/CD Diagram
- 現在のScenario Shop CIとの差分比較
- 最終設計判断と理由

## 評価観点

### 開発プロセス理解

- Testを単独の作業としてではなく、変更管理へ接続しているか。

### Test配置

- すべてをPRで回す設計にしていないか。
- 重要なRegressionをGateから外していないか。

### Cost

- Browser、Android、iOS RunnerのCostとFeedback時間を考えているか。

### Reliability

- Flaky Testを放置したままRequired化していないか。

### Evidence

- Failure時に原因調査できるArtifactがあるか。

### CI/CD

- TestしたArtifactとDeployするArtifactの関係を説明できるか。
- Deploy後のSmokeまで考えているか。

### 設計判断

- 「現在のRepositoryがそうなっているから」ではなく、理由を説明できるか。

## Part 2完了条件

受講者が次を自力で設計・説明できればPart 2完了とします。

- 一般的な開発プロセスとテストの関係
- Git / GitHubによる変更管理
- Pull RequestとReview
- CI Trigger
- Playwright CI
- Maestro Native CI
- Test Suiteの実行タイミング
- Required Quality Gate
- Failure Evidence
- Build Artifact
- Preview / Production
- Deploy後Smoke
- Scenario Shopへ適したCI/CD全体構成

最終到達点は、GitHub ActionsのYAMLを暗記することではありません。

**案件のRisk、Test、Platform、実行Cost、Feedback速度を見て、自動テストを継続実行する仕組みを設計できること**を目標とします。
