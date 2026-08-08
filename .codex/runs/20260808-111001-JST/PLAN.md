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

## PR #11 Repair Iteration 1 (2026-08-08)

### Goal

PR #11の既存CI topologyを維持し、Native変更検出の不足、Android Build Evidenceの成功時重複保存、RuntimeのJava暗黙依存、関連Contract/docs/Current Runの不整合を修正する。

### Input findings / triage

- `must_fix`: `detect`のEAS／Native検証入力Path不足、成功時APK二重保存、成功時Gradle全文保存、Runtime Java 17未固定、該当Contractの逆契約。
- `should_fix`: `ci-workflow`のテスト名、Runtime `jobBlock`境界、計画書の`fail-closin` typo、Current Runの履歴・Progress整合。
- `defer`: Branch Protection Required Check表示名の確認、Remote CI再実行（Git操作禁止）。
- `reject`: CI topology再設計、Actions更新、Production code／Maestro flowの変更。

### Allowed files

- `.github/workflows/native-ci.yml`
- `tests/contracts/native-ci-workflow.test.ts`
- `tests/contracts/ci-workflow.test.ts`
- `docs/plans/2026-08-08_114733_ci-parallel-workflow-topology.md`
- `docs/plans/2026-08-08_125146_pr11-repair.md`
- `.codex/runs/20260808-111001-JST/PLAN.md`
- `.codex/runs/20260808-111001-JST/TASKS.md`
- `.codex/runs/20260808-111001-JST/REPORT.md`
- `.codex/runs/20260808-111001-JST/run.json`

Run ArtifactはRepository規約によりscope比較から除外するが、指定Current Runのみ更新する。Iteration 1では既存Workflow拡張として`standard`を選び、`evaluation.json`を追加しないと判断した。この判断は再レビューで撤回し、Iteration 2ではCI Job topology／Artifact／変更検出というStrict対象の契約変更として`strict`へ正規化する。

### Hypotheses

- H1: EAS設定、検証スクリプト、Android project、Native asset実体をdetectへ追加すれば、Native Jobが必要な変更のskipを防げる。
- H2: Build job statusがsuccessのときだけAPK本体／Gradle全文を省略し、failure時だけ保持すれば、正式APK Artifactを維持しつつEvidence転送量を減らせる。
- H3: RuntimeへTemurin Java 17を追加すれば、MaestroのJava Runtimeがhost runner既定値から独立する。

### Validation and stop condition

Contract、lint、typecheck、format、YAML parse、可能ならverifyを実行する。同一failureの盲目的再試行はせず、同一failure categoryが2回、同一工程が3回、scope violation、unsafe action、requirement ambiguityのいずれかでrepair loopを停止する。最終停止判断は`stop_success`または根拠付きの`stop_needs_human`とする。

## PR #11 Repair Iteration 2（2026-08-08）— Strict正規化

### Goal

Native変更検出をAndroidの全source set境界（`android/app/src/**`）へ修正し、Current Run `20260808-111001-JST`をRepositoryのStrict Workflow Level契約に合わせて正規化する。

### 再レビューによる判断訂正

- Iteration 1では「既存Workflowの拡張」であることを理由に`standard`と判断した。この判断を履歴として保持したまま撤回する。
- CI Job topology、Job間Artifact、Native変更検出条件、APK Artifact、Runtime／Verify境界は、AGENTS.mdのStrict対象（external integration／public contract）に該当する。
- Strictの正本として`AGENTS.md`、`.codex/templates/evaluation.schema.json`、既存Strict Run、`docs/reference/run-artifacts.md`、`docs/reference/failure-taxonomy.md`を確認した。

### Iteration 2 scope

- `.github/workflows/native-ci.yml`
- `tests/contracts/native-ci-workflow.test.ts`
- `.codex/runs/20260808-111001-JST/` の指定Current Run Artifact
- `docs/plans/2026-08-08_125146_pr11-repair.md`

Run Artifactはsource scope比較から除外する既存規約に従う。scope専用Artifactの既存templateはないため、evaluation schemaの`dimensions.scope_control`をscope metadataとして保存し、推測の`run.json` fieldは追加しない。

### Change strategy

1. detect Pathを`android/app/src/main/**`から`android/app/src/**`へ変更し、Contractで広いsource-set境界とmain限定でないことを保証する。
2. `run.json`を`strict`へ更新し、schemaに従う`evaluation.json`を作成する。
3. `evaluation.json`で実際の変更範囲、Strict契約、成功／失敗／未実行検証、Remote CI未確認を記録する。
4. 最初の品質ゲート失敗はtaxonomyに`format`カテゴリがないため、Windows環境に起因する既存format差分として`flaky_or_env_issue`へ分類し、`run.json`とevaluationで一致させる。
5. REPORTは既存履歴を削除・書換えず、Strict訂正をappend-onlyで追記する。

### Non-goals

- Maestro Flow、Action SHA pinning、Build Tools env化、Production code、他の過去Run、Git操作は変更しない。

### Definition of Done

- `android/app/src/**`とContractが一致する。
- Strict必須のPLAN／TASKS／REPORT／run.json／evaluationとscope metadataが揃い、manifest summaryが実体と一致する。
- validation failureとprimary failure categoryがtaxonomy・evaluation・manifestで説明可能な形に揃う。
- 指定検証、対象Prettier、YAML parse、Sanitizerの結果を事実どおり記録する。
