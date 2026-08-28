# Codex Hook / Run記録整理の履歴

## 2026-08-28

- PR #76の実装で、機械的に取得できるCodex lifecycle factを5つのLogging Hookと共通Node loggerへ移す方針を確定した。
- Hook JSONLはsession単位の`.codex/logs/hooks-<safe-session-id>.jsonl`へ保存し、REPORTはTASK完了・重要判断・blocker・Run完了のcheckpointに限定する。Subagentの意味情報はDelegation / Result / Parent decisionだけをREPORTへ残す。
- 新規Run manifestはschema v2へ揃え、旧Subagent JSON／旧Hook observationのproducer・consumer・専用cleanupを廃止した。既存v1 manifestは旧fieldの値を保持するだけで、旧JSON／旧observationの再走査・再集約は行わない。
- repo-wide dependency確認では、廃止対象legacy stackの外側に独立したproducer、consumer、workflow callerは見つからなかった。既存Safety `PreToolUse`、`network`、`scope_violation`、`.codex/logs/*.jsonl` generic cleanupは維持する。
