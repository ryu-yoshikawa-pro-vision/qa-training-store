# PR #198 文書・リンク・教材表記の修正内容

この文書は[実装Plan](./2026-10-17_pr198_japanese_contract_alignment.md)の文書修正を具体化する。変更対象は以下の一覧にある元の日本語化差分108ファイル、`QA_AGENT.md`、本PRの実装詳細Plan自身のMarkdown形式修正。実際の修正箇所と文章は、以下の内容に従う。

## 1. 既知のMarkdown形式違反

- MD047：下記一覧の108ファイルに**末尾の改行1文字**を付ける。本文の一括整形、行末コードの全面変換、無関係の書換えをしない。
- MD032：`docs/05_ui/validation_and_messages.md:112-113` の検索文字列正規化の説明文の後、箇条書きの前に空行を入れる。
- MD022：`docs/spec/state-and-scenarios.md:56` の `##### \`default\`` とその直後の説明文の間に空行を入れる。H4とH5の間の空行ではない。
- MD031・MD032：`docs/spec/features/native-customer.md` の44行目（`.github/workflows/native-ios-ci.yml` のソース参照）より後にある不正な `eof` コードフェンスと「変更点と照合結果の報告」を丸ごと削除する。空行挿入だけで報告文を仕様に残さない。
- 実装詳細Plan `docs/plans/2026-10-17_pr198_japanese_contract_alignment_implementation.md` 自身のMarkdown形式も整える。調査時のHEAD `5bbb88aaada8ff138e8fda64070c4e3710706dc8` では36行（MD038）、47行（MD031）、48行（MD032）、113行（MD058）、114行（MD032）の計5違反があった。書式だけを直し、実装指示の意味を変えない。
- 調査時の違反は元の108文書の112件＋追加Planの5件＝117件。`pnpm run lint:markdown` で**変更後のPR全体について違反0件**を確認する。Markdown lintルールを無効化・緩和しない。
- 以下に記した元の文書の行番号は調査基準HEAD `030ecd255e383d350b25f46e1f6068b3d1e71235` に基づく。位置が変わった場合は対象の記述を基準にする。

## 2. 無効な仕様アンカー6件

`scripts/spec/slug-heading.ts` は変更しない。日本語を含むslugに合わせて**参照元のリンク**を修正する。

| 参照元 | 調査時の行 | 旧アンカー | 新アンカー |
| --- | ---: | --- | --- |
| `docs/spec/screen-catalog.md` | 21 | `#screen-storefront-cart-cart` | `#screen-storefront-cart-カート` |
| `docs/spec/product-scope.md` | 76, 103, 130 | `#boundary-ux` | `#境界領域のユーザー体験boundary-ux` |
| `docs/spec/roles-and-permissions.md` | 44 | `#boundary-ux` | `#境界領域のユーザー体験boundary-ux` |
| `docs/spec/ui-ux-contract.md` | 38 | `#boundary-ux` | `#境界領域のユーザー体験boundary-ux` |

- Cartの参照先：`docs/spec/features/cart.md` の `SCREEN-STOREFRONT-CART — カート`。相対パスは `./features/cart.md` のまま。
- Boundary UXの参照先：`docs/spec/ui-ux-contract.md` の `境界領域のユーザー体験（Boundary UX）`。参照元の相対パス `./ui-ux-contract.md` は維持。
- 日本語見出し、画面ID、Related Oracleの表構造は変更しない。仕様の `validateLinks()` とVisual Contractのリンク検証を成功させる。
- 上記以外の変更Markdown・関連する未変更ファイルの相対リンク・アンカー・`spec_refs` を最終確認し、**実在しない参照を残さない**。公開外部リンクの利用が確認できない旧アンカーのために、新しい別名・リダイレクト機構を作らない。
- カリキュラム側の `scripts/validate-curriculum.ts` は相対リンクのファイル存在を確認するが、`#fragment` の見出し一致まで保証しない。変更した教材内リンクのアンカーも最終チェックする。実害が確認されない限り、共通バリデータの新設は行わない。

