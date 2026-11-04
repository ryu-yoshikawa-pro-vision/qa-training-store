# PR #199 統合・横断受入タスクリスト

対象PR：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。作業ブランチは`docs/plan-ai-agent-qa-curriculum-redesign`。個別PR #213〜#219の専用タスクリストと[分担Plan](./2026-11-04_pr199-parallel-branches.md)を参照する。**このファイルは#199本体だけで編集する**。以前の共通逐次Planの時刻別キューや当時のHEAD/進捗を現行のタスクとして流用しない。

## 作業境界と完了判定

- このリストは個別PRの作業を重複実装するためではなく、複数PR間に残る**共有実装・意味的な対応・最終検証**を受け入れるためのもの。
- [ ] の完了には対象の最終HEAD、参照した仕様/ファイル、実行テスト・CI Run/証拠・結果を記録する。内容レビュー、構造検証、実モデル採点、実Web/Android、製品適合を別々に判定する。
- `src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`app/**`、正式製品仕様、既存Seed/Reset・製品用テストは読み取り専用。製品修正は#210に任せる。#213の分析台帳と#219の動的証拠を混同しない。
- Public Templateの実公開は#199マージ後の本人作業。Private repo/2コアCodespaces実受入は他の全作業完了後の本人作業で、マージ前必須ゲートに戻さない。未実行をPASSとは記録しない。実受講者の習熟試行も後続工程。
- 本リストの作成・PRのDraft解除・CI通過はmerge許可と同義ではない。#199をmainへマージしない。

## 個別PRの統合と重複管理

- [ ] #213〜#219すべての最新HEAD/差分/チェック項目/未確認/BLOCKED/外部依存を確認。受入完了した範囲を#199へ統合し、各PRの未解決条件をこのリストで調停。**マージは個別の明示承認後のみ**。
- [ ] `package.json`、lockfile、`scripts/training/ai-assisted-qa-course.mjs`、共有`tests/contracts/ai-assisted-qa-curriculum.test.ts`・`ai-assisted-qa-practical-exercises.test.mjs`、共通設計Planなどを複数PRから同時編集しない。所有PRから変更目的と検証条件を受けて一か所で調停。
- [ ] 旧課程`docs/curriculum/test-automation/**`、既存Training / 既存製品workflowと新課程の物理的な分離を最終差分で確認。#210との製品修正の混入・重複も確認。

## 公開Webの教材閲覧・クイズ

所有者は#199統合先。#214〜#216は各モジュールの教材Markdown・クイズJSON内容を確認・修正し、Web共通処理は変更提案を#199へ渡す。基準：`docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md`。

- [ ] 既存`scripts/docs/build-docs.ts`→`scripts/docs/build-ai-assisted-qa.ts`で公開学習入口・M00〜M10の11教材・クイズが一つの正本Markdown/JSONから生成されることを確認。入口、目標、前提、本文、コード/演習、前後移動、復習、公開仕様リンク、旧課程のURL非回帰を受け入れる。
- [ ] 一問表示→選択→前/次→未回答拒否→全問後の採点/選択肢解説/誤答別復習→再挑戦、0問/不正ID/欠落選択肢・リンクの拒否、読み込み失敗時の再読込を検証。既存`e2e/web/ai-assisted-qa-course.spec.ts`と`tests/contracts/ai-assisted-qa-curriculum.test.ts`を優先し、不足する負例だけ追加。
- [ ] 同一ブラウザの版付き`localStorage`による途中保存とrevision変更後の旧回答非流用を検証。Webの自己確認は正式Phase合格を変更せず、Codespaces上の個人成績を送信・上書きしない。Webと配布教材のソース版不一致は明示し、無断同期しない。
- [ ] Desktop/スマートフォン/タブレット、キーボード/フォーカス/画面読み上げ、直URL、XSS/HTML出力・Secret/採点完成資料の不混入、公開Build/Smoke/旧Webの回帰を検証。**#219の製品UI受入とは別**。

## 知識グラフ・51目標・教材の意味的な整合

基準：`docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md`、`..._learning-map.md`、`..._progression.md`、`docs/curriculum/ai-assisted-qa/knowledge-graph.json`。現行の82理解ノードは`draft_requires_content_review`であり、機械的なID一致だけで承認済みにしない。

- [ ] #214〜#216から各モジュールの理解事項（現行82件）のレビュー結果を受領し、意味・粒度・重複・前提順序・説明節・適用実技・クイズの観測点と評価基準を確認。人間レビュー未実施は承認済みと偽らず、開発時の内容/AI校正証拠と区別。
- [ ] `knowledge-graph.json`と`scripts/training/knowledge-graph.mjs`を統合先で検証・必要に応じ更新。既存`validate`、`table`、`impact --changed-files <path-list-file>`で全51目標・理解事項・教材・クイズ/実技・Phase採点・22開始/終了状態の参照、未登録変更、削除/移動、仕様/Skill改訂時の影響を検査。既存機能と同じ実装を増やさない。
- [ ] 51目標の「説明→例→誘導→別条件→提出証拠→Level 2判定→復習先」をモジュール横断で全量照合し、`table`の出力と実ファイルを比較。Web確認クイズの正解のみで独立した実技や本人判断を認定しない。
- [ ] M04→M05に分析・Case・BR/AC・初期データ、M07→M08に実Run済みspec・Config・Reset・結果が、同一ID/revisionで渡ることを検証。M02→M03、M05→M06、M09→M10も担当PRの証拠と最終配布条件で再照合。先行修了を公開基準入力から架空に復元しない。
- [ ] 通常OpenCode学習の段階的ヒント・別条件の課題・復習・再開と、M04/M07/M10の独立AI正式採点が混ざらないことを#214〜#218の引継ぎと通し検証で確認。講師の個別承認や有料モデルへの自動移行を要求しない。

## 配布・評価・実行証拠の相互受入

- [ ] #217の評価器が必要なM06/M07の新しいPlaywright Runを限定実行/取得して証拠を照合し、M10では本人の実GitHub APIから最新PR HEAD・Run/attempt・Check・Artifact・対象specを検証することを受け入れる。単なる自己申告/旧Run/作成済みログのハッシュ一致では合格にしない。
- [ ] #218配布manifest・固定Shop・Skill-local依存・`course:load/check`・正式採点資料の固定SHA取得・非破壊性が、#214〜#217の教材/状態/評価器と結合して機能するか検証。Phase 1/2の成果物・評価履歴をGit/PR不要で安全にエクスポート・保全できる条件を確認。
- [ ] #213の79要件・188操作・20状態の確定分母/基本分析率と、#219が採用したCaseごとのWeb/Android/DBの実Run・未実行を突合。#210の製品修正は未マージなら#199に反映済みと扱わず、対象commitを記録。
- [ ] 第三者由来Skill/依存物のライセンス・NOTICE、Secret/個人データ非漏洩、静的Web/Template/Artifactの除外を#218の証拠で最終確認。出典未確認・実機未実施をPASSへ変更しない。

## 最終CI・レビュー・完了

- [ ] すべての作業PR統合後に`.github/workflows/native-ci.yml`の`pull_request`トリガーを本来の条件で復元し、既存の必須Mobile CIを再開。既存ジョブ/権限/コストに無断の仕様変更を加えない。
- [ ] 同じ**最終HEAD**でWebの必要なStyle/Type/Contracts/Unit/Integration/Component/required Chromium E2E/Build等と、Android/iOSの所定の必須Build・Static・Maestroなどを検証。成功・失敗・スキップ・未実行を分けて記録し、古いHEADを根拠にしない。
- [ ] 各個別PRと統合差分の独立レビューを行い、指摘の根拠・対応・再検証、要件の未決、公開前の権利とデータ保護、成果物の再現性を確認する。
- [ ] 残件・要承認・マージ後作業を区別して#199本文とPlanへ反映。全受入を満たすまで#199を完了・mainへマージしたと扱わない。
