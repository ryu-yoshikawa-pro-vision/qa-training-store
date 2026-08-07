# Windows Android Build復旧手順追記履歴

## 2026-08-07 05:30 JST

### 背景

2026-08-06のWindows Android実機検証で、短いRepository Aliasと外部pnpm Virtual Storeを適用した後も、Release Buildが古いNative生成状態を参照して失敗した。今後の実機検証で同じ状態に遭遇した際、`Clean`の反復だけで時間を消費しないよう、復旧順序を文書化した。

### 実測した復旧ポイント

- `react-native-nitro-modules`のCMake／Ninjaで`build.ninja`が`still dirty after 100 tries`となった。
- `Prepare`後にも、`.modules.yaml`、Package Link、生成済みAutolinkingに`.pnpm-local`の古い参照が残る場合があった。
- 明示的な`pnpm install --frozen-lockfile --virtual-store-dir=C:/v/qts`の後、`pnpm exec expo prebuild --clean --platform android --no-install`を実行して生成状態を作り直すことで、最終Buildは成功した。
- `gradlew clean`／`-CleanNative`単独では、古いCMake参照を読むClean処理自体が失敗し得るため、復旧の初手にしない。

### 文書への反映

- `docs/native/windows-android-local-validation.md`へVirtual Store切替後の確認・再リンク・Prebuild再生成手順を追加した。
- `docs/native/windows-android-troubleshooting.md`へ`build.ninja`の症状と復旧分岐を追加した。
- `docs/native/README.md`から復旧節を参照できるようにした。
- `docs/PROJECT_CONTEXT.md`へ今回の実測結果と、実機検証全体をPASSと扱わない注意を追記した。

生成Android、APK、JUnit、logcat、端末固有情報はこの履歴へ保存せず、実行ごとの証跡は`.artifacts/native-local/<timestamp>/`へ保存する。
