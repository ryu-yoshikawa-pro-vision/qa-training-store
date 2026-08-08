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
- [x] 12. PR #11修正指示のtriage、allowed_files、実装前計画書（`docs/plans/2026-08-08_125146_pr11-repair.md`）を確定する
- [x] 13. Native detect Pathを補完し、重要入力PathのContractを追加する
- [x] 14. Android Build成功時EvidenceからAPK本体・不要なGradle全文を除外し、失敗時診断を維持するContractを追加する
- [x] 15. `android-runtime`へTemurin Java 17を追加し、Runtime Java契約とJob block境界を修正する
- [x] 16. ci-workflow Contract Test名と既存計画書の`fail-closin` typoを修正する
- [x] 17. Current Runの有効なYAML検証コマンド、Sanitizer証跡、REPORT訂正、workflow level判断を更新する
- [x] 18. Current RunのTASKS分類／最終Progressとrun.jsonのvalidation・changed_filesを整合させる
- [x] 19. Contract、lint、typecheck、format、YAML parse、可能ならverifyを実行し結果を記録する
- [x] 20. Current RunへSanitizer Write/Checkを最終実行し、証跡を一致させて修正を完了する
- [x] 21. 再レビューでStrict対象と確定した根拠、Iteration 2のscope、schemaをPLANへ記録する
- [x] 22. Native detect Pathを`android/app/src/**`へ変更し、Contractでmain限定でないことを保証する
- [x] 23. Strict用`evaluation.json`を既存schemaで作成する
- [x] 24. `evaluation.json`へscope metadata、Strict契約、成功／失敗／未実行検証、Remote CI未実行を記録する
- [x] 25. `run.json`をStrictへ更新し、evaluation／primary failure／validation summaryを整合させる
- [x] 26. REPORTへStrict判断の訂正と今回の追加修正をappend-onlyで追記する
- [x] 27. PLAN／TASKSの現状矛盾を解消し、Progressを更新する
- [x] 28. 必須Contract、lint、typecheck、Prettier、YAML parse、format、verifyを再検証する
- [x] 29. Current Run ArtifactへSanitizer Write/Checkを最終実行する

## Discovered

- [x] 11. 発見: `tests/contracts/native-test-control-maestro.test.ts` の環境起因失敗（CRLF）を本PRで修正（ユーザー指示により実施）

## Blocked

- （ブロック時にのみ記載）
