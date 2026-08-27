# 仕様書・テスト自動化カリキュラム Web 公開 実装プラン

## 目的

現在の Markdown 構造を正本として維持したまま、Scenario Shop の Web デプロイ成果物から仕様書とテスト自動化カリキュラムを閲覧できるようにする。

対象の正本は次のとおりとする。

- 仕様書: `docs/spec/**/*.md`
- テスト自動化カリキュラム: `docs/curriculum/test-automation/**/*.md`

Web 表示用に Markdown を別ディレクトリへ複製して管理せず、ビルド時に正本 Markdown から静的 HTML を生成する。

## 完了時の状態

少なくとも次の入口から、デプロイ済み Web 上で文書を閲覧できること。

- `/docs/spec/`
- `/docs/curriculum/`

生成物は Expo Web のデプロイ成果物である `dist/` 配下へ含める。

```text
dist/
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
        ├── part1/
        │   └── *.html
        └── part2/
            └── *.html
```

## 前提

- Web は Expo Router / Expo Web を使用している。
- `app.config.ts` の `web.output` は `single` であり、本対応では変更しない。
- 現在の `build:web` は `expo export --platform web` により `dist/` を生成する。
- 仕様書には既存の静的 HTML 生成処理 `scripts/spec/build-spec.ts` と `pnpm run build:spec` が存在する。
- `docs/spec/README.md` では Markdown が正本であり、Generated HTML は再生成可能な成果物として扱われている。
- カリキュラムの `docs/curriculum/test-automation/README.md` には、共通、Part 1、Part 2 の現在のナビゲーション順が定義されている。

## 実装方針

### 1. Markdown の現在の配置を維持する

`docs/spec/` と `docs/curriculum/test-automation/` を Web 表示のために移動しない。

次のような構成は採用しない。

- Markdown を `app/` や `public/` へ複製する
- Web 表示専用の JSON / Markdown を手動で別管理する
- ブラウザから GitHub API / Raw GitHub へアクセスして本文を取得する
- Docusaurus、VitePress など別の Docs アプリを導入する
- Docs 公開のためだけに Expo Router の `web.output` を `single` から `static` へ変更する

### 2. 既存の仕様書ビルダーを壊さず、再利用可能な部分を共通化する

現在の `scripts/spec/build-spec.ts` が持つ Markdown 読み込み、HTML レンダリング、見出し・目次、リンク変換、アセットコピーなどのうち、仕様書固有ではない処理を Docs 共通処理として利用できる形へ整理する。

仕様書固有の次の責務は共通処理へ混ぜない。

- Normative Product Behavior の判定
- Supporting / Operational の判定
- 仕様書固有のラベル表示
- `docs/spec/` 固有の Oracle 表現

`pnpm run build:spec` は既存利用箇所を壊さないよう、現在のコマンドと既定の出力先を維持する。

### 3. 現在使用されている Markdown 構文を先に確認する

仕様書とカリキュラムの Markdown を走査し、既存レンダラーが現在の文書を欠落なく表示できるかを確認する。

最低限、現在のレンダラーが扱っている次の構文を確認する。

- 見出し
- 段落
- 箇条書き
- 番号付きリスト
- 表
- コードブロック
- 引用
- インラインリンク
- ローカル画像
- 見出しアンカー

現在の文書で使われている構文が未対応の場合、表示を黙って欠落させない。

対応方法は次の優先順とする。

1. 現在実際に使われている構文だけを既存レンダラーへ追加する。
2. 既存レンダラーの小規模拡張では安全に扱えない場合のみ、小さな Markdown パーサー導入を検討する。
3. Docs フレームワーク全体の導入には広げない。

未対応構文を正しく表示できない状態では完了としない。

### 4. カリキュラム用の静的サイト生成を追加する

`docs/curriculum/test-automation/` を再帰的に読み込み、静的 HTML を生成できるようにする。

次を満たすこと。

- `README.md` は `index.html` として生成する。
- `part1/`、`part2/` を含む現在のディレクトリ階層を URL 上でも維持する。
- `README.md` に定義されている現在の学習順をナビゲーションへ反映する。
- 仕様書用の `Normative Product Behavior` 等のラベルをカリキュラムへ表示しない。
- カリキュラム固有の見出し・サイト名を使用する。
- カリキュラム内にローカル画像等のアセットが存在する場合も生成先へコピーできる構造にする。

### 5. 文書間リンクを生成先 URL へ正しく変換する

Markdown のファイル構造は変更せず、HTML 生成時にリンク先だけを Web 用へ変換する。

最低限、次のパターンに対応する。

- 同一ディレクトリ内の `*.md` リンク
- 親子ディレクトリ間の `*.md` リンク
- `README.md` へのリンク
- `#anchor` のみのページ内リンク
- `file.md#anchor` のリンク
- 外部 URL
- ローカル画像
- カリキュラムから仕様書へのリンク

