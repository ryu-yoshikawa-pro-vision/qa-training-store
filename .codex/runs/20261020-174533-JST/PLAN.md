# PR #202 Geminiリライト統合と残作業実装計画（2026-10-20 JST）

## ゴール

PR #202のPlan `docs/plans/2026-10-19_180409_japanese-spec-curriculum-link-consistency.md` に基づき、現存する日本語リライトを保持し、仕様・カリキュラム本文、既存の解析契約、テスト、リンク、生成HTMLを整合させる。仕様、機械値、教材の学習契約を保ち、最終ローカルゲートと実装HEADの必須CIを確認する。

## 現状と前提

- PR #202はOPEN、base `main`、head `docs/plan-japanese-spec-curriculum-links`、head SHA `fcf52fedef19d5e97945c846152798f9aa78e9d8`。実装作業はそのheadから派生させた `feat/pr202-japanese-spec-curriculum-implementation` で行う。
- PR #199は別のカリキュラム設計PRとしてOPEN。今回変更せず、仕様参照・競合影響だけを確認する。
- 実装開始時に51件のtracked Markdown差分（2,161 insertions / 2,160 deletions）と未追跡Run成果物が存在した。差分パッチとRun一式を一時領域へ退避済み。未追跡のGeminiファイルは見つかっていない。
- 先行Run報告は、変更文書の末尾改行不足50件とPlanのMarkdownlint指摘1件、`roles-and-permissions.md` の表末尾空白修正を記録している。これらは現在の統合対象として再確認する。
- 実行環境はNode.js 22.20.0 / pnpm 10.34.5、`node_modules` は存在する。CIはNode 24を使用するため、ローカル環境差を検証報告に明記する。

## 対象と対象外

- 対象: 既存のPR #202 Planが列挙する仕様書、現行教材・説明文、validator、契約テスト、生成処理、文書間リンク、`docs/WRITING_STANDARDS.md`。追加の変更は確認済みの必要箇所に限定する。
- 対象外: 製品動作、正式UI名称、ルーティング、権限・ビジネスルール、学習経路、17レッスンの修了・評価条件の変更。過去Plan/Run/レポート/fixture/snapshot、PR #199のファイル、CI契約の緩和。
- 禁止: `reset --hard`、`clean -fd`、強制checkout、force push、mainへの直接push、既存PRのclose/merge、ブランチ削除、未確認変更の破棄。
- このRun以前の限定修復計画は先行確認の履歴として保持する。今回ユーザーが明示した実装依頼が現在の変更・検証範囲を定める。

## 変更方針

1. Gemini差分をPlanと基準HEADへ照合し、見出し階層、コード値、BR/AC/SCREEN ID、画面状態slug、9列表、画像参照、表のデータ、Mermaid遷移、カリキュラム評価・修了条件を比較する。意味変更があれば必要な箇所だけ原仕様へ戻す。
2. 既存パーサーと解析結果を再利用し、日本語のみの必須5章・Navigation・Visual Contract見出し/9列状態表・講師資料4区分を受け入れる。欠落、重複、順序違反、不正参照を拒否する負例を維持する。
3. 38画面すべてのカタログ行、所有仕様書、生成アンカー、リンク先H3のSCREEN ID、Web/Android/Automation Web値を照合する。カタログの `primarySpec` パス契約は維持し、`#fragment` の着地先だけを別途検証する。
4. 現行Markdownから仕様書へのリンクと `spec_refs` を照合する。歴史的参照・外部ブックマークは改変せず残余影響として記録する。
5. 生成HTMLの目次、ナビゲーション、分類、タイトル、アクセシビリティラベルおよび画像参照生成を日本語表示へ合わせる。正式名称と機械識別子は維持する。
6. 関連契約テストを実行してからPlan指定の個別検証、`pnpm.cmd run verify`、`build:spec`、`build:docs`、差分チェックを最終状態で実行する。失敗は原因を分類し、安全な最小修正後に必要なゲートを再実行する。
7. Run Artifactを最終コミット前に確定・サニタイズし、明示した対象ファイルだけをコミットする。実装ブランチへ通常pushし、PR #202をbaseとする実装PRを作成または既存の対応PRを更新する。最新HEADの必須GitHub Actionsを確認する。

## 検証計画

`pnpm install --frozen-lockfile` はlockfile/dependency状態を確認し必要時だけ実施する。Plan指定の `format:check`、`lint:markdown`、`lint:text:all`、`validate:spec`、`validate:spec-visuals:final`、`validate:curriculum`、`test:contracts`、`build:spec`、`build:docs`、`build:web`、`verify`、`git diff --check` を最終差分で確認する。Mermaidは変更前後の分岐意味を比較し、描画可能なGitHub環境の表示は手元で確認できない場合その境界を報告する。

## 実施タスク

- [x] 作業前の差分・ブランチ・PR関係を確認し、変更をバックアップして実装用ブランチへ保全する。
- [x] Gemini差分の原文・Planとの意味照合と、画面/リンク/教材契約の棚卸しを完了する。
- [x] 既存validator、生成処理、契約テストを日本語表記に追従させ、正例・負例を保つ。
- [x] 必要なMarkdown、リンク、表示ラベル、文章規約を整え、固定値・学習内容を照合する。
- [x] 関連検証、Plan指定ゲート、全体verify、ビルド、diff checkを実行し、残差を分類・記録する。
- [ ] Run成果物を確定・サニタイズし、選択したファイルを実装ブランチへcommit/pushして実装PRを作成または更新する。
- [ ] 最新実装HEADの必須CIとブランチ/PR/作業ツリーの整合を確認する。

---

# 先行品質ゲートと修復計画
## 目的
現在のブランチと作業ツリーに対して品質ゲートを実行し、安全に自動修正できる検出事項を修復して再検証する。

