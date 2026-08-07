# Tasks

## Now

- [x] 1. 品質ゲート修復のPLAN、scope、仮説、完了条件を確定する
- [x] 2. Baseline品質ゲートと関連チェックを実行し、全エラーを収集する
- [x] 3. read-only調査結果を回収し、エラーをmust_fix／should_fix／defer／needs_humanへ分類する
- [x] 4. 影響可能性がある、または安全に修正可能なエラーを最小修正する
- [x] 5. 修正後の品質ゲート、対象テスト、必要なNative検証を再実行する
- [x] 6. 範囲外エラーも影響調査・修正する運用ルールをAGENTS／Repair Loop文書へ反映する
- [x] 7. Run Artifact、evaluation、差分、Sanitizationを確認して完了判定する

## Discovered

- D1. 既知の全体typecheck implicit-any 6件をBaselineで再確認し、今回変更との因果を判定する
- D2. `pnpm run verify`がtypecheck以外で停止した場合、後続チェックを個別に実行して残差を収集する

## Blocked

- なし
