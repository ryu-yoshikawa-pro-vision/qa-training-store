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
