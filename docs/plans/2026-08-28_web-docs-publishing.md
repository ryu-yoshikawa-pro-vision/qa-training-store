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

生成物は次の構成とする。

```text
dist/
├── index.html
├── _expo/
└── docs/
    ├── spec/
    │   ├── index.html
    │   └── **/*.html
    └── curriculum/
        ├── index.html
        ├── **/*.html
        └── part1/
            └── **/*.html
```

Markdown と HTML の基本対応は次のとおり。

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
- 仕様書の既存生成処理 `scripts/spec/build-spec.ts` / `buildSpecSite()` / `pnpm run build:spec` を維持する。
- `pnpm run build:spec` の既定出力 `output/spec-site` を変更しない。
- `docs/curriculum/test-automation/README.md` の本文をカリキュラムの入口・学習順の正本として扱う。
- 実装開始時点の最新 `main` を取り込んだ状態から作業し、今回変更する `package.json` 等で main 側の更新を巻き戻さない。

## 実装内容

### 1. Markdown の現在の配置を維持する

`docs/spec/` と `docs/curriculum/test-automation/` は移動・複製しない。

次は実施しない。

- Markdown を `app/` や `public/` へ複製する
- Web 表示用 JSON / Markdown を別管理する
- ブラウザから GitHub API / Raw GitHub を取得する
- Docusaurus、VitePress、MkDocs 等を導入する
- Docs のために Expo Router の出力方式を変更する

### 2. 現在使用している Markdown 表現だけを確認する

実装前に仕様書とカリキュラムで現在使用している Markdown 構文、ローカルリンク、ローカル画像の有無を確認する。

既存 `scripts/spec/markdown.ts` で現在の表現を扱える場合はそのまま再利用する。

不足がある場合も、現在の文書を表示するために必要な処理だけを追加する。

次は行わない。

- 将来用 Markdown 構文の先行対応
- Markdown compatibility matrix 等の追加成果物作成
- 汎用 Markdown framework の新設
- 小規模な拡張で対応可能な段階での新しい Markdown parser 導入

### 3. 仕様書生成は既存 `buildSpecSite()` をそのまま利用する

Web 配信用の仕様書は、既存 `buildSpecSite()` の `outputDir` に `dist/docs/spec` を指定して生成する。

次の既存仕様を維持する。

- `pnpm run build:spec`
- `output/spec-site`
- Specification 固有のページ構成
- Normative / Supporting の表示
- 既存 Specification validation

今回のために `scripts/spec/build-spec.ts` 全体を Docs 共通 framework へ作り替えない。

カリキュラムでは既存 `scripts/spec/markdown.ts` の Markdown 描画処理を再利用する。再利用に必要な export や小さな一般化だけを行い、Specification 固有の表示ロジックは `build-spec.ts` 側に残す。

### 4. カリキュラムを静的 HTML 化する

`docs/curriculum/test-automation/**/*.md` を再帰的に読み込み、`dist/docs/curriculum/**` に HTML を生成する。

次を満たすこと。

- 対象ルート内のすべての `.md` を生成する。
- `README.md` は `index.html` にする。
- 現在のディレクトリ階層をそのまま維持する。
- Specification 固有の Normative / Supporting 表示は付けない。
- カリキュラム固有の title / heading を使用する。
- `README.md` の本文にある現在の「全体構成」をそのまま入口・学習順として使う。

新しいカリキュラム専用 navigation data、frontmatter、Prev / Next、ファイル名順による自動ナビゲーションは追加しない。

Optional Reference / Legacy Alias の Markdown も対象ルート内に存在する限り HTML は生成する。ただし Required Curriculum の学習順を別ロジックで再構築しない。

各子ページからトップへ戻る導線が必要な場合は、固定の `/docs/curriculum/` への簡単なリンクだけにする。

### 5. 公開対象 Markdown へのリンクを HTML URL へ変換する

Markdown の正本側の相対リンクは変更せず、HTML 生成時だけ公開 URL へ変換する。

最低限、現在使用している次のリンクを扱う。

- 同一 Docs 内の `*.md`
- 親子ディレクトリをまたぐ `*.md`
- `README.md`
- `#anchor`
- `file.md#anchor`
- カリキュラムから仕様書へのリンク
- `http:` / `https:` 等の外部 URL

公開対象 Markdown へのリンクは、正規化した source path から次へ変換する。

