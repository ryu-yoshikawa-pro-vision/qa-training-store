# Part 2-8: 導入設計演習

Part 2の最終共通課程は、対象範囲を限定したWeb CIを中心とする共通経路で修了できます。Native CI、multi-platform、preview-prod deliveryは、選択したモバイルアプリ自動化の選択課程または共通課程のレベル2の範囲外にある発展課題として扱います。

## 学習目標

Part 2で学んだ開発プロセス、Git、GitHub、CI、Playwright、Quality Gateを使い、Scenario Shopへ対象範囲を限定したWeb CIを導入する設計を自分で作成します。Maestro / Native CIとPreview / Production deliveryは、選択時または発展課題・参考資料として追加します。

この演習では提案資料の作成を目的にしません。

目的は、対象案件に対して「何を、いつ、どこで、どのように自動実行し、失敗時に何を確認するか」を技術設計として決められることです。

## 共通課程の必須範囲

共通経路の最終設計は、Web CIのTrigger、Quality Gate、Artifact、Failureの調査経路を対象範囲を限定して決めることで完了します。Native CI / Maestro、multi-platform、Preview / Production / Deploy後Smokeを含む一連のdeliveryは、選択したモバイルアプリ自動化の選択課程または発展課題・参考資料です。

## 教材

**この総合演習では、このリポジトリ `qa-training-store` だけを使用します。**

現在の `.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml` は比較教材として存在しますが、最初から正解として読みません。

また、3つのWorkflowは現在の役割が同じではありません。

- Web `ci.yml`: PR / main / schedule / manualを含むWeb CI/CD。
- Android `native-ci.yml`: PR / manualで動くNative CI。
- iOS `native-ios-ci.yml`: standaloneでは`workflow_dispatch`による手動実行のiOS Build-only baseline。Native変更時はtop-level `native-ci.yml`がこのreusable workflowを呼び、`native-ci / verify`がiOS成功を必須とする。

standaloneの手動入口、Native変更時の必須Build-only経路、iOS Runtime / Simulator / Maestro非保証を区別します。

まず「CIがまだ存在しないScenario Shop」という前提で自分の設計を作り、その後で現在の実装と比較します。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P2-1〜P2-7のプロセス図、Git／PR記録、Training Copy上のWeb CI Run／Check／Artifact、Part 1のCase／コード／Failure分析、必要ならNative選択課程の別記録 |
| Activity | Scenario Shopの対象範囲を決め、Trigger、Build、Playwright、Quality Gate、Artifact、Failure時の戻り先を設計した後、現在のWorkflow・仕様・Contract Testと比較する |
| Observation | どのRiskをどのLayer／Triggerで守るか、受講者CaseとCIの対応、最小権限、Artifactの追跡、Common／Native／CDの境界、設計と現行実装の差 |
| Output | `handoff-root/self-check/P2-08.md`へ対象範囲を限定したWeb CI導入設計、Test／Trigger／Gate／Artifact／Failure対応表、Run／Check／Artifact参照、最終self-checkを記録する。Mermaid等の図や補足Evidenceが必要なら既存`handoff-root/evidence/`へ置き、P2-08.mdから参照する。Part 1／2の成果物を固定`handoff-root/`へ集約する |
| Self-check | 「何を、いつ、どこで、どの条件で実行し、Failure時に何を見るか」をCase／Risk／Workflow／Evidenceを指して説明する。GitHub外部状態をAPIなしで証明したとは書かない |
| Completion | C01〜C07、C09〜C12の対象範囲を限定したCommon成果物を一つの対応関係へつなぎ、準備済みTraining CopyでのCI経路と人間可読Evidenceを示せる。C09はinitial Failure→同じ対象のrepaired Pass、C10は実在または決定的教材演習の改善→別run、C11はBranch／Commit／Diff／Pull Request／Review記録、C12はRun／Check／Artifact確認をそれぞれ満たす。Native／iOS Runtimeは必須にしない |
| Recovery | 対応が切れる最初の成果物へ戻る。Run／Check／Artifactを取得できない場合はTraining Copy／権限／外部環境の問題として分け、設計だけでPASSにしない |
| Handoff | `handoff-root/self-check/P2-08.md`を最終設計とSelf-checkの正本として渡し、固定rootのWorkbook、Repository相対code、Evidence、Execution Receipt、Lesson ID別self-checkと結び付ける。Part 2の正式修了はTraining Copy上のCI結果と併せて確認する |

