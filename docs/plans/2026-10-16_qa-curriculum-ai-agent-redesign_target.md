# QAカリキュラム再設計：Scenario Shop演習・テスト対象の設計

## 結論

**共通課程は既存のCartを主題とし、CheckoutとPaymentは範囲を限定した発展・比較に使用する。** 現時点で製品仕様・業務ロジック・新規画面を変更する根拠はない。

不足のある教材を機械的に増やさず、すでにあるSeed/Reset、Playwrightの診断・保守演習、既存のTraining Copyを再利用する。AIエージェントとの実際の協働は、製品コードを編集しなくても成立する設計とする。

## 仕様と検証の優先順位

1. 正式仕様：`docs/spec/README.md` → `features/cart.md`、`features/checkout-and-payment.md`などのBR/AC。
2. テスト用の固定データ：`src/seeds/metadata.ts`、`docs/07_testability/seed_catalog.md`、`docs/spec/state-and-scenarios.md`。
3. 実行方法と観測：`training/playwright/support/reset-scenario.ts`、`playwright.training.config.ts`、`training/playwright/` のTraining spec。
4. 実行証拠：同じ対象・実行条件・コミットで生成したReceipt、Trace、Screenshot、Check/Artifact。
5. 比較資料：`e2e/web/` の正式回帰テスト。受講者が最初に完成答案を読む用途には使わない。

AI出力やアプリの観測結果を、仕様に優先する正解として扱わない。ビジネスルールやACが矛盾する場合、教材で都合よく決めず仕様側の確認へ戻す。

## 必須の演習シナリオ

| 課題 | 主な仕様 | 初期状態・実装 | 必ず確認すること | 提出証拠 |
| --- | --- | --- | --- | --- |
| E1 カート数量の境界 | `BR-CART-001` / `AC-CART-001` | `default`、必要に応じて`low-stock`・`out-of-stock` | 同一SKUの上限超過時、数量を自動補正せず、**操作を拒否し以前の数量を維持**。境界条件・期待結果の根拠を説明 | リスク、TC、Playwright spec、実行証拠 |
| E2 購入不可カート | `BR-CART-003` / `AC-CART-003` | `cart-with-invalid-items`、会員状態 | 問題のある明細を検出し、その理由を表示してCheckoutへ進めない | 状態・条件の分析と期待結果、E1との自動化対象選定比較 |
| E3 AIによる失敗分析 | `BR-CART-001` | `training/playwright/diagnostic-exercises/diagnostic-cart.spec.ts` | 元specの期待値が仕様に反すること。初回は失敗の証拠を取り、正しい期待へ修正後に**別Run**を取得 | 失敗分類、原因とAI仮説の区別、変更差分、修復Run |
| E4 AIによる保守性の判断 | テスト保守の学習目標/C10 | `training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts` | 重複Locatorの改善が必要かを見極め、意味を変えない最小限の修正。不要なPOMやFixture抽象化を採用しない | 改善前後の差分、理由、別Run |
| E5 AI協働のPR・CI | E1の同じTC・正式仕様 | Training CopyのPR、Web Training Workflow | AIが書いたコードを受講者がレビューし、対象commitのCI Run/Check/Artifactを確認 | PR差分、レビュー判断、実行確認、C11/C12/C13 |
| E6 AIが出した案のレビュー | `BR-CART-001`、`BR-CART-003` | 正本から作る教材用の固定誤答例 | 「上限超過は数量を上限まで自動調整し成功する」は誤り。受講者が根拠とともに却下できる | 誤り・根拠・採否判断。AIが実際に誤答した証拠であるとは偽らない |

### E1の設計条件

- 受講者が `BR-CART-001` に基づき許容上限を定義する。上限は「在庫」「購入上限」「99」の最小値であり、これを超えた操作は全体を拒否する。
- 入力：`default`でResetし、実装上のSKU・商品データの正本を必要な範囲で確認する。特定のSKU名・在庫値は**実装確認なしに教材へ固定しない**。
- 期待結果：上限超過時に追加成功とはならず、既存の数量が保持される。画面の具体的な通知文言とLocatorは現行仕様・アクセシビリティ・実際の実装に照らして選ぶ。
- テスト設計：既存ワークブックにある`TC-CART-001`を出発点にできる。受講者の完成答案を配布する前に正規CSVのサンプルと提出用コピーを区別する。
- 実装：`training/playwright/exercises/`。Resetには `training/playwright/support/reset-scenario.ts` を使い、`testApi.getMetadata()`でリセット先を検証する既存経路を再利用する。
- 失敗時：操作の成否、数量、エラー・画面状態を証拠に原因を分類する。エラー文言に合わせて仕様上の期待結果を書き換えない。

