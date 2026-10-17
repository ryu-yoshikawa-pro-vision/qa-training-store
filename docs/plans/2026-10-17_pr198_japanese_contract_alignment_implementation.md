# PR #198 解析処理・契約テストの修正内容

この文書は[実装Plan](./2026-10-17_pr198_japanese_contract_alignment.md)の変更指示を具体化する。対象は既存PR #198のhead。実装コードとテストは、仕様の意味を変えず日本語・英語の許可表記を認識するよう修正する。

## 1. 仕様書のNavigation

対象：`scripts/spec/markdown.ts` の `extractNavigation()`、`scripts/spec/validate-spec.ts` の `validateNavigation()`。

- `docs/spec/README.md` のH2は、既存 `Navigation` と現在の `ナビゲーション（Navigation）` だけを認識する。
- 解析対象のH2を数え、**ちょうど1件**のみ許可する。英語と日本語を併記した場合、同じ表記を繰り返した場合、0件の場合は不正とする。`extractNavigation()` が先頭だけ採用して黙認しないこと。重複の診断は `validateNavigation()` で明示する。
- 選んだH2の直下から、次のH2までの `- [表示名](相対パス)` を従来の順序で抽出する。リンク0件、実在しない対象パスを拒否する。
- `buildSpecSite()` からの `extractNavigation()` 利用も機能すること。`scripts/spec/build-spec.ts` と `scripts/docs/build-docs.ts` に独立した日本語見出し判定を複製しない。
- 契約テスト：旧英語と日本語の正例、欠落・日英重複・同表記重複・リンク0件・存在しない対象の負例。現在のNavigationが提供する16個のリンク数・順序も確認する。

## 2. Feature仕様の必須5章

対象：`scripts/spec/validate-spec.ts` の `validateFeatureGrammar()`。

| 順序 | 既存英語H2 | 許可する日本語H2 |
| --- | --- | --- |
| 1 | `Purpose / Scope` | `目的・対象範囲（Purpose / Scope）` |
| 2 | `Business Rules` | `ビジネスルール（Business Rules）` |
| 3 | `UI / Behavior Contract` | `UI・振る舞い規約（UI / Behavior Contract）` |
| 4 | `Acceptance Criteria` | `受入基準（Acceptance Criteria）` |
| 5 | `Executable Canonical Sources` | `実行可能カノニカルソース（Executable Canonical Sources）` |

- H2の許可表記を5つの論理章へ対応付け、各章の存在数が1、かつ規定順であることを検証する。英語・日本語混在の正しい5章は許可し、同じ論理章の二重記載は拒否する。
- 必須章を勝手な日本語へ書き換えた場合は、その必須章が欠落しているとして失敗させる。
- **必須5章以外のH2を一律に禁止する新規制約は追加しない。** 機械的な章階層はH2を基準にする。
- `docs/spec/features/cart.md` の日本語5章と、残る10機能の既存英語5章で成功することを確認する。

## 3. ACからBRへの参照

対象：`scripts/spec/validate-spec.ts` の `RELATED_BR`、`validateBrAc()`。

- 許可する行頭を `Related BR:` と `関連ビジネスルール:` の2つに限定する。IDをバッククォートで囲み、複数時は既存の「`, `」区切りを保つ。
- 既存のBR ID抽出、存在確認、BR未参照検出、AC/BR見出しの文法、`collectNormativeSpecReferences()` は維持する。
- AC本文の次の見出しまでから、両ラベルの候補行を**正規表現で成功した行だけでなく不正形式の行も含めて**収集し、参照行がちょうど1件かつ書式が有効かを検証する。
- 同じ参照行内のBR ID重複、複数行、日英2行、正しい行と不正行の混在、未知のBR、空参照を拒否する。無関係の本文を参照行と誤認しないよう、行頭ラベルに限定する。
- `Acceptance: N/A — ...` は既存表記・既存判定を変更しない。
- 正例：`Related BR: \`BR-CART-001\``、`関連ビジネスルール: \`BR-CART-001\``、複数BRの正規区切り。負例：IDのバッククォート欠落、存在しないBR、ID重複、二重参照、正常行と異常行の併記。
- 現在の `docs/spec/features/cart.md` のAC-CART-001〜003が、それぞれ対応するBRを参照できることを確認する。

## 4. Screen Contract・Visual References

対象：`scripts/spec/visual-contract.ts`。

| 見出しの役割 | 既存の許可表記 | 追加許可する表記 |
| --- | --- | --- |
| Feature親H2 | `UI / Behavior Contract` | `UI・振る舞い規約（UI / Behavior Contract）` |
| 画面の機能H4 | `Functions` | `機能一覧（Functions）` |
| 状態H4 | `Important UI States` | `主要なUI状態（Important UI States）` |
| 画像参照H4 | `Visual References` | `画面リファレンス（Visual References）` |

