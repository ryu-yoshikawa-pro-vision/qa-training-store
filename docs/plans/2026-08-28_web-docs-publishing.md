# 仕様書・テスト自動化カリキュラム Web 表示・配信 実装プラン

## 目的

現在の Markdown 構造を正本として維持したまま、Scenario Shop の既存 Web デプロイ成果物から仕様書とテスト自動化カリキュラムを閲覧できるようにする。

対象の正本は次のとおりとする。

- 仕様書: `docs/spec/**/*.md`
- テスト自動化カリキュラム: `docs/curriculum/test-automation/**/*.md`

Web 表示用に Markdown を別ディレクトリへ複製して管理せず、ビルド時に正本 Markdown から静的 HTML を生成する。

## 完了時の状態

既存 Scenario Shop Web と同じデプロイ成果物から、少なくとも次の URL で文書を閲覧できること。

- `/docs/spec/`
- `/docs/curriculum/`

生成物は Expo Web のデプロイ成果物 `dist/` 配下へ含める。

```text
dist/
├── index.html
├── _expo/
└── docs/
    ├── spec/
    │   ├── index.html
    │   ├── product-scope.html
    │   ├── roles-and-permissions.html
    │   ├── features/
    │   │   └── *.html
    │   └── assets/
    └── curriculum/
        ├── index.html
        ├── 00_learning-design.html
        ├── 01_spreadsheet-test-design.html
        ├── 02_competency-rubric.html
        ├── 03_instructor-reference.html
        ├── part1/
        │   └── *.html
        └── part2/
            └── *.html
```

## 実装前提

- Web は Expo Router / Expo Web を使用している。
- `app.config.ts` の `web.output` は `single` のまま維持する。
- 現在の `build:web` は `expo export --platform web` により `dist/` を生成する。
- 仕様書には既存の静的 HTML 生成処理 `scripts/spec/build-spec.ts` と `pnpm run build:spec` が存在する。
- `buildSpecSite()` は出力先を指定できるため、仕様書の Web 配信用生成では既存関数を優先して再利用する。
- `pnpm run build:spec` の既定出力 `output/spec-site` と既存用途は維持する。
- `docs/spec/README.md` では Markdown が正本であり、Generated HTML は再生成可能な成果物として扱われている。
- `docs/curriculum/test-automation/README.md` の「全体構成」が Required Curriculum の学習順の正本である。
- Docs は Scenario Shop と同じ Cloudflare Pages の `dist/` から配信し、別ホスティングは追加しない。
- 仕様書・カリキュラムを既存 Scenario Shop Web と同じ閲覧範囲で配信する。既存 Web と異なる認証・閲覧制限が必要な場合は、この方式のまま実装を進めず別タスクとして扱う。

## 実装方針

### 1. Markdown の現在の配置を維持する

`docs/spec/` と `docs/curriculum/test-automation/` を Web 表示のために移動しない。

次の構成は採用しない。

- Markdown を `app/` や `public/` へ複製する
- Web 表示専用の JSON / Markdown を手動で別管理する
- ブラウザから GitHub API / Raw GitHub へアクセスして本文を取得する
- Docusaurus、VitePress、MkDocs 等の Docs アプリを追加する
- Docs 表示のためだけに Expo Router の `web.output` を `static` へ変更する

### 2. 現在使用されている Markdown 構文・リンクを先に棚卸しする

仕様書とカリキュラムの現在の Markdown を走査し、既存レンダラーで表示できる構文とリンク形式を確認する。

最低限、現在の文書で利用されている次の要素を確認する。

- 見出し
- 段落
- 箇条書き
- 番号付きリスト
- 表
- コードブロック
- 引用
- strong / emphasis / inline code
- Markdown リンク
- 見出しアンカー
- ローカル画像が実際に存在する場合は画像参照

この棚卸しを、カリキュラム Builder や共通化へ進む前の Gate とする。

現在使用されている構文を既存レンダラーが正しく表現できない場合は、次の順で対応する。

1. 現在実際に必要な構文だけを小さく追加する。
2. 小規模拡張で安全に扱えない場合のみ Markdown パーサー導入を検討する。
3. Docs フレームワーク導入には広げない。

現在使われていない Markdown 構文や表現機能を将来用として先回り実装しない。

### 3. 出力ルートと URL 変換規則を固定する

Web 配信用 Docs の出力ルートを `dist/docs` とする。

```text
outputRoot = dist/docs

spec       -> dist/docs/spec/**
curriculum -> dist/docs/curriculum/**
```

