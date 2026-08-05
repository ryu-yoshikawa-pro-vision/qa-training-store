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

## CI との違い

- GitHub Actions: API 34 の x86_64 Emulator
- Windows ローカル: USB 接続した Android 実機。ABI は実機から自動判定する
- CI とローカルは同じ Maestro Flow を使う
- APK は ABI が異なるため、CI Artifact を実機用として流用しない

## Repository へ追加しないもの

- `android/`、`ios/`
- APK／AAB／IPA
- `local.properties`
- SDK／NDK／CMake／Maestro 本体
- keystore、password、credential
- `.artifacts/`
- Windows 固有の絶対パスを含む `.npmrc`
