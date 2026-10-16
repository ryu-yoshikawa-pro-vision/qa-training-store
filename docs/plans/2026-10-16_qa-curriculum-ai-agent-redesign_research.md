# QAカリキュラム再設計：調査結果と設計判断

## 調査条件

- 対象：`qa-training-store` のPR #198 HEAD `36803c29efd1df8f09ef7b7d533759f79dc9893f`。PR #198は文章のリライトであり、学習内容を変更するPRではない。
- 連携先：`qa-workflow-skills` の `main` `dcabbb218cf79f6920f5c8303e60140ab9c15f23`。PR #16・#17は未マージのため採用済み機能として扱わない。
- 調査方法：教材17本の学習目標と演習、仕様書、Seed一覧、Trainingコード、修了判定・契約テスト、Skillの実行契約を確認。外部資料はOpenCodeとPlaywrightの公式資料を参照。
- 検証境界：ソースと文書から確認できた事実。**OpenCodeでのSkill発火、実際のPlaywright実行、受講者の学習所要時間は今回未実測**。推定値でPASSや工数を確定しない。

## 1. 現行教材の評価

| 項目 | リポジトリ上の事実 | 設計判断 |
| --- | --- | --- |
| 学習者 | 手動テスト経験があり、プログラミング・Playwright・Git・CIが未経験でも受講可能とする | 維持。生成コードを読んで誤りを判断するための最小限の知識は必要 |
| レッスン | Part 1の9本、Part 2の8本。P1-07とP2-06はNative選択課程 | **Lesson IDを維持**。各レッスンの活動を再構成する |
| 評価 | C01〜C12、レベル0〜3。C08は選択課程。最終共通はC01〜C07・C09〜C12のレベル2 | C01〜C12を維持し、AI協働の修了要件を新規C13で明示する |
| 学習工数 | 共通の参考値67.5〜98h、計画上約80〜85h。実測値ではない | 現時点で増減を断定しない。代替する手作業を除き、試行時間で再積算する |
| Playwright | P1-04で最小TypeScriptとPlaywright、P1-05でWeb E2E、P1-06で診断、P1-08で保守 | 必修を維持。ただし大量の手書きではなく、AI生成テストの理解・検証・修正へ配分を移す |
| Git・CI | Git/GitHubの詳細はPart 2。P2-05でTraining CIに接続する | 詳細学習は維持し、P1でAIへファイル編集を許可する前に`git status`と`git diff`を教える |
| 成果物 | 4 CSVと`handoff-root/{workbook,code,evidence,receipts,self-check}`。機械検査と意味判断は別 | 現行形式を再利用。AIとのやり取り全文を新形式で収集しない |
| AI用の既存基盤 | `training/agentic-qa/`、`.agents/skills/exploratory-qa/`、探索Challenge、Scored評価 | 一般的なテスト分析・設計の必修とは別。Black-box Scoredは発展・参考に留める |

主な根拠：
- [カリキュラムREADME](../curriculum/test-automation/README.md)、[学習設計](../curriculum/test-automation/00_learning-design.md)、[ルーブリック](../curriculum/test-automation/02_competency-rubric.md)、[工数](../curriculum/test-automation/04_learning-effort-reference.md)
- [P1総合演習](../curriculum/test-automation/part1/09_part1-capstone.md)、[P2総合演習](../curriculum/test-automation/part2/08_integration-design-capstone.md)
- [受講者用ワークブック](../../training/workbook/README.md)、[既存Agentic QA参照](../reference/agentic-qa-workflow.md)
- [カリキュラム検証](../../scripts/validate-curriculum.ts)、[契約テスト](../../tests/contracts/training-curriculum.test.ts)、[修了確認](../../scripts/training/check-completion.ts)

### 17レッスンの取り扱い

レッスンを一律に増やす必要はない。P1-02/P1-03の分析・設計はSkillで下書きを行い、人間の確認作業と技法の理解を授業の中心にする。P1-04はPlaywrightコードの読解に絞る。P1-05〜P1-08で生成・実行・失敗分析・保守を行う。Part 2はこの同じテスト変更をGit/PR/CIへつなぐ。

最初の案のように**全レッスン末尾へ「AI活用」節を足すだけでは、手作業の教材とAI演習の二重履修になる**。置き換える具体的な節・ハンズオンを実装設計で指定する。

## 2. OpenCode・Skillに関する確認

OpenCode公式は `.opencode/skills/<name>/SKILL.md` のほか、`.agents/skills/<name>/SKILL.md` と `.claude/skills/<name>/SKILL.md` を対象にし、Skillを必要に応じて読み込むとしている。これは**発見の仕様**であり、このTraining Copy・無料モデル上で実際に実行できたことの証明ではない。

