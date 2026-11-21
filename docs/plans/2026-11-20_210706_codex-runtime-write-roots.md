# Codex実行時生成物の保存先移行

## 0. 依頼概要

- 依頼内容: sandboxで `.codex/` がread-onlyでもCodexのログ・実行結果を保存できるよう、実行時の書き込み先を既存の運用ルートへ移す。
- 背景: 修正前のLinux checkoutで `codex-safe` と `scripts/verify` が `.codex/logs/` への書き込みを拒否された。
- 期待成果: Run IDなしのログ・成果物はrepository rootの `logs/` または `.artifacts/codex-task/` に保存し、Run IDあり、明示的な出力指定、Hook安全性、Windows契約、旧履歴を保つ。

## 1. ゴール / 完了条件

- ゴール: 現行のCodex runtime writerが `.codex/` 内へ新たに書き込まないようにする。
- 完了条件（DoD）:
  - Run IDなしの `codex-safe`、`codex-task`、Hookの既定先が指定のroot/`.artifacts`配下である。
  - Run ID指定時は引き続き `runs/<run_id>/` を使い、明示パス指定も維持する。
  - cleanupが新しいroot logのみを候補にし、旧`.codex/`内のログ・成果物を移動・削除しない。
  - root `logs/`はGit ignoreされ、stageまたはcommitされたruntime-only logs/task outputsはsanitizerで拒否される。既存credential scanの保護は縮小しない。
  - Hook JSONL形式、masking、PreToolUse拒否、fallback、ログ失敗時の処理契約に変更がない。
  - 関連契約テストとLinux品質ゲートが成功し、変更対象のPowerShell契約をWindows CIで実行する。通常commit/push後の最新PR HEADでWeb CIとMobile App CIが成功する。

## 2. 現状理解と前提

- 現状理解:
  - 開始時のPR/ローカル追跡HEADは `9ab08cd6beb3b670e1b1f4904c72ea35bc5f16d0`、branchは `feat/codex-parent-delegation-20261117`、worktree/indexはclean。
  - 修正前の `bash scripts/codex-safe.sh --preflight-only` はexit 1で `.codex/logs/codex-safe-20261120.jsonl` の `Read-only file system` が最初の失敗。
  - 修正前の `bash scripts/verify` はexit 1（PASS=3 / FAIL=1 / SKIP=1）。最初のFAILはBash wrapper preflightで、同じ`.codex/logs/`書き込み失敗。新ログは作られず、検証によるGit差分もなかった。
  - 現行のwriterはcodex-safe、codex-task、`.codex/hooks/log_event.mjs`。Run IDありの保存先はすでに `runs/<id>/`。
  - `.artifacts/`は既にGit ignore対象。repository rootの`logs/`は未作成。
- 前提:
  - root `logs/`はCodexのRun IDなしログだけに使い、無条件にcleanup対象を広げない。
  - 旧`.codex/logs/`と`.codex/artifacts/`・`.codex/reports/`の既存ファイルはそのまま残し、通常のcleanup候補から外す。
  - `.codex/config.toml`、hooks/rules/agents/templates、および`.codex/runs/**`は保持する。
- 対象外:
  - sandbox/approval/permission、Hook起動設定・イベント、保存形式、Run ID形式、Windows対応の廃止、Native、Node/pnpm依存、GitHub必須gate条件。
  - 旧ファイルの自動移動・削除、ログローテーション、新しいpath abstraction。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。保存先、互換性、安全境界は依頼で指定されている。
- 仮定してよい細部: 旧`.codex/logs/`は既存記録として維持し、今後のcleanupでは削除候補にしない。
- 未回答の重要質問: なし。

## 4. 影響範囲

- 影響範囲: shell/PowerShell wrapperの既定保存先、Hook logger、cleanup、ignore/sanitizer/credential-scan、契約テスト、既存Windows CI内のfocused test範囲、現行運用文書。
- 確認対象ファイル:
  - `scripts/codex-safe.sh`, `scripts/codex-safe.ps1`, `scripts/codex-task.sh`, `scripts/codex-task.ps1`
  - `.codex/hooks/log_event.mjs`, `.gitignore`, `scripts/cleanup-runs.sh`, `scripts/cleanup-runs.ps1`
  - `scripts/verify`, `scripts/verify.ps1`, sanitizer/security checkerと関連契約テスト
  - `docs/reference/run-artifacts.md`, `docs/reference/codex-implementation-harness.md`, `docs/reference/repository-layout.md`, `docs/PROJECT_CONTEXT.md`と現行の関連検証文書

