# 現行仕様書・教材の日本語表現とリンク整合性の改善 Plan

## 0. 依頼概要

- **目的**：PR #198で日本語化した現行文書に残る不要な英語を自然な日本語へ統一する。仕様書のH1〜H6、目次、画面カタログ、文書内・文書間リンクを一致させ、可否を表す人間向けの `Yes/No` は `〇/×` にする。
- **作業ブランチ**：`docs/plan-japanese-spec-curriculum-links`。
- **基準**：2026-10-19時点の `main`、commit `44b9e214a765a0ee4f25ec996d801ea046199a60`。PR #198はmerge済み。別件のPR #199はopenであり、本Planの対象に含めない。
- **今回の実施権限**：本Planの保存のみ。文書本文・コード・テスト・CI設定の修正、PR作成、mergeは行わない。後続の実装は別途依頼を受けて行う。

## 1. ゴール・完了条件

現行の仕様書、教材と主要な利用者向け説明文について、自然な日本語で読み進められる状態にする。英語を単純に削ることを目的とせず、製品・教育・QAの意味と実行可能な機械契約を保持する。

実装完了条件：

1. `docs/spec/` の人間向けH1〜H6、章名・画面表示名・本文・表見出し・目次・リンク表示が日本語中心に統一され、カートだけ表記が異なる状態が解消されている。必要な `BR-*`、`AC-*`、`SCREEN-*`、状態slugなどの識別子は維持する。
2. 対象とした現行教材・主要説明文も `docs/WRITING_STANDARDS.md` に沿った表記となり、英語表現を残す場合は正式名称、定着した技術用語、コマンドまたは機械値などの理由を説明できる。
3. 人間向けの可否・真偽を示す `Yes/No`（大文字・小文字を含む）は `〇/×` に統一される。条件不問の `-`、`no session`、`own only`、機械処理上の値は意味を失う置換をしない。記号は `〇`（U+3007）、`×`（U+00D7）とする。
4. 見出しから生成されるアンカーと、仕様書内外の現在利用中のMarkdownリンク、画面カタログの38画面参照、Agentic QAの `spec_refs` に未解決の参照がない。生成したHTML上の目次と遷移も確認する。
5. 現行の仕様、業務ルール、BR/ACのID・参照、役割・権限、状態・画像参照、学習順・修了条件・評価・禁止事項に意味の変更がない。既存の正例・負例を削除・skipせず、必要なテストを更新する。
6. 必須の検証が最終実装HEADで成功する。失敗・未実行が残れば完了とはせず原因と範囲を記録する。

## 2. 確認済みの現状

