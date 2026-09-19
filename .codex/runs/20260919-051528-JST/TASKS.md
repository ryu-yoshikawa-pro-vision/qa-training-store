# Tasks（タスク）

## Now（現在）

- [x] 1. これまでのレビュー結果をIssue #163、PR #167、現行Planへ再照合し、重複を統合する。
- [x] 2. OpenCode / Zen credentialとRepository validationを別runnerへ分離する。
- [x] 3. `pnpm run verify`後の最終semantic / file allowlist guardと「guard後はcode実行なし」を固定する。
- [x] 4. root parent updateを`root -> target`の1 edgeへ限定し、parent-scoped override selectorをexact parent versionへ固定する。
- [x] 5. OpenCodeのRepository文書参照とread / edit allowlistを具体化する。
- [x] 6. read-alert / graph取得後 / publish前の重複PR判定責務を分離する。
- [x] 7. job間Artifactの名前、Artifact ID、retention、overwrite禁止、file hash検証を固定する。
- [x] 8. RenovateのPublic PR metadata設定をcontract test可能な値まで固定する。
- [x] 9. Security branchのdependency-key生成規則と`github.run_id`利用を固定する。
- [x] 10. tracked Run Artifact例外を撤回し、sanitized standard Runを必須にする。
- [x] 11. 最新head / CI状態へPlanの現状記述を更新する。
- [x] 12. `workflow_dispatch` event payloadをRepository / dependency processへ渡さないpublic-safe環境契約を追加する。
- [x] 13. active Run Artifactを更新し、実装ファイルへ進んでいないことを確認する。

## Discovered（発見事項）

- `OPENCODE_API_KEY`をOpenCode process環境だけに限定しても、同一runnerで後続Repository / dependency codeを実行するとfilesystem境界にはならない。
- `pnpm run verify`は`build:web`、`build:spec`、manifest生成等を含むため、実行前のsemantic guardだけではpublish差分を保証できない。
- `read-alert`ではrelated root dependencyが未確定なので、root / overrideの重複判定はinstalled graph取得後へ分離する必要がある。
- root packageの`dependencies`だけでは`root -> A -> target`の深いpathをcandidate検証できないため、初期版ではroot parent updateを1 edgeへ限定する。
- 既存`docs/reference/run-artifacts.md`はRun Artifact省略をユーザー明示指示以外で認めておらず、Security fallbackでもsanitized tracked Artifactが必要。
- Repositoryにはfull-SHA固定の`actions/upload-artifact@v6` / `actions/download-artifact@v7`が既にあるため、新しいArtifact mechanismは不要。

## Blocked（ブロック中）

- Owner権限で現在のopen Dependabot Alert件数を確認し、`vulnerabilityAlerts.prConcurrentLimit`の具体値を決める必要がある。
- この未確定値がblockするのは`renovate.json`と`tests/contracts/renovate-config.test.ts`だけとする。
