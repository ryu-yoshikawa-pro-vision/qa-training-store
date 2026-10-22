# Plan（計画）

## Objective（目的）
- PR #199の完成仕様に沿って、新規AI協働テスト自動化カリキュラムの教材、クイズWeb、実技・開始終了契約、同期/ロード、知識グラフ、検証を実装し、既存PRへ配信する。

## Scope（対象範囲）
- In: docs/curriculum/ai-assisted-qa/、training/ai-assisted-qa-course/、training/course-sync/、必要最小限のscripts/training/・scripts/docs/・package.json・新課程専用テスト。
- Out: docs/curriculum/test-automation/**、旧validator/Completion Receipt、既存Training/正式回帰、製品仕様・製品コード・Seed、外部qa-workflow-skills本体の改変、PR #198、merge/close/branch削除/force push。
- 外部公開Templateリポジトリは名称・管理権限が未指定のため作成しない。公開リポジトリから非公開模範解答/採点テストを配布・Git履歴へ追加しない。保存先・評価担当者は推測しない。

## Assumptions（仮定）
- OpenCode Zen無料モデルの利用可否・認証可否は確認済み前提として再検証しない。
- 開始時点ではGitHub PR APIが示したPR head/baseと、ローカルHEAD/origin refsが一致していた。通常sandbox内のfetchは拒否されたが、commit/push前の許可経路で`git fetch origin`が成功し、その後のHEAD/origin PR branch確認も一致した。
- ローカルで検証可能なコード・文書・クイズ・静的ビルドは実施する。個人所有2コアCodespaces、費用、受講者による実習・初心者試行・評価担当者の採点を実施したとは扱わない。

## Questions / Ambiguity（質問・曖昧性）
- 必ず質問する不透明点: 外部Template名称・管理権限、非公開評価資料の保存先・権限、評価担当者は公開/運用開始に必要。指定がないまま推測しない。
- 仮定してよい細部: 既存のPRブランチ・静的Docs基盤・標準Node/Playwrightツールを再利用。
- 未回答の重要質問: 代表教材の初心者自習試行と採点基準レビューを実施できる人間の評価者。結果を待つ間、独立した技術実装・ローカル検証を継続する。

## Research Plan（調査計画）
- Round 1: PR #199、全体Plan・決定事項・詳細Plan、既存コード/テスト/依存/CIを確認。完了。
- Round 2: 代表教材、固定Skill revision、実データ入力契約、Quiz/Web、同期・ロード、22状態、知識グラフの実装と受入試験を照合。
- Exit Criteria: 実装対象・禁止事項・未確定事項を根拠付きで分類し、代表教材の受入条件を判定する。

## Approach（進め方）
1. 指定Planと現行コードを基準に、最小の実行経路を先行検証する。
2. M02→M03、M05→M06の代表教材・クイズ・実技・公開状態契約を作成し、コンテンツと技術の受入を個別に検証する。
3. 代表教材受入が満たされた後に限り、残る全モジュール・全機能へ展開する。
4. Web、同期/ロード、状態・知識グラフ検証、回帰テストを実装する。
5. 旧課程の境界を検証し、Run成果物・差分・ローカルゲートを確定してからcommit/pushする。
6. 最新PR headでWeb CI/Mobile App CIを待機し、PR本文の実装・検証・残件を同期する。merge等はしない。

## Definition of Done（完了条件）
- 全体Planと対象詳細Planの全実装/受入条件を満たす。特に11モジュールのWeb教材・クイズ・実技・開始終了契約、51学習目標/知識・教材・評価対応、版付き再開、1問ずつのクイズ、非公開境界、同期/ロード非破壊性、M02→M03固定Skill通し実行、2コアCodespaces実行証拠を別々に判定する。
- 旧課程/製品/正式回帰への非回帰を確認する。未実施の人間試行、外部権限・保存先・Codespaces検証はBLOCKEDとして記録する。
- local HEAD・remote branch・PR head整合、通常push、最新SHAの必須CI成功とPR本文更新を確認する。

## Risks / Unknowns（リスク・未知点）
- 人間による初心者試行/独立採点、外部Template名称・権限、非公開保存先・評価担当者、個人費用・2コアCodespacesが未指定。
- .gitへの書込はsandboxで拒否された。Git commit/push/fetchは明示承認済みだが、通常経路での実行可否を安全に確認する。
- 静的なソース依存調査だけでは学習用リポジトリ単体でBuild/Serve/Reset/Playwrightが成立した証拠にならない。

## Thinking Log（判断記録）
- 2026-10-22: PR #199 OPEN、head 288c0acb673317aee1b2b5e14f3b3ea8264528c2、base main/d16e3bdd277a82576336689c4038b9d9cc423414。作業ブランチとHEADは一致し、開始時作業ツリーはclean。既存実装はPlan/graph JSON/README/graph CLIのみ。
- 2026-10-22: GitHub PR APIから変更17ファイルを取得。git fetchは.git/FETCH_HEAD Permission denied。ローカルorigin refsはPR API head/baseと一致。
- 2026-10-22: 全体Plan・11詳細Planを読了。実装順序は最小技術検証→代表教材→代表受入→全量展開。外部Templateや非公開評価保管先を作成しない。
