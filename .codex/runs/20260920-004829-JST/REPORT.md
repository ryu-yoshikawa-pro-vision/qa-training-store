# Report（追記のみ）

## 2026-09-20 00:48 (JST)

- Summary:
  - Issue #117 PR6の実装前調査とPlan作成を完了した。
  - PR6はstage単位のCodex実行でSkill handoff / stop / Artifact reuseを評価する方針に固定した。
- Changes:
  - branch: `test/117-pr6-workflow-e2e-eval`。
  - canonical Plan: `docs/plans/2026-09-20_004829_issue-117-pr6-workflow-e2e-eval.md`。
  - plan-only Run: `.codex/runs/20260920-004829-JST/`。
- 判断 / 理由:
  - 同一process内の複数Skill順序をOTelから復元せず、1 stage = 1 processにする。現行observerを変更せずIssue要件を満たせるため。
  - 代表caseは固定し、Workflow DSL / Agent Runtime / Session Managerを追加しない。
  - plan-onlyのため`run.json`は作成せず、machine-managed manifestを手編集しない。
- Validation:
  - branch base: `main` `c0dbf818d9431dcbd1e03cb76361e51913313af0`。
  - Issue #117、完了コメント、`AGENTS.md`、`PLANS.md`、feature-plan Skill、Trigger / Semantic / Deterministic Eval、対象Skill contractを確認済み。
  - 実装、PR作成、Issue更新は未実施。
- ブロッカー / 残作業:
  - このRunの残作業なし。実装は後続依頼で別Runとして開始する。
- Subagent:
  - Delegation: なし。
  - Result: N/A。
  - 親Agentの判断: GitHub上の正本を直接確認してPlanを確定した。
- Progress: 100% (5/5)

## 削除候補

| パス | 理由 | 推奨対応 |
|---|---|---|
| なし | - | - |

## 2026-09-20 01:29 (JST)

- Summary:
  - PR6 Planを全体レビューし、Issue #117の完了条件とCodex標準Runtimeに照らして必要性を再判定した。
  - fresh `--ephemeral` process列をhandoffとみなす方針を撤回し、Host標準`exec resume <thread_id>`による同一threadの複数ユーザーターンへ修正した。
  - fixed 5 caseは維持し、Case C / Dを`stop_unsafe`と`stop_no_progress → harness-improvement`へ組み替えた。
- Changes:
  - canonical Planを更新。
  - Plan-only `PLAN.md` / `TASKS.md`をレビュー後の設計へ更新。
  - このcheckpointを`REPORT.md`へ追記。
- 判断 / 理由:
  - Artifact reuseはsame-sessionでは会話履歴による偽陽性を排除できないため、fresh session / fresh workspaceの独立probeへ分離した。
  - Targetから`.agents/skills/*/evals/**`、過去`.codex/runs/**`、過去`docs/plans/**`を除外し、answer keyをAgentへ見せない。
  - Issue #117の`Blocked / no-progress / unsafe stop`を別decisionで代用せず、`stop_no_progress` / `stop_unsafe`を直接評価する。
  - Evalの`status`とWorkflow自身のdecision / blocked状態を分離する。
  - PR5からPR6へ残されたrepairのchanged files / validation / remaining delta / decisionと、Nativeの実command / gate / stop整合をPlanへ追加した。
  - 独自Session Manager、Workflow Engine、Target Manager framework、Semantic Eval拡張は追加しない。
- Validation:
  - Issue #117、現行Plan、PR5 Plan、OTel observer、`AGENTS.md`、Codex implementation harness、Codexの`exec resume`実装・testを確認した。
  - branchは更新前時点で`main`に対してahead 1 / behind 0。
  - 実装、PR作成、Issue更新は未実施。
- ブロッカー / 残作業:
  - Plan作成Runとしての残作業なし。
  - 実装開始時にinstalled Codexで`exec resume`とresumed turnのOTel observationをsmoke probeする。不成立なら独自fallbackを作らずBLOCKEDとする。
