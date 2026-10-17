# Windows Android トラブルシューティング

発生している症状を確認し、直接の原因のみに対処します。一般的なリトライや失敗、エビデンス（証跡）の取得、処理の停止・完了の判断基準は、パッケージローカルの [`windows-android-workflow.md`](../../.agents/skills/android-native-local-validation/references/windows-android-workflow.md) を正本とします。警告の一括解消や、問題と無関係なバージョン更新は行わないでください。

## 一覧

| 症状 | 主因 | 対応 |
|---|---|---|
| `java`／`javac` が見つからない | JDK または PATH の設定不備 | JDK 17、`JAVA_HOME`、Path を確認 |
| `sdkmanager.bat` が見つからない | Command-line Tools の配置不備 | `cmdline-tools\latest\bin` を確認 |
| Android CLI が `-1073740791` | Windows 上での CLI 異常終了 | `sdkmanager.bat` を直接使用 |
| `cmdline-tools\latest-2` 警告 | Command-line Tools の二重配置 | バージョン確認後、重複のみ整理 |
| `CreateProcess error=2` | pnpm／CMake のパス長超過 | バーチャルストアを短いパスへ配置 |
| `Filename longer than 260 characters` | Ninja オブジェクトパス長超過 | NTFS ジャンクション `C:\q` 経由でビルド |
| `build.ninja` が `still dirty after 100 tries` | 古い `.pnpm-local` を参照するオートリンキング／CMake 設定の残存 | 外部バーチャルストアへ再リンクし、プリビルドで生成状態を再作成 |
| `subst` 上で `settings.gradle` が失敗 | オートリンキング内部の `cmd` と仮想ドライブの不整合 | `subst` を解除し、NTFS ジャンクションを使用 |
| Metro が `react` を解決できない | 外部バーチャルストアと Metro のモジュール解決の不一致 | `autolinkingModuleResolution` を有効化 |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | 既存 APK との署名不一致 | データ消失の了承を確認後、手動でアンインストール |
| `unauthorized` | USB デバッグ未承認 | 実機側で RSA キーを許可 |
| Maestro `visible` timeout | アクセシビリティ上で非表示、または領域外（Bounds 外） | スクリーンショットと階層構造（Hierarchy）を比較 |
| `inputText` 後に既知の商品カードが見つからない | 端末の IME が ASCII 入力を保持していない | 主要フローは商品詳細へのディープリンクを使用し、検索入力は専用フローと制御下 IME で実行 |

## 1. `CreateProcess error=2`

例:

```text
Could not start ... prefab_command.bat
CreateProcess error=2
```

`node_modules/.pnpm` 配下のパスと CMake が生成するパスの合計長が、Windows のパス長制限を超えた場合に発生します。

標準対応:

- リポジトリ自体は物理移動しない
- `C:\q` ジャンクション経由で実行する
- pnpm のバーチャルストアを `C:\v\qts` に設定する
- `virtual-store-dir-max-length=20` を指定する
- `expo prebuild --clean` を実行して、古い絶対パスを破棄する

個別ライブラリのバージョン変更を先に行ってはなりません。

## 2. Ninja の260文字制限

例:

```text
ninja: error: ... Filename longer than 260 characters
```

バーチャルストアのパスを短縮しても、リポジトリのルートパスや `.cxx` 配下のパスが長い場合は、この制限に抵触してエラーが残ります。

```text
長い: C:\Users\...\qa-training-store\android\app\.cxx\...
短い: C:\q\android\app\.cxx\...
```

Windows の長いパスの有効化ポリシー（Long Path Policy）を設定するだけでは、Ninja 自体の文字数制限を回避できない場合があります。そのため、短いパスのジャンクションを経由する手順を標準対応とします。

## 3. `subst` で Autolinking が失敗

例:

```text
Settings file 'Q:\android\settings.gradle'
Process 'command 'cmd'' finished with non-zero exit value 1
```

`subst` コマンドによる仮想ドライブは、本プロジェクトにおける React Native のオートリンキング処理と競合を起こしやすい傾向があります。`subst` を解除し、同一 C ドライブ上の NTFS ジャンクションを使用してください。

```powershell
Set-Location C:\
subst Q: /d
New-Item -ItemType Junction `
  -Path C:\q `
  -Target C:\Users\<user>\Documents\qa-training-store
```

通常は手動で作成せず、スクリプトの `Prepare` 処理に任せます。

## 4. Metro が `react` を解決できない

例:

```text
Unable to resolve module react from ...\standard-navigation\...
```

外部バーチャルストア内のパッケージから、プロジェクトルートにある `react` を解決・参照できない状態です。

`app.config.ts` で設定を行い、Expo のオートリンキングと Metro のモジュール解決結果を一致させます。

```ts
experiments: {
  typedRoutes: true,
  autolinkingModuleResolution: true,
},
```

Expo SDK 57 ではオンデマンドのファイルシステムアクセス（On-demand filesystem access）が既定機能となっているため、このエラーの解消のみを理由として不要な追加設定を増やさないでください。

## 5. 大量の OpenSSL／Kotlin Warning

次のような警告（Warning）は、ビルド処理が継続している限り、失敗の直接的な原因ではありません。

- OpenSSL 3 の非推奨（deprecated）API
- Kotlin の非推奨（deprecated）API
- React Native Legacy Architecture API

ログ末尾の `FAILED` タスクと `Caused by` のメッセージを確認してください。警告をすべて解消しようとして、依存パッケージのバージョンなどを広範囲に変更してはなりません。

## 6. `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

同じパッケージ ID を持つインストール済みアプリと、新しくビルドしたアプリの間で署名が一致していません。

```powershell
adb uninstall com.ryuyoshikawa.scenarioshop
```