- `docs/spec/features/cart.md` は `# カート（Cart）`、`## 目的・対象範囲（Purpose / Scope）` など英語併記。一方、ほかの機能仕様書には `# Checkout and Payment`、`## Purpose / Scope`、`#### Functions` など英語見出しが残っている。
- `docs/spec/_templates/feature-spec.md` も英語見出しのままなので、本文だけ更新すると新規仕様書で再発する。
- `docs/spec/README.md` の目次表示名は英語・日本語が混在。`docs/spec/screen-catalog.md` は各画面の英語表示名と旧英語見出しに対応するアンカーを含む。38画面のカタログと画面所有者契約を維持する。
- `docs/spec/roles-and-permissions.md` の権限表、`docs/spec/screen-catalog.md` の対応プラットフォーム列、`docs/curriculum/test-automation/01_spreadsheet-test-design.md` と `part1/03_test-design-and-automation-selection.md` の判定表、`docs/06_flows/user_flows.md` のMermaid分岐などに人間向け `Yes/No` が残る。
- `scripts/spec/validate-spec.ts` の必須5章、`scripts/spec/visual-contract.ts` の画面下位3章・親章・状態表9列・共通仕様書の `Screen Contracts` 見出し、`scripts/spec/markdown.ts` のナビゲーション見出しは、現行の英語または英語併記の限られた表記を認識する。**日本語だけの章名への変更には解析の追従が必要**。
- `scripts/spec/slug-heading.ts` は日本語を含むアンカーを生成でき、`scripts/spec/validate-spec.ts` と `scripts/agentic-qa/spec-refs.ts` は実在するアンカーを確認する。既存の仕組みを再利用する。
- `scripts/spec/materialize-visual-references.ts` は英語の画像参照用見出しを生成する。`scripts/spec/markdown.ts` の生成目次にも `Contents` が残る。人間向け生成表示も必要な範囲で合わせる。
- `tests/contracts/training-curriculum.test.ts` は正規17レッスンの章名と8つの表項目を文字列で検証する。教材の日本語化後は正常な8項目・順序・内容の検証を維持して修正する。
- `scripts/validate-curriculum.ts` の `validateCurriculum()` は `03_instructor-reference.md` にある4区分（`Public Reference`、`Expected Contract`、`Alternative Design`、`Anti-pattern`）の英語文字列を `assertContains()` で要求する。英語併記を外す場合は本体validatorも追従させる。
- `validateCurriculumLinks()` と `scripts/docs/build-docs.ts` の `resolveCurriculumLink()` は、教材からのリンク先ファイルの存在を確認しても `#fragment` の実在を保証しない。現行文書から仕様書への参照は別途照合が必要。
- `scripts/spec/build-spec.ts` と `scripts/docs/build-docs.ts` の `pageHtml()` にも `Navigation`、分類ラベル、タイトルなどの読者向け英語表示がある。`scripts/spec/markdown.ts` の `Contents` だけでなく、生成HTMLの表示文言も確認対象とする。
- `.codex/text-quality-rules.json` の独自ルールは4件の具体的英語表現を対象とするため、今回の英語見出しや `Yes/No` をすべて検出するものではない。既存の `lint:text:all` 成功を日本語化完了の根拠としない。
- `docs/WRITING_STANDARDS.md` には一般語・技術用語・機械値・過去記録の扱いと意味保持の規約が既にある。これを優先し、可否記号のルールだけ必要な範囲で追記する。

## 3. 対象範囲・対象外

### 必須：正式仕様書

- `docs/spec/README.md`、`product-scope.md`、`roles-and-permissions.md`、`screen-catalog.md`、`state-and-scenarios.md`、`ui-ux-contract.md`、`glossary.md`、`change-process.md`、`known-deviations.md`、`unresolved-specifications.md`。
- `docs/spec/features/*.md` の11機能仕様（`cart.md`、`authentication.md`、`checkout-and-payment.md`、`storefront.md`、`orders.md`、`reviews.md`、`admin-catalog.md`、`admin-inventory.md`、`admin-orders.md`、`admin-users.md`、`native-customer.md`）。
- `docs/spec/_templates/feature-spec.md`。画像など `docs/spec/assets/` のバイナリは変更しない。

### 必須：現行の教育・参照文書

- `docs/curriculum/test-automation/` にある現在提供中の本文、README、習熟度評価基準、講師資料、Part 1／Part 2の正規17レッスン、追加の現行教材。ファイルの存在を基準に洗い出し、教材の追加・削除や学習経路の再設計はしない。
- `README.md`、`QA_AGENT.md`、`CONTRIBUTING.md`、`SECURITY.md` と、`docs/00_overview/`〜`docs/13_decisions/` の現在参照される仕様・設計・利用者向け説明、`docs/guides/`、`docs/native/`、`docs/reference/` における今回の文章規約と実際に関係する箇所。
- `training/` 配下の現行README・利用者向け案内のうち、同一の概念・リンク・可否表記を扱う箇所。機械処理用YAML/CSV/JSONのキー・固定値は対象外。
- `docs/WRITING_STANDARDS.md` には、今回の日本語見出し・リンク同期・`〇/×` の採用ルールを既存規約と重複しない範囲で追記する。

### 対象外

