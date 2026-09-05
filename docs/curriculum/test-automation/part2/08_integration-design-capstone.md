# Part 2-8: 導入設計演習

Part 2 / Final Commonのcompletionはbounded Web CIを中心とするCommon routeで成立します。Native CI、multi-platform、preview-prod deliveryは選択したNative specializationまたはCommon Level 2外の発展scopeとして扱います。

## 学習目標

Part 2で学んだ開発プロセス、Git、GitHub、CI、Playwright、Maestro、Quality Gate、CI/CDを使い、Scenario Shopへテスト自動化を導入する設計を自分で作成します。

この演習では提案資料の作成を目的にしません。

目的は、対象案件に対して「何を、いつ、どこで、どのように自動実行し、失敗時に何を確認するか」を技術設計として決められることです。

## Common Required boundary

Common routeの最終設計は、Web CIのTrigger、Quality Gate、Artifact、Failure reasoningをboundedに決めることで完了します。Native CI / Maestro、multi-platform、Preview / Production / Deploy後Smokeを含むfull deliveryは、選択したNative specializationまたはAdvanced / Referenceです。

## 教材

**この総合演習では、このリポジトリ `qa-training-store` だけを使用します。**

現在の `.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml` は比較教材として存在しますが、最初から正解として読みません。

また、3つのWorkflowは現在の役割が同じではありません。

- Web `ci.yml`: PR / main / schedule / manualを含むWeb CI/CD。
- Android `native-ci.yml`: PR / manualで動くNative CI。
- iOS `native-ios-ci.yml`: standaloneでは`workflow_dispatch`による手動実行のiOS Build-only baseline。Native変更時はtop-level `native-ci.yml`がこのreusable workflowを呼び、`native-ci / verify`がiOS成功をRequiredとする。

standaloneの手動入口、Native変更時のRequired Build-only経路、iOS Runtime / Simulator / Maestro非保証を区別します。

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
> WebはBuildして公開し、NativeはAndroidでBuild + Runtime E2E、iOSでBuild-onlyの保証を設計する必要がある。

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
- iOS `iphonesimulator` Build Artifact

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

## Phase 5: Native specializationのCIを設計する（選択時）

AndroidとiOSについて、現在のRepository Triggerを正解としてコピーせず、ゼロから次を決めます。

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
- iOSはPR Required、PR Optional、main、Nightly、Manualのどこへ置くか。
- AndroidとiOSで異なるTriggerを採用するなら、その理由は何か。

Part 2-6でAndroidのTraining Native Workflowを実際に動かした経験を使い、Build / Emulator / MaestroのCostを具体的に考えます。

Native specializationを選択しない場合は、このPhaseをskipしてPhase 6へ進みます。Nativeを選択した場合だけ、Android / iOSの設計成果物とCost判断を追加し、Common completionの必須条件へ戻しません。

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
| iOS Build | Xcode Build Log / Build Artifact |
| Deploy | Deploy Log / URL |
| Deploy後Smoke | Playwright Evidence |

「失敗したら担当者が頑張って調べる」ではなく、調査可能なEvidenceを設計へ含めます。

## Phase 7: Quality Gateを設計する（Common Web / Native選択時）

Mergeを止めるRequired条件を定義します。

次を考えます。

- Required Test
- Required Build
- Android Required範囲（Native選択時）
- iOS Required範囲（Native選択時）
- Preview Smoke
- Final Verify

Common routeではWebのRequired Test、Build / Artifact、Final Gateをboundedに定義します。Android / iOS、Preview Smoke、Productionに関するRequired範囲は、選択時またはAdvanced / Referenceとして別に判断します。

次のような弱体化は禁止とします。

- 不安定だから`continue-on-error`
- 遅いから重要なTestを削除
- FailするからAssertionを弱くする
- 原因不明のままRetry回数だけ増やす

必要ならTest自体を改善するか、Required配置を見直します。

Nativeについては「両PlatformをRequiredにすれば品質が高い」と短絡せず、Risk、実行時間、Runner Cost、Flakiness、代替Coverageから判断します。

## Phase 8: CI/CDを設計する（Advanced / Reference）

Webについて、Build後のDelivery / Deployまで設計します。Preview / Production / Deploy後SmokeはCommon completionの前提ではありません。

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

## Phase 9: Workflow Diagramを作成する（Common diagram / Advanced extension）

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

AndroidとiOSを同じ枝へ置く必要はありません。実行タイミングを分けた場合は、その差も図に表します。

## Phase 10: 現在のScenario Shop CIと比較する（Reference comparison）

自分の設計完成後、現在の次のFileを読みます。

- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`

次を比較します。

1. Trigger
2. Job構成
3. Required範囲
4. Test Suite配置
5. Browser Strategy
6. Artifact再利用
7. Native変更判定
8. Android Build / Runtime境界
9. iOS Build-only経路
10. iOSのstandalone Manual入口とNative変更時Required Build-only経路（Runtime PASSとは別）
11. Preview / Production
12. Failure Evidence

現在のiOS Workflowがstandaloneでは`workflow_dispatch`であり、Native変更時にはtop-level `native-ci`からRequired Build-only経路として呼び出されることを「差分」として扱います。自分の設計がiOSをPRやNightlyへ配置していた場合、どちらが妥当かを理由付きで評価します。

## Phase 11: 差分を評価する

「Repositoryの現在の構成が正解だから自分の設計を合わせる」のではありません。

差分ごとに次を評価します。

- 現在のRepository設計の方がよい理由
- 自分の設計の方が単純でよい可能性
- 現在の規模だから必要な複雑性
- 現在は過渡期・baselineであり、将来変更され得る構成
- 別案件なら不要になり得る構成
- 今後改善できる点

## 記録する成果物

次の成果物はRepository内へ保存・記録します。外部提出をCommon completionの必須条件にしません。

### Common Required

- Current State / Risk整理（Web CIの設計判断に必要な範囲）
- bounded Web CI設計
- Web Quality Gate定義
- Artifact / Failure Evidence設計
- fail-closedを含むFailure reasoning
- 必要最小限のbounded Web CI Diagram
- 最終設計判断と理由

### Practice / Reference

- PR / main / Nightly / Manual Test配置表

### Native specialization（選択時）

- Android CI設計
- iOS CI設計
- Native Failure Evidence設計

### Advanced / Reference

- Preview / Production / Deploy後Smokeを含むfull delivery設計
- 現在のScenario Shop CIとの差分比較

## 評価観点

### 開発プロセス理解

- Testを単独の作業としてではなく、変更管理へ接続しているか。

### Test配置

- すべてをPRで回す設計にしていないか。
- 重要なRegressionをGateから外していないか。
- AndroidとiOSの実行頻度を機械的に同一にしていないか。

### Cost（Common Web; Native選択時に拡張）

- Browser、Android、iOS RunnerのCostとFeedback時間を考えているか。

### Reliability

- Flaky Testを放置したままRequired化していないか。

### Evidence

- Failure時に原因調査できるArtifactがあるか。

### CI/CD（Advanced / Reference）

- TestしたArtifactとDeployするArtifactの関係を説明できるか。
- Deploy後のSmokeまで考えているか。

### 設計判断

- 「現在のRepositoryがそうなっているから」ではなく、理由を説明できるか。
- 現在のWorkflow Triggerと、自分が設計した理想状態を区別できるか。

## 自己確認

次を自分の最終設計、Job Graph、Gate条件、Failure Evidenceで確認できれば、Part 2 Commonの完了を自己判定できます。

- Common RequiredとしてWeb CIのTrigger、Required Gate、Artifact、Failure reasoningを一つの設計へ接続できる。
- Gateが止めるFailure、確認するArtifact、fail-closed条件を説明できる。
- Test配置をRisk、Feedback速度、Flakiness、Runner Cost、Actionabilityの理由付きで判断できる。
- Native specializationを選択しない場合にP2-6相当をskipし、Nativeを選択した場合だけ追加成果物を作ってCommonへrejoinできる。
- Preview / Production / Deploy後Smoke、vendor detail、multi-platformはAdvanced / Referenceとして分類し、Common Requiredの暗黙前提にしていない。

### Recovery

設計が広がりすぎた場合は、まずWeb Trigger、Gate、Artifact、Failure reasoningの4点へ戻します。Failureの調査先が決まらない場合は、Jobごとに最初に確認するLog / Artifactを1つ定義します。NativeやDeliveryを選択しない場合はskipを記録してCommon設計へ戻り、環境実行の問題はEnvironment blockとして分離します。

## Part 2完了条件

Part 2 / Final Common: C01〜C07 + C09〜C12 bounded Level 2。各CompetencyのMinimum Evidenceは [Competency Rubric](../02_competency-rubric.md) を参照します。C12 Commonはbounded Web CIのTrigger / Gate / Artifact / Failure Evidenceに限定します。

受講者がCommon routeで次を自力で設計・説明できればPart 2完了とします。

- 一般的な開発プロセスとテストの関係
- Git / GitHubによる変更管理
- Pull RequestとReview
- CI Trigger
- Playwright CI
- Test Suiteの実行タイミング
- Required Quality Gate
- Failure Evidence
- Build Artifact
- bounded Web CIのGate、Artifact、Failure調査経路

Native CI / Maestro、Android / iOSの異なる実行戦略、multi-platform、Preview / Production / Deploy後Smokeを含むfull deliveryは、Native specializationまたはCommon Level 2外の発展scopeです。これらをCommon completionのRequired条件にしません。

最終到達点は、GitHub ActionsのYAMLを暗記することではありません。

**案件のRisk、Test、Platform、実行Cost、Feedback速度を見て、自動テストを継続実行する仕組みを設計できること**を目標とします。

## 次の行動

Part 2 Commonの設計を完了したら、Competency RubricのCommon Evidenceと自分のFailure reasoningを最終確認します。Native specializationまたはAdvanced / Referenceを選択した場合は、追加成果物を別区分で確認し、Common Requiredへ混ぜません。
