# Plan

## Objective

- PR #146のレビュー指摘を、Issue #134の正本Planと現行実装を維持したまま最小修正する。
- baseline state、TOML構造contract、large-input process contract、Windows実Codex runtime確認、PR経路CIを不足なく固定する。

## Scope

- In:
  - `main`の安全な通常mergeと、競合時の現行内容保持。
  - `.codex/hooks/text_quality_gate.mjs`のbaseline unavailable、clean tracked lazy baseline、Stop identity検証。
  - 既存 `smol-toml` の利用可否確認と、`tests/contracts/**`内のTOML構造contract。
  - 既存logging／PreToolUse Hookの大入力process contract、Windows実Codex runtime canary検証。
  - focused validation、PR本文更新、commit、通常push、PR #146の最新head CI確認。
- Out:
  - SessionStart compact再注入（Issue #135がOPENのため）。
  - production文章品質ruleの独自追加（具体値未確定のため空ruleを維持）。
  - 新しいHook／session／diff／Markdown parser／Git履歴framework、PRのmerge/close、force push、branch削除。

## Assumptions

- Issue #135が作業開始時点でOPENなら、PR本文は `Closes #134` を外し、#134との関連を `Refs #134` 等で残す。
- `origin/main`との差分は、clean確認後に `git merge origin/main` で取り込む。
- 既存lockfileにある `smol-toml` が安全にimportできる場合は、test用の新dependencyを追加しない。直接利用できない場合は、依存関係とNode対応を確認して最小のtest-only選択を行う。
- Codex CLIは確認済みの `0.147.0` を対象runtimeとする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。レビュー指摘、対象branch、既存PR、Issue/Plan、完了条件が明示されている。
- 仮定してよい細部: 最新PR headのCI起動方法は、PRイベントを優先し、必要な場合だけ認証済みworkflow dispatchを補助的に使う。
- 未回答の重要質問: なし。runtime検証が環境要因で不可能な場合は未確認として明示する。

## Hypotheses

- H1: `createBaseline()`／state lifecycleの不足はHook本体と同一contract fixtureの拡張で修正できる。
- H2: `smol-toml` を既存dependencyとして利用でき、文字列検索依存を構造parseへ置換できる。
- H3: Windows実Codex runtimeでconfigured `command_windows`を起動できる。失敗時はquoting/root/stdio/exitを切り分け、launcher unit testをruntime確認の代替にしない。
- H4: `main` merge後もADR番号重複なく、既存変更とIssue #134変更を共存させられる。

## Research Plan

- Round 1 Query: 現在branch/remote/PR/Issue/#135/main、Plan、config、Hook、scanner、contract、dependency、ADR/Harnessを確認する。
- Round 2 Query: merge後の差分と競合、state/schemaの実経路、TOML parser import、Codex runtimeの実測、PR pull_request CIを確認する。
- Exit Criteria:
  - H1〜H4ごとに支持または反証の証跡がある。
  - baseline不可、clean tracked、Stop identity、large input、runtime、PR CIの残件がないか、未確認理由と次アクションが記録されている。

## Approach

- `PLAN -> 調査 -> bounded repair iteration -> focused validation -> full relevant validation -> Run Artifact確定 -> merge/commit/push -> PR/CI確認` の順で進める。
- 各repair iterationは対象fileを事前宣言し、同一failureの無目的な再試行をしない。
- Gitは `execFile`／`execFileSync` と引数配列の既存patternを維持する。production rule、identity順序、fail-open/fail-close、`stop_hook_active`契約を弱めない。
- PR本文と完了報告では、#135未完了とproduction rule未設定を完了扱いにしない。

## Definition of Done

- `origin/main`を通常mergeし、競合があれば内容を保持して解消する。
- TOML構造contract、baseline unavailable lifecycle、clean tracked lazy baseline、start HEAD固定、pure move、Stop identity、large-input contractを実装・テストする。
- Windows実Codex runtimeは実測結果を明記し、成功時だけ確認済みと報告する。
- focused／lint／typecheck／verify／Git差分検証を実行し、環境依存の未実行はPASS扱いにしない。
- 意図した差分だけをcommit・通常pushし、local/remote/PR headを一致させる。
- PR #146をOPENのまま日本語本文へ更新し、最新headのWeb CI／Mobile App CI（PR経路）とWindows focused Hook contractを確認する。

## Risks / Unknowns

- `main`との競合でPROJECT_CONTEXT／package script／ADR参照が欠落するリスク。merge前後の差分と全文を確認する。
- stateへ保存する情報がraw本文・path・secretを漏らすリスク。既存schema検証、sanitizer、raw出力assertionを維持する。
- Codex runtimeのHook trust、プロセス終了、Windows quoting、Git Bash親shellの文字コードが検証を妨げる可能性。成功経路と失敗経路を分離して記録する。
- ローカルNodeとCI Nodeの差で全contractが起動しない可能性。代替検証を原因付きで記録し、CI結果を最新headに紐付ける。

## Thinking Log

- 2026-09-13: 作業tree clean、branch/upstream一致、PR #146 OPEN、Issue #135 OPEN、Codex CLI `0.147.0`を確認した。`origin/main`はbranchより2 commit先行しているため、source変更前に通常mergeする。
- 2026-09-13: `pnpm-lock.yaml`には `smol-toml@1.7.0` が存在する。直接dependencyかtransitiveかをpackage manifestとimport可否で確認し、不要なdependency追加を避ける。
- 2026-09-13: OpenAI公式Hooks docsではinline TOML、event配列、matcher省略、`command_windows` alias、timeout秒、repo-local hookのGit root解決が確認できた。今回の構造contractとruntime確認の根拠にする。
