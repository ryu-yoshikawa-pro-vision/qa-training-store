# PR #146 UserPromptSubmit baseline生成失敗の修正計画

## 0. 依頼概要

- 依頼内容: configured `UserPromptSubmit` launcherからHook本体・baseline生成までの契約を固定し、失敗時のsilent no-opを解消する。
- 背景: 実runtimeではlogger記録がある一方、対応するbaselineがなく、inactive `Stop`が`baseline_state`相当のgeneric blockになった。現行launcherは事前失敗とHook非0終了を識別できない。
- 期待成果: Unix／Windowsとも正常時はbaselineを生成し、launcher failure時はexit 0を維持しながら固定bounded diagnosticをstderrへ出す。

## 1. ゴール / 完了条件

- ゴール:
  - configured `UserPromptSubmit`正常系がUnix／WindowsでHook本体を経由して`ready` stateを1件作る。
  - root解決不能、Node／Hook欠落、Hook process non-zero、module load failureをsilent no-opにしない。
  - 既存のHook本体、state schema、Stop／PostToolUse／SessionStart契約を変更しない。
- 完了条件（DoD）:
  - failureはexit 0、baselineなし、固定diagnosticのみをstderrへ出す。
  - prompt、session ID、token、secret、absolute path、Node exception全文をfailure diagnosticへ出さない。
  - short promptと既存logging契約の64 KiB境界相当のlong promptで、同じ正常系を確認する。
  - timeoutは正常処理が10秒を超える根拠がない限り変更しない。
  - focused contract、Harness、標準検証、commit／push後の最新CIを確認する。

## 2. 現状理解と前提

- 現状理解:
  - local／remote／PR headは`fd8212192e40034ea3db6ec2e0477037ecda5140`で一致し、PR #146とIssue #134はOPENである。
  - Unix quality launcherは`|| true`でroot／Hook／process failureを無条件に捨てる。Windows quality launcherは条件不成立時に何も出さず、末尾`2>NUL`でHook stderrを捨て、Hook非0終了時はexit 1になった。
  - Windows fixtureで、Hook欠落／root解決不能は`exit 0・stdout/stderr空・stateなし`、Hook非0／module load failureは`exit 1・stdout/stderr空・stateなし`を再現した。
  - Windows fixtureのshort prompt（12文字）とlong prompt（20,000文字）は現行launcherでもstate生成でき、各約1.3秒だった。timeout 10秒超過は未再現である。
  - 直近runtime failureのlogger記録は存在するが、quality launcherの失敗分類は現行のstderr抑制により確定できない。これはlauncher observabilityの欠陥として修正対象とする。
- 前提:
  - baseline生成責務は`.codex/hooks/text_quality_gate.mjs`へ残す。
  - launcher正常終了時だけHookのstdout／stderrを透過し、非0終了時は子process出力を破棄して固定diagnosticを出す。
- 対象外:
  - `text_quality_gate.mjs`、scanner、baseline schema、fingerprint、rename判定、textlint rule、Stop／PostToolUse／SessionStartの再設計。
  - 新しい依存関係、retry counter、wrapper file、独自baseline生成ロジック。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。修正境界とfailure契約は依頼と既存ADRで確定している。
- 仮定してよい細部: launcher diagnosticは`Codex text quality hook: UserPromptSubmit launcher unavailable`に固定する。
- 未回答の重要質問: 実Codex interactive `/hooks`／`/compact`／Stopは管理対象standalone executableの有無を検証し、利用不能なら未確認として残す。

## 4. 影響範囲

- 影響範囲: `.codex/config.toml`のquality `UserPromptSubmit` command、configured launcher contract、ADRのlauncher契約記述。
- 確認対象ファイル:
  - `.codex/config.toml`
  - `.codex/hooks/text_quality_gate.mjs`
  - `tests/contracts/codex-text-quality.test.ts`
  - `tests/contracts/codex-hook-contract.test.ts`
  - `docs/plans/2026-09-12_220014_codex-hook-quality-gates.md`
  - `docs/adr/0026-codex-text-quality-gate.md`

## 5. 変更方針

- 変更方針:
  1. Unix launcherはroot／Node／Hookの事前条件を固定diagnosticでfail-openし、Hook processのstdout／stderrを一時bufferして非0時の漏えいを防ぐ。
  2. Windows launcherは既存SessionStart launcherと同じstdin／child-process境界を使い、正常時だけ出力を透過し、それ以外を固定diagnosticへ収束する。EncodedCommandは本文から再生成する。
  3. 既存`runConfiguredQualityHook()`を再利用し、正常系を直接configured `UserPromptSubmit`からbaseline生成するテストと、4つのfailure fixtureをUnix／Windowsへ追加する。
  4. 既存の64 KiB logging input境界をlong promptの大入力境界として再利用し、timeoutは変更しない。
  5. ADR-0026へconfigured launcher failureのbounded stderr／exit 0契約を追記する。
- 実行タスク:
  - [ ] 1. 計画・現行経路・failure reproductionをRunへ記録する。
  - [ ] 2. Unix／Windows `UserPromptSubmit` launcherを最小修正する。
  - [ ] 3. configured正常系／failure／short・long prompt contractを追加する。
  - [ ] 4. ADRとRun Artifactを更新・sanitizeする。
  - [ ] 5. focused／標準検証を実行する。
  - [ ] 6. branch安全確認後にcommit／通常pushし、最新CI／PR本文を確認する。

## 6. 検証方法

- 検証計画:
  - `corepack pnpm exec vitest run tests/contracts/codex-text-quality.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000`
  - `corepack pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts tests/contracts/codex-text-quality.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000`
  - `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1 -HookContracts`
  - `bash scripts/verify --hook-contracts`（利用可能な場合）
  - `corepack pnpm run lint:text`、`lint:markdown`、`lint`、`typecheck`、`test:contracts`、`git diff --check`、可能なら`verify`
  - push後にlocal／remote／PR head、Web CI、Mobile App CI、PR／Issue stateを確認する。
  - 実Codex runtimeは利用可能性を確認し、interactive lifecycleが不能ならその理由を報告する。
- 成功判定:
  - configured正常系はexit 0、stdout／stderr空、state 1件、`status=ready`、payload identity一致、session開始HEAD一致。
  - configured failureはexit 0、stateなし、fixed stderr、漏えいなし。
  - 既存Hook contractと標準検証がPASSし、timeout変更なしの判断根拠が残る。

## 7. リスクと未解決論点

- リスク:
  - PowerShell EncodedCommand、cmd wrapper、stdin UTF-8、空白・日本語path、child output bufferingの境界を壊す可能性がある。
  - temporary output file cleanupが失敗してもbaselineやdiagnosticの契約を変えない必要がある。
  - 実runtime failureの元分類は既存ログだけでは確定できず、修正後のdiagnosticで将来切り分け可能にする。
- 未解決の質問: なし。

## 8. 成果物

- 変更ファイル:
  - `.codex/config.toml`
  - `tests/contracts/codex-text-quality.test.ts`
  - `tests/contracts/codex-hook-contract.test.ts`
  - `docs/adr/0026-codex-text-quality-gate.md`
  - 今回PlanとRun Artifact
- 付随ドキュメント: PR #146本文へ実際の修正・検証・runtime結果を反映する。

## 9. 備考

- `UserPromptSubmit`を現在repository rootで手動実行してstateを作らない。fixture経由のcontractだけを使用する。
- merge、force push、mainへの直接push、PR／Issue close、branch削除、tracked fileの削除・renameは行わない。
