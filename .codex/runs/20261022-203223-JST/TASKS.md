# Tasks（タスク）

## Now（現在）
- [x] 1. PR/base/head/worktreeおよび全体・詳細Planを確認し、既存実装との差を整理。
- [ ] 2. M02→M03、M05→M06代表教材と開発検証を完成。
- [ ] 3. M00〜M10全教材・クイズ・演習・評価基準を完成。
- [ ] 4. 22状態、validator、知識グラフと影響検索を完成。
- [x] 5. 同期/単一モジュールload/checkを実装し、ローカルfixture契約を検証。
- [ ] 6. Web全11モジュール・Chromium E2EとPhase 3 CIサンプルは実装済み。Phase 2のM06/M07専用実行は開始素材のTODOで停止するため未完了。
- [ ] 7. 全必須開発検証、旧課程非回帰、成果物とPlanの照合を行い原因修正・再検証。
- [ ] 8. PR本文/Run Reportを更新、commit/push、最新SHA CI確認。

## 完了処理の参照先
- Progress: `docs/reference/run-artifacts.md`
- Commit/push/PR/CI: `docs/reference/codex-implementation-harness.md`
- Repair: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- Git: `docs/reference/git-branch-safety.md`

checkbox完了はfinal commit前のtask進捗であり全体完了ではない。

## Discovered（発見事項）
- 開始時: M02/M03/M05/M06のみ。7 module欠落、22状態/同期・ロード未実装。既存quizは4 moduleのみ。
- 実地検証未実施は実装DoD外だが教材/機能/開発検証はDoD内。

## Blocked（ブロック中）
- M02→M03固定Skillの通し統合は`BLOCKED`。Cart BR/AC・Risk資料はあるが、対象revisionから作成された実在のAuthority、Product Risk、Scope Machine Entityが現在の開発環境で確認できず、IDやfixtureを代用できない。現在のWindows環境に`opencode` CLI実行ファイルも見つからなかった。OpenCode Zenの利用可否・認証は再検証していない。
- 全11モジュールの非公開模範解答・採点用テストは未作成。実際の保存先、アクセス権、管理担当が未指定であり、安全な保存先を推測できない。
- 知識グラフの構造検証は通過したが、58知識ノードが`draft_requires_content_review`のまま。独立した内容妥当性レビューと根拠記録は未完了。
- 外部学習用Templateの作成先・管理権限、正式評価担当者、受講者Codespaces条件は未指定。外部Templateは作成していない。実地検証は全量実装後の独立工程であり、本Runの実装ブロッカーではない。
