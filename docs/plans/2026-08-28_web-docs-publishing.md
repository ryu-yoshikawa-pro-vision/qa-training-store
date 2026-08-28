# 仕様書・テスト自動化カリキュラム Web 表示・配信 実装プラン

## 目的

現在の Markdown を正本として維持したまま、Scenario Shop の既存 Web デプロイ成果物から仕様書とテスト自動化カリキュラムを閲覧できるようにする。

対象は次のとおり。

- 仕様書: `docs/spec/**/*.md`
- テスト自動化カリキュラム: `docs/curriculum/test-automation/**/*.md`

Web 表示用の Markdown を別管理せず、ビルド時に静的 HTML を生成して既存の `dist/` に同梱する。

## 完了時の状態

少なくとも次の URL で文書を閲覧できること。

- `/docs/spec/`
- `/docs/curriculum/`

基本的な出力対応は次のとおり。

```text
docs/spec/README.md
  -> dist/docs/spec/index.html

docs/spec/features/cart.md
  -> dist/docs/spec/features/cart.html

docs/curriculum/test-automation/README.md
  -> dist/docs/curriculum/index.html

docs/curriculum/test-automation/part1/04_playwright-foundations.md
  -> dist/docs/curriculum/part1/04_playwright-foundations.html
```

## 実装前提

- Web は Expo Router / Expo Web を使用している。
- `app.config.ts` の `web.output: "single"` は変更しない。
- Cloudflare Pages のデプロイ対象は既存どおり `dist/` とする。
- Docs も既存 Scenario Shop と同じ閲覧範囲で配信する。
- `pnpm run build:spec` と既定出力 `output/spec-site` は維持する。
- `docs/curriculum/test-automation/README.md` の本文をカリキュラムの入口・学習順の正本として扱う。
- 実装開始時に最新 `main` を取り込み、`package.json` 等の main 側更新を巻き戻さない。
- Docs は build artifact として配信する。通常の `pnpm start:web` で Docs を配信する対応は今回行わない。ローカル確認は `pnpm run build:web` 後の `scripts/serve-web-dist.ts` を使用する。

## 実装内容

### 1. Markdown の配置を変更しない

`docs/spec/` と `docs/curriculum/test-automation/` は移動・複製しない。

次は実施しない。

- Markdown を `app/` や `public/` へ複製する
- Web 表示用 JSON / Markdown を別管理する
- ブラウザから GitHub API / Raw GitHub を取得して本文を表示する
- Docusaurus、VitePress、MkDocs 等を導入する
- Docs のために Expo Router の出力方式を変更する

### 2. 現在使用している Markdown 表現だけを確認する

実装開始時に、対象 Markdown で現在使用している構文、Markdown リンク、ローカル画像の有無を確認する。

既存 renderer で扱えない表現がある場合も、現在の文書を表示するために必要な処理だけを追加する。

次は行わない。

- 将来用 Markdown 構文の先行対応
- Markdown compatibility matrix 等の追加成果物作成
- 新しい Markdown framework の導入
- 小規模な拡張で対応可能な段階での新しい Markdown parser 導入

### 3. 既存 Specification renderer の汎用部分だけを再利用可能にする

既存 `scripts/spec/build-spec.ts` には、Specification 固有処理と Markdown の汎用描画処理が同居している。

Curriculum 用に同じ renderer を複製せず、次の汎用部分だけを `scripts/spec/markdown.ts` から再利用できる状態にする。

- Markdown 本文の HTML 描画
- heading / table / list / code block / blockquote の描画
- TOC 描画
- 共通 CSS
- `renderInline()` を含む inline Markdown 描画

必要に応じて `scripts/spec/build-spec.ts` からこれらを `scripts/spec/markdown.ts` へ小さく移動・exportする。

汎用 renderer は link resolver と image resolver を引数で受け取れる形にし、Specification と Curriculum のリンク規則を混在させない。

Specification 固有の次の処理は `scripts/spec/build-spec.ts` に残す。

- `buildSpecSite()`
- Specification 用 output path / link 解決
- Specification navigation の適用・描画
- `Normative Product Behavior` / `Supporting / Operational` 判定・表示
- Specification 用 page shell / brand
- Specification asset 制約

既存 `scripts/spec/markdown.ts` の `extractNavigation()` の配置は変更しない。Curriculum 生成では使用せず、Specification navigation の適用・描画だけを既存どおり `scripts/spec/build-spec.ts` に残す。

