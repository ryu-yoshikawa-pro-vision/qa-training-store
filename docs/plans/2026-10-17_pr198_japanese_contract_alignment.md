# PR #198 日本語文書と既存機械契約の整合修正 Plan

## 目的

PR #198で日本語化した見出し・説明文を原則維持したまま、仕様書・教材の読取処理、画面契約、リンク、契約テスト、文書生成、CIを正常に動作させる。

文書の意味、正式な製品動作、BR/AC、必須・任意、学習内容、評価基準、修了条件を変更しない。日本語を許可するために必要な既存実装とテストだけを修正する。全体の翻訳基盤・新規依存関係は導入しない。

**実装と最終検証の対象は既存PR #198のheadブランチ `docs/refine-spec-curriculum-ja` とする。** Planだけを持つ `docs/plan-pr198-japanese-contract-alignment` で実装を完了扱いにしない。新たなブランチ・PRを作成しない。

## 変更対象と対応

### 1. Navigation・機能仕様5章

- `scripts/spec/markdown.ts` の `extractNavigation()` を修正する。
  - `## Navigation` および `## ナビゲーション（Navigation）` の双方を認識する。
  - いずれか1つの見出しの直下から直接Markdownリンクを抽出する。両見出しの重複、欠落、リンク未指定は失敗とする。
- `scripts/spec/validate-spec.ts` の `validateNavigation()` と `validateFeatureGrammar()` を日本語と英語の双方に対応させる。
  - 次の5章を同じ論理的な節として扱い、各章はちょうど1つ、順序と階層も従来どおり検査する。

| 英語の章見出し | 日本語の章見出し |
| --- | --- |
| `Purpose / Scope` | `目的・対象範囲（Purpose / Scope）` |
| `Business Rules` | `ビジネスルール（Business Rules）` |
| `UI / Behavior Contract` | `UI・振る舞い規約（UI / Behavior Contract）` |
| `Acceptance Criteria` | `受入基準（Acceptance Criteria）` |
| `Executable Canonical Sources` | `実行可能カノニカルソース（Executable Canonical Sources）` |

- 必須章を日英で二重記載した場合は重複として失敗させる。必須章の未知の言い換えは別名として認めない。
- **必須5章以外の第2階層見出しを一律に禁止しない。** 既存実装の許容範囲を保ち、日本語対応を理由に新しい制約を追加しない。
- 未変更の英語見出しを使う10機能仕様と日本語化した `docs/spec/features/cart.md` を同じ検証で処理する。
- `scripts/spec/build-spec.ts` と `scripts/spec/slug-heading.ts` は原則として変更せず、既存処理を通して仕様サイトが生成されることを確認する。

### 2. BR/ACの参照関係

- `scripts/spec/validate-spec.ts` の `RELATED_BR` と `validateBrAc()` を、`Related BR:` と `関連ビジネスルール:` の双方に対応させる。
- BR/ACのID、見出しレベル、番号、対応関係、未知のBR参照、Active BRの未参照、重複・不正な参照の検出を維持する。
- 不正な参照行が正しい参照行と混在する場合、および同じACに日英両方の参照行が記載された場合も、既存の対応関係を曖昧にせず拒否する。
- `Acceptance: N/A` は、今回実際に変更された入力に対応が必要な場合に限り扱いを見直す。未変更の構文は維持する。
- `collectNormativeSpecReferences()` のBR/AC ID収集結果が変わらないことを確認する。

### 3. 画面契約とVisual References

`scripts/spec/visual-contract.ts` の見出し判定を、次の許可表記に対応させる。

| 英語 | 日本語 |
| --- | --- |
| `UI / Behavior Contract` | `UI・振る舞い規約（UI / Behavior Contract）` |
| `Functions` | `機能一覧（Functions）` |
| `Important UI States` | `主要なUI状態（Important UI States）` |
| `Visual References` | `画面リファレンス（Visual References）` |

- `validateScreenContractGrammar()`、`findStateTables()`、Screen Catalogの所有関係と親見出し検証、`visualReferencesForState()`、孤立・重複節の検査を同じ許可表記に対応させる。
- `Screen Contracts` など今回変更していない見出しを不要に翻訳しない。
- `SCREEN-*`、状態slug、状態表の `STATE_COLUMNS`、Role、Required platforms、Related Oracle、Capture registry、画像参照は維持する。
- 日本語Cartと英語の他機能を含む実データで検証し、欠落・順序違反・不正な状態表・画像参照不備を拒否する負例を残す。

