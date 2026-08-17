# Plan

## Objective

- PR #32（`feat/agentic-qa-knowledge-feedback-loop`）のレビュー指摘を、Simple-firstの範囲で修正する。
- `EXP-20260817-001`をFormal Experimentから除外し、Canonical Location／ID／Reference ConventionとAcceptance／Readiness Validationだけを残す。
- 修正後のBranchをValidationし、通常のcommit／pushまで完了する。

## Scope

- In:
  - `docs/experiments/EXP-20260817-001-record-traceability.yaml`の明示的な削除。
  - `docs/experiments/README.md`、ADR-0018、PROJECT_CONTEXT、history、derived implementation planの意味整合。
  - `.codex/runs/20260817-222040-JST/`のPLAN／TASKS／REPORT／run.jsonのReview Fix追記・最終状態更新。
  - このRunの標準Artifact、最小必要Validation、Sanitizer、scope確認、commit／push。
- Out:
  - 新しいExperiment、Experiment Framework／Validator／Registry／Schema／Dashboard／Database。
  - Product、Specification、Formal Regression、Curriculum、Skill、Agentic QA Harness実装。
  - Official Scored capabilityのRepository側回避、force push、rebase、reset、履歴改変。

## Assumptions

- PR headはローカルBranchと一致する `96ed9e64462c27f3ce460cb60edace837eeb314c`、baseは `fc9e497817e6c3cff8d89ebd7b37244e759e9484`。
- Userが提示した11項目をactionable review findingとして扱い、全件を今回のbounded repairで反映する。
- `docs/experiments/README.md`とADR-0018は維持し、Formal Experimentが必要なQA／Training Questionが選ばれた時だけ将来YAMLを作成する。
- GitHub CLI `gh`は利用不可だが、PR metadata／commentはGitHub connectorで確認でき、既存Branchへの通常pushはGit remoteで実行する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。削除対象、修正内容、Validation、commit／pushがユーザー指示で固定されている。
- 仮定してよい細部: Review Fixのcommit messageは `fix: clarify experiment readiness boundary` とする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: EXP YAMLを除外し、README／ADR／Context／HistoryをReadiness状態へ揃えると、PRのFormal Experiment誤分類が解消する。
- H2: GAP-02は通常のDocumentation／ADR変更とAcceptance Validationで十分であり、別Experimentは不要である。
- H3: Official ScoredのTrusted Evidence不足は今回RunのFailureではなく、Baseline GAP-01として分離できる。

## Research Plan

- Round 1 Query: PR metadata／レビュー状態、現差分、対象Documentation／Run Artifactの意味を確認する。
- Round 2 Query: allowed filesだけを修正し、Formal Experiment未実行・Readiness成立・Official Scored別Gapを各Artifactで確認する。
- Exit Criteria:
  - EXP YAMLがBranch差分から消え、README／ADR／Context／HistoryがReadiness状態で整合する。
  - 旧REPORTの履歴を変更せず、末尾にCorrectionを追記する。
  - `run.json`がpassed／completed、primary_failure_category null、EXP YAMLなしになる。
  - 全品質ゲート、Sanitizer、git diff checkが成功する。
  - commit／通常push後にBranch headとCI起動を確認する。

## Approach

- Review findingをmust_fixとしてtriageし、allowed filesを先に固定する。
- `apply_patch`でDocumentation／Run Artifactを最小修正し、EXP YAMLは明示的Delete patchで除外する。
- 既存のValidationを指定順で実行し、失敗時はroot causeを分類してbounded repairで止める。
- `git status`／`diff --check`／`diff --stat`でscopeを確認してから明示的にstage／commit／pushする。
- 標準フロー: `PLAN -> review triage -> bounded repair -> validation -> sanitize -> scope check -> commit/push -> PR/CI check`

## Definition of Done

- EXP YAMLが削除され、README／ADR／PROJECT_CONTEXT／history／derived planがExperiment Readiness／Formal Experiment未実行を示す。
- 旧Run REPORTにCorrectionがappendされ、過去の実行記録は改変されていない。
- 旧Run／現RunのTASKS・run.jsonが最終状態と一致し、Knowledge／Promotionはnoneである。
- Product／Spec／Formal Regression／Curriculum／Skill／Harness実装に変更がない。
- 指定ValidationとSanitizerが成功する。
- 明示的なcommitと通常pushが成功し、PR #32のheadとCI起動を確認する。

## Risks / Unknowns

- EXP YAMLの削除範囲を誤るリスクがあるため、対象Pathを確認してDelete patchを一度だけ行う。
- Official Scoredを今回Failureへ誤分類しないよう、Trusted Evidence不足をGAP-01として別記録する。
- push後CIが未完了／失敗の場合はPASSへ変換せず、CI状態をRemainingとして報告する。

## Thinking Log

- 2026-08-18 08:03 JST: 新しいReview Fix taskなので、完了済みの前Run `20260817-222040-JST`は再利用せず、新しいRun `20260818-080338-JST`を初期化した。
- 2026-08-18 08:05 JST: PR head `96ed9e6`はローカル／origin Branchと一致。GitHub connectorはreview threadなし、CodeRabbitはreview limit commentのみ、`gh` CLIは未導入だった。User提示の11項目を正式な入力findingとする。
- 2026-08-18 08:06 JST: 全findingをmust_fixとして分類したが、変更範囲はDocumentation／対象Run Artifact／EXP YAML削除に限定する。Formal Experimentや新Infrastructureは追加しない。
