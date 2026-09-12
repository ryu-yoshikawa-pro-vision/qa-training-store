# PR #127レビュー指摘修正 Run計画

## Objective

PR #127の4指摘を既存のPlan／ADR契約に沿って最小修正し、固定model条件で新しいTrigger Eval `all` baselineを1回取得して、commit・通常push・PR本文更新・最新head CI確認まで完了する。

## Scope

- In:
  - `feature-plan-validation-002`のqueryだけの独立化。
  - Trigger Eval runner／evaluatorの固定model provenance・比較条件化。
  - runnerのstdin error／同期throw／二重settle／残留processのfail-close。
  - 初期Plan冒頭へのADR-0023／0024優先注記。
  - 既存repository-contract／Windows argvを中心とする回帰テスト、Run Artifact、新baseline、PR metadata。
- Out:
  - `.agents/skills/*/SKILL.md`、AGENTS.md routing意味、Product code/test、Semantic Output Eval意味契約。
  - user-level Skill allowlist、auxiliary Skill schema、unknown Skill一般分類、OTel identity再設計、query全体再調整、timeout変更、Skill description変更。
  - model sweep、自動model検出framework、共通process framework、retry、rebase、force push、PR merge／close／branch削除。

## Assumptions

- 既存の `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`、ADR-0023／0024を現行契約の正本として参照し、新しい `docs/plans/` は作成しない。
- ユーザー設定 `<USER_HOME>/.codex\config.toml` の model `gpt-5.6-luna` が、この環境で確認できる正式なCodex CLI model identifierであり、runnerのcanonical modelとする。
- 新Runはstrict repair Run一つで、既存Runと旧baselineを履歴として保持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象ファイル、固定model、検証、baseline、push／CI条件が明示されている。
- 仮定してよい細部: validation queryの具体的な小変更文言は、最新mainの実在ファイル・見出しと既存検証コマンドを確認して決める。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `model`を実invocationとResult provenanceへ同一値で固定し、parse／compareへ追加すれば、model条件のない比較をfail closedできる。
- H2: `executeCodex()`のstdin失敗を一つのprocess failure settlementへ集約し、child kill／close lifecycleを既存分類へ写像すれば、Unhandled errorと正常routing誤認を防げる。
- H3: validation-002をorders以外の一ファイル・一文字列の既存Markdown修正へ分離すれば、datasetのpositive/negative・boundary契約を維持したままnormalized duplicateを除ける。

## Research Plan

- Round 1 Query: 最新origin/main、既存dataset、runner/evaluator、ADR、Windows argv／repository-contract、CLI model設定を読み、変更面と検証fixtureを確定する。
- Round 2 Query: 実装後にfocused test、full verify、fresh Target preflight、single all run、self-compare、sanitizer、PR／CIを順に確認する。
- Exit Criteria:
  - 4指摘の各修正に対応する差分と回帰検証がある。
  - 新baselineにEvaluator／Routing／dataset／Codex／model／24ケース／coverageの証跡がある。
  - 最新PR headのWeb CI／Mobile App CIが終端successである。

## Approach

- 既存Plan／ADRを先に読み、incoming diffはrouting意味変更と混同しない範囲で確認する。
- 変更を限定ファイルへ適用し、dataset validation→focused tests→repository gates→verifyの順で失敗を修正する。
- baseline開始前にEvaluator SHA・最新origin/main SHA・dataset fingerprint・Codex version・固定model・timeout・24 casesを固定する。
- fresh independent detached Routing Targetで`all`を一回だけ実行し、結果をRun Artifactへ保存する。明確なEvaluator／Target準備／model指定 defect以外は再実行しない。
- 最終差分・sanitizer後にcommit、指定refspecでpush、PR本文更新、最新head CIを確認する。

## Definition of Done

- 4レビュー指摘の最小修正、テスト、Plan注記が反映されている。
- `pnpm run eval:skills:trigger:validate`、focused tests、指定repository gates、`pnpm run verify`がPASSしている。
- 固定model `gpt-5.6-luna`、最新Routing SHA、Evaluator SHA、fingerprint、24ケース結果、process lifecycle、8 boundary side coverageを含む新baselineが旧baselineを上書きせず保存されている。
- self-compareとmodel mismatch negative comparisonがPASSしている。
- commit／通常push／PR本文／最新headの必須CI確認が完了し、PRはOPENのまま保持されている。

