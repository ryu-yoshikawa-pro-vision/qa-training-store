# 習熟度評価基準

この文書は、テスト自動化カリキュラムの評価の正本です。演習のTest本数や手順を終えたかだけを合否条件にせず、正式な仕様から判断理由を導き、実行可能な成果物で説明できるかを評価します。

## 評価の前提

- 期待される製品動作は、[`docs/spec/README.md`](../../spec/README.md)の正式な製品動作とFeatureのBR / ACから判断する。
- Application、既存Test、README、実行結果は実装・Regression・補助資料・観測結果の記録であり、正式な仕様の正本へ昇格させない。
- Seed Scenario ID、Route、UI Test ID、Build値は、Specが指定する実行可能な正本ソースで確認する。
- `br_ids` / `ac_ids`など複数IDは`;`区切りで記録する。
- iOS Runtimeを実行したことは修了条件にしない。現在の保証はAndroid = Build + Runtime E2E、iOS = Build-onlyである。

## 習熟度一覧

| ID | 習熟項目 | 学習経路の分類 | 対象範囲を限定したレベル2 | 受講者向け主な資料 | 最低限必要な成果物 |
| --- | --- | --- | --- | --- | --- |
| C01 | 自動化の目的と範囲 | 共通課程 | 自動化の価値・限界・自動化しない理由を説明する | [Part 1-1](./part1/01_test-automation-foundations.md) + [01_target-risk.csv](../../../training/workbook/01_target-risk.csv) | `target_id` / `spec_ref` / `risk_description`と、P1-1の自己確認・修了条件での理由説明 |
| C02 | テスト対象と仕様の分析 | 共通課程 | Role、State、Data、BR、AC、JourneyをSpecから整理する | [Part 1-2](./part1/02_scenario-shop-analysis.md) + [02_test-cases.csv](../../../training/workbook/02_test-cases.csv) | 仕様の参照とテスト条件・期待結果 |
| C03 | リスク分析 | 共通課程 | ImpactとLikelihoodから優先順位と理由を説明する | [Part 1-2](./part1/02_scenario-shop-analysis.md) + [Part 1-3](./part1/03_test-design-and-automation-selection.md) + [01_target-risk.csv](../../../training/workbook/01_target-risk.csv) | `impact` / `likelihood` / `priority`の一貫性と、自己確認・総合演習での理由説明 |
| C04 | テスト設計 | 共通課程 | Spec / Riskに適した技法を選び、選定理由を説明する | [Part 1-3](./part1/03_test-design-and-automation-selection.md) + [02_test-cases.csv](../../../training/workbook/02_test-cases.csv) | `risk_id` / `spec_ref` / `test_condition` / `precondition` / `expected_result` / `design_technique`の対応 |
| C05 | テスト層の選択 | 共通課程 | Riskとテスト条件に合うTest Layer / Tool / 実行条件を選び、理由を説明する | [Part 1-3](./part1/03_test-design-and-automation-selection.md) + [03_automation-mapping.csv](../../../training/workbook/03_automation-mapping.csv) | `test_layer` / `tool` / `execution_timing`と、P1-3での選択理由 |
| C06 | 自動化対象の選定 | 共通課程 | Automate / Later / Do not automateをCostとRegression価値で判断する | [Part 1-3](./part1/03_test-design-and-automation-selection.md) + [03_automation-mapping.csv](../../../training/workbook/03_automation-mapping.csv) | 自動化の判断 / tool / 入口またはSpec参照と理由 |
| C07 | Web自動化 | 共通課程 | Playwrightで意味のあるLocator、Assertion、Reset、実行記録を使う | [Part 1-5](./part1/05_playwright-e2e-practice.md) + `training/playwright/exercises/` | 受講者が作成したPlaywright演習の変更、明示したReset、意味のある操作 / Assertion、Web実行の成功記録 |
| C08 | モバイルアプリ自動化 | モバイルアプリ自動化の選択課程 | 選択課程として、Android Maestro、Stable Test ID、Deep Link、Test Controlを使う | [Part 1-7](./part1/07_maestro-native-automation.md) + `training/maestro/exercises/` | 受講者が作成したNative演習の差分と、Maestro実行の成功Artifact。Baseline / stock PASSだけではC08の修了とはみなさない |
| C09 | 失敗分析 | 共通課程 | Locator / Timing / Assertionなどの意味のある診断から、原因・対応・再実行の記録を示す | [Part 1-6](./part1/06_execution-and-failure-analysis.md) + [04_execution-improvement.csv](../../../training/workbook/04_execution-improvement.csv) | Locator / Timing / Assertionなどの意味のある診断と、原因・対応・再実行の記録 |
| C10 | 保守性 | 共通課程 | 実在する保守上の問題、または決定的な教材演習を診断し、理由を伴う最小限の改善と再実行の記録を示す | [Part 1-8](./part1/08_test-management-and-maintainability.md) + [04_execution-improvement.csv](../../../training/workbook/04_execution-improvement.csv) | 実在する保守上の問題または決定的な教材演習の診断、理由を伴う受講者作成の最小改善、再実行の記録 |
| C11 | 変更管理 | 共通課程 | 受講者が作成したGit / PRの変更を、レビュー可能な差分、変更理由、レビュー記録で説明する | [Part 2-3](./part2/03_github-pull-request-review.md) + [Part 2-8](./part2/08_integration-design-capstone.md) | 受講者が作成したGit / PRの変更、レビュー可能な差分、変更理由、受講者向けのレビュー基準に基づくレビュー記録（自分のDiffまたは教材用Diffで成立し、第三者Reviewは必須ではない） |
| C12 | 継続実行の設計 | 共通課程 | 対象範囲を限定したWeb CIのTrigger / Gate / Artifact / 失敗時の記録を設計・説明する | [Part 2-5](./part2/05_playwright-ci.md) + [Part 2-8](./part2/08_integration-design-capstone.md) | Training CopyのPull Request上で受講者が作成したPlaywright Testの成功run / Artifact、Trigger / Gate / 失敗時の記録 |

