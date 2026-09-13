# Qualification blocker remediation 実装Plan

## Objective

- PR #127 / Issue #117 PR2のQualification blockerを、実測されたcompound PowerShell commandのexact-shape bounded認識とdetached Target preflightの強制で解消する。
- static gateを全てPASSさせた後、fresh independent Targetでnegative / positive Qualificationを実行し、両方PASSした場合だけcanonical `all`とvalid baseline判定へ進む。

## Scope

- In:
  - `scripts/evals/run-skill-trigger-evals.ts`の実測compound一形状だけの`safe_no_read`認識。
  - `assertTargetPreflight`でのdetached HEAD強制。
  - `tests/repository-contract/skill-trigger-evals.test.ts`のselector・absence・preflight回帰契約。
  - static validation、fresh Target、Qualification、条件付きcanonical、Run Artifact、ADR-0023、PR本文の実結果反映。
- Out:
  - 一般PowerShell / pipe / semicolon / variable parser、query / dataset / Skill / Hook / timeout / dependency変更。
  - `skill-trigger-evals.ts`のResult schema 2・lifecycle・comparison変更。
  - Qualification FAIL時のcanonical実行、retry、query tuning、別Target交換。

## Assumptions

- 正本Planは`docs/plans/2026-09-10_073717_issue-117-pr2-qualification-blocker-remediation.md`であり、案A（実測shape限定）を採用する。
- negative queryは`package.json に記載されている package name だけを確認して答えてください。`から変更しない。
- routing source SHAは新CLI optionを追加せず、Target作成時のRun preflightで明示比較し、Result provenanceで再確認する。
- TargetはEvaluatorとは別の親directoryに一度だけfresh cloneし、Qualificationからcanonicalまで同一状態で再利用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: exact compound内部の空白は既存tokenizerに合わせた限定表現だけをtestで固定する。
- 未回答の重要質問: なし。Hostが未承認shapeを返した場合は`unreliable`としてQualificationを停止する。

## Hypotheses

- H1: `$pkg = Get-Content -Raw -LiteralPath .\\package.json | ConvertFrom-Json; $pkg.name`の固定compound全体を認識すれば、canonical Skill treeとの非交差を説明でき、trusted absenceを成立できる。
- H2: detached HEADをrunnerが自動強制すれば、attached Targetのrouting source混入を実行前に排除できる。
- H3: compound内のcanonical read、path差替え、追加reader、suffix、variable、operator差替えを拒否すれば、safe判定のfalse passを防げる。

## Research Plan

- Round 1 Query: 現行selector / preflight / repository contract test / raw negative evidence / dataset fingerprintを再確認する。
- Round 2 Query: 実装後にfocused test、dataset・Skill・Markdown・Prettier・diff、`pnpm run verify`、fresh Target preflight、Qualificationの順で検証する。
- Exit Criteria:
  - H1-H3ごとにtestまたはruntime evidenceの支持・反証がある。
  - static gateがPASSし、Qualificationの判定とcanonical実行可否がRun Artifactへ記録される。
  - canonicalを実行した場合は24 cases、8/8 side、Result schema 2、provenance、valid baseline条件を全て確認する。

## Approach

- 既存tokenizerを維持し、generic grammarへ拡張せず、anchoredな固定compoundをtokenizerより先に認識する。
- preflightへdetached HEAD検査を追加し、他の分離・clean・Skill・dataset・artifact契約を維持する。
- 契約テストを追加して近接shapeを拒否し、focused testから上流順に品質ゲートを通す。
- static gate PASS後にsource/ADR/testをcommitしてEvaluator SHAを凍結し、fresh Targetを作成する。
- Qualificationはnegativeを一回、PASS時のみpositiveを一回実行する。どちらかがFAILならcanonicalを実行しない。
- 標準フロー: `PLAN -> TASKS -> 実装 -> focused/static validation -> freeze -> Qualification -> 条件付きcanonical -> REPORT`

## Definition of Done

- exact compoundのみが`safe_no_read` / reliable / `skill=null`となり、canonical readを含む近接case等が`unreliable`となる。
- trusted absenceのterminal・Hook correlation/parse・全対象event reliability・canonical read 0件の契約が維持される。
- attached TargetがpreflightでFAILし、detached Targetが期待SHA一致を含めてPASSする。
- focused contract test、dataset validation、Skill/Markdown validation、Prettier、diff check、`pnpm run verify`がPASSする。
- Qualification結果、条件付きcanonical結果、8/8 side、valid baseline判定、sanitizer/collector、PR/Git状態が実結果どおり記録される。

## Risks / Unknowns

- exact-shapeを広げすぎるとcanonical Skill readを含むcompoundがfalse absenceになるため、固定token・固定path・固定operator・固定suffix以外は拒否する。
- Hostのnegative shapeが再び未承認なら、selectorやqueryをその場で広げず、Qualification FAILとして停止する。
- Target SHA / detached / clean / artifact分離が崩れた場合、runtime結果をbaselineへ昇格しない。
- long-running positiveはprocess lifecycleとrouting outcomeを混同せず、candidate prefix成立をrouting判定として扱う。

## Thinking Log

- 2026-09-10 12:26 JST: 開始branch `refactor/117-pr2-trigger-eval-baseline`、PR #127 OPEN/base `main`/head一致、HEAD `4f98350a05bc2f230221a792d6f2707421a2d532`、`origin/main` `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`、作業ツリーcleanを確認した。
- 2026-09-10 12:26 JST: Planの案A、固定negative query、Qualification FAIL時canonical禁止、dataset / schema / timeout / Hook非変更を実装判断として採用した。