- `validateScreenContractGrammar()`：H4を3つの論理見出しへ対応付け、各1件・規定順を維持。未知のH4を許可見出しと取り違えない。
- `findStateTables()`：状態見出しの日英判定を統一し、**対象Screenセクション内だけを探索**する。他のScreenの状態表を誤って利用しない。列は既存の `STATE_COLUMNS` 9列のまま。
- `collectVisualStates()`：Featureの親H2に日英を許可し、Screen Catalogに記録されたPrimary specificationの所有者検証は維持する。Feature以外の親H2 `Screen Contracts` は既存表記を維持。
- 孤立H4の検出：英語・日本語の3つのH4を両方検査し、Screen節外に存在する場合は拒否する。
- `visualReferencesForState()`：画像参照H4を日英で認識。状態H5と画像参照を従来のScreen境界内だけで探索する。
- `SCREEN-*`、状態slug、Role、platform、Visual requirement、Capture registry、画像パス、`Related Oracle` の列名を変更しない。
- 日本語Cartを正常認識させ、現行の38 Screen・94 Capture Target・基準状態・画像参照・冪等生成の期待値を維持する。既存Visual Contractの20件の診断について、Cart認識に由来する派生エラーが解消されるか確かめる。Capture registryや画像自体は根拠なく修正しない。
- 正例・負例：日英混在、下位H4の欠落・日英重複・順序違反、孤立H4、誤った所有者、状態テーブルの列・slug不正、baseline欠落、画像参照欠落、別Screenの見出し誤取得。

## 5. Agentic QAの `spec_refs`

対象：`scripts/agentic-qa/contracts.ts` の `specRefSchema` と同スキーマの契約テスト。

- 現行 `docs/spec/<normative-file>.md#<slug-heading>` 形式を維持し、`#` 以降の許可文字を既存のASCII小文字・数字・ハイフンに加え、`slugHeading()` が生成するUnicodeの文字・数字へ限定的に広げる。
- `BR-*`、`AC-*` のID構文、Normative Markdownのパス制約、`..` による移動の禁止、空アンカーの禁止は変更しない。
- ASCII入力は従来どおり許可。日本語の実在アンカー（例：`docs/spec/features/cart.md#screen-storefront-cart-カート`）を許可する。存在しないアンカー・不正なパス・不正IDは拒否する。
- `scripts/agentic-qa/spec-refs.ts` の `resolveSpecReference()` が既に行う**実際の見出しアンカーとの一致検証**を維持する。これを置換・緩和しない。
- 変更する前に、このスキーマを使うChallenge・Charter・Oracleの既存契約テストを特定し、既存のASCII参照が回帰しない正例と、上記日本語参照・不正入力の負例を追加する。新規の汎用slugパーサーは作らない。

## 6. 契約テスト：6ファイル11失敗と後続assertion

| テスト | 修正箇所と方法 | 維持すべき条件 |
| --- | --- | --- |
| `tests/contracts/architecture.test.ts`（D-026） | `docs/13_decisions/decision_log.md` の修正後、約396〜405行の旧文章完全一致と関連2文書の旧表記を、コードの低レベル型・構造の正本と文書の意味・責務、正式仕様の期待動作の優先順位を検証する形へ更新 | Markdownの説明責務、TypeScript `type/interface/union/enum`、Dexie `Schema/version/table`、コードSSOTの対象範囲 |
| `tests/contracts/codex-artifact-sanitization.test.ts` | 約193〜212行：`docs/reference/run-artifacts.md` の現行日本語を対象とし、未サニタイズのローカル絶対パスを含む成果物を完了扱いしない条件と`REPORT.md`の追記専用契約を検査 | サニタイズ未完了を許可しない。Write/Checkの欠落を許可しない |
| `tests/contracts/native-windows-local-validation.test.ts` | 約51行：`docs/native/windows-android-local-validation.md` の「単体テストフロー失敗時に後続を実行してはならない」という日本語の禁止条件へ対応 | 先行Gate失敗後に後続Flowを実行しない |
| `tests/contracts/spec-agentic-qa.test.ts` | `buildSpecSite()` の正常生成検証を維持。Navigationの日英許可、欠落・重複・リンク切れを検証する正例・負例を補完 | 仕様サイトへ到達できるNavigation。単純なテスト削除は禁止 |
| `tests/contracts/training-curriculum.test.ts` | 以下7章の個別指示に従い、17レッスンの見出し・表ラベル・旧自然文検証、経路、Expected Failureを修正 | 学習契約の8項目、共通／Native選択、Evidence、Trainingと正式テストの区分 |
| `tests/contracts/visual-contract.test.ts` | 約276〜291行と772〜794行：日本語Cart解析を通し、画面・Captureの期待件数と1件生成→0件生成→内容一致の冪等性検証を維持。日本語H4の異常入力の負例を追加 | 38 Screen、94 Capture Target、既存画像・所有関係・基準状態、冪等生成 |

