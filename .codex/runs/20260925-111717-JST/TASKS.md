# TASKS

## Now

- [x] latest mainとproject Codex設定を確認する。
- [x] OpenAI現行Codex config仕様を確認する。
- [x] auto-net のactive source / docs / workflow参照を棚卸しする。
- [x] approval_policy = "never" と既存 prompt rulesの衝突をPlanへ反映する。
- [x] AGENTS.md / Harness / wrapper / verifyを含む実装範囲とrollbackを確定する。
- [x] 別branchへPlanとRun Artifactを保存する。

## Discovered

- [x] .github/workflows/** に auto-net 参照がないことを確認する。
- [x] scripts/verify* が「approval policyなし / network false / auto-net preflight」を現契約として強制していることをPlanへ反映する。
- [x] 過去Run / Plan / ADR / historyは履歴として変更対象外にする。

## Blocked

- L3実装は未実施。実装開始前にユーザーの明示承認が必要。

Progress: 100% (9/9)
