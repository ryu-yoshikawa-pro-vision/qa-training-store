# Plan（計画）

## Objective（目的）

- PR #168 / Evaluator `0afaa392c9a647876de100f3daf36946e61a9489` のcanonical live Workflow E2Eを最終検証する。

## Scope（対象範囲）

- In: remote PR head / Plan確認、標準経路のRun Artifact作成、Evaluator tracked Git objectからのsanitized sibling Target生成、fresh root commit / detached preflight、Case E用serial準備、canonical runnerを1回だけ実行、result評価とsanitization、Run Artifactのみのcommit / push、PR本文更新、最新head CI確認。
- Out: Evaluator / Product / Test / Plan / Hook / config / CI code変更、G10やsandbox回避、retry、merge、Issue #117 close、branch削除、force push。

## Assumptions（仮定）

- PRの現在head `0afaa392c9a647876de100f3daf36946e61a9489` がcanonical Evaluator SHA。`9ea92af0b58ac9d1ab747359894c97e8b30fa746`以降はRun Artifact 4ファイルのみ。
- `--source-revision-git-sha` は実Evaluator HEADと一致させる。
- Targetは同じ親workspace直下の新規兄弟ディレクトリへtracked Git objectだけから生成する。
- 前回Targetは再利用・変更しない。今回のTarget名は`qa-training-store-target-2`。
- 同revisionのcanonical runnerはこのセッションで最大1回。起動後は結果にかかわらず再実行しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: Case Eに渡せる既知のphysical Android serialが準備できない場合はrunを開始しない。
- 仮定してよい細部: `gpt-5.6-luna`、既存Planのstatus / case / semantic / retry contractをそのまま使用する。
- 未回答の重要質問: なし。環境serialを用意できるかはcanonical開始前に判定する。

## Hypotheses（仮説）

- H1: Targetの`git add --all --force`はTargetをcwdにした通常commandとしてG10を通過する。
- H2: 共通Runtime smokeと固定5 caseがPlan契約どおり実行でき、CLI exitはPlanの総合成功条件と一致する。

## Research Plan（調査計画）

- Round 1 Query: PR remote head、origin/main、behind、worktree、9ea以降のsource diff、4 Plan、既存runner / sanitizer入口を確認。
- Round 2 Query: TargetのGit metadata、required / forbidden path、serial準備可否、runner result、sanitizer residualを確認。
- Exit Criteria:
  - runner前提を全て満たした場合だけcanonical runnerを1回実行する。
  - 実行不可または失敗はそのまま記録し、成功扱いに変換しない。
  - 未解決のblockerと最終PR/CI状態を記録する。

## Approach（進め方）

- remote状態とPlanを確認後、標準Runを作成し、pinned Evaluator objectからdenylistを適用したTargetを作る。
- Target Git setupは`git init -b workflow-e2e-target`、Target cwdでの`git add --all --force`、固定process-local commit identity、root commit、detached HEADの順で実行する。
- すべてのTarget / Evaluator preflightとCase E用serial準備がpassした場合に限り、1回だけlive runnerを実行する。
- runnerのresultを手編集せず、Run Artifactをsanitizerへ通し、source差分がRun Artifactのみならcommit / push、PR本文と最新head CIを更新する。

## Definition of Done（完了条件）

- PR #168の最新headをEvaluator SHAとして固定し、sanitized Targetのprovenance SHAを確定する。
- canonical runnerを高々1回実行し、CLI / run / case / Semantic結果を記録する。起動できない場合も理由と未実行状態を記録する。
- Run Artifact sanitizer residual 0、Evaluator source変更0、PR本文とpush後CI状態を確認する。
- `run_status=completed`かつPlanの全case成功条件が成立する場合だけcanonical live検証完了と報告する。

## Risks / Unknowns（リスク・未知点）

- Target Git mutationがG10に拒否される可能性がある。その場合は拒否commandと状態を記録してrunを開始しない。
- Case E serialを準備できない、またはCanonical DoctorでHost / device blockerになる可能性がある。serialを捏造せず、Doctor後の再試行もしない。
- common smoke / capability / Semantic failureはrunner resultへそのまま残し、retryしない。

## Thinking Log（判断記録）

- PR #168はOPEN。remote head / local Evaluator HEADは`0afaa392c9a647876de100f3daf36946e61a9489`で一致し、`origin/main`にbehind 0、worktree clean。
- `9ea92af...`からの差分は`.codex/runs/20260923-105517-JST/**`の4ファイルだけ。今回のEvaluator SHAは最新PR headとする。
- G10拒否を隠したり回避したりせず、指定されたTarget cwdと通常Git commandを使用する。
## 対応中に確定した状態

- Target exportはGit archiveの直接抽出で行う。Windows tarのUnicode失敗でできたpartial Targetは再利用しない。
- detached HEAD mutationはtool policyによりapproval拒否され、AskForApproval=Neverのため実行できない。G10 bypassや別Git mutationを使わず、canonical runnerを起動しない。