- Subagent:
  - Delegation: なし。
  - Result: N/A。
  - 親Agentの判断: Issue / Repository / Codex Runtimeの正本を直接照合して修正範囲を確定した。
- Progress: 100% (7/7)

## 2026-09-20 09:32 (JST)

- 概要:
  - これまでのPR6 Planレビューを統合し、重複・過剰な指摘を除いたうえで必要な修正をcanonical Planへ反映した。
  - fixed 5 case、Codex標準session継続、既存OTel observer、既存Agentic QA fixtureを維持し、新しいRuntime基盤は追加しない方針を確定した。
- 反映内容:
  - `multiple_skills`をADR-0025 / 既存observerどおり`unobservable`へ固定。
  - repair stageで`--output-schema`を使い、`decision` / `changed_files` / `validation_result` / `remaining_delta`をrunner実観測と照合する契約を追加。
  - Case Bを既存`CHALLENGE-BASIC-001` protected patchによるdeterministic defectへ固定し、`training/agentic-qa/instructor/**`をAgent-visible Targetから除外。
  - Case Cをactionable repairから途中でunsafe requirementが判明するfixtureへ修正。現行契約で一意に`stop_unsafe`へ到達できない場合はBLOCKEDとする。
  - Case Dをactionable repair → validation → same failure / no new evidence → `stop_no_progress`へ修正。
  - Plan / implementation / repair / QAの必要writeを許可し、review / harnessはread-onlyとするstage別sandboxへ修正。
  - Windowsではresume時の`workspace-write`指定だけで判断せず、initial / resumed actual fixture writeをsmoke probeする。
  - Case A / C / Dを必須case、Case B / Eをcapability依存caseとしてrun-level判定へ明記。
  - 独自trust manager、追加case、Workflow Engine、自然文decision parser、完全filesystem isolationは追加しない。
- 確認結果:
  - Codex 0.153.4 sourceでは`exec resume`と`--output-schema`の併用が確認できる。
  - Windows resumeでは`workspace-write`指定がread-onlyへdowngradeされる条件があるためactual write probeが必要。
  - Codexはproject未trustでもSkill自体はloadし、project-local config / hooks / exec policyは制限され得る。PR6必須制御はrunner側で固定する。
  - 既存Agentic QA isolationは`challenge_patch` / `answer_key`をForbidden Capabilityとして扱っている。
  - latest `main`はPlan branchより1 commit進んでおり、`.codex/config.toml`、`package.json`、CI等に変更がある。実装開始前に取り込んで再確認する。
- 状態:
  - 実装、PR作成、Issue更新は未実施。
  - Plan作成Runとして残作業なし。
- Progress: 100% (9/9)

## 2026-09-20 14:04 (JST)

- 概要:
  - これまでのPR6 Planレビューを再統合し、重複・撤回対象を除いた最終的な必要修正をcanonical Planへ反映した。
  - fixed 5 case、Codex標準Runtime、既存OTel observer、既存Agentic QA / Native helperを維持し、独自Runtime基盤は追加しない。
- 反映内容:
  - repair `--output-schema`を4 fieldから既存Iteration Model 9 fieldへ変更し、既存7 decisionを共通schemaで許可。
  - Case Aへ固定status fixture、trial回帰注入、code-review Required outputのstructured Finding、Finding prerequisiteを追加。
  - Case Bをsource-free Gray-box QA rootとpatched source workspaceへ分離し、same-thread cwd切替を必須化。
  - Case BのQA Runtime build / start / stop、repair後rebuild / 新Runtime validationを固定。
  - Case Bの`not_executed`を外部Browser capability不足へ限定し、patch / build / sanity / answer key不整合をskipしない契約へ変更。
  - Case Cへconfig / protected-data / validatorの固定fixtureと`CASE-C-001 -> CASE-C-002 -> stop_unsafe`の実観測条件を追加。
  - Case Dへstate / validatorの固定fixtureとbounded repair後の同一`CASE-D-001 -> stop_no_progress`条件を追加。
  - Case EのHost preflightをWindows / PowerShell / Native helperへ限定し、Doctorのtoolchain / device failureを実Workflowの停止として評価。
  - Native EvidenceへCodex標準JSONL `command_execution`を使用し、Doctor失敗後のdownstream Native action未実行を確認する契約を追加。
  - `multiple_skills`はADR-0025どおり`unobservable`とし、review / QAでもFAILへ再分類しないよう文言を統一。
  - resultへrun-level `completed | blocked`を追加し、case status / Workflow decisionと分離。
  - Plan内のbranch状態をahead 9 / behind 1へ更新。
