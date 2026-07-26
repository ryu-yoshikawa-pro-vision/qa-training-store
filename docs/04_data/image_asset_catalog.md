# GitHub商品画像Asset Catalog設計

## 1. 目的

Backendを持たないPhase 1で、商品画像を安全かつ決定的に利用するため、GitHub Repository内の静的画像を正本とします。管理画面は画像BinaryをUploadせず、登録済みAssetと商品を関連付けます。

## 2. Directory

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

Cloudflare Pagesでは`/images/products/...`として同一Origin配信します。

## 3. Manifest

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

- `config/product-image-assets.json`にassetId、path、defaultAltText、tags、isActiveを記述し、生成ScriptがFileからMIME、寸法、容量、SHA-256を補完する。
- `assetId`と`path`はunique。
- Pathは`/images/products/`配下だけを許可する。
- active Assetだけを新規選択候補へ表示する。
- inactive Assetも既存商品が参照している場合は表示できる。

## 4. 管理画面操作

管理者がアプリ内で実行できること:

- Asset Catalogの検索・選択
- 商品への関連付け追加
- 関連解除
- Primary画像変更
- 表示順変更
- Product固有Alt Text変更

管理者がアプリ内で実行しないこと:

- Local FileのUpload
- GitHubへのBinary追加・上書き・削除
- GitHub Token入力
- 外部URL画像の登録

新しい画像を利用する場合は、Repository管理者がFile追加、Manifest Metadata追加/生成、PR Review、Cloudflare Deployを行います。

## 5. Immutable Rule

- 公開済みAssetのBinaryを同一Pathで上書きしない。
- 変更画像は新Hash File・新assetIdとして追加する。
- Release済みAssetは、使用状態にかかわらず物理削除しない。GitHub CIは利用者ごとのIndexedDB参照を把握できないため、削除可否判定を行わない。
- ProductImage関連削除やProduct削除ではAsset Binaryを削除しない。
- 廃止は`isActive=false`だけで表し、Path/File/Manifest Entryは保持する。

これにより、Order履歴やSeed Screenshotが後から別画像へ変わることを防ぎます。

## 6. Build Validation

CIで次を検証します。

1. Manifest Schema
2. Asset File存在
3. MIMEと拡張子
4. 1ファイル500KB以下
5. 寸法・1:1比率の警告
6. SHA-256一致
7. assetId/path重複なし
8. Seedが参照するassetIdの存在
9. Seed・静的Fixtureが参照するassetIdの存在
10. Release済みManifest EntryのPath/Fileが過去Versionから削除されていないこと

## 7. Test

- Manifest Repository Contract Test
- active/inactive Asset Filter
- 既存inactive関連の維持、新規関連付け拒否、解除後再関連付け拒否
- 存在しないassetIdのValidation Error
- Product関連付け最大3件
- Primary画像ちょうど1件
- 上下移動Buttonで順序変更
- Asset読込失敗時のPlaceholder
- Product削除後もAsset URLが残ること
