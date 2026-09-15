# PR #146 残存launcher failure修正計画

## 0. 依頼概要

- 依頼内容: PR #146で確認されたStop／SessionStart launcher境界の2件のfail-close不備を修正し、ADR-0026と既存契約テストを現在の実装へ合わせる。
- 背景: 現在のHook本体は`stop_hook_active`とSessionStartのstructured `continue:false`を実装済みだが、configured launcherがNode起動前・起動失敗時にその契約へ到達できていない。
- 期待成果: Unix／Windowsのconfigured launcherが、StopではJSON payloadを解釈した上で再blockを抑止し、SessionStartではlauncher障害をexit 0のstructured `continue:false`へ収束させる。

## 1. ゴール / 完了条件

- ゴール:
  - Stop launcher failure時、`stop_hook_active`がJSON booleanの`true`ならstdoutへblockを出さず、確認できない場合は固定block JSONをexit 0で返す。
  - SessionStart launcher failure時、入力・内部exception・絶対pathを出力せず、exit 0と固定`continue:false`／`stopReason`を返す。
  - `text_quality_gate.mjs`本体、compact正常系、既存scanner／baseline／fingerprint／rename／textlint ruleを変更しない。
- 完了条件（DoD）:
  - [ ] Unix／WindowsのStop configured launcherで、Hook欠落・Hook非0終了についてfalseはblock、trueはallowを確認する。
  - [ ] Unix／WindowsのSessionStart configured launcherで、正常系、Hook欠落、Hook非0終了、root解決不能を確認する。
  - [ ] failure出力のexit code、stdout、stderr、decision／reasonとsecret／prompt／token／path非漏洩を確認する。
  - [ ] `matcher = "^compact$"`、root `AGENTS.md`全文、startup／resume／clear、`additionalContextLimit = 4096`を維持する。
  - [ ] focused contract、Harness入口、標準関連lint／typecheck／contract test、diff checkを実行する。
  - [ ] commit／push後の最新PR headでrequired CIを確認し、PR本文を最新結果へ更新する。

## 2. 現状理解と前提

- Current understanding:
  - 2026-09-15時点でlocal HEAD、`origin/issue-134-codex-hook-quality-gates`、PR #146 headはすべて`1382f41d73c675a352dd4a9fea5598d6eb3c4a8c`で一致し、PR #146とIssue #134はOPENである。
  - `.codex/config.toml`のStop launcherは、root／Node／Hook／Hook exitのいずれかの失敗を固定blockへ落とすが、`stop_hook_active`を見ていない。
  - SessionStart launcherはroot／Node／Hook欠落時に`exit 2`し、Hook非0終了もCodex 0.154.0の停止契約へ変換していない。
  - `.codex/hooks/text_quality_gate.mjs`は、inactive Stopのfailureをblock、active Stopのfailureをallow＋diagnostic＋cleanupする既存契約を持つ。
  - `.codex/hooks/session_start_context.mjs`はcompact正常系とHook内部failureのexit 0 structured `continue:false`を既に持つ。
  - `additionalContextLimit = 4096`とroot `AGENTS.md`の概算token余裕は既存contractで検証されている。
- Assumptions:
  - Unix fallbackのJSON解釈は、追加packageや独自parserを導入せず、既存OSのPython標準`json` parserをfailure境界だけで使う。Windowsは既存PowerShellの`ConvertFrom-Json`を使う。
  - launcher failure時のHook stdout／stderrは一時バッファへ捕捉し、非0終了時には破棄して固定fallbackだけを出す。正常終了時は既存出力をそのまま転送する。
  - failure種別は細分化せず、Stopは既存reason、SessionStartは`Hook launcher failure`という短い固定reasonを使う。
- Non-goals:
  - 新しいHook framework、独自runtime、retry counter、state machine、JSON parser、wrapper fileの追加。
  - Hook本体、scanner、baseline schema、fingerprint、rename判定、textlint 5 rule、PostToolUse、CI比較基準の変更。
  - root `AGENTS.md`のコピー、marker、`additionalContextLimit`の変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザー指示と既存契約で修正・検証条件が明確である。
- 仮定してよい細部: Unix／Windowsとも正常終了時はlauncherがHook stdout／stderrを透過し、failure時は安全な固定fallbackのみを出す。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - configured commandのNode起動境界、stdin再利用、failure fallback判断。
  - 既存process-boundary contract testのfixture／assertion。
  - ADR-0026の#135／SessionStart現在性に関する記述。
