# PR #199：現行基本分析からの正式Case採否（2026-11-07）

## 判定結果

現行基本分析の採用方針を変更せず、旧追跡差分の12動作、明示の23動作、採用範囲とC1〜C7の条件定義が揃う追加109動作に正式Case IDを付与した。**基本分析の再実施ではない。**

- 決定した動作：**144/208**。残り**64動作**は未判定。
- 対象の条件：**862行**。うち**857条件を採用**して正式Case IDを付与。残り**5条件を別動作に引継ぎ**、この動作での重複Caseを作成しない。
- 対象の基本分析：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`（Blob `7f53586e720838544abcf24ac553dece51c13449`）。対象144動作はいずれも `analysis_status=analyzed` であり、既存の `case_policy/test_condition` に採否の根拠がある。
- 正本：[採否CSV](./2026-11-07_pr199-formal-case-adoption-decisions.csv)。`behavior_id + condition_ref`で一意に識別し、`PR199-CASE-<behavior_id>-<condition_ref>`を正式Case IDとする。採用条件ごとの要件参照、Platform、元の分析欄、採否を記録した。
- 旧`docs/reports/2026-11-04_pr219-case-traceability.csv`（953行）と旧`docs/reports/2026-11-04_pr219-behavior-case-acceptance-status.csv`（208行）は当時の履歴として保持する。旧追跡67行との差分があっても、過去の期待結果・Run欄を上書きしない。

## 重複Caseを設けない条件

| 動作 | 条件 | 判定 |
| --- | --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | C5 | Nativeのempty表示・遷移は親操作の動的受入で確認。Web desktop本状態の独立Caseにはしない |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | C6 | 価格・Rank変更の金額不一致は別操作A02-02と共通BRで確認。本状態の独立Caseにはしない |
| `SCREEN-ORDERS-LIST-S-empty` | C6 | Native空表示は補助条件。Web desktop本状態の独立Caseにはしない |
| `SCREEN-SUPPORTING-GUIDE-A02-02` | C5 | Test ControlのReset検証に引継ぎ、Guideの重複Caseにはしない |
| `SCREEN-ORDERS-LIST-A02-02` | C5 | Checkout処理・再試行の独立Caseへ引継ぎ。注文一覧に重複Caseを作らない |

**引継ぎ先の具体的Case IDは未確定**。別動作の採否時に確定し、二重計上・受入漏れの両方を防ぐ。

## 既存テストと動的受入の境界

既存テスト候補は[12動作のCase追跡と既存Assertion](./2026-11-07_pr199-case-trace-reconciliation.md)、[29横断要件の確認結果](./2026-11-07_pr199-crosscutting-requirement-readiness.md)、最終HEADの[Web CI #42376633442](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42376633442)を参照。個々の条件への**既存テスト再利用は採否決定だけで自動確定しない**。同一Case IDの仕様・実Assertion・Role/Seed/Platform・DB前後と実Runを突合して、再利用、必要な追加実行、製品FAIL、環境BLOCKEDを別々に判定する。

現時点では857件すべて `execution_acceptance=未受入`、`independent_review=未実施`。特に商品管理の選択残留・ページ非リセット、stale Cartの誤復帰、停止operatorのForbidden循環、actor権限失効競合を**製品PASSにしない**。製品SUT・正式仕様・Seed/Resetと独立PR #210を変更せず、#210未マージの修正を#199へ採用済みと記録しない。

## 残る正式採否

残り64動作について既存`case_policy`と既存テスト候補を用いて採否・IDを確定する。79要件（29横断要件）、Web/Android/SQLite・rollback、視覚/a11y、独立レビュー・実Runと、本人環境依存の判定は別に維持する。既存44受入条件の「正式採用Caseの対応・最終判定」は**未完了**。

## 条件番号の抽出に関する訂正

`SCREEN-SUPPORTING-PRIVACY-A02-01`の`C4往復`と`SCREEN-SUPPORTING-COMMERCE-A02-01`の`C4状態`は、実際には定義済み。以前の機械抽出で空白を必須としたため見落としたが、現行の`test_condition`に根拠がある。両動作はC1〜C4をそのまま採用した。仕様・分析台帳を変更していない。