- 状態:
  - canonical Plan更新commit: `07dc92fa42f7b3f7c5eafc3a3ff2fd70df4e290b`。
  - 実装、PR作成、Issue更新は未実施。
- Progress: 100% (10/10)

## 2026-09-20 16:33 (JST)

- 概要:
  - PR #168作成後の全体レビューを統合し、実装前に必要な修正だけをcanonical Planへ反映した。
  - 実装コード、Skill semantics、Product behavior、CI workflowは変更していない。
- 反映内容:
  - Case Aのreview回帰をbaselineへ戻す方式から、`status.mjs`自体へdiffが残る誤実装注入へ変更。
  - Case BへAgent-facing Browser capability preflight、canonical 6 Skillを持つsource-free QA root、Case固有capability / run blocker / fixture failureの分類を追加。
  - Case Cをunsafe / destructive boundary stopとして整理し、`stop_unsafe` / `stop_needs_human`の未定義優先順位をPR6で新設しない契約へ変更。
  - Case Dを既存bounded attempt / validation Evidenceから`stop_no_progress`を判断する形へ変更し、無意味な編集の強制を削除。
  - Case EをDoctor-onlyに固定し、Native stage-specific structured output、Codex `command_execution`、case固有Artifactの照合を追加。
  - sanitized Target生成をcaller責務、runnerを`--target-root` preflight責務へ一本化。
  - 各caseにRepository標準`scripts/new-run.ps1` / `scripts/new-run.sh`からcase-local active Runを1件作る契約を追加。
  - canonical live turnへ`--ignore-user-config`、`--ignore-rules`、`-c features.hooks=false`を追加。
  - Repository外Skillはunknown / multipleとしてfail-closeし、独自Skill Registry / isolation frameworkを追加しない方針を明記。
  - Case Bのordered list再開始を除去し、既知のMarkdown `MD029`原因を修正。
- commit:
  - canonical Plan: `cfdbafffecabc99c0e5ac1a8ee9b1c9da1518ce6`
- 未実施:
  - latest `main`取り込み。
  - PR6実装。
  - live E2E。
  - Issue #117更新 / close。
- Progress: 100% (11/11)

### 2026-09-20 16:33 (JST) 追補

- canonical Planの最終整合確認で残っていた旧契約を修正した。
- `stop_no_progress`のDoDを固定fixtureでの強制編集から、runnerが用意したbounded attempt / validation Evidenceによる停止評価へ統一した。
- 共通resume不能とCase B固有cwd切替不能のstatus境界を`blocked` / `not_executed`へ分離した。
- unsafe / destructive stopのゴールとEval説明から`stop_unsafe`単独正解の残存表現を除去した。
- Case Dの検証契約を固定Evidenceへ統一し、Case B capabilityのRisk記述をAgent-facing Browser capabilityへ更新した。
- canonical Plan追加commit: `e69cf1626bec616e7dd467f71a69bddbf9b50ea6`。



## 2026-09-20 19:50 (JST)

- 概要:
  - PR #168のheadが`f0cfe8d8a8713322ba06e78a53437c7aefb6fb4d`のまま、latest `main`より1 commit behindであることを再確認した。
  - 最新レビュー6件をIssue / Plan / Repository契約へ再照合し、すべて実装前に反映が必要と判断した。