- 製品コードの動作変更、UI上の正式名称変更、ルーティング変更、権限やビジネスルールの変更、学習カリキュラム構成の変更。
- ソースの識別子、ファイル名・ディレクトリ名、API名、コマンド、環境変数、Schema・enum・CSVキー、ログ・テスト結果・エラー文の固定値。人間向け説明のみ書き換え可能。
- `docs/history/`、`docs/reports/`、既存`docs/plans/`、`docs/adr/`、`.codex/runs/`、生成済み成果物・過去の評価記録・fixture・snapshot、`CHANGELOG.md` の履歴部分。これらから現在の仕様書へ向く**古いリンクは検出・報告**するが、履歴を機械的に改変しない。
- PR #199のPlan群と知識グラフ、将来の新カリキュラム実装、Agent Skillパッケージ、CI構成の再設計。現行文書の変更がPR #199で参照する仕様・教材へ影響する場合は競合・追従事項として記録する。

## 4. 表記方針と固定値の境界

| 種別 | 対応例 | 注意点 |
| --- | --- | --- |
| 章見出し | `Purpose / Scope` → `目的・対象範囲`、`Business Rules` → `ビジネスルール`、`Acceptance Criteria` → `受入基準` | 既存の5章・順序は維持 |
| 画面下位見出し | `Functions` → `機能一覧`、`Important UI States` → `主要なUI状態`、`Visual References` → `画面リファレンス` | 画面単位の3章・順序は維持 |
| 画面見出し | `SCREEN-AUTH-LOGIN — Login` → `SCREEN-AUTH-LOGIN — ログイン` | `SCREEN-*` のIDは変更しない |
| 参照リンク | `[Storefront](./features/storefront.md#...)` → 日本語表示と**実際の見出しから計算したアンカー** | 推測でslugを書かない |
| 真偽・可否 | `Yes` → `〇`、`No` → `×` | `-` は条件不問、`no session` はセッションなしとして別に表現 |
| 技術用語 | `Playwright`、`GitHub Actions`、`API`、`CI`、`SKU`、`BR/AC ID` | 技術的に必要な名称は維持 |
| 機械値 | `required`、`shared`、`not-applicable`、`baseline`、`default`、`guest`、`customer` など | 日本語の注記は追加できるが、データ値は変更しない |

- `docs/spec/roles-and-permissions.md` では `yes/no` のみを記号化し、`read`、`login denied`、`no session`、`own only` のような権限の違いを具体的な日本語で保持する。
- `docs/spec/screen-catalog.md` のWeb/Android対応列は表示を `〇/×` にする。`Automation Web` は単なる真偽ではないため、テスト専用画面の対応範囲が失われないよう別途説明または現行値を維持する。`parseScreenCatalog()` などの利用側が依存する値・型は利用箇所を確認し、**必要なら入力表記だけを内部表現へ正規化**する。既存の外部契約を根拠なく変更しない。
- デシジョンテーブルの `-` は「条件を問わない」ので記号に変えない。Mermaidの `Yes/No` 分岐ラベルは `〇/×` へ変更して図の描画を検証する。
- 表の列名は、読者向けの `Screen`、`Audience`、`Primary specification` や状態表9列などを翻訳してよい。ただし列順・列数・解釈・有効な機械値を維持し、解析処理の列名照合を同時に修正する。
- `## 実行可能な正本ソース` など日本語だけの見出しを標準にする。人間向け文章に不要な英語併記を残さない。見出しを必ず英語で書く必要があると判断した場合、その根拠を変更記録に残す。
- 意味を変える危険がある一括翻訳・正規表現による全面置換はしない。語句ごとの文脈と元の仕様の制約強度（必須・推奨・任意）を確認する。

## 5. 実装タスクと変更先

### 1. 対象の棚卸しと参照台帳

- [ ] 基準commitの対象Markdownを列挙し、**見出し（H1〜H6）・表見出し・可否セル・英語説明文・リンク表示・アンカー・他文書からの参照**を抽出する。過去記録と機械値を対象から除く。
- [ ] `docs/spec/screen-catalog.md` の38画面から、画面ID、所有仕様書、H3表示名、旧アンカー、相対リンク、可否の値を対応付ける。正しいカタログ件数・対象を基準とし、画面の追加・削除はしない。
- [ ] `docs/spec/` 内に限らず、現在使うREADME・教材（必須・追加の現行文書）・`QA_AGENT.md`・QA参照文書・`spec_refs` を検索し、同一文書内と文書間の `#fragment` 付きリンクを参照元・参照先ごとに記録する。旧アンカーを含む**過去記録・外部からの参照は未更新として別記**する。
- [ ] 編集対象の全文とPR #198の前後を必要に応じて照合し、業務条件・例外・禁止事項・学習評価の意図しない変更を防ぐ。検索ヒット件数を「変更必要件数」とはみなさない。

