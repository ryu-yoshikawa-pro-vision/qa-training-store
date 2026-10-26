# Tasks（タスク）

## Now（現在）
- [x] 1. PR/base/head/worktreeおよび全体・詳細Planを確認し、既存実装との差を整理。
- [x] 2. M00〜M10の公開レッスン、クイズ53問、演習/提出テンプレート、公開rubricの初稿を作成。
- [x] 3. 全11モジュールのWeb/quiz validatorとChromium回帰E2Eを実装・検証。
- [x] 4. 22状態データ/validator、51 objectiveを含む知識グラフ構造と影響検索を実装・構造検証。
- [x] 5. 同期/単一モジュールload/checkを実装し、ローカルfixture契約を検証。
- [x] 6. 標準`verify`と旧課程を含むChromium E2Eを実行・分類。新課程course/distribution/knowledge-graph contracts 30/30、全validator/buildを含む後続gate、新課程Web E2E 17/17・exit 0を確認。標準`verify`は先頭の`format:check`がprotected untracked `workspace/M06/acceptance-probe.spec.ts`で停止したため同ファイルを変更せず、残りgateを個別に実行。`pnpm run test`はunit 66、integration 111、repository 147、web component 103、native component 64がPASS。contractsを含む全testは769 passed / 32 failed / 2 skippedで、Windows Hook/log ACL、temp ACL/wrapper、MCP stdio、bash spawn、text-quality 30秒timeoutの6 filesでFAIL。text-quality失敗は同一testを単独再実行すると7.43秒でPASSし、全suite負荷によるtimeoutと区別。標準51-case E2Eは全件成功表示後もsummary/exit codeがなくPASSとはしていない。Windows localとexact-head CIは別証拠として記録。
- [ ] 7. M02→M03のモデル依存統合受入を完了する。source-backed `SCOPE-001`/`SCOPE-101`のAuthority/Risk生成、`condition_structure(direct)`、選択したBVA、TDR、materialize、Case、condition/case双方の最終evidence gate `valid=true`までの決定論的開発経路は実行・記録済み。OpenCode CLIの正規モデル実行経路がこのWindows環境から利用できず、モデル依存の意味分析・技法選択出力は未実行。Codex判断による統合結果への置換はしていない。
- [x] 8. M05→M06代表教材の開発受入とPhase 2専用Playwright経路を開発環境で確認。M05意図的Locator失敗と別の修正版1/1、M06公式Cart 3 Case 3/3、M07意図的Assertion失敗と修正後別Run 1/1を証拠付きで確認。受講者が完成するM06/M07のTODO scaffoldは公開入力として維持し、人間受入は実地検証工程へ分離。
- [x] 9. Phase 3 workflow sampleの最小権限・対象SHA・target-sha.txt・Artifact契約を検証し、Playwright browser installを追加。外部学習repoでの実行は実装後の実地工程へ分離。
- [x] 10. 模範解答・採点用テスト・完成状態データはpublicな`qa-training-store`に通常ファイルで保持する方針へ整合。reference-solutions/scoring-tests/completed-states各11件（計33件）を確認し、M03/M04の完成回答・校正例を正式仕様と照合。Template/同期/load/Web Buildからの除外契約は維持し、秘密保持とは説明しない。
- [x] 11. 58 tentative knowledge nodesと教材内容を正式仕様・設問/選択肢/解説・演習・評価基準と照合し、別AI reviewerによる独立開発レビューを実施。M03教材/知識グラフ/状態参照解決とM10 Reset開始入力の指摘を修正して契約テスト・validatorを再実行。レビュー記録を決定事項へ追記した。AIレビューは人間による正式ドメイン承認を意味しないため、58 nodeは`draft_requires_content_review`を維持。
- [x] 12. 6件のレビュー修正・開発検証・未達をRun Reportへ記録し、対象32追跡ファイルをcommit/pushしてPR本文へ反映。PR全体の未完了Task 7を残し、最新headのCI確認はpush後の独立gateとする。

- Historical checkpoint before the 2026-10-26 scope expansion: 92% (11/12) — this was not full curriculum completion.

