# Plan

## Objective

- 調査REPORTで特定したworktree／runtime差によるLogging Hook launcherの起動失敗をfail-soft化し、loggerが利用可能な場合の既存JSONL記録を維持する。

## Scope

- In:
  - `.codex/config.toml`の5つのLogging Hook（`UserPromptSubmit`、`PostToolUse`、`SubagentStart`、`SubagentStop`、`Stop`）のUnix／Windows launcher contract。
  - 既存`tests/contracts/codex-hook-contract.test.ts`へのlauncher正常系・logger不存在系・設定／Safety Hook不変条件のcontract追加。
  - 必要最小限の`verify` contract更新。
- Out:
  - `.codex/hooks/log_event.mjs`内部、Safety `PreToolUse` Hook、`run.json`、collector、`codex-safe`、manifest schema、Hook／Run correlation。
  - loggerの自動配布、Node installer、runtime abstraction、worktree registry、global config、daemon、database、Product code、ECサイト、カリキュラム。

## Assumptions

- 現在の`origin/main`を起点に専用branchで変更し、前PR用branchの未統合commitは取り込まない。
- `git rev-parse --show-toplevel`で得たrootを引き続きlogger解決の基準とする。
- 起動前条件を満たさない場合はLogging Hookをno-opでexit 0とし、logger起動後の失敗も通常操作へ伝播させない。
- loggerが利用可能な正常系では、現在のstdout／stderr／JSONLの外部contractを維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザー指示と調査REPORTで目的・非目標・完了条件が確定している。
- 仮定してよい細部: 既存configのinline commandを最小限の条件分岐へ変更し、追加launcher frameworkは作らない。
- 未回答の重要質問: なし。

## Hypotheses

- H1: root解決後のlogger実体不在をlauncherがexit 0のno-opとして扱えば、別worktreeでの`MODULE_NOT_FOUND`伝播を防げる。
- H2: root解決失敗・Node不存在も同じlauncher条件でno-opにすれば、Unix／WindowsのLogging Hook全体で通常操作への失敗伝播を防げる。

## Research Plan

- Round 1 Query: 調査REPORT、現行config、logger、contract tests、verify、最近のHook変更履歴を確認する。
- Round 2 Query: 利用可能なWindows／Unix commandで、正常系・logger不存在系・root解決失敗系のexit／stdout／stderr／JSONL契約を確認する。Node不存在は安全に既存環境で再現できる場合のみ実行する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- 既存launcherのroot解決を維持し、root・Node・logger fileの条件を満たす場合だけloggerを起動する。その他はexit 0で終了する。
- 5つのLogging Hookへ同一の外部契約を適用し、Safety `PreToolUse`のconfigと実装は変更しない。
- contract testで正常記録、logger不存在、設定一貫性、Safety Hook不変条件を固定し、標準verifyとlintを実行する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 5つのLogging HookのUnix／Windows launcherが、root・Node・logger存在時だけ起動し、それ以外でexit 0になる。
- logger正常時の対象event JSONL記録と既存stdout contractが維持される。
- Safety `PreToolUse`、logger内部、manifest／run lifecycle、Product codeに変更がない。
- targeted contract tests、利用可能な標準verify、`pnpm run lint:markdown`、対象lint／format、TOML parse、`git diff --check`がPASSする。利用不能runtimeはSKIP理由を記録する。
- diffをself-reviewし、今回のHook resilience対応だけをcommitして専用branchへpushする。PRは作成しない。

## Risks / Unknowns

- launcher条件式を複雑化するとWindows／Unixの契約差が生じるため、既存inline commandの最小変更に限定する。
- root／Node／logger不存在を静かに扱うことで設定ミスが見えにくくなるため、logger利用可能時のstderrとJSONLは維持し、テストでskip条件と正常系を明示する。
- WSL側Node不存在の再現は環境依存のため、fake runtimeやPATH改変を追加しない。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。

- 2026-08-29: 現在の前PR用branchは`origin/main`に未統合だったため、専用branchを`origin/main`から作成した。調査REPORTの主因をそのまま変更目的とし、logger内部ではなくlauncher境界だけを変更する。