「共通課程」は受講者が必ず学ぶ範囲を示し、モバイルアプリ自動化の選択課程はC08にだけ適用します。「発展課題」は対象範囲を限定したレベル2の外側を示す説明であり、C01〜C12に新しい分類を追加するものではありません。

## 修了条件

- Part 1の共通課程: C01〜C07 + C09〜C10
- Part 2 / 最終共通課程: C01〜C07 + C09〜C12
- C08はモバイルアプリ自動化の選択課程に属し、共通課程の修了条件には含めない
- C12の共通課程レベル2: 対象範囲を限定したWeb CI
- C08で最低限必要な成果物: 受講者が作成したNative演習の差分と、Maestro実行の成功Artifact
- Baseline / stock PASSだけではC08の修了とはみなさない

<!-- 機械契約: tests/contracts/training-curriculum.test.ts が直接参照するため、次の固定文字列は変更しない。
Part 1 Common: C01〜C07 + C09〜C10
Part 2 / Final Common: C01〜C07 + C09〜C12
C08: Native specialization / Common non-required
C12 Common Level 2: bounded Web CI
C08 Minimum Evidence: learner-authored Native exercise diff + successful Maestro execution artifact
Baseline / stock PASSだけではC08 completionにならない -->

## Level定義

| Level | 定義 | 成果物・確認記録の例 |
| --- | --- | --- |
| Level 0 | 説明・実施できない、または正本や保証範囲を誤る | SpecとImplementationを区別できない |
| Level 1 | 例・ヒント・詳細手順を使って実施できる | 例題を写してResetとAssertionを実行できる |
| Level 2 | 自力で実施し、判断理由と成果物・確認記録を説明できる | Workbook、Test、Artifact、失敗分類が一貫する |
| Level 3 | 複数案とトレードオフを比較し、改善案を提案できる | Cost、Risk、Flaky、Platform保証を含む代替案を比較する |

Level 3は共通課程の必須範囲ではなく、対象範囲を限定したレベル2を超える発展課題として扱います。講師支援の有無はLevel定義の必須条件にしません。

## Part 1修了基準

Part 1の共通課程: C01〜C07 + C09〜C10、対象範囲を限定したレベル2。各習熟項目の評価詳細と最低限必要な成果物は、上記の習熟度一覧を参照します。C08、Physical Android、モバイルアプリ自動化の成果物は共通課程の修了条件に含めません。

Baseline / stock PASSは環境やHarnessを確認する記録であり、受講者が作成した習熟度の成果物の代わりにはなりません。モバイルアプリ自動化を選択する場合のC08の成果物は、上記の習熟度一覧を参照します。外部提出は必須ではありません。

## Part 2修了基準

Part 2 / 最終共通課程: C01〜C07 + C09〜C12、対象範囲を限定したレベル2。各習熟項目の評価詳細と最低限必要な成果物は、上記の習熟度一覧を参照します。

C12の共通課程は、対象範囲を限定したWeb CIのTrigger / Gate / Artifact / 失敗時の記録に限定します。Native / multi-platform / preview-prod delivery、Training Copyの運用詳細、Android baseline、Delivery SHAは共通課程の修了条件へ重ねて記載しません。C08は共通課程の修了条件に含めず、Level 3相当の比較・提案も共通課程の必須範囲ではありません。

## 採点表

| 観点 | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- |
| 正本 | 参照先を指定できる | BR / ACとObservedを分離する | 不明点を課題として扱い代替案を比較する |
| Risk / Design | 技法を使える | Riskから条件・Layerを導く | Cost、Coverage、保守性のTrade-offを提案する |
| Automation | 手順を実行できる | 再現可能なTestと実行記録を作る | Suiteの削減・分割・Trigger改善を提案する |
| Failure | エラーを報告できる | 失敗分類で原因の境界を説明する | 再発防止とGateへの反映を設計する |
| Delivery | CI用語を説明できる | 対象範囲を限定したWeb CIのTrigger / Gate / Artifact / 失敗時の記録を説明する | Exact SHA、Artifact、Runner Costを含む導入案を比較する |

Test本数はPractice Volumeとして記録します。単独の合否条件にはしません。
