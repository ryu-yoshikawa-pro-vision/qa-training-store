# Plan（計画）

## Objective（目的）

- PR #168のcanonical live Workflow E2Eを、開始時に固定したEvaluator 598b776f1561ea46a25b77f4b1b31e9994bb4f2cと新規sanitized Targetで1回だけ実行し、実測結果を確定する。

## Scope（対象範囲）

- In:
  - PR / branch / origin/main状態とEvaluator revisionの固定。
  - canonical Plan再確認。
  - 今回専用Run Artifactと兄弟sanitized Targetの作成。
  - tracked Git objectのexport、固定除外、fresh root repository、detach以外のTarget preflight。
  - Android physical deviceのread-only確認。
  - ユーザーdetach後のread-only preflight、canonical runner 1回、結果確認。
  - Run Artifact sanitization、artifact-only差分確認、完了後の通常commit / push、PR本文更新、最新head CI確認。
- Out:
  - Evaluator / Product / Test / Plan / Hook / config / CI変更、G10やsandboxの変更、fallback / bypass、retry、merge、Issue close、branch削除、force push。

## Assumptions（仮定）

- 開始時PR headがcanonical Evaluator SHAとして固定され、canonical run完了まで変わらない。
- source_revision_git_shaにはEvaluator checkout HEADを渡し、Target HEADをrouting_source_git_shaとして区別する。
- 同一revisionのcanonical runnerは1回だけ実行する。

## Questions / Ambiguity（質問・曖昧性）

- ユーザーによるTarget detach完了を待つ。追加の要件判断はない。

## Hypotheses（仮説）

- H1: sanitized TargetはPlanの固定除外後945 tracked filesとなり、fresh parentless rootとしてrunnerのTarget contractを満たす。
- H2: Android実機が認証済みdevice状態なら、Case Eへserialを渡せる。
- H3: runner結果はPlan上のcommon smoke / fixed five case / provenance契約に従う。

## Research Plan（調査計画）

- Round 1 Query: PR head、origin/main、9ea92af以降の非Run Artifact差分、4つのcanonical Planを確認。
- Round 2 Query: Target export inventory、fresh Git metadata、physical device、Evaluator source cleanlinessを確認。
- Exit Criteria:
  - manual detach後preflightが全件PASSした場合だけcanonical runnerを1回起動する。
  - resultとsanitizationを検証し、artifact-only差分で通常commit / push、PR本文と最新head CIを確認する。

## Approach（進め方）

- 開始時remote headをpinし、Run Artifactと新しい兄弟Targetを用意する。
- pinned tracked Git objectをPython標準tar readerで展開し、Planのdenylistだけを除外する。
- Targetをfresh repository化し、ユーザーdetach以外のpreflightとAndroid確認を先に完了する。
- ユーザーがdetachした後、read-onlyで全preflightを再確認して一度だけrunnerを実行する。
- 実測結果とartifactを検証し、canonical run完了後にだけcommit / push / PR / CI lifecycleへ進む。

## Definition of Done（完了条件）

- Targetのdetached HEAD、固定root SHA、parentless root、commit数1、clean、remote 0、alternatesなし、required Skills、forbidden path 0、Evaluatorとのrealpath分離を確認。
- physical serialをrunnerへ渡し、raw serialをRun Artifact / PR本文 / 最終報告へ残さない。
- CLIを一度だけ実行し、resultの3 provenance SHAとPlan成功条件を実測照合。
- Run Artifact sanitization residual 0、Evaluator source差分0、artifact-only commit / push。
- PR本文を更新し、push後の最新PR headでWeb CI / Mobile App CIを確認。
- canonical成功と呼ぶのはrun_status=completedかつPlanの全成功条件を満たす場合だけ。

## Risks / Unknowns（リスク・未知点）

- Targetのdetachは本セッションの実行ポリシー上Codexから実行しない。ユーザー操作が終わるまでrunnerを起動しない。
- Android device serialは機密性のある識別情報として成果物では<DEVICE_SERIAL>へredactする。
- runner起動後はblocked / fail / unobservable / timeoutを含め再実行しない。

## Thinking Log（判断記録）

- PR #168開始時headは598b776f1561ea46a25b77f4b1b31e9994bb4f2c、PR OPEN、origin/mainへのbehind 0、開始時worktree clean。
- 9ea92af以降のtracked差分は.codex/runs/**のみ。source / Plan / Hook / config差分は0。
- Current runは20260923-132138-JST。今回canonical対象はEvaluator SHA 598b776...、Target routing SHA 7b758a969c7d4a061b805985cf41f4518acb4323。