既存 CSS は今回の表示に必要な範囲でそのまま再利用し、CSS 構造の再設計・細分化・Design System 化は行わない。

`buildSpecSite({ outputDir })` の既存 API と `pnpm run build:spec` の出力・挙動を維持する。

新しい Docs framework、plugin system、複数階層の Builder abstraction は作らない。

### 4. `scripts/docs/build-docs.ts` で Web 配信用 Docs を生成する

新規 `scripts/docs/build-docs.ts` を Web 配信用 Docs 生成の入口とする。

`pnpm run build:docs` で次を実行する。

1. `dist/docs` だけを削除する。
2. `buildSpecSite({ outputDir: "dist/docs/spec" })` で Specification を生成する。
3. `docs/curriculum/test-automation/**/*.md` を再帰的に読み、`dist/docs/curriculum/**` へ Curriculum HTML を生成する。

`dist/index.html`、`dist/_expo/**` 等は削除しない。

Curriculum は次の契約とする。

- root の `README.md` は `dist/docs/curriculum/index.html` にする。
- `part1/`、`part2/` 等の現在のディレクトリ階層を維持する。
- 対象ルート内に存在するすべての `.md` を HTML 化する。
- Optional Reference / Legacy Alias も HTML は生成する。
- Required Curriculum の順序を別ロジックで再構築しない。
- `README.md` 本文の「全体構成」をそのまま入口・学習順として使う。
- Specification 固有 label / navigation は表示しない。
- HTML `<title>` は Markdown の最初の H1 を使い、`<H1> — Scenario Shop Test Automation Curriculum` の形式とする。
- header brand は `Scenario Shop Test Automation Curriculum` とし、`/docs/curriculum/` へのリンクにする。
- 本文の H1 以下は Markdown 本文をそのまま使用し、別の H1 を追加しない。
- Prev / Next や専用 navigation data は追加しない。

Curriculum 用 page shell は `scripts/docs/build-docs.ts` 内に最小限実装し、本文 renderer と共通 CSS は前項の既存汎用処理を再利用する。

### 5. Specification 内部リンクは既存処理を変更しない

Specification 内の Markdown リンク変換は既存 `buildSpecSite()` に任せる。

今回のために Specification の既存相対 URL 生成を root-absolute URL へ変更しない。

`output/spec-site` と `dist/docs/spec` は同じ `buildSpecSite()` の出力先違いとして扱う。

### 6. Curriculum のリンク変換規則を固定する

Curriculum HTML 生成時だけ、Markdown リンクを次の規則で変換する。

`http:` / `https:` / `mailto:` / `tel:` / `//` と同一ページ内の `#anchor` を除くローカルリンクは、URL 変換前に必ず次を実施する。

1. リンク元 Markdown のディレクトリを基準に Repository-relative path を解決する。
2. 解決結果が Repository root 外へ逸脱する場合は build を失敗させる。
3. fragment を除いた対象 path が Repository 内に実在しない場合は build を失敗させる。
4. 実在を確認した後、対象を Curriculum / Specification / その他 Repository 内ファイルのいずれかに分類し、以下の規則で URL を生成する。

壊れたローカルリンクを GitHub URL や生成 HTML URL に変換して隠さない。

#### Curriculum 内の Markdown

```text
docs/curriculum/test-automation/**/*.md
  -> /docs/curriculum/**/*.html
```

root `README.md` へのリンクは `/docs/curriculum/` とする。

#### Specification への Markdown

```text
docs/spec/README.md
  -> /docs/spec/

docs/spec/**/*.md
  -> /docs/spec/**/*.html
```

例:

```text
../../../spec/features/cart.md
  -> /docs/spec/features/cart.html
```

#### 公開 Docs 対象外の Repository 内ファイル

`docs/spec/**` と `docs/curriculum/test-automation/**` 以外の Repository 内ファイルへのリンクは、Web Docs の生成対象を広げず次の形式の GitHub source URL へ変換する。

```text
https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/main/<repository-relative-path>
```

現在存在する例:

```text
../../../reference/agentic-qa-workflow.md
  -> https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/main/docs/reference/agentic-qa-workflow.md

../../../../QA_AGENT.md
  -> https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/main/QA_AGENT.md
```

#### その他

