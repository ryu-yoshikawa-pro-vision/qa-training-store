# Plan

## Objective

- 正本Plan `docs/plans/2026-09-05_pr4a_curriculum_self_study_remediation.md` に従い、PR #116のCurriculum Core / Native specialization / Reference / self-study remediationを実装し、current headで検証してPR本文を同期する。

## Scope

- In:
  - Task 0 freshness確認、Task 1 Pre-change audit、finiteなCurriculum Finding確定、`docs/spec/**` text audit coverage、Instructor migration map、Terminology Decision Table。
  - Hard Gate後のconfirmed `fix_now` FindingだけのboundedなCurriculum / Reference変更。
  - `docs/reference/curriculum-self-study-review.md`の再利用可能checklist。
  - Plan指定のMarkdown / Curriculum / contract validation、manual learner-route walkthrough、PR #116本文更新、必要なtracking Issue更新。
  - 標準Run Artifact（日本語、append-only REPORT、sanitizer）。
- Out:
  - PR #115の変更・commit・push・本文／状態／review／comment変更。
  - `docs/spec/**`の実変更、Product behavior、Seed / Clock / Test Control / address lookup、Formal Test Strategy、PR 5のTraining runner / workflow / Artifact contract、Security Curriculum、新SSOT / Finding DB / scoring基盤、rename / migration、Curriculum全面rewrite。

## Assumptions

- PlanにBlocking questionはなく、Current Repositoryの既存conventionで細部を決める。
- `03_instructor-reference.md`はValidator-requiredなRepository-required support assetだがLearner Required pathではない。
- `docs/spec/**`はGit-tracked Markdown / textだけをcoverage対象とし、実変更はPre-change auditで`PR 4B` Findingが確定した場合のみ別PRへ分離する。
- PR #116のbaseとPlanのbaseは同じ`main` SHAであり、作業branchをそのまま使用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし（正本PlanでBlocking questionなし）。
- 仮定してよい細部: exact wording、既存Lesson内の最小配置、Run Artifactのcheckpoint時刻はRepository conventionとPlanのTerminology Decision Tableで決定する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Current `main`ではPR #103のCommon / Native specialization / Minimum Evidence contractが維持され、Task 1で不要なcontract変更は発生しない。
- H2: Pre-change auditで得るP0/P1とDoD成立に必要なbounded P2だけで、既存Lesson構造を保った局所修正として実装できる。
- H3: `docs/spec/**` text auditは用語・表記・内部整合・semantic safetyに限定でき、`PR 4B`実装をPR #116へ混ぜずにDispositionを確定できる。

## Research Plan

- Round 1: Current branch / PR #116 / latest `main`、Master Plan、PR #103、ADR、直近Runを確認する。
- Round 2: Validator required-file listを母集団にCurriculum全文、selected Native specialization、Instructor Reference、Workbook / Training入口、`docs/spec/**` text contractを監査し、Findingをfinite化する。
- Round 3: Hard Gate後にFinding owner単位でbounded修正し、PR指定validation、manual route walkthrough、scope / freshness / self-reviewを行う。
- Exit Criteria:
  - Task 0 / Task 1 / Hard GateがRun Artifactへ記録され、Curriculum FindingとSpecification FindingのDispositionが有限かつ明示されている。
  - `fix_now`だけが実差分へ反映され、P0/P1 blockerがなく、defer / out-of-scope境界が説明できる。
  - Required validationとmanual walkthroughがcurrent headで実行され、PR本文がcurrent state・SHAと一致する。

## Approach

- PlanのExecution orderを厳守し、Hard Gate前はCurriculum / Referenceを変更しない。
- 問題がない対象へ人工的なFindingを作らず、audit coverageとFinding記録を分離する。
- 実装は1 file ≒ 1 remediation passを基本に既存構造・既存SSOTを再利用し、必要なら最小のlanguage ruleだけを`00_learning-design.md`またはREADMEへ保存する。
- Plan指定以外のvalidator / contract変更は行わない。PR #115は完了後にread-onlyで一度だけcross-checkする。
- 標準フロー: `Task 0 -> Task 1 -> Hard Gate -> Task 2/3/4/5/6 -> Task 7 -> freshness/self-review -> PR本文/Issue同期 -> Run完了`

## Definition of Done

- 正本PlanのDefinition of Doneを一項目ずつ` satisfied / not applicable / blocked `で最終判定する。
- Required automated validationがcurrent headでPASSし、未実行・failure・environment blockをPASSへ繰り上げない。
- PR #116はOPEN・未mergeのまま、current head SHA、audit coverage、Finding / Disposition、変更範囲、Validation、manual walkthrough、blocker状態を日本語本文へ同期する。

## Risks / Unknowns

- 古い候補・過去PRをCurrent Findingと誤認するリスクは、current `main`と現行ファイルを再照合して防ぐ。
- Self-study改善が文章量増加やInstructor-only知識の移植に膨張するリスクは、各Findingのminimum fixとPR #103境界で制限する。
- Specの意味変更・Product deviation・PR 5 / Security scopeが発生した場合は推測で修正せず、依存するFindingだけをblocked/deferへ分離する。
- PR本文・Run Artifactのローカル絶対pathは作業完了前にSanitizer Write / Checkで除去する。

## Thinking Log

- 2026-09-05 JST: branch、PR #116 base/head、latest `main`を確認し、Plan記載baseと一致した。PR #115はまだread-only確認していない。
- 2026-09-05 JST: Master Plan §16、§5.8、§5.9、§18、§20、§21、§24、ADR-0014/0019/0022、PR #103の固定契約を確認した。Hard Gate前のCurriculum / Reference実装禁止を維持する。