```text
docs/spec/**/*.md
  -> /docs/spec/**/*.html

docs/curriculum/test-automation/**/*.md
  -> /docs/curriculum/**/*.html

README.md
  -> 対応ディレクトリの index.html URL
```

fragment (`#...`) は変換後 URL に保持する。

例:

```text
../../../spec/features/cart.md
  -> /docs/spec/features/cart.html
```

外部 URL は変更しない。

公開対象外の Repository 内ファイルは、存在しない Docs URL へ機械的に変換・コピーしない。現在そのようなリンクが存在する場合だけ、実際の用途に必要な最小対応を行う。

Repository root 外へ逸脱する path は生成対象として扱わない。

今回の実装で新しい汎用リンクグラフ検証・アンカー検証基盤は作らない。既存 Specification / Curriculum validator は継続利用する。

現在のカリキュラムにローカル画像が存在する場合だけ、表示に必要な画像を生成先へコピーし、参照先を保つ。存在しない場合は汎用 asset pipeline を追加しない。

### 6. `build:docs` を追加する

Web 配信用 Docs 生成の入口を 1 つ追加する。

```bash
pnpm run build:docs
```

処理内容は次のみにする。

1. `dist/docs` を削除する。
2. `dist/docs/spec` を `buildSpecSite()` で生成する。
3. `dist/docs/curriculum` を生成する。

`dist/docs` 以外の `dist/` は削除しない。

特に次は維持する。

- `dist/index.html`
- `dist/_expo/**`

削除済み Markdown に対応する古い HTML が残らないよう、Docs 生成前の cleanup は必ず行う。

実装は `scripts/docs/build-docs.ts` を中心にまとめ、今回だけのために複数の新しい Builder 階層を作らない。

### 7. `build:web` の最後に Docs 生成を追加する

現在の Expo Web export 後に `build:docs` を実行する。

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

- Docs は `expo export` 後に生成する。
- `build:docs` から `build:web` を呼ばない。
- Expo export や既存前処理を二重実行しない。
- Cloudflare Pages のデプロイ先・成果物ディレクトリは変更しない。

### 8. `serve-web-dist.ts` で directory index を配信する

既存ローカル静的サーバーで Docs の directory URL が SPA fallback に吸われないよう、解決順を次にする。

1. 要求パスが通常ファイルならそのファイルを返す。
2. 要求パスがディレクトリで `<directory>/index.html` が存在すれば `index.html` を返す。
3. 上記に該当しない既存の extensionless Web route は従来どおり SPA `dist/index.html` へ fallback する。
4. それ以外は既存の 404 処理を維持する。

最低限、次を成立させる。

```text
/docs/spec/       -> dist/docs/spec/index.html
/docs/curriculum/ -> dist/docs/curriculum/index.html
/products         -> dist/index.html
```

既存の path traversal 防止、symlink 対応、GET / HEAD 制約は変更しない。

## テスト・確認

### 既存 validator

次をそのまま実行し、既存の Markdown / 仕様契約を壊していないことを確認する。

```bash
pnpm run validate:spec
pnpm run validate:curriculum
```

今回の Web 表示用に同等の validator を重複実装しない。

### Build 確認

```bash
pnpm run build:web
```

実行後、少なくとも次が生成されることを確認する。

```text
dist/index.html
dist/docs/spec/index.html
dist/docs/curriculum/index.html
```

加えて、代表的な Specification / Curriculum の子ページが現在のディレクトリ構造どおり生成されることを確認する。

### Web smoke

既存 `e2e/web/smoke.spec.ts` に Docs の確認を追加する。

最低限、次を確認する。

1. 既存 Scenario Shop の smoke が従来どおり成功する。
2. `/docs/spec/` が Scenario Shop SPA ではなく仕様書を表示する。
3. `/docs/curriculum/` が Scenario Shop SPA ではなくカリキュラムを表示する。
4. カリキュラムの代表的な子ページを 1 ページ開ける。
5. 現在存在するカリキュラムから仕様書への代表リンクを 1 つ辿り、対象仕様ページを開ける。

Docs の確認では URL や HTTP 成功だけで判定せず、Docs 固有の title / h1 / 本文を確認する。

今回のために次は追加しない。

- Docs 専用 E2E suite
- static server 専用 unit test suite
- 320px 等の responsive 専用 E2E
- 全 Markdown リンクを巡回する E2E

### CI / Preview

