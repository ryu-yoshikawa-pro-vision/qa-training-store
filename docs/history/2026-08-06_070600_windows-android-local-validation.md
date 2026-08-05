# Windows Android 実機検証環境の構築記録

- Date: 2026-08-06
- Branch: `feature/01_phase2-first-half-native-foundation`
- Purpose: PR #8 の Native CI／Maestro 失敗を Windows 実機で再現・修正できる環境を構築する

## 完了したこと

- JDK 17 の導入と `java`／`javac` 確認
- Android SDK Root を `C:\Android\Sdk` に統一
- `sdkmanager.bat` を利用した Platform Tools、API 36、Build Tools 36.0.0 の準備
- USB debugging を有効化した Android 実機の ADB 接続
- 実機 ABI の確認
- Maestro 2.8.0 の導入
- Automation Release APK の Build 成功
- 実機への APK Install／起動
- `maestro/native-test-control.yaml` の単体実行

## 発生した問題と結果

### 1. Android CLI の異常終了

新しい Android CLI 実行時に Windows Exit Code `-1073740791` が発生した。

対応:

- `C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat` を使用

### 2. CMake Prefab Command の起動失敗

```text
CreateProcess error=2
```

pnpm の長い Package Path と CMake 生成 Path が原因だった。

対応:

- pnpm Virtual Store を `C:\v\qts` へ短縮
- Virtual Store Directory Name の上限を 20 に設定

### 3. Ninja の260文字制限

```text
Filename longer than 260 characters
```

Virtual Store 短縮だけでは、Repository Root と `.cxx` の合成 Path が長かった。

対応:

- Repository の物理位置は変更しない
- `C:\q` NTFS Junction を作成
- Junction 側から Prebuild／Gradle を実行

### 4. `subst` 上の Autolinking 失敗

```text
Settings file 'Q:\android\settings.gradle'
Process 'command 'cmd'' finished with non-zero exit value 1
```

対応:

- `subst` を不採用
- 同一 Drive 上の NTFS Junction を採用

### 5. Metro の React 解決失敗

```text
Unable to resolve module react from ... standard-navigation ...
```

外部 Virtual Store と Metro の Module Resolution が一致していなかった。

対応:

- Expo SDK 57 の `experiments.autolinkingModuleResolution` を有効化

### 6. Maestro 単体 Flow の失敗

APK Build、Install、起動後、`maestro/native-test-control.yaml` は実行できたが失敗した。

現在の状態:

- Setup: 完了
- Release APK Build: 完了
- Physical-device Install／Launch: 完了
- Maestro CLI 起動: 完了
- `native-test-control.yaml`: 失敗、原因調査が必要
- Runtime 5 Flow: 未実行
- Boundary 5 Flow: 未実行

## 今回追加する恒久対応

- Windows Android 実機検証 Runbook
- Windows 固有 Troubleshooting
- PowerShell の共通実行 Script
- Package Script の入口
- AI エージェント用 Repo-local Skill
- `.artifacts/` の Git 除外
- Expo Autolinking と Metro Resolution の契約

## 次の作業

1. 単体 Flow の Screenshot、Maestro Hierarchy、UIAutomator XML、logcat を確認する
2. `Native test runtime listening` が画面と Accessibility Tree のどちらで失敗しているか分類する
3. UI／Safe Area／Accessibility／Runtime 状態遷移／Flow Selector の最小修正を行う
4. 同じ単体 Flow を再実行する
5. 成功後に Runtime 5 Flow、Boundary 5 Flow を実行する

Timeout 延長や Assertion 削除だけの回避は行わない。
