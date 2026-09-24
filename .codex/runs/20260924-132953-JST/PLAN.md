# Plan（計画）

## Objective（目的）

- PR #168 head `9786ba4854e9cf5b6ca4b37c609d5447feec2ea5`へ指定されたWorkflow E2E trust boundary、provenance、success gate、canonical invocationの修正を実装する。
- focused test、`test:repository`、`verify`、diff check、sanitizerを実測する。
- 実装修正を通常commit / pushし、PR最新headの必須CIを確認する。
- fresh Targetを新Evaluator SHAから作り、必要なmanual detach後にcanonical runを1回だけ実行して結果を確定する。Host policy / sandboxを緩和しない。

## Scope（対象範囲）

- In: Workflow / Trigger runner、Workflow / Trigger repository contract tests、指定canonical Plan節、今回のRun Artifact。
- Out: Skill / Product / Case semantics、schema version、Hook、config、sandbox、Host policy、user config、merge、force push、同revision retry。

## Assumptions（仮定）

- PR開始headは`9786ba4854e9cf5b6ca4b37c609d5447feec2ea5`、PR #168 OPEN、worktree clean。
- PR baseは`2f5353b63414ace7278155d525e0e2cf074d630b`。`origin/main`は`9cef8501c2b19e1764892b0c17ee50318fa90b97`で1 commit先行し、その内容はIssue #132文書 / Run Artifactのみ。PRはGitHub上mergeableであり、無断rebaseしない。
- 直近canonical runはHost Runtime blockerを実測済み。今回はpolicy / sandboxを変更しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。修正範囲と停止条件はユーザー指示で確定。
- 仮定してよい細部: 既存命名とテストfixture styleに従う。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: `git diff --exit-code`のstatusを直接評価すればtracked diffをfail-closeできる。
- H2: 既存Trigger target guardとporcelain NUL形式でWorkflow provenance / source clean境界を共用できる。

## Research Plan（調査計画）

- Round 1: remote PR / main / worktree / CI / current Plan / runner / tests確認。
- Round 2: 小さな実Git fixture回帰test、focused・repository validation、sanitizer、PR lifecycle。
- Exit Criteria: specified test / gates pass or blocking failure is classified; no forbidden policy change or retry.

## Approach（進め方）

- Case B diff判定、Target isolation / output boundary / provenance、rename-safe source guard、stage-consistent success gate、canonical command例の順に修正し、それぞれ回帰testを加える。
- 実装後に指定validationとself-reviewを行い、source修正 commit / pushとCI確認を実施する。
- 新Evaluator SHAからTargetを生成し、manual detachが必要ならユーザーへ依頼する。preflight後のcanonical runは一回のみ。
- canonical resultを正本にRun Artifactをsanitizationし、artifact-only commit / push、PR本文とCIを更新する。

## Definition of Done（完了条件）

- 指定回帰test、`test:repository`、`verify`、`git diff --check`がPASSし、sanitizer residual 0。
- source修正は通常commit / pushされ、最新head必須CIを確認する。
- 新SHAからfresh Targetを作り、全preflight通過後にcanonical runを1回だけ実行する。Host blocker時は回避・retryしない。
- Artifact-only最終記録、PR本文、最新head CIを確定する。

## Risks / Unknowns（リスク・未知点）

- Target isolationや出力境界が不成立ならcanonical runnerを開始しない。
- Host workspace root変更またはTarget detachが必要な場合は手動操作を依頼する。
- Host Runtime blockerが継続してもpolicy / sandboxを変更せず実測結果を記録する。

## Thinking Log（判断記録）

- 2026-09-24: PR headは指定値のまま。origin/mainのみIssue #132の文書 / Run記録commitが先行している。PRはmergeableのためbranch historyを無断変更せず指定差分を適用する。
