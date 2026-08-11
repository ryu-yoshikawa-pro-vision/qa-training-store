# Plan

## Objective

- GPT-5.6 Luna Subagent Orchestration PlanをWave 0〜9まで実装・実証する。Git mutationは行わない。

## Scope

- In: `.codex/config.toml`、5 custom agents、Parent / quality runner / runtime compliance contract、hook observation、collector、schema、verify parity、Failure Taxonomy catalog、Run Artifact。
- Out: Product / Test behavior、独自 orchestration platform、Git add/commit/push/reset/clean、PR write、Global Codex更新。

## Assumptions

- ユーザーの実装指示をL3変更のexplicit approvalとして扱う。
- write isolationが証明できなければserial fallbackを採用する。
- runtime effortが観測不能ならconfigured evidenceとし、推測でruntime verifiedと書かない。
- `spec/failure-taxonomy.json` は既存Markdown/schemaの10 categoryを唯一の機械catalogとして復元する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーがPlan実装を明示承認済み。
- 仮定してよい細部: 既存snapshot / collector / hook failure semanticsを維持する。
- 未回答の重要質問: Codex CLI 0.142.5ではLunaが拒否された。必要minimum以上のCLI提供が外部 blocker。

## Hypotheses

- H1: child TOMLの`agents.enabled=false`（必要時`features.multi_agent=false`）とbehavioral prohibitionでgrandchild spawnを防止できる。
- H2: official hook stdinから`agent_type`、`agent_id`、`model`を観測し、collector summaryへ集約できる。
- H3: current workspace isolationは証明できない可能性が高く、serial fallbackが安全な完了条件になる。

## Research Plan

- Round 1 Query: Current main、Plan、config、agent、hook、collector、snapshot、Failure Taxonomy、Open PR、CLIを確認する。
- Round 2 Query: migration後のstatic verify、official hook stdin、実custom-agent runtime、read-only parallel、recursive negative、quality runner / Source Integrityを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある。
  - 未解決論点はBLOCKED / fallback / external pendingとしてRun Artifactに残す。

## Approach

- Wave 0を再baselineし、config/agent migration、Parent contract、observation/collector、verifyを段階的に実装する。
- read-only調査は独立観点をparallelizeし、writableはGate A/Bの証明がない限りserialにする。
- quality runnerはParent定義のRequired Validation Setだけを実行し、Source Integrityをbefore/afterで確認する。
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 5 custom agentsがLuna/max、identity/sandbox/recursion contractを満たす。
- Parent responsibilities、custom-only、parallel gate、quality runner、Failure Taxonomy SSOT、Local/External stateをdocs/verifyで機械検証できる。
- Runtimeで実際のagent identity/modelを観測でき、allowlist外・model mismatchをfail-closeできる。
- read-only parallel、recursive negative、quality runner、Source Integrity、failure/repair pathを実行し、未実行はPASS扱いしない。
- CLI/Luna/runtime blockerが残る場合は`LOCAL_IMPLEMENTATION_COMPLETE=false`、external pendingなら`MERGE_READY=false`とする。

## Risks / Unknowns

- `codex-cli 0.142.5`は`gpt-5.6-luna`を「requires a newer version」で拒否した。Global更新は禁止のため、実runtime acceptanceはBLOCKED。
- Current treeに`spec/failure-taxonomy.json`がなく、reference/schemaと整合する単一catalogを追加する必要がある。
- hook trust / CLI version / tool-based spawnが異なるため、hook evidenceが取れない場合はruntime complianceをPASSにしない。

## Thinking Log

- 2026-08-11 12:44 JST: Strict Run `20260811-124437-JST`を初期化。L3 explicit approval、rollback、Git mutation禁止を採用。
- 2026-08-11 12:48 JST: Open PR #17/#18はplanning-onlyで今回のconfig/harness変更と競合しないと確認。
- 2026-08-11 12:50 JST: `codex-cli 0.142.5`。Luna/max実Runは400 errorで拒否され、model fallbackは行わずBLOCKER記録。
- 2026-08-11 13:00 JST: ユーザー更新後の`codex-cli 0.147.0`でread-onlyのLuna/max no-opが`CAPABILITY_OK`を返した。Planの最小CLI基準`0.144.0`を満たしたため、Wave 1へ進む。
- 2026-08-11 14:06 JST: Wave 4 bounded read-only parallelとWave 6 serial fallbackを完了。Wave 5 childは`GRANDCHILD_SPAWN_UNAVAILABLE`を返したが、CLI primaryの最終markerはtimeoutとして未完了扱いにした。
- 2026-08-11 14:06 JST: quality_gate_runnerのexact CLI spawnは成功したがRequired Validation Set結果を返さずtimeout。internal role listにも公開されていないためbuilt-inへの置換はせず、Parent validationとSource Integrityを別証跡にした。
- 2026-08-11 14:06 JST: `test:contracts`のnative module resolution cold timeoutをfocused 4/4後のfull rerun 24 files / 201 testsで解消。`pnpm run verify`は既存format baseline 25 filesでupstream停止し、今回追加specのみ整形した。
- 2026-08-11 15:06 JST: quality runnerのRequired Validation SetをPlan最小候補どおり5件（`pnpm run verify`を含む）へ固定し、Windows outer wrapperの複数token形をexact ruleで調査した。`codex execpolicy check`はallowでも、実child runtimeは外側policyで1件目を拒否したため、危険なbypassを使わず未完了を維持する。
- 2026-08-11 16:10 JST: `bash scripts/verify`のquality runner timeoutは、親側の同一コマンドがexit 0（約28秒）で、標準wrapperのchild tool上限が14秒だったため、validation scriptの失敗ではなくtool timeoutと分類した。quality runnerへコマンド文字列を変えない300秒tool timeout契約を追加した。
- 2026-08-11 16:20 JST: timeout拡張後の標準wrapperでquality runnerを1件だけ再実行し、#1/#2/#3/#5 PASS、#4 `pnpm run verify`のみ既存25ファイルformat baselineでFAIL、5/5実行・Source Integrity PASSを確認した。current `spec/failure-taxonomy.json`は個別Prettier check PASSで、baselineと因果を分離した。SubagentStart hook trustは迂回せずunknownを維持する。
- 2026-08-11 18:14 JST: post-format quality runnerで#4 native module resolutionの5000ms timeoutが2回再現したが、Native Jest直後の同一境界はcontracts 24/24・201/201 PASSだった。Codex実行負荷下のVitest既定timeoutがMetro cold-loadを誤検出する仮説を採用し、repair allowed fileを`vitest.config.ts`だけに限定する。Product/Test source、package scripts、Required Validation Set、quality runner contractは変更しない。rollbackは`test.testTimeout`追加の除去と再検証とする。
- 2026-08-11 20:03 JST: `vitest.config.ts`へ`testTimeout: 15_000`を追加する最小repairをimplementation_workerで実施。focused contractは24 files / 201 tests PASS。trusted generated outputの定義をrunner入力へ明記して、exact quality runnerは#1〜#5を指定順・各1回、全exit 0、`write_attempt=false`、`QUALITY_GATE_RUNNER_PASS`を返した。post-timeout Source Integrityも追加ソース差分0・HEAD不変でPASS。Local completionはtrue、External Checks pendingのためMERGE_READYはfalse。
