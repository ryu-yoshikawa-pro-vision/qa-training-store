# Native ローカル検証

Native Build は EAS Cloud ではなく、Windows／macOS のローカル Toolchain を主経路とする。

このディレクトリは、人間と AI エージェントが同じ手順・同じ停止条件で実行するための正本である。README や Skill に詳細手順を複製しない。

## Windows／Android

- [Windows Android 実機検証 Runbook](./windows-android-local-validation.md)
- [Windows Android トラブルシューティング](./windows-android-troubleshooting.md)
- 実行入口: [`scripts/native/windows/android-local.ps1`](../../scripts/native/windows/android-local.ps1)
- AI エージェント用 Skill: [`.agents/skills/android-native-local-validation/SKILL.md`](../../.agents/skills/android-native-local-validation/SKILL.md)

## 検証の基本順序

1. `Doctor`
2. `Prepare`
3. `Build`
4. `Install`
5. `Smoke`
6. `Test`（`native-test-control.yaml` 単体）
7. `RuntimeSuite`
8. `BoundarySuite`

単体 Flow が失敗した場合、後続 Suite は実行しない。スクリーンショット、Accessibility Hierarchy、logcat、JUnit、Maestro Output を保存し、失敗原因を確認してから修正する。

Windows Android Build の Path／Autolinking 復旧は、Runbook 4.3 と [トラブルシューティング 9](./windows-android-troubleshooting.md#9-buildninja-が-still-dirty-after-100-tries-で失敗) を参照する。

## Maestro の入力経路

- 既知商品の詳細、Variant、Cart、Persistenceを確認する主要Flowは、`scenario-shop://products/<productId>`のDeep Linkで商品を開く。主要FlowをIMEの入力状態に依存させない。
- 検索欄への`inputText`と商品Code検索は、[`maestro/native-search.yaml`](../../maestro/native-search.yaml)に分離してカバレッジを維持する。これはRuntime／Boundaryの主要Flowとは別に実行する。
- 物理端末の標準日本語IMEがASCII入力を保持しない場合、検索専用Flowを成功扱いにせず、LatinIME等の制御された入力方式へ一時切替してから実行する。終了後は元のIMEと有効IME一覧を必ず復元する。
- 検索入力の失敗を理由に、既知商品の主要Flowへ検索操作を戻したり、`assertVisible`を削除したりしない。

## Native テスト成果物の保存先

- 人が確認・共有するモバイルネイティブのスクリーンショット、比較画像、選定した画面証跡は `output/mobile-native/` に保存する。リポジトリ直下には置かない。
- 同じシナリオを複数回保存する場合は、シナリオ名、検証段階、Run ID または JST timestamp をファイル名またはサブディレクトリに含め、既存成果物を上書きしない。
- Maestro／ADB／Gradle のログ、JUnit、Hierarchy、APK 情報など実行ごとの機械証跡は、引き続き `.artifacts/native-local/<timestamp>/` に保存する。`output/mobile-native/` は共有・確認用の成果物、`.artifacts/` は実行証跡として役割を分ける。
- `output/` は Git 管理外であるため、生成物を Repository に追加するための `.gitkeep` や個別の ignore 追加は行わない。

## CI との違い

- GitHub Actions: API 34 の x86_64 Emulator
- Windows ローカル: USB 接続した Android 実機。ABI は実機から自動判定する
- CI とローカルは主要Runtime／Boundaryで同じ Maestro Flow を使い、検索入力Flowは独立した実行として扱う
- APK は ABI が異なるため、CI Artifact を実機用として流用しない

## Repository へ追加しないもの

- `android/`、`ios/`
- APK／AAB／IPA
- `local.properties`
- SDK／NDK／CMake／Maestro 本体
- keystore、password、credential
- `.artifacts/`
- Windows 固有の絶対パスを含む `.npmrc`
