# Tasks

## Now
- [x] 1. PLANを確定し、対象5件を`must_fix`、Remote CI等を`defer/reject`へ分類する。
- [x] 2. 最新PR Head、現行対象コード、旧RunのREPORT/evaluation、Native成果物追跡状態を調査する。
- [x] 3. Contract、Maestro Flow、SQLite、旧Run Artifactを最小差分で修正する。
- [x] 4. Focused Test、Native Component、Sanitizer、Format、`pnpm run verify`、実行可能な個別Maestroを検証する。
- [x] 5. Scope、Git mutationなし、Native成果物追跡なし、Run Artifactのサニタイズを確認し、REPORT/evaluationを確定する。

## Discovered
- D1. `gh` CLIが未導入であるため、PR Head確認方法を読み取り専用API／リモート情報へ切り替える。
- D2. 旧Runの`evaluation.json`は`remote_ci_unverified`で既に`partial`だが、REPORT切り詰め事象のfindingは未記録である。

## Blocked
- なし
