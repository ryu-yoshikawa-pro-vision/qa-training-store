# タスク

## 現在

- [x] 1. Strict Runとimplementation planを確定する
- [x] 2. Current main、AGENTS、Plan、ADR、直近Run、config、hooks、collectorをrebaselineする
- [x] 3. Open PR、Codex version、Luna/max受理、custom read-only spawn capabilityを確認する
- [x] 4. config / 5 custom agent / child recursion migrationを実装する
- [x] 5. Parent orchestration、worker focused validation、quality runner、completion stateをAGENTS / docsへ反映する
- [x] 6. SubagentStart identity/model observation、collector、schema、Failure Taxonomy catalogを実装する
- [x] 7. Bash / PowerShell verify parityとstatic contractを実装・修復する
- [x] 8. Wave 4 read-only parallel、Wave 5 recursion negative、Wave 6 write isolation decisionを実Runする
- [x] 9. Wave 7 quality runner、Wave 8 failure/repair path、Source Integrityを実Runする（承認済み25件のformat後のtimeout repair後、5/5 PASS、Source Integrity PASS）
- [x] 10. Wave 9 local/external validation、sanitizer、evaluation、completion stateを確定する（未達ゲートはfail-closeで記録）

## 発見事項

- [x] D1. `spec/failure-taxonomy.json`が欠落しているため、既存10 categoryだけで機械catalogを復元する
- [x] D2. Codex CLIを更新後、Plan minimum `0.144.0`を満たしLuna runtime acceptanceを再確認する
- [x] D3. Hook trust / current CLIによりactual SubagentStart evidenceが取得できるか、migration後に再評価する（標準safe wrapperでSubagentStart／SubagentStop各1件、code_researcher、Luna、同一Agent IDを取得）
- [x] D4. `quality_gate_runner` exact roleのruntime完了結果が取得できるかを再評価する（標準wrapperでpost-timeout 5件を指定順・各1回、QUALITY_GATE_RUNNER_PASS）
- [x] D5. `pnpm run verify`の既存format baselineと今回追加specの因果を分離し、ユーザー承認の25件を機械的に整形して親verify PASS、共有Vitest timeout repair後にquality runner PASSを確認する
- [x] D6. External Completion Checksを確認し、PR #19 merge commitのstatus/workflowが空で現working treeは未pushのため`MERGE_READY=false`を維持する
- [x] D7. current CLI child runtimeがrepository-local exact execpolicy ruleを読み込まない層の差を、標準safe wrapperの安全な実行環境で確認する

## 保留

- B1（解消済み）. post-formatのquality_gate_runner #4で`native-production-module-resolution.test.ts`の5000ms cold-load timeoutが2回再現したが、`vitest.config.ts`の共有testTimeout 15秒設定後にfocused contract、親verify、quality runner 5/5がPASS。Product/Test behaviorは変更していない。
