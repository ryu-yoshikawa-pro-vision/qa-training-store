# 実装計画

## 目的

- 承認済みPlan `docs/plans/2026-09-09_161652_issue-117-pr2-observation-contract-redesign.md` に従い、Trigger EvalのResult schema 2、initial routing observation、bounded selector、process lifecycle、comparison契約を実装する。
- 実装後に指定されたfocused test、dataset／Skill／Markdown検証、full verifyを順に実行し、全ゲートの結果を確認する。
- 検証が全てPASSした場合だけ、同一のfresh Routing TargetでEnvironment Qualification、canonical `all`、valid baseline判定まで進める。

## スコープ

### In

- `scripts/evals/skill-trigger-evals.ts`
- `scripts/evals/run-skill-trigger-evals.ts`
- `tests/repository-contract/skill-trigger-evals.test.ts`
- 実装完了時の `docs/adr/0023-trigger-eval-selector-and-query-execution-contract.md` 追補
- active Run Artifactと、検証に必要な一時的な`.artifacts`ログ

### Out

- 12 dataset YAML、query、`expected_skill`、boundary、case ID
- `.codex/hooks/**`、AGENTS、Skill description、Product code／tests
- `CASE_TIMEOUT_MS = 327_000`、generic parser／lifecycle framework、new correlation manager
- 修正版Plan本文、過去Run／過去result、旧invalid artifact
- Qualification FAIL後のcanonical実行、case retry、dataset変更、PR merge

## 前提・仮説

- dataset schema 1とdataset fingerprintは不変とする。
- `initial_skill`は最初のtrusted canonical Skill direct readだけを表し、`observed_skills`はそのSkill一件、trusted absenceでは空配列、観測不成立ではnullとする。
- candidate前のHook parse／selector不確実性はpositiveをunobservableにする。candidate後の不確実なeventは既にtrustedなinitial outcomeを上書きしない。
- trusted absenceは`turn.completed`、Hook correlation／parse、全対象PostToolUseのreliable分類、canonical read 0件が揃った時だけ成立する。
- process lifecycleはrouting outcomeと独立して6値へ写像し、trusted positive後のtimeout／turn.failedでもrouting outcomeを保持する。
- canonical `all`は同一Target、同一Codex version、同一provenanceで最初から一回だけ実行する。

## 実装順

1. pure contractと型（Result schema 2、initial-only observation、lifecycle、summary、comparison）を実装する。
2. repository contract testを新契約へ更新し、selector decision tableとfail-closed条件を固定する。
3. Hook previewのbounded tokenizer／classifier、candidate prefix、absence、lifecycle mappingをrunnerへ接続する。
4. focused testからfull validationへ上流順に実行し、失敗時はfirst anomalyを分類して最小修正後に再実行する。
5. fresh Target preflight、Qualification positive／negative、canonical `all`、valid baseline条件を順に確認する。

## 完了条件

- 実装対象4ファイルだけが意図した差分となり、dataset／Hook／Product領域に差分がない。
- focused test、dataset validation、`validate:skills`、Markdown lint、`verify`がPASSする。
- Result schema 1／unknown／欠落、不一致Codex version、fingerprint／case set／split不一致を比較境界で拒否する。
- Qualificationが新contractでpositive／negativeともPASSした場合、同一Targetでcanonical `all`の8/8 sideが成立する。
- strict Run Artifactをsanitizer／collectorで検証し、未完了事項とEvidenceを日本語で保存する。

## リスク・停止条件

- bounded selectorが安全に判定できない入力をsafe no-readへ落とさず、unreliableとしてabsenceを禁止する。
- full verifyまたはfocused testの上流がFAILした場合、後続runtime評価を開始しない。
- QualificationがFAILした場合、canonical `all`とvalid baseline判定を実行せず、FAIL理由だけを記録して停止する。
- Target状態、Codex version、source SHA、dataset fingerprint、case setが途中で変化した場合、同一Runのbaselineへ昇格しない。

## 判断メモ

- 実装は計画のCandidate Cに限定する。旧terminal duration Gateはrouting validityへ戻さず、`CASE_TIMEOUT_MS`はprocess safety capとして維持する。
- Result専用JSON schema fileは追加せず、既存TypeScript parser／comparisonとrepository contract testをschema 2の実行境界とする。
