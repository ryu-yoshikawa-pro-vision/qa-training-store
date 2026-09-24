# Plan（計画）

## Objective（目的）

- PR #168のsourceStatusOutsideRunArtifacts誤判定を最小修正し、修正後の新Evaluator revisionでcanonical live Workflow E2Eを1回だけ実行する。

## Scope（対象範囲）

- In: scripts/evals/run-skill-trigger-evals.ts、tests/repository-contract/skill-trigger-evals.test.ts、今回のRun Artifact、PR #168本文。
- Out: runGit()の共通挙動、Workflow Evaluatorの他の処理、Plan、Hook、config、sandbox、CI workflow、canonical invocation controls。

## Assumptions（仮定）

- 開始時PR headはe894b977596791250b6023292f1638d2571ddc46で、mainとの同期merge以降、対象helperと対象testは変更されていない。
- 既存のsanitized Target生成手順とAndroid実機を利用できる。Targetは修正後のEvaluator revisionから新規生成する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: existing repository command、Run Artifact sanitization、branch-safe Git手順を使う。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: runGit()のtrimによりporcelain先頭のstatus列が失われ、tracked unstaged Run Artifactをsource変更と誤判定する。
- H2: sourceStatusOutsideRunArtifacts()だけでraw porcelainを処理すれば、tracked / untracked Run Artifactを許可し、source変更を引き続き拒否できる。

## Research Plan（調査計画）

- Round 1 Query: 現在のPR head、既存CI、helper、関連Git fixture test、過去canonical resultを確認する。
- Round 2 Query: raw porcelainからRun Artifact-only、source-only、mixed変更を検証する回帰testを実行する。
- Exit Criteria:
  - tracked unstaged Run Artifactが実Gitで再現され、helperが空配列を返す。
  - untracked Run Artifactは許可し、source変更は混在時も返す。
  - focused / repository validation、CI、canonical preflightを確認し、新Evaluator revisionのcanonical runを1回実行する。

## Approach（進め方）

- repair-loopのbounded flowで原因と範囲を固定する。
- runGit()の挙動を保持し、対象helperのみraw stdoutを使うよう変更する。
- 実Git fixture testとWorkflow E2E contract testを実行してから通常commit / pushする。
- CI成功後、新revisionのtracked Git objectからfresh Targetを作成し、manual detach後にpreflightしてcanonical runを1回実施する。
- resultをsanitizationし、Run Artifactだけをcommit / pushしてPR本文と最新head CIを確認する。

## Definition of Done（完了条件）

- 回帰testと指定quality gatesが成功し、実装修正を通常commit / pushする。
- 最新head CIが成功する。
- fresh Target preflightが成功し、ユーザーmanual detach後にcanonical runnerを1回実行する。
- resultとRun Artifactがsanitizedされ、PR本文を実測結果へ更新する。
- 成功条件未達の場合もresultを改変せずblockerを報告する。

## Risks / Unknowns（リスク・未知点）

- common smokeまたは後続caseがHost Runtime / capability制約でblockedする可能性がある。結果にかかわらず同じEvaluator revisionではretryしない。
- manual detachはユーザー操作が必要なため、Target準備後に一時停止する。

## Thinking Log（判断記録）

- 現行helperはrunGit()のtrim済みstatusを受け、固定幅status列のindexを1ずらして読む。局所raw stdout取得が最小修正となる。
- PR headは指定SHAからmain同期mergeに進んだ。対象helper / tests / hooks / config / PR6 Planに変更はなく、誤判定修正は現行コードにも適用可能。
