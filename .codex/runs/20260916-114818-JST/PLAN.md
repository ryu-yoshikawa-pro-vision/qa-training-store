# Plan（計画）

## Objective（目的）

- configured `Stop` launcherがHook failure時にactive Stopをallowする場合、current repository／sessionのbaseline stateだけをbest-effort cleanupする。

## Scope（対象範囲）

- In: `.codex/config.toml`のUnix／Windows Stop quality fallback、既存contract test、今回の計画／Run Artifact、PR本文。
- Out: `.codex/hooks/text_quality_gate.mjs`、SessionStart、UserPromptSubmit／PostToolUse、state schema／baselineロジック、既存Plan／ADR／referenceの正しい記述、Expo／Native／workflow。

## Assumptions（仮定）

- `git rev-parse --show-toplevel`でrootが確定できる場合だけ、そのroot配下の`.artifacts/codex-text-quality`を対象にする。
- `stop_hook_active`はJSON boolean `true`だけをactiveと判定する。
- `session_id`がnon-empty stringの場合だけSHA-256を計算し、suffix `-$hash.json`に一致する通常fileを個別に削除する。
- root不明／session_id不正／cleanup failureでもactive Stopは固定structured diagnosticでfail-openする。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。削除対象とactive判定は依頼・既存Planで確定している。
- 仮定してよい細部: Node／Python／PowerShellの標準APIで非再帰・best-effort個別削除を行う。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: launcher failure fallbackでcurrent session hash suffixだけを削除すれば、active allow後の古いbaseline再利用を防げる。
- H2: 既存の厳密なactive判定と固定diagnosticを維持すれば、inactive／invalidのblockと漏えい防止を壊さない。

## Research Plan（調査計画）

- Round 1 Query: 現行config、Hook本体のstate filename、既存process-boundary tests、PR本文を確認する。
- Round 2 Query: Unix／Windows実configured commandをfixtureで実行し、failure／state lifecycle／再baselineを検証する。
- Exit Criteria:
  - H1／H2を実装差分とprocess-boundary evidenceで確認する。
  - focused／標準検証と最新PR CIで残差がないことを確認する。

## Approach（進め方）

- 実装前に既存契約と安全な変更面を確認する。
- Unix fallbackへNode／Pythonの個別state cleanupを追加する。
- 可読PowerShellを修正してUTF-16LE EncodedCommandを再生成し、Windowsも同じ契約にする。
- 既存test helperを再利用してfailure前baseline、false／invalid保持、true削除、他session保持、次turn再baseline、漏えい防止を追加する。
- focused／標準検証、sanitize、scope確認後にcommit／通常pushし、最新PR headのCIと本文を確認する。

## Definition of Done（完了条件）

- false／missing／malformed／wrong typeはstructured blockかつbaseline保持。
- boolean trueはexit 0＋固定structured diagnostic、current sessionだけbest-effort削除。
- cleanup failure／root不明でもactive Stopを再blockしない。
- Unix／Windows contract、再baseline、他session非削除、漏えい防止、既存正常系がPASS。
- focused contract、`verify.ps1 -HookContracts`、標準verify、lint、diff check、Web／Mobile CIがPASS。
- PR本文、local／remote／PR head、Run Artifactが最新事実と一致する。

## Risks / Unknowns（リスク・未知点）

- shell／PowerShellの環境変数・path境界とEncodedCommand再生成を誤ると、root誤認またはlauncher不実行になる。decoded sourceと実process testで確認する。
- state directory全体・他session・symlink／directoryを誤って削除しないよう、suffix一致と通常file判定、非再帰個別削除に限定する。
- 実Codex interactive failure runtimeはmanaged executableがなければ未確認として報告する。

## Thinking Log（判断記録）

- 2026-09-16 JST: findingを`must_fix`として分類し、変更をconfigured Stop fallbackと既存contract testへ限定した。Hook本体の正常cleanupは変更しない。