- Files to inspect:
  - `.codex/config.toml`
  - `.codex/hooks/session_start_context.mjs`
  - `.codex/hooks/text_quality_gate.mjs`
  - `tests/contracts/codex-hook-contract.test.ts`
  - `tests/contracts/codex-text-quality.test.ts`
  - `docs/adr/0026-codex-text-quality-gate.md`
  - `docs/history/2026-09-14_190256_issue-134-compact-session-start.md`
  - `docs/reference/codex-safety-harness.md`
  - `package.json`
  - `.github/workflows/ci.yml`

## 5. 変更方針

- Change strategy:
  1. launcherはstdinを一度だけ捕捉し、Node実行の成功時だけstdout／stderrを透過する。
  2. Stop failure fallbackはJSON parserでpayloadを解釈し、booleanの`stop_hook_active === true`だけallow、それ以外は固定blockへ倒す。
  3. SessionStart failure fallbackはpayloadを出力へ含めず、固定structured `continue:false`を返す。
  4. 既存configured launcherテストをUnix／Windows両方へ拡張し、非0終了・欠落・root解決不能・出力非漏洩を固定する。
  5. ADR-0026の過去時点の事実を残しつつ、#135完了後にcompact再注入が追加され、root `AGENTS.md`全文が現在の正本であることを追記する。
- 実行タスク:
  - [ ] 1. config／tests／ADRの現行差分と依存状態を再確認する。
  - [ ] 2. Stop／SessionStartのUnix・Windows launcher fallbackを最小差分で修正する。
  - [ ] 3. configured launcher contractを追加・更新する。
  - [ ] 4. ADR-0026を最小修正し、非対象差分とscopeを確認する。
  - [ ] 5. focused／Harness／標準関連検証を実行する。
  - [ ] 6. Run Artifactをsanitizeし、branch安全確認後にcommit／pushする。
  - [ ] 7. 最新PR headのCIとPR本文を確認・更新する。

## 6. 検証方法

- Validation plan:
  - `corepack pnpm install --frozen-lockfile`でlockfile対応依存を確認する。
  - `corepack pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts tests/contracts/codex-text-quality.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000`
  - `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1 -HookContracts`
  - `bash scripts/verify --hook-contracts`（利用可能なbash環境で実行）。
  - `corepack pnpm run format:check`、`lint`、`lint:markdown`、`lint:text`、`typecheck`、`test:contracts`、`git diff --check`。
  - aggregate `corepack pnpm run verify`は実行可能なら実行し、起動前PATH問題があれば個別結果と分離する。
  - commit／push後にlocal HEAD、remote branch、PR head、PR state、Web CI／Mobile App CIと指定required jobを確認する。
- 成功判定:
  - failure launcherはすべてexit 0で、Stop inactiveだけがblock JSON、Stop activeはblock JSONなし、SessionStartは`continue:false` JSONを返す。
  - 正常compact launcherはroot `AGENTS.md`全文を返し、非compact sourceは再注入しない。
  - failure stdout／stderr／stopReasonへpayload本文、secret、token、cwd全文、内部exceptionが漏れない。
  - 既存Hook本体契約と関連品質ゲートがPASSし、最新PR headのrequired CIがSUCCESSになる。

## 7. リスクと未解決論点

- Risks:
  - launcher inline commandのPowerShell／cmd quoting、stdin encoding、空白・日本語path境界を壊す可能性があるため、configured child processで検証する。
  - UnixでJSON parser commandが無い環境ではactive=trueを確認できないため、fail-close blockへ倒れる。CI／対象環境の標準Python有無を確認し、追加packageは導入しない。
  - Hook processが非0終了した際のstderrに内部pathが含まれる可能性があるため、failure時は捕捉出力を破棄する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - `.codex/config.toml`
  - `tests/contracts/codex-hook-contract.test.ts`
  - `tests/contracts/codex-text-quality.test.ts`
  - `docs/adr/0026-codex-text-quality-gate.md`
  - 今回のRun Artifact（`.codex/runs/<run_id>/`）
- 付随ドキュメント:
  - PR #146本文の最新修正内容・検証結果。

## 9. 備考

- 対象branchは`issue-134-codex-hook-quality-gates`を維持し、新規PRは作成しない。
- merge、Issue／PR close、force push、branch削除、tracked fileの削除・renameは行わない。
- `docs/plans/2026-09-12_220014_codex-hook-quality-gates.md`は正本として読み取り、過去planを上書きしない。
