# Tasks

## Now

- [x] 1. PLAN、初期branch／working tree／環境／Codex version／doctor／featuresを確定する
- [x] 2. repo mapping、現行Hook実装／config／tests／verify／ADR／過去Runと公式Hook contractを確認する
- [x] 3. bounded CharterとBEFORE working-tree snapshotを作成し、runtime probeの条件を固定する
- [x] 4. A: 全対象Hookのscript単体stdin／stdout／stderr／exit／duration／JSONL side effectをprobeする
- [x] 5. B: 現行configのUnix／Windows launcherをroot／nested cwd／cmd wrapper相当でprobeする
- [x] 6. C: 実Codex CLIから最小tool／prompt／Stop／可能ならsubagent・Code Mode経路を発火させる
- [x] 7. 公式／upstream source・issue・version historyと実測を突合し、Root Causeと修正要否を決定する
- [x] 8. 修正が必要な場合だけ、最小実装とbehavior回帰testを追加する
- [x] 9. focused validation、必要なfull gate、sanitizer、runtime再確認を実行する
- [x] 10. AFTER snapshot、durable report、Run REPORT／evaluationを確定する
- [x] 11. repository修正時のみbranch safety check、commit、push、OPEN PR作成と確認を行う
- [x] 12. ユーザー向け最終報告（指定section、Progress、Evidence、Remaining risks）を完了する

## Discovered

- [x] 13. logging 5 Hookのtimeoutだけを5秒から10秒へ変更し、PreToolUse 30秒と全launcher／security semanticsを維持する
- [x] 14. timeout値のcontract testとPowerShell verifyを10秒仕様へ同期する
- [x] 15. PostToolUse／Stopを含むlogging launcherをroot／nested cwdで複数回計測し、exit／stdio／JSONL／durationを記録する
- [x] 16. ADR／調査report／PROJECT_CONTEXTとPR #106本文へbounded adjustment、async非採用、残存リスクを追記する
- [x] 17. focused validation、script syntax、diff check、可能なfull verifyを実行し、変更後Run ArtifactをSanitizeする
- [ ] 18. diff review後に指定branchへcommit／pushし、既存PR #106の本文とheadを確認する

## Blocked

- なし
