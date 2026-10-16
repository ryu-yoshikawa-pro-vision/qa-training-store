# Scenario Shop

Playwrightを中心としたテスト自動化の学習・検証を目的とした模擬EC Webアプリケーションです。

商品の検索、カート操作、購入、決済失敗、在庫競合、注文・配送、レビューから、商品・在庫・ユーザー管理に至るまで、一般的なECサイトおよびSaaS型管理画面における主要なユースケースを網羅して再現しています。

テストを安定して繰り返し実行できるように、固定シード（Seed）、データベースリセット、テストクロック（Test Clock）、決済遅延シミュレーション、内部状態確認用API（Inspection API）を備えています。

> [!IMPORTANT]
> このアプリはテスト自動化の学習・検証専用です。実際の商品の売買、実決済、配送手配、外部APIとの通信は行われません。

Production Web: [https://ec-test-automation-store.pages.dev/](https://ec-test-automation-store.pages.dev/)

## このアプリで学べること

- Playwrightを用いたストアフロント（Storefront）および管理画面のE2Eテスト
- guest、customer、operator、adminの各権限・ロール別テスト
- 商品検索、フィルター絞り込み、カート、チェックアウト、注文・配送の状態遷移テスト
- 価格変更、在庫不足、バージョン競合などの境界値・異常系テスト
- 決済成功、利用拒否（カードエラー）、再試行、中断処理再開のテスト
- シード値、リセット、テストクロックを活用した決定論的なテスト手法
- UI表示とIndexedDBの内部状態を組み合わせた検証
- アクセシビリティ、キーボード操作、モバイル表示境界の検証

## 対象範囲

現在の実装はWebのPhase 1と、NativeのPhase 2（Guestのストアフロント／カートおよびCustomerの購入フロー）を対象としています。Native環境での管理画面（Admin）およびゲスト購入（Guest Checkout）は対象外です。

| 項目 | 内容 |
|---|---|
| プラットフォーム | デスクトップ / モバイル Web |
| ストアフロント | ホーム、商品一覧、検索、カテゴリー、商品詳細、カート |
| カスタマー | アカウント、配送先管理、チェックアウト、注文履歴、レビュー |
| 管理画面（Admin console） | 概要（Overview）、商品管理、カテゴリー、ブランド、在庫、注文、レビュー、ユーザー管理 |
| データベース | IndexedDB + Dexie |
| 決済 | 決定論的なローカルモック（Local Mock） |
| E2Eテスト | Playwright |
| ホスティング | Cloudflare Pages |
| 管理画面の動作要件 | 1024px以上のデスクトップWeb |
| 購入可能なロール | 有効（active）なカスタマー（customer） |
| Native カスタマー機能 | Guestホーム、カタログ、検索、カテゴリー、商品詳細、バリエーション選択、カート、ログイン、アカウント、配送先管理、チェックアウト、決済、注文履歴、レビュー |
| Native データベース | SQLite（Customer専用スキーマ） + Native KV |
| Native アプリ識別子 | Android `com.ryuyoshikawa.scenarioshop` / iOS `com.ryuyoshikawa.scenarioshop` |

## 主な機能

### ストアフロント（Storefront）

- ホーム画面
- 商品一覧、検索、インクリメンタル検索候補
- カテゴリー、ブランド、価格帯、評価、セール有無による絞り込み（フィルター）
- 商品詳細、画像ギャラリー、バリエーション（サイズ・カラー等）選択
- ゲスト用カート
- ログイン、新規会員登録
- 利用規約、プライバシーポリシー、特定商取引法に基づく表記

### カスタマー（Customer）

- プロフィール編集
- 配送先の登録・編集・削除
- チェックアウト（情報入力、確認、処理中、完了、失敗）
- 決済成功、カード利用拒否、再試行処理
- チェックアウトの再開とカートバージョンの不一致検出
- 注文履歴一覧、注文詳細
- レビューの投稿・編集・削除

### オペレーター / 管理者（Operator / Admin）

- 管理ダッシュボード（概要）
- 商品・SKUの登録および編集
- 静的画像アセットの商品への関連付け・並べ替え
- 商品の公開・非公開切り替え、および削除制約
- カテゴリー・ブランドの管理
- 在庫調整と在庫変動履歴の確認
- 注文の準備中、発送済み、配達完了ステータス更新
- 投稿レビューの公開状態管理

### 管理者（Admin専用）

- ユーザー一覧・詳細
- customerロールの会員ランク変更
- operatorとadmin間のロール変更
- ユーザーのアカウント利用停止・再開
- 最後の管理者を誤って削除・降格させない保護制約
- ローカル／自動化ビルド環境におけるテストコントロール機能

## 技術スタック

- Expo / Expo Router
- React / React Native Web
- TypeScript
- IndexedDB / Dexie
- React Hook Form / Zod
- Vitest / Testing Library
- Playwright / axe-core
- Cloudflare Pages
- pnpm

## GitHub Codespaces

リポジトリの **Code → Codespaces** から開発用のCodespaceを作成できます。開発コンテナには、Node.js、pnpm、GitHub CLI、OpenCode CLI、Codex CLI、Chromiumに加え、Codex／OpenCode／PlaywrightのVS Code拡張機能があらかじめ準備されています。初回作成、シークレットの設定、Web起動、録画、Git操作、停止手順については[Codespaces利用ガイド](docs/guides/codespaces.md)を参照してください。起動後は次のコマンドで各ツールのバージョンを確認できます。

```bash
node --version
pnpm --version
gh --version
opencode --version
codex --version
```

### OpenCode Zen（個人のシークレットを使用）

通常利用では、各利用者が自身のOpenCode Zen APIキーを取得し、個人のCodespacesシークレット `OPENCODE_API_KEY` に登録します。設定手順は[Codespaces利用ガイドのSecret登録手順](docs/guides/codespaces.md#1-利用前にopencode-zenのsecretを登録する)を参照してください。`opencode` を起動した後は、利用時点で無料（Free）と確認できたモデルのみを選択してください。モデルIDはリポジトリ設定に固定されていません。なお、PR #188で実施したキー不要の無料モデル検証は、通常のシークレット運用とは異なります。

### Codex

リモートのCodespaceでは、ChatGPT側でCodex CLIのデバイスコード認証（device-code）を有効にした後、次のコマンドでChatGPTへログインできます。

```bash
codex login --device-auth
codex login status
```

ログアウトする場合は `codex logout` を実行してください。本Codespaces環境では、APIキー、アクセストークン、認証キャッシュを手動コピーする運用には切り替えません。

### Playwright Desktop

Webアプリを `pnpm run start:web` で起動するとポート8081番を利用できます。Codespace内のChromiumとPlaywright InspectorをGUIで操作するときは、Portsタブから **Playwright Desktop (6080)** を開きます。このポートはGitHub Codespacesのプライベート設定のまま使用してください。5901番ポートは公開しません。

通常のPlaywright録画は次のコマンドで開始できます。

```bash
pnpm exec playwright codegen http://127.0.0.1:8081
```

Playwright拡張機能は導入されていますが、Testingサイドバーや `Record new`、`Record at cursor` などの拡張個別機能の動作はPR #188時点では未確認です。CLI版の `codegen` は正常動作を確認済みです。Codespaces環境、認証、拡張機能、GUI録画の詳細な検証条件は[Codespaces / OpenCode / Codex Plan](docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md)および[IDE / Playwright Plan](docs/plans/2026-10-04_160000_codespaces-ide-playwright-recording.md)を参照してください。

## 仕様とAgentic QA

- 正式製品仕様（Normative Product Specification）: [`docs/spec/README.md`](docs/spec/README.md)
- 本番公開仕様（Production Specification）: [https://ec-test-automation-store.pages.dev/docs/spec/](https://ec-test-automation-store.pages.dev/docs/spec/)
- Agentic QA実行契約: [`QA_AGENT.md`](QA_AGENT.md)
- Agentic QAワークフロー: [`docs/reference/agentic-qa-workflow.md`](docs/reference/agentic-qa-workflow.md)
- 学習者向けセーフチャレンジ（Learner-safe Challenge）: [`training/agentic-qa/`](training/agentic-qa/)

## コントリビューション / セキュリティ

- 不具合報告: [不具合報告 Issue Form](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/new?template=bug_report.yml)
- 機能要望: [機能要望 Issue Form](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/new?template=feature_request.yml)
- プルリクエスト: [`CONTRIBUTING.md`](CONTRIBUTING.md)とPull Request用テンプレートを確認してください。
- 文書作成ルール: [`docs/WRITING_STANDARDS.md`](docs/WRITING_STANDARDS.md) を確認してください。
- セキュリティ脆弱性の報告: 公開IssueやPull Requestには投稿せず、[`SECURITY.md`](SECURITY.md)に記載されているGitHub Private Vulnerability Reportingを使用してください。

## テスト自動化カリキュラム / Training

- カリキュラム案内: [`docs/curriculum/test-automation/README.md`](docs/curriculum/test-automation/README.md)
- 本番公開カリキュラム: [https://ec-test-automation-store.pages.dev/docs/curriculum/](https://ec-test-automation-store.pages.dev/docs/curriculum/)
- 必須のカリキュラム検証コマンド: `pnpm run validate:curriculum`
- Training Web ベースライン検証: `pnpm run training:web:baseline`（`PLAYWRIGHT_BASE_URL` で専用ランタイムを指定）
- Training Web プロジェクト構成: `training-chromium` / `training-mobile-chromium`
- Training Native ベースライン検証: `pnpm run training:native:baseline`（Androidランタイムのみ）

本番向け回帰テスト（Formal Regression）とトレーニング用テスト（Training Test）は、それぞれ別の設定ファイル（Config）およびディレクトリで管理しています。現在のNative環境における品質保証範囲は、Androidが「ビルド＋ランタイムE2Eテスト」、iOSは「ビルド確認のみ（Build-only）」です。iOS環境でのランタイム動作やMaestroテストの成功（PASS）は、現時点では正式な保証範囲として扱いません。

依存パッケージのバージョン指定は [`package.json`](./package.json)、実際に解決される固定バージョンは [`pnpm-lock.yaml`](./pnpm-lock.yaml) を参照してください。

## セットアップ

### 前提環境

- Node.js 24
- pnpm 10.34.5

### インストール手順

```bash
corepack enable
pnpm install --frozen-lockfile
```

## ローカル起動

```bash
pnpm run start:web
```

Expoが表示するローカルURLをブラウザで開いてください。

### Webアプリのビルド

現在のランタイム環境設定でWeb向けビルドを生成します。

```bash
pnpm run build:web
```

フォントアセットの準備、商品画像マニフェストの生成・検証、Expo Web Exportが順次実行され、成果物が `dist/` ディレクトリへ出力されます。

本番向けビルド（Production Build）は、CI/CD環境で本番用の環境変数を設定した上で実行します。

### Nativeアプリのローカルビルド

Nativeアプリのビルドは、ローカルのWindowsまたはmacOS環境でのビルド経路を正式な主経路としています。日常的なビルド・検証・ストア提出において、EAS Cloud BuildやEAS Workflowは使用しません。`expo prebuild` によって生成される `android/` および `ios/` ディレクトリ、APK、Simulator App、署名鍵などのビルド成果物や機密認証情報は、リポジトリにコミットしません。

```bash
pnpm run generate:native-assets
pnpm run check:native-route-dependencies
pnpm exec expo prebuild
```

#### Windows環境 / Androidビルド

Android Studio、JDK、Android SDK、Platform Tools、およびエミュレーターまたは実機を準備し、パッケージ名 `com.ryuyoshikawa.scenarioshop` を対象に開発用（Dev）またはリリース用（Release）のビルドをローカルで実行します。

```powershell
pnpm run build:native:android
pnpm run build:native:android:release
cd android
.\gradlew.bat assembleRelease
cd ..
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

Release APKは、端末側で管理するGradle signing configやキーストア（keystore）を使用して署名します。Expoの生成テンプレートは未設定時にdebug keystoreを使用するため、正式なリリース署名を確認する場合は、Android StudioまたはGradleにローカルキーストアを設定してください。キーストア本体、パスワード、`*.jks`、`*.keystore` ファイルはリポジトリに保存しません。`expo run:android --variant release` が生成するインストール用成果物と、署名済み `assembleRelease` APKの検証結果は分けて記録します。

#### macOS環境 / iOSビルド

Xcode、Command Line Tools、CocoaPods、iOS Simulatorを準備し、バンドルID `com.ryuyoshikawa.scenarioshop` を対象に開発用（Dev）またはリリース用（Release）のSimulator向けビルドをローカルで実行します。

```bash
pnpm run build:native:ios
pnpm run build:native:ios:release
```

必要に応じて、Xcodeから個人所有のiPhone実機へインストールして実行します。個人端末での検証は開発用署名（Development Signing）の範囲に限定し、配布用IPAの作成やストアへの提出作業は行いません。

#### Native実環境の検証手順

Androidの正式ランタイムゲートでは、アプリのインストール・起動後に以下の順序で実操作を行います。

1. ホーム → 商品一覧 / 検索 / カテゴリー → 商品詳細 → バリエーション選択 → 「カートに追加」
2. カート画面で数量変更・削除・空状態（Empty State）の表示を確認
3. アプリ再起動後にゲスト識別子（Guest Identity）とカート状態が正しく復元されることを確認
4. ローカルビルドおよび自動化ビルドにおいて、テストコントロールのディープリンク（Deep Link）とReady / Errorシグナルを確認
5. 本番検証用ビルド（production validation）において、テストコントロールやテストハーネスが呼び出し不能であることを確認

iOSの正式CIはSimulator向けビルド確認のみ（Build-only）です。iOSでは自動化向け（Automation）および本番検証向け（Production-validation）のRelease `.app` ビルド、ビルドメタデータ、プロダクションバンドルガード（Production Bundle Guard）、成果物のバリデーションを必須（Required）として検証します。Simulatorへのインストール、アプリ起動、Maestroによる操作、実環境での `expo-sqlite` ランタイム動作は正式ゲートには含めません。

WebとNativeの表示比較は、標準解像度 `390×844`、追加で最小解像度 `320×700` を対象とします。ホーム、カタログ、商品詳細、カートの情報配置順序、商品画像の縦横比、カラー、スペーシング、角丸（Radius）、タイポグラフィには共通のデザイントークンを使用し、プラットフォーム固有のヘッダー、ナビゲーション、Nativeコンポーネントによる差異のみを許容します。Native UIの実装において、WebのDOM、CSS、React Ariaコンポーネントを再利用することはありません。

`pnpm run test:repository` には、Node.js 24組み込みのSQLiteを使用したNative Customer Adapterの実際のSQL、外部キー制約（FK）、シード、カタログ、カート契約テストが含まれます。ただし、これはAndroid実機やiOS Simulator上の `expo-sqlite` での実行確認を代替するものではありません。

自動化ビルドおよび開発ビルドの `/admin/test-control` には、専用のDBとKV名前空間を用いて定義済みのカスタマー契約、FK違反、カート操作（追加・更新・削除）、アプリケーションDBの不変性を検証するNative Contract Harnessが用意されています。「Native contract passed」は、クリーンアップとアプリケーションDBの整合性確認がすべて成功した後にのみ表示されます。本番向けビルドでは、モジュール解決（Module Resolution）の仕組みにより、テストコントロールおよびハーネスの画面と実装コードが成果物から完全に除外されます。

テストコントロールはローカルビルドおよび自動化ビルドでのみ利用可能です。

```text
scenario-shop://test-control/reset?version=1&scenario=default&clock=2026-07-01T03:00:00.000Z&paymentDelayMs=0
```

本番向けビルドではテストコントロール機能は有効化されません。EAS Build、EAS Workflow、EAS Submit、および各アプリストアへの公開手順は、本リポジトリの運用手順には含めません。

#### EASの位置づけ（静的定義・将来用）

`eas.json` と `.eas/workflows/phase2-native-foundation.yml` は、プロファイル・環境マッピング情報と、将来の手動ワークフロー構成を静的に保持する目的でのみ配置されています。ワークフローは手動トリガー（`workflow_dispatch`）のみを想定しており、クラウドビルド、Maestro、ストア提出はこの経路では実行しません。

```bash
pnpm run validate:eas:config
pnpm run validate:native-production-bundle
```

`validate:native-production-bundle` は、自動化向けおよび本番向けに生成されたAndroidバンドル（Hermesの `.hbc` を含む）を静的に検査します。EAS Cloud上でのワークフロー検証や実行は行いません。

Phase 2後半の購入フローでは、ログイン・セッション管理、ゲストカートの会員カート統合、プロフィール・配送先管理、チェックアウト・モック決済、注文履歴、レビュー機能をNativeアプリ向けに提供します。Androidの実機ランタイム検証手順は [`docs/native/windows-android-local-validation.md`](docs/native/windows-android-local-validation.md)、iOSのmacOSおよびGitHub Actions環境におけるビルドオンリー契約は [`docs/plans/phase2-native-goal/02_phase2-second-half-purchase-automation.md`](docs/plans/phase2-native-goal/02_phase2-second-half-purchase-automation.md) および `.github/workflows/native-ios-ci.yml` を参照してください。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/native/windows/android-local.ps1 `
  -Action Doctor

powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/native/windows/android-local.ps1 `
  -Action All
```

## テストアカウント

初期登録されているテストアカウントの共通パスワードは以下のとおりです。

```text
testpass1
```

| 用途 | メールアドレス | ロール（Role） | ランク / ステータス |
|---|---|---|---|
| 一般会員 | `regular@example.com` | customer | regular / active |
| ゴールド会員 | `gold@example.com` | customer | gold / active |
| プラチナ会員 | `platinum@example.com` | customer | platinum / active |
| 利用停止会員 | `suspended@example.com` | customer | regular / suspended |
| 退会済み会員 | `withdrawn@example.com` | customer | regular / withdrawn |
| 店舗担当者 | `operator@example.com` | operator | active |
| 管理者 | `admin@example.com` | admin | active |

`suspended`（利用停止）および `withdrawn`（退会済み）のアカウントは、ログイン拒否やアクセス制限のテストに使用します。

## シードシナリオ一覧

テストコントロール画面、またはPlaywrightのテストフィクスチャ（Fixture）から、検証目的に応じた初期状態へデータベースをリセットできます。

代表的なシナリオは以下のとおりです。

| シナリオ名 | 主な用途 |
|---|---|
| `default` | 標準的な初期状態 |
| `empty-catalog` | 商品が0件の状態 |
| `many-products` | 大量の商品データとページネーションの検証 |
| `out-of-stock` | 在庫切れ状態 |
| `low-stock` | 在庫僅少（残りわずか）状態 |
| `sale-active` | セール開催期間中 |
| `expired-sale` | セール期間終了後の状態 |
| `regular-member` | 一般会員としてログイン済みのセッション |
| `gold-member` | ゴールド会員としてログイン済みのセッション |
| `platinum-member` | プラチナ会員としてログイン済みのセッション |
| `suspended-user` | 利用停止ユーザーの状態 |
| `cart-with-invalid-items` | 価格変更や在庫切れ商品を含むカート状態 |
| `payment-declined` | 決済の利用拒否（カードエラー等） |
| `payment-processing` | 決済処理中の状態 |
| `checkout-resume` | チェックアウト処理の中断と再開 |
| `cart-version-invalidates-checkout` | カートバージョン不一致によるチェックアウト無効化 |
| `product-aggregate-edit` | 商品集約（Aggregate）データの編集 |
| `cross-role-product-lifecycle` | 管理者による商品登録から購入・レビューまでのロール横断フロー |
| `product-delete-blocked` | 制約により商品削除が拒否される状態 |
| `admin-bulk-partial-failure` | 一括操作における一部失敗の検証 |
| `storage-write-failure` | ストレージ書き込み失敗の検証 |

全シナリオの完全な一覧は [`src/seeds/metadata.ts`](./src/seeds/metadata.ts) を参照してください。

## テスト用API（Test API）

ローカルビルドおよび自動化ビルド環境では、ブラウザのグローバルオブジェクト `window.__TEST_API__` を通じてテスト制御APIを利用できます。

主な操作は以下のとおりです。

- `reset({ scenario })`  
  指定したシナリオでデータベースを初期化します。
- `setClock(isoString | null)`  
  テスト用の固定日時を設定します。`null` を渡すと固定を解除してシステム時刻に戻ります。
- `setPaymentDelay(milliseconds)`  
  決済処理の疑似遅延時間を0〜30,000ミリ秒の間で設定します。
- `getMetadata()`  
  現在のシードメタデータや環境設定を取得します。
- `inspectOrder(orderId)`  
  内部の注文データを検証用に取得します。
- `inspectVariant(variantId)`  
  商品バリエーションの内部状態を取得します。
- `inspectReviewSummary(productId)`  
  商品のレビュー集計状態を取得します。

本番向けビルド（Production Build）にはTest APIは公開されません。

ローカルまたは自動化ビルド環境で管理者（admin）としてログインしている場合、`/admin/test-control` 画面からシナリオ切り替え、基準時刻、決済遅延をGUI上で変更できます。

### データベースリセット時の注意事項

データベースリセットを実行すると、IndexedDBを物理的に削除した上で新しいデータベースインスタンスを再生成します。

- 管理画面のテストコントロール機能では、リセット完了後に自動で画面がリロードされます。
- Playwrightの `scenario` フィクスチャは、同一ブラウザコンテキスト内の余分なページを自動で閉じ、リセット後のページリロードまで一括して行います。
- `window.__TEST_API__.reset()` を直接スクリプトから呼び出す場合は、リセット完了後に手動でページをリロードしてください。
- リセット処理は、1つのブラウザコンテキスト内で1つのページのみを開いている状態を前提としています。リセットを実行する前に、同一コンテキスト内の別タブや別ウィンドウを閉じてください。

```ts
await scenario("payment-declined");
```

## テストと検証コマンド

### コードフォーマット・静的解析

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run validate:image-manifest
pnpm run security:check
pnpm run generate:native-assets
git diff --exit-code -- src/generated/native-product-assets.ts
pnpm run validate:native-production-bundle
```

### Vitest（単体・結合・契約テスト）

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component
pnpm run test:contracts
```

すべてのVitestテストを一括実行する場合は、次のコマンドを使用します。

```bash
pnpm run test
```

### Playwright（E2Eテスト）

Chromiumブラウザのみを対象とする場合は、Chromiumをインストールします。

```bash
pnpm exec playwright install chromium
```

FirefoxやWebKitを含む全ブラウザでE2Eテストを実行する場合は、すべてのブラウザをインストールします。

```bash
pnpm exec playwright install chromium firefox webkit
```

主なテストコマンドは以下のとおりです。

```bash
pnpm run test:e2e
pnpm run test:a11y
pnpm run test:e2e:mobile
pnpm run test:e2e:mobile-boundary
pnpm run test:e2e:cross-role
pnpm run test:e2e:smoke:firefox
pnpm run test:e2e:smoke:webkit
```

### 一括検証コマンド

```bash
pnpm run verify
```

`verify` スクリプトは、フォーマットチェック、Lint、型チェック（Typecheck）、商品画像マニフェスト検証、セキュリティチェック、Vitest、Webアプリのビルドを一括で実行します。PlaywrightによるE2Eテストは含まれないため、必要に応じて個別に実行してください。

### Nativeアプリの検証状況（2026-08-09時点）

#### 検証完了・成功項目

- ディープリンク純粋関数、Native向けシナリオ許可リスト、未ログイン（Guest）での更新拒否、リセット時のロールバック、テストハーネスのシグナル順序、バリエーション未選択時の単体／契約／コンポーネントテスト
- Native Customer向けのアプリケーションユースケース共通配線、本番向けモジュール解決、生成バンドルに対するプロダクションバンドルガードの適用確認
- Nativeアセット生成差分の検証、型チェック、Lint、セキュリティスキャン、Node組み込みSQLite／Web／Nativeの各種回帰テスト（個別の結果は実行ログおよび成果物を参照）
- Android／iOSのCIワークフロー定義、Androidビルド／ランタイム検証、iOSビルドオンリー／成果物アップロード／最終検証のワークフロー契約テスト
- iOSビルドにおいて、ソースコード側のExpoメタデータ解決に加えて、生成された `.app` 内の `EXConstants.bundle/app.config` に含まれる `appEnvironment`、`buildKind`、`testMode` を直接検証し、本番マーカーガードと固定名アセットのアップロードを確認
- Android実機環境において、修正後の自動化向けAPKビルド `20260808-231500-android-postfix-build` の生成、インストール、スモークテスト、ゲストカート数量1からログイン後統合で数量2になるケースを含む購入テスト（1/1 PASS）、決済再試行、チェックアウト再開、レビュー投稿、ランタイム検証（5/5 PASS）、境界値検証（5/5 PASS）を完了。修正後の本番向けAPKについても、短縮ワークスペース条件下でのビルド、マーカーガード、インストール、スモークテスト、本番検証（1/1 PASS）を完了。Web Chromiumでの回帰テストは全27件成功（PASS）。
- 最終自己レビューにおいて、Native SQLiteの行データ（Row）、Enum、集計値の処理をランタイムパーサーへ統一。カスタマートランザクションスコープの許可リスト化と、管理者用プレースホルダーの安全側（fail-close）境界設定を追加。全テスト（Unit: 65件、Integration: 95件、Repository: 31件、Web Component: 76件、Native Component: 38件、Contract: 158件）、型チェック、Prettier整形がすべて成功（PASS）。

#### 未実施・保留項目

- Windows環境にはXcodeおよびiOS Simulatorが存在しないため、ローカルでのiOS Simulatorビルドは未実施。現行の正式CIでは、iOSは自動化ビルドと本番向けビルドの独立実行、ビルド時メタデータと本番ガードの検証、成果物アップロードまでを必須（Required）とし、Simulator上でのランタイム実行、Maestro操作、実 `expo-sqlite` ランタイム動作は正式ゲートの対象外。
- 現在の環境からは、修正コミットに対するGitHubホストのNative CI実行結果、最新コミットでの `native-ci / verify` の成否、リモート成果物のダウンロード確認が未完了。ローカルでの静的検証およびAndroid実機での成功結果をもって、リモートCIの成功とはみなさない。
- EAS Cloud Build、EAS Workflow、EAS Submit、各ストアへの公開作業、およびPR本文の自動更新はPhase 2のスコープ外。

#### 現行Native CIの保証範囲

```text
Android: ビルド + エミュレーターランタイム / Maestro / 契約ハーネス / 本番検証用ランタイム
iOS:     自動化向けSimulatorビルド + 本番検証用Simulatorビルド
         + ビルド時メタデータ／本番ガード／成果物バリデーション
```

iOS Simulatorでのランタイム実行、iOS Maestroテスト、実機 `expo-sqlite` による契約ハーネス検証、およびiOS本番検証用ランタイムテストは、正式なNative CIゲートの対象外です。これはCIの一時的なスキップではなく、iOS Simulator環境をローカルで継続的かつ確実に再現・デバッグできる環境を現在の開発運用で常設していないことから、iOSにおける保守可能な保証範囲を「ビルド検証およびビルド時契約の担保」に限定するという設計上の判断に基づいています。Android環境についてはローカルでも継続的に再現・デバッグ可能なため、ランタイムゲートを維持しています。

以前のGitHub Actions実行（run `30775548618`）における `sdkmanager: command not found` エラーは修正前のベースラインログであり、現行ワークフローの成否を示すものではありません。コード修正、静的検証、Androidローカル実機検証は完了していますが、修正コミットに対するリモートCIの実行結果は未取得のため、最終的なリモートゲートは未確認として扱います。

## アーキテクチャ構成

```text
app/
  Expo Routerのルート定義

src/presentation/
  ページ、UIシェル、コンポーネント、ルートガード

src/application/
  ユースケース、DTO、ポートインターフェース、トランザクション管理

src/domain/
  ドメインエンティティ、ポリシー、価格計算ロジック、状態遷移

src/infrastructure/
  Dexie（IndexedDB）、セッション、クロック、決済モック、画像アセット

src/seeds/
  デフォルトデータセットおよびシナリオ別シードデータ

src/test-controls/
  リセット、時刻設定、遅延制御、内部状態検証API
```

Presentation層からIndexedDBを直接操作することは禁止されており、必ずApplication層のユースケースを経由します。複数のリポジトリを跨いで更新を行う処理は、Application Transactionの境界内で安全に実行されます。

## 主要ディレクトリ構成

| パス | 内容 |
|---|---|
| `app/` | Expo Routerによるルーティング定義 |
| `src/presentation/` | UIコンポーネント、レイアウトシェル、ルートガード |
| `src/application/` | ユースケース、DTO、ポート定義 |
| `src/domain/` | ドメインモデル、ビジネスルール、ドメインサービス |
| `src/infrastructure/` | Dexieなどの外部アダプター実装 |
| `src/seeds/` | 初期シードデータおよび各種シナリオデータ |
| `src/test-controls/` | テスト用制御API（Test API） |
| `tests/` | Vitestによる単体・結合・契約テスト |
| `e2e/web/` | PlaywrightによるE2Eテスト |
| `scripts/` | ビルド、セキュリティスキャン、アセット検証用スクリプト |
| `public/` | 静的アセットおよびCloudflare向けヘッダー設定 |
| `docs/` | プロジェクト運用ドキュメント、ADR、計画書、レポート |

AIエージェントによる開発作業ルールについては、[`AGENTS.md`](./AGENTS.md) および [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md) を参照してください。

## CI/CDパイプライン

プルリクエスト（Pull Request）作成時には、主に以下の項目を自動検証します。

- コードフォーマット、Lint、TypeScript型チェック
- 商品画像マニフェストの整合性
- 認証情報漏洩の防止およびランタイムセキュリティの静的検証
- 単体テスト、結合テスト、リポジトリ契約テスト、コンポーネントテスト、API契約テスト
- 自動化検証用設定でのWebビルド
- 本番設定でのWebビルド
- Chromium環境でのE2Eテスト
- アクセシビリティ検証（axe-core）
- モバイル表示における管理画面の境界テスト
- デスクトップ、タブレット、モバイル、極小モバイルの各画面幅におけるUIスクリーンショット差分確認

mainブランチへのマージ時、定期実行、手動実行時には、上記に加えてMobile Chromium、ロール横断フロー、Firefox、WebKit環境でのスモーク検証も実行されます。

Cloudflareのデプロイ用シークレットが設定されている環境では、プルリクエストごとのプレビュー環境構築およびmainブランチへの本番自動デプロイが実行されます。

## 制約事項

本アプリケーションはテスト自動化の学習・研究用です。実運用システムとは以下の点で仕様が異なります。

- 実際の商品の販売、実決済、配送手配は行いません。
- 独立したバックエンドサーバーは存在しません。
- データベース、セッション情報、ゲスト識別子はすべてクライアントのブラウザ内に保存されます。
- 認証および認可制御は、実サービス同等のセキュリティ強度を保証するものではありません。
- 外部の決済ゲートウェイ、メール配信サービス、配送追跡APIなどは使用しません。
- 複数端末間や異なるブラウザ間でのデータ同期には対応していません。
- バックエンドAPIの通信障害やネットワーク遅延、サーバーサイド認可エラーの学習はスコープ外です。
- 商品画像はリポジトリに静的に同梱されたアセットから選択する仕様となっており、管理画面からの新規画像ファイルアップロードには対応していません。
- ゲスト購入、クーポン、ポイント、お気に入り（Wishlist）、返品、返金機能は対象外です。
- 管理画面は画面幅1024px以上のデスクトップ環境を前提としています。

本アプリは、実サービスのセキュリティ要件、バックエンド構築、外部サービス連携を学習する教材としては適していません。主な学習対象は、Web UIの自動操作、クライアントサイドの状態管理、ビジネスロジックの検証、ロール別の権限操作、アクセシビリティテストの自動化です。

## Native対応の詳細

Native版はPhase 2として開発されており、ゲスト向けのホーム、カタログ、商品検索、カテゴリー、商品詳細、バリエーション選択、カート、利用ガイド／法表記に加え、ログインユーザー向けのセッション管理、プロフィール・配送先編集、チェックアウト／モック決済、注文履歴確認、レビュー機能を実装しています。Native環境での管理画面（Admin）およびゲスト購入は対象外です。

Native版はWeb版とは分離されたルート（Root / Route）、UIシェル、Customer専用のSQLiteスキーマ、Native KV、PBKDF2暗号化アダプターを使用します。カラー、8pxグリッド、角丸、タイポグラフィ、タッチターゲットサイズ、商品画像の縦横比は `src/presentation/design/tokens.ts` を共通契約とし、Native固有のスタイルおよびプリミティブコンポーネントへ接続しています。現行の開発検証では、Android実機環境における購入フローおよび本番検証ビルドの正常動作を確認済みです。iOSの正式な保証範囲はビルド確認のみ（Build-only）であり、修正コミットに対するGitHubホストのリモートCI検証は未完了のため、リモートでの完了判定には含めていません。EASについては設定ファイルの静的検証のみを実施し、クラウド上でのビルド・ワークフロー実行・ストア提出は行いません。