例として、カリキュラムに存在する `../../spec/README.md` のようなリンクが、デプロイ後に `/docs/spec/` へ到達できること。

リンク解決処理では、単純な文字列置換ではなく正規化したパスを基準に生成先を決定する。

許可した Docs ルート外へ `../` で逸脱するローカルリンクやアセット参照は、誤ったファイルをコピーせず明示的なエラーとして扱う。

### 6. 仕様書とカリキュラムをまとめて生成する `build:docs` を追加する

仕様書とカリキュラムを Web デプロイ向けにまとめて生成する入口を追加する。

想定する責務は次のとおり。

```text
build:docs
├── docs/spec/**/*.md -> <output>/docs/spec/**
└── docs/curriculum/test-automation/**/*.md -> <output>/docs/curriculum/**
```

`build:docs` の出力先を指定可能にし、Web ビルドでは `dist/docs/` を使用できるようにする。

既存の `build:spec` は単独でも引き続き実行できること。

### 7. Expo Web のビルド成果物へ Docs を同梱する

Docs の生成は `expo export --platform web` の後に行う。

`expo export` により `dist/` が再生成・消去される可能性があるため、次の順序を保証する。

```text
Web 用前処理
  ↓
expo export --platform web
  ↓
Docs 生成
  ↓
dist/docs/spec/**
dist/docs/curriculum/**
```

必要であれば `build:web` 内の責務を分け、再帰呼び出しや同じ前処理の二重実行が発生しないスクリプト構成にする。

Cloudflare Pages のデプロイ先が現在 `dist/` である前提を維持し、Docs 専用の別デプロイを追加しない。

### 8. Web アプリから仕様書・カリキュラムへの入口を追加する

既存の Web ナビゲーションを確認し、ユーザーが通常の Web 画面から次へ遷移できる最小の入口を追加する。

- 仕様書
- テスト自動化カリキュラム

既存のガイドやヘッダー等、現在の情報設計に適した場所を利用する。

Docs 入口のためだけに新しい大規模なナビゲーション機構を作らない。

Web 専用の静的 Docs リンクが Native 側へ不要に露出しないようにする。

Expo Router が静的 Docs URL の遷移を SPA 内部ルートとして誤って処理しないことも確認する。

### 9. 生成物の検証を追加する

生成成功だけでなく、デプロイして閲覧可能な状態までビルド時に検証する。

最低限、次を検証する。

- `docs/spec` の対象 Markdown がすべて生成対象になっている。
- `docs/curriculum/test-automation` の対象 Markdown がすべて生成対象になっている。
- `README.md` と `index.html` の対応が正しい。
- 生成したローカルリンクの参照先ファイルが存在する。
- ページ内アンカーを保持している。
- ローカル画像の参照先ファイルが存在する。
- 同じ出力先へ複数ファイルが衝突しない。
- 出力パスが許可した `docs` 出力ルート外へ逸脱しない。
- Web ビルド後に `dist/docs/spec/index.html` が存在する。
- Web ビルド後に `dist/docs/curriculum/index.html` が存在する。

壊れたローカルリンクを含む状態でビルドを成功扱いにしない。

### 10. テストを追加する

共通リンク・出力処理について、少なくとも次のケースを自動テストする。

- `README.md` -> `index.html`
- 通常の Markdown -> `.html`
- ネストした Markdown の出力先
- 同一サイト内の相対リンク
- ネストしたページ間の相対リンク
- アンカー付きリンク
- カリキュラム -> 仕様書のクロスサイトリンク
- 外部 URL を変更しないこと
- ローカルアセットのコピー・参照
- 許可ルート外へのパス逸脱を拒否すること

可能であれば一時ディレクトリに小さな Docs fixture を生成し、実際の生成結果を確認する統合テストも追加する。

既存 `build:spec` の出力互換性を壊していないこともテストまたは既存検証で確認する。

### 11. Web E2E / Smoke で公開経路を確認する

ローカルまたはデプロイ相当の Web サーバーに対し、最低限次を確認する。

1. `/docs/spec/` が仕様書として表示される。
2. 仕様書の子ページへナビゲーションできる。
3. `/docs/curriculum/` がカリキュラムとして表示される。
4. Part 1 または Part 2 の子ページへナビゲーションできる。
5. カリキュラム内の仕様書リンクから仕様書へ遷移できる。
6. Docs 追加後も既存の主要な Scenario Shop Web ルートが表示できる。
7. モバイル幅でも本文・表・コードブロック・ナビゲーションが横にはみ出して閲覧不能にならない。

Cloudflare Pages の SPA fallback により、存在しない Docs URLへ Scenario Shop の `index.html` が返されただけの状態を PASS としない。Docs ページ固有のタイトルまたは本文を確認する。

## 変更対象の想定

実装時に主に確認・変更する候補は次のとおり。

