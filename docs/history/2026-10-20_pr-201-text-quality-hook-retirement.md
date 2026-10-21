# PR #201 Text quality Hook撤去の履歴

## 2026-10-20

- Codexの `UserPromptSubmit`／`PostToolUse`／`Stop` から文章品質Hookを撤去し、session baseline state管理を終了した。
- Stop時のstate欠落ブロック、状態管理の複雑性、Hook実行時負荷を解消するため、文章品質検査を既存CLIとCIへ集約した。
- lint rule、fingerprint、Git差分・rename比較、Text quality change gate、full scan、Markdown lintの検出・失敗判定は維持した。
- PreToolUse安全性Hookとログ記録Hookは変更対象外とした。設計履歴は[ADR-0026](../adr/0026-codex-text-quality-gate.md)を参照する。
