# PR #198 日本語文書と機械契約の整合修正 Plan

## 目的・対象

PR #198で日本語化した人間向けの見出し・説明文を原則維持し、仕様・画面・Agentic QA・教材の機械契約、相対リンク、契約テスト、文書生成、Web CIを正常に動作させる。

製品の期待動作、業務ルール、BR/AC、固定識別子・コマンド・CSV列、学習目標・評価基準・修了条件を変えない。解析処理やテストを弱めて成功扱いにしない。追加のライブラリや汎用翻訳基盤は導入しない。

- 作業ブランチ：**`docs/refine-spec-curriculum-ja`**（既存PR #198のhead）
- 実装変更と最終CI確認は**このPRの最終HEAD**に反映する。
- 新しいブランチ・PRを作成しない。Plan専用の別ブランチを作業先にしない。
- merge・force pushは実施しない。

## 実装指示

本Planと次の2文書を**一体の実装指示**として使用する。

1. [解析処理・契約テストの修正](./2026-10-17_pr198_japanese_contract_alignment_implementation.md)：関数・文字列判定・表記対応・契約テストの更新と負例。
2. [文書・リンク・教材表記の修正](./2026-10-17_pr198_japanese_contract_alignment_documents.md)：末尾改行が必要な108ファイルの一覧、Markdown構造修正、既知の6アンカー、D-026・在庫・Risk・Evidence・Likelihood、`QA_AGENT.md`。

### 1. 仕様・画面の解析

- `scripts/spec/markdown.ts` と `scripts/spec/validate-spec.ts`：仕様NavigationとFeature必須5章に、調査済みの英語・日本語の表記を許可する。必須章の重複・欠落・順序違反を拒否し、その他のH2は不必要に禁止しない。
- `validateBrAc()`：`Related BR:` と `関連ビジネスルール:` の両方を認識。正しい行を収集するだけでなく、同一AC内の重複行・不正行・不正ID・未知BRを拒否する。`Acceptance: N/A` の既存契約は維持する。
- `scripts/spec/visual-contract.ts`：Feature親H2、Screenの3つのH4、状態表、画像参照、孤立見出し検査を日英に対応させる。Screen単位の探索範囲、所有関係、状態slug、画像・Capture registryを維持する。
- `scripts/agentic-qa/contracts.ts`：`specRefSchema` のMarkdownアンカーに、現行の `slugHeading()` で生成できる日本語文字を必要範囲で許可する。パス制約、ID形式、存在しないアンカーの拒否は維持し、`spec-refs.ts` の解決処理は変更しない。
- 既存の`scripts/spec/build-spec.ts`、`scripts/spec/slug-heading.ts`、`scripts/docs/build-docs.ts`、`scripts/spec/validate-all.ts`、`scripts/spec/visual-registry.ts`、`scripts/spec/materialize-visual-references.ts` に、重複した回避処理を追加しない。

### 2. 文書・参照先

- 既知の無効アンカー6参照は、**日本語の見出しを戻さず、参照元のアンカーだけ修正**する。
- `docs/spec/features/native-customer.md` の不正なコードフェンスと編集報告を削除し、`docs/spec/state-and-scenarios.md` のH5直後、`docs/05_ui/validation_and_messages.md` のリスト直前の空行を修正する。
- PR #198で日本語化した**元の108Markdownファイル**に末尾改行を追加し、MD047・MD032・MD031・MD022の全違反を解消する。本文内容を一括置換・一括整形しない。
- D-026の正本責務、在庫数量とSKU件数、Risk教材の断定、未実行Evidence Pathの禁止、「Likelihood＝発生確率」を文書詳細の指示どおり是正する。
- `QA_AGENT.md` の5章・BR参照の許可表記をvalidatorと揃える。既存英語が有効な `docs/spec/_templates/feature-spec.md` と機械契約保護の `docs/WRITING_STANDARDS.md` は原則維持する。
- 元の108Markdownすべてについてbaseとの差分を照合し、規範的な意味・数値・境界・権限・例外・状態・手順・教材評価に意図しない変更があればその箇所のみ修正する。**自動テスト成功だけで全文の意味保持を確認済みとはしない。**

