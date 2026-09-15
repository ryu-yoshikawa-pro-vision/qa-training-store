# 講師向け資料

> **運営支援のみの契約（PR 4A）:** この文書はリポジトリ上で必要な支援資料です。受講者向けの学習内容、自己確認、Recovery、修了条件、評価、解答の正本にはしません。

この文書は公開リポジトリ内の運営・講師向け参考資料です。秘密情報、Production Secret、Token、隠しテスト、受講者の個別判定結果は置きません。受講者の標準ナビゲーションに修了への入口として追加せず、必要な環境支援時だけ参照します。

## 公開資料（Public Reference）

公開された正式な仕様、現在のADR、現在のworkflow、Training validatorへ到達するための支援を行います。学習内容と自己判定は各受講者必須Lessonおよび[習熟度評価基準](02_competency-rubric.md)を参照し、この文書に解答を追加しません。

## Expected Contract（想定する契約）

- 期待される製品動作の正本は[`docs/spec/README.md`](../../spec/README.md)と正式なFeature仕様です。
- `docs/spec/features/*.md`、現在のADR、実行可能なソースの役割を混同せず、変更される値をこの文書に複製しません。
- Training Webの既存入口は `playwright.training.config.ts` の `training-chromium` / `training-mobile-chromium`、Training Nativeの開始点は `training/maestro/baseline/` です。環境支援では、現在のリポジトリにあるScriptとworkflowを優先します。
- 正式なWebの `e2e/web/` と正式なNativeの `maestro/` に受講者用Testを混ぜず、Trainingの変更面と分離します。
- AndroidはBuild + Runtime E2E、iOSはBuild-onlyという現在の保証範囲を運用上の前提として扱います。iOS Simulator / Maestro / Runtimeを未確認のまま成功と記録しません。
- Training Copyでは実行対象のworkflowを `training-ci.yml` と `training-native-ci.yml` の2件に限定し、`permissions: contents: read`、Secret不要、Deployなしという境界を確認します。

## 代替案（Alternative Design）

環境や配布方法の差を支援するときは、次の代替を許容します。受講者必須の判定を別の正本へ移しません。

- GitHub Forkまたは講師が用意したGit管理済みTraining Copyを使う。どちらでもProduction WorkflowとTraining Workflowを分離します。
- Windows LocalのPhysical Android deviceまたはGitHub-hosted Android Emulatorを、該当するRunbookとWorkflowに従って使う。別の正式なNative基盤は追加しません。
- WebのBrowser、Base URL、dist配信、Node / pnpmの差は、現在のScriptと環境の確認で吸収します。
- iOSはBuild-only Artifactの支援に限定し、Runtime実行を別途保証したことにしません。

## 避けるべき例（Anti-pattern）

- Training supportへProduction Secret、OIDC、write token、環境、Deployを持ち込む。
- `e2e/web/`、`maestro/`、正式なWorkflowへTraining用の受講者用Testや教材用変更を混ぜる。
- `training/maestro/**`の変更でNative CIが意図せずskipされる状態を放置する。
- Intentional Failureを通常baselineへ含める、または失敗時の記録を削除・隠蔽する。
- 現在のWorkflow、Spec、ADRの値をこの文書で上書きし、第三SSOTを作る。
- iOS未実行を「iOS Runtime PASS」と記録する。
- 受講者へ完成Code、非公開Answer Key、個別のCompletion判定をこの文書から渡す。

## 運営支援の手引き

### 環境・ツールチェーン

- Web baselineが起動しない場合は、`PLAYWRIGHT_BASE_URL`、dist、Port、Browserのインストール、Node / pnpmのversionを確認します。
- Native toolchainが起動しない場合は、既存のDoctor、SDK、JDK、Gradle、APK、Maestroのversionと、対象workflowのLogを確認します。
- Physical Android deviceは、`USB debugging`、`adb devices -l`、`RequirePhysicalDevice`、`-DeviceSerial`、端末が`unlocked`か、AppのReady状態を確認します。値や手順の最新版は現在のRunbookを参照します。
- iOSはmacOS / Xcode / CocoaPods、Build-time metadata、Production guard、`.app` Artifactの有無を確認します。Simulator Install / Launch / Maestroの未保証境界を変更しません。

### Training Copyの準備

Training Copyを運営が準備する場合は、次の既存Scriptと境界を使います。

```bash
pnpm run training:copy:prepare -- --source-sha <full-sha> --target <disposable-folder>
pnpm run training:copy:validate -- --root <disposable-folder>
```

実行対象workflowのallowlist、Source SHA、Formal Workflowとの分離、`permissions: contents: read`、Secret / Deployなしを支援側で確認します。受講者にprovisioningやallowlistの自力準備を修了の前提として追加しません。

### アカウント・権限

- GitHub Actionsが利用可能か、対象Fork / CopyへPushできるか、Base Branchが意図どおりかを確認します。
- Secretが必要になった場合はTraining Workflowへ追加せず、Production Workflowとの分離または演習環境の設定へ戻します。
- 本体RepositoryへのPush権限、第三者Review、外部サービスのQuotaは、受講者必須の暗黙の前提にしません。

### インフラ・成果物

- Failure時は最初の異常、派生エラー、Log / Screenshot / Trace / JUnitなどの失敗時の記録を分けて保存します。
- Expected Failureがbaselineへ混入していないか、Artifact Upload / Downloadが成功したか、WorkflowのJob Resultが想定外Skipになっていないかを確認します。
- Training Maestro baselineは環境確認の開始点であり、受講者が作成した成果物やC08 / Native CIの修了条件の代替ではありません。

## トラブルシューティングの確認項目

| 症状 | 支援時に最初に確認すること | 支援分類 |
| --- | --- | --- |
| Web baselineが起動しない | `PLAYWRIGHT_BASE_URL`、dist、Port、Browser install | 環境 / ツールチェーン |
| Reset後に別データが残る | 現在のScenario / Test ControlのSSOT、localStorage / IndexedDBの状態 | Test Data / Seed支援 |
| Locatorが見つからない | Appの表示状態、Stable Test ID、待機対象、Browser Log | UI / 同期支援 |
| Expected Failureが成功する | Failure Exerciseとbaselineの配置、Workflowの対象 | テスト実行支援 |
| GitHub Native CIのAVDがbootしない | API 34 image、ABI、KVM、serial、finite timeout | 環境 / ツールチェーン |
| Maestroが起動しない | APKのBuild kind、Test Control listening、Maestro version | Harness / ツールチェーン |
| Training CopyにWorkflowが多い | `training:copy:prepare`とactive allowlist | 信頼境界 |
| iOSを実行できない | 現在の保証がBuild-onlyであること、Build ArtifactとLog | 現在の保証に関する支援 |

## 初学者の観察

初めて学ぶ受講者が止まった場合は、暗黙の解答を追加する前に、環境、アカウント、権限、端末、Training Copy、インフラ、ツールチェーンのどこで止まったかを切り分けます。環境が正常なら、該当する受講者必須文書の不足として扱い、README、Self-check、Recovery、Validatorの担当箇所へ戻します。この文書へ個別の回答、判定結果、Finding台帳を追加しません。