`build:docs` や内部 Builder に `dist/docs` を渡した結果、`dist/docs/docs/**` のように `docs` が二重にならない構造にする。

Markdown と HTML の対応は次を基本とする。

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

### 4. 仕様書は既存 `buildSpecSite()` を優先して再利用する

仕様書 Web 配信用生成のために、最初から `scripts/spec/build-spec.ts` 全体を共通基盤へ作り替えない。

まず既存の `buildSpecSite({ outputDir })` を使用し、Web 配信用出力先として `dist/docs/spec` を指定できる構成にする。

既存の次の契約を維持する。

```bash
pnpm run build:spec
```

- 既存コマンド名を変更しない。
- 既定出力 `output/spec-site` を維持する。
- Normative / Supporting の判定・ラベル等の仕様書固有表示を維持する。

カリキュラム実装後に Markdown レンダリング、リンク解決、出力パス計算などで実際の重複が発生した場合のみ、必要な関数を小さく共通化する。

「共通化すること」自体を完了条件にしない。

### 5. カリキュラム用の静的 HTML 生成を追加する

`docs/curriculum/test-automation/**/*.md` を再帰的に読み込み、`dist/docs/curriculum/**` に静的 HTML を生成する。

次を満たすこと。

- すべての対象 Markdown を HTML 生成対象にする。
- `README.md` は `index.html` にする。
- `part1/`、`part2/` の現在のディレクトリ階層を URL 上でも維持する。
- 仕様書用の `Normative Product Behavior` / `Supporting / Operational` ラベルを表示しない。
- カリキュラム固有のページタイトル・サイト名を使用する。
- `README.md` の本文に存在する現在の「全体構成」のリンクと順序を、そのまま主要な学習ナビゲーションとして利用する。
- README と重複する別の手動ナビゲーション定義や frontmatter を新設しない。

`README.md` に Required Navigation として列挙されていない Optional Reference / Legacy Alias の Markdown も、ファイルが対象ルート内に存在する限り HTML は生成する。ただし Required Curriculum の学習順へ自動挿入しない。

ページ単位の追加ナビゲーションを実装する場合も、README の canonical な順序から導出し、ファイル名ソートを学習順として扱わない。

### 6. 文書リンクを生成先 URL へ正しく変換する

Markdown の正本構造は変更せず、HTML 生成時に Web 配信用リンクへ変換する。

最低限、次を扱う。

- 同一ディレクトリ内の `*.md` リンク
- 親子ディレクトリ間の `*.md` リンク
- `README.md` へのリンク
- `#anchor` のページ内リンク
- `file.md#anchor` のリンク
- カリキュラムから仕様書へのリンク
- 外部 URL
- 現在実際に存在するローカル画像参照

例:

```text
docs/curriculum/test-automation/README.md
  ../../spec/README.md
      ↓
/docs/spec/
```

リンク解決では単純な文字列置換を使用せず、正規化した source path と公開対象ルートを基準に出力先を決定する。

ローカルリンクは次の分類を明示的に扱う。

| リンク先 | Web 生成時の扱い |
| --- | --- |
| `docs/spec/**/*.md` | `/docs/spec/**` の生成 HTML へ変換 |
| `docs/curriculum/test-automation/**/*.md` | `/docs/curriculum/**` の生成 HTML へ変換 |
| `https:`, `http:`, `mailto:`, `tel:` 等 | 変更しない |
| 公開対象外の Repository 内ファイル | Docs HTML として勝手に変換・コピーしない |
| Repository root 外へ逸脱する path | エラー |

公開対象外の Repository 内ファイルへの Markdown リンクが現在存在する場合は、棚卸し結果に基づいて必要最小限の扱いを決める。少なくとも `.html` へ機械変換して存在しない URL を作らない。

### 7. リンク先ファイルだけでなくアンカーも検証する

ローカル Markdown リンクの生成時に、対象ファイルの存在だけでなくアンカーも検証する。

```text
file.md#some-heading
```

について、次の両方を満たさない場合は検証失敗とする。

- 対象 Markdown が存在する。
- 対象 Markdown から生成される heading anchor に `some-heading` が存在する。

`#anchor` のページ内リンクも同様に現在ページの見出し一覧と照合する。

既存 `slugHeading` と重複見出しの suffix ルールを使用し、生成 HTML と検証側でアンカー規則を二重定義しない。

### 8. `build:docs` を追加し、`dist/docs` のみを所有する

仕様書とカリキュラムをまとめて Web 配信用に生成する入口を追加する。

```text
pnpm run build:docs
    ↓
dist/docs/spec/**
dist/docs/curriculum/**
```

