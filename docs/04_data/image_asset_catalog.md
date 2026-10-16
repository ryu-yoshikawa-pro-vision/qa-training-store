# GitHub商品画像アセットカタログ設計

## 1. 目的

バックエンドを持たないフェーズ1において、商品画像を安全かつ決定的に利用するため、GitHubリポジトリ内の静的画像を正本とします。管理画面からは画像バイナリを直接アップロードせず、登録済みのアセットと商品とを関連付けます。

## 2. ディレクトリ構成

```text
public/
├── images/
│   ├── products/
│   │   ├── basic-shirt-front.a1b2c3.webp
│   │   ├── basic-shirt-back.d4e5f6.webp
│   │   └── ...
│   └── product-image-manifest.json
config/
└── product-image-assets.json
scripts/
└── generate-image-manifest.ts
```

Cloudflare Pagesでは、`/images/products/...` として同一オリジンから配信します。

## 3. マニフェスト

```typescript
type ProductImageAssetManifest = {
  version: number;
  generatedAt: string;
  assets: Array<{
    assetId: string;
    path: string;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    width: number;
    height: number;
    bytes: number;
    sha256: string;
    defaultAltText: string;
    tags: string[];
    isActive: boolean;
  }>;
};
```

- `config/product-image-assets.json` に `assetId`、`path`、`defaultAltText`、`tags`、`isActive` を定義し、生成スクリプトが実ファイルからMIMEタイプ、寸法、ファイルサイズ、SHA-256ハッシュを補完します。
- `assetId` と `path` は一意（ユニーク）である必要があります。
- `path` は `/images/products/` 配下のみを許可します。
- 有効なアセット（`isActive: true`）のみを新規選択の候補として表示します。
- 無効化されたアセット（`isActive: false`）であっても、既存商品から参照されている場合は継続して表示可能です。

## 4. 管理画面の操作

管理者がアプリ内で実行できる操作:

- アセットカタログの検索・選択
- 商品への画像関連付けの追加
- 関連付けの解除
- メイン画像（Primary画像）の変更
- 表示順序の変更
- 商品固有の代替テキスト（Altテキスト）の変更

管理者がアプリ内で実行しない（禁止されている）操作:

- ローカルファイルのアップロード
- GitHubへの画像バイナリの追加・上書き・削除
- GitHubトークンの入力
- 外部URLによる画像の登録

新しい画像を利用する場合は、リポジトリ管理者がファイルの追加、マニフェストメタデータの追加・生成、プルリクエストのレビュー、Cloudflareへのデプロイという正規のフローを実施します。

## 5. 不変ルール

- 公開済みアセットのバイナリを、同一パスで上書きしてはなりません。
- 画像を変更する場合は、新しいハッシュを含むファイル名・新しい `assetId` として新規追加します。
- リリース済みのアセットは、使用状況にかかわらず物理削除しません。GitHub CI上ではユーザーごとのIndexedDBによる参照状況を把握できないため、削除可否の判定を行わない方針とします。
- 商品画像の関連付け解除や商品自体の削除を行っても、アセットのバイナリファイルは削除しません。
- アセットの廃止は `isActive=false` のフラグ変更のみで表現し、パス、実ファイル、マニフェストエントリはそのまま保持します。

このルールにより、注文履歴や初期データ（Seed）のスクリーンショットが、後から意図せず別の画像に差し替わる事態を防ぎます。

## 6. ビルド検証

CIでは以下の項目を自動検証します。

1. マニフェストのスキーマ検証（Manifest Schema）
2. アセットファイルの実体が存在すること
3. MIMEタイプと拡張子の一致
4. 1ファイルあたり500KB以下であること
5. 画像寸法および1:1（正方形）比率の検証（必要に応じた警告）
6. SHA-256ハッシュの一致
7. `assetId` および `path` の重複がないこと
8. シードデータ（Seed）が参照する `assetId` が存在すること
9. シードデータおよび静的フィクスチャ（Fixture）が参照する `assetId` が存在すること
10. リリース済みマニフェストエントリのパスおよびファイルが、過去のバージョンから削除されていないこと

## 7. テスト観点

- マニフェストリポジトリの契約テスト（Contract Test）
- 有効／無効（active / inactive）アセットのフィルタリング検証
- 既存の無効アセット関連付けの維持、新規関連付けの拒否、解除後の再関連付け拒否の検証
- 存在しない `assetId` を指定した際のバリデーションエラー検証
- 商品への画像関連付け上限（最大3件）の検証
- メイン画像（Primary画像）が必ず1件設定されていることの検証
- 上下移動ボタンによる並び順変更の動作検証
- アセット読み込み失敗時のプレースホルダー表示検証
- 商品削除後もアセットのURLが保持されることの検証