- 反映内容:
  - Case BのBrowser capabilityを`--ignore-user-config`あり / なしで差分probeし、Evaluator自身が削除したcapabilityを`not_executed`へ変換しない契約へ修正した。
  - `CHALLENGE-BASIC-001`から固定`qa-charter.json`を定義し、既存`charterSchema`、BEFORE / AFTER working-tree snapshot、`additional_source_diff_count=0`をPlanへ追加した。
  - Case B source-free rootへ必要Reference、canonical Skill package、learner-safe specification、runbook、固定Charterを固定allowlistで追加した。
  - Case Cの`protected-data/keep.txt`を`allowed_files`へ含め、file scope内のdestructive operationとして`stop_scope_violation`との競合を解消した。
  - runnerへ必須`--routing-source-git-sha`を追加し、`evaluator_git_sha` / `routing_source_git_sha` / `target_git_sha`を分離した。
  - case-local Runを既存`--no-run-manifest` / `-NoRunManifest`で作り、`run.json`を生成しない契約へ修正した。
  - canonical Planの既知`MD012`を修正した。
- 確認結果:
  - latest `main`の差分はTraining runtime契約とWindows Stop Hook launcher調整が中心で、Repository `.codex/config.toml`に`[mcp_servers]`は存在しない。
  - `scripts/new-run.*`にmanifestless optionが既に存在する。
  - `repair-loop`正本は`stop_scope_violation`、`stop_unsafe`、`stop_needs_human`を別decisionとして持つ。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - PR本文更新。
  - Issue #117更新 / close。
- Progress: 100% (14/14)


## 2026-09-20 Case B Artifact経路の追加レビュー

- 概要:
  - 前checkpoint後にCase Bのsource-free QA rootとWorking Tree Snapshot経路を再確認した。
  - BEFORE snapshotをQA rootへコピーすると、protected patch適用後の変更path / digestをFinding確定前のAgentへ露出し得るため、source-free境界と矛盾すると判定した。
  - QA rootから`scripts/agentic-qa/contracts.ts`を除外したまま`qa-findings.json`を自由生成させると、Repository固有Machine ContractをAgentに推測させることも確認した。
- 反映内容:
  - BEFORE snapshotをpatched source workspaceだけに保持し、QA rootへworking-tree snapshot JSONを置かない契約へ修正した。
  - Agentへは3つの固定snapshot ref名だけを渡し、snapshot内容は見せない。
  - Case B QA turnは既存`grayBoxFindingsSchema`を正本としてZod 4の`z.toJSONSchema()`から一時schemaを生成し、Codex `--output-schema`でcandidate `qa-findings.json`を取得する契約へ修正した。
  - candidateは構造 / identityだけ先に検証し、source workspaceへ同期後にAFTER / comparisonを生成して既存Working Tree Snapshot validationを通した場合だけ確定Findingとする。
  - 手書きのCase B専用Machine Contract、Supporting Harness sourceのAgent-visibleコピー、schema fallbackは追加しない。
- 根拠:
  - `working-tree-snapshot.ts`は`collectWorkingTreeEntries()`を使い、Product working treeのpathとdigestをsnapshotへ記録する。
  - `.codex/runs/**`はWorking Tree Snapshotの除外prefixなので、candidate `qa-findings.json`追加自体はadditional source diffへ数えない。
  - `validateWorkingTreeSnapshots()`はfinal validation時にsnapshot file existenceとidentityを確認するため、QA turn中にsnapshot JSONをAgentへ見せる必要はない。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - PR本文更新。
  - Issue #117更新 / close。
- Progress: 100% (16/16)


## 2026-09-20 Case B capability境界の追加レビュー

- 概要:
  - Host user configを有効化してBrowser capabilityを得るfallbackを再レビューした。
  - Codex user configはMCP server / tool設定を含み得るため、Browserだけを目的にuser config全体をcanonical Case Bへ戻すとsource-free境界を保証できないと判断した。
  - source-free QA rootが非Git directoryであること、Required Evidenceのscreenshot実体確認がPlanに未固定だったことも確認した。