### 2. 日本語の標準表記を決め、契約を先に対応

- [ ] `docs/spec/_templates/feature-spec.md` に標準の日本語H1/H2/H3/H4、`関連ビジネスルール:` 等を反映する。`BR-*`、`AC-*`、`SCREEN-*` 形式と章階層を維持する。
- [ ] `scripts/spec/validate-spec.ts` のFeature必須5章に日本語のみの正規見出しを追加し、欠落・重複（異表記の混在含む）・順序違反を引き続き拒否する。`関連ビジネスルール:` の既存認識と `Acceptance: N/A` の機械契約は必要以上に変更しない。
- [ ] `QA_AGENT.md` に記載されたFeature必須5章の許容見出しをvalidatorの契約と一致させる。現在の英語・英語併記の許容を、現行仕様書の日本語のみの標準表記と混同しない。
- [ ] `scripts/spec/markdown.ts` のNavigation見出しとして `ナビゲーション` を許可し、重複検出・抽出順序・リンク切れ検査を維持する。生成目次の `Contents` と `Table of contents` などの利用者向け固定表示・アクセシビリティ用ラベルも日本語化する。
- [ ] `scripts/spec/build-spec.ts` と `scripts/docs/build-docs.ts` の両方の `pageHtml()` にある `Navigation`、`Normative Product Behavior`、`Supporting / Operational`、`Scenario Shop Specification`、`Scenario Shop Test Automation Curriculum` などを、表示箇所（本文外のナビゲーション、分類、タイトル、`aria-label`）ごとに確認する。説明用の英語を日本語へ変更し、製品名 `Scenario Shop` や内部識別子・パス・HTML属性名は維持する。
- [ ] `scripts/spec/visual-contract.ts` のFeature親章、共通ownerの `Screen Contracts`、画面H4の3つ、状態表9列の日本語名称を受け付ける。欠落・重複・順序・列数・所有関係・状態slug・画像参照などの拒否条件を維持する。
- [ ] `scripts/spec/visual-contract.ts` のScreen Catalog解析について、`〇/×` 化に必要な入力処理を確認する。画面数、画面class、ルート、Web/Androidの対象、公開される利用値を保持し、表記だけ変更できるなら不要な解析変更を加えない。
- [ ] `scripts/spec/materialize-visual-references.ts` の生成見出しと、既存の `visualReferencesForState()` の境界を確認する。生成前後の再実行で画像参照が重複しないことを維持する。
- [ ] `scripts/spec/slug-heading.ts` と `scripts/agentic-qa/spec-refs.ts` は原則変更せず、生成済みアンカーと `resolveSpecReference()` の既存検証を使用する。外部で保存済みの旧slugを無条件に互換扱いしない。

### 3. 仕様書の本文・表・リンクを更新

- [ ] `docs/spec/` の機能・共通仕様書・目次・画面カタログを上記標準で書き直す。カートも英語併記を整理する。
- [ ] `SCREEN-*` の見出し変更後、既存 `slugHeading()` と重複見出しの番号規則に従って、新しい `#fragment` を求め、参照元のMarkdownリンクを更新する。**変更前のリンクと変更後のリンクを対応付け、参照漏れを検証する**。
- [ ] 画面カタログ38画面について、画面名・リンク表示・所有仕様書・H3アンカー・Web/Androidの可否を画面IDごとに突き合わせる。各 `Primary specification` のリンク先が実在するだけでなく、**リンク先H3がそのカタログ行の `SCREEN ID — ` で始まることを38件すべて検証**する。別画面IDの実在アンカーを指した場合も不正とする。相対パス・BR/ACの参照・画像パスは保持する。
- [ ] 仕様書内の真偽表・説明文、Mermaid分岐、画面状態表の読者向けラベルを文脈に応じて変更する。表の`-/-`や状態IDを真偽記号に置換しない。

