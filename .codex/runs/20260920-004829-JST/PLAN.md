# Plan（計画）

## 目的

- Issue #117 PR6 Workflow E2E Evalのcanonical Planへ、PR #168作成後の全体レビューで確定した必要修正を統合する。
- 目的達成性、既存Skill契約、実行時capability、scope、Run Artifact、Codex設定隔離を揃え、実装者へ重要な設計判断を残さない。
- このRunでは実装コード、latest main取り込み、merge、Issue更新を行わない。

## 対象範囲

- canonical Plan。
- plan-only Run Artifact。
- PR #168本文。
- Plan変更起因のMarkdown lint修正。

## 確定した追加修正

- Case Aはreview開始時に`status.mjs`自体の回帰diffを残す。
- Case Bは実際のCodex sessionのBrowser capabilityを確認し、canonical 6 Skillを保持したsource-free QA rootを使う。
- Case B固有capability不足とrun共通blocker、fixture / evaluator failureを分離する。
- Case Cは`stop_unsafe` / `stop_needs_human`の優先順位をPR6で新設せず、unsafe / destructive operation未実行と停止を評価する。
- Case Dは無意味な編集を強制せず、runnerが用意したbounded attempt / validation Evidenceから`stop_no_progress`を評価する。
- Case EはDoctor-onlyとし、stage-specific structured output、`command_execution`、Native Artifactを照合する。
- sanitized Targetはcallerが準備し、runnerは`--target-root`をpreflightする。
- 各caseでRepository標準`scripts/new-run.*`からfresh active Runを1件だけ作り、same-case turnで再利用する。
- canonical live turnでは`--ignore-user-config`、`--ignore-rules`、`-c features.hooks=false`を固定する。
- Repository外Skillの混入はsmoke probeとOTelでfail-closeし、独自Skill Registry / isolation frameworkを追加しない。

## 完了条件

- canonical Planに上記修正が反映されている。
- plan-only Run ArtifactとPR本文がcanonical Planと整合している。
- 既知の`MD029`原因となるCase Bのordered list再開始が残っていない。
- 実装コードやSkill semanticsは変更していない。