`build:docs` の実行開始時に古い Docs 生成物が残らないよう `dist/docs` を削除してから再生成する。

削除対象は `dist/docs` のみに限定し、`dist/index.html`、`dist/_expo/**` 等の Expo Web 成果物は削除しない。

仕様書生成では既存 `buildSpecSite()` を `dist/docs/spec` へ向けて呼び出す。

カリキュラム生成では `dist/docs/curriculum` を使用する。

`pnpm run build:spec` は `build:docs` とは独立して従来どおり実行可能にする。

### 9. Expo Web export の後に Docs を同梱する

`build:web` の処理順を次にする。

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

Docs は必ず `expo export` 後に生成する。

`build:docs` の中から `build:web` を呼ばない。

同じ Expo export や前処理を二重実行するスクリプト構造にしない。

Cloudflare Pages のデプロイ対象は引き続き `dist/` のままとする。

### 10. `serve-web-dist.ts` を directory index 対応にする

現在のローカル静的サーバーは、拡張子のないパスを SPA route として `dist/index.html` へ fallback する。

`dist/docs/spec/index.html` と `dist/docs/curriculum/index.html` を `/docs/spec/`、`/docs/curriculum/` から正しく配信できるよう、`scripts/serve-web-dist.ts` のファイル解決順を修正する。

GET / HEAD の基本解決順を次にする。

1. 要求 path が通常ファイルならそのファイルを返す。
2. 要求 path がディレクトリなら、そのディレクトリ内の `index.html` が存在する場合はそれを返す。
3. 上記で解決できず、既存 Scenario Shop の SPA route として扱う path なら `dist/index.html` へ fallback する。
4. それ以外は既存契約に従って 404 とする。

これにより次を成立させる。

```text
/docs/spec/       -> dist/docs/spec/index.html
/docs/curriculum/ -> dist/docs/curriculum/index.html
/products         -> dist/index.html の SPA fallback
```

Path traversal 防止、symlink 拒否、GET / HEAD 制御等の既存セキュリティ契約は維持する。

### 11. Web アプリの Footer から Docs へ入口を追加する

Web の既存情報設計を維持し、`src/presentation/shells/storefront-shell.tsx` の Footer「サポート」セクションへ次の 2 リンクを追加する。

- 仕様書 → `/docs/spec/`
- テスト自動化カリキュラム → `/docs/curriculum/`

主要 EC 操作用の Desktop Header / Mobile Navigation へは追加しない。

Docs の URL は Expo Router route ではなく静的ファイルなので、Expo Router の `<Link>` で SPA route として扱わせず、Web の通常の `<a href="...">` で遷移させる。

Docs 入口追加のために新しいメニュー、Drawer、Docs 専用 Router route を作らない。

Native アプリのナビゲーションは変更しない。

### 12. 生成物検証を追加する

ビルド成功だけでなく、公開対象として整合した生成物になっていることを検証する。

最低限、次を確認する。

- `docs/spec/**/*.md` の対象ファイルが欠落なく生成される。
- `docs/curriculum/test-automation/**/*.md` の対象ファイルが欠落なく生成される。
- `README.md` と `index.html` の対応が正しい。
- 同じ出力先への衝突がない。
- 生成リンクの対象 HTML が存在する。
- `file.md#anchor` / `#anchor` の対象 anchor が存在する。
- 現在使用しているローカル画像がある場合、その出力先が存在する。
- source / output path が許可ルート外へ逸脱しない。
- Web ビルド後に `dist/docs/spec/index.html` が存在する。
- Web ビルド後に `dist/docs/curriculum/index.html` が存在する。
- 削除済み Markdown に対応する stale HTML が `dist/docs` に残らない。

壊れた Docs 内リンクを含む状態でビルドを成功扱いにしない。

### 13. Builder / link resolver の自動テストを追加する

実装した責務に対して必要最小限の自動テストを追加する。

最低限、次を確認する。

- `README.md` -> `index.html`
- 通常 Markdown -> `.html`
- ネストした Markdown の出力先
- 同一 Docs 内の相対リンク
- ネストしたページ間リンク
- `#anchor`
- `file.md#anchor`
- 存在しない anchor の拒否
- Curriculum -> Specification のクロスリンク
- 外部 URL を変更しない
- Repository root 外への path traversal を拒否
- `dist/docs` の stale output を残さない
- directory index 解決が SPA fallback より優先される
- `/products` 等の既存 SPA fallback が維持される

一時ディレクトリの小さな fixture が必要な場合のみ追加する。

現在存在しない Markdown 構文や asset パターンを想定した大量のテストケースを先回りで作らない。