## 3. 意味が変わった文書

| ファイル・位置 | 採用する修正 | 維持する条件 |
| --- | --- | --- |
| `docs/13_decisions/decision_log.md` のD-026（32行） | 型・Enum・Dexieスキーマの定義・構造はコード、型・構造の設計上の意味・責務・判断理由は該当Markdown、製品の期待動作・業務ルールは正式製品仕様をそれぞれ正本と明記 | `docs/spec/README.md` のオラクル優先順位と、`docs/04_data/domain_types.md`・`application_contracts.md` の意味・責務・理由を扱う正本の役割を維持 |
| `docs/03_domain/business_rules.md` のチェックアウトセッション（167行） | 「作成または最終更新から24時間」を「作成日時から24時間後」に修正し、再開・更新によって有効期限が延長されないと明記する | `docs/04_data/data_model.md:138` の `expiresAt` と `cart-checkout-repositories.ts` の `startOrResume()` で新規作成時に24時間後を設定・再開時には更新しない動作に合わせる。期限判定時に `expired` へ変更する既存処理を維持 |
| `docs/03_domain/business_rules.md` の在庫節（176行） | `out`＝SKU在庫数量0、`low`＝SKU在庫数量1〜5、`available`＝SKU在庫数量1以上と明記。状態に該当するSKUの「件数」と在庫「数量」を区別 | `low` と `available` は原仕様上重なる。相互排他的な状態へ変更しない。在庫0を低在庫件数に含めない |
| `docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md` のImpact（133行）、Priority（135行） | 「深刻な不整合」「業務プロセスが破綻」「影響度は極めて大きい」といった原文以上の断定を避け、影響の可能性・到達条件・判断理由を受講者が評価する表現に修正 | 例示のRiskと、根拠付きのImpact・Likelihood・Priority評価を維持 |
| 同P1-02（139、202、206行） | TypeScript実装をこのレッスンでは読まない、Scenario ID・seed値・固定Clockなど実行可能ソースの値をこの段階では確認しない、教材本文にそれらの値を転記しない、とそれぞれ明記する | 「読む必要はない」「深追いしない」「転記を避ける」という推奨表現で、元の禁止・対象外の条件を弱めない |
| `docs/curriculum/test-automation/part1/04_playwright-foundations.md`（280行） | この導入レッスンではHelper／POMを作成せず、1つのspecに操作手順を直接記述すると明記する | 「導入する必要はない」という任意の表現ではなく、元の導入演習の範囲を維持 |
| `docs/reference/run-artifacts.md`（21行） | 同一会話セッション内で同一タスクを続ける場合はactive Runを再利用し、別のRun Directoryを作成して履歴を分散させることを禁止する | 別タスクの開始や別会話セッション時の例外、`REPORT.md` のappend-only、`run.json` のmachine-managed writer / collector経由での更新、cleanup制約を維持 |
| `docs/curriculum/test-automation/01_spreadsheet-test-design.md`（108行） | 「避けてください」を「未実行の行には予定のEvidence Pathを記入しない」等の明確な禁止に修正 | 実行済みEvidenceだけを参照し、架空パスを実行済みの証拠として記録しない |

例として採用可能な短い修正文：