## 演習シナリオ

次の状態を想定します。

> 共通シナリオ: Scenario ShopのWeb自動テストはローカルでは実行できるが、Merge前に継続実行される保証がない。
>
> Unit / Integration / Component / Playwrightの確認はローカルで実行でき、開発者はGitとPull Requestで変更を管理している。
>
> この共通シナリオでは、対象範囲を限定したWeb CIについて、何をいつ実行し、どのQuality GateとArtifactでFailureを調べるかを設計する。
>
> Nativeを選択する受講者は、別の選択課程としてAndroid / iOSの保証を追加検討できる。これはCommonの必須条件ではない。
>

この状態から、まず共通課程のWeb CI設計を作成します。

Phase 1〜4、Phase 6のWeb項目、Phase 7の共通Web項目がCommonの必須範囲です。Phase 5のNative項目、Phase 6のNative／Deploy項目、Phase 7のNative／Preview／Production項目は、見出しまたは表に`Native選択時`／`発展課題`と記載された追加範囲です。Commonだけで進む受講者は、追加範囲を設計せず「未選択」と記録して次へ進みます。

## Phase 1: 現状把握

Repositoryを確認し、次を一覧化します。

### Test（共通課程の設計対象はWeb範囲を選ぶ）

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
- Maestro（モバイルアプリ自動化の選択課程・参考資料）

### Build

- Web Automation Build
- Web Production Build
- Android Build（Native選択時）
- iOS `iphonesimulator` Build Artifact（Native選択時）

### Deploy（発展課題・参考資料）

- Preview
- Production

### 実行記録

- Playwright Trace
- Screenshot
- Video
- HTML Report
- JUnit
- Maestro Artifact（Native選択時）
- Native Log（Native選択時）

この段階では現在のWorkflow Job構成をコピーしません。

## Phase 2: Riskを整理する

共通Webでは最低限次を考えます。

- PR Merge前に絶対検出したいFailureは何か。
- mainへ統合された後に確認すればよいものは何か。
- Nightlyで十分なものは何か。
- FlakyなTestを必須にしてよいか。

Nativeを選択する場合だけ、高コストなNative Testをどの頻度で回すかを追加します。Deployを発展課題として扱う場合だけ、Deploy Failureをどう検出するかを追加します。これらをCommon Webの回答へ混ぜません。

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

- ChromiumだけをPRで必須にするか。
- Firefox / WebKitはいつ回すか。
- Accessibilityは必須か。
- Mobile Boundaryは必須か。
- UI Review Screenshotは必須か、実行記録の収集にとどめるか。
- Automation BuildとProduction Buildを分けるか。
- E2E Jobで毎回Buildするか、Artifactを再利用するか。

## Phase 5: モバイルアプリ自動化の選択課程のCIを設計する（選択時）

AndroidとiOSについて、現在のRepository Triggerを正解としてコピーせず、ゼロから次を決めます。

- Build Trigger
- Native変更判定
- Static Check
- Build
- Emulator / Simulator
- Maestro
- Artifact
- 実行記録
- Final Gate

### 設計質問

- Android BuildとRuntimeを同じJobにするか。
- APKをArtifact化するか。
- Maestro FlowごとにJobを分けるか。
- AndroidとiOSを同じ必須条件にするか。
- macOS Runner Costをどう考えるか。
- PRで両Platformを毎回実行するか。
- iOSはPRで必須、PRでは任意、main、Nightly、Manualのどこへ置くか。
- AndroidとiOSで異なるTriggerを採用するなら、その理由は何か。

Part 2-6でAndroidのTraining Native Workflowを実際に動かした経験を使い、Build / Emulator / MaestroのCostを具体的に考えます。

選択課程を選ばない場合は、このPhaseを飛ばしてPhase 6へ進みます。Nativeを選択した場合だけ、Android / iOSの設計成果物とCost判断を追加し、共通課程の修了の必須条件へ戻しません。

## Phase 6: Failure時の調査経路を設計する

各Job Failureで、最初に確認する実行記録を定義します。

例:

| Failure | 最初に確認するもの |
| --- | --- |
| Lint | GitHub Actions Log |
| Playwright Assertion | Trace / Screenshot |
| Browser起動 | Setup Log |
| Gradle Build（Native選択時） | Gradle Log |
| APK Install（Native選択時） | adb / Runtime Log |
| Maestro Assertion（Native選択時） | JUnit / Screenshot |
| iOS Build（Native選択時） | Xcode Build Log / Build Artifact |
| Deploy（発展課題） | Deploy Log / URL |
| Deploy後Smoke（発展課題） | Playwrightの実行記録 |

「失敗したら担当者が頑張って調べる」ではなく、調査可能な実行記録を設計へ含めます。

## Phase 7: Quality Gateを設計する（共通Web・Native選択時）

Mergeを止める必須条件を定義します。

次を考えます。

- 必須Test
- 必須Build
- Androidの必須範囲（Native選択時）
- iOSの必須範囲（Native選択時）
- Preview Smoke
- Final Verify

共通経路ではWebの必須Test、Build / Artifact、Final Gateの範囲を限定して定義します。Android / iOS、Preview Smoke、Productionに関する必須範囲は、選択時または発展課題・参考資料として別に判断します。

次のような弱体化は禁止とします。

- 不安定だから`continue-on-error`
- 遅いから重要なTestを削除
- FailするからAssertionを弱くする
- 原因不明のままRetry回数だけ増やす

必要ならTest自体を改善するか、必須指定の配置を見直します。

Nativeについては「両Platformを必須にすれば品質が高い」と短絡せず、Risk、実行時間、Runner Cost、Flakiness、代替Coverageから判断します。

## Phase 8: CI/CDを設計する（発展課題・参考資料）

Webについて、Build後のDelivery / Deployまで設計します。Preview / Production / Deploy後Smokeは共通課程の修了の前提ではありません。

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

- Previewを必須にするか。
- Productionへ何のArtifactをDeployするか。
- Deploy Failure時にどう扱うか。
- Production Smokeで何を確認するか。

## Phase 9: Workflow Diagramを作成する（共通課程の図・発展拡張）

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

## Phase 10: 現在のScenario Shop CIと比較する（参考比較）

自分の設計完成後、現在の次のFileを読みます。

- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`

次を比較します。

1. Trigger
2. Job構成
3. 必須範囲
4. Test Suite配置
5. Browser Strategy
6. Artifact再利用
7. Native変更判定
8. Android Build / Runtime境界
9. iOS Build-only経路
10. iOSのstandalone Manual入口とNative変更時の必須Build-only経路（Runtime PASSとは別）
11. Preview / Production
12. 失敗時の記録

現在のiOS Workflowがstandaloneでは`workflow_dispatch`であり、Native変更時にはtop-level `native-ci`から必須のBuild-only経路として呼び出されることを「差分」として扱います。自分の設計がiOSをPRやNightlyへ配置していた場合、どちらが妥当かを理由付きで評価します。

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

次の成果物はリポジトリ内へ保存・記録します。外部提出を共通課程の修了の必須条件にしません。

### 共通課程の必須成果物

- 現在の状態とRiskの整理（Web CIの設計判断に必要な範囲）
- 対象範囲を限定したWeb CI設計
- Web Quality Gate定義
- Artifact / 失敗時の記録の設計
- fail-closedを含むFailureの調査経路
- 必要最小限の対象範囲を限定したWeb CI Diagram
- 最終設計判断と理由
- P2-5で受講者が作成したPlaywright TestをTraining Copy Pull Requestで成功させたrun結果 / Artifact

### 最終成果物の照合

外部へのレポート提出はCommonの修了条件にしません。ただし、準備済みTraining Copy上で作成したPRのCI実行証跡は、Part 2の正式な学習成果です。完了前に次の対応を一つずつ照合します。

| 習熟項目 | 最終確認する対応関係 |
| --- | --- |
| C09 | 同じCase／コードPathの`diagnostic-initial` Failure → `diagnostic-repaired` Pass、別Receipt／別Evidence |
| C10 | 同じCase／コードPathの`c10-before` Pass → `c10-improved` Pass、別Evidence、Digest変更 |
| C11 | Branch、Commit、Diff、Training Copy上のPull Request、Review記録 |
| C12 | Training Copy上のRun、Check、Artifact、画面確認に基づく人間可読Evidence |

ローカルの`handoff-root`だけでC12のRun／Check／Artifactを作ったことにはしません。Training Copyまたは必要なGitHub権限がない場合は、設計成果物を保存したうえでPart 2 V1を`BLOCKED`として記録します。

### 練習・参考資料

- PR / main / Nightly / Manual Test配置表

### モバイルアプリ自動化の選択課程（選択時）

- Android CI設計
- iOS CI設計
- Native Failureの記録の設計

### 発展課題・参考資料

- Preview / Production / Deploy後Smokeを含むfull delivery設計
- 現在のScenario Shop CIとの差分比較

## 評価観点

### 開発プロセス理解

- Testを単独の作業としてではなく、変更管理へ接続しているか。

### Test配置

- すべてをPRで回す設計にしていないか。
- 重要なRegressionをGateから外していないか。
- AndroidとiOSの実行頻度を機械的に同一にしていないか。

### Cost（共通Web、Native選択時に拡張）

- Browser、Android、iOS RunnerのCostとFeedback時間を考えているか。

### Reliability

- Flaky Testを放置したまま必須化していないか。

### 実行記録

- Failure時に原因調査できるArtifactがあるか。

### CI/CD（発展課題・参考資料）

- TestしたArtifactとDeployするArtifactの関係を説明できるか。
- Deploy後のSmokeまで考えているか。

### 設計判断

- 「現在のRepositoryがそうなっているから」ではなく、理由を説明できるか。
- 現在のWorkflow Triggerと、自分が設計した理想状態を区別できるか。

## 自己確認

次を自分の最終設計、Job Graph、Gate条件、失敗時の記録で確認できれば、Part 2の共通課程の修了を自己判定できます。

- 共通課程の必須範囲としてWeb CIのTrigger、必須Gate、Artifact、Failureの調査経路を一つの設計へ接続できる。
- P2-5で受講者が作成したPlaywright TestのTraining Copy Pull Request上のsuccessful run / Artifactを、Trigger、Gate、判定条件の実行記録として再利用できる。
- Gateが止めるFailure、確認するArtifact、fail-closed条件を説明できる。
- Test配置をRisk、Feedback速度、Flakiness、Runner Cost、Actionabilityの理由付きで判断できる。
- モバイルアプリ自動化の選択課程を選ばない場合にP2-6相当を飛ばし、Nativeを選択した場合だけ追加成果物を作って共通課程へ合流できる。
- Preview / Production / Deploy後Smoke、vendor detail、multi-platformは発展課題・参考資料として分類し、共通課程の必須範囲の暗黙の前提にしていない。

### Recovery

設計が広がりすぎた場合は、まずWeb Trigger、Gate、Artifact、Failureの調査経路の4点へ戻します。Failureの調査先が決まらない場合は、Jobごとに最初に確認するLog / Artifactを1つ定義します。NativeやDeliveryを選択しない場合は飛ばしたことを記録して共通課程の設計へ戻り、環境実行の問題は環境上の問題として分離します。

## Part 2完了条件

Part 2の最終共通課程: C01〜C07 + C09〜C12の対象範囲を限定したレベル2。各習熟項目に最低限必要な成果物は [習熟度評価基準](../02_competency-rubric.md) を参照します。C12の共通課程は対象範囲を限定したWeb CIのTrigger / Gate / Artifact / 失敗時の記録に限定します。

受講者が共通経路で次を自力で設計・説明できればPart 2完了とします。

- 一般的な開発プロセスとテストの関係
- Git / GitHubによる変更管理
- Pull RequestとReview
- CI Trigger
- Playwright CI
- Test Suiteの実行タイミング
- 必須のQuality Gate
- 失敗時の記録
- Build Artifact
- 対象範囲を限定したWeb CIのGate、Artifact、Failure調査経路

Native CI / Maestro、Android / iOSの異なる実行戦略、multi-platform、Preview / Production / Deploy後Smokeを含む一連のdeliveryは、モバイルアプリ自動化の選択課程または共通課程のレベル2の範囲外にある発展課題です。これらを共通課程の修了の必須条件にしません。

最終到達点は、GitHub ActionsのYAMLを暗記することではありません。

**案件のRisk、Test、Platform、実行Cost、Feedback速度を見て、自動テストを継続実行する仕組みを設計できること**を目標とします。

## 次の行動

Part 2の共通課程の設計を完了したら、習熟度評価基準の共通課程の実行記録と自分のFailureの調査経路を最終確認します。モバイルアプリ自動化の選択課程または発展課題・参考資料を選んだ場合は、追加成果物を別区分で確認し、共通課程の必須範囲へ混ぜません。