### E2の設計条件

- `cart-with-invalid-items`で初期状態を作り、`BR-CART-003`が定める商品状態の再検証とCheckout禁止を確認する。
- 対象状態は無効SKU・購入権限・公開状態など。実際にどの明細が含まれるかはSeedの現物で確認する。
- E1とE2を両方E2E実装する必要は、C07に必要な範囲と試行時間を見て決める。**E1は必須の自動化、E2は必須の設計・リスク評価**とし、E2の追加E2Eは発展扱いにする。これにより受講者の最低提出量を抑える。

### E3・E4の使い方

- `diagnostic-cart.spec.ts` はすでに固定的な誤ったAssertionを持ち、実行結果と `BR-CART-001` を比較できる。**製品本体に意図的なバグを入れない**。
- `expected-failure.spec.ts` はArtifactの見方を確認する教材であり、診断初回Runや自然発生した失敗と混同しない。
- `c10-locator-maintenance.spec.ts` はLocator重複の練習素材。AIの改善案は必ずしも正しいとは限らないが、故意にモデルへ間違わせる要求はしない。
- `training:completion:check` が要求する失敗前後のRun識別、evidence、自己確認との対応を維持する。

## 追加の比較・発展課題

| 条件 | 仕様・Seed候補 | 位置付け |
| --- | --- | --- |
| カート統合時の制約 | `BR-CART-002`、`guest-cart-merge-overflow` | 状態遷移・ロール・データの詳細比較 |
| Checkout Session再開・置換 | `BR-CHECKOUT-001`、`checkout-resume`、`checkout-replaced` | 複数状態の整理、再現性を説明する発展 |
| Cart Versionの不一致 | `BR-CHECKOUT-002`、`cart-version-invalidates-checkout` | 競合・復旧経路の分析・実装発展 |
| Mock Paymentの失敗・処理中 | `BR-CHECKOUT-003`、`payment-declined`、`payment-processing` | 状態・重複操作禁止・データ一貫性の発展 |
| Native | `training/maestro/exercises/`、既存Native Seed | P1-07/P2-06の選択課程 |
| Agentic QA探索 | `training/agentic-qa/challenges/` | 探索的QA・Scored評価の参考・発展課題。必須の分析・設計Skillとは分離 |

共通課程はE1〜E6を単純に別々の完全なテストとして提出させるのではなく、**E1の一連の仕事にE3（診断）、E4（保守）、E5（PR/CI）、E6（判断確認）を加える**。E2はリスク・条件選定の比較課題とする。

## AIエージェントを使う手順

### 先に利用対象を確認する

- OpenCode CLIが使用できること。モデル・料金条件は実施時点に確認する。Codespacesの料金とモデル利用料金を混同しない。
- `qa-workflow-skills` を特定のcommitに固定して参照すること。配置方法はOpenCodeの実際のバージョンで確認する。
- Skillの `SKILL.md`、`references/`、`scripts/`、必要なPython runtimeを使えること。`SKILL.md`だけを読む手順を「実行成功」としない。
- `qa-training-store`が提供する `.agents/skills/exploratory-qa` と `qa-workflow-skills` の各Skillの名称・役割を混同しない。

### 実際の依頼に入れる情報

受講者が設定するのはモデルの細部ではなく、対象スコープ、参照仕様、欲しい成果物、変更してよいパス、実行可否と結果確認の条件。

例：
- 「`docs/spec/features/cart.md` の `BR-CART-001` に基づき、数量上限のテスト条件を整理する。未確定事項を補わず質問する。Product Codeは変更しない」
- 「既存のテスト条件と `training/playwright/` のルールに従い、許可した受講者specにのみPlaywrightテストを実装する。確認できない環境には接続しない」
- 「失敗したTraceと正式仕様から原因候補を整理する。仮説と確認済みの事実を区別し、未実行の成功を報告しない」

Skill選択・呼び出しそのものはOpenCodeの発火機構に任せてもよい。受講者は使用したSkill、生成物、どの判断を自分で行ったかを説明する。全22 Skillを明示呼び出しする学習にはしない。

### 安全な実行と成果物の置き場所

1. 受講者専用のTraining Copyまたは隔離された学習用コピーで実施。正式 `e2e/web/` と製品ソース変更を禁止する。
2. `git status`・`git diff`でAIの変更を確認する。
3. `pnpm run training:web:baseline` は環境の確認に使う。成功しても本人が作成したテストの合格にはならない。
4. `pnpm run training:web:exercise` は受講者specの実行。`training:web:exercise:with-receipt` を利用する際は引数・必要な成果物を現行スクリプトで確認する。古いArtifactを今回の実行結果として流用しない。
5. P1-06の診断、P1-08の保守演習では既存の決定的な演習入口を使う。診断初回Failureを正常な修復PASSとはみなさない。
6. GitHubへのPR・CIはP2のTraining Copyのみ。元リポジトリのデプロイworkflowに触れない。
7. 実行できない場合は `blocked` または未実行と記録し、受講者の能力不足と実行環境の問題を区別する。