### 4. リンク・アンカーの修正

- `slugHeading()` が生成する実際の見出しslugに合わせて、変更後の相対リンクとアンカーを修正する。
- 既知の対象として、`docs/spec/screen-catalog.md` から日本語Cart見出しへの旧アンカー1件を修正する。
- `docs/spec/ui-ux-contract.md` の `Boundary UX` 見出し変更に伴う `#boundary-ux` 参照を修正する。確認済みの参照元は、`product-scope.md` に3件、`roles-and-permissions.md` に1件、`ui-ux-contract.md` に1件。
- そのほか、PR #198で変更したMarkdownの相対リンク・見出しアンカー、`Related Oracle`、`spec_refs` の破損を検出して修正する。
- `validateLinks()` と Visual Contract のリンク検証を維持し、リンク検査の無効化や広範なslug置換で回避しない。
- リポジトリ外の旧アンカー利用が確認できた場合だけ、必要性と影響に応じて互換性措置を検討する。将来の利用可能性だけで独自のリダイレクト機構を追加しない。

### 5. 学習教材・契約テスト

失敗している6ファイルの契約テスト11件を、本文の意味と保護対象に合わせて修正する。

| テスト | 必ず残す検証内容 |
| --- | --- |
| `tests/contracts/architecture.test.ts` | D-026の正本責務、仕様のオラクル優先順位 |
| `tests/contracts/codex-artifact-sanitization.test.ts` | Run Artifactの未サニタイズ絶対パス禁止、最終guard |
| `tests/contracts/native-windows-local-validation.test.ts` | 単体Flow失敗時に後続Flowを実行しない規則 |
| `tests/contracts/spec-agentic-qa.test.ts` | Navigationの抽出と仕様サイトへの到達 |
| `tests/contracts/training-curriculum.test.ts` | 教材のInput/Output、リスク判断、共通／選択経路、Trainingと正式テストの分離、Expected Failure演習 |
| `tests/contracts/visual-contract.test.ts` | Screen Catalog、状態表、Visual References、欠落・誤構造の拒否 |

- 日本語化された教材の章見出し・表ラベルを認識させ、学習経路、実技成果物、評価・完了条件は維持する。
- 完全一致の自然文検査については、対象の文体ではなく、ID・数量・禁止条件・手順・構造を検証できる形へ必要最小限で変更する。
- 既存の負例を削除・skipしない。空のassertionや形式的な文字列置換で成功させない。
- `scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts` は、現行の修了判定・教材契約が維持できる限り変更しない。

### 6. 日本語文書の意味・形式の修正

PR #198で変更した全Markdownをbaseとの差分で照合し、仕様・学習内容・証拠・条件の意味を変更した箇所だけ是正する。次の既知の問題は確実に修正する。

