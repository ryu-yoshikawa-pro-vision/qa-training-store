# Tasks

## Now

- [x] 1. 必須文書、関連 ADR、直近 Run、Issue #89、package / lock / scripts を確認する。
- [x] 2. FormErrorSummary 全 caller、auth submit / validation / state / reset / navigation、既存 test を mapping する。
- [x] 3. Issue #89 の根本原因仮説、input value 調査方針、変更範囲、検証計画を PLAN と `docs/plans/` に保存する。
- [x] 4. FormErrorSummary に explicit focus trigger を実装し、Login / Signup の `submitCount` を配線する。
- [x] 5. 1件再 submit、同数内容変更、複数件、focus disabled、unrelated rerender、accessibility の component test を追加する。
- [x] 6. Signup / Login の validation 後入力値保持を component test で確認し、再現可否と原因を確定する。
- [x] 7. focused test、web component test、format、lint、typecheck、verify、diff check を実行する。
- [x] 8. 実装後に self-review（diff triage / deep review）を行い、必要なら bounded repair と関連 gate 再実行をする。
- [x] 9. Run Artifact を sanitize し、最終差分と branch safety を確認する。
- [x] 10. 指定 commit message で必要なファイルだけ commit する。
- [x] 11. `fix/89-form-error-summary-focus` を origin へ push する。
- [x] 12. base `main` の日本語 PR を `gh pr create` で作成し、title / base / head / body / state を確認する。
- [x] 13. REPORT を完了 checkpoint として追記し、最終状態をユーザーへ報告する。

## Discovered

- [x] 1. 変更対象外のHook contract testで発生したtimeoutを、baseline／環境依存／今回のdiffの観点で切り分け、正式quality gateの最終結果を確定する。
- [x] 2. PR再レビュー指示に沿って重複component testを整理し、Login実フォームのre-validation時focus保持testを追加する。
- [ ] 3. 最終test結果に合わせてPR #104本文とRun Artifactを更新し、追加差分をcommit／pushする。

## Blocked

- なし。