`.github/workflows/ci.yml` は原則変更しない。

`build:web` に Docs 生成が含まれることで、既存の `dist` artifact と Cloudflare Pages Preview に Docs も自動的に含まれる構成にする。

既存 `test:smoke` が production artifact と Cloudflare Preview の両方で実行される経路を利用する。

既存 CI だけでは今回の smoke が実行されないことが実装時に判明した場合のみ、必要な最小変更を行う。Docs 専用 CI job は作らない。

## 主な変更対象

```text
package.json
scripts/spec/markdown.ts             # 再利用に必要な最小変更のみ
scripts/docs/build-docs.ts           # 新規。Docs Web 生成の入口
scripts/serve-web-dist.ts
e2e/web/smoke.spec.ts
```

`scripts/spec/build-spec.ts` は、既存 `buildSpecSite()` をそのまま利用できない具体的理由がある場合だけ最小変更する。

`.github/workflows/ci.yml` は既存 CI 経路で不足が判明した場合だけ変更する。

Scenario Shop の Header / Footer / Mobile navigation には今回変更を入れない。

## 完了条件

- `docs/spec/**/*.md` が正本のまま維持されている。
- `docs/curriculum/test-automation/**/*.md` が正本のまま維持されている。
- `/docs/spec/` から仕様書を閲覧できる。
- `/docs/curriculum/` からカリキュラムを閲覧できる。
- `README.md` が各 Docs root の `index.html` になる。
- 子ディレクトリの構造が URL 上でも維持される。
- 現在のカリキュラム内リンクとカリキュラムから仕様書へのリンクが Web 上で利用できる。
- `pnpm run build:spec` の既存出力と挙動を壊していない。
- `pnpm run build:web` の成果物 `dist/` に Docs が含まれる。
- `serve-web-dist.ts` で Docs directory index と既存 SPA fallback が共存する。
- 既存 Scenario Shop の smoke が成功する。
- Docs root と代表的な子ページ・cross-link の smoke が成功する。
- Cloudflare Pages Preview で同じ Docs URL を閲覧できる。
- `app.config.ts` の `web.output: "single"` を維持している。
- Native 向けコード・ナビゲーションへ不要な変更をしていない。
- Generated HTML を正本として手動管理していない。

## 対象外

今回の実装に次は含めない。

- Scenario Shop 画面への Docs 導線追加
- Docs 検索
- Docs 編集 UI
- Docs version switching
- branch / tag 単位の Docs 公開
- 学習進捗管理
- Curriculum 専用 navigation system
- Prev / Next navigation
- Docs 専用認証
- Docs analytics
- 汎用 Markdown link / anchor validation framework
- 未使用 Markdown 構文への対応
- Mermaid 等の拡張記法
- Docs framework 導入
- Expo Router の static output 移行
- Repository 全体の Web 公開
- Docs 専用 CI job
- Docs 専用 responsive E2E

## Stop 条件

次のいずれかが判明した場合は、このタスクの範囲を広げず実装を止め、別対応として整理する。

- Docs に Scenario Shop と異なる認証・閲覧制限が必要。
- 現在使用中の Markdown が既存 renderer の小さな拡張では安全に表示できない。
- `buildSpecSite({ outputDir: "dist/docs/spec" })` を既存仕様を壊さず利用できない。
- Cloudflare Pages の実 Preview で `/docs/**/index.html` より SPA fallback が優先され、現在の `dist` 配置だけでは解決できない。
- Web 表示のために現在の Markdown 構造そのものを大幅に変更する必要がある。

## 実装順

1. 最新 `main` を取り込み、現在の Markdown 構文・リンク・画像を確認する。
2. `scripts/spec/markdown.ts` をカリキュラムでも再利用できる最小状態にする。
3. `scripts/docs/build-docs.ts` を追加し、`dist/docs/spec` と `dist/docs/curriculum` を生成する。
4. 現在使用中の Docs 間 Markdown リンクを公開 HTML URL へ変換する。
5. `package.json` に `build:docs` を追加し、`build:web` の Expo export 後に接続する。
6. `scripts/serve-web-dist.ts` を directory index 対応にする。
7. `e2e/web/smoke.spec.ts` に最小 Docs smoke を追加する。
8. 既存 validator、`build:web`、smoke を実行する。
9. Cloudflare Pages Preview で `/docs/spec/`、`/docs/curriculum/`、代表 cross-link を確認する。