- 反映内容:
  - user config有効probeは診断専用へ変更し、canonical turnは全caseで`--ignore-user-config`を固定した。
  - diagnosticでBrowserが使える場合は`browser_capability_requires_user_config`、diagnosticでも使えない場合は`browser_capability_unavailable`としてCase Bを`not_executed`にする。
  - Scored用`tool-profiles/scored-v1.json`はGray-box / workspace-write契約と異なるため流用しない。
  - Case B source-free QA rootは非Git directoryのままCodex標準`--skip-git-repo-check`で起動し、`git init`やshared worktreeを追加しない。
  - Browser preflightにscreenshot / URLを追加し、screenshotを`.artifacts/agentic-qa/<case-run-id>/runner/evidence/**`のcaller指定pathへ保存できることを要求した。
  - candidate Findingの非URL Evidence refは既存official runner evidence prefix内のregular file実体へ解決できることをrunnerが確認する。
- 根拠:
  - `CHALLENGE-BASIC-001.required_coverage`は`screenshot`と`url`を要求する。
  - `assertCoverageIntegrity()`はRequired Evidence typeとref syntaxを確認するが、artifact file存在自体は確認しない。
  - `.artifacts/**`と`.codex/runs/**`は既存Working Tree Snapshotの除外対象なので、Evidence / Run Artifactはsource diff判定と分離できる。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - PR本文更新。
  - Issue #117更新 / close。
- Progress: 100% (19/19)


## 2026-09-20 Case B initial stateの追加レビュー

- 概要:
  - Case BのQA用Runtime lifecycleとsource-free QA rootのRepository adapter参照を再確認した。
  - patched Runtimeのground-truth sanityは`suspended-user`でloginを実行し、defect状態ではsessionを作成して`/`へ遷移するため、そのままQAへ渡すと開始状態が汚れる。
  - `QA_AGENT.md`と`docs/reference/agentic-qa-workflow.md`はsource-free rootに存在しない`scripts/agentic-qa/**`等を参照するため、runner-owned処理をpromptで明示しないと不要なpath探索へ進む余地がある。
- 反映内容:
  - QA用patched Runtimeでdefect sanityを確認した直後に既存`resetBrowserScenario(page, baseUrl, "suspended-user", true)`を再利用し、sessionなし、`/login`開始をrunnerが確認してからAgentへhandoffする契約へ修正した。
  - private helperをrunnerから使えない場合は挙動変更なしのnarrow exportだけを許可し、新しいreset helperは作らない。
  - QA promptへRuntime URL、prepared seed / route、Charter、learner-safe specification、runbook、Evidence prefixを渡し、snapshot、schema validation、build / start / reset / stopはrunner-ownedと明示する。
  - QA開始状態のrunner観測をcase resultへ保存し、sanity後sessionが残っていないことを検証対象へ追加した。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - PR本文更新。
  - Issue #117更新 / close。
- Progress: 100% (21/21)


## 2026-09-20 canonical Plan分割

- 概要:
  - canonical Planが995行・約6.3万文字まで増えたため、実装時の参照性を優先して分割した。
- 分割:
  - 親Plan: 目的、前提、影響範囲、実行タスク、成果物、実装時の判断順序。
  - `_01_cases-and-handoff.md`: 5.1〜5.2。固定case、handoff、Case A〜E。
  - `_02_runtime-and-contracts.md`: 5.3〜5.9。Skill観測、Target隔離、scope、Artifact reuse、result contract、Runtime。
  - `_03_validation-and-risks.md`: 7〜8。検証方法、Risk 1〜25。
- 方針:
  - 子ファイルは独立Planではなく親Planの一部とし、同じ契約を親子へ重複記載しない。
  - Plan Runの`PLAN.md` / `TASKS.md` / `REPORT.md`は現状のサイズでは分割しない。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - PR本文更新。
  - Issue #117更新 / close。
- Progress: 100% (22/22)


## 2026-09-21 統合レビュー反映

- 概要:
  - PR #168の分割後PlanをIssue #117、PR3 / PR5、既存Skill / Agentic QA / Native契約、Codex Runtimeへ再照合し、過去の個別指摘を実装前の修正単位へ統合した。
  - 個別指摘をそのまま積まず、Case B簡素化で同時に解消する問題をまとめた。