## 2026-10-26継続（最新Planの追加受入範囲）
- [x] 13. 最新HEAD、PR本文/base、詳細Planの正式AI評価・AIチューター・実Template/Codespaces受入条件を再確認。
- [x] 14. 11 scoring JSON、11 end state、3 phase rubric、教材/提出導線、Validator/contract testsをAI自己評価とNode確定へ一体移行。公開評価資料33件と個人記録のGit/Template/Web/Artifact除外を検証。
- [x] 15. `course:assess`入口、独立OpenCode read-only session、fail-closed実行/出力パーサ、AI候補/Node確定結果の分離を実装。OpenCode実行自体のモデル受入はTask 19。
- [x] 16. Phase別全objective検査、証拠/Run検証、live condition、対話回答保存、atomic private attempts、resume/history/export/retakeを実装。ライブ課題対象の採点には回答証拠IDを必須化し、欠落拒否testを追加。
- [x] 17. M00-M10の公開AIチューター案内、復習→再評価導線、個人データGit/Artifact/Web除外を完成。
- [x] 18. 校正fixtureを拡充し、51目標/58知識/53設問と教材・解説・演習・採点の独立開発内容レビューを反映。人間の知識ノード最終承認はPlanどおり後工程。
- [ ] 19. OpenCode CLI 2.0.22実モデルでPhase別校正、権限制御、重大誤PASSゼロを実証する（このWindowsローカル環境にはCLI実行ファイルがなく、Zen/認証は再確認しない）。
- [ ] 20. 実Template→非公開学習repo→新規2コアCodespaceでLoad/Serve/Reset/Playwright/実AI評価・再評価を技術受入する（作成先/権限/支出条件への回答待ち）。
- [ ] 21. 関連テスト・品質ゲート・正式仕様/旧課程非回帰・最新HEAD CIを完了し、Run・PR本文・commit/pushを同期する。現状: Unit/Integration/Repository/Web/Native suiteはPASS、全contractsはWindows環境依存31 failure、`verify`は保護対象workspaceファイルのformatで停止、標準51-case Chromiumは成功表示後に終了コードなし。commit/push/最新SHA CIは未完了。

- Progress (current checklist): 81% (17/21). This is task-list progress only; the curriculum and required acceptances remain incomplete. Tasks 7, 19, 20, and 21 remain open.

## 完了処理の参照先
- Progress: `docs/reference/run-artifacts.md`
- Commit/push/PR/CI: `docs/reference/codex-implementation-harness.md`
- Repair: `docs/reference/repair-loop.md` と `.agents/skills/repair-loop/**`
- Git: `docs/reference/git-branch-safety.md`

checkbox完了はfinal commit前のtask進捗であり全体完了ではない。

## Discovered（発見事項）
- 開始時: M02/M03/M05/M06のみ。7 module欠落、22状態/同期・ロード未実装。既存quizは4 moduleのみ。
- 実装後: M00〜M10公開素材、quiz 53問、state 22件、distribution/sync/load、KG構造、Web/E2Eが追加済み。素材の存在・構造検証はPlan全体の教材/評価受入を意味しない。
- 内容レビュー: 全51 learning objective / 58 knowledge node / 53設問をmodule本文、正本仕様、4選択肢/理由/出典/復習先、演習、Phase rubricと照合。fresh independent AI reviewerの再レビューでM03-01 lesson mapping、Cartの追加/絶対更新表現、M10 Reset必須入力、状態参照のmanifest/Skill pin解決を指摘し、教材・知識グラフ・状態・checker/testを修正。人間の正式ドメインレビューとは区別し58 nodeをtentativeのまま保持。
- M05再照合: lesson/exerciseが`workspace/M05`の実行spec修正を要求していたが、配布manifestにspecがなく、専用runnerはM06/M07だけを許可していた。M05の公開spec、single-module load entry、start/end必須path、KG artifact、専用runner許可と契約検証を追加した。
- 実地検証未実施は実装DoD外だが、教材/機能/開発検証はDoD内。

## Blocked（ブロック中）
- M02→M03のAIモデル統合受入は部分的に`BLOCKED`。固定scriptのsource-backed `SCOPE-001`/`SCOPE-101`系列でAuthority/Risk/Scope参照、direct、BVA、TDR、materialize、Case、condition/case両final evidence gate `valid=true`を決定論的に実行済み。意味分析・技法選択は人手で正式sourceから導出しておりOpenCode出力ではない。Windows環境のOpenCode CLI正規起動経路を確認できず、モデル依存ステップだけ未実行。Zen利用可否・認証は再検証せず、有料モデルへ切り替えていない。詳細fingerprintはM02-M03 integration contractに記録。
- 模範解答・採点用テスト・完成状態データはpublicな通常ファイルで、学習用配布からの除外は秘密保持ではない。学習者個人の提出/成績記録の保存先・アクセス権・管理担当と正式評価担当者は未指定のまま。
- 51項目/58知識/53問と本文・演習・評価基準の開発レビューは、実装者の再確認に加えて別AI reviewerが実施。M03とM10、状態参照resolverの具体的指摘を修正済み。AIレビューは人間の正式ドメイン承認ではないため、58 knowledge nodeは`draft_requires_content_review`のまま。
- ローカルE2EではWindows上でPlaywright管理webServerを使用すると17/17件が成功表示後もsummary/終了コードが返らない。外部静的serverから同じ17件を実行するとexit 0。Playwright設定差し替えはこの挙動を解消せず、変更を保持せず戻した。
- 外部学習用Templateの作成先・管理権限、学習者個人の提出/成績記録の保存先・アクセス権/管理担当、正式評価担当者、受講者Codespaces条件は未指定。外部Templateは作成していない。実地検証は全量実装後の独立工程であり、本Runの実装ブロッカーではない。