## 「テスト対象の修正」が必要となる条件

次の優先順で判定する。

| 優先順位 | 条件 | Codex実装対象 |
| --- | --- | --- |
| 1 | 既存Seed・Reset・演習で必須課題が成立 | **製品コード変更なし**。学習手順とルーブリックの修正だけ |
| 2 | 既存の入力は揃うが、受講者向け演習手順・誤答例・説明が不足 | `docs/curriculum/`、必要に応じて`training/playwright/`・講師資料のみ |
| 3 | Seedに必要な状態がなく、正式仕様は確定している | `src/seeds/metadata.ts`、対応Seed生成、seed catalog、該当テストだけ変更 |
| 4 | 正式仕様を満たす製品実装・テスト制御に具体的な欠落がある | 仕様根拠・再現条件・影響範囲・テストを揃えて必要な実装を修正 |

現在の調査では**優先順位1・2の範囲で設計が成立する見込み**。優先順位3・4の追加実装は、検証結果が出るまで禁止する。特に「AIを教えたいのでアプリにバグを作る」という変更はしない。

## Codexへ引き継ぐ変更・検証の境界

### 変更対象の候補

| 区分 | パス | 変更要否 |
| --- | --- | --- |
| 学習目的・評価 | `docs/curriculum/test-automation/README.md`、`00_learning-design.md`、`02_competency-rubric.md` | 必須 |
| 全レッスン | `docs/curriculum/test-automation/part1/`・`part2/` | 必要な節・演習のみ置換。全件への一律追加は禁止 |
| 講師・工数 | `03_instructor-reference.md`、`04_learning-effort-reference.md` | 必要な評価・支援手順を修正。工数の推測確定は禁止 |
| 演習素材 | `training/playwright/`、`training/workbook/` | 再現可能なE1〜E6に不足する場合だけ |
| 修了・契約 | `scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts`、`tests/contracts/training-*.test.ts` | C13と変更後の成果物契約へ合わせる |
| 教材配布・環境 | `docs/guides/codespaces.md`、Training Copy関連コード | OpenCode＋Skillの実動作で必要な変更が見つかった場合だけ |
| 製品とSeed | `src/`、`docs/spec/`、`docs/07_testability/` | 実証された欠落がない限り変更しない |
| 正式テスト・製品CI | `e2e/web/`、`maestro/`、`.github/workflows/` | 既存保証を維持。Training演習を混入しない |

### 実装開始前に行う最小の動作検証

| 検証 | 成功とみなす条件 |
| --- | --- |
| Skill発見 | OpenCodeが指定revisionの`qa-workflow`と担当Skillを認識できる |
| 設計成果物 | Cartの入力から、具体的な仕様根拠を持つTC案を生成。決定論的処理を使った場合は実行結果を確認できる |
| Playwright実装 | Training Copyの受講者specにのみ変更が入る。既存の実装やResetに従う |
| Web実行 | 対象Test Caseが実際に動き、失敗/成功とArtifactが同じRunから追える |
| Workbook | 既存の`target_id`/`risk_id`/`test_case_id`との対応が曖昧にならない |
| 変更の安全性 | 生成コード・設定・コミットにSecretや想定外のファイル変更が含まれない |

上記は実装段階で実際に実施する**受入条件**であり、今回実行済みという意味ではない。

## 全体の検証と完了条件

- 必須のCart課題について正本・設計・Playwright・実行証拠が対応し、AIが作成した提案への採否判断が説明できる。
- C09の診断初回／修復後、C10の保守改善前／改善後を混同しない。
- C13をself-checkで評価でき、C07・C09・C10・C11・C12の修了要件を省略していない。
- 学習用Workflowと正式な製品Workflowが分離されている。
- Web必須をNative実行・端末・Maestro・iOSビルド要件に依存させない。
- `pnpm run validate:curriculum`、関連契約テスト、Training Webの実行など、変更箇所に必要な検証結果を記録する。
- 新しい製品変更が0件なら「既存機能で満たせた」と説明できる。変更があるなら、学習目的と仕様・再現条件から理由が追える。
- 実環境で未検証の項目を、設計・実装済みであることからPASSと扱わない。

学習目標と全レッスンの改訂基準は [カリキュラム設計](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md) に従う。
