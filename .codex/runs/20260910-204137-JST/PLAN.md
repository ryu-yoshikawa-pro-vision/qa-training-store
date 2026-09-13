# Plan

## Objective

- 既存Plan `docs/plans/2026-09-10_192747_trigger-eval-positive-blocker-remediation.md`へ、レビュー指摘2件だけを反映する。
- Host由来absolute pathのrealpath失敗をrunner-level failureへ昇格させず、`unreliable`へfail-closeする契約を固定する。
- Environment Qualificationの開始前提と、negative→positive→Environment Qualification PASS→canonicalの実行順を明記する。

## Scope

- In:
  - 上記既存Planの最小修正。
  - `.codex/runs/20260910-204137-JST/`のPlan修正Run Artifact。
  - PR #127本文への修正済みPlan pathと実装未着手の最小追記。
- Out:
  - source、selector、tests、ADR、PROJECT_CONTEXT、history、dataset、query、Skill、Hook、timeoutの変更。
  - Qualification、Probe、canonical `all`、retry、valid baselineの実行。
  - 既存Plan以外のPlanや過去Run Artifactの変更。

## Assumptions

- 開始時のbranch、PR head、remote状態を正とし、開始時に確認した`157b6825165937bcdeeed702280101e314968334`を基準にする。
- A判定、Target-aware bounded absolute recognition、candidate prefix、既存schema／dataset／timeout契約は承認済み設計として維持する。
- `realpathOrFail()`はpreflight必須path用、Host pathはnon-throwing classification用という責務分離をPlanに固定する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。レビュー指摘、許可ファイル、DoD、検証範囲が明示されている。
- 仮定してよい細部: realpath取得不能のOS依存fixtureは、安定再現できなければ存在しないabsolute pathのfail-close testで責務を固定する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Host pathをuntrusted observationとして扱い、exists／regular file／realpath／Target containment／canonical exact matchを全条件必須にすれば、path failureは`unreliable`へ安全に閉じられる。
- H2: Qualificationの開始前提と実行順を分離して記載すれば、negative/positiveの結果を開始条件とする循環を除去できる。

## Research Plan

- Round 1 Query: 対象Planのabsolute path、`realpathOrFail`、Qualification、canonical、tests記述を全文確認する。
- Round 2 Query: Plan差分を自己レビューし、A判定、compound非対応、既存契約、変更禁止範囲を再確認する。
- Exit Criteria:
  - H1/H2をPlan内の明示契約と順序で支持できる。
  - 必須test予定とrunner-level failure境界が記録される。
  - source/tests/ADR等に差分がなく、Plan-only検証が全PASSする。

## Approach

1. 開始状態、PR、Project Context、最近のADR／Run、対象Planを確認する。
2. review findingsを`must_fix`として1 bounded repair iterationに分類し、許可ファイルを固定する。
3. 対象Planだけへfail-close契約、責務分離、追加tests、Qualification順序を最小差分で反映する。
4. Plan自己レビュー後、lint、Prettier、diff、evaluation schema、sanitizer、strict collectorを実行する。
5. Planと新Run Artifactだけをcommitし、対象branchへ明示refspecでnon-force pushしてPR状態を確認する。

## Definition of Done

- 対象PlanにHost absolute pathのuntrusted／non-throwing／`unreliable`契約、`realpathOrFail`責務分離、必要test予定がある。
- Qualification開始条件とnegative→positive→Environment Qualification PASS→canonicalの順序が循環なく明記される。
- A判定、Target-aware recognition、compound非対応、既存契約、変更禁止範囲が維持される。
- source/tests/ADR/PROJECT_CONTEXT/history等の禁止対象に差分がない。
- Plan-only validationがPASSし、Run Artifactがsanitized・collector済みである。
- commit、non-force push、local／remote／PR head一致、PR #127 OPENを確認する。

## Risks / Unknowns

- リスク: `realpathOrFail()`をHost候補へ誤用するとpath不存在がrunner failureになる。対策として、PlanでHost候補に`existsSync`、`statSync`、`realpathSync`、`try/catch`のfail-close処理を必須化する。
- リスク: Qualificationの開始条件と結果判定が再び混線する。対策として、開始前提リストと実行順のコードブロックを別に記載する。
- 未知: realpath failureの安定fixtureがOS依存になる可能性がある。存在しないpathのnon-throwing testを最低限の責務証明とする。

## Thinking Log

- 2026-09-10: 指摘2件はcorrectness／safety contractの`must_fix`。allowed filesは既存Plan、新Run Artifact、必要最小限PR本文に限定した。
- 2026-09-10: A判定とTarget-aware mappingは変更せず、Host input failureとTarget integrity failureだけを明確に分離する方針を採用した。
