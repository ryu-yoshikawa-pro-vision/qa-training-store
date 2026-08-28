# Phase 0 / PR 1 child Plan作成 Run計画

## Objective

- Master Plan `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` の Phase 0 を、最新 `origin/main` に対して read-only で再検証する。
- RA-M1〜RA-M6、RA-M7、RA-M8、RA-L1 の Current State、Evidence / SSOT、Primary owner、後続扱いを確定する。
- 再検証結果だけを反映した PR 1 child Plan を保存し、同じ branch で後続実装できる OPEN PRを作成する。今回のRunでは実装を開始しない。

## Scope

### In

- Repository規約、Master Plan、Audit baseline、Current implementation / workflow / docs / validator / testの read-only 確認。
- `origin/main`（baseline `927dce6debff045957d15ff76cd1ab254c3720ca`）を基準とした Audit後の変更確認。
- RA-M1〜RA-M6のCurrent fact / canonical contract drift再判定、RA-M7 regression確認、RA-M8 grammar照合、RA-L1 navigation / completion影響確認。
- PR 1 scope確定、`docs/plans/2026-08-28_*.md` の child Plan作成、Run Artifact更新。
- Plan-only validation、commit、明示refspec push、PR作成、Issue #72の進捗更新。

### Out

- `src/**`、`app/**`、`e2e/**`、`maestro/**`、`docs/curriculum/**`、`training/workbook/**`、`scripts/validate-curriculum.ts`、`tests/**`、workflow、package / lockfile、Master Plan、過去Run Artifactの変更。
- Product behavior、Formal Test / CI Gate、Curriculum本文、Workbook、validator、test、Specificationの実装修正。
- PR 1実装、PR 2以降、Refactoring、dependency更新、unrelated cleanup。

## Assumptions

- `origin/main`をCurrent mainのcanonical baselineとして扱う。
- 既存 `fix/current-documentation-ssot-repair` は固有コミットを持たず `origin/main` の祖先だったため、安全なfast-forward相当で利用する。
- Issue #72は進捗インデックス専用であり、詳細Findingはchild PlanとRun Artifactを正本とする。
- GitHub CLIの認証とrepositoryへのpush / PR / Issue更新権限が利用可能である。

## Questions / Ambiguity

- 必ず質問する不透明点: 現時点ではなし。RA-M8のcontract不一致など、調査で判明するblocking questionは推測せずOpen questionsへ記録する。
- 仮定してよい細部: JST timestamp、read-only evidence commandの具体的な組み合わせ、child Planの見出し配置。
- 未回答の重要質問: なし（Phase 0の調査結果により追加される可能性がある）。

## Hypotheses

- H1: RA-M1〜RA-M6の一部または全部は、Audit後のPR / CI / Native更新を踏まえて再判定が必要であり、Current fact repairとしてboundedに整理できる。
- H2: RA-M7のcanonical path修正は既にCurrent mainへ含まれ、regressionはない。
- H3: RA-M8はWorkbook、README、validator、contract testのCurrent contractから一意に確定できる。4者の不一致があればPR作成を停止する。

## Research Plan

- Round 1: Current baseline、PR #61 merge、Audit baseline `4ed5374d...`からCurrent mainまでの差分、関連Current SSOTを固定する。
- Round 2: RA-M1〜RA-M8 / RA-L1をFinding単位でEvidence、Disposition、owner、follow-up、stop conditionへ落とし込む。
- Round 3: PR 1 scopeをchild Planへ反映し、Plan / Run Artifactの整合とPlan-only validationを確認する。
- Exit Criteria:
  - 各指定FindingについてCurrent StateとEvidenceが記録され、PR 1対象 / 除外 / 後続が明確である。
  - RA-M8 canonical grammarがCurrent contract間で一致し、またはblocking questionとして停止されている。
  - child Plan、Run Artifact、commit、push、OPEN PR、Issue #72更新がscope内で完了している。
  - 実装変更がなく、Sanitizer residual findingが0件である。

## Approach

1. 最新 `origin/main`、PR #61、対象 branch、working tree、Runを固定する。
2. Audit baselineとCurrent mainの差分を読み、Current implementation / workflow / docs / validator / testを直接照合する。
3. FindingごとにPR 1で扱うCurrent Fact / Canonical Contract repairだけを確定し、設計変更・behavior変更・Formal Gate変更はstop conditionへ分離する。
4. child PlanをTEMPLATE / feature-plan規約に従って保存し、既存ファイルを変更せずにvalidationする。
5. 最終diffを確認してcommit、明示refspec push、OPEN PR作成、Issue #72更新後に停止する。

## Definition of Done

- 最新 `origin/main`をbaselineに対象 branchが一致している。
- Phase 0でRA-M1〜RA-M6、RA-M7、RA-M8、RA-L1をCurrent evidenceに基づいて再判定している。
- PR 1 scopeがboundedに確定し、実装者が追加判断なく着手できるchild Planが `docs/plans/` に保存されている。
- `pnpm run lint:markdown`、`git diff --check`、Sanitizer Write / CheckがPASSし、residual findingが0件である。
- 変更はchild Planと新規Run Artifactだけで、Product / Curriculum / validator / test / CI等の実装変更がない。
- 指定branchへcommit / pushし、base `main`、head `fix/current-documentation-ssot-repair`、state OPEN、draft falseのPRを作成し、Issue #72を指定状態へ更新して停止する。

## Risks / Unknowns

- RA-M8のvalidator / Workbook / README / contract testが一致しない場合、canonical grammarを推測せずPR作成を止める。
- Current factの修正に設計判断、Product behavior、Formal CI Gateの変更が必要な場合、PR 1へ混ぜずOpen questions / stop conditionとして記録する。
- 既存branchやremoteが調査中に変化した場合、branch safety確認をやり直し、期待branchと一致しなければcommit / pushしない。
- GitHub Actionsが開始しても、今回の完了条件はPR作成までであり、CI完了待ちやCI結果記録のための追加commitは行わない。

## Thinking Log

- 2026-08-28 07:42 JST: 初期working treeはclean。対象branchは既に存在し、固有差分0・`origin/main`の祖先だったため、再作成せず安全なfast-forward相当で最新baselineへ揃えた。
- 2026-08-28 07:43 JST: PR #61はMERGED、merge commit `237a2be587fcd5755bd2bd42087ccc7b07e9aed8` は `origin/main` の祖先であることを確認した。
- 2026-08-28 07:44 JST: 新規Run `20260828-074252-JST` を `task_type=plan` / `workflow_level=standard` で初期化した。既存のactive runは別タスクのため再利用しない。
