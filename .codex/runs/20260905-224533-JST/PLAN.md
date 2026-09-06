# Plan

## Objective

- 正本PlanとPR #123のレビュー指摘に従い、既存PR1のsemanticを保ったまま6件の仕様逸脱・CI不整合を最小差分で修正し、検証、Run Artifact更新、sanitization、commit、push、Actions確認まで完了する。

## Scope

### In

- 正本PlanのMarkdown list syntaxだけを修正する。
- `scripts/validate-skills.ts` と `tests/repository-contract/validate-skills.test.ts` のimage target検証契約を修正する。
- `repair-loop` packageの`needs_human`即時停止とactionable signal AND bounded scopeを復元する。
- `exploratory-qa` packageへportable Gray-box boundaryを移し、`QA_AGENT.md`はScenario Shop固有mappingだけにする。
- Android Native packageとRepository runbookのPrepare / Release APK Buildをconditional semanticsへ戻す。
- 指定されたvalidator、repository、Markdown、typecheck、targeted contract、最終`pnpm run verify`を実行する。
- Strict Runの`PLAN.md`、`TASKS.md`、`REPORT.md`、`evaluation.json`、machine-managed `run.json`を更新し、sanitization後に保存する。

### Out

- Trigger Eval、description最適化、Deterministic/Semantic/Workflow E2E Eval。
- 新Runtime / Workflow Engine / repair runner / QA runner、AST / Markdown parser、routing parser、Git解析、schema registry、adapter framework。
- 他Skillのついで改善、`.codex/agents/**`、`scripts/agentic-qa/**`、Native helper、product code、dependency / lockfile、CI gate緩和、timeout恒久延長。
- Planの意味・文言・順序の再設計、Skillのfrontmatter変更、PR2以降の先取り。

## Assumptions

- 現在branchとPR #123のheadが一致する限り、ユーザーが指定した対象branchで作業する。
- 6件は明示されたreview findingであり、actionable repair signalを満たす。今回のallowed file setを先に固定し、範囲外の分類は実装しない。
- 正本Planの画像依存契約は、通常linkと同じinline relative file dependencyとして扱う。

## Questions / Ambiguity

- 必ず質問する不透明点: なし（レビュー指示が対象、条件、禁止事項、完了条件を明示済み）。
- 仮定してよい細部: 既存文書の見出し内での最小限の追記位置、既存fixture builderの再利用、既存runbookの具体commandの保持。
- 未回答の重要質問: なし。

## Hypotheses

- H1: image除外分岐を除き、既存relative target処理を再利用すれば、Planの最小validator責務でimageの存在・boundary・fragment/query file partを満たせる。
- H2: repair-loop、Gray-box、Androidの不足は、既存package/reference/root mappingの意味を補う限定的な文書修正で解消でき、runtimeや新抽象化は不要である。

## Research Plan

- Round 1 Query: branch、PR、Plan、Working Agreement、直近Run、対象ファイルの現状とdiffを確認する。
- Round 2 Query: 修正後に指定targeted validation、scope、semantic invariant、CI結果を確認する。
- Exit Criteria:
  - 6件すべてのroot cause、変更file、semantic restoration、validation結果をREPORTへ記録する。
  - `pnpm run verify`、`git diff --check`、sanitization、push後の指定Actions結果がPASSまたは根拠付き分類になる。

## Allowed files / expected scope

- `docs/plans/2026-09-05_164300_issue-117-pr1-skill-package-portability.md`
- `scripts/validate-skills.ts`
- `tests/repository-contract/validate-skills.test.ts`
- `.agents/skills/repair-loop/SKILL.md`
- `.agents/skills/repair-loop/references/repair-workflow.md`
- `.agents/skills/exploratory-qa/SKILL.md`
- `.agents/skills/exploratory-qa/references/workflow.md`
- `QA_AGENT.md`（Scenario Shop mappingが実際に必要な場合のみ）
- `docs/reference/agentic-qa-workflow.md`（責務重複の修正が実際に必要な場合のみ）
- `.agents/skills/android-native-local-validation/SKILL.md`
- `.agents/skills/android-native-local-validation/references/windows-android-workflow.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`（conditional semanticsの重複が実際に必要な場合のみ）
- `.codex/runs/20260905-224533-JST/**`

## Approach

1. 現状確認と修正対象のbefore semanticを記録する。
2. Plan lint、Validator、repair-loop、exploratory-qa、Androidの順に、各findingのallowed fileだけを最小差分で修正する。
3. Validator変更後のrepository/targeted validationを実行し、全修正後に指定順序のtargeted validationと最終`pnpm run verify`を実行する。
4. frontmatter freeze、禁止path、dependency/product変更、semantic invariants、diffを再確認する。
5. Run Artifactを評価・sanitizationし、branch safetyを再確認してcommit、通常push、PR/Actionsを確認する。

## Definition of Done

- 6件のreview findingがすべて修正され、レビュー前のsemantic behaviorが復元されている。
- image relative targetのPASS/FAIL、fragment/query、package/repository boundaryが既存validator経路で確認できる。
- `needs_human`即時停止、repair entryのAND条件、portable Gray-box boundary、conditional Android Prepare/Buildがpackage側で明示されている。
- frontmatter `name` / `description`、Black-box Scored、既存evidence、Native helper、`.codex/agents/**`、product/dependencyが無変更である。
- `pnpm run validate:skills`、`pnpm run test:repository`、`pnpm run lint:markdown`、`pnpm run typecheck`、targeted tests、最終`pnpm run verify`がPASSする。
- `git diff --check`、Run Artifact sanitizationがPASSし、通常commit/pushとpush後Actions確認が完了する。

## Risks / Unknowns

- Plan lint修正が文意へ波及するリスク: list indentation / blank lineのsyntaxだけを変更し、差分を目視確認する。
- package/root責務分離でsemantic driftするリスク: trigger、MUST/MUST NOT、inputs、outputs、evidence、approval boundary、stop conditionsをbefore/after確認する。
- CIが未完了またはbaseline failureとなるリスク: job単位でhead SHAと原因を分類し、差分起因のみ最小修正する。

## Thinking Log

- 2026-09-05: ユーザー指定の6件は明示的なactionable review findingsであり、repair-loopのentry条件を満たす。今回のrepair iterationではscopeを先に固定し、scope単独をtriggerにしない契約そのものも復元対象とする。
