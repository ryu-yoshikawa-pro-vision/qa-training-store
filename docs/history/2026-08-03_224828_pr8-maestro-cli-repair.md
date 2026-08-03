# PR #8 Maestro CLI／Application Launch／Signal修正履歴

## 対象

- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Branch: `feature/01_phase2-first-half-native-foundation`
- HEAD: `5fc9c14c7dc2975b6516e6fd2331cd1c7e0cc5b5`
- Native CI Run: `30811624722`
- Android Job: `91679536716`
- Evidence Artifact: `native-android-evidence-30811624722`、ID `8855456167`

## Remote Runの事実

- Native Static、Production Bundle Guard、Gradle Release APK、Android Emulator、APK Install、Application Launch、Evidence uploadはsuccess。
- Maestro Cacheは`maestro-Linux-1.39.15`がmiss。
- `Install pinned Maestro CLI`は旧URLのHTTP 404／curl exit 22でfailure。
- Runtime／SmokeとPersistence／Boundaryの2 GroupはCLI導入失敗によりskip。
- `native-ci / verify`はAndroid Job failureを受けてfailure。

Gradle Build時間は指示書記載の修正前25分35秒から修正後14分29秒へ、11分06秒（約43.4%）短縮されているため、Android並列化、x86_64、Gradle cache／parallelなどの高速化施策は維持する。

## Release確認

- GitHub公式Release APIでTag `cli-2.8.0`、Name `CLI 2.8.0`、Asset `maestro.zip`を確認。
- Download URLは`https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.8.0/maestro.zip`、HTTP statusは200、Content-Lengthは314,743,119 bytes。
- 実Assetをdownload／展開し、実行ファイルの構造が`maestro/bin/maestro`であることを確認。直下`bin/maestro`ではないため、WorkflowのInstall後検証とPATHを修正した。
- ローカルWindowsにはJava／Linux実行環境がないため、ローカル`maestro --version`と既存YAMLの実Flow実行は未確認。実CIで`--version`、Cache Miss／Hit、Flow実行を確認する。

## 修正内容

- `.github/workflows/native-ci.yml`のVersion／URL／Cache Schemaをenvへ集約し、Cache keyへOS／Version／Schemaを追加。
- Cache Hitでも`test -x "$MAESTRO_BIN"`と`"$MAESTRO_BIN" --version`を実行し、Cache Missは確認済みURLから`maestro/bin/maestro`を展開。
- Application LaunchをPackage ID変数、最大60秒PID待機、6回・2秒間隔の10秒安定稼働、対象Package／ReactNativeJSのFatal Log検出へ変更。
- Evidence Signal regexを`test-runtime-(ready|error)|native-contract-(running|passed|failed)`へ変更。
- Contract TestへRelease定数、URL集中、Cache key、nested bin、Install後検証、Step順序、Launch安定判定、正式Signal／旧Pattern拒否を追加。

既存のStatic／Android並列、x86_64限定、Gradle／Maestro cache、SDK／libpulse条件導入、duplicate asset生成削除、prebuild`--no-install`、2 Group Maestro、成功時軽量／失敗時詳細Evidenceは変更していない。

## ローカル検証

| Command | Result |
|---|---|
| `pnpm exec vitest run tests/contracts/native-ci-workflow.test.ts --no-file-parallelism --maxWorkers=1` | PASS（1 file／10 tests） |
| `pnpm run format:check` | PASS |
| `pnpm run lint` | PASS（0 errors／64 warnings） |
| `pnpm run typecheck` | PASS |
| `pnpm run test:component:native` | PASS（8 suites／16 tests） |
| `pnpm run test:repository` | PASS（5 files／28 tests） |
| `pnpm run test:contracts` | PASS（18 files／86 tests） |
| `pnpm run check:native-route-dependencies` | PASS（38 routes） |
| `pnpm run validate:native-production-bundle` | PASS |
| Workflow script `bash -n` | PASS（Launch／Maestro Install） |
| `git diff --check` | PASS（LF／CRLF warningのみ） |

## 成功・失敗・Skip・未確認

- 成功：上記ローカル検証、Release HTTP／zip構造、RunのAPK／Emulator／Evidence upload。
- 失敗：Run `30811624722`の旧Maestro CLI Install、`native-ci / verify`。
- Skip：同RunのRuntime／Smoke、Persistence／Boundary。CLI導入失敗によるSkipであり、Flow自身の失敗とは判定しない。
- 未確認：修正後Remote Cache Miss／Hit、`maestro --version`、10 Flow、Harness Signal、Evidence、Verify、Native CI全体時間、Windows実Android／macOS実iOS／実`expo-sqlite`。

## PR本文更新案

`購入系Maestro Flow`は`Checkout以降の購入完了Maestro Flow`へ置き換える。検証結果は成功／失敗／Skip／未確認に分類し、修正後Remote CIを成功と記載しない。

## Git操作境界

- commit: 未実施
- push: 未実施
- branch変更: 未実施
- PR本文更新: 未実施
- EAS Cloud Build／Workflow／Submit: 未実施
