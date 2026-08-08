# CI並列Workflow最適化計画（Phase 1 CI / Native CI）

## 0. 依頼概要

- 依頼内容: Phase 1 CI と Native CI のトポロジを最適化し、Wall-clock短縮・失敗原因特定容易化・失敗Job再実行コスト削減を実現する。
- 背景: 単一 `quality` job や直列依存の Native CI により、独立した検証が直列化され、失敗Jobの再実行コストが大きい。
- 期待成果: 変更範囲を限定したまま（`ci.yml` / `native-ci.yml` / Contract Test のみ）、Job分割・並列化・APK Artifact受け渡し・skip最適化により上記を達成する。

## 1. ゴール / 完了条件

- ゴール:
  - `.github/workflows/ci.yml`: `quality` を `style-quality`（format:check / lint:markdown）と `code-quality`（lint / typecheck / validate:image-manifest / security:check）へ2分割し、`verify` の needs・result 判定を更新する。Deployment 境界は不変。
  - `.github/workflows/native-ci.yml`: `detect` → `native-static` / `production-bundle-guard` / `android-build`（APK build）→ `android-runtime`（Emulator + Maestro）→ final `verify` のトポロジへ再構成する。
    - guard を `needs: [detect]` にして static と並列化（Static 生成物に依存しないことを検証済み）。
    - APK は Artifact（`native-android-apk-${{ github.run_id }}`、overwrite: true、retention-days: 3）で build → runtime へ受け渡し。
    - Maestro Runtime/Smoke 5 Flow を独立 Step へ分割し、失敗Flowの特定を容易にする。
    - `verify` 表示名 `native-ci / verify` は不変、Native 未変更時は skip 許可（fail-closed 維持）。
  - Contract Test 2ファイルを新構造へ更新し、全検証がパスする。
- 完了条件（DoD）:
  - `pnpm run test:contracts` が成功（既存の環境起因CRLF失敗は今回のContract Test修正で解消する）。
  - `format:check`（変更4ファイル）／lint / typecheck / lint:markdown がパス。
  - Deployment 境界・fail-closed 契約が維持されている。
  - Git操作（checkout/commit/push/PR）は行わない。Remote CI実測は「NOT RUN」と記録する。

## 2. 現状理解と前提

- Current understanding:
  - 作業ツリーは `c570a7e`（== origin/main）。`ci/optimize-parallel-workflows` branch 上で作業。
  - `native-ci.yml` は `static` → `android` の直列構造。`android` job が Gradle Build・Emulator・Maestro を単一Jobで実行する。
  - `validate:native-production-bundle.ts` は `expo export` を自己完結実行し、Native Static の生成物に依存しない（調査で確認済み）。
  - `actions/upload-artifact@v4` は `overwrite: true` input をサポートする（公式READMEで確認済み）。
  - `tests/contracts/native-test-control-maestro.test.ts` は LF 前提の assert であり、CRLF checkout のローカル環境で失敗する（本PRで解消する）。
- Assumptions:
  - Native Static は Native固有検査のみを残し、Phase 1 と重複する汎用検査（format/lint/typecheck/test:repository/test:contracts）は削除する。Phase 1側を正本とする。
  - iOS（`native-ios-ci.yml`）は今回変更対象外。
  - Runner起動・checkout・installの重複を避けるため、Job分割は実行時間・原因特定・再実行コストに明確な利得がある境界のみ。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし（指示書が詳細に確定している）。
- 仮定してよい細部: Step名は既存命名へ合わせる。APK Artifact名・overwrite・retention-days は指示どおり。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - `.github/workflows/ci.yml`（quality 分割と verify 依存更新）
  - `.github/workflows/native-ci.yml`（トポロジ再構成）
  - `tests/contracts/ci-workflow.test.ts`
  - `tests/contracts/native-ci-workflow.test.ts`
  - `tests/contracts/native-test-control-maestro.test.ts`（CRLF 耐性修正のみ）
- Files to inspect:
  - `docs/PROJECT_CONTEXT.md`（現状記録）、`package.json`（scripts）

## 5. 変更方針

- Change strategy:
  1. Baseline 記録（既存構造・Contract Test・scripts）。
  2. `ci.yml` を `style-quality` / `code-quality` へ分割し、`verify` の needs/result 判定を更新。
  3. `native-ci.yml` を再構成（上記 Goal の通り）。
  4. 2つの Contract Test ファイルを新構造へ更新。
  5. 既存契約テストの CRLF 耐正（必要箇所のみ）を適用。
  6. focused → 全体の検証（contract / prettier / eslint / typecheck / lint:markdown / YAML parse）。
  7. `docs/plans/` へ計画書、`docs/PROJECT_CONTEXT.md` 更新、Run Artifact 確定 + Sanitizer。
- 実行タスク: 上記の通り（Run TASKS.md 参照）。

## 6. 検証方法

- Validation plan:
  - `pnpm exec vitest run tests/contracts/ci-workflow.test.ts tests/contracts/native-ci-workflow.test.ts --no-file-parallelism --maxWorkers=1`
  - `pnpm run test:contracts`（環境起因CRLF 1件が消えることを確認）
  - `npx prettier --check`（変更4ファイル）
  - `pnpm exec eslint`（変更契約テスト）
  - `pnpm run typecheck:native-tests`
  - `pnpm run lint:markdown`、YAML parse（`yaml` で jobs 列挙）
  - `scripts/sanitize-codex-artifacts.ps1 -Path <run> -Write -Check`
- 成功判定: フォーカス済みテストと検証ゲートが pass すること。`pnpm run verify` はローカルCRLF環境起因でフル実行不可のため、実行可能な項目のみで成功判定する。

## 7. リスクと未解決論点

- Risks:
  - Branch Protection の Required Check 表示名変更（Job ID `quality` → `style-quality` / `code-quality`）。最終報告に明記する。
  - `overwrite: true` 非対応 action バージョンへの回帰時はリネーム方式へ切替。
  - Native 未変更PRの skip 契約が誤ると `native-ci / verify` が fail-closed から外れる。Contract Test で fail-closed を固定した。
- Open questions: 実施後に残る問題は REPORT へ記録する。

## 8. 成果物

- 変更ファイル: `ci.yml` / `native-ci.yml` / `tests/contracts/ci-workflow.test.ts` / `tests/contracts/native-ci-workflow.test.ts` / `tests/contracts/native-test-control-maestro.test.ts`（CRLF耐性のみ）
- 付随ドキュメント: 本計画書、`docs/PROJECT_CONTEXT.md` 更新と `docs/history/` への履歴、Current Run Artifact。

## 9. 備考

- Gitのmerge、checkout、commit、push、PR更新は行わない。
- 過剰 Job分割・`continue-on-error`・`fail-fast`変更・Timeout延長・Test skip・Action version変更・SHA pinning・Deployment 再設計は禁止。
- App code、`maestro/*.yaml`（実行制御ファイル）、package.json、`native-ios-ci.yml` は今回の対象外（Contract TestのCRLF耐性修正と、既存Crash 1件の解消を除く）。