- `#anchor` はそのまま保持する。
- `file.md#anchor` は変換後 URL に fragment を保持する。
- `http:` / `https:` / `mailto:` / `tel:` / `//` は変更しない。

今回、新しい汎用 link graph / anchor validation framework は作らない。

既存の `validate:spec` と `validate:curriculum` を継続利用する。前述の存在確認は Curriculum HTML のリンク生成処理自身の fail-fast とし、新しい validator suite は追加しない。

ローカル画像が Curriculum に現在存在する場合だけ、表示に必要な画像を `dist/docs/curriculum` 配下へコピーして参照を維持する。存在しない場合は Curriculum 用 asset pipeline を追加しない。

### 7. `build:web` の Expo export 後に `build:docs` を追加する

`package.json` に `build:docs` を追加する。

`build:web` は次の順序にする。

```text
prepare:font-assets
  ↓
generate:image-manifest
  ↓
validate:image-manifest
  ↓
expo export --platform web
  ↓
build:docs
```

次を守る。

- Docs は必ず `expo export` 後に生成する。
- `build:docs` から `build:web` を呼ばない。
- Expo export や既存前処理を二重実行しない。
- `verify` の既存 `build:spec` は削除しない。
- `verify` では `build:web -> build:docs` と後続 `build:spec` により Specification が 2 回生成されることを許容し、既存 `output/spec-site` artifact 契約を優先する。

### 8. `serve-web-dist.ts` で directory index を配信する

既存ローカル静的サーバーの path 解決順を次にする。

1. 要求 path が通常ファイルならそのファイルを返す。
2. 要求 path がディレクトリで `<directory>/index.html` が存在すればその `index.html` を返す。
3. 上記に該当しない extensionless Web route は従来どおり SPA `dist/index.html` へ fallback する。
4. それ以外は既存の 404 処理を維持する。

最低限、次を成立させる。

```text
/docs/spec/       -> dist/docs/spec/index.html
/docs/curriculum/ -> dist/docs/curriculum/index.html
/products         -> dist/index.html
```

既存の path traversal 防止、symlink 対応、GET / HEAD 制約は変更しない。

## テスト・確認

### 1. 既存 validator

```bash
pnpm run validate:spec
pnpm run validate:curriculum
```

今回の Web 表示用に同等の validator を重複実装しない。

### 2. Build

```bash
pnpm run build:web
```

少なくとも次が生成されることを確認する。

```text
dist/index.html
dist/docs/spec/index.html
dist/docs/spec/features/cart.html
dist/docs/curriculum/index.html
dist/docs/curriculum/part1/04_playwright-foundations.html
```

`pnpm run build:spec` も従来どおり成功し、`output/spec-site/index.html` が生成されることを確認する。

### 3. Web smoke

既存 `e2e/web/smoke.spec.ts` の同じファイル内で Storefront と Docs の test を分ける。

```text
public storefront smoke
published docs smoke
```

既存 Storefront smoke の内容は維持する。

`published docs smoke` では最低限次を確認する。

1. `/docs/spec/` を開き、H1 `Scenario Shop Specification System` が表示される。
2. `/docs/curriculum/` を開き、H1 `テスト自動化カリキュラム` が表示される。
3. Curriculum README に現在存在する `part1/04_playwright-foundations.md` へのリンクを実際に辿り、`/docs/curriculum/part1/04_playwright-foundations.html` とそのページ固有 H1 が表示される。
4. `/docs/curriculum/` へ戻る。
5. Curriculum README に現在存在する `docs/spec/README.md` へのリンクを実際に辿り、`/docs/spec/` と `Scenario Shop Specification System` が表示される。
6. 既存 Storefront smoke で `/products` の SPA route が従来どおり動作する。

子ページを直接 `goto` して済ませず、README 内の実リンクを辿ることで Curriculum 内 Markdown link の URL 変換も確認する。

Docs は HTTP success だけで判定せず、Docs 固有 H1 を確認して SPA fallback の誤成功を防ぐ。

今回のために次は追加しない。

- Docs 専用 E2E file / suite
- static server 専用 unit test suite
- responsive 専用 E2E
- 全 Markdown リンク巡回 E2E

### 4. CI / Cloudflare Preview

`.github/workflows/ci.yml` は今回変更しない。

既存 CI の次の経路をそのまま利用する。