- 反映内容:
  - Case Bのsource-free QA root、非Git起動、Skill / Referenceコピー、QA root→source workspace cwd切替、Run Artifact同期を削除し、same-thread / same-cwdのpatched sanitized source workspaceでGray-box QA → explicit repairを行う契約へ変更。
  - sanitized Case Bでfull `validateTrainingContracts()`を使わず、`grayBoxFindingsSchema`、`charterSchema`、`assertCoverageIntegrity()`、`validateWorkingTreeSnapshots()`等の必要契約だけを使う方針へ変更。
  - Case B Finding照合は既存matcher semanticsのnarrow export、Gray-box seed mappingは`src/seeds/metadata.ts`を正本とする方針へ変更。
  - Case Aはimplementation成功時の`status.test.mjs`をfreezeし、repairでtestを弱める偽PASS経路を閉じた。
  - Case A / B / CはAgent自身の固定validation command実行をCodex標準`command_execution`で確認し、runner独立validationと分離。
  - sanitized Targetの固定生成手順を追加し、`routing_source_git_sha`をTarget HEAD、`source_revision_git_sha`を生成元revisionへ整理。重複する`target_git_sha`を削除。
  - canonical turnへ`shell_environment_policy.inherit=core`と`web_search=disabled`を固定。
  - Case EはDoctor command / exit code / bounded output / Artifactを正本とし、failure taxonomyの自然文parserを追加しない方針へ変更。
  - run `blocked` / case `not_executed` / `unobservable` / `fail`の分類を固定表へ統一。
  - Case B QA timeoutはCharter 900秒をHost timeoutが先に切らないよう固定し、Case Dの`harness-improvement` Semantic品質再採点を削除。
  - result contractは既存`ProcessLifecycle`と固定case checkへ限定し、汎用Rule Engine化を避ける。
- 文書構成:
  - 既存の親Plan + 3詳細ファイルで責務が収まるため追加分割は行わない。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - Issue #117更新 / close。
- Progress: 100% (30/30)


### 2026-09-21 `command_execution`終端判定の補足

- Case Cのvalidatorは`CASE-C-002`を返して意図的にnon-zero終了するため、`command_execution.status=completed`を要求しない。
- Codex JSONLの`item.completed`に含まれる最終`command_execution` itemから、caseごとの期待exit code / outputを照合する契約へ明確化した。


### 2026-09-21 統合レビュー最終反映

- 概要:
  - ここまでのレビューをIssue #117 → PR5持ち越し責務 → PR6 fixed 5 case → Runtime / scope / provenance → result / CLI exitまで再統合した。
  - 既存の親Plan + 3詳細ファイルで責務が分かれているため、追加分割は行わない。
- 反映内容:
  - Case Bで既存`matchDefectFinding()`を流用する方針を撤回し、fixed Charter / Machine Contract / oracle refs / seed / role / platform / confirmed status / official Evidence / runner ground truthの固定条件でFinding identityを判定する契約へ変更。
  - PR5がcalibrationに留めたSemantic Evalを、Case A `feature-plan` / `code-review`、Case B `exploratory-qa`、Case D `harness-improvement`のactual outputへ同じcriteria / Judge protocol / 3 trialsで適用する契約を追加。第2のrubric / frameworkは追加しない。
  - Case A reviewはfile一致だけでなく、Finding locationとrunner注入diff line rangeのoverlapを必須化。
  - `routing_source_git_sha`をfixture適用前Target HEAD、`case_baseline_git_sha`をAgent開始時HEADへ分離。
  - Product / fixtureのGit-visible snapshotと、`.codex/runs/**` / `.artifacts/**`のprefix inventoryを分離し、ignored pathへの許可外writeを検出する契約を追加。
  - 全Agent turnへGit mutation / commit / push / branch / PR操作禁止を共通promptで注入し、HEAD / detached状態をrunnerでも確認する。
  - repair / code-review / Nativeのstage-specific structured outputを型・nullabilityまで固定し、fixed validation commandはtrim + ASCII whitespace collapseのみで照合する。
  - Case Eを`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/native/windows/android-local.ps1 -Action Doctor -RunId <case-run-id>`へ統一し、`first_anomaly`はbounded output内のverbatim evidenceとしてだけ照合する。
  - result JSONを先に保存し、必須case / Artifact reuse / 許容`not_executed` / fail・unobservable不在を満たす場合だけCLI exit 0とする契約を追加。
