# PR #8 CI復旧・Android CI高速化履歴

## 対象

- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Branch: `feature/01_phase2-first-half-native-foundation`
- Local HEAD: `17d9d538a27058dcf81893d4d6f118cf36d52abf`
- 最新確認Run: `30795820475`（Native CI、失敗）
- Android Job: `91629376320`（`Android Build / Emulator / Maestro`）
- Evidence Artifact: `native-android-evidence-30795820475`、ID `8849743993`

## 最新Runの実態

Native Static、Production Bundle Guard、Android SDK解決・導入、APK生成・検査、AVD／Emulator起動までは成功した。旧Workflowの`Install and launch APK`でAPK install、`pm path`、`monkey`は成功したが、Package Processの確認が60秒で終了コード124となった。Evidence StepとArtifact uploadは成功した。`native-ci / verify`はAndroid Job失敗を検出して失敗した。

Artifactのlogcatには次の原因が記録されていた。

- `RangeError: Maximum call stack size exceeded (native stack depth)`
- `NativeAutomationBridge` → `NativeTestControlRuntimeBridge` → `NativeAppRuntimeProvider`
- `src/test-controls/native-signals.native.ts`がplatform resolution後に自身を`./native-signals`として読み込む自己参照

このRunのWorkflowには旧`prebuild --clean`、Android内のNative asset生成、個別Maestro stepが残っていたため、今回の作業ツリーの修正が反映された成功Runとは扱わない。

## 実装

- `src/test-controls/native-signal-names.ts`へsignal定数と型を分離し、`native-signals.native.ts`の自己参照を解消した。
- Native signal emission回帰Jestと、native moduleの自己参照を検出するContract Testを追加した。
- Androidを`detect`だけに依存させ、Native Staticと並列化した。Production Bundle Guardと最終Verifyの依存／fail-close条件は維持した。
- `gradle/actions/setup-gradle@v4`、PR read-only cache、条件付き`libpulse0`／SDK component導入、`expo prebuild --no-install`、Android duplicate asset生成削除を反映した。
- Release APKは`-PreactNativeArchitectures=x86_64`、`--build-cache`、`--parallel`で生成し、JavaScript bundle、`lib/x86_64`、非x86_64 ABI混入を検査する。
- Maestro CLI cacheを追加し、10 FlowをRuntime/SmokeとPersistence/Boundaryの2グループへまとめ、各Flow自身のResetと専用JUnit／artifact directoryを契約化した。
- Evidenceは常にboundedで完了し、成功時はsummary／hash／tailのみ、失敗時はdumpsys／logcat／AVD／APK／Gradle／emulator logを収集する。ファイル未生成時は説明ファイルを作成する。

## 成功・失敗・Skip・未実行

| 区分 | 対象 | 結果 |
|---|---|---|
| 成功 | ローカル format、typecheck、Lint、Native Jest、Workflow／signal Contract | 成功。Lintは既存warningのみ |
| 成功 | 最新旧WorkflowのSDK／APK／Emulator／Evidence upload | 成功。ただし旧Workflowの結果 |
| 失敗 | 最新旧WorkflowのAndroid launch／`native-ci / verify` | `pidof`待機 exit 124、verifyはfail-close |
| Skip | 最新旧WorkflowのMaestro | launch失敗により未実行。Maestro自体の失敗とは判定しない |
| 未実行 | 修正後WorkflowのGitHub Actions、実Android／iOS、実`expo-sqlite`、EAS Cloud | Commit／Push禁止またはtoolchain不在のため未確認 |

## Timing / timeout table

| 対象 | 設定値・観測値 | 目的 |
|---|---:|---|
| Android Job | 50分 | Native Job全体の上限 |
| APK install | 180秒 | install hangの上限 |
| APK launch command | 30秒 | `monkey`の上限 |
| Process wait | 外側60秒／ADB probe 10秒 | 起動失敗をboundedに判定 |
| Evidence command | 1コマンド15秒、ADB state probe 5秒 | Evidence停止を防止 |
| Evidence Step | 3分 | 成功／失敗いずれもArtifact uploadまで完走 |

AVD snapshot cacheは改善効果を測定できる新しい成功Runがないため保留し、現状は`-no-snapshot`で再現性を優先する。

## 未完了境界

修正後WorkflowをGitHub上で実行して、SDK導入条件、APK x86_64、App process維持、10 Flow、Harness signal、JUnit、軽量／詳細Evidence、`native-ci / verify`成功を確認する必要がある。WindowsローカルAndroid SDK／adb／Emulator／Maestro、macOS Xcode／Simulator、実`expo-sqlite`は引き続き未確認である。Commit、Push、PR更新、EAS Cloud Build／Submitは実施していない。
