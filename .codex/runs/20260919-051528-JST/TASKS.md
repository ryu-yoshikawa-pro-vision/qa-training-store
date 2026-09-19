# Tasks（タスク）

## Now（現在）

- [x] 1. 最新PR #167 / Issue #163 / Planを再確認する。
- [x] 2. 未解決レビューを根本原因へ統合する。
- [x] 3. PR #167を唯一のRepository実装PRとしてPlanへ明記する。
- [x] 4. fallbackを6 jobへ変更し、`validate-exec`と`finalize`の責務を分離する。
- [x] 5. `fix-authorization.json`とbaseline vulnerable / downgrade拒否契約を追加する。
- [x] 6. OpenCodeのtop-level deny、Free main / small model、固定title、formatter / LSP無効化を追加する。
- [x] 7. Artifactの`artifact-ids`、hidden file、exact file list契約を修正する。
- [x] 8. publish直前のAlert / Advisory再照合を追加する。
- [x] 9. 実行タスク・contract test・activation後検証を6 job契約へ更新する。
- [x] 10. PR本文から`Closes #163`を外し、Issue close時点をactivation後へ変更する。
- [x] 11. active Run Artifactを更新し、実装へ進んでいないことを確認する。

## Blocked（ブロック中）

- Owner権限で現在のopen Dependabot Alert件数を確認し、`vulnerabilityAlerts.prConcurrentLimit`の具体値を決める必要がある。
- この未確定値がblockするのは`renovate.json`と`tests/contracts/renovate-config.test.ts`だけとする。