- 対象外:
  - Workflow DSL / Session Manager / Skill Registry / 汎用Rule Engine / provenance framework / generic Finding matcher / filesystem monitor / Native taxonomy parser / 第2Semantic Eval framework。
  - PR6 Evaluator実装、latest `main`取り込み、Issue #117更新 / close、merge。
- Progress: 100% (39/39)


## 2026-09-21 15:19 (JST)

- 概要:
  - PR #168のPlan全体レビュー結果を重複排除し、実装前に必要な修正を5項目へ統合した。
  - fixed 5 case、Codex標準Runtime、既存OTel / PR4 / PR5再利用は維持し、新しいWorkflow基盤は追加しない。
- 反映内容:
  - statusを共通Runtime blocker = run `blocked`、個別process failure = `unobservable`、case-local preparation / fixture / dependency / validator不整合 = `fail`、固定外部capability不足 = `not_executed`へ固定した。
  - actual-output Semantic EvalをPR5 calibration用`expected` / `calibration_match`から分離し、既存criteria / Judge / 3 trials / aggregationだけを再利用するnarrow pathへ固定した。Semantic評価は対象stageのdeterministic validation後、後段handoff前に実行する。
  - Case BでBlack-box用`challenge.json` / `runbook.md`をAgentへ露出しない契約へ変更した。challenge / protected patch / answer keyは`source_revision_git_sha`のGit objectからEvaluatorが取得し、検証済みpatch bytesだけをcase workspaceへ適用する。
  - Case B dependency preparationを固定offline installへ一本化し、Agent workspaceの`dist/**` / `node_modules/**`をrunner独立validationへ再利用しない。case baseline + allowed Product diffだけからfresh validation workspaceを作る。
  - Case DのProduct fixture / validatorを撤回し、Product validation PASS、Product / Test差分0件、同一Harness artifact-contract failureの反復を示すrunner-owned Evidenceだけで`stop_no_progress → harness-improvement`を評価する。
  - Case Eをphysical device serial + `-RequirePhysicalDevice`を含むCanonical Doctor commandへ合わせ、first terminating failureと`first_anomaly`を照合する。raw device serialはtracked resultへ保存しない。
  - Case Bのuser config有効診断probeを削除した。canonical configでBrowser capabilityが利用できなければCase Bを`not_executed`にする。
- 過剰設計確認:
  - 追加case、Workflow Engine、Session Manager、Dependency Manager、Patch Manager、MCP Manager、汎用filesystem monitor、汎用Native log parserは追加しない。
  - 親Plan + 3詳細ファイルで責務が収まるため追加分割しない。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - live E2E。
  - Issue #117更新 / close。
- Progress: 100% (46/46)


## 2026-09-21 20:18 (JST)

- 概要:
  - PR #168の最終全体レビュー指摘を「実装結果が変わるか」で再判定し、揚げ足取りに当たる実装細部を除外した。
  - 実装前に必要な修正を5件に限定し、canonical Planへ反映した。
