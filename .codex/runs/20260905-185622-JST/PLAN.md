# Plan

## Objective

- `docs/reference/curriculum-self-study-review.md`へ、Issue #98 H98-2の既存Outcome分類を再利用するcriteriaを1項目だけ追加する。
- PR #116の指定branchへcommit / pushし、新HEADでRequired validation、manual check、GitHub checks、PR本文、Issue #72を同期する。

## Scope

- In:
  - Repository contentは`docs/reference/curriculum-self-study-review.md`の1ファイル。
  - Run Artifactはiteration / validation / 完了checkpointの記録として更新可。
  - PR #116本文とIssue #72はcurrent state同期のため必要最小限に更新する。
- Out:
  - P1-6本文、他Lesson、README、Plan、validator、contract source、workflow、Product / Spec、Finding DB、scoring、checklistの結果記録欄。
  - Pre-change audit、全Finding再監査、PR #115へのアクセス、merge / close。

## Assumptions

- P1-6のOutcome定義（Bug / UX / Suggestion / 未確定）を語彙と意味の正本として再利用する。
- H98-2は既存契約の漏れ補完であり、新規taxonomyや新規Findingではない。
- PR #116はOPENで、current branchがPR head branchと一致していることをmutation前提とする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、許可ファイル、修正内容、validation、同期先が指定済み。
- 仮定してよい細部: 既存の「専門的なFindingの成立条件とEvidence」へcriteria bulletを追加する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: checklistにOutcome分類criteriaがないことがH98-2の残存漏れであり、既存P1-6の4定義を1 bulletへ再利用すれば解消できる。
- H2: 文書1ファイルのMarkdown差分で、指定されたlocal validationと既存contract validationを維持できる。

## Research Plan

- Round 1 Query: 現行branch / PR head、対象checklistの構造、P1-6のOutcome定義、PlanのH98-2契約を確認する。
- Round 2 Query: 変更後の差分、criteria-only境界、P1-6整合、required validation、GitHub checks、PR / Issue同期を確認する。
- Exit Criteria:
  - H1を支持する現行文書・Plan根拠がある。
  - 変更fileが許可scope内で、4分類とBugのBR / AC・再現条件・Evidence、Evidence不足時の未確定を確認できる。
  - validation / remote stateに未解決blockerがない。

## Approach

- repair loopを1 iterationに限定する。
- `must_fix`: H98-2のSelf-study checklist criteria欠落。
- `should_fix` / `defer` / `reject`: なし。
- 対象fileへ既存P1-6用語の1 bulletを追加し、局所差分を確認する。
- 指定順のlocal validation、manual check、commit前branch safety確認、明示refspec push、push後のcurrent head確認を行う。
- GitHub CI成功後、PR #116本文とIssue #72をcurrent SHAへ最小同期する。

## Definition of Done

- `docs/reference/curriculum-self-study-review.md`にOutcome classification criteriaが1項目追加されている。
- Bug / UX / Suggestion / 未確定、BugのBR / AC・再現条件・Evidence、Evidence不足時の未確定が確認できる。
- criteria-only境界を維持し、対象Repository contentが1ファイルだけである。
- `format:check`、`lint:markdown`、`validate:curriculum`、`git diff --check`、`test:contracts`がcurrent headでPASSする。
- P1-6整合のmanual check、PR #116の新HEAD CI確認、PR本文 / Issue #72同期が完了する。
- PR #116はOPEN・未merge、PR #115には触れていない。

## Risks / Unknowns

- 既存checklistのcriteria配置を誤ると新section・結果記録欄と解釈されるため、既存Finding / Evidence section内の1 bulletに限定する。
- GitHub checksは外部一時障害の可能性がある。FAIL時は最初の異常と今回のMarkdown差分との因果を切り分け、必要な最小対応以外は行わない。

## Thinking Log

- 2026-09-05 JST: P1-6本文には4分類定義が既にあり、checklistには再利用criteriaがないことを確認した。H98-2の意味を新taxonomy化せず、既存sectionの1 bulletで補完する。
