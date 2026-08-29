# 仕様書・テスト自動化カリキュラム Web 表示・配信 実装プラン

## 目的

現在の Markdown と画像を正本として維持したまま、Scenario Shop の既存 Web デプロイ成果物から仕様書とテスト自動化カリキュラムを閲覧できるようにする。

対象は次のとおり。

- 仕様書: `docs/spec/**/*.md`
- 仕様書画像: `docs/spec/assets/**`
- テスト自動化カリキュラム: `docs/curriculum/test-automation/**/*.md`
- カリキュラム画像: `docs/curriculum/test-automation/assets/**`

Web 表示用の Markdown や画像を別管理せず、ビルド時に静的 HTML と必要な画像を既存の `dist/` に同梱する。

今回の目的は Docs を既存 Web 配信へ追加することであり、Docs framework、CMS、画像最適化基盤、専用 navigation system は導入しない。

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

docs/spec/assets/**
  -> dist/docs/spec/assets/**

docs/curriculum/test-automation/README.md
  -> dist/docs/curriculum/index.html

docs/curriculum/test-automation/part1/04_playwright-foundations.md
  -> dist/docs/curriculum/part1/04_playwright-foundations.html

docs/curriculum/test-automation/assets/**
  -> dist/docs/curriculum/assets/**
```

Markdown 内のローカル画像は Web 上でも表示でき、元画像の縦横比を保ち、本文幅を超えないこと。

## 実装前提

- Web は Expo Router / Expo Web を使用している。
- `app.config.ts` の `web.output: "single"` は変更しない。
- Cloudflare Pages のデプロイ対象は既存どおり `dist/` とする。
- Docs も既存 Scenario Shop と同じ閲覧範囲で配信する。
- `pnpm run build:spec` と既定出力 `output/spec-site` は維持する。
- `docs/curriculum/test-automation/README.md` の本文をカリキュラムの入口・学習順の正本として扱う。
- Specification の既存 `docs/spec/assets/**` / image resolver / asset copy 契約を維持する。
- 実装開始時に最新 `main` を取り込み、`package.json` 等の main 側更新を巻き戻さない。
- Docs は build artifact として配信する。通常の `pnpm start:web` で Docs を配信する対応は今回行わない。
- ローカル確認は `pnpm run build:web` 後の `scripts/serve-web-dist.ts` を使用する。

## 実装内容

### 1. Markdown と画像の正本配置を変更しない

`docs/spec/` と `docs/curriculum/test-automation/` は移動・複製しない。

画像の正本は次に置く。

```text
Specification: docs/spec/assets/**
Curriculum:    docs/curriculum/test-automation/assets/**
```

Markdown からは各文書を基準とした相対パスでローカル画像を参照する。

次は実施しない。

- Markdown を `app/` や `public/` へ複製する
- Web 表示用 JSON / Markdown を別管理する
- Web 表示専用の画像コピーを Repository 内に別管理する
- ブラウザから GitHub API / Raw GitHub を取得して本文を表示する
- Docusaurus、VitePress、MkDocs 等を導入する
- Docs のために Expo Router の出力方式を変更する

### 2. 現在使用している Markdown 表現を既存 renderer で扱う

実装開始時に対象 Markdown で現在使用している構文、Markdown link、image 記法を確認する。

既存 renderer で扱えない表現がある場合も、現在の文書と画像を表示するために必要な処理だけを追加する。

画像は既存 `renderInline()` が扱う通常の Markdown image と linked image の表示を維持する。

```md
![alt](relative/image.webp)
[![alt](relative/image.webp)](relative/image.webp)
```

次は行わない。

- 将来用 Markdown 構文の先行対応
- Markdown compatibility matrix 等の追加成果物作成
- 新しい Markdown framework の導入
- 小規模な拡張で対応可能な段階での新しい Markdown parser 導入
- 画像変換・圧縮・リサイズ・サムネイル生成 pipeline の追加

### 3. 既存 Specification renderer の汎用部分だけを再利用可能にする

既存 `scripts/spec/build-spec.ts` には Specification 固有処理と Markdown の汎用描画処理が同居している。

Curriculum 用に renderer を複製せず、`scripts/spec/build-spec.ts` にある次の汎用描画処理を `scripts/spec/markdown.ts` へ小さく移動・exportし、Specification と Curriculum の双方から再利用する。

- Markdown 本文の HTML 描画
- heading / table / list / code block / blockquote の描画
- TOC 描画
- 共通 CSS
- `renderInline()` を含む inline Markdown 描画
- 画像の HTML 描画と responsive 表示用 CSS

汎用 renderer は link resolver と image resolver を引数で受け取り、Specification と Curriculum の link / image 規則を混在させない。

`renderInline()` を使用するすべての描画経路で、link resolver と image resolver の両方を必ず渡す。

対象には少なくとも次を含む。

- paragraph
- table cell
- unordered list item
- ordered list item
- blockquote

現在の `renderTable()` は table cell で image resolver を渡していないため、共通化時に table からも image resolver を渡す形へ修正する。画像の配置場所によって image resolver / asset 制約を迂回できる状態を残さない。

Specification 固有の次の処理は `scripts/spec/build-spec.ts` に残す。

- `buildSpecSite()`
- Specification 用 output path / link 解決
- Specification navigation の適用・描画
- `Normative Product Behavior` / `Supporting / Operational` 判定・表示
- Specification 用 page shell / brand
- Specification image resolver
- `docs/spec/assets/**` の asset copy と asset 制約

既存 `scripts/spec/markdown.ts` の `extractNavigation()` の配置は変更しない。Curriculum 生成では使用せず、Specification navigation の適用・描画だけを既存どおり `scripts/spec/build-spec.ts` に残す。

既存 CSS の画像表示契約である `max-width: 100%` / `height: auto` を維持し、幅の大きいスクリーンショットが文書領域を突き抜けないようにする。

CSS 構造の再設計・細分化・Design System 化は行わない。

`buildSpecSite({ outputDir })` の既存 API と `pnpm run build:spec` の出力・挙動を維持する。

新しい Docs framework、plugin system、複数階層の Builder abstraction は作らない。

### 4. `scripts/docs/build-docs.ts` で Web 配信用 Docs を生成する

新規 `scripts/docs/build-docs.ts` を Web 配信用 Docs 生成の入口とする。

`pnpm run build:docs` で次を実行する。

1. `dist/docs` だけを削除する。
2. `buildSpecSite({ outputDir: "dist/docs/spec" })` で Specification HTML と既存 Specification assets を生成する。
3. `docs/curriculum/test-automation/**/*.md` を再帰的に読み、`dist/docs/curriculum/**` へ Curriculum HTML を生成する。
4. `docs/curriculum/test-automation/assets/**` が存在する場合は、ディレクトリ階層を維持して `dist/docs/curriculum/assets/**` へ再帰的にコピーする。

Curriculum asset copy のために汎用 asset pipeline は作らない。固定された source / destination を単純に再帰コピーするだけとする。

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
- Curriculum Markdown に H1 が存在しない場合は build を失敗させ、ファイル名等への fallback は行わない。
- header brand は `Scenario Shop Test Automation Curriculum` とし、`/docs/curriculum/` へのリンクにする。
- 本文の H1 以下は Markdown 本文をそのまま使用し、別の H1 を追加しない。
- Prev / Next や専用 navigation data は追加しない。

Curriculum 用 page shell は `scripts/docs/build-docs.ts` 内に最小限実装し、本文 renderer と共通 CSS は前項の既存汎用処理を再利用する。

### 5. Specification 内部リンクと画像契約は既存処理を変更しない

Specification 内の Markdown link 変換は既存 `buildSpecSite()` に任せる。

今回のために Specification の既存相対 URL 生成を root-absolute URL へ変更しない。

Specification のローカル画像は既存どおり `docs/spec/assets/**` 内だけを許可し、`buildSpecSite()` が output directory の `assets/**` へコピーする。

そのため次の両方で同じ画像が表示されること。

```text
pnpm run build:spec
  -> output/spec-site/assets/**

pnpm run build:docs
  -> dist/docs/spec/assets/**
```

`output/spec-site` と `dist/docs/spec` は同じ `buildSpecSite()` の出力先違いとして扱う。

### 6. Curriculum の通常リンク変換規則を固定する

この節は通常の Markdown hyperlink を対象とする。

Markdown image、および linked image の画像 `src` / 画像自身を開く `href` はこの節では処理せず、Section 7 の image resolver だけで処理する。

Curriculum HTML 生成時、`http:` / `https:` / `mailto:` / `tel:` / `//` と同一ページ内の `#anchor` を除く通常のローカル hyperlink は、URL 変換前に必ず次を実施する。

1. リンク元 Markdown のディレクトリを基準に Repository-relative path を解決する。
2. 解決結果が Repository root 外へ逸脱する場合は build を失敗させる。
3. fragment を除いた対象 path が Repository 内に実在しない場合は build を失敗させる。
4. 実在を確認した後、対象を Curriculum / Specification / その他 Repository 内ファイルのいずれかに分類し、以下の規則で URL を生成する。

壊れたローカル hyperlink を GitHub URL や生成 HTML URL に変換して隠さない。

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

`docs/spec/**` と `docs/curriculum/test-automation/**` 以外の Repository 内ファイルへの hyperlink は、Web Docs の生成対象を広げず次の形式の GitHub source URL へ変換する。

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
- `http:` / `https:` / `mailto:` / `tel:` / `//` の通常 hyperlink は変更しない。

今回、新しい汎用 link graph / anchor validation framework は作らない。

既存の `validate:spec` と `validate:curriculum` を継続利用する。前述の存在確認は Curriculum HTML の通常 hyperlink 生成処理自身の fail-fast とし、新しい validator suite は追加しない。

### 7. Curriculum の画像解決・コピー規則を固定する

Curriculum の画像は Repository 内の `docs/curriculum/test-automation/assets/**` を正本とする。

Curriculum では外部画像 URL を許可しない。

- `http:`
- `https:`
- `//`

上記を画像 `src` または linked image の画像 `href` に指定した場合は build を失敗させる。

Markdown 内のローカル画像参照は、リンク元 Markdown のディレクトリを基準に解決し、次をすべて満たす場合だけ Web 用 URL に変換する。

1. 解決結果が Repository root 外へ逸脱しない。
2. 解決結果が `docs/curriculum/test-automation/assets/**` 配下である。
3. 対象画像ファイルが実在する。

条件を満たさない画像参照は build を失敗させる。存在しない画像を生成 HTML に残して broken image にしない。

ローカル画像はディレクトリ階層とファイル名を変更せず次へコピーする。

```text
docs/curriculum/test-automation/assets/**
  -> dist/docs/curriculum/assets/**
```

生成 HTML の `img src` と、既存 linked-image 表現で画像自身を開く `href` は、現在の HTML ファイルからコピー後画像への相対 URL にする。

画像表示は共通 CSS を使い、少なくとも次を満たす。

- `max-width: 100%`
- `height: auto`
- alt text を Markdown から維持する
- 既存 `loading="lazy"` を維持する
- 既存 linked image はクリックして元画像を開ける

今回、画像について次は実装しない。

- 画像の再エンコード
- サイズ別画像生成
- 自動圧縮
- CDN / object storage への分離
- image manifest
- lightbox / gallery
- 画像専用 component framework
- 未使用 asset 検出や参照画像だけを選別する仕組み

### 8. `build:web` の Expo export 後に `build:docs` を追加する

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

### 9. `serve-web-dist.ts` で directory index と画像を配信する

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

画像要求は既存の通常ファイル配信で処理し、`dist/docs/spec/assets/**` と `dist/docs/curriculum/assets/**` をそのまま返す。Docs 専用の画像 route は作らない。

既存 `contentTypes` へ次だけを追加する。

```text
.jpg  -> image/jpeg
.jpeg -> image/jpeg
```

既存の `.avif` / `.png` / `.svg` / `.webp` 対応は維持する。今回のために画像形式判定 framework や MIME library は追加しない。

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
dist/docs/spec/ui-ux-contract.html
dist/docs/spec/assets/screens/SCREEN-BOUNDARY-NOT-FOUND/default/web-desktop.webp
dist/docs/curriculum/index.html
dist/docs/curriculum/part1/04_playwright-foundations.html
```

`docs/curriculum/test-automation/assets/**` が存在する場合は、同じ相対パスで `dist/docs/curriculum/assets/**` にコピーされることを確認する。

`pnpm run build:spec` も従来どおり成功し、`output/spec-site/index.html` と既存 Specification assets が生成されることを確認する。

### 3. Web smoke

既存 `e2e/web/smoke.spec.ts` の同じファイル内で Storefront と Docs の test を分ける。

```text
public storefront smoke
published docs smoke
```

既存 Storefront smoke の内容は維持する。

`published docs smoke` では最低限次を確認する。

1. `/docs/spec/` を開き、H1 `Scenario Shop Specification System` が表示される。
2. `/docs/spec/ui-ux-contract.html` を開き、仕様書本文が表示される。
3. 現在 `ui-ux-contract.md` に存在する alt text `SCREEN-BOUNDARY-NOT-FOUND default web-desktop` の画像が表示され、画像ロードに成功していることを確認する。単なる `<img>` 要素の存在だけでなく、既存 Storefront smoke と同じ考え方で `image.complete && image.naturalWidth > 0` を確認する。
4. `/docs/curriculum/` を開き、H1 `テスト自動化カリキュラム` が表示される。
5. Curriculum README に現在存在する `part1/04_playwright-foundations.md` へのリンクを実際に辿り、`/docs/curriculum/part1/04_playwright-foundations.html` とそのページ固有 H1 が表示される。
6. `/docs/curriculum/` へ戻る。
7. Curriculum README に現在存在する `docs/spec/README.md` へのリンクを実際に辿り、`/docs/spec/` と `Scenario Shop Specification System` が表示される。
8. 既存 Storefront smoke で `/products` の SPA route が従来どおり動作する。

子ページを直接 `goto` して済ませず、Curriculum README 内の実 hyperlink を辿ることで Curriculum 内 Markdown hyperlink の URL 変換も確認する。

Docs は HTTP success だけで判定せず、Docs 固有 H1 と実画像ロードを確認して SPA fallback や asset 配信失敗の誤成功を防ぐ。

今回のために次は追加しない。

- Docs 専用 E2E file / suite
- static server 専用 unit test suite
- responsive 専用 E2E
- 全 Markdown link 巡回 E2E
- 全画像巡回 E2E

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

`build:web` に Docs と画像が含まれるため、既存 artifact / deploy / `test:smoke` 経路で Docs の HTML と代表画像も検証される。

Cloudflare Pages Preview で次を確認する。

- `/docs/spec/`
- Specification の代表スクリーンショット
- `/docs/curriculum/`
- Curriculum README から代表 Curriculum 子ページへの hyperlink
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

- 対象 Markdown と画像が正本のまま維持されている。
- `/docs/spec/` と `/docs/curriculum/` を既存 Web デプロイから閲覧できる。
- Markdown 内のローカル画像が Web Docs でも表示され、本文幅を超えず縦横比を維持する。
- paragraph / table / list / blockquote 等の配置場所にかかわらず、画像が必ず image resolver を通る。
- Specification の既存 `docs/spec/assets/**`、image resolver、asset copy、`buildSpecSite()` / `build:spec` / `output/spec-site` 契約を壊していない。
- Curriculum の `docs/curriculum/test-automation/assets/**` を `dist/docs/curriculum/assets/**` にコピーし、Markdown から相対参照できる。
- Curriculum の外部画像、存在しない画像、Repository root 外、許可 asset root 外を指す画像参照は build が失敗する。
- `.jpg` / `.jpeg` を既存 static server から `image/jpeg` として配信できる。
- 代表 Specification 画像について smoke で実際の画像ロード成功を確認できる。
- Curriculum README が index となり、本文の既存学習順から各教材へ移動できる。
- Curriculum 内 hyperlink、Curriculum から Specification への hyperlink が動作する。
- Curriculum の生成対象 Markdown に存在する通常のローカル hyperlink が、存在しない対象や Repository root 外を指す場合は build が失敗する。
- 公開 Docs 対象外の既存 Repository hyperlink が壊れず、固定した GitHub source URL を開く。
- `build:web` 後の `dist/` に両 Docs と必要な画像が含まれる。
- `dist/docs` のみ clean され、Expo Web 成果物を削除しない。
- Docs directory index、画像の通常ファイル配信、既存 SPA fallback が共存する。
- 既存 Storefront smoke と追加 Docs smoke が成功する。
- Cloudflare Pages Preview でも同じ Docs URL と代表画像を閲覧できる。
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
- 外部画像の許可・取得・キャッシュ
- 画像変換・最適化・CDN・gallery
- 未使用 asset 検出
- 未使用 Markdown 構文や Mermaid 等への先行対応
- Docs framework 導入
- Expo Router の static output 移行
- Docs 専用 CI job
- Docs 専用 responsive E2E

## Stop 条件

次のいずれかが判明した場合は、今回の範囲を広げず別対応として整理する。

- Docs に Scenario Shop と異なる認証・閲覧制限が必要。
- 現在使用中の Markdown / image 記法が既存 renderer の小さな拡張では安全に表示できない。
- `buildSpecSite({ outputDir: "dist/docs/spec" })` を既存 `build:spec` / Specification asset 契約を壊さず利用できない。
- Cloudflare Pages Preview で `dist/docs/**/index.html` または `dist/docs/**/assets/**` が配信できず、現在の `dist` 配置だけでは解決できない。
- Web 表示のために現在の Markdown / image 正本構造を大幅に変更する必要がある。

## 実装順

1. 最新 `main` を取り込み、現在の Markdown 構文・通常 link・画像記法を確認する。
2. `scripts/spec/build-spec.ts` の汎用 Markdown / image 描画部分を `scripts/spec/markdown.ts` へ最小限移動し、Specification と Curriculum から resolver を差し替えて再利用できるようにする。table を含むすべての `renderInline()` 経路で image resolver を渡す。`extractNavigation()` の配置や CSS 構造は不要に変更しない。
3. `scripts/docs/build-docs.ts` を追加し、Specification の既存 assets を含めて `dist/docs/spec` へ生成し、Curriculum HTML と `docs/curriculum/test-automation/assets/**` を `dist/docs/curriculum` へ生成・コピーする。
4. Curriculum の通常 hyperlink の存在確認・URL 変換と、画像の external rejection / asset root / existence 確認・URL 解決をそれぞれ Section 6 / 7 の固定規則どおり実装する。
5. `package.json` に `build:docs` を追加し、`build:web` の Expo export 後に接続する。
6. `scripts/serve-web-dist.ts` を directory index 対応にし、`.jpg` / `.jpeg` の MIME type を追加する。Docs 画像は既存の通常ファイル配信で返す。
7. `e2e/web/smoke.spec.ts` 内に `published docs smoke` を追加し、実在する Specification 画像のロード、Curriculum 内 hyperlink、Curriculum → Specification hyperlink を確認する。
8. 既存 validator、`build:web`、`build:spec`、smoke を実行する。
9. Cloudflare Pages Preview で Docs root、代表画像、代表 Curriculum 内 hyperlink、代表 cross-link を確認する。
