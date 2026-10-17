# PR #198 日本語文書と既存機械契約の整合修正 Plan

## 目的と結論

対象：[#198 仕様書・テスト自動化カリキュラムの日本語表現を改善](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/198)。

**PR #198で日本語化した人間向けの見出し・説明文は原則として維持する。** その状態でも仕様・画面・学習教材の既存契約を正しく読み取り、文書ビルド、リンク、契約テスト、CIが通るように修正する。

機械契約を単に無効化したり、テストの期待文字列を削除して成功扱いにしたりしない。日本語で定義した表記を正式な入力として認識しつつ、未変更の英語表記も引き続き処理できる構成にする。製品の期待動作、BR/AC、学習目標、修了条件、ユーザー向け手順の意味は変更しない。

本Planは**調査・実装計画のみ**。実装・コミット・CI実行・PR本文更新は別工程とする。

## 確認した現状

確認日：2026-10-17。PR #198 の最新HEAD：`322034394b0a07e40a3ae9a0241e3dab56fb3844`、base `main`：`971d25103d8b83ccf7c74e1802d44835b27abe25`。実装時は必ず再取得して差分を確認する。

| 観点 | HEADで確認した事実 | 影響 |
| --- | --- | --- |
| PR | Markdown 108ファイル、4コミット、+7,461/-7,470行。PR本文で宣言した`docs/spec/`と`docs/curriculum/test-automation/`以外が63ファイル | 既存の日本語化を残すなら、本文の対象範囲を整合させる必要がある |
| Web CI | [Run 38985317531](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/38985317531) が失敗。`Style Quality`、`Vitest (contracts)`、`build-production`、`build-automation`等が失敗 | マージ前に修復が必要 |
| Style Quality | Markdown lint 112件（MD047:108、MD032:2、MD031:1、MD022:1） | 変更したMarkdownの末尾改行・空行を修復 |
| 契約テスト | 809 passed、11 failed、15 skipped。失敗ファイルは6つ | 固定文字列・構造の参照元と本文が不一致 |
| 製品Webビルド | `docs/spec/README.md must contain a direct-link Navigation list` | `extractNavigation()`が`## Navigation`しか認識しない |
| 画面仕様 | `SCREEN-STOREFRONT-CART`の節・状態・Visual Referencesを検証できない | Cartの見出しを日本語化したが`visual-contract.ts`が英語のみを認識 |
| 基準の確認 | 同じ時点のbase SHAでは`Style Quality`、`Vitest (contracts)`、`build-production`等が成功 | HEAD固有の差分に起因する回帰として扱う |
| 機能仕様 | `docs/spec/features/`の11ファイル中、主要な5章見出しを日本語化しているのは`cart.md`のみ。他の10ファイルは英語 | **日英両方を正規の構造として処理**する必要がある |
| BR/AC | `cart.md`は`関連ビジネスルール:`を3箇所使用。`validate-spec.ts`は`Related BR:`のみを解析 | Active BRの検証結果が欠落する可能性 |
| 参照アンカー | `docs/spec/screen-catalog.md`が`features/cart.md#screen-storefront-cart-cart`を参照。変更後の見出しは`### SCREEN-STOREFRONT-CART — カート` | 参照アンカーの不一致を解消する必要がある |

**確認の限界**：HEADで`pnpm run validate:spec`等を個別にローカル実行していない。上記は実際のGitHub差分・ソース・既存CIログの確認結果。失敗原因をすべて網羅したものではなく、実装時に各コマンドを単独で再実行して残りの違反を確定する。

## 対応の基本方針

1. **日本語化した本文を戻さない**。表示名・見出しの日本語化を保ちながら、内部で扱う構造の識別値と検証ルールを維持する。
2. `BR-CART-001`、`AC-CART-001`、`SCREEN-STOREFRONT-CART`、`default`、`State slug`など、機械が扱うID・値・列名・コード・コマンドは原則として変更しない。変更が必要かは個別に根拠を示す。
3. **英語10機能＋日本語Cartの混在を正式に許可**する。既存機能仕様をすべて一斉翻訳することは今回の修復条件にしない。
4. 許可する日本語表記は現行文書から**完全一致の別名**として定義する。`includes("BR")`や任意の日本語を許す緩い正規表現へ変更しない。
5. 同一の意味の英語と日本語が両方出現した場合は**重複**として拒否する。セクション順、必須数、章階層、BR/AC参照の完全性、Visual Referencesの必須状態は維持する。
6. 構造の解釈は既存の`scripts/spec/markdown.ts`と現在のvalidatorを優先する。複数箇所で同じ見出し対応が必要な場合にだけ小さな共通定義を置く。汎用翻訳・汎用Markdown解析基盤は作らない。
7. レビューで見つけた**文章そのものの意味変更**は、見出し対応とは切り離して差分ごとに是正する。強い断定や要件追加を、日本語として自然だからという理由で採用しない。

## 修正対象と具体的な実装方針

### A. 仕様文書の入口・章見出しの読み取り

| 修正対象 | 変更する処理 | 維持する契約 |
| --- | --- | --- |
| `scripts/spec/markdown.ts` `extractNavigation()` | `## Navigation`と`## ナビゲーション（Navigation）`を正規の入口として認識。見出しの個数と階層は保護する | 直下のMarkdownリンク、リンク先の存在、空のNavigationを拒否 |
| `scripts/spec/validate-spec.ts` `validateNavigation()` | 日本語見出しから抽出したNavigationも検証する | `docs/spec/README.md`から実在ファイルへ到達できること |
| `scripts/spec/validate-spec.ts` `validateFeatureGrammar()` | `Purpose / Scope`等の英語5章と、Cartで使われている日本語5章を同一の論理的な節として認識 | 順序固定、各章ちょうど1つ、欠落・重複・未知の表記を拒否 |
| `scripts/spec/build-spec.ts` | 原則変更不要。`extractNavigation()`の結果が修正されて仕様サイトを生成できるか確認 | 静的HTMLのリンク・出力先・正本の範囲 |
| `scripts/spec/slug-heading.ts` | 原則変更不要。日本語見出しの既存slugアルゴリズムを別実装に置き換えない | サイト生成とリンク検証で同じslugが使われること |

現在の日本語5章（**順序と階層を保持**）：

```text
## 目的・対象範囲（Purpose / Scope）
## ビジネスルール（Business Rules）
## UI・振る舞い規約（UI / Behavior Contract）
## 受入基準（Acceptance Criteria）
## 実行可能カノニカルソース（Executable Canonical Sources）
```

### B. BR/ACの解析と保護

対象：`scripts/spec/validate-spec.ts`の`RELATED_BR`、`validateBrAc()`、`collectNormativeSpecReferences()`、必要な契約テスト。

- `Related BR: ` と `関連ビジネスルール: ` の双方から、バッククォートで囲まれた`BR-...`を正しく取得する。
- **参照するBRの存在、関連するAC、重複・不正なID、Active BRのAC未参照**を従来どおり検証する。別名対応を理由に「参照先がない」ことを見逃さない。
- `BR-`、`AC-`を先頭とする見出しのID・階層・構文は現行のまま。説明タイトル部分の日本語はすでに許可されているため新しいパーサーは不要。
- `Acceptance: N/A`は現在のCartでは変更されていない。別の変更対象で日本語化されている証拠がなければ対応範囲を広げない。必要な場合のみ、Active BR検証を弱めない別名対応を行う。
- 同一の`AC`に`Related BR`の英語・日本語を二重記載した場合や、重複IDを検出できることもテストする。

### C. 画面契約とVisual References

対象：`scripts/spec/visual-contract.ts`と`tests/contracts/visual-contract.test.ts`。

| 既存の見出し | Cartの日本語表記 |
| --- | --- |
| `UI / Behavior Contract` | `UI・振る舞い規約（UI / Behavior Contract）` |
| `Functions` | `機能一覧（Functions）` |
| `Important UI States` | `主要なUI状態（Important UI States）` |
| `Visual References` | `画面リファレンス（Visual References）` |

- `validateScreenContractGrammar()`、`findStateTables()`、画面の親節チェック、`Visual References`抽出、孤立した節・重複節の検出を**すべて同じ許可表記**へ対応させる。
- `SCREEN-`ID、`##### `default``等の状態slug、`STATE_COLUMNS`で定義した表ヘッダー、Capture registryとの対応、Required platforms、画像参照は変更しない。
- 既存10機能の英語表記とCartの日本語表記が**同時に**検証できることを確認する。
- 状態テーブルが欠落・不正な場合、Visual Referencesが欠落、別の画面節へ混入した場合に引き続き失敗する負例テストを残す。

### D. アンカー・参照先の整合

対象：`docs/spec/screen-catalog.md`など、実際に旧見出しslugを参照する文書・`spec_refs`。

- `### SCREEN-STOREFRONT-CART — カート`の実際のslugを`slugHeading()`とGitHub上のリンク挙動から確認する。
- `screen-catalog.md`の`features/cart.md#screen-storefront-cart-cart`を、正しい見出しアンカーへ更新する。
- **全変更Markdown中の相対リンクと`#anchor`、画面契約で参照するslug、仕様参照`spec_refs`を検査**する。旧英語見出しが参照されている場合、リンク元か互換性維持の方法を個別に選ぶ。
- `scripts/spec/validate-spec.ts`の`validateLinks()`とVisual Contractのリンク検証を維持する。リンクを削除してエラーを消さない。
- 外部から参照され得る公開アンカーは内部リンクとは別の互換性判断が必要。実際の利用箇所が確認できない場合は**未確認**と記録し、広範なslug変換や恒久的リダイレクト機構を先に導入しない。

### E. カリキュラム・その他の契約テスト

対象：変更した教材と、失敗した契約テスト6ファイル。

最新CIで確認した11失敗：

| 失敗テストファイル | 件数 | 必要な確認・修正 |
| --- | ---: | --- |
| `tests/contracts/architecture.test.ts` | 1 | `docs/13_decisions/decision_log.md`のD-026について、正本の責務・優先順位の意味が同じか確認し、意味を検査する方法へ更新 |
| `tests/contracts/codex-artifact-sanitization.test.ts` | 1 | `docs/reference/run-artifacts.md`の未サニタイズ絶対パスの禁止と最終guardが残っていることを検査。文字列の違いで保護が失われないようにする |
| `tests/contracts/native-windows-local-validation.test.ts` | 1 | 単体Maestro Flow失敗時に**後続Flowを実行しない**規則が日本語教材でも同じか検査 |
| `tests/contracts/spec-agentic-qa.test.ts` | 1 | `buildSpecSite()`が日本語Navigationのまま成功し、リンク先HTMLへ到達することを検証 |
| `tests/contracts/training-curriculum.test.ts` | 5 | Input/Output見出し・表の必要欄、リスク評価の根拠、Native選択経路、Training/正式テストの分離、Expected Failureの手順をそれぞれ検査 |
| `tests/contracts/visual-contract.test.ts` | 2 | Screen CatalogとVisual Referencesの解析・生成が日本語Cartでも成功し、従来の負例を検出することを検査 |
| **合計** | **11** | |

- `## このLessonのInput / Output`→`## 本レッスンのインプット / アウトプット`や`Input`→`インプット（Input）`等は、既存のテストが依存する**学習契約の欄**を満たすか検討してから期待値を変更する。
- 「Riskの概念」「自動化判断」「完了条件」「禁止事項」について、元の意味が変わる書き換えは本文を修正し、テストを弱めて通さない。
- `README.md`の`Part 1 Common`経路と`part2/05_playwright-ci.md`の`mode = expected-failure`は、表記だけでなく**必修経路・実行方法が残っているか**をチェックする。
- テストの削除、一律skip、空のexpect、文字列置換だけでの合格扱いは禁止。内容の不変性を構造・ID・数値・手順に基づいて検証する。
- `scripts/validate-curriculum.ts`は主として必要ファイルとリンク・実行資材を確認しており、現時点で変更必須と断定できない。修正時に単独実行して必要な箇所だけ変更する。

### F. 文書の形式と日本語表現の意味確認

- PRのMarkdown lintエラー（MD047/032/031/022）は、内容を変更せず改行・空行を整え解消する。`pnpm run format:check`でも最終HEADで確認する。
- PR #198の**108変更ファイルすべて**について、原文との差分をレビューし、識別子・コマンド・数値・境界・例外・状態遷移・必須/任意・学習目標・修了条件・運用手順の意味を維持しているか確認する。
- コードフェンス内のコード、設定例、機械が消費する固定値は原則元のまま維持。翻訳が含まれている場合は、コメントと実行に意味的影響がないかを確認する。
- すでに確認した例：`part1/02_scenario-shop-analysis.md`でリスクの影響を「深刻な不整合」と強くした箇所は原文との意味差を確認する。仕様の強さが変わるなら適切に戻す。
- 変更範囲は、ユーザーの意向である**日本語化した現行文書の維持**を優先し、単純に対象外63ファイルを巻き戻さない。ただし意図しない文書・コードフェンスの変更は個別に修復する。
- PR本文の`docs/spec/**`と`docs/curriculum/test-automation/**`限定という記述、`docs/WRITING_STANDARDS.md`の固定文字列保護と、実際の日本語化・契約更新を整合させる。**今回の意図的な機械契約更新**と、引き続き保護すべき識別子・実装は区別して説明する。
- `docs/spec/_templates/feature-spec.md`、`QA_AGENT.md`の仕様構造の説明が、新しい日英併存ルールと矛盾する場合に限り更新する。既存の英語仕様への互換性を消さない。

## 実装する順番

1. **準備・差分の固定**：PR #198の最新HEAD・`main`と作業tree、CI、変更ファイル一覧、差分を確認する。今回の失敗を再現し、後続の修正との因果関係を記録する。
2. **現行契約の棚卸し**：仕様5章、Navigation、BR/AC、画面見出し、表ヘッダー、ID、anchor、教材の固定見出し・表ラベル、契約テストの対象を分類する。各変更候補の「意味」と「検証方法」を対応付ける。
3. **仕様パーサー対応**：`markdown.ts`→`validate-spec.ts`→`visual-contract.ts`の順で日本語と英語を認識させる。先に仕様パーサーの小さな正例・負例テストを追加する。既存の10英語機能も通す。
4. **リンクの修復**：Cartのslug・Screen Catalog・他の相対アンカー参照を確認し、実際に壊れている参照のみ直す。仕様サイトHTMLを生成し、入口から機能へ辿れることを検証する。
5. **教材・契約テストの修復**：6テストファイル11件を順に対応。文書の意味を原文と比較し、保護すべき条件に合わせたテストへ直す。既存の負例検査を削らない。
6. **文章とMarkdownの修復**：112件のlintを解消。108文書の意味・機械契約・リンクの差分を確認し、必要な箇所だけ直す。
7. **全検証・レビュー**：下記コマンドと関連CIを最終HEADで実行。最終差分を再レビューし、意図した日本語化以外の仕様変化がないか確認する。
8. **PR更新・報告**：対象と変更理由を反映してPR #198の本文を更新。実際に成功した検証・SHA・未解決を記録する。必要なコミット・通常push・PR更新はユーザーが別途実装を許可したときだけ行う。mergeは行わない。

## 必須の自動検証

実装後、修正を反映した**同じHEAD**で実行する。結果は実行日時・SHA・成功/失敗・未実行理由を記録する。

```bash
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint:markdown
pnpm run lint:text:all
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run validate:curriculum
pnpm run test:contracts
pnpm run build:spec
pnpm run build:web
pnpm run verify
```

- `verify`は一部コマンドを内包するが、既知の失敗原因を段階ごとに切り分けるために上記は必要に応じ個別実行する。**失敗済みの古いRunを修正後の成功証拠としない**。
- 最終HEADのWeb CIで`Style Quality`、`Vitest (contracts)`、Web build、`verify`、`validate`を確認する。Mobile App CIなど未変更領域でも最終CIの結果を区別して報告する。
- 完全なE2Eやネイティブ実機を**この文書更新だけを理由に新規必須化しない**。既存CIが走る場合は結果を確認する。製品・実行制御コードに変更が及ぶなら影響に応じて追加検証を選ぶ。

### 仕様検証の正例・負例

| 入力・条件 | 期待結果 |
| --- | --- |
| 日本語Navigationと既存英語Navigation | それぞれリンク抽出・仕様サイト生成に成功 |
| 英語10機能と日本語Cartの混在 | `validate:spec`・Visual Contractが成功 |
| 同じ論理節を日英2つ並べる | 重複として失敗 |
| 必須の5章欠落・順序違反・階層違反 | 失敗 |
| 日本語の`関連ビジネスルール:`から存在するBRを参照 | AC/BRの関係が成立 |
| 存在しないBR、関連BR未指定、重複・不正なID | 失敗 |
| `SCREEN-`節の`Important UI States`欠落、表ヘッダー誤り、Visual References欠落 | 失敗 |
| 日本語CartのScreen Catalogリンク、BR/ACアンカー | 解決に成功 |
| 不存在のMarkdownリンクやアンカー | 失敗 |
| 教材の見出しと表ラベルを日本語化 | 学習順序・完了条件・必要成果物の契約が保たれる |

## 完了条件

- **日本語を維持した状態で**仕様書とカリキュラムを閲覧できる。旧英語10機能を含む既存仕様の解析を破壊しない。
- 現在確認されている11件の契約テスト失敗と112件のMarkdown lint違反が解消し、最新HEADの必要なCIが成功している。
- 日本語・英語のどちらの許可表記でも、仕様5章、BR/AC、画面状態、Visual References、参照先、欠落・重複・不正値を検証できる。
- 日本語化による無効なリンク・アンカーが残らず、仕様サイトのビルドと機能へのNavigationが成立する。
- 製品仕様・セキュリティ・実行手順・学習目標・評価基準・修了条件に、意図しない意味の変更が残っていない。**これを自動テストのみで保証したとは記載しない**。
- PR #198の変更範囲・実際の検証結果・残る未確認事項がPR本文と一致する。
- 追加の依存関係、広範なリファクタリング、汎用ローカライゼーション基盤、不要な設定は追加しない。

## 対象外・未確定

- 今回のPlanだけでは製品コード、正式E2E、既存の評価ルールを変更しない。
- すべての英語仕様・識別子を一律日本語化することは目的ではない。
- 公開アンカーに対するリポジトリ外の参照の利用状況は、現時点では確認できていない。
- `QA_AGENT.md`や新規仕様テンプレートの変更は、契約の整合に必要な範囲に限る。
- 文書差分108ファイルの意味的な網羅レビューは**未実施**。実装時に必須の作業であり、今回確認済みと扱わない。
