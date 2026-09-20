# Tasks（タスク）

## Now（現在）

- [x] 1. Issue #117とPR1〜PR5の完了状態を確認する。
- [x] 2. 現行`main`のTrigger / Semantic / Deterministic Evalと対象Skill契約を確認する。
- [x] 3. PR6の初期stage方式、代表case、変更範囲、検証方法を確定する。
- [x] 4. canonical Planとplan-only Run Artifactを保存する。
- [x] 5. handoff、answer-key isolation、Artifact reuse、stop境界、PR5持ち越し責務を全体レビューする。
- [x] 6. handoffをCodex標準`exec resume <thread_id>`へ固定する。
- [x] 7. repair Iteration Model、Case A Finding prerequisite、Case B source-free QA / Runtime lifecycle、Case C/D fixture、Case E Doctor gateを確定する。
- [x] 8. PR #168をDraftで作成する。
- [x] 9. PR作成後に目的達成性、scope、実装時の迷い、過剰設計を再レビューする。
- [x] 10. Case A〜E、Target責務、Run Artifact、Codex config / Hook隔離、ambient Skillの必要修正を統合する。
- [x] 11. canonical Plan、plan-only Run Artifact、PR本文へ前回レビュー時点の必要修正を反映する。
- [x] 12. PR #168 headとlatest `main`を再取得し、head不変・behind 1と最新差分のmaterial driftを確認する。
- [x] 13. 最新レビュー6件をRepository契約へ照合し、Case B Browser / Charter / snapshot / allowlist、Case C scope、provenance、manifestless Runの修正方針を確定する。
- [x] 14. canonical Planとplan-only Run Artifactへ6件を反映し、既知の`MD012`を修正する。
- [x] 15. Case BのArtifact経路を再レビューし、BEFORE snapshotのQA root露出を除去する。
- [x] 16. Case BのQA出力を既存`grayBoxFindingsSchema`由来structured outputへ固定し、Machine ContractをAgentに推測させない。
- [x] 17. Case Bのuser config有効probeを診断専用へ変更し、canonical runへHost MCP / tool設定を持ち込まない。
- [x] 18. 非Gitのsource-free QA rootを`--skip-git-repo-check`で起動する契約へ固定する。
- [x] 19. Browser preflightへscreenshot / URLを追加し、official runner evidence prefix内のEvidence実体検証を追加する。
- [x] 20. Case Bのground-truth sanity後に`suspended-user` / sessionなし / `/login`へ戻すinitial-state resetを既存helper再利用で固定する。
- [x] 21. source-free QA promptへrunner-owned Harness境界を明示し、欠落している`scripts/agentic-qa/**`やProduct source探索を要求しない。

## Discovered（発見事項）

- latest `main`は`1213adc9513409cc176c090f9df4c1c408142b9c`で、Plan branchは1 commit behind。差分はTraining runtime契約とWindows Stop Hook launcher調整が中心で、現時点で新しいPR6設計blockerは確認していない。
- Repositoryの`.codex/config.toml`には`[mcp_servers]`がないため、Case BのBrowser capabilityはHost user config依存の可能性を実probeで切り分ける必要がある。
- `charterSchema`は固定Charterの全fieldを要求し、`CHALLENGE-BASIC-001/challenge.json`だけでは`charter_id` / `risk`を満たさない。PR6専用の固定CharterをPlanで定義する。
- Normal / Gray-box契約は最初のRuntime interaction前のBEFORE、QA後のAFTER / comparisonと`additional_source_diff_count=0`を要求する。
- Case Cはsentinelをfile scope外にすると`stop_scope_violation`と競合する。sentinel pathを`allowed_files`へ含め、destructive operation禁止を別に評価する。
- sanitized TargetのHEADはsynthetic revisionなので、original routing source SHAはCLI入力、Target SHAはTarget HEADから別取得する。
- Case B source-free rootは`AGENTS.md` / `QA_AGENT.md`に加えて`docs/reference/agentic-qa-workflow.md` / `docs/reference/run-artifacts.md`を必要とする。
- `scripts/new-run.sh --no-run-manifest` / `scripts/new-run.ps1 -NoRunManifest`は既存機能であり、複数Skillを跨ぐcase-local Runに新しい`task_type`は不要。
- BEFORE snapshotにはprotected patch適用後のworking tree path / digestが入り得るため、source-free QA rootへコピーするとFinding前に実装差分を漏らす。snapshotはsource workspaceだけに保持する。
- `grayBoxFindingsSchema`は既存Machine Contractの正本としてexport済みで、Zod 4.4.3は`z.toJSONSchema()`を提供する。Case B QAのstructured output schemaはここから生成し、最終Zod / cross-file validationを別途行う。
- Codex user configはMCP server等を持ち得る。Browser capabilityを得る目的でuser config全体をcanonical Case Bへ戻すとsource-free境界を測れないため、user config有効probeは診断専用にする。
- Case B source-free rootはGit repositoryである必要がない。既存Semantic EvalでもCodex標準`--skip-git-repo-check`を使って一時directoryで実行しているため、PR6でも`git init`は不要。
- `CHALLENGE-BASIC-001`のRequired Evidenceは`screenshot` / `url`。schemaはEvidence refのsyntaxを検証するがfile existenceまでは保証しないため、runnerがofficial runner evidence prefix内のregular file実体を確認する。
- `runChallengeGroundTruthSanity()`は`suspended-user`でloginを実行し、patched phaseではsession作成後`/`へ遷移する。QAへ同じRuntimeを渡す前に再resetしないと初期状態が汚れる。
- `QA_AGENT.md` / `docs/reference/agentic-qa-workflow.md`はsource-free rootに存在しないSupporting Harness pathを参照するため、QA promptでHarness lifecycleとvalidationはrunner-ownedと明示する。
- latest `main`取り込みはEvaluator実装開始前に行い、今回はPlan-onlyの範囲では実施しない。

## Blocked（ブロック中）

- なし。Evaluator実装はまだ開始しない。initial-state resetとrunner-owned Harness境界を反映した後に全体レビューで実装開始可否を再判定する。
