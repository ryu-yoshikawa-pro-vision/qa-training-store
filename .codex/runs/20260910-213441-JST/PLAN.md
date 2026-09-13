# PR #127 positive Qualification blocker remediation 実装Plan

## Objective

- 正本Plan `docs/plans/2026-09-10_192747_trigger-eval-positive-blocker-remediation.md`に従い、Routing Target内のcanonical SkillへHostが行ったabsolute single direct `Get-Content`を、Target-awareな実体一致で`canonical_skill`として観測できるようにする。
- Host由来pathの失敗はselector-levelでfail-closeし、relative read、exact negative compound、candidate prefix、Result schema 2を維持する。
- static gateとEvaluator SHA固定後、fresh independent TargetでNegative→Positiveを各1回実行し、両方PASSした場合だけ同一Targetでcanonical `all`と8/8 validityを判定する。

## Scope

- In:
  - `scripts/evals/run-skill-trigger-evals.ts`のTarget root context受け渡しとbounded absolute canonical path recognition。
  - `tests/repository-contract/skill-trigger-evals.test.ts`のabsolute path、fail-close、candidate prefix、preflight回帰テスト。
  - 実装確定後の`docs/adr/0023-trigger-eval-selector-and-query-execution-contract.md`追補。
  - Project Contextの恒久契約追補が必要な場合の最小更新とhistory。
  - strict Run Artifact、実装前後のstatic validation、fresh Target Qualification、条件付きcanonical、PR/Git反映。
- Out:
  - `scripts/evals/skill-trigger-evals.ts`、dataset、query、expected_skill、boundary、Skill description、Hook、`CASE_TIMEOUT_MS`、Result schema、dependencies、Product code。
  - absolute pathのmachine固有literal、substring判定、一般filesystem/path framework、一般PowerShell compound parser。
  - Qualification後のselector修正、query tuning、retry、別Target交換、canonicalの再実行。

## Assumptions

- ユーザー指定の正本Planに未回答のblocking questionはなく、実装へ進める。
- `assertTargetPreflight`が返す`target_root`はresolved Routing Target rootとしてselectorへ渡す。
- Host absolute pathはuntrusted inputであり、canonical pathの存在・regular file・realpath・Target containment・6 Skillとのresolved path完全一致・一意mappingをすべて満たした場合だけtrusted candidateとする。
- OS依存でrealpath取得不能を安定再現できない場合は、特殊fixtureを追加せず、存在しないpath等のnon-throwing fail-close testで責務を固定する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。正本Planが対象、DoD、停止条件、変更関数、validation順序を具体化している。
- 仮定してよい細部: 既存Node `fs`/`path` helperとoptional context引数を用い、公開APIのrelative呼出し互換性を維持する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: raw positive evidenceのabsolute `feature-plan/SKILL.md`は、resolved Target rootと6 canonical resolved pathの完全一致で最初のtrusted candidateになる。
- H2: Host pathの不存在・stat/realpath失敗・directory・Target外・別fileはrunnerを落とさず`unreliable`へ倒せる。
- H3: candidate後のunsupported compoundは既存のfirst trusted candidate契約を上書きせず、Negativeのexact compoundとrelative recognitionは回帰しない。

## Research Plan

- Round 1 Query: 正本Plan、既存Run/raw evidence、source、contract test、ADR、dataset fingerprint、branch/PR状態を確認する。
- Round 2 Query: focused test、static gate、fresh Target preflight、Qualification raw Hook evidence、canonical resultのschema/provenance/side coverageを確認する。
- Exit Criteria:
  - H1〜H3を実装testとruntime evidenceで支持または停止条件により反証する。
  - static gate、Run schema、sanitizer、collector、Git/PR状態を記録する。
  - Qualification FAIL時は後続を実行せず、canonical/8-side/baselineを未実行として明記する。

## Approach

- sourceの現行relative/compound/candidate契約を固定してから、absolute判定だけを小さく追加する。
- `targetRoot?`を`classifyDirectPath`から`prepareSignals`、`evaluateCases`まで必要な範囲だけ透過させる。
- Host path判定はtry/catch内のnon-throwing処理に限定し、`realpathOrFail()`はpreflight必須pathだけで使う。
- focused testを最初に実行し、first anomalyをbounded repairしてからdataset、Skill、Markdown、Prettier、diff、`pnpm run verify`を実行する。
- static gate PASS後にsource/test/ADRをcommitしてEvaluator SHAを固定し、fresh TargetでNegativeを1回、PASS時のみPositiveを1回実行する。
- 両方PASSした場合だけ同じTarget・同じSHA・同じdataset/Codex条件でcanonical `all`を一度だけ実行し、Result schema 2、24 cases、8/8 side observable、valid baseline条件を判定する。

## Definition of Done

- source/test/ADR（必要な場合のみProject Context/history）がPlanのscope内で実装され、禁止範囲に差分がない。
- focused contract test、dataset validation、`validate:skills`、Markdown lint、Prettier、`git diff --check`、`pnpm run verify`がPASSする。
- evaluation schema validation、sanitizer Write/Check、strict collectorがPASSする。
- Evaluator SHA、fresh Targetのdetached/clean/分離/期待Routing SHA/6 Skill/dataset不存在/output/他process条件を記録する。
- Negativeを1回、Negative PASS時のみPositiveを1回実行し、実際のselector evidenceに基づきEnvironment Qualificationを判定する。
- 両方PASSならcanonical `all`を同じTargetで1回だけ実行し、24/24、8/8、provenance、valid baselineを証拠に基づき判定する。FAIL/停止なら未実行後続を明記する。
- Run Artifact、PR本文、対象branchのcommit/non-force push、PR checks状態を実結果どおりに最終化する。

## Risks / Unknowns

- Target contextを公開helperへ暗黙付与するとmachine固有absolute pathを許可し得るため、contextなしabsoluteは必ず`unreliable`とする。
- lexical suffixだけで判定すると別file、symlink/reparse、Target外pathを誤認するため、resolved realpathの完全一致を要求する。
- Host inputの`existsSync`/`statSync`/`realpathSync`失敗をthrowするとrunner-level failureへ誤昇格するため、candidate判定はfail-closeする。
- 正本Planと現行実装に不整合が現れた場合は契約を推測変更せず、Runへ事実と停止理由を記録する。
- canonicalが長時間またはunobservableになった場合も、同Run中にretryやselector修正をしない。

## Thinking Log

- 2026-09-10 21:34 JST: 正本Plan全文、開始branch/PR/HEAD、最近のRun/ADR/source/testを確認した。現在のsourceにはnegative exact compoundとdetached preflightが既にあるため、今回の実装差分はabsolute target-aware recognitionとその回帰testに限定する。
- 2026-09-10 21:34 JST: current HEADはユーザー指定の直前確認SHA `4c2d5b5e59cb37764c8264946cd2eda3d728fc6d`と一致した。Plan本文の旧記載`c901c5a...`は過去時点の記録であり、実行時のHEAD/PR状態を正とする。