- D-026：**「実装開始後、TypeScriptの型・Enum・Dexieスキーマの定義および構造は実装コードを正本とする。型や構造の設計上の意味・責務・判断理由は該当Markdownを正本とする。ただし、製品の期待動作および業務ルールは正式な製品仕様を正本とする。」**
- 在庫：**「SKUの在庫数量は0以上の整数で管理する。`out` は在庫数量0、`low` は1〜5、`available` は1以上を表す。表示する低在庫SKU件数には在庫数量0のSKUを含めない。」**（実際の文書では `out` 等をインラインコード表記にする）
- Risk：**「注文金額、在庫数、購入処理の正しさに影響する可能性があります。どの業務や利用者に影響するかを確認し、評価理由を記録します。」**／**「影響の大きさと到達条件を踏まえ、確認順序を決め、その理由を説明します。」**
- Evidence：**「未実行の行に予定のEvidence Pathを記入してはいけません。実際に存在を確認した証拠の参照先だけを記録します。」**
- チェックアウト有効期限：**「チェックアウトセッションの有効期限は作成日時から24時間後とし、再開や更新によって延長しません。期限判定時に、期限切れの有効なセッションを `expired` に変更します。」**
- P1-02（139行）：**「このレッスンではTypeScriptの実装コードを読みません。」**
- P1-02（202行）：**「具体的なシナリオID、シード値、固定時刻など、実行可能なソースに定義された値は、このレッスンでは確認しません。」**
- P1-02（206行）：**「これらの値を教材本文へ転記せず、P1-02では次の順に人間向け資料を参照します。」**
- P1-04（280行）：**「この導入レッスンではヘルパー関数やPage Object Model（POM）を作成せず、1つのspecファイルに手順を直接記述します。」**
- Run Artifact（21行末尾）：**「アクティブなRunが存在する状態で、同一タスクのために別のRun Directoryを作成して作業履歴を分散させてはなりません。」**

## 4. `Likelihood` の日本語表記

P1-02と `docs/curriculum/test-automation/02_competency-rubric.md` で採用されている「発生確率」に統一する。既存CSVキー `likelihood` は変更しない。

| ファイル | 旧表記の位置 | 修正 |
| --- | --- | --- |
| `docs/curriculum/test-automation/01_spreadsheet-test-design.md` | 101行 | `発生頻度（Likelihood）` → `発生確率（Likelihood）` |
| `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md` | 7, 27, 30, 31, 54, 322, 337行 | この教材でLikelihoodを指す「発生頻度」を「発生確率」に修正 |

発生回数の実測値を述べる別文脈まで機械的に置換しない。P1-02の「条件への到達しやすさ」と意味を揃える。

## 5. 規約文書

- `QA_AGENT.md` のFeature必須5章（33〜35行付近）と `Related BR` に関する記述を、許可した英語・日本語の見出し・参照ラベルと整合させる。`spec_refs[]`、BR/AC ID、状態表9列などの機械値は変更しない。
- `docs/spec/_templates/feature-spec.md`：既存英語の5章も有効なので、テンプレート全文を日本語へ書き換えない。
- `docs/WRITING_STANDARDS.md`：固定値・機械契約の保護規則が既に存在するので原則変更しない。
- `scripts/training/check-completion.ts`、`scripts/validate-curriculum.ts`：日本語本文のためだけにCSV構造・修了要件を変更しない。

## 6. 原PRで変更された全108ファイル

一覧の「MD047」は、該当ファイルに必要な末尾改行の修正を指す。詳細な問題が確認されたファイルには、その修正も記した。Plan本体はこの108件には含めない。

