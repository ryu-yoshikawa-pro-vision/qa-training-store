# M06：E2E実装と実行

> **AIチューター**：CodespacesでM06をロードした後に `pnpm course:tutor M06 --model provider/model-id` を実行できます。利用条件を確認して起動し、質問にはToken・API key・個人情報を含めないでください。チューターはM06の公開資料と本人の成果物を読み取り専用で使い、正式評価やファイル変更は行いません。

## このモジュールで学ぶこと

- M06の固定3 Caseを実行可能なE2E specへ対応付け、Phase 1の本人Caseがある場合は対応関係も確認する。
- 入力がPhase 1の本人成果物かM06公開fallbackか、そのpath・revisionを記録する。
- Caseの前提に合うSeed/Resetを使い、各テストを独立して再実行する。
- LocatorとAssertionが仕様上の期待結果を実際に確認するかレビューする。
- 実行コマンド、対象SHA、Run、結果、ログやTraceを同じ実行の証拠として示す。
- 未実行、環境障害、失敗、成功を区別し、AIの自己申告だけでPASSにしない。

## 到達条件

固定された正常追加、上限超過の拒否と数量保持、low-stock境界の3 Caseを本人がspecへ対応付けて実行します。各specはCase、Seed/Reset、操作、業務Assertion、実行証拠まで対応します。M03/M04の本人成果物がある場合は、入力元とrevisionを記録し、本人Caseと固定演習Caseの同一・相違を仕様根拠とともに照合します。本人成果物がない、または契約に合わない場合は公開fallbackから独立して始められます。fallbackの利用はM06の実装能力だけを評価し、M03/M04またはPhase 1の修了を示しません。

## 実装の順序

1. Phase 1の`workspace/M03/cases.md`、`workspace/M04/review.md`、必要な提出記録を確認し、参照Case ID、BR/AC、対象revisionを記録します。本人成果物がない/無効なら`inputs/M06/start.md`と公開未完成specを入力にし、配布元revisionを記録します。
2. 本人Caseがある場合は、M06の固定3 Caseと検証責務・条件・期待結果を照合します。同じなら対応するIDと根拠を記録し、異なるなら同一Caseとみなさず、その差または非対応理由を残します。固定3件への自動コピーや本人ファイルの修正・上書きはしません。
3. 対象画面・既存コード・実行可能なSeed/Resetを確認します。`e2e-test-inspection`の出力を確認してから実装へ進みます。
4. Caseの前提を作るResetを各テストに用意し、共有状態による偶然の成功を防ぎます。
5. Caseの操作に対応するActionと、期待結果を確認する業務Assertionを実装します。
6. 新課程専用Configから指定した1つのspecを実行し、結果保存先とRunの証拠を確認します。
7. 同じspecを単独実行・再実行し、結果が安定しているかを確認します。

旧`training/playwright`のspecや正式回帰specを新課程の実技として実行しません。新課程の実行は専用Configから`workspace/M06`内のspecだけを対象にし、結果を`output/training/ai-assisted-qa/`へ保存します。通常のWebポート8081をTrainingの実行先にせず、専用8082を使います。

## 演習

`workspace/M06/`にはM06専用の固定3 Caseと未完成specがロードされます。開始時にPhase 1の本人成果物の有無・revisionを確認してください。利用できる本人Caseがあれば固定Caseとの対応と差を記録します。ない場合や入力契約を満たさない場合は、`inputs/M06/start.md`と公開specをfallbackとして使います。fallbackは独立したM06開始入力であり、Phase 1成果物の復元や修了認定には使いません。本人ファイルは自動コピー・修復・上書きしません。

本人は次を行います。

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
| Caseとの対応・入力元 | 固定3 Caseについて入力元/path/revision、Case ID、BR/AC、spec/test、Action、Assertionを記録する。本人Caseがある場合は一致/相違を根拠で示し、fallbackの場合はPhase 1修了と区別する | 入力元が不明、条件の異なるCaseを同一と扱う、fallbackを本人のPhase 1成果物または修了証拠とする |
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
