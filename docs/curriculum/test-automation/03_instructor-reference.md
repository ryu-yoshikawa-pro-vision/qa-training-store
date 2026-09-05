# Instructor Reference

> **Support-only contract (PR 4A):** この文書はRepository-required support assetです。Learner-facingの学習内容、Self-check、Recovery、Completion、評価、Answer Keyの正本にはしません。

この文書はPublic Repository内の運営・講師向けReferenceです。秘密情報、Production Secret、Token、隠しテスト、受講者の個別判定結果は置きません。受講者の標準NavigationへCompletionの入口として追加せず、必要な環境支援時だけ参照します。

## Public Reference

公開されたNormative Specification、Current ADR、Current Workflow、Training validatorへの到達を支援します。学習内容と自己判定は各Learner Required Lessonおよび [Competency Rubric](02_competency-rubric.md) を参照し、この文書へ解答を追加しません。

## Expected Contract

- Expected Product Behaviorの正本は [`docs/spec/README.md`](../../spec/README.md) とNormative Feature文書です。
- `docs/spec/features/*.md`、Current ADR、Executable Sourceの役割を混同せず、mutableな値をこの文書へ複製しません。
- Training Webの既存入口は `playwright.training.config.ts` の `training-chromium` / `training-mobile-chromium`、Training Nativeの開始点は `training/maestro/baseline/` です。環境支援ではRepositoryの現在のScriptとWorkflowを優先します。
- Formal Web `e2e/web/`、Formal Native `maestro/`へLearner Testを混ぜず、Trainingの変更面と分離します。
- AndroidはBuild + Runtime E2E、iOSはBuild-onlyというCurrent保証を運用上の前提として扱います。iOS Simulator / Maestro / Runtimeを未確認のまま成功と記録しません。
- Training Copyではactive Workflowを `training-ci.yml` と `training-native-ci.yml` の2件へ限定し、`permissions: contents: read`、Secret不要、Deployなしの境界を確認します。

## Alternative Design

環境や配布方法の差を支援するときは、次の代替を許容します。Learner Requiredの判定を別の正本へ移しません。

- GitHub Forkまたは講師が用意したGit管理済みTraining Copyを使う。どちらでもProduction WorkflowとTraining Workflowを分離します。
- Windows LocalのPhysical Android deviceまたはGitHub-hosted Android Emulatorを、該当するRunbookとWorkflowに従って使う。別のFormal Native基盤は追加しません。
- WebのBrowser、Base URL、dist配信、Node / pnpmの差は、Current ScriptとEnvironmentの確認で吸収します。
- iOSはBuild-only Artifactの支援に限定し、Runtime実行を別途保証したことにしません。

## Anti-pattern

- Training supportへProduction Secret、OIDC、write token、Environment、Deployを持ち込む。
- `e2e/web/`、`maestro/`、Formal WorkflowへTraining用Learner Testや教材用変更を混ぜる。
- `training/maestro/**`の変更でNative CIが意図せずskipされる状態を放置する。
- Intentional Failureを通常baselineへ含める、またはFailure Evidenceを削除・隠蔽する。
- CurrentのWorkflow、Spec、ADRの値をこの文書で上書きし、第三SSOTを作る。
- iOS未実行を「iOS Runtime PASS」と記録する。
- 受講者へ完成Code、非公開Answer Key、個別のCompletion判定をこの文書から渡す。

## Support playbook

### Environment / Toolchain

- Web baselineが起動しない場合は、`PLAYWRIGHT_BASE_URL`、dist、Port、Browser install、Node / pnpm versionを確認します。
- Native toolchainが起動しない場合は、既存のDoctor、SDK、JDK、Gradle、APK、Maestro versionと、対象WorkflowのLogを確認します。
- Physical Android deviceは、`USB debugging`、`adb devices -l`、`RequirePhysicalDevice`、`-DeviceSerial`、端末が`unlocked`か、AppのReady状態を確認します。値や手順の最新版はCurrent Runbookを参照します。
- iOSはmacOS / Xcode / CocoaPods、Build-time metadata、Production guard、`.app` Artifactの有無を確認します。Simulator Install / Launch / Maestroの未保証境界を変更しません。

### Training Copy / Repository provisioning

Training Copyを運営が準備する場合は、次の既存Scriptと境界を使います。

```bash
pnpm run training:copy:prepare -- --source-sha <full-sha> --target <disposable-folder>
pnpm run training:copy:validate -- --root <disposable-folder>
```

active Workflow allowlist、Source SHA、Formal Workflowとの分離、`permissions: contents: read`、Secret / Deployなしを支援側で確認します。受講者にprovisioningやallowlistの自力準備をCompletionの前提として追加しません。

### Account / Permission

- GitHub Actionsが利用可能か、対象Fork / CopyへPushできるか、Base Branchが意図どおりかを確認します。
- Secretが必要になった場合はTraining Workflowへ追加せず、Production Workflowとの分離または演習環境の設定へ戻します。
- 本体RepositoryへのPush権限、第三者Review、外部サービスのQuotaはLearner Requiredの暗黙前提にしません。

### Infrastructure / Artifact

- Failure時は最初の異常、派生エラー、Log / Screenshot / Trace / JUnitなどの`Evidence`を分けて保存します。
- Expected Failureがbaselineへ混入していないか、Artifact Upload / Downloadが成功したか、WorkflowのJob Resultが想定外Skipになっていないかを確認します。
- Training Maestro baselineは環境確認の開始点であり、受講者のlearner-authored成果物やC08 / Native CI completionの代替ではありません。

## Troubleshooting prompts

| 症状 | supportで最初に確認すること | support分類 |
| --- | --- | --- |
| Web baselineが起動しない | `PLAYWRIGHT_BASE_URL`、dist、Port、Browser install | Environment / Toolchain |
| Reset後に別データが残る | Current Scenario / Test ControlのSSOT、localStorage / IndexedDBの状態 | Test Data / Seed support |
| Locatorが見つからない | Appの表示状態、Stable Test ID、待機対象、Browser Log | UI / Synchronization support |
| Expected Failureが成功する | Failure Exerciseとbaselineの配置、Workflowの対象 | Test execution support |
| GitHub Native CIのAVDがbootしない | API 34 image、ABI、KVM、serial、finite timeout | Environment / Toolchain |
| Maestroが起動しない | APKのBuild kind、Test Control listening、Maestro version | Harness / Toolchain |
| Training CopyにWorkflowが多い | `training:copy:prepare`とactive allowlist | Trust Boundary |
| iOSを実行できない | Current保証がBuild-onlyであること、Build ArtifactとLog | Current guarantee support |

## Fresh Learner observation

Fresh Learnerが止まった場合は、暗黙の解答を追加する前に、Environment / account / permission / device / Training Copy / Infrastructure / Toolchainのどこで止まったかを切り分けます。環境が正常なら、該当するLearner Required文書の不足として扱い、README、Self-check、Recovery、Validatorの担当箇所へ戻します。この文書へ個別の回答、判定結果、Finding台帳を追加しません。
