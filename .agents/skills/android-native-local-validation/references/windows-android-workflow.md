# Windows Android検証Workflow

## 対象範囲と入力

このworkflowは、Windows host上でPowerShellとUSB接続した物理Android deviceを使い、ローカルRelease APKを検証する手順を扱います。tool version、device identity、application identity、command sequence、path、トラブルシューティングの対応は、external inputとして提供されるリポジトリのrunbookとhelperから取得します。

## Preflightと段階ごとのgate

Prepare、新しいBuild、Install、Test、Maestroを実行する前に、次を行います。

1. 最新のRun report、関係する過去attemptのEvidence、現在のdiff / status、shellとversionの条件、直前の成功または失敗条件を読む。
2. Doctorを実行し、固定toolchain契約、Android SDK、ADB deviceの状態、host / deviceの容量、APK identity、CI / localの差異を確認する。
3. retry前に、観測結果、原因仮説、最有力仮説、Evidence、変更する条件、成功条件、次に得る情報を記録する。
4. preflightが未完了、上流段階が失敗、または必要なdevice状態が利用できない場合は、Prepare、Build、後続段階を開始しない。

## 条件付きPrepareとAPKの確立

Prepareが必要なのは、初回セットアップまたはNative Projectの再生成が必要な場合だけです。どちらにも該当しない場合は、有効な準備済みprojectを再利用できます。

preflight後、現在のRelease APKを次のいずれかで確立します。

- 現在の有効なRelease APKがあり、リポジトリのidentity・検査チェックに合格し、現在の変更を含む場合は再利用する。
- 現在の有効なAPKがない、または利用可能なAPKが現在の変更を含まない場合だけRelease Buildを実行する。

gateの条件は現在のRelease APKの確立と検証であり、PrepareやBuildの無条件実行ではありません。

通常のgate順序は次のとおりです。

```text
Doctor / preflight
→ Prepare if required
→ establish a current Release APK
  ├─ reuse current valid APK when appropriate
  └─ Release Build when no current APK exists or current changes are not represented
→ APK inspection
→ Install
→ Smoke
→ single control Flow
→ Runtime Suite
→ Boundary Suite
→ evidence / completion
```

リポジトリが追加の具体的なFlow gateを定義する場合があります。後続gateは上流gateが成功した後だけ実行します。固定契約文言は `A later gate runs only after its upstream gate passes` です。

## Evidenceとattempt identity

実行ごとに一意なattempt identityを使い、完全なraw Gradle、ADB、Maestro、JUnit、hierarchy、screenshot、APK Evidenceをリポジトリ指定のartifact rootへ保存します。後続attemptで失敗したattemptを上書きしません。active Runには、command、結果、最初の異常、派生エラー、分類、次の対応を含む簡潔なリポジトリ相対の概要を記録します。

Build、Install、Smoke、各Flow、各Suiteは個別に報告します。対象Flowまたはdeviceの状態を確認できていない場合、スクリーンショットや最後のlog行だけでは意味上の成功を証明できません。

## 失敗の分類

`BUILD FAILED`、APK欠落、Install失敗、Maestro起動失敗などの派生エラーと、最初の異常を分けます。リポジトリ互換の実行分類を使います。

```text
ENVIRONMENT_FAILURE
DEPENDENCY_FAILURE
CONFIGURATION_FAILURE
SOURCE_FAILURE
BUILD_CACHE_FAILURE
DEVICE_FAILURE
TEST_FAILURE
TRANSIENT_FAILURE
UNKNOWN
```

Evidenceなしに`TRANSIENT_FAILURE`と推測しません。環境、依存関係、設定、source、cache、device、testの原因を区別します。

## Retryと停止

retryは、再現性の確認、追加Evidenceの取得、仮説検証、確認済みの外部一時障害からの復旧という目的を明示できる場合だけ行います。可能な限り一度に1つの条件だけを変更します。

同じエラーが2回連続で発生した、同じstageが3回失敗した、異なる対応をしても最初の異常が変わらない、新しいEvidenceまたは仮説が追加されない、上流の失敗後に下流stageを実行することになる、または必要な環境・device・APK条件を理解できていない場合は、停止して調査へ戻ります。

cache削除、daemon停止、依存関係の再Install、clean build、timeout延長、Assertion削除、Flowのskipは、それだけでは説明になりません。盲目的なretryや成功の主張に使ってはいけません。容量不足は、容量を改善して変更条件を記録した後だけretryできます。

## 修復の境界

ProductまたはFlowの修復が明示的に許可された場合は、対象範囲内で最小の修復を適用し、同じ失敗単位を再実行します。その単位が成功するまで後続Suiteへ進みません。無関係なProduct変更、依存関係更新、環境cleanupを検証loopへ混ぜません。

## 完了

Native検証は、toolchain / preflight、必要時のPrepare、現在のRelease APKの確立と検査、物理deviceへのInstallと起動、control Flow、必須のRuntime / Boundary Suite、Evidenceの保存という、リポジトリが要求する全gateを通過した場合だけ完了です。毎回PrepareやBuildを実行する必要はなく、Build成功だけではNative検証の完了になりません。

未実行またはblockedの段階をPASSと報告しません。必要な物理deviceやCapabilityを利用できない場合は、Evidence付きでblockedまたはnot-executedの結果を記録し、リポジトリ契約に従って停止します。

## 安全性と対象外

- Gitの状態を保持し、明示的な許可なしにGit操作を行わない。
- ユーザーデータ、cache、生成ファイル、APK、deviceデータを自動的に削除・移動しない。
- Assertionを回避せず、失敗したFlowをskipせず、変更したtimeoutの背後へ失敗を隠さない。
- 固定toolchainを更新せず、このworkflowに新しいcommand runnerを作らない。
