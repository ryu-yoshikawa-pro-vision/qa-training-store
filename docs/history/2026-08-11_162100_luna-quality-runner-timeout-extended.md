# Luna quality runner timeout拡張のRuntime Acceptance追補

2026-08-11 JST、Codex CLI `0.147.0`の標準 `scripts/codex-task.ps1` 経路で、`quality_gate_runner` exact roleを1件だけ再実行した。

- child toolの既定上限で発生した`bash scripts/verify`／`pnpm run test:contracts`のtimeoutを、コマンド文字列を変更しないper-command timeout指示（300秒以上）としてquality runner TOMLへ反映した。
- 5件は指定順・各1回で完了した。#1/#2/#3/#5はPASS、#4 `pnpm run verify`は既存25ファイルのformat baselineでFAIL、最終markerは`QUALITY_GATE_RUNNER_INCOMPLETE`。
- `spec/failure-taxonomy.json`は個別Prettier check PASSで、今回追加ファイルと既存baselineの因果を分離した。
- before/after working-tree snapshot comparisonは`passed=true`、追加Source差分0、HEAD変更なし。SubagentStart hook trustは迂回せず、Runtime Agent Complianceはunknownのままとした。
