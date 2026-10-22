# M06：E2E実装と実行

## このモジュールで学ぶこと

- M03で本人が承認した複数のCaseを、実行可能なE2E specへ対応付ける。
- Caseの前提に合うSeed/Resetを使い、各テストを独立して再実行する。
- LocatorとAssertionが仕様上の期待結果を実際に確認するかレビューする。
- 実行コマンド、対象SHA、Run、結果、ログやTraceを同じ実行の証拠として示す。
- 未実行、環境障害、失敗、成功を区別し、AIの自己申告だけでPASSにしない。

## 到達条件

学習者本人が書いたspecで、Phase 1のCaseから意味の異なる検証責務を持つ複数テストを実行します。正常結果、拒否時の不変条件、境界またはRole/State差を含む3件以上のCaseを評価対象にできることを目指します。各specはCase、Seed/Reset、操作、業務Assertion、実行証拠まで対応します。

## 実装の順序

1. M03で承認したCaseとその仕様根拠を読みます。
2. 対象画面・既存コード・実行可能なSeed/Resetを確認します。`e2e-test-inspection`の出力を確認してから実装へ進みます。
3. Caseの前提を作るResetを各テストに用意し、共有状態による偶然の成功を防ぎます。
4. Caseの操作に対応するActionと、期待結果を確認する業務Assertionを実装します。
5. 新課程専用Configから指定した1つのspecを実行し、結果保存先とRunの証拠を確認します。
6. 同じspecを単独実行・再実行し、結果が安定しているかを確認します。

旧`training/playwright`のspecや正式回帰specを新課程の実技として実行しません。新課程の実行は専用Configから`workspace/M06`内のspecだけを対象にし、結果を`output/training/ai-assisted-qa/`へ保存します。通常のWebポート8081をTrainingの実行先にせず、専用8082を使います。

## 演習

`workspace/M06/`に、M03で本人が作ったCaseと、未完成のspec素材をロードします。本人は次を行います。

1. 各Caseの前提と、リセット後に確認する状態を記録します。
2. 仕様から期待結果を選び、画面上のどの情報で確認できるかを決めます。
3. AIが生成したspecのLocator、Action、AssertionをCaseと照合して、必要な修正を行います。
4. 各specを単独実行し、まとめて実行し、再実行します。
5. 実行ごとのコマンド、状態、結果、ログ・Traceを対応付け、未実行や環境障害を明示します。

既定の対象は`workspace/M06/`です。M07の失敗診断用specを実行する場合は、`PLAYWRIGHT_TEST_ROOT=workspace/M07`を指定します。実行コマンドは`pnpm run training:ai-assisted-qa:test`です。Configは`workspace/M06`または`workspace/M07`以外、loopback以外、8082以外を拒否します。結果は`output/training/ai-assisted-qa/`に保存されます。

公開する演習素材には完成済みの実技解答を含めません。受講者がCaseやspecをAIに作らせただけでは達成とせず、本人が対応関係、誤ったAssertion、実行結果を説明できることを確認します。

## 評価基準

Phase 2の実装確認では、意味の異なる3件以上のCaseを対象にします。正常結果、拒否時に維持すべき不変条件、境界またはRole/State差を含め、次を確認します。

| 観点 | 到達を示す証拠 | 到達しない例 |
| --- | --- | --- |
| Caseとの対応 | 各Case ID、仕様、前提、Action、業務Assertionを対応させ、弱いAssertionを見つけて直す | PASSしてもCaseの期待結果を確認しないspec |
| 状態と独立性 | Seed/Resetの保証範囲を照合し、テストごとに状態を準備して単独実行・再実行する | 実行順や共有状態による偶然のPASS |
| 実行証拠 | 対象SHA・spec・サーバー・Run・結果・Trace/Reportが同じ実行を指す | 別実行のPASSやログだけを流用する |
| 結果の分類 | 未実行、環境BLOCKED、FAIL、PASSを実行事実から分けて報告する | 終了コードやAIの説明だけでPASSを宣言する |
| 安全な修正 | テスト側の不備を最小差分で直し、製品コードは変更せず修正後の別Runを示す | 学習テストを通すために製品を変える |

Level 2は本人のCase判断、修正理由、再実行証拠が揃った場合に評価します。環境で実行できない部分はBLOCKEDとし、設計説明だけで実行能力まで認定しません。

## 判定の注意

PASSは、その実行でspecが成功したことを示します。AssertionがCaseの期待結果を確認していない場合、PASSでも仕様検証の証拠にはなりません。コマンドの終了コードだけでなく、対象spec、対象サーバー、レポート、Runが一致することを確認します。製品不具合、テスト不具合、環境障害は分けて報告し、学習用テストの失敗を直すために製品コードを変更しません。

## 確認クイズ

[M06の確認クイズ](../../quizzes/M06.json)を開いてください。

## 参考

- [Scenario ShopのCart仕様](../../../../spec/features/cart.md)
- [SeedとResetの仕組み](../../../../../training/playwright/support/reset-scenario.ts)
- [新課程Playwright Config](../../../../../playwright.ai-assisted-qa.config.ts)
- [M06の学習項目と到達基準](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
