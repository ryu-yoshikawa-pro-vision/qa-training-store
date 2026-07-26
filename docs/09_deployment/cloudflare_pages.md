# Cloudflare Pages Deploy設計

## 1. Phase 1 Project

Cloudflare Pages Projectを1つだけ使用します。

| Project | Build | Test API | 用途 |
|---|---|---:|---|
| `ec-training-automation` | automation | ○ | Playwright・QA学習・手動確認 |

一般向けPublic DemoはPhase 3で必要性を再評価します。初期から2 Projectを運用しません。

## 2. 設定

- Expo Web `output: single`
- Build: `pnpm run build:web`
- Output: `dist`
- Production Branch: `main`
- Bot Fight Mode、Challenge、Turnstile、Cloudflare Accessは使用しない
- Pages Functions、Workers、Server APIなし

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

Cloudflare Pages、Local Release Build、CIのWeb Buildはすべて`pnpm run build:web`を使用し、Manifest生成・検証を迂回する別Build Commandを持ちません。

## 3. Build変数

```text
EXPO_PUBLIC_APP_ENV=automation
EXPO_PUBLIC_BUILD_KIND=automation
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_DEFAULT_SEED=default
```

Build SHA、App/Schema/Seed Versionを含めます。秘密情報は置きません。

## 4. Preview

- PR Previewを生成する。
- Dependabot等の自動更新BranchはPreview対象外にできる。
- PreviewごとにOriginが異なり、IndexedDBも独立する。
- E2Eは各PreviewでReset/Seedしてから実行する。

## 5. SPA・Header

- 独自静的`404.html`を置かず、Expo Routerの`+not-found`を使用する。
- `_headers`:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Robots-Tag: noindex
```

## 6. Cache

- Hash付きAssetは標準Cache。
- HTMLは長期固定しない。
- Seed AssetはVersion付き。
- 業務DataはBrowser内だけ。

## 7. Smoke

- HTTP 200とTest Mode Badge
- Test API Metadata
- Reset/default Seed
- Home、Search Suggestion、商品検索
- Login、正常購入、Order詳細
- Admin Overview

## 8. Rollback

Schema変更を含まない場合は直前の成功DeployへRollback可能です。Schema変更後のRollbackはData互換性を確認し、安易に行いません。

## 9. Phase 3

一般閲覧用URLが実際に必要になった場合だけPublic Projectを分離し、Test ModuleをBuild Graphから除外します。


## 商品画像配信

`public/images/products/`と診断用`product-image-manifest.json`をExpo Exportへ含めます。RuntimeはBuild生成済み`src/generated/product-image-manifest.ts`をBundleから使用します。`pnpm run build:web`の先頭でManifest生成と検証を必ず実行し、File不存在・Hash不一致・500KB超過をDeploy失敗とします。GitHub APIへのClient書込みは行いません。
