# Storage・Schema運用設計

## 1. Phase 1保存先

| Data | Web |
|---|---|
| 業務Data・商品画像関連 | IndexedDB `ec-automation-training` |
| Current Session ID・guestId | Local Storage |
| 商品画像Binary | GitHub Repository `public/images/products/` |
| 商品画像Manifest Runtime正本 | `src/generated/product-image-manifest.ts` |
| 商品画像Manifest診断用 | `public/images/product-image-manifest.json` |
| Test Clock/Delay | app_settings |

Phase 1では画像Blob、別Gateway DB、GitHub書込みTokenをBrowserへ保存しません。

## 2. GitHub画像運用

- GitHub Repositoryを画像Binaryの正本とし、Cloudflare PagesのBuild成果物として同一Origin配信します。
- File名は原則`<semantic-name>.<content-hash>.<ext>`とし、既存Fileを上書きしません。
- `scripts/generate-image-manifest.ts`がAsset ID、Path、MIME、寸法、容量、SHA-256、Default Alt、Tag、有効状態を検証・生成します。
- 管理UIはManifestのactive Assetを選択し、Productとの関連付けをIndexedDBへ保存します。
- 新規画像Binaryの追加・置換・廃止はGitHubのCommit/PRとCloudflare再Deployで行います。アプリ内の管理者操作ではGitHubを変更しません。
- 使用中Assetは物理削除しません。候補から外す場合はManifest上でinactiveにし、既存参照は表示継続します。
- GitHub Contents API、PAT、OAuth TokenをFrontendから利用しません。

## 3. 初期化と画像Manifest

Build前に`scripts/generate-image-manifest.ts`を実行し、同じ内容から次を生成します。

- `src/generated/product-image-manifest.ts`: Runtimeが静的importする正本
- `public/images/product-image-manifest.json`: CI確認・人間の診断用

Runtime Fetch、Runtime Cache、取得失敗時Fallbackは実装しません。生成物が欠落・不整合の場合はBuildを失敗させます。Release済み画像Pathはappend-onlyです。

App起動時はDBをOpenし、Schema Versionを確認します。DBが空なら`default` Seedを投入し、無効なCurrent Sessionを削除し、guestIdがなければ生成してLocal Storageへ保存します。

## 4. Reset

- Automation BuildのadminまたはTest APIだけが実行可能。
- 対応条件は1 Browser Context・1 Pageであり、IndexedDBとLocal Storageをまたぐ原子性は保証しない。
- 実行前にDexie Connectionを閉じ、IndexedDB、Local StorageのSession ID、guestIdを削除する。
- DBを再作成し、指定Seedを投入後、Seedで定義したSession/guestIdをLocal Storageへ設定してPageをReloadする。
- 別PageがDBを開いて削除がblockedになった場合は`RESET_BLOCKED_BY_OPEN_PAGE`で失敗し、利用者またはPlaywright Fixtureが他Pageを閉じて再試行する。
- GitHub上の画像AssetとBuild生成Manifest ModuleはReset対象外。
- Reset前Dataは保持しない。ExportはPhase 3まで提供しない。

## 5. Schema変更

Phase 1は新規Schema v1だけをRelease対象とします。開発中にSchemaを変更する場合は、正式Release前であればDB Resetを許可します。

正式なUpgrade Migration、失敗Recovery、旧Version互換TestはPhase 3で追加します。Phase 1へMigration Frameworkを先行実装しません。

## 6. 容量・画像品質

- default Seedは11商品、負荷確認用`many-products`は1,000商品。100商品ScenarioはPhase 1に持たない。
- 商品画像はPNG/JPEG/WebP、1:1を基本、1枚50～150KBを目安、上限500KB。
- Productへの関連付けは最大3枚。同一Assetの複数商品利用を許可する。
- Manifest生成時に500KB超過、未対応MIME、Path重複、assetId重複、Hash不一致をBuild Errorとする。
- 画像はBrowser Storage Quotaを消費しない。Quota超過は業務Dataの書込みに対して`STORAGE_QUOTA_EXCEEDED`を表示する。

## 7. Phase 2・3

- Phase 2: Nativeで同じManifest/AssetをBundleまたはRemote Static Assetとして利用する方式を再評価。
- Phase 3: Migration、Import/Export、Integrity Check、Recovery UI。

## Phase 2資料

SQLite初期案は`future/phase2/sqlite_schema.md`へ分離し、Phase 1の正本ではありません。
