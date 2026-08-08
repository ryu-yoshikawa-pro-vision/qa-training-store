# Plan

## Objective

- Phase 1 CI と Native CI のトポロジを最適化し、Wall-clock 短縮・失敗原因特定容易化・失敗Job再実行コスト削減を実現する。
- 既存の品質ゲート・E2E・Native契約・Deployment境界を維持する。
- Git操作（branch作成/checkout/commit/push/PR等）は行わない。

## Scope

- In:
  - `.github/workflows/ci.yml`: `quality` を `style-quality` / `code-quality` へ2分割、`verify` の依存更新。
  - `.github/workflows/native-ci.yml`: `static`→`native-static` 化とskip条件追加、`production-bundle-guard` の API 独立化、`android` を `android-build` / `android-runtime` へ分割、APK Artifact受け渡し、Maestro Runtime/Smoke 5 FlowのStep分離、Final Verify更新。
  - `tests/contracts/ci-workflow.test.ts`: quality分割に合わせて契約更新。
  - `tests/contracts/native-ci-workflow.test.ts`: 新Native CI構造に合わせて契約更新（native-static / guard / build / runtime / verify / Maestro）。
  - Run Artifact（PLAN / TASKS / REPORT）、必要に応じて `docs/PROJECT_CONTEXT.md`、`docs/plans/` の計画書。
- Out:
  - App code（`src/**`、`app/**`）、`maestro/*.yaml`、`package.json`、`pnpm-lock.yaml`、`playwright.config.*`。
  - それらの変更は禁止される。
  - Actions version更新、SHA pinning、Playwright browser cache、自己hosted runner、over-splitting (job増やし)等は対象外。
  - Deployment（`deploy-preview` / `validate` / `deploy-production`）の責務・Secrets・Artifact契約の変更。
  - `native-ios-ci.yml` は今回変更しない。

## Assumptions

- 作業ツリーは `c570a7e`（origin/main と同内容）で、最新main相当を検証できる。
- `validate:native-production-bundle.ts` は `expo export` を自己完結実行し、Native Static Jobの生成物（`src/generated/native-product-assets.ts`）や副作用に依存しない（本Planの調査で確認済み）。
- `actions/upload-artifact@v4` の `overwrite` parameterがサポート済み（READMEで確認する）。
- `upload-artifact` / `download-artifact` はv4（既存と同バージョン）。
- Native Static は Native固有検査のみを残し、Phase 1 required gate と完全同義の汎用検査（format:check / lint / typecheck / test:repository / test:contracts）は削除する。
  - Phase 1側の正本: `style-quality`(format:check / lint:markdown)、`code-quality`(lint / typecheck / validate:image-manifest / security:check)、`vitest` matrix（unit / integration / repository / component / contracts）。

## Questions / Ambiguity

- 必ず質問する不透明点: なし（指示書が詳細に確定している）。
- 仮定してよい細部:
  - Step名は既存命名（`Run Maestro ... flow`）へ合わせる。
  - APK Artifact名 `native-android-apk-${{ github.run_id }}`、overwrite: true、retention-days: 3。
  - 分割後のTimeout: android-build=40、android-runtime=50（旧50分の配分）。
- 未回答の重要質問: なし

## Hypotheses

- H1: `android` 単一Jobの最長クリティカルパスは、Native Static + Production Bundle Guard + Gradle Build が直列的に走っている旧構成で長い。これを検出・分割・並列化し、Runtimeは前提Jobの成功後に起動する設計で、Native変更ありPRのクリティカルパスが短縮される。
- H2: Maestro FlowをStep分割しても、同Job内ならBot起動・APK install・Maestro setupの重複は発生せず、失敗原因の特定だけが改善する。
- H3: 変更なしPRではNative固有Jobが全部skipし、verifyのみがsuccessになるため、Native CI全体の時間とリソースが削減される。

## Research Plan

- Round 1 Query: 既存Workflow・Contract Test構造の読込（完了）。
- Round 2 Query: `actions/upload-artifact@v4` の `overwrite` input を公式READMEで確認。
- Exit Criteria:
  - 各仮説に対し、Workflow構造上の根拠がある。
  - ローカル検証（format/lint/markdown/typecheck/contract test focused + 全体）でexact.
  - Remote CI実測は人間がpush後に確認（本Agentは実施しない）。

## Approach

1. Baseline記録（現在の構造・説明）：PLAN/REPORTへ。
2. `ci.yml`: style-quality / code-quality へ分割、verify needs更新、deployment不改。
3. `ci-workflow.test.ts` 更新（style/code/verify両方required、deployment契約維持）。
4. `native-ci.yml`: 上記Scopeの通りリ ライト。
5. `native-ci-workflow.test.ts` 更新（構造契約の書き下ろし）。
6. ローカル検証（focusedから全体）。
7. `docs/plans/` へ計画書保存、`PROJECT_CONTEXT.md` 更新（必要最小限）。
8. Run Artifact 完成 + Sanitizer Write/Check。

## Definition of Done

- ci.yml/native-ci.yml の構造が指示書の完成形境界へ揃っている。
- Contract Test 2ファイルが更新され、`pnpm run test:contracts` がexact成功。
- ローカル検証（lint:markdown / format:check / lint / typecheck / test:contracts、可能なら verify）がパス。
- Deployment境界・Native fail-closed契約（対処規則）が維持されていること。
- Remote CI実測は「NOT RUN」と記録し、pushしないこと。

## Risks / Unknowns

- Required Check表示名の変更有無: `native-ci / verify` は維持。`quality` jobがName「quality」だったのに対し、`style-quality` / `code-quality` になるため、Branch Protection側の確認項目を最終報告に明記する。
- `overwrite: true` が利用するactionバージョンに対応していない場合: 別リネーム方式を検討。
- Native Staticをskipにする場合のContract Test誤り: `verify` のfail-closed契約テストでスキップ許可を明示。
- Timeout設定: 初回から過度に短くしない。