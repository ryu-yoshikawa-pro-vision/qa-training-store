# Tasks（タスク）

## Now（現在）
- [x] 1. PR/base/head/worktreeおよび全体・詳細Planを確認し、既存実装との差を整理。
- [x] 2. M00〜M10の公開レッスン、クイズ53問、演習/提出テンプレート、公開rubricの初稿を作成。
- [x] 3. 全11モジュールのWeb/quiz validatorとChromium回帰E2Eを実装・検証。
- [x] 4. 22状態データ/validator、51 objectiveを含む知識グラフ構造と影響検索を実装・構造検証。
- [x] 5. 同期/単一モジュールload/checkを実装し、ローカルfixture契約を検証。
- [x] 6. 標準`verify`と旧課程を含むChromium E2Eを実行・分類。新課程focused contract 16/16、Web E2E 17/17、課程/状態/知識グラフvalidatorはPASS。全`verify`は755 passed / 31 failed / 2 skippedでFAILし、既存Codex Hook/task wrapper/MCP/Windows ACL境界の5 filesに失敗を特定。標準51-case E2Eは既定Chromium未配置で起動失敗したが、明示Chromeで全51ケースPASS表示、終了処理のexit codeは未取得。
- [ ] 7. M02→M03の固定Skill全経路受入を実施。Authority/Risk生成から`condition_structure(direct)`までのsource-backed決定論的部分検証は実行済み。OpenCode依存の意味分析・技法選択runtime、materialize/Case/最終evidence gateは未実行。
- [x] 8. M05→M06代表教材の開発受入とPhase 2専用Playwright経路を開発環境で確認。M05意図的Locator失敗と別の修正版1/1、M06公式Cart 3 Case 3/3、M07意図的Assertion失敗と修正後別Run 1/1を証拠付きで確認。受講者が完成するM06/M07のTODO scaffoldは公開入力として維持し、人間受入は実地検証工程へ分離。
- [x] 9. Phase 3 workflow sampleの最小権限・対象SHA・target-sha.txt・Artifact契約を検証し、Playwright browser installを追加。外部学習repoでの実行は実装後の実地工程へ分離。
- [ ] 10. 非公開模範/採点用テストを安全な保存先・権限・担当者の指定後に作成。
- [ ] 11. 58 tentative knowledge nodesと教材内容を正式仕様・設問/選択肢/解説・演習・評価基準と照合し、別レビュー担当者による独立した妥当性レビューを完了。実装者の二度目レビューと修正は記録済み。
- [ ] 12. Plan照合とRun Reportを更新し、実装状態・検証・未達を記録してcommit/push、PR本文へ同期し、最新headの必須CIを確認。実装全体の未達項目はタスク7/10/11に残す。

- Progress: 8/12追跡項目。これは全カリキュラムの実装完了を意味しない。

## 完了処理の参照先
- Progress: `docs/reference/run-artifacts.md`
- Commit/push/PR/CI: `docs/reference/codex-implementation-harness.md`
- Repair: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- Git: `docs/reference/git-branch-safety.md`

checkbox完了はfinal commit前のtask進捗であり全体完了ではない。

## Discovered（発見事項）
- 開始時: M02/M03/M05/M06のみ。7 module欠落、22状態/同期・ロード未実装。既存quizは4 moduleのみ。
- 実装後: M00〜M10公開素材、quiz 53問、state 22件、distribution/sync/load、KG構造、Web/E2Eが追加済み。素材の存在・構造検証はPlan全体の教材/評価受入を意味しない。
- 内容二度目レビュー: 全51 learning objective / 58 knowledge node / 53設問をmodule本文、正本仕様、4選択肢/理由/出典/復習先、演習、Phase rubricと照合。Cart low-stockの購入上限継承とScopeのEntity誤認を修正。別担当者レビューは未実施。
- M05再照合: lesson/exerciseが`workspace/M05`の実行spec修正を要求していたが、配布manifestにspecがなく、専用runnerはM06/M07だけを許可していた。M05の公開spec、single-module load entry、start/end必須path、KG artifact、専用runner許可と契約検証を追加した。
- 実地検証未実施は実装DoD外だが、教材/機能/開発検証はDoD内。

## Blocked（ブロック中）
- M02→M03固定Skillのfull integrationは`BLOCKED`。固定scriptの正規経路でCart source-backed Authority/Risk Entityを実生成し、`SCOPE-001`参照とともに`condition_structure(direct)`まで`ok/ready`を確認した。ローカルに`opencode` CLI実行ファイルがなく、モデル依存の意味分析・技法選択runtime、materialize/Case/final evidence gateは未実行。OpenCode Zenの利用可否・認証は再検証していない。詳細fingerprintはM02→M03 integration contractに記録。
- 全11モジュールの非公開模範解答・採点用テストは未作成。実際の保存先、アクセス権、管理担当が未指定であり、安全な保存先を推測できない。
- 知識グラフの構造検証は通過し、実装者が51項目/58知識/53問と本文・演習・評価基準の二度目レビューを実施して問題を修正した。独立した別担当者の内容妥当性レビューは未実施のため、58知識ノードは`draft_requires_content_review`のまま。
- ローカルE2EではWindows上でPlaywright管理webServerを使用すると17/17件が成功表示後もsummary/終了コードが返らない。外部静的serverから同じ17件を実行するとexit 0。Playwright設定差し替えはこの挙動を解消せず、変更を保持せず戻した。
- 外部学習用Templateの作成先・管理権限、正式評価担当者、受講者Codespaces条件は未指定。外部Templateは作成していない。実地検証は全量実装後の独立工程であり、本Runの実装ブロッカーではない。