### 14. 既存 `smoke.spec.ts` で Docs 公開経路を確認する

Docs 専用 E2E suite を新設する前に、既存 `e2e/web/smoke.spec.ts` へ最小の Docs smoke を追加する。

最低限、次を確認する。

1. 既存 Storefront smoke が引き続き PASS する。
2. `/docs/spec/` が Scenario Shop SPA ではなく仕様書固有ページとして表示される。
3. 仕様書の子ページを 1 件開ける。
4. `/docs/curriculum/` が Scenario Shop SPA ではなくカリキュラム固有ページとして表示される。
5. Part 1 または Part 2 の canonical な子ページを 1 件開ける。
6. カリキュラム内の仕様書リンクから仕様書へ遷移できる。
7. 320px 程度の幅でも、代表的な Docs ページの本文・表・コードブロックが閲覧不能にならない。

Docs ページの確認では URL が 200 相当で開いただけでは PASS にせず、仕様書 / カリキュラム固有の `<title>`、h1、本文等を検証する。

Cloudflare Pages の SPA fallback が Scenario Shop の `index.html` を返しただけの状態を PASS にしない。

## CI への接続

Docs の CI 検証自体は必須とするが、既存 CI 構造を増やしすぎない。

現在の `build-automation` / `build-production` は `pnpm run build:web` の `dist` を Artifact として後続ジョブへ渡しているため、`build:web` に Docs 生成を接続すれば Docs も同じ Artifact に含まれるようにする。

`build-automation` と `build-production` では、既存 `dist/index.html` の確認に加えて最低限次の存在確認を行う。

```text
dist/docs/spec/index.html
dist/docs/curriculum/index.html
```

既存 `production-smoke` と PR の `deploy-preview` 後の `pnpm run test:smoke` を利用して、次の両方を確認する。

- ローカルの production artifact から Docs が配信できる。
- Cloudflare Preview 上でも Docs が配信できる。

新しい CI job は、既存 job へ安全に組み込めない理由がある場合のみ追加する。

`.github/workflows/ci.yml` の変更は、上記 artifact 存在確認や既存 smoke への接続に必要な最小範囲に限定する。

## 検証コマンド

実装後は少なくとも次を実行できる状態にする。

```bash
pnpm run validate:spec
pnpm run validate:curriculum
pnpm run build:spec
pnpm run build:docs
pnpm run build:web
pnpm run test:smoke
```

Docs 用の独立した静的検証コマンドが必要な場合は `validate:docs` 等の責務が分かる名称で追加する。

既存 `verify` では `build:web` が Docs 生成を含むため、同じ `build:docs` / `build:web` を重複実行する構成にしない。

`pnpm run build:spec` は既存の独立成果物確認として維持する。

## 主な変更対象

実装時に主に確認・変更する対象は次とする。

```text
package.json
scripts/spec/build-spec.ts            # 必要な場合のみ小さく変更
scripts/spec/markdown.ts              # 現行構文対応や共通化が必要な場合のみ
scripts/docs/**                       # build:docs / 必要最小限の共通処理
scripts/curriculum/**                 # curriculum builder を分ける場合のみ
scripts/serve-web-dist.ts             # directory index 対応
src/presentation/shells/storefront-shell.tsx
                               # Footer の Web Docs 入口
tests/**                              # Builder / resolver / static server のテスト
e2e/web/smoke.spec.ts                 # Docs smoke
.github/workflows/ci.yml              # artifact 検証等の最小変更
```

既存ファイルに適切な責務がある場合は、その構造を優先する。

`scripts/docs/**` と `scripts/curriculum/**` の両方を機械的に新設する必要はない。

## 変更しないもの

本対応では次を変更しない。

- `docs/spec/` の仕様体系・Product Behavior
- `docs/curriculum/test-automation/` の教材内容・Required 学習順
- Web / Native の EC 機能
- Native アプリのナビゲーション
- Expo Router の `web.output: "single"`
- Cloudflare Pages 以外のホスティング基盤
- Scenario Shop と別の Docs 認証・閲覧権限制御
- Docs 専用 Router アプリ
- Generated HTML の Git 管理

Web 表示都合だけで Markdown 本文を変更しない。生成・リンク解決側で扱えないことが確認できた場合のみ、文書として本来修正すべき内容かを切り分ける。

## 完了条件

以下をすべて満たした時点で完了とする。

