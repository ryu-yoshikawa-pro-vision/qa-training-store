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
- [x] 17. Case B capability probeも`--ignore-user-config`へ固定し、Host user config / MCP / tool設定を評価経路へ持ち込まない。
- [x] 18. 非Gitのsource-free QA rootを`--skip-git-repo-check`で起動する契約へ固定する。
- [x] 19. Browser preflightへscreenshot / URLを追加し、official runner evidence prefix内のEvidence実体検証を追加する。
- [x] 20. Case Bのground-truth sanity後に`suspended-user` / sessionなし / `/login`へ戻すinitial-state resetを既存helper再利用で固定する。
- [x] 21. source-free QA promptへrunner-owned Harness境界を明示し、欠落している`scripts/agentic-qa/**`やProduct source探索を要求しない。
- [x] 22. 約995行のcanonical Planを親Plan＋3詳細ファイルへ責務分割し、詳細契約の重複を避ける。
- [x] 23. ここまでの全レビューを8修正単位へ統合し、重複指摘を整理する。
- [x] 24. Case Bのsource-free QA root / cwd切替 / Artifact同期を撤回し、same-workspace Gray-boxへ簡素化する。
- [x] 25. Case A test freezeとCase A / B / C actual validation `command_execution`をPlanへ追加する。
- [x] 26. Case Bのvalidator composition、既存Finding matcher再利用、`QA_AGENT.md` seed正本化をPlanへ追加する。
- [x] 27. sanitized Target生成手順、`source_revision_git_sha` / `routing_source_git_sha`、Web Search / shell env制御をPlanへ追加する。
- [x] 28. Case EのDoctor採点をactual command / exit code / Artifactへ絞り、taxonomy parserを非目標化する。
- [x] 29. status分類、Case B timeout、Case D Semantic重複削除、result contract最小化をPlanへ反映する。
- [x] 30. 親Plan＋3詳細ファイルの参照・旧契約残存・Markdown構造を確認する。
- [x] 31. ここまでの全レビューを再統合し、Case B matcher、Semantic actual-output責務、Case A Finding overlap、ignored path scope、provenance、Git mutation、structured schema、Native invocation、CLI exitの9点を必須修正として確定する。
- [x] 32. Case Bから既存`matchDefectFinding()`再利用を撤回し、fixed case factsによるdeterministic Finding identityへ変更する。
- [x] 33. PR5 Semantic EvalをCase A `feature-plan` / `code-review`、Case B `exploratory-qa`、Case D `harness-improvement`のactual outputへ再利用する契約を追加する。
- [x] 34. Case A review Findingにrunner注入diff line rangeとのoverlapを要求する。
- [x] 35. `routing_source_git_sha` / `case_baseline_git_sha`を分離し、Git-visible scopeとignored-prefix inventoryを分ける。
- [x] 36. 全Agent turnのGit mutation禁止を共通prompt builderへ固定する。
- [x] 37. repair / review / Nativeのstage-specific schemaと固定command照合を明確化する。
- [x] 38. Case Eを標準PowerShell invocationへ統一し、`first_anomaly`の検証をbounded output内verbatim evidenceへ限定する。
- [x] 39. Workflow E2E CLIのexit code契約を固定し、canonical Plan / Run Artifact / PR本文を同期する。

- [x] 40. ここまでのレビュー結果を根本原因で5項目へ統合し、重複指摘を除外する。
- [x] 41. status分類を共通Runtime blocker / 個別process failure / case-local failure / 固定capability不足へ分離する。
- [x] 42. PR5 Semantic Evalのactual candidate経路をcalibration用`expected` / `calibration_match`から分離し、stage内の実行タイミングとJudge contextを固定する。
- [x] 43. Case BのBlack-box Challenge / runbook露出を除去し、source revision Git object由来patch bytes、固定offline dependency preparation、fresh runner validation workspaceへtrust boundaryを修正する。
- [x] 44. Case DのProduct fixtureを撤回し、Product正常 / Harness反復failureのrunner-owned Evidenceだけへ簡素化する。
- [x] 45. Case Eをphysical device serial + `-RequirePhysicalDevice`のCanonical Doctorへ合わせ、first anomalyとserial redactionを固定する。
- [x] 46. 親Plan・3詳細Plan・plan-only Run Artifact・PR本文を同期し、追加Plan分割が不要であることを確認する。

## Discovered（発見事項）

