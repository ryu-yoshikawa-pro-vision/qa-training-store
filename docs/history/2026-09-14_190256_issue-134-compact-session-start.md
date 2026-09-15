# Issue #134 compact後SessionStart再注入の反映履歴

## 2026-09-14

- Issue #135の完了とmainへの取り込みを確認したため、Issue #134のPlan Task 5に従い、compact後の`SessionStart`でroot `AGENTS.md`全文を`additionalContext`へ返すHookを追加した。
- `source=compact`以外はstdout空・exit 0とし、入力不正、repository root解決失敗、root `AGENTS.md`欠落／読込失敗、structured output生成失敗は、本文・token・secret・pathを含まない`continue=false`／`stopReason`へ収束させた。
- Unix／Windows launcherと既存`tests/contracts/codex-hook-contract.test.ts`の契約を追加した。root `AGENTS.md`本体、コピー、marker、production文章品質ruleは変更していない。