- [OpenCode公式：Agent Skills](https://docs.opencode.ai/docs/skills/)
- [OpenCode公式：V2 Skills](https://dev.opencode.ai/v2/docs/skills/)（現行CLIでどの設定体系が有効か、実行時に判別する。旧・新仕様を混ぜない）
- [Playwright公式：Best Practices](https://playwright.dev/docs/best-practices)
- [Codespacesガイド](../guides/codespaces.md)

`qa-workflow-skills` は22 Skill。責務は次のように分かれている。

| 工程 | 候補Skill | 教材で扱うこと |
| --- | --- | --- |
| 開始・経路管理 | `qa-workflow` | 何を作りたいかを伝え、必要な工程へ進める。全Skillの強制実行はしない |
| 仕様の根拠 | `spec-analysis`、`question-analysis` | 仕様・判断・推論・不明点を区別する |
| テスト分析と設計 | `test-analysis`、`test-requirement-design`、`test-condition-design`、`test-case-design` | リスク、検証責務、条件、ケースのつながりを確認する |
| 網羅性・レビュー | `coverage-analysis`、`adversarial-review` | 欠落・重複・誤った期待結果を判断する |
| Playwright | `e2e-test-inspection`、`e2e-test-implementation`、`e2e-test-execution`、`e2e-test-result-analysis` | 既存テストと実行契約を確認してから実装・実行・診断する |
| 継続QA・探索 | `regression-testing`、`exploratory-testing` | 必須の詳細操作ではなく、必要時・発展時に利用する |

Skillの実行契約には参照ファイル・Pythonスクリプト・決定論的検証が含まれる。**SKILL.mdだけを別の場所へコピーして完結するとは限らない。** また `qa-workflow-skills` の生成したID・ファイル構造と、Trainingの `TARGET/RISK/TC`・CSVの互換性は未確認。新しい変換器を先に作るべき根拠はない。

独立したAgentic QAのScored Challengeは、探索時の隔離、採点用情報と受講者情報の分離、専用runnerなど別の契約を持つ。AIエージェントによる日常的なテスト分析・設計の能力を教えるためにこれらを必修化する必要はない。

## 3. 学習課程の構成比較

| 案 | 効果 | 課題 | 判定 |
| --- | --- | --- | --- |
| 17レッスンを維持し、**既存活動を置き換える** | 既存教材、Lesson ID、Training経路、CI・修了確認を再利用できる。現行の分野は卒業像に必要 | 各章の重複説明を実際に削除しないとAI活用が付け足しになる | **採用** |
| レッスンを統合して全面再編 | 新しい順序を自由に設計できる | P1/P2の成果物と機械契約・所要時間の再設計が増える。目標達成上の不足が未確認 | 不採用 |
| 既存17レッスンの後ろにAI専用の追加課程 | 今ある教材への変更が少ない | QA工程とAIが分離し、学習が二重になる | 不採用 |

採用理由は保守コストだけではない。既存の仕様・テスト技法・コード・CIの学習対象は必要であり、**実施の仕方を「手書き中心」から「AIと協働しながら検証」へ変更すること**が今回の目的に合うため。

### C13を追加する理由

現行C01〜C12はテスト分析・自動化・運用の能力を測れるが、**AIに適切に作業を依頼し、提案を検証して採否を判断した経験**が必須であることを、番号と修了条件だけから確認できない。新規のC13「AIエージェントを使ったQA工程の実施と検証」を共通必須に追加する。C01〜C12の内容を置き換えず、C13が実際のAI活用を確認する。

C13を追加するため、`02_competency-rubric.md` と修了条件の変更が必要。単純な文字列追加だけで済ませず、`tests/contracts/training-curriculum.test.ts`、`scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts`との整合を確認する。C13の意味判断は機械的に「合格」としない。

## 4. テスト対象の再利用と不足

確認済みの仕様：
- `docs/spec/features/cart.md` は `BR-CART-001`（上限超過は**数量を補正せず操作を拒否し、従前数量を維持**）、`BR-CART-002`（ゲストカート統合）、`BR-CART-003`（状態再検証）を定義する。
- `docs/spec/features/checkout-and-payment.md` はチェックアウト再開、カートバージョンの再検証、Mock Paymentの一貫性を定義する。
- `src/seeds/metadata.ts` は `default`、`low-stock`、`out-of-stock`、`cart-with-invalid-items`、`guest-cart-merge-overflow`、`checkout-resume`、`cart-version-invalidates-checkout`、`payment-declined` などを定義する。
- `training/playwright/diagnostic-exercises/diagnostic-cart.spec.ts` は **TC-CART-001で意図的に誤ったカート追加成功の期待結果**を持つ。AIが提案した原因と正式仕様を比較するのに使える。
- `training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts` はLocatorの重複を持つ保守演習。`training/playwright/failure-exercises/expected-failure.spec.ts` は意図的なFailure Artifact確認用。
- `training/playwright/support/reset-scenario.ts` はTest APIでResetを実施した後、実際に選択されたScenarioを検証する。

**結論：現時点で新しい製品機能や意図的なアプリ不具合を追加する根拠はない。** ただしWeb上の再現性・Skillによる実行可能性は未実測。後続の受入試験で不足が発見された場合だけ、Seed・Training演習・アプリの順に最小変更を検討する。

既知の差異一覧は有効項目なし（`docs/spec/known-deviations.md`）。一方、`docs/spec/unresolved-specifications.md` はWeb/Nativeの完全な見た目一致など未確定事項を含む。これを正解データにしない。

## 5. 変更しない事項

- 製品の正式仕様を教材の都合で書き換えない。
- `e2e/web/` と正式な製品CIに受講者用テストを混ぜない。
- 全Skillの必修、Maestroの必修化、有料モデルの指定、別のQAエージェントハーネス、新しいDB、新しい採点サービスを導入しない。
- 本計画だけをもってOpenCode＋Skill連携・アプリ操作・学習効果が検証済みとはしない。

## 6. 設計で確定したことと残る確認

| 状態 | 項目 |
| --- | --- |
| 採用 | 既存17レッスンとP1/P2の大枠を維持、AI協働の活動へ置換、C13を必須に追加、Web共通・Native選択 |
| 採用 | 正式仕様優先、実行証拠で検証、4 CSVと既存handoff経路を再利用 |
| 採用 | 現行Seed・診断演習から開始。アプリ本体の変更を前提にしない |
| 実装前に検証 | OpenCodeとSkillの発見・スクリプト実行・成果物の有効性、Training Copy上の実行、CSVとの対応 |
| 実測前に確定不可 | 新カリキュラムの所要時間、無料モデルの継続利用可否、実際の受講者の達成率 |

採用構成とレッスン別の変更内容は [カリキュラム設計](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md)、対象シナリオと検証方法は [演習・テスト対象設計](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) を正本とする。