- `docs/spec/` を正本のまま `/docs/spec/` から閲覧できる。
- `docs/curriculum/test-automation/` を正本のまま `/docs/curriculum/` から閲覧できる。
- 現在の対象 Markdown が欠落なく HTML 化される。
- `dist/docs/spec/**` と `dist/docs/curriculum/**` に想定どおり生成される。
- `dist/docs/docs/**` のような誤った二重階層を作らない。
- `/docs/spec/` と `/docs/curriculum/` で各 directory の `index.html` が返る。
- `/products` 等の既存 SPA route の fallback を壊していない。
- 文書内リンク、アンカー、現在使用中のローカル画像が正しく機能する。
- カリキュラムから仕様書へのリンクが正しく機能する。
- Required Curriculum の順序は README の「全体構成」を正本とし、Optional / Legacy を自動挿入しない。
- 壊れた Docs 内リンク・存在しないアンカー・path traversal を検出できる。
- `build:docs` 再実行時に stale HTML が残らない。
- `pnpm run build:spec` の既存コマンド・出力先・表示契約を壊していない。
- `pnpm run build:web` の `dist/` に Docs が含まれる。
- Scenario Shop Footer から仕様書・カリキュラムへ遷移できる。
- Docs の静的 URL を Expo Router route として誤処理しない。
- 既存 Web smoke が PASS する。
- Production artifact の smoke で Docs が確認される。
- Cloudflare Preview の smoke で Docs が確認される。
- 320px 程度の表示幅でも代表的な Docs が閲覧不能にならない。
- `web.output: "single"` を維持する。
- Native アプリに不要な変更を入れない。
- Generated HTML を正本として手動管理しない。

## 実装時の停止条件

次のいずれかに該当した場合は、その場で実装範囲を広げず別途整理する。

### Scenario Shop と異なる Docs の閲覧制御が必要

既存 Cloudflare Pages の `dist/` へ同梱する方式では要件を満たさないため、認証・ホスティング設計を本対応へ追加せず別タスクとする。

### 現在の Markdown を小規模な既存レンダラー拡張で正しく表現できない

大規模な Markdown / Docs 基盤への置き換えを本対応で始めない。未対応構文と必要性を整理して別途方針を決める。

### 既存 `buildSpecSite()` を Web 配信用出力へ安全に再利用できない

先に既存 `build:spec` の利用契約を確認する。カリキュラム対応のために既存仕様書生成を破壊する実装へ進まない。

### Cloudflare Pages で静的 `/docs/**` より SPA fallback が優先される

実デプロイ挙動を確認し、必要最小限の Pages 配信設定で解決できるか整理する。Expo Router 全体を `static` 化して回避しない。

### Web 表示のために Markdown 構造そのものの大幅変更が必要

文書構造変更をこのタスクへ取り込まず、生成側で吸収できない理由を切り分ける。

## 実装順

1. 仕様書・カリキュラムの現在の Markdown 構文、リンク、ローカル asset を棚卸しする。
2. Web Docs の source root、`dist/docs` output root、URL 変換規則を固定する。
3. 既存 `buildSpecSite()` を使用して `dist/docs/spec` へ仕様書を生成できるようにする。
4. カリキュラム Builder を追加し、全 Markdown を `dist/docs/curriculum` へ生成する。
5. README の Required Curriculum 順序と Optional / Legacy の扱いを実装する。
6. Docs 内リンク、Specification / Curriculum 間クロスリンク、anchor 検証を実装する。
7. 実際に重複した処理だけを必要最小限で共通化する。
8. `build:docs` を追加し、`dist/docs` の clean と再生成を実装する。
9. `build:web` の `expo export` 後へ `build:docs` を接続する。
10. `serve-web-dist.ts` を directory `index.html` 優先で配信できるよう修正する。
11. Storefront Footer の「サポート」へ仕様書・カリキュラムの通常 `<a>` リンクを追加する。
12. Builder / link resolver / static server の必要最小限の自動テストを追加する。
13. `e2e/web/smoke.spec.ts` に Docs smoke を追加する。
14. CI の automation / production artifact に Docs が含まれることを確認する。
15. Production artifact smoke と Cloudflare Preview smoke で Docs 固有ページを検証する。

## 対象外

次は今回の完了条件に含めない。

- 全文検索
- 文書編集 UI
- Docs のバージョン切り替え
- Git branch / tag ごとの Docs 公開
- カリキュラム受講進捗管理
- Scenario Shop と別の Docs ログイン・閲覧権限
- Docs 専用分析基盤
- 現在使われていない Markdown 表現機能の追加
- Mermaid 等の新規表現機能
- Docs 専用フレームワークへの移行
- Expo Router 全体の static rendering 化
- Repository 全体を Web ドキュメントとして公開する機能
