# Cloudflare Pages デプロイ設計

## 1. フェーズ1 プロジェクト

Cloudflare Pagesのプロジェクトは1つのみ運用します。

| プロジェクト | ビルド | テストAPI | 用途 |
|---|---|---:|---|
| `ec-training-automation` | automation | ○ | Playwright・QA学習・手動確認 |

一般向けの公開デモ（Public Demo）環境については、フェーズ3で必要性を再評価します。初期段階から2つのプロジェクトを並行運用することはありません。

## 2. 設定

- Expo Webの設定: `output: single`
- ビルドコマンド: `pnpm run build:web`
- 出力先ディレクトリ: `dist`
- 本番ブランチ: `main`
- Bot Fight Mode、Challenge、Turnstile、Cloudflare Accessは使用しない
- Pages Functions、Workers、サーバーAPIは使用しない

### 2.1 package scripts

```json
{
  "scripts": {
    "generate:image-manifest": "tsx scripts/generate-image-manifest.ts",
    "validate:image-manifest": "tsx scripts/validate-image-manifest.ts",
    "build:web": "pnpm run generate:image-manifest && pnpm run validate:image-manifest && expo export --platform web"
  }
}
```

Cloudflare Pages、ローカルのリリースビルド、CI環境におけるWebビルドは、すべて共通して`pnpm run build:web`を使用します。マニフェストの生成や検証をバイパスするような別のビルドコマンドは用意しません。

## 3. ビルド環境変数

```text
EXPO_PUBLIC_APP_ENV=automation
EXPO_PUBLIC_BUILD_KIND=automation
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_DEFAULT_SEED=default
```

ビルドSHA、アプリ／スキーマ／シードの各バージョン情報を含めます。シークレットなどの秘密情報は設定しません。

## 4. プレビュー環境

- プルリクエスト（PR）ごとにプレビュー環境を生成する。
- Dependabotなどの自動更新ブランチはプレビュー生成の対象外に設定できる。
- プレビュー環境ごとにオリジン（Origin）が異なり、IndexedDBのデータ領域も独立して管理される。
- E2Eテストは、各プレビュー環境でデータのリセットおよびシード投入を行ってから実行する。

## 5. SPA・ヘッダー

- 独自の静的ファイル`404.html`は配置せず、Expo Routerの`+not-found`ルートを使用する。
- `_headers`:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Robots-Tag: noindex
```

## 6. キャッシュ

- ハッシュ値が付与されたアセットファイルには標準キャッシュを適用する。
- HTMLファイルは長期キャッシュで固定しない。
- シードデータ用のアセットにはバージョンを付与して管理する。
- 業務データはブラウザ内部のみに保持する。

## 7. スモークテスト

- HTTPステータス200の返却とテストモードバッジの表示確認
- テストAPIメタデータの取得確認
- リセット処理およびデフォルトシード投入の動作確認
- ホーム画面、検索サジェスト、商品検索の動作確認
- ログイン、正常な商品購入フロー、注文詳細画面の表示確認
- 管理者概要（Admin Overview）画面の表示確認

## 8. ロールバック

データベーススキーマの変更を含まないデプロイであれば、直前の正常デプロイへロールバックが可能です。スキーマ変更を伴うデプロイ後のロールバックについては、データの互換性を慎重に確認し、安易には実施しません。

## 9. フェーズ3

一般公開用の閲覧URLが実際に必要になった段階でのみ公開用プロジェクトを分離し、テスト用モジュールをビルドグラフから除外します。

## 商品画像配信

`public/images/products/`内の画像アセットおよび診断用の`product-image-manifest.json`を、Expoのエクスポート成果物に含めます。ランタイム環境では、ビルド時に事前生成された`src/generated/product-image-manifest.ts`をバンドル内から参照して使用します。
`pnpm run build:web`の実行時には先頭でマニフェストの生成と検証を必ず実行し、ファイルの欠落・ハッシュ値の不一致・500KBを超えるファイルが存在する場合はデプロイ失敗（ビルドエラー）として扱います。クライアント側からGitHub APIへの書き込み処理は行いません。