# Tasks

## Now

- [x] 1. Baseline確認（既存Workflow・Contract Test・package scripts・ドキュメント）を完了し、PLAN.mdへ記録する
- [x] 2. `actions/upload-artifact@v4` の `overwrite` input サポートを公式READMEで確認する
- [x] 3. `.github/workflows/ci.yml` を `quality`→`style-quality`/`code-quality` へ分割し、`verify` の依存・判定を更新する
- [x] 4. `.github/workflows/native-ci.yml` を完成形境界へ再構成する（native-static / guard並列化 / android-build / android-runtime / APK artifact / Maestro Step分割 / Final Verify）
- [x] 5. `tests/contracts/ci-workflow.test.ts` を新構造へ更新する
- [x] 6. `tests/contracts/native-ci-workflow.test.ts` を新構造へ更新する
- [x] 7. focusedContract Test / lint:markdown / format:check / lint / typecheck で検証する
- [x] 8. 可能なら `pnpm run verify` を実行する（ローカルCRLF環境でformat:checkが通らないため、実行可能なゲートのみで代替し記録）
- [x] 9. `docs/plans/` へ計画書（2026-08-08_114733_ci-parallel-workflow-topology.md）、`docs/PROJECT_CONTEXT.md` と履歴を更新する
- [x] 10. Run Artifactを確定し、`scripts/sanitize-codex-artifacts.ps1` の Write/Check を実行する
- [x] 11. 発見: `tests/contracts/native-test-control-maestro.test.ts` の環境起因失敗（CRLF）を本PRで修正（ユーザー指示により実施）

## Discovered

- 作業中に発見したタスクはここに追記する

## Blocked

- （ブロック時にのみ記載）