- latest `main`は`1213adc9513409cc176c090f9df4c1c408142b9c`で、Plan branchは1 commit behind。差分はTraining runtime契約とWindows Stop Hook launcher調整が中心で、現時点で新しいPR6設計blockerは確認していない。
- Repositoryの`.codex/config.toml`には`[mcp_servers]`がない。canonical Case Bは`--ignore-user-config`を固定するため、Browser capabilityがその条件で利用できなければ`browser_capability_unavailable_under_canonical_config`として`not_executed`にする。user config有効の追加probeは行わない。
- `charterSchema`は固定Charterの全fieldを要求し、`CHALLENGE-BASIC-001/challenge.json`だけでは`charter_id` / `risk`を満たさない。PR6専用の固定CharterをPlanで定義する。
- Normal / Gray-box契約は最初のRuntime interaction前のBEFORE、QA後のAFTER / comparisonと`additional_source_diff_count=0`を要求する。
- Case Cはsentinelをfile scope外にすると`stop_scope_violation`と競合する。sentinel pathを`allowed_files`へ含め、destructive operation禁止を別に評価する。
- `routing_source_git_sha`はfixture適用前のsanitized Target HEAD、`case_baseline_git_sha`はrunner-owned baseline commit後のAgent開始時HEADとして分ける必要がある。生成元revisionは`source_revision_git_sha`へ分離し、重複する`target_git_sha`は作らない。
- Gray-boxはBlack-box Scoredのsource-free isolationを要求しないため、Case B専用root / Skillコピー / Referenceコピーは不要。
- `scripts/new-run.sh --no-run-manifest` / `scripts/new-run.ps1 -NoRunManifest`は既存機能であり、複数Skillを跨ぐcase-local Runに新しい`task_type`は不要。
- Working Tree Snapshotはpatched source workspaceのMachine Contractとして保持し、promptへ内容 / digestを転記しない。別QA rootへの同期自体を廃止する。
- `grayBoxFindingsSchema`は既存Machine Contractの正本としてexport済みで、Zod 4.4.3は`z.toJSONSchema()`を提供する。Case B QAのstructured output schemaはここから生成し、最終Zod / cross-file validationを別途行う。
- Codex user configはMCP server等を持ち得るため、Browser capability不足をuser config有効probeで迂回しない。Case B capability probeもcanonical configへ固定する。
- Case Bはsanitized source workspace内の通常Git contextで実行するため、`--skip-git-repo-check`は不要。
- `CHALLENGE-BASIC-001`のRequired Evidenceは`screenshot` / `url`。schemaはEvidence refのsyntaxを検証するがfile existenceまでは保証しないため、runnerがofficial runner evidence prefix内のregular file実体を確認する。
- `runChallengeGroundTruthSanity()`は`suspended-user`でloginを実行し、patched phaseではsession作成後`/`へ遷移する。QAへ同じRuntimeを渡す前に再resetしないと初期状態が汚れる。
- `QA_AGENT.md`のGray-box seed列挙は実装正本`src/seeds/metadata.ts`とdriftしている。PR6専用例外を足さず正本参照へ修正する。
- latest `main`取り込みはEvaluator実装開始前に行い、今回はPlan-onlyの範囲では実施しない。
- PR5 Semantic Evalはcalibrationだけでは現在のSkill実行品質を証明しない。PR6でactual outputへ同じcriteria / Judge protocol / 3 trialsを適用する必要がある。
- `.codex/runs/**` / `.artifacts/**`は既存Git / Working Tree Snapshotだけでは観測できないため、明示的なprefix inventoryが必要。
- 現行の親Plan + 3詳細ファイルで責務が分かれているため、追加分割は不要。

- Case Bの既存`prepareDisposableDependencies()`はnon-Windowsでroot `node_modules`、Windowsでoffline pnpm storeを前提にするため、sanitized Targetへそのまま流用しない。PR6はcase workspaceの固定offline installへ一本化する。
- 既存`applyPatchToDisposable()`はroot Product fileをdisposableへcopyしてからpatchを当てるため、PR6のsource revision provenanceには流用しない。同一patch bytesの`git apply`だけを使う。
- Case BのAgent buildは`dist/**`を生成する。runner独立validationはAgent workspaceの`dist/**` / `node_modules/**`を信用せずfresh validation workspaceで行う。
- Case Dの`harness-improvement`はPR5 `HI-SEPARATION`どおり単発Product bugをHarness問題へ再分類できないため、Product正常 / Harness反復failureを固定Evidenceへ含める。
- Windows Android Canonical routeはexplicit serial + `-RequirePhysicalDevice`を要求するため、Case E Doctor commandも同契約へ合わせる。

## Blocked（ブロック中）

- なし。Evaluator実装前にlatest `main`を取り込み、material driftとinstalled Codex smoke probeを実施する。