```text
build:web
  -> dist artifact
  -> production smoke

build:web
  -> dist artifact
  -> Cloudflare Pages Preview
  -> deployed smoke
```

`build:web` に Docs が含まれるため、既存 artifact / deploy / `test:smoke` 経路で Docs も検証される。

Cloudflare Pages Preview で次を確認する。

- `/docs/spec/`
- `/docs/curriculum/`
- Curriculum README から代表 Curriculum 子ページへのリンク
- Curriculum から Specification への代表 cross-link

## 主な変更対象

```text
package.json
scripts/spec/markdown.ts
scripts/spec/build-spec.ts            # 汎用描画部分の最小移動のみ
scripts/docs/build-docs.ts            # 新規
scripts/serve-web-dist.ts
e2e/web/smoke.spec.ts
```

`.github/workflows/ci.yml` は変更しない。

Scenario Shop の Header / Footer / Mobile navigation は変更しない。

## 完了条件

- 対象 Markdown が正本のまま維持されている。
- `/docs/spec/` と `/docs/curriculum/` を既存 Web デプロイから閲覧できる。
- Specification の既存 `buildSpecSite()` / `build:spec` / `output/spec-site` 契約を壊していない。
- Curriculum README が index となり、本文の既存学習順から各教材へ移動できる。
- Curriculum 内リンク、Curriculum から Specification へのリンクが動作する。
- Curriculum の生成対象 Markdown に存在するローカルリンクが、存在しない対象や Repository root 外を指す場合は build が失敗する。
- 公開 Docs 対象外の既存 Repository リンクが壊れず、固定した GitHub source URL を開く。
- `build:web` 後の `dist/` に両 Docs が含まれる。
- `dist/docs` のみ clean され、Expo Web 成果物を削除しない。
- Docs directory index と既存 SPA fallback が共存する。
- 既存 Storefront smoke と追加 Docs smoke が成功する。
- Cloudflare Pages Preview でも同じ Docs URL を閲覧できる。
- `app.config.ts` の `web.output: "single"` を維持する。
- Native コード・Scenario Shop navigation・CI workflow に不要な変更をしていない。

## 対象外

- Scenario Shop 画面への Docs 導線追加
- `pnpm start:web` での Docs 配信
- Docs 検索・編集 UI・version switching
- Curriculum 専用 navigation system / Prev / Next
- Docs 専用認証・analytics
- `docs/reference/**` 等への Web Docs 公開範囲拡大
- 汎用 Markdown link / anchor validation framework
- 未使用 Markdown 構文や Mermaid 等への先行対応
- Docs framework 導入
- Expo Router の static output 移行
- Docs 専用 CI job
- Docs 専用 responsive E2E

## Stop 条件

次のいずれかが判明した場合は、今回の範囲を広げず別対応として整理する。

- Docs に Scenario Shop と異なる認証・閲覧制限が必要。
- 現在使用中の Markdown が既存 renderer の小さな拡張では安全に表示できない。
- `buildSpecSite({ outputDir: "dist/docs/spec" })` を既存 `build:spec` 契約を壊さず利用できない。
- Cloudflare Pages Preview で `dist/docs/**/index.html` が配信できず、現在の `dist` 配置だけでは解決できない。
- Web 表示のために現在の Markdown 構造を大幅に変更する必要がある。

## 実装順

1. 最新 `main` を取り込み、現在の Markdown 構文・リンク・画像を確認する。
2. `scripts/spec/build-spec.ts` の汎用 Markdown 描画部分を `scripts/spec/markdown.ts` から再利用できる最小形へ整理する。`extractNavigation()` の配置や CSS 構造は不要に変更しない。
3. `scripts/docs/build-docs.ts` を追加し、Specification と Curriculum を `dist/docs` へ生成する。
4. Curriculum のローカルリンク存在確認とリンク変換を本プランの固定規則どおり実装する。
5. `package.json` に `build:docs` を追加し、`build:web` の Expo export 後に接続する。
6. `scripts/serve-web-dist.ts` を directory index 対応にする。
7. `e2e/web/smoke.spec.ts` 内に `published docs smoke` を追加し、Curriculum 内リンクと Curriculum → Specification リンクを実際に辿る。
8. 既存 validator、`build:web`、`build:spec`、smoke を実行する。
9. Cloudflare Pages Preview で Docs root、代表 Curriculum 内リンク、代表 cross-link を確認する。
