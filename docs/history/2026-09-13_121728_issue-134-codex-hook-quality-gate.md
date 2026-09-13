# Issue #134 Codex Hook quality gate 履歴

## 2026-09-13

- `scripts/lint-text-quality.mjs` と `scripts/check-text-quality-changes.mjs` による決定論的Markdown品質scanner／Repository-level差分gateを追加した。
- `.codex/hooks/text_quality_gate.mjs`を既存logging Hookと分離して`UserPromptSubmit`／`PostToolUse`／`Stop`へ接続し、raw本文を保存しないbaseline、fingerprint multiset、Git rename mapping／exact SHA-256 fallback、fail-open／fail-close契約を固定した。
- production文章品質ruleの具体値は確認できなかったため、`.codex/text-quality-rules.json`は`not-configured`の空ruleとした。Issue #135が未完了のためcompact後の`SessionStart`再注入は追加していない。
- `lint:text`、Bash／PowerShellのHook contract opt-in、Ubuntu Style Quality、Windows focused Hook CI、Harness reference、ADRを接続した。