## 先行確認時点の範囲
- 対象: 実行開始時点の既存差分。今回確認したMarkdown表の行末空白は docs/spec/roles-and-permissions.md のみを修復対象にする。
- 修復時の許可ファイル: docs/spec/roles-and-permissions.md。新たな修復Findingが出た場合、編集前にFindingごとの限定された許可ファイルを記録する。
- 既存の差分を保持し、作業開始前の変更を戻さない。
- 実行: pnpm.cmd run verify と必要な差分チェック。成功後は検証結果、残差、未実行項目を報告する。

## 判断基準
要件判断、権限・credential、破壊的変更、環境要因または同一失敗の反復が必要なFindingは修復を停止して報告する。必須ゲートは省略せず、retryは原因または対応を変えた場合に限定する。

## 修復 iteration 2
- 入力Finding: Markdown lintで50件のMD047（最終改行なし）と1件のMD038（コードスパン前後の不要空白）を検出。最初のFindingは現在変更されている文書50件、もう1件は既存の計画書。
- 許可ファイル（完全一致）:
  - CONTRIBUTING.md
  - QA_AGENT.md
  - README.md
  - SECURITY.md
  - docs/curriculum/test-automation/00_learning-design.md
  - docs/curriculum/test-automation/01_spreadsheet-test-design.md
  - docs/curriculum/test-automation/02_competency-rubric.md
  - docs/curriculum/test-automation/03_instructor-reference.md
  - docs/curriculum/test-automation/04_learning-effort-reference.md
  - docs/curriculum/test-automation/README.md
  - docs/curriculum/test-automation/part1/01_test-automation-foundations.md
  - docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md
  - docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md
  - docs/curriculum/test-automation/part1/04_playwright-foundations.md
  - docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md
  - docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md
  - docs/curriculum/test-automation/part1/07_maestro-native-automation.md
  - docs/curriculum/test-automation/part1/08_test-management-and-maintainability.md
  - docs/curriculum/test-automation/part1/09_part1-capstone.md
  - docs/curriculum/test-automation/part1/09_specification-agentic-qa.md
  - docs/curriculum/test-automation/part1/10_part1-capstone.md
  - docs/curriculum/test-automation/part2/01_software-development-process.md
  - docs/curriculum/test-automation/part2/02_git-version-control.md
  - docs/curriculum/test-automation/part2/03_github-pull-request-review.md
  - docs/curriculum/test-automation/part2/04_ci-github-actions.md
  - docs/curriculum/test-automation/part2/05_playwright-ci.md
  - docs/curriculum/test-automation/part2/06_native-ci-maestro.md
  - docs/curriculum/test-automation/part2/07_ci-cd-quality-gates.md
  - docs/curriculum/test-automation/part2/08_integration-design-capstone.md
  - docs/plans/2026-10-19_180409_japanese-spec-curriculum-link-consistency.md
  - docs/spec/README.md
  - docs/spec/_templates/feature-spec.md
  - docs/spec/change-process.md
  - docs/spec/features/admin-catalog.md
  - docs/spec/features/admin-inventory.md
  - docs/spec/features/admin-orders.md
  - docs/spec/features/admin-users.md
  - docs/spec/features/authentication.md
  - docs/spec/features/cart.md
  - docs/spec/features/checkout-and-payment.md
  - docs/spec/features/native-customer.md
  - docs/spec/features/orders.md
  - docs/spec/features/reviews.md
  - docs/spec/features/storefront.md
  - docs/spec/glossary.md
  - docs/spec/known-deviations.md
  - docs/spec/product-scope.md
  - docs/spec/screen-catalog.md
  - docs/spec/state-and-scenarios.md
  - docs/spec/ui-ux-contract.md
  - docs/spec/unresolved-specifications.md
- 修復計画: 対象文書のEOFへ改行を1つだけ追加し、計画書では意図した「SCREEN ID — 」という接頭辞の説明をコードスパン外の空白として明示する。機械識別子、リンク、本文内容は維持する。
- 検証: 対象限定のmarkdownlint --fixを実行し、続いて対象限定markdownlintと全体verifyで確認する。


## 自己レビュー Finding 1 / 修復 iteration 4

- Finding: should_fix。新規のカリキュラムMarkdownリンク検証は実ドキュメントで正例を通すが、消えたfragmentや欠落ファイルを拒否する専用負例がない。
- Cause: validateCurriculumLinksの失敗契約に対するfixtureがなく、誤って検証を弱めても差分内テストで検出できない。
- Allowed files: scripts/validate-curriculum.ts、tests/contracts/training-curriculum.test.ts のみ。
- Repair: validateCurriculumLinksに対象Markdownファイル一覧の狭い引数を与え、temporary fixtureで同一文書fragment・別文書fragmentの正例と、存在しないリンク先・fragmentの負例を検証する。既存の22文書検証は維持する。
- Validation: 対象テストケース、関連contract suite、validate:curriculum、format:check、git diff --check。full verifyは同一Windows/.codex環境失敗をすでに2回再現しているため、同じ失敗が繰り返される場合はbounded stopを適用する。
- Decision: 修復ループの1 iterationだけ実施し、既存契約を弱めない。

### 自己レビュー Finding 1 resolution

- Resolution: 修復完了。validateCurriculumLinksのrequiredFiles引数は既存の22文書を既定値で維持し、テストでは一時fixtureだけを対象にした。
- Validation: training-curriculum.test.ts 25/25 PASS。新しい負例はmissing targetとmissing fragment、正例は同一文書fragmentと別文書fragment。validate:curriculumは22 required documentsでPASS。format:check、対象ESLint、git diff --checkもPASS。
- Decision: stop_success。検証契約を弱めず、許可2ファイルだけを変更した。