### 3. 契約テスト

- `tests/contracts/architecture.test.ts`、`codex-artifact-sanitization.test.ts`、`native-windows-local-validation.test.ts`、`spec-agentic-qa.test.ts`、`training-curriculum.test.ts`、`visual-contract.test.ts` の6ファイル11失敗と、同一テスト内で後から露出する旧文言assertionをすべて修正する。
- 教材17本の共通表は、既存8論理項目と**実際に使われている日英表記**を対応付け、欠落・重複・順序違反を検査する。日本語見出し7本、日本語表ラベル4本の対応は実装詳細に固定した。
- 既存の38 Screen・94 Capture Target、Visual Referencesの冪等性、共通課程／Native選択課程の分離、Trainingと正式テストの境界、Expected FailureのCI実行条件を維持する。
- 解析を追加した箇所には、正常な日英入力と欠落・重複・不正参照の負例を追加する。既存の正例・負例を削除・skipしない。
- `scripts/training/check-completion.ts` の修了判定、教材CSV schema、正式テストの期待値は修正しない。

## 実施順序

1. PR #198の最新head・baseを固定し、既存の失敗を確認する。
2. Navigation・5章・BR/ACの解析を修正して、英語Featureと日本語Cartの双方を検証する。
3. Visual Contractの親子見出し・状態表・Visual Referencesの解析を修正する。派生したCapture/画像エラーは解析修正後に再判定し、画像自体を先に変えない。
4. `specRefSchema` の日本語slugを限定的に許可し、既存ASCII参照と日本語・不正入力をテストする。
5. 文書詳細のとおり6アンカー・既知の文章意味差・不要混入・108ファイルの改行と形式を修正する。
6. 17レッスンの共通表と6ファイルの契約テストを修正し、後続のassertionも含めて全件成功を確認する。
7. 元の108変更Markdownの全文について、baseとの意味照合とリンク・アンカーの確認を完了させる。追加の意図しない意味変更は**同じPRで**修復する。
8. 変更後の最終HEADで検証し、PR #198本文に変更内容・対象範囲・成功/未成功の検証・未解決事項を記載する。commit・通常push・PR更新は別途実装権限が与えられた場合に行う。

## 必須検証

必要な依存関係を `pnpm install --frozen-lockfile` で揃え、変更後の同じHEADについて確認する。

~~~bash
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
~~~

- Navigation：日英それぞれ正例、欠落・重複・空一覧・リンク切れの負例。
- Feature仕様：日本語Cart＋英語10機能の正例。必須5章の欠落・重複・順序違反・未知の必須章表記を拒否し、既存の許容H2を拒否しない。
- BR/AC：既存ID・関連完全性の正例。不正な参照行・重複行・不明BRを拒否する。
- Visual Contract：親子見出しの日英両対応、状態表9列、所有者・baseline・画像参照・画面数・Capture数・冪等性の正例と負例。
- `spec_refs`：ASCII・日本語の実在アンカーを受理し、存在しないアンカー・不正ID・不正パスを拒否する。
- 教材：17レッスン8項目、日本語の表ラベル4本、4学習経路、修了条件・Evidence・Expected Failureの保持。
- 文書：元の108ファイルの意味照合、既知アンカー6件とその他の相対参照、形式エラー0件。
- GitHub Actions：PR #198の**最終HEAD SHA**に対応するWeb CI・Mobile App CIおよび必要なJobを確認。後続Jobのskip・未実行を成功と報告しない。

## 完了条件

- 実装詳細・文書詳細で指定した変更が既存PR #198のheadに反映され、機械契約の受理条件と不正入力の拒否条件が維持されている。
- 現在の契約テスト11失敗、Markdown lint112違反、ビルド失敗、および修正後に明らかになった今回の回帰を解消する。
- 元の108Markdownについて意味照合が完了し、仕様・学習内容・評価・修了要件の不必要な変更が残っていない。
- 最終HEADで必須検証とCIの実行結果を確認し、未実行・失敗・残課題はその状態でPR本文に記録する。
- merge・force push・新規PR作成・不要な汎用化・新規依存関係・製品仕様の変更は行わない。