| 対象ファイル | 必要な修正 |
| --- | --- |
| `CONTRIBUTING.md` | MD047 |
| `README.md` | MD047 |
| `SECURITY.md` | MD047 |
| `docs/00_overview/implementation_phases.md` | MD047 |
| `docs/00_overview/project_scope.md` | MD047 |
| `docs/02_architecture/repository_structure.md` | MD047 |
| `docs/02_architecture/system_architecture.md` | MD047 |
| `docs/02_architecture/use_case_catalog.md` | MD047 |
| `docs/03_domain/business_rules.md` | MD047／チェックアウトの24時間期限の起点／SKU在庫数量とSKU件数を区別 |
| `docs/03_domain/legal_and_policy.md` | MD047 |
| `docs/03_domain/roles_and_permissions.md` | MD047 |
| `docs/03_domain/state_transitions.md` | MD047 |
| `docs/04_data/application_contracts.md` | MD047 |
| `docs/04_data/data_model.md` | MD047 |
| `docs/04_data/domain_types.md` | MD047 |
| `docs/04_data/image_asset_catalog.md` | MD047 |
| `docs/04_data/indexeddb_schema.md` | MD047 |
| `docs/04_data/repository_interfaces.md` | MD047 |
| `docs/04_data/storage_and_migrations.md` | MD047 |
| `docs/05_ui/design_system.md` | MD047 |
| `docs/05_ui/page_patterns.md` | MD047 |
| `docs/05_ui/screen_list.md` | MD047 |
| `docs/05_ui/ui_content_dictionary.md` | MD047 |
| `docs/05_ui/ui_specifications.md` | MD047 |
| `docs/05_ui/validation_and_messages.md` | MD047／MD032：112行目の説明文と箇条書きの間に空行 |
| `docs/05_ui/wireframes.md` | MD047 |
| `docs/06_flows/sequence_flows.md` | MD047 |
| `docs/06_flows/user_flows.md` | MD047 |
| `docs/07_testability/seed_catalog.md` | MD047 |
| `docs/07_testability/testability_design.md` | MD047 |
| `docs/08_testing/e2e_design.md` | MD047 |
| `docs/08_testing/test_strategy.md` | MD047 |
| `docs/09_deployment/cloudflare_pages.md` | MD047 |
| `docs/10_operations/ci_cd_and_release.md` | MD047 |
| `docs/11_security/security_and_privacy.md` | MD047 |
| `docs/12_quality/acceptance_criteria.md` | MD047 |
| `docs/12_quality/error_logging_accessibility.md` | MD047 |
| `docs/12_quality/requirements_traceability.md` | MD047 |
| `docs/13_decisions/decision_log.md` | MD047／D-026の正本責務の意味を修正 |
| `docs/curriculum/test-automation/00_learning-design.md` | MD047 |
| `docs/curriculum/test-automation/01_spreadsheet-test-design.md` | MD047／未実行Evidence Pathの禁止を明示／Likelihoodの訳語 |
| `docs/curriculum/test-automation/02_competency-rubric.md` | MD047 |
| `docs/curriculum/test-automation/03_instructor-reference.md` | MD047 |
| `docs/curriculum/test-automation/04_learning-effort-reference.md` | MD047 |
| `docs/curriculum/test-automation/README.md` | MD047 |
| `docs/curriculum/test-automation/part1/01_test-automation-foundations.md` | MD047 |
| `docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md` | MD047／リスク影響の過度な断定と、実装参照・実行可能値・値転記の禁止条件を修正 |
| `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md` | MD047／Likelihoodの訳語7箇所 |
| `docs/curriculum/test-automation/part1/04_playwright-foundations.md` | MD047／導入演習でHelper・POMを作らない制約 |
| `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md` | MD047 |
| `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md` | MD047 |
| `docs/curriculum/test-automation/part1/07_maestro-native-automation.md` | MD047 |
| `docs/curriculum/test-automation/part1/08_test-management-and-maintainability.md` | MD047 |
| `docs/curriculum/test-automation/part1/09_part1-capstone.md` | MD047 |
| `docs/curriculum/test-automation/part1/09_specification-agentic-qa.md` | MD047 |
| `docs/curriculum/test-automation/part2/01_software-development-process.md` | MD047 |
| `docs/curriculum/test-automation/part2/02_git-version-control.md` | MD047 |
| `docs/curriculum/test-automation/part2/03_github-pull-request-review.md` | MD047 |
| `docs/curriculum/test-automation/part2/04_ci-github-actions.md` | MD047 |
| `docs/curriculum/test-automation/part2/05_playwright-ci.md` | MD047 |
| `docs/curriculum/test-automation/part2/06_native-ci-maestro.md` | MD047 |
| `docs/curriculum/test-automation/part2/07_ci-cd-quality-gates.md` | MD047 |
| `docs/curriculum/test-automation/part2/08_integration-design-capstone.md` | MD047 |
| `docs/guides/codespaces.md` | MD047 |
| `docs/guides/consumer-update.md` | MD047 |
| `docs/guides/pr-review-request.md` | MD047 |
| `docs/guides/quickstart.md` | MD047 |
| `docs/guides/source-template-separation.md` | MD047 |
| `docs/native/README.md` | MD047 |
| `docs/native/windows-android-local-validation.md` | MD047 |
| `docs/native/windows-android-troubleshooting.md` | MD047 |
| `docs/reference/agentic-qa-workflow.md` | MD047 |
| `docs/reference/change-scope-policy.md` | MD047 |
| `docs/reference/codex-implementation-harness.md` | MD047 |
| `docs/reference/codex-safety-harness.md` | MD047 |
| `docs/reference/curriculum-self-study-review.md` | MD047 |
| `docs/reference/evaluation.md` | MD047 |
| `docs/reference/failure-taxonomy.md` | MD047 |
| `docs/reference/git-branch-safety.md` | MD047 |
| `docs/reference/harness-improvement-loop.md` | MD047 |
| `docs/reference/naming-conventions.md` | MD047 |
| `docs/reference/repair-loop.md` | MD047 |
| `docs/reference/repository-layout.md` | MD047 |
| `docs/reference/run-artifacts.md` | MD047／active Runの二重作成禁止条件を明示 |
| `docs/spec/README.md` | MD047 |
| `docs/spec/change-process.md` | MD047 |
| `docs/spec/features/admin-catalog.md` | MD047 |
| `docs/spec/features/admin-inventory.md` | MD047 |
| `docs/spec/features/admin-orders.md` | MD047 |
| `docs/spec/features/admin-users.md` | MD047 |
| `docs/spec/features/authentication.md` | MD047 |
| `docs/spec/features/cart.md` | MD047 |
| `docs/spec/features/checkout-and-payment.md` | MD047 |
| `docs/spec/features/native-customer.md` | MD047／45行目以降の不正なeofフェンス・編集報告を削除 |
| `docs/spec/features/orders.md` | MD047 |
| `docs/spec/features/reviews.md` | MD047 |
| `docs/spec/features/storefront.md` | MD047 |
| `docs/spec/glossary.md` | MD047 |
| `docs/spec/known-deviations.md` | MD047 |
| `docs/spec/product-scope.md` | MD047／Boundary UX参照アンカー3件を修正 |
| `docs/spec/roles-and-permissions.md` | MD047／Boundary UX参照アンカー1件を修正 |
| `docs/spec/screen-catalog.md` | MD047／Cart参照アンカー1件を修正 |
| `docs/spec/state-and-scenarios.md` | MD047／MD022：56行目の状態H5直後に空行 |
| `docs/spec/ui-ux-contract.md` | MD047／Boundary UX参照アンカー1件を修正 |
| `docs/spec/unresolved-specifications.md` | MD047 |
| `training/github-actions/README.md` | MD047 |
| `training/maestro/failure-exercises/README.md` | MD047 |
| `training/workbook/README.md` | MD047 |

## 7. 全ファイルの意味照合・完了条件

- 上記108ファイルの全差分をPR #198のbase SHAの変更前と比較し、既知の修正以外に意味を変えた記述があれば**その箇所だけ**元の仕様・教育内容へ戻す。数値・境界値・必須/任意・権限・状態・エラー・セキュリティ・学習評価・修了条件・手順・固定IDを優先して確認する。
- 「末尾改行だけ」欄は**現時点で確定している修正**を表す。意味上の追加修正が不要と保証した扱いにしない。
- ファイル単位で原文との意味照合を完了したか確認し、未確認を「問題なし」に数えない。
- 既存の11件の契約テスト失敗を解消しても意味保持が保証されたとは扱わず、文書間の参照先と各教材の評価条件まで確認する。
- 文書の修正後、`pnpm run lint:markdown`、`pnpm run lint:text:all`、`pnpm run validate:spec`、`pnpm run validate:curriculum`、`pnpm run build:docs`、契約テストとGitHub Actionsを確認する。