- 反映内容:
  - 親PlanのCase B / D / Eの低レベル重複を減らし、詳細Planを正本として参照する形へ整理した。Case Bのrepair後独立validationはfresh validation workspaceへ統一した。
  - 共通smoke probeでresume / OTelが成立しない場合だけrun `blocked`、共通probe通過後の個別process / resume / OTel failureはstage / case `unobservable`へ固定した。
  - Case Dの最初のユーザーturnを既存bounded `repair-loop`の継続可否判断へ固定し、`stop_no_progress`後の明示的な次turnだけでHarness改善候補を依頼する契約へ変更した。
  - Case B dependency preparationを`pnpm install --offline --ignore-scripts --frozen-lockfile --config.node-linker=hoisted`へ固定し、直後の`git diff --exit-code HEAD --`を必須にした。
  - Case Eの`not_executed`をnon-Windows / PowerShell unavailableだけへ限定した。WindowsではNative helper欠落または`--android-device-serial`未指定をCase E `fail`とし、serial指定後の実在性・認証・physical device判定は`Doctor -RequirePhysicalDevice`へ委ねる。
  - Doctor non-zero時の`first_anomaly`は、`==> Validate toolchain`より後の最初の非空・非`PASS:`行とのverbatim一致へ固定した。markerなしはhelper未起動の`fail`、markerあり候補なしは`unobservable`とする。
- latest main確認:
  - latest `main`: `74f6952068ad9b990adbd6a256dd82aeed1d43a7`。
  - Plan branchは2 commit behind。
  - 最新差分にはWindows Android Runbook / helper更新が含まれるが、explicit physical device serialと`Doctor -RequirePhysicalDevice`の契約は維持されている。
- 過剰設計確認:
  - protected patch temporary file配置、Case D final message取得方式などの実装細部はPlanで固定しない。
  - 追加case、Workflow Engine、Session Manager、Dependency Manager、Patch Manager、汎用Native log parser、追加Plan分割は行わない。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - live E2E。
  - Issue #117更新 / close。
- Progress: 100% (53/53)


## 2026-09-21 23:09 (JST)

- 概要:
  - ここまでの全レビュー結果を根本原因で再統合し、実装開始前に未反映の必須修正を3件へ限定した。
  - 新しい独立blockerは追加せず、既存trust boundaryを閉じる修正だけをcanonical Planへ反映した。
- 反映内容:
  - Case BのAgent-visible workspaceから、Black-box用Challenge / runbook、Instructor material、protected patch / answer keyに加え、現行sourceで`CHALLENGE-BASIC-001`のactual defect / expected behaviorを直接含む`scripts/agentic-qa/prepare-challenge.ts`、`scripts/agentic-qa/run-contract-fixture.ts`、`tests/contracts/spec-agentic-qa.test.ts`を除外する契約へ変更した。汎用answer-key scannerは追加しない。
  - 全case workspaceはsanitized Targetのtracked contentを`.git`なしで複製し、case固有runner stateを適用した後にfresh Git repositoryを作る。Agent開始時HEADはparentなしroot baseline commit 1件だけとし、detached、remote 0件、alternatesなし、tracked cleanをpreflightする。
  - canonical completion runではEvaluator working treeを既存Trigger Evalと同じ境界で`.codex/runs/**`以外cleanに固定し、`source_revision_git_sha == evaluator_git_sha`を必須にした。historical revision評価はPR6成功条件へ含めない。
  - sanitized Targetから`scripts/evals/skill-workflow-evals.ts`、`scripts/evals/run-skill-workflow-evals.ts`、`tests/repository-contract/skill-workflow-evals.test.ts`を明示的に除外する契約を追加した。
- latest main確認:
  - latest `main`: `fa930b81c891051335082174945f6d918c20722b`。
  - Plan branchは3 commit behind。
  - 最新1 commitは`@expo/xcpretty@4.4.4>js-yaml`のsecurity override / lockfile更新で、PR6設計を変えるmaterial driftは確認していない。
- 過剰設計確認:
  - 追加case、汎用answer-key scanner、Target Manager、Git履歴管理framework、Dependency Manager、Patch Manager、Workflow Engine、Native log parser frameworkは追加しない。
  - 現在の親Plan + 3詳細Planで責務分離できているため、追加分割は行わない。
- 未実施:
  - latest `main`取り込み。
  - PR6 Evaluator実装。
  - installed Codex smoke probe / live E2E。
  - Issue #117更新 / close。
- Progress: 100% (59/59)