```text
package.json
scripts/spec/build-spec.ts
scripts/spec/markdown.ts
scripts/docs/**                       # 必要な共通処理
scripts/curriculum/**                 # 必要なカリキュラム用入口
app/** または既存 Web navigation      # Docs への最小入口
tests/**                              # Builder / link resolver のテスト
e2e/web/**                            # Docs smoke が必要な場合
.github/workflows/ci.yml              # 現行 build:web だけでは検証不足の場合のみ
```

実装前の確認で既存ファイルに適切な責務がある場合は、その構造を優先し、上記の新規ディレクトリを機械的に追加しない。

## 変更しないもの

本対応では次を変更しない。

- `docs/spec/` の仕様体系そのもの
- `docs/curriculum/test-automation/` の学習内容や学習順
- Product Behavior
- Web / Native の EC 機能
- Native アプリのナビゲーション
- Expo Router の `web.output: "single"`
- Cloudflare Pages 以外の新しいホスティング基盤
- Docs の認証・閲覧権限制御

文書本文の修正が必要になった場合も、Web 表示都合だけで内容を書き換えるのではなく、まず生成・リンク解決側で吸収できないかを確認する。

## CI / 検証コマンドの最終形

既存コマンドを維持したうえで、実装後は少なくとも次の流れを実行できる状態にする。

```bash
pnpm run validate:spec
pnpm run validate:curriculum
pnpm run build:spec
pnpm run build:docs
pnpm run build:web
```

Docs 用の独立した検証コマンドを追加する場合は `validate:docs` など責務が分かる名称とし、最終的に既存 `verify` から必要な検証が実行されるようにする。

既存 `verify` に同じ重いビルドを重複して追加しない。

## 完了条件

以下をすべて満たした時点で実装完了とする。

- `docs/spec/` を正本のまま、デプロイ Web の `/docs/spec/` から閲覧できる。
- `docs/curriculum/test-automation/` を正本のまま、デプロイ Web の `/docs/curriculum/` から閲覧できる。
- 現在の対象 Markdown が欠落なく Web 化される。
- ディレクトリ階層を維持した URL で子ページを閲覧できる。
- 文書内リンク、アンカー、ローカル画像が正しく機能する。
- カリキュラムから仕様書へのリンクが正しく機能する。
- 壊れたローカルリンクや不正な出力パスはビルド・検証で検出される。
- `pnpm run build:spec` の既存用途を壊していない。
- `pnpm run build:web` の成果物 `dist/` に Docs が含まれる。
- `web.output: "single"` を維持している。
- 既存 Web の主要導線・既存テストに回帰がない。
- Native アプリに不要な変更が入っていない。
- Generated HTML を正本として手動管理する構造になっていない。

## 実装時の停止条件

次のいずれかに該当した場合は、そのまま実装範囲を広げず原因を整理する。

### 現在の Markdown を既存レンダラーで正しく表現できない

現在実際に使用している構文だけを小さく補完できるか確認する。大規模な Markdown / Docs 基盤への置き換えが必要になる場合は、本対応に含めず別途方針を決める。

### Cloudflare Pages で `/docs/**` の静的ファイルより SPA fallback が優先される

Docs ページを正常配信できるルーティング・デプロイ設定を特定してから進める。Expo Router 全体を `static` 化することで回避しない。

### 既存 `build:spec` の利用箇所と互換性を保てない

既存利用箇所を先に特定し、仕様書の公開経路を壊さない方法へ修正する。カリキュラム対応の都合で既存コマンドを破壊しない。

### Web 表示のために文書構造そのものの大幅変更が必要になる

文書構造変更は本対応の目的外とし、生成側の設計で吸収できない理由を整理して別タスクとする。

## 実装順

1. 仕様書・カリキュラムで現在使われている Markdown 構文とリンク形式を洗い出す。
2. 既存 `build:spec` の共通化可能部分と仕様書固有部分を分離する。
3. 共通の出力パス・リンク・アセット解決を実装し、既存仕様書生成の互換性を確認する。
4. カリキュラム静的 HTML 生成を追加する。
5. 仕様書とカリキュラム間のクロスリンクを解決する。
6. `build:docs` を追加する。
7. `build:web` の Expo export 後に `dist/docs/` を生成するよう接続する。
8. Web の既存導線へ仕様書・カリキュラムの入口を追加する。
9. Builder / link resolver / asset の自動テストを追加する。
10. Web 上の Docs smoke と既存機能の回帰確認を行う。
11. CI / `verify` に必要最小限の Docs 検証を接続する。

## 対象外

次は今回の完了条件に含めない。

- 全文検索
- 文書の編集 UI
- Docs のバージョン切り替え
- Git branch / tag ごとの Docs 公開
- カリキュラムの受講進捗管理
- ログインユーザーごとの Docs 権限
- Docs 専用の分析基盤
- Mermaid 等の新しい表現機能の追加（現在の文書で必須でない限り）
- Docs 専用フレームワークへの移行
- Expo Router 全体の static rendering 化