### 4. 教材と周辺文書を更新

- [ ] `docs/curriculum/test-automation/` の現行レッスン、読み進め方、講師向け説明、デシジョンテーブルを点検し、日本語だけで読める文章へ修正する。正規17レッスンの構造と既存の8つの学習契約項目（入力・活動・観察・成果物・自己確認・完了条件・復旧・引き継ぎ）を維持する。
- [ ] `scripts/validate-curriculum.ts` の `validateCurriculum()` で講師資料に要求している `Public Reference`、`Expected Contract`、`Alternative Design`、`Anti-pattern` の4区分を、日本語のH2見出しとして確認するよう更新する。単に英語文字列の `assertContains()` を削除したり、本文中の偶然の一致で合格させたりせず、4区分の欠落を拒否する。
- [ ] `tests/contracts/training-curriculum.test.ts` が参照する本文・表ラベル・章名・禁止条件は、既存テストを削るのではなく、同じ意味の日本語に対応させる。教材の修了判定・CSVスキーマ・提出物・Native選択の扱いを変えない。
- [ ] README、主要な現行説明文、関係する `training/` READMEについて、不要な英語を修正し、更新された仕様書の見出しリンクを追従する。範囲外のSkill・Hook・実行ログまで修正しない。
- [ ] `docs/WRITING_STANDARDS.md` に可否記号・機械値・リンク同期のルールを簡潔に追記する。新しい文章lintエンジンや広範な禁止単語辞書は作らない。

### 5. テスト更新と最終照合

- [ ] `tests/contracts/spec-agentic-qa.test.ts` の日本語のみの5章、Navigation、Unicodeアンカー、BR/AC、旧英語との互換性が必要なfixtureを検証する。形式の不正・重複・欠落を拒否する。
- [ ] `tests/contracts/visual-contract.test.ts` の日本語親章・3つのH4・9列状態表・画面カタログ `〇/×`・画面所有者・画像参照について、正例と負例を維持・追加する。特に、カタログのリンクが別の実在 `SCREEN ID` 見出しへ向く場合を拒否できることを確認する。既存の38画面と基準Capture対象を変えない。
- [ ] `tests/contracts/training-curriculum.test.ts` の正規17レッスンと8項目の対応を維持し、表記を理由に意味検証を削除しない。関連する他の契約テストの固定文字列も更新する。
- [ ] 現行仕様書全体に「標準見出しが旧英語のまま残らない」ことと、対象の可否表に人間向け `Yes/No` が残らないことを検証する。ただし識別子・引用・コード・文脈上の否定語まで誤検知する汎用正規表現は追加しない。
- [ ] 現在利用する仕様書・教材・README・関連周辺文書からの同一文書内・文書間の `#fragment` 付きリンクを抽出し、リンク先Markdownを既存 `parseMarkdownFile()` で解析して、**生成された実在アンカーとの一致**を確認する。特に教材から仕様書への参照は `validate:spec` と `validate:curriculum` だけでは保証されないため、既存契約テストの拡張または対象限定の検証で照合結果を記録する。新しい汎用リンク検証基盤は作らない。
- [ ] 生成HTMLでリンク先の相対パス・`#fragment`・目次・文書間ナビゲーションを確認し、元Markdownの参照先と一致することを確かめる。存在しない `#fragment` と、38画面カタログから別の `SCREEN ID` の実在H3へ向くリンクをそれぞれ不正として検出できることを確認する。
- [ ] 差分を意味単位でレビューし、仕様の制約強化・緩和や教材評価の改変がないことを確認する。

## 6. 検証方法

必要な依存関係を既存lockfileに従って準備し、最終実装HEADで以下を実行する。コマンドの存在・定義は実装開始時に `package.json` で再確認する。

~~~bash
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint:markdown
pnpm run lint:text:all
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run validate:curriculum
pnpm run test:contracts
pnpm run build:spec
pnpm run build:docs
pnpm run build:web
pnpm run verify
git diff --check
~~~

追加で確認する事項：