## Risks / Unknowns

- OTel primary契約や既存lifecycle semanticsを変更しないよう、stdin failureはrunnerのprocess failure経路だけで処理する。
- 固定model identifierがCodex invocationで拒否された場合はmodel指定不備としてrunを無効化し、原因修正・検証・条件再固定後にのみ新しい`all`を1回実行する。
- baselineが8/8でなくても実測値をそのまま保存し、結果改善目的の再実行はしない。

## Thinking Log

- 2026-09-12 23:18 JST: 前回のmain同期Runと今回の4指摘修正は別タスクであることを確認。前回Run／旧baselineは保持し、新Run一つを作成した。
- 2026-09-12 23:18 JST: ADR-0023／0024を確認し、OTel primary・Hook diagnostic-only・initial routing／lifecycle／fail-closed comparisonを変更しない方針を確定した。
- 2026-09-12 23:18 JST: Codex CLI `0.153.4`とuser configの既定model `gpt-5.6-luna`を確認。credential等はRun Artifactへ転記しない。
- 2026-09-12 23:28 JST: validation-002は最新mainに実在するcartのAC-CART-003文言を一箇所だけ修正するdirect implementation queryへ変更。train-002のorders見出し変更、expected_skill、boundary、他23ケースは変更しない。
- 2026-09-12 23:29 JST: Trigger Eval invocation argsの固定model・既存process flags、provenance parse、model mismatch fail-closed、stdin failure once処理のfocused testsを追加。Windows期待値の初回失敗は既存quote契約との不一致だったため、テスト期待値だけを修正して再実行した。
- 2026-09-13 00:00 JST: 初回`pnpm run verify`はcontracts 504 passed／3 skipped後の`serve-web-dist` Temp cleanup EPERMで終了した。対象suite単独23/23 PASSを確認後、未使用importを除去してfull verifyを再実行し、全工程（contracts 504 passed／3 skipped、web/docs/spec build）PASSとなった。EPERMは今回差分のassertion failureではないと分類した。
- 2026-09-13 00:02 JST: `origin/main`は`3c5e35ed42712574eb9d89051820c9e27f137a16`で不変、Evaluator source HEADは`d15d1d10189e9b97a7a1ae43ec70e478f78ce7e5`として固定した。incoming diffを確認し、追加mergeなしで、main側の既存Semantic Output変更と今回のTrigger Eval修正を分離した。
- 2026-09-13 00:02 JST: fresh detached Routing Targetのclean／SHA一致／Git common-dir・absolute git-dir非共有／objects alternatesなし／canonical Skill 6/6 readableを確認した。Target内に現在のcase id、dataset fingerprint、`codex.skill.injected`の持込みはなく、現在のbaselineを汚染するtrigger-eval datasetも0件だった。baselineはこのTargetで`all`を一回だけ実行する。
- 2026-09-13 00:02 JST: baseline固定条件をdataset fingerprint `89e15bc1a36ea6b7e769f8f84d1f56c99f331acbf2ccd1d2cbf3d5405ee7b267`、split `all`、24 cases、timeout 327000 ms、Codex CLI `0.153.4`、model `gpt-5.6-luna`、Evaluator `d15d1d1`、Routing `3c5e35e`として記録する。旧fingerprintは再利用しない。
- 2026-09-13 02:04 JST: fresh Targetでのsingle `all`は24/24 casesを完走したが、runnerは8 required boundary sides中7 observedのためexit 1となった。実測はoutcome `pass=15`、`false_negative=2`、`unobservable=7`、lifecycle `completed=5`／`timed_out=19`で、欠落は`exploratory-qa-vs-android-native-local-validation/exploratory-qa`のみ。結果を破棄・改善目的で再実行せず、partial baselineとして保存する。
- 2026-09-13 02:04 JST: baseline provenanceはEvaluator `d15d1d10189e9b97a7a1ae43ec70e478f78ce7e5`、Routing `3c5e35ed42712574eb9d89051820c9e27f137a16`、dataset `89e15bc1a36ea6b7e769f8f84d1f56c99f331acbf2ccd1d2cbf3d5405ee7b267`、Codex `0.153.4`、model `gpt-5.6-luna`、split `all`で一致した。baselineのself-compareは24 cases全件でpass、model mismatch negativeは`identical model`拒否でPASSした。
