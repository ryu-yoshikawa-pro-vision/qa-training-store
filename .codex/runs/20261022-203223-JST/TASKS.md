# Tasks（タスク）

## Now（現在）
- [x] 1. PR/base/head/worktreeおよび全体・詳細Planを確認し、既存実装との差を整理。
- [x] 2. M00〜M10の公開レッスン、クイズ53問、演習/提出テンプレート、公開rubricの初稿を作成。
- [x] 3. 全11モジュールのWeb/quiz validatorとChromium回帰E2Eを実装・検証。
- [x] 4. 22状態データ/validator、51 objectiveを含む知識グラフ構造と影響検索を実装・構造検証。
- [x] 5. 同期/単一モジュールload/checkを実装し、ローカルfixture契約を検証。
- [x] 6. 標準`verify`と旧課程を含むChromium E2Eを実行・分類。配布契約を含む全contract suiteも再実行し、新課程8件はPASS、既存Windows Hook/native/MCP/ACL境界31件のFAILを確認。
- [ ] 7. M02→M03の固定Skill実統合受入を実施（実在Authority/Risk/Scope entityとOpenCode実行経路待ち）。
- [ ] 8. M05→M06代表教材の開発受入と、M06/M07完成版Phase 2 Playwright実行を完了。M05の不足していた実行spec・load/state/graph契約を追加し、意図的失敗/一時修正版probeを確認した。M06/M07は公開scaffoldのままで、完成受入は未達。
- [x] 9. Phase 3 workflow sampleの最小権限・対象SHA・target-sha.txt・Artifact契約を検証し、Playwright browser installを追加。外部学習repoでの実行は実装後の実地工程へ分離。
- [ ] 10. 非公開模範/採点用テストを安全な保存先・権限・担当者の指定後に作成。
- [ ] 11. 58 tentative knowledge nodesと教材内容の独立した妥当性レビューを完了。
- [ ] 12. Plan照合とRun Reportを更新し、通常commit/push。PR本文は最新headの実装状態・検証・未達へ同期する。

## 完了処理の参照先
- Progress: `docs/reference/run-artifacts.md`
- Commit/push/PR/CI: `docs/reference/codex-implementation-harness.md`
- Repair: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- Git: `docs/reference/git-branch-safety.md`

checkbox完了はfinal commit前のtask進捗であり全体完了ではない。

## Discovered（発見事項）
- 開始時: M02/M03/M05/M06のみ。7 module欠落、22状態/同期・ロード未実装。既存quizは4 moduleのみ。
- 実装後: M00〜M10公開素材、quiz 53問、state 22件、distribution/sync/load、KG構造、Web/E2Eが追加済み。素材の存在・構造検証はPlan全体の教材/評価受入を意味しない。
- M05再照合: lesson/exerciseが`workspace/M05`の実行spec修正を要求していたが、配布manifestにspecがなく、専用runnerはM06/M07だけを許可していた。M05の公開spec、single-module load entry、start/end必須path、KG artifact、専用runner許可と契約検証を追加した。
- 実地検証未実施は実装DoD外だが、教材/機能/開発検証はDoD内。

## Blocked（ブロック中）
- M02→M03固定Skillの通し統合は`BLOCKED`。Cart BR/AC・Risk資料はあるが、対象revisionから作成された実在のAuthority、Product Risk、Scope Machine Entityが現在の開発環境で確認できず、IDやfixtureを代用できない。現在のWindows環境に`opencode` CLI実行ファイルも見つからなかった。OpenCode Zenの利用可否・認証は再検証していない。
- 全11モジュールの非公開模範解答・採点用テストは未作成。実際の保存先、アクセス権、管理担当が未指定であり、安全な保存先を推測できない。
- 知識グラフの構造検証は通過したが、58知識ノードが`draft_requires_content_review`のまま。独立した内容妥当性レビューと根拠記録は未完了。
- 外部学習用Templateの作成先・管理権限、正式評価担当者、受講者Codespaces条件は未指定。外部Templateは作成していない。実地検証は全量実装後の独立工程であり、本Runの実装ブロッカーではない。
