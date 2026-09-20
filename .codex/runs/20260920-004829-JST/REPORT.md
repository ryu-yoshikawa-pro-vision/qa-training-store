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

