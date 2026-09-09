# Plan

## Objective

- Issue #117 PR4「Deterministic Output Eval」を正本Planどおり実装し、対象PR #126の指定branchへcommit・pushする。
- `feature-plan`はcanonical template由来のrequired H2 presenceだけを判定し、`exploratory-qa`は既存の`qaFindingsSchema`と`assertCoverageIntegrity`を直接再利用する。

## Scope

- In:
  - `.agents/skills/feature-plan/scripts/validate-plan-output.ts`
  - `tests/contracts/skill-output-eval.test.ts`
  - 標準Run Artifact（`.codex/runs/20260906-194925-JST/`）
  - Plan指定のtargeted test、`pnpm run verify`、commit後の`git diff --check main...HEAD`、指定refspec push
- Out:
  - N/A 4 Skillのgrader / fixture / test
  - Skill本文、Product Code / Runtime、CI workflow、dependency / lockfile、`.codex/agents/**`
  - PR4 adapter、CLI、runtime registry、common result schema / Rule Engine、generic Markdown parser
  - PR merge / close

## Assumptions

- 正本Planの具体的仕様を実装判断のSSOTとする。
- Run Artifactはリポジトリ運用上の正式成果物として保存し、実装scopeとは分離して記録する。
- 新規dependencyは不要で、既存のTypeScript / Zod / Vitest構成で完結する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象branch、Plan、検証コマンド、commit・push先が明示されている。
- 仮定してよい細部: Planが許容する最小のline-by-line fence state実装、test-local factoryの具体的なTypeScript記述。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `origin/main`とのdirect Contract driftはなく、Planの6 Skill固定分類を変更せず適用できる。
- H2: 既存validatorの型とcanonical templateを直接利用すれば、追加schema / adapterなしでTest A〜Gを実装できる。

## Research Plan

- Round 1 Query: 現在branch、working tree、PR head、latest `origin/main`を確認し、Plan指定のdirect Contractを比較する。
- Round 2 Query: 既存grader/test、canonical template、`qaFindingsSchema`、`assertCoverageIntegrity`のimport/typeを確認し、最小差分を実装する。
- Exit Criteria:
  - direct Contract driftの有無が記録されている。
  - Test A〜Gの仕様と変更scopeがコードへ反映されている。
  - targeted test、repository gate、commit後whitespace check、push後clean確認が完了している。

## Approach

- preflight結果をRunへ記録する。
- 既存コードとテストのimport/typeを確認する。
- `validatePlanOutput`をpure functionとして実装し、Test A〜Dをcanonical template中心に追加する。
- Test E〜Gをtest-local fresh factoryで追加し、既存validatorを直接呼ぶ。
- 実装前後のdiffで禁止事項とscopeを自己レビューする。
- targeted test → `pnpm run verify` → commit → `git diff --check main...HEAD` → pushの順で検証する。

## Definition of Done

- PlanのTest A〜Gとfence / H2 / configuration guard仕様を満たす。
- `validatePlanOutput`の返却値が`{ valid, missingHeadings }`だけで、filesystem I/O / CLI / generic parserを持たない。
- N/A Skillへ実装を追加せず、既存validatorを直接再利用する。
- targeted test、`pnpm run verify`、commit後`git diff --check main...HEAD`がPASSする。
- commitを指定branchへpushし、PRをmerge / closeせず、最終working treeがcleanである。

## Risks / Unknowns

- fence opener / closerの境界を過剰実装するリスク: Plan Section 5の最小仕様とTest Cの期待値に限定する。
- `parsed.data.coverage`ではなくraw inputを渡すリスク: Test E/Gでsuccessful parse後の値だけを使用する。
- Run Artifactや一時ファイルがscopeに混入するリスク: implementation diffと運用Artifactを分離して最終監査する。
- verify失敗時は最初の異常を特定し、今回変更に起因する安全な最小修正だけを行う。

## Thinking Log

- 2026-09-06 19:49 JST: `origin/main`をfetchし、PR #126のhead branch / base / stateを確認した。current branchは指定headと一致し、開始時working treeはcleanだった。
- 2026-09-06 19:49 JST: Plan指定の6 direct Contractはcurrent branchと`origin/main`で同一blobだった。N/A 4 Skillの直接sourceも同一で、stable machine-readable Output schemaの新設を示すdriftは確認されなかった。固定分類を維持する。