## 5. 変更方針

- 変更方針:
  - writerごとに既定先のみ変更し、explicit output/log pathとRun ID分岐は維持する。Bash execpolicy判定はstdoutのJSONとstderr診断を分離し、fail-closed判定を維持する。
  - Hookのcanonical pathをroot `logs/`に変え、既存`.artifacts/codex-hooks/` fallbackとJSONL/masking/failure behaviorを保つ。
  - cleanupのroot log候補を`logs/`へ変更し、既存preview・確認・明示削除条件を維持する。旧`.codex/`ログは対象外にする。
  - `/logs/` ignoreを追加し、新しいruntime-only logs、task outputs、Hook fallbackのstage/commitを既存のsanitizer経路で拒否する。旧sanitizerとcredential-scan範囲は縮小しない。
  - 対応する契約テスト、既存Windows CIのテスト選択、現行ドキュメントだけを変更し、必須gateは変えない。過去Plan・履歴・ADRは書き換えない。
- 実行タスク:
  - [x] 1. PR HEAD、作業差分、既存Runと修正前の失敗を確認する。
  - [x] 2. writer、cleanup、sanitizer/security、契約テスト、文書をread-only Roleへ分担調査する。
  - [x] 3. 変更範囲と回帰契約を確定し、Parent管理でactive Runへ計画・タスクを追記する。
  - [x] 4. 既定保存先、cleanup、ignore、sanitizer/security scanを限定実装し、既存安全性を保つ。
  - [x] 5. 関連テストとWindows CI選択を更新し、旧履歴保持・明示path・Run ID・force-stage保護を検証する。
  - [x] 6. 指定品質ゲート、staged品質・sanitizer、最終差分を確認する。環境制限による失敗は次のCIで確認する。
  - [x] 7. コミット前にPR／branch状態、staged差分、PR本文に必要な実装・検証事実を最終確認する。通常commit/push後の必須CI確認はimplementation harnessのpost-commit lifecycleで行う。

## 6. 検証方法

- 検証計画:
  - 修正後、同一sandboxで `bash scripts/codex-safe.sh --preflight-only` と `bash scripts/verify` を実行する。
  - execpolicyのstdout JSON／stderr warning分離fixtureと、PowerShellのRun IDなし／ありログ先契約を確認する。
  - focused Vitest: `codex-safe-run-manifest-sync`、`codex-task-native-command`、`codex-hook-contract`、`codex-hook-diagnostics`、`cleanup-runs-contract`、`codex-artifact-sanitization`、およびsecurity checker関連テスト。
  - `pnpm run format:check`、`pnpm run lint:markdown`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run security:check`、`pnpm run test:contracts`、`pnpm run test:repository`。
  - staged後に`pnpm run quality:staged`、`node scripts/sanitize-codex-artifacts.mjs --staged --check`、`git diff --cached --check`。隔離Git fixtureでforce-staged runtime-only outputを拒否し、index/worktreeが不変であることを確認する。
  - Windows PowerShellローカル検証は実行しない。変更したPowerShell既定path・cleanup・sanitizer契約を既存GitHub Windows CIで確認する。
- 成功判定:
  - 新しい`logs/`へのログ生成が成功し、`.codex/logs/`書込みエラーがなく、verifyのexecpolicyとBash wrapper検証が実行・成功する。
  - Run ID、明示出力、Hook fallback、拒否・機密masking、cleanupの確認・削除条件、誤stage生成物の検査が回帰しない。
  - 全必須ローカルゲート・hook・最新HEADのWeb CI/Mobile App CIが成功する。

## 7. リスクと未解決論点

- リスク:
  - ignoreだけではforce-stageを防げないため、staged/committed sanitizerでruntime-only pathを拒否する。credential scanは既存どおり維持する。
  - cleanupの対象を変更すると、既存のroot `.codex/logs`履歴を削除可能にする互換性が変わる。今回の安全側契約では旧ログをcleanup対象から外す。
  - Windows実行テストはローカルでは行わず既存CIで確認する。
- 未解決の質問: なし。

## 8. 成果物

- 変更ファイル: 上記のruntime wrapper、Hook logger、cleanup、ignore、sanitizer/security checker、契約テスト、関連現行ドキュメント。
- 付随ドキュメント: 本計画と既存active Runの追記。過去Plan/履歴/ADRは変更しない。

## 9. 備考

- 既存Run: `runs/20261117-233113-JST/`。`run.json`はmachine-managed経路以外で編集しない。