1. **リンク**：新旧H1〜H6差分からアンカー対応表を作成し、仕様書外の現行教材・README等を含むMarkdownの `#fragment` を実際の見出しアンカーと照合すること。生成HTMLの遷移先も同じアンカーに着地すること。38画面の `Primary specification` は所有仕様書だけでなくリンク先H3の `SCREEN ID` まで一致すること。ルートや画像リンクを壊さず、不正アンカー・別画面への誤リンクを検出できること。
2. **仕様**：必須5章、BR/AC、関係するH2/H4、9列状態表、画面所有、基準状態・画像参照、`spec_refs` の正例・負例が維持されること。
3. **可否**：`〇/×` にした表が処理上も従来と同じ可否を表し、`-`・`no session`・`own only`・`Automation Web` が誤変換されていないこと。
4. **教材と表示**：17レッスンの8論理項目、4つの既存学習経路、修了条件・禁止条件・証拠の区分を保持すること。講師資料4区分を日本語見出しとして検証し、`QA_AGENT.md` の許容見出し説明を同期すること。生成HTMLの目次・ナビゲーション・分類・タイトル・`aria-label` に不要な英語が残らないこと。Mermaidの図はGitHubなど描画可能な環境で確認すること。
5. **品質**：既存のlint/validator/testを無効化・skipせず、最終HEADのGitHub Actionsの必須ジョブを確認すること。OS固有失敗・未実施・skipは成功扱いしない。

## 7. リスクと判断

| リスク | 対応 |
| --- | --- |
| 日本語見出しにより既存アンカーが変わる | 新旧slugを実際に生成し、現在の参照元を更新・検証。外部リンク・履歴中の旧アンカーは残余影響として報告 |
| 日本語化で機械的な章・表の構文が壊れる | 既存validatorを限定的に対応させ、重複・欠落・順序・所有者などの負例を保持 |
| `Yes/No` を誤って権限・状態などの別の値にも適用する | 人間向け可否表のみを対象にし、個別の意味・解釈を確認 |
| 教材の文字列契約だけを修正し意味検証が弱まる | 既存の目標・制約・学習経路・修了条件を先に照合し、テストの判定内容を維持 |
| PR #199の参照先とずれる | openのPR #199を直接編集せず、変更後の参照先の追従要否と競合可能性を記録 |
| 外部の保存済み `spec_refs` や外部ブックマークが旧アンカーを参照する | 新規の別名・リダイレクト機構は自動追加しない。影響を記録し、互換維持が実際に必要なら実装前に別途判断 |

未確定事項：本Planの対象範囲内で、実際のコード・UI・第三者仕様が文字列一致で求める英語を個別に確認し、残す場合は理由と根拠を作業報告へ記録する。対象範囲の拡大や製品動作変更を必要とする場合は、このPlanに無断で混入しない。

## 8. 作成・変更する成果物

- 本Plan：`docs/plans/2026-10-19_180409_japanese-spec-curriculum-link-consistency.md`。
- 後続実装時：本Planの対象Markdown、`QA_AGENT.md`、`docs/WRITING_STANDARDS.md`、機械契約に関係する既存の `scripts/spec/`、`scripts/docs/build-docs.ts`、`scripts/validate-curriculum.ts`、必要な範囲の `scripts/agentic-qa/`、`tests/contracts/`。実際に必要と確認したファイルだけ変更する。
- 後続実装時の記録：変更した見出しとリンクの対応、表記の残存理由、検証結果、既存履歴・外部参照に残る影響を、既存のRun報告の運用に従って記録する。

## 9. 実施順・区切り

1. 仕様書の見出し・リンク・真偽表現の棚卸しを完了する。
2. 既存validator・契約テストの日本語入力対応を整え、旧表記の正常入力と不正入力の検出を維持する。
3. 仕様書とテンプレートを日本語化し、カタログ・リンク・生成サイトの整合を確認する。
4. 教材・現行説明文の日本語化と関連契約テストを追従させる。
5. 全体検証・意味照合・PR #199への影響確認を完了する。

実装の完了を「英単語が0件になったこと」とは判定しない。**日本語で読めること、必要な英語に根拠があること、元の仕様・機械契約・リンク・教材評価を維持していること**を完了基準とする。
