# PR2 observation / evaluation contract redesign Plan作成

## Objective

- Issue #117 PR2が測定する対象を「single-intent queryに対するinitial Skill routing」と再定義し、task completion latencyと混同しない観測・評価契約をPlanとして保存する。
- 現行runner、selector、scoring、dataset、Skill description、`AGENTS.md` routing、`CASE_TIMEOUT_MS`、canonical `all`は今回変更しない。

## Scope

- In:
  - 現行evaluator、Hook record、24 caseの既存証跡、過去Plan/ADR/Runの再確認。
  - terminal-bound、first canonical read、hybrid、routing-phase/window候補の比較。
  - 推奨するrouting observation、absence、lifecycle、selector、comparison、canonical rerun条件の設計。
  - `docs/plans/` の新規Plan、active Run Artifact、PR #127の次対応記載。
- Out:
  - evaluator/runner/selector/scoringの実装、dataset/query/expected/boundaryの変更。
  - Skill description、`AGENTS.md`、Hook実装、timeout値、canonical `all`、case retry、PR merge。

## Assumptions

- ユーザー指定どおり、今回の成果物は実装者が追加判断なしに着手できる設計Planとする。
- Hookにnativeなrouting decision eventが現時点でないため、first canonical `SKILL.md` readは「initial routing evidence proxy」として扱い、内部選択と同一とは主張しない。
- absenceはpositive presenceより強い終了条件を要する。根拠のないquiet windowは設けない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。今回の目的、禁止事項、保存先、canonical停止条件はユーザー指示とRepository規約で確定している。
- 仮定してよい細部: 新contractの識別子は実装時に固定文字列として定義し、過去artifactに後付けしない。現行dataset fingerprintとcase setは不変とする。
- 未回答の重要質問: Hostが将来native structured path/routing eventを提供する時期は不明だが、現実装は現在のHook dataをfallbackとして扱い、event導入時に優先する拡張点だけを残す。

## Hypotheses

- H1: routing evidenceとterminal completionを分離すれば、positive Skill read後のtimeoutをrouting `unobservable`へ誤変換せず、PR2の目的に近い結果を得られる。
- H2: 24 caseの既存Hook evidenceでは、canonical readはprompt後かつterminal前に生じ、異なるSkillのread chainは観測されていないため、first readをPR2のinitial proxyとする最小契約を検証できる。
- H3: current Hookにstructured path fieldはなく、現時点ではboundedな`Get-Content` direct-read recognizerが必要である。ただしgeneral PowerShell parserを導入しなくても実装できる。

## Research Plan

- Round 1: `docs/PROJECT_CONTEXT.md`、最近のADR、直近Run、current evaluator、Hook/config、dataset、既存Planを確認する。
- Round 2: Environment Qualificationのnegative/positive、旧Runのinvalid canonical artifact、Target Hookの保存範囲から、presence/absence/multiple-read/late-readを区別する。
- Round 3: 候補A〜D、schema最小化、PR2/PR6境界、comparison provenance、tests、canonical前提を設計する。
- Exit Criteria:
  - 現行契約の失敗原因と、Host latencyだけでは説明できないselector driftを証拠付きで説明できる。
  - positive/absence/lifecycleの終了条件と、各`outcome`のdecision tableが一意である。
  - 実装対象、非対象、validation、rollback/invalidation、canonical rerun条件が明記される。

## Approach

- 先に目的と観測限界を固定し、次に候補比較、推奨案、実装/テスト/再実行条件の順でPlanへ記録する。
- Plan保存後に自己レビューと既存Plan validator、`git diff --check`、Run Artifact sanitizerを実行する。
- 最後に新PlanとRun Artifactだけをbranchへ保存し、PR本文のGate FAILを保持したまま次対応Plan pathを追記する。
- 標準フロー: `repo mapping -> evidence review -> contract design -> Plan save -> self-review -> validation -> artifact/PR handoff`

## Definition of Done

- 新Planが`docs/plans/{JST timestamp}_issue-117-pr2-observation-contract-redesign.md`へ保存され、候補A〜D、推奨案、decision table、schema、tests、canonical前提、scope guard、rollback/invalidationを含む。
- implementation、canonical `all`、dataset/query/Skill/routing/timeout変更を実施していないことをscope checkで確認する。
- active Runの`PLAN.md`/`TASKS.md`/`REPORT.md`が日本語で更新され、sanitizer Checkがresidual 0である。
- PR #127の既存Gate FAIL・valid baseline未取得を消さず、次の再検討として新Plan pathだけを追記する。
- branch safetyを再確認して、Plan/Run Artifactをnon-force pushし、remote headとPR本文を再確認する。

## Risks / Unknowns

- first readは内部routing decisionの直接観測ではない。Planではproxyと明示し、native eventがない限り「readした事実」の範囲を越えて精度を主張しない。
- absenceを早期確定するとfalse pass/false negativeを作るため、trusted `turn.completed`とHook全体の整合を要求する。
- Hook command shapeの揺らぎを個別文字列列挙で追い続けると再発する。structured evidenceを優先し、fallbackはcanonical direct readのbounded grammarに限定する。
- 新contractは過去invalid artifactと意味が異なる。provenance contract markerなし/不一致の比較をfail closedし、新contract後の最初のvalid `all`だけをPR3 baselineにする。
- 240秒のEnvironment Qualification gateはterminal-bound前提に結合している。実装時はrouting validityとprocess healthを分離し、値を単に延長しない。

## Thinking Log

- 2026-09-09 16:16 JST: branch `refactor/117-pr2-trigger-eval-baseline`、PR #127 OPEN、HEAD `11c9037`、`origin/main` `f7cc237`を確認した。作業treeは新Run未追跡以外のsource差分なし。
- 2026-09-09 16:18 JST: current evaluatorは`timed_out`を最初に判定し、Hook上のSkill readをterminal後の結果から捨てる。Hook recordは`tool_input_preview`文字列中心で、native structured pathはない。
- 2026-09-09 16:20 JST: 24 caseの既存Target Hookをread-onlyで再集計し、zero=2、one=20、same-Skill duplicate=2、distinct-Skill chain=0を確認した。first readはterminal前だが、内部selectionの証明ではないためproxyとしてのみ採用する。