- `docs/13_decisions/decision_log.md` のD-026：TypeScript型・Enum・Dexieスキーマの**低レベルな型・構造**はコードを正本とし、製品の期待動作・業務上の意味は正式仕様を正本とする責務が区別できる日本語へ修正する。`docs/spec/README.md` のオラクル優先順位は変更しない。
- `docs/03_domain/business_rules.md` の在庫分類：`out` はSKUの在庫数0、`low` はSKUの在庫数1〜5、`available` はSKUの在庫数1以上を指すと明記する。SKUの在庫数量をSKUの「件数」と誤解させる表現を除去し、在庫0を低在庫件数に含めない既存条件を維持する。
- `docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md`：原文にない「深刻な不整合」「影響度は極めて大きい」など、リスクの評価を先取りする表現を是正する。Impact・Likelihood・Priorityの判断は受講者が根拠を説明する構造を維持する。
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`：未実行の行に予定のEvidence Pathを記載**しない**という禁止条件を維持し、「避けてください」という任意と読める表現を修正する。
- `docs/spec/features/native-customer.md`：末尾に混入した `eof` 指定の不正なコードフェンス以降の報告文を除去し、元の仕様本文と末尾改行を維持する。
- そのほか、数値、制限、状態、権限、例外、手順、必須／任意、コードフェンス内の設定・コマンド・識別子について、原文から変更された意味を修正する。
- Markdown lintのエラー（MD047・MD032・MD031・MD022）を解消する。テキスト修正で不要な製品コード・設定の差分を増やさない。

### 7. 仕様テンプレートと規約

- `docs/spec/_templates/feature-spec.md`、`QA_AGENT.md`、`docs/WRITING_STANDARDS.md` のうち、実際の章見出し・参照ラベルの許可表記と矛盾する箇所だけ更新する。
- 以後の仕様作成時の許可形式を明記する場合も、ID・表ヘッダー・コード識別子を変更対象に含めない。
- 人が読む見出しと機械が参照する識別子を区別し、不要な翻訳・定数抽象化・独立した汎用パーサーを追加しない。

## 実施順序

1. **作業場所**：PR #198の現在のheadを確認し、`docs/refine-spec-curriculum-ja` で作業する。Planのみの別ブランチへ実装を積まない。
2. **仕様読取処理**：Navigationと5章、BR/AC、Visual Contractを修正。日本語Cartと英語10機能が同時に通る正例・負例テストを追加または更新する。
3. **リンク修復**：Cart、Boundary UX、変更文書のアンカー、BR/ACと画面参照を修正して、仕様サイトを生成する。
4. **教材・契約テスト**：6ファイル11失敗に対応。本文とテストのいずれを修正すべきかは、変更前の契約の意味に基づいて判断する。
5. **文書修復**：上記の既知の意味変更・混入内容・lint違反を解消し、変更全件の原文との意味比較を完了する。
6. **全体検証**：下記コマンドと既存GitHub Actionsを、修正後の同一HEADで検証する。失敗を別の失敗やskipに置き換えない。
7. **PR #198の更新**：実際の変更範囲と検証結果をPR本文へ反映する。必要な実装・通常push・PR更新は実装作業が許可された場合に行う。merge・force pushは行わない。

## 必須検証

`pnpm install --frozen-lockfile` の後、関連する修正を反映した同じHEADで実行する。

```bash
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

`verify` 等が同じ処理を含む場合も、問題の切り分けに必要な個別実行は行う。テストの結果・最新HEAD SHA・未実行理由を記録する。

| 条件 | 期待結果 |
| --- | --- |
| 正しい英語・日本語Navigation | リンクを抽出し、仕様HTMLを生成できる |
| 日英Navigationの重複、空のNavigation | 拒否される |
| 日本語Cartと英語10機能 | 仕様・画面検証が同時に通る |
| 必須5章の日英重複・欠落・順序違反・不正な表記 | 拒否される |
| 必須5章以外の既存の許容見出し | 不必要に拒否されない |
| 日英の正しいBR参照 | AC/BRの関連付けが成立する |
| BR参照の欠落、不正ID、存在しないID、日英の重複・混在不正行 | 拒否される |
| 状態表、画像参照、Screen所有関係 | 正しい日英見出しで検証し、不正構造は拒否される |
| CartおよびBoundary UXの参照、他の変更アンカー | 正しく解決できる |
| 不存在のMarkdownリンク・アンカー | 拒否される |
| 日本語教材 | 学習内容・成果物・修了条件・禁止事項の意味を維持する |

## 完了条件

- PR #198のheadに、日本語化した本文と対応する検証処理・契約テスト・参照修正が反映されている。
- 変更前の英語見出しを利用する仕様と、日本語Cartの双方で従来の検証能力を維持する。欠落・重複・不正参照を見逃さない。
- 既知の契約テスト11失敗、Markdown lint112違反、および追加検証で判明した今回の回帰が解消する。
- 仕様HTMLとカリキュラムのNavigation・アンカー・Related Oracleが有効である。
- 全変更Markdownをbaseと照合し、仕様・判断基準・手順・学習内容の意図しない変化が解消している。自動テスト成功だけで意味の保持を完了扱いにしない。
- PR #198の**最終head SHA**について必要なCI・ビルド・テストの結果を確認し、PR本文に実施内容と未解決事項を正確に記録する。
- 製品コード・正式なテストスイート・修了判定ロジックへの不要な変更、追加の依存関係、汎用日本語化基盤を含めない。
