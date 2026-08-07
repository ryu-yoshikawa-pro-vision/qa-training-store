# ローカルビルド失敗の振り返りと再発防止計画

## 0. Overview

今回までのローカル Android Build／実機 Maestro／品質ゲートの失敗を、同一条件の無目的な再実行を防ぐための事前確認、仮説、停止条件、証跡保存へ変換する。実行系を再度動かす作業ではなく、既存の Run Artifact と生ログを根拠に文書・Run Artifact・評価を更新する作業とする。

## 1. Goal / Definition of Done

### Goal

- 失敗を時系列で整理し、最初のエラーと派生エラーを分離する。
- 各失敗を `ENVIRONMENT_FAILURE`、`DEPENDENCY_FAILURE`、`CONFIGURATION_FAILURE`、`SOURCE_FAILURE`、`BUILD_CACHE_FAILURE`、`DEVICE_FAILURE`、`TEST_FAILURE`、`TRANSIENT_FAILURE`、`UNKNOWN` のいずれかへ分類する。
- Build／Install／Test／Maestro 前の preflight、再実行仮説、停止条件、完全ログ保存、成功条件を正本文書へ落とし込む。
- Run Artifactへ、無効だった試行・有効だった試行・CIとの差異・エージェント自身の進め方の評価を記録する。

### Definition of Done

- [ ] 現在までの主要なローカル失敗が時系列表に整理されている。
- [ ] 根本原因と派生エラー、成功条件が分離して記録されている。
- [ ] 同じ条件の無目的な Build／Install／Test／Maestro を追加実行していない。
- [ ] Android Build 前の指定 preflight コマンドと確認項目が Runbook／Skill にある。
- [ ] 仮説テンプレート、停止条件、完全ログの保存先、試行単位の命名規則がある。
- [ ] CI／ローカル差異と未確認事項が明記されている。
- [ ] 現在の Run の PLAN／TASKS／REPORT／評価が整合している。
- [ ] 文書・JSON・Run Artifactの検証とSanitizer Write／Checkが成功している。

## 2. Current State / Assumptions / Non-goals

### Current State

- Virtual Store 切替後の `.pnpm-local`／CMake／Ninja の古い参照は、明示的な依存再リンクと `expo prebuild --clean` で復旧した。
- Native Build は一時的にシステムドライブの空き約28MBで Native `.so` コピーに失敗し、容量確保後に成功した。
- Native Component の並列実行で一度 timeout が発生したが、単独確認後の再実行で成功した。
- Maestro は IME入力経路差、画面外要素の可視性契約、非同期検索応答競合を別の原因として切り分け、stable ID／scroll／入力経路分離で再検証した。
- ローカル `pnpm run verify` と Native 実機検証は成功済み。修正後の Remote CI 最終結果は未確認である。

### Assumptions

- 既存の `.codex/runs/20260806-094328-JST`、`20260807-071118-JST`、`20260807-094024-JST` の記録を事実の一次証跡とする。
- 生ログは `.artifacts/native-local/<attempt>/` に保存され、Run Artifactには要約と相対参照だけを残す。
- 共有用画像と機械証跡の保存先規約は変更しない。

### Non-goals

- Android Build、Install、Maestro、Remote CIを今回の文書化作業のために再実行しない。
- safety runner、permission、sandbox、wrapper の自動 preflight 実装をこのRunで行わない。必要なrunner変更はStrictな別候補とする。
- Assertion削除、固定Sleep、Timeout延長、Flow skipで失敗を隠さない。

## 3. Questions / Ambiguity

- ユーザー分類とリポジトリの `spec/failure-taxonomy.json` は用途が異なるため、実行履歴にはユーザー分類、評価候補にはリポジトリ分類を使う。
- 容量不足はホスト環境の状態として `ENVIRONMENT_FAILURE` に分類し、既存Runで使った細分類 `SETUP_FAILURE` は補足ラベルとしてのみ記録する。
- 実行ラッパーが同一RunIdでログを上書きする可能性は、文書ルールで先に回避し、runnerの修正は別のStrict候補として残す。

## 4. Impact / Files

- `docs/native/windows-android-local-validation.md`: Androidローカル検証の正本へ preflight、仮説、失敗分類、停止、ログ保存を追加。
- `.agents/skills/android-native-local-validation/SKILL.md`: エージェント実行入口へ同じ順序と停止規則を追加。
- `AGENTS.md`: 全タスクに適用する新規Build／Test前の振り返り、停止、ログ、Sanitizerの最小規則を追加。
- `docs/native/README.md`: Runbookへの導線と、無目的再実行禁止を短く追記。
- `docs/PROJECT_CONTEXT.md`: プロジェクト共通の再発防止前提を追記。
- `docs/history/2026-08-07_local-build-failure-prevention.md`: 今回確認した失敗履歴と成功条件を保存。
- `docs/reference/repair-loop.md`: 繰り返し失敗をblind retryではなく原因調査へ戻す接続を補足。
- `docs/reference/harness-improvement-loop.md`: Nativeの反復失敗をcandidate化する参照を補足。
- `.codex/runs/20260807-175745-JST/`: 今回の判断、実行タスク、結果、evaluationを保存。

## 5. Change Strategy / Tasks

1. 既存Run、関連 `.artifacts`、Runbook、Skill、AGENTSを読み、失敗表と成功ベースラインを確定する。
2. RunbookとSkillに、実行前振り返り、指定preflight、仮説テンプレート、一変数原則、根本／派生エラー、停止条件、attempt別ログ保存を追加する。
3. PROJECT_CONTEXT、README、repair／harness reference、historyへ責務を分けて反映する。
4. evaluation.jsonへ、今回の文書改善の結果と、runnerのattemptログ分離など未実装候補を記録する。
5. Build／Maestroを再実行せず、文書検索、JSON parse、差分確認、`git diff --check`、Sanitizer Write／Checkを実行する。

## 6. Validation

- `rg` で指定キーワードと相互リンクを確認する。
- PowerShellで `run.json`／`evaluation.json` をJSONとして読み込む。
- `git diff --check` と対象文書の構造確認を行う。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260807-175745-JST -Write -Check` を実行する。
- Android Build／Install／Maestro／フル品質ゲートは、同一条件の再試行を避けるため今回の検証対象外とする。

## 7. Risks / Open Items

- Runラッパーの同一RunId上書きは、今回の文書では防止規約を追加するが、実装修正には別Strict承認が必要。
- SDK／Java／端末の現時点の値は、次回実行時にpreflightで再取得する。今回のRun ArtifactへDevice Serialや個人Pathを保存しない。
- Remote CIの修正後結果は未確認であり、ローカル成功をCI成功と同一視しない。

## 8. Artifacts

- 主要な過去Run: `20260806-094328-JST`、`20260807-071118-JST`、`20260807-094024-JST`
- 今回のRun: `20260807-175745-JST`
- 生ログ参照先: `.artifacts/native-local/<attempt>/`（Repositoryへ追加しない）

## 9. Notes

- Subagentは全員read-only調査とし、親Agentが結果を確認して文書の対象範囲を決定する。
- 容量ゲートをrunnerへ自動実装する案、attempt別ログを強制する案は、harness improvement candidateとして評価へ分離する。