テストファイルに含まれる複数の `toContain()` は、CIで最初に失敗したassertionの後にも存在する。各修正後に対象テストを再実行し、**同一テスト内の後続assertionが新たに失敗していないか**最後まで確認する。

### 7. 教材17レッスンの共通表

対象：`tests/contracts/training-curriculum.test.ts` の約26〜64行。

- 17レッスンのInput / Output節は、既存英語見出し（10本）と、次の7本の実在日本語・日英混在見出しのみを許可する。
  - P1-02：`本レッスンのインプット / アウトプット`
  - P1-04：`このレッスンのインプット / アウトプット`
  - P1-07：`本レッスンのInput / Output`
  - P1-09：`このレッスンのインプット／アウトプット`
  - P2-02：`このレッスンのInput / Output`
  - P2-03：`本レッスンのInput / Output`
  - P2-05：`本レッスンのインプット／アウトプット`
- 共通表の8つの論理項目は `Input / Activity / Observation / Output / Self-check / Completion / Recovery / Handoff`。各項目を**1回ずつ、定められた順序で**検証し、欠落・重複・空値・未知項目を拒否する。
- P1-02、P1-04、P1-09、P2-05は表の項目名も日本語化されている。これらは**実ファイルで使われた表記のみ**を既存8項目へ対応付ける（例：`インプット（Input）` / `インプット` → `Input`、`実施内容（Activity）` / `活動内容（Activity）` / `アクティビティ（Activity）` / `アクティビティ` → `Activity`、`完了基準（Completion）` / `完了要件` → `Completion`）。観察・自己確認・リカバリー・引継ぎも実在する日本語表記を列挙して対応させる。
- 正しい見出しでも表の8項目が欠落していれば失敗させる。見出し検証だけを削除・弱体化しない。レッスン本文を一律英語へ戻さない。

### 8. 教材の学習契約

対象：`tests/contracts/training-curriculum.test.ts` の約66〜240行、342〜352行、354〜412行、439〜461行。

- P1-02：RiskのImpact・Likelihood・Priority、計算だけで決めない条件、評価理由、`RISK-CART-101` 等の存在を検証。旧英文混在の文章断片は採用済みの日本語と必要条件に置換する。
- P1-03：リスクからテストケースと自動化判断へ追跡可能であること、`02_test-cases.csv`、`03_automation-mapping.csv`、`04_execution-improvement.csv` の役割と未実行時の制約を検証する。
- P1-04/P1-05：`TC-PRODUCT-001`、`product-basic-shirt`、Reset、`page.evaluate`、受講者Caseと配布サンプルの分離、既存の最低条件、件数を恣意的に完了条件へしない条件を維持。
- P1-06/P1-08：診断時の`BLOCKED`、別Receipt/Evidence、Canonical Helperの責務、C10改善前後、既存のNGパターンを維持。
- P2-04/P2-08：本番テストと教材、`main/schedule` の区別、必須成果物の経路、正式テストへの流用禁止を維持。
- 学習経路：`docs/curriculum/test-automation/README.md` にある4経路を、共通 `P1-6→P1-8→P1-9`、Native選択 `P1-6→P1-7→P1-8→P1-9`、共通 `P2-5→P2-7→P2-8`、Native選択 `P2-5→P2-6→P2-7→P2-8` として検証する。Native選択を全員必須にしない。
- Training Web：`training/github-actions/README.md` のレシートと**同一実行**のEvidenceを結び付ける要件、`output/training/playwright`、`receipts`、`evidence` の区分を維持する。
- Expected Failure：`part2/05_playwright-ci.md` と `training/github-actions/README.md` を、`workflow_dispatch` / `mode = expected-failure` / `Run workflow` / Artifact取得と照合する。旧自然文だけでテストを落とさず、手動CI実行と証拠取得を検証する。ローカル実行のみでの完了扱いは禁止。
- 旧 `toContain()` で変更後本文と一致しなくなった条件は**意味上の必要性を判定してから**修正する。固定ID・コマンド・パス・禁止・数値は引き続き厳密比較。自然文全体の固定一致を増やさない。
- 既存 `scripts/training/check-completion.ts`、`scripts/validate-curriculum.ts` の修了条件やCSV schemaは変更しない。共通修了要件 `C01〜C07 + C09〜C10`、Part 2の `C01〜C07 + C09〜C12` を維持し、`C08`を共通必須化しない。

## 9. 追加の負例と検証範囲

- 日本語へ対応した解析箇所には、不正な構造を拒否するテストを既存ファイルまたは既存の近接したテストへ追加する。新規の汎用テスト基盤は作らない。
- 既存で成功した契約テストについても、直接参照している旧見出し・旧自然文・日本語アンカーの成立を照合する。
- `spec_refs` の日本語アンカー許可後は、スキーマによる形式検証と `resolveSpecReference()` による存在検証を別々に確認する。
- テストをskip・削除・弱体化して成功扱いにしない。期待値の38 Screen・94 Capture Target・教材17本などを修正都合で変更しない。