このアンインストール操作を実行すると、アプリ内の保存データ（Application Data）がすべて消去されます。意図しないデータ消失を防ぐため、自動実行スクリプトには組み込まず、手動で確認のうえ実行してください。

## 7. Maestro が Text を見つけない

画面上で人間の目にテキストが見えていることと、Maestro が `visible`（表示中）と判定することは同義ではありません。Maestro は画面描画そのものではなく、アクセシビリティツリー（Accessibility Tree）の情報を参照して判定を行います。

失敗時に確認する項目:

- `screen.png`（画面キャプチャ）
- `maestro-hierarchy.txt`
- `uiautomator.xml`
- 対象テキストの表示領域（Bounds）
- セーフエリア（Safe Area）の内側に収まっているか
- 他の UI 要素の背面に隠れていないか
- 要素の表示直後に別の状態へ遷移していないか
- テキストが意図せず結合または分割されていないか

次の回避策は禁止とします:

- タイムアウト時間を延長するだけの場当たり的な対処
- `assertVisible` アサーションの削除
- テストフロー（Flow）自体のスキップ
- CI ジョブの失敗許容（Allow failure）への変更

UI やアクセシビリティの実装、実行時の状態遷移、セレクタの指定方法のどこに問題があるのかを切り分け、必要最小限の修正を行ってください。

### 7.1 Maestro `inputText` が検索欄へ保持されない

SHV48 の標準日本語 IME など、実機の入力方式によっては、Maestro CLI の `inputText: "P-0001"` による入力文字列が検索欄に確定・保持されない場合があります。検索欄がプレースホルダー表示のまま残り、商品一覧に対象カード（`native-product-card-product-basic-shirt`）が現れない場合は、まず入力経路に起因する問題として切り分けます。

対応方針は次のとおりです。

1. 既知の商品の表示や動作を確認する Storefront／Cart／Persistence の主要フローでは、`scenario-shop://products/product-basic-shirt` のディープリンクを使用します。検索入力処理による画面遷移で代替してはなりません。
2. 検索入力機能自体の検証契約は、`maestro/native-search.yaml` にて単独かつ独立して検証します。
3. 実機（物理端末）で検索専用フローを実行する場合に限り、現在の IME 設定および有効な IME 一覧を保存したうえで、一時的に LatinIME などを選択します。フロー完了後は速やかに元の IME 設定および有効一覧へ復元してください。
4. 端末標準の IME のまま検索入力が成立しない場合であっても、タイムアウト延長、アサーション削除、あるいは主要フローへの検索入力復帰によって見かけ上成功扱いにすることは禁止します。検索専用フローの前提条件未達として正確に記録してください。

同一の APK に対して IME 設定のみを変更した A/B テストを実施し、`P-0001` 入力後の検索欄、アクセシビリティ階層（Accessibility Hierarchy）、対象商品カードの描画を比較します。テストデータ（Seed）やセレクタを変更する前に、`.artifacts/native-local/<timestamp>/` 配下のスクリーンショット、階層ダンプ、JUnit レポート、logcat を必ず確認してください。

## 8. 生成物を初期化したい場合

通常はビルドキャッシュを利用して実行します。パス構成やプリビルド設定を変更した場合に限り、以下の手順で初期化ビルドを行います。

```powershell
pnpm run native:android:prepare
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/native/windows/android-local.ps1 `
  -Action Build `
  -CleanNative
```

原因を切り分けることなく、`node_modules` や Android SDK、Gradle キャッシュを無条件に一括削除してはなりません。

## 9. `build.ninja` が `still dirty after 100 tries` で失敗

例:

```text
ninja: error: manifest 'build.ninja' still dirty after 100 tries
```

外部バーチャルストアへ切り替えた後も、依存関係のメタデータや生成済みのオートリンキング設定・CMake キャッシュが以前の `.pnpm-local` パスを参照し続けている場合に発生します。まずは `assemble-release.log` の末尾にある `FAILED` タスクと `Caused by` を確認し、過去の古いパスが複数箇所に残存していないかを調査してください。

復旧は次の順序で行います。

1. `pnpm run native:android:prepare` を実行します。
2. ランブック（Runbook）4.3 に従い、`.modules.yaml`、パッケージのリンク状態、`autolinking.json` の内容を確認します。
3. `.pnpm-local` のパスが残っている場合に限り、`C:\q` 上から明示的にバーチャルストアを指定して再リンクを行います。

   ```powershell
   $env:CI = 'true'
   $env:npm_config_virtual_store_dir = 'C:/v/qts'
   $env:npm_config_virtual_store_dir_max_length = '20'
   pnpm install --frozen-lockfile --virtual-store-dir=C:/v/qts
   pnpm exec expo prebuild --clean --platform android --no-install
   ```

4. `autolinking.json` 内に古い `.pnpm-local` の記述が残っていないことを確認したうえで、`pnpm run native:android:build:local` を新しい Run ID を指定して再実行します。
5. 正常に APK が生成された場合に限り、通常のテスト手順（Install、Smoke、Test、RuntimeSuite、BoundarySuite の順）へ復帰します。Test または初回のフローで失敗した場合は、後続のスイートを実行してはなりません。

`pnpm-lock.yaml` や `autolinking.json`、CMake キャッシュを手動で直接編集してはなりません。`-CleanNative` オプションは、生成状態を正しく再構築した後に、既存キャッシュの再利用が不適切と判断された場合にのみ使用します。再リンクおよびプリビルドを実行しても同一のエラーが解消しない場合は、ログ末尾の `FAILED`／`Caused by` の出力と `.artifacts/native-local/<timestamp>/build/assemble-release.log` を退避・保存したうえで、調査を中断（停止）してください。