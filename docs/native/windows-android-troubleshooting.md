# Windows Android トラブルシューティング

症状を確認し、直接原因にだけ対応する。警告の一括解消や無関係な Version 更新は行わない。

## 一覧

| 症状 | 主因 | 対応 |
|---|---|---|
| `java`／`javac` が見つからない | JDK または PATH 不備 | JDK 17、`JAVA_HOME`、Path を確認 |
| `sdkmanager.bat` が見つからない | Command-line Tools 配置不備 | `cmdline-tools\latest\bin` を確認 |
| Android CLI が `-1073740791` | Windows 上の CLI 異常終了 | `sdkmanager.bat` を直接使用 |
| `cmdline-tools\latest-2` 警告 | Command-line Tools 二重配置 | Version 確認後、重複だけ整理 |
| `CreateProcess error=2` | pnpm／CMake Path 超過 | Virtual Store を短い Path へ置く |
| `Filename longer than 260 characters` | Ninja Object Path 超過 | NTFS Junction `C:\q` 経由で Build |
| `subst` 上で `settings.gradle` が失敗 | Autolinking 内部 `cmd` と仮想 Drive の不整合 | `subst` をやめ、NTFS Junction を使う |
| Metro が `react` を解決できない | 外部 Virtual Store と Metro Resolution の不一致 | `autolinkingModuleResolution` を有効化 |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | 既存 APK と署名不一致 | データ消失確認後に手動 Uninstall |
| `unauthorized` | USB debugging 未承認 | 実機側で RSA Key を許可 |
| Maestro `visible` timeout | Accessibility 上で非表示／Bounds 外 | Screenshot と Hierarchy を比較 |

## 1. `CreateProcess error=2`

例:

```text
Could not start ... prefab_command.bat
CreateProcess error=2
```

`node_modules/.pnpm` 以下と CMake 生成 Path の合計が長すぎる場合に発生する。

標準対応:

- Repository は物理移動しない
- `C:\q` Junction から実行
- pnpm Virtual Store を `C:\v\qts` にする
- `virtual-store-dir-max-length=20`
- `expo prebuild --clean` で古い絶対 Path を破棄

Library 個別の Version を先に変更しない。

## 2. Ninja の260文字制限

例:

```text
ninja: error: ... Filename longer than 260 characters
```

Virtual Store を短縮しても、Repository Root と `.cxx` が長い場合は残る。

```text
長い: C:\Users\...\qa-training-store\android\app\.cxx\...
短い: C:\q\android\app\.cxx\...
```

Windows の Long Path Policy だけでは、Ninja 自身の制限を解消できない場合がある。短い Junction を標準対応とする。

## 3. `subst` で Autolinking が失敗

例:

```text
Settings file 'Q:\android\settings.gradle'
Process 'command 'cmd'' finished with non-zero exit value 1
```

`subst` による仮想 Drive はこの Project の React Native Autolinking と相性が悪い。`subst` を解除し、同じ C Drive 上の NTFS Junction を使う。

```powershell
Set-Location C:\
subst Q: /d
New-Item -ItemType Junction `
  -Path C:\q `
  -Target C:\Users\<user>\Documents\qa-training-store
```

通常はスクリプトの `Prepare` に任せる。

## 4. Metro が `react` を解決できない

例:

```text
Unable to resolve module react from ...\standard-navigation\...
```

外部 Virtual Store 内の Package から Project Root の `react` へ到達できない状態。

`app.config.ts` で Expo Autolinking と Metro の解決結果を揃える。

```ts
experiments: {
  typedRoutes: true,
  autolinkingModuleResolution: true,
},
```

SDK 57 では On-demand filesystem access は既定機能であるため、今回の理由だけで追加設定を増やさない。

## 5. 大量の OpenSSL／Kotlin Warning

次のような Warning は、Build が続いている限り直接原因ではない。

- OpenSSL 3 deprecated API
- Kotlin deprecated API
- React Native Legacy Architecture API

最後の `FAILED` Task と `Caused by` を確認する。警告をすべて修正しようとして依存 Package を広範囲に変更しない。

## 6. `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

同じ Package ID の既存アプリと署名が異なる。

```powershell
adb uninstall com.ryuyoshikawa.scenarioshop
```

この操作は Application Data を消去する。自動スクリプトでは実行しない。

## 7. Maestro が Text を見つけない

画面上に見えていることと、Maestro が `visible` と判断することは別である。Maestro は Accessibility Tree を利用する。

失敗時に確認するもの:

- `screen.png`
- `maestro-hierarchy.txt`
- `uiautomator.xml`
- Text の Bounds
- Safe Area 内か
- 他要素の背面にないか
- 表示後すぐ別状態へ変わっていないか
- Text が結合・分割されていないか

次の回避は禁止:

- Timeout を延ばすだけ
- `assertVisible` を削除
- Flow を Skip
- CI を Allow failure

UI／Accessibility、Runtime 状態遷移、Selector のどこに問題があるかを分類して最小修正する。

## 8. 生成物を初期化したい場合

通常は Build Cache を利用する。Path や Prebuild 設定が変わった場合だけ、次を使用する。

```powershell
pnpm run native:android:prepare
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/native/windows/android-local.ps1 `
  -Action Build `
  -CleanNative
```

`node_modules`、SDK、Gradle Cache を無条件に全削除しない。
