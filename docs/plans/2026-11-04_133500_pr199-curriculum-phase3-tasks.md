# PR #199 Phase 3（M08〜M10）GitHub・CI教材タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。作業開始時に`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、このリスト、最新HEAD/CI、関連仕様・テストを確認する。
>
> **完了条件**：各チェック項目の仕様/教材/コードの整合と必要な実行証拠（対象HEAD、実行環境・コマンド・結果・Run）を得たときだけ`[x]`へ変更する。未実行/BLOCKEDは理由・再開条件を記録して未完のまま保持。製品SUT・正式製品仕様・既存Seed/Reset・製品用テスト/workflow、および他ブランチの所有ファイルは変更しない。変更依頼はPR上で#199へ引継ぐ。個別PRは#199をbaseとし、許可なくマージしない。

## このPRで実施する範囲

GitHub接続エージェントはM08〜M10の教材・クイズ・演習・Git/CI操作例・無効workflow見本と安全な配布/証拠検証コード、契約・負例テストおよび既存CIを担当する。**本人Private repoでの課金/権限判断・実PR・実CIとOpenCode実モデルの学習/修了は#199の最後に受け入れる**。ここでの成功は技術準備/自動テストの成功であり、受講者の修了ではない。

現在0/24件チェック済み（HEAD `0a7fe2e7c092`、個別作業PRの実装差分はタスクリストのみ）。既存#199のCI失敗原因は修正済みだが、このブランチの古いCI失敗は基点が古いことによるMarkdown lintであり、別の業務不具合と扱わない。エージェント側では最新#199との差分を照合し、修正後のCIを再確認する。

## 変更範囲

14学習目標。編集：`docs/curriculum/ai-assisted-qa/modules/M08..M10/**`、対応する`training/ai-assisted-qa-course/exercises/Mxx/**`・`states/Mxx/**`・`docs/curriculum/ai-assisted-qa/quizzes/M08.json`〜`M10.json`・`templates/phase3/**`・`scripts/training/ai-assisted-qa-github-run-evidence.mjs`・固有の契約テスト。配布manifest、course sync、正式採点エンジン、共通テスト/lockfileは別担当。

## M08：Git・PR・変更レビュー（4目標）

- [ ] `M08-01`：作業用の隔離Git fixture/既存CIでworking tree→stage→commitの教材・証拠様式を検証。受講者本人のGit操作は#199最終実受入へ渡す
- [ ] `M08-02`：安全なstage/ignore対象とSecret/Trace混入の禁止を教材・隔離Gitの負例テストで照合し、本人のリポジトリ選択操作は#199へ渡す
- [ ] `M08-03`：PR base/head、差分、Case/spec/Run/SHA説明表の教材と固定サンプル・API/テスト契約を照合。本人によるPR説明は#199へ移す
- [ ] `M08-04`：AIレビューの誤指摘・見落とし・不要な抽象化を根拠付きで採否。数の多さで評価しない

## M09：CI・品質ゲート（5目標）

- [ ] `M09-01`：YAML event/job/step/runner、配布済みShopの生成者・取得・Serve・Test、install/build/server/testの責務を教材と完成見本で対応
- [ ] `M09-02`：PR head/merge SHA、Run/attempt/Check/Artifact、`target-sha.txt`の照合を固定SHAの正例・旧Run負例で確認
- [ ] `M09-03`：install/配布/Serve/test/artifactの最初の失敗箇所と、`if-no-files-found`、`if: always()`、SHA不一致の扱いを別条件で確認
- [ ] `M09-04`：本人Private repoの無料Actions条件・trigger・回数/保存・費用/停止条件を複数の架空ケースで判断。費用不明時はBLOCKED
- [ ] `M09-05`：外部PRと`pull_request_target`の危険、checkout・依存取得・Browser・Artifact・Secret・権限の最小化を判断し、安全なworkflow例へ対応

## M10：同一specのCI実行・Phase 3総合演習（5目標）

- [ ] `M10-01`：M07参考spec/Config/ResetとM10のfallbackの依存閉包・安全なstageリストを契約テストで照合。本人specの選択・stage操作は#199で受け入れる
- [ ] `M10-02`：無効workflowを本人が安全に有効化する条件（無料枠、権限、対象spec、cleanup）を教材へ明示。**#199では完成見本を無効のまま**にする
- [ ] `M10-03`：実GitHub APIを想定したPR HEAD・Run attempt・Check/Artifact・target SHA照合のコード/fixture/旧Run負例を整備し、既存公開CIで検査。本人Private repoの実PR/実Run照合は#199へ渡す
- [ ] `M10-04`：CI固有の失敗、製品/テスト失敗をログ/環境/対象SHAで分類して再実行判断を示す
- [ ] `M10-05`：AI提案の採否、CIが保証する範囲と未確認/残リスクの報告を具体的な証拠で確認

## M09→M10の技術的受入

- [ ] 配布済み`course/shop/index.html`と`.course/distribution-manifest.json`を、本人Private repoのRunnerへ**どの経路で取得・配置するか**を契約化。固定SHA、取得元、ハッシュ、許可範囲、権限を定義。配布ブランチのmanifest/生成契約と整合
- [ ] 無効workflow見本の`verify-distribution`、`PLAYWRIGHT_USE_PREBUILT_DIST=true`を維持し、不足時に製品フルBuildへ暗黙にfallbackしないことを負例テストで確認
- [ ] M07本人specとM10 fallbackが異なるtest rootで、相対import・fixture/Resetを含めローカルとCIで同一specを実行できる契約を照合
- [ ] GitHub Actionsで使うworkflow権限、`persist-credentials: false`、pull_requestを使う場合の外部PR安全性、Artifact/ログのSecret防護とcleanup条件を点検
- [ ] M08〜M10の14目標それぞれで教本・P01〜P06・提出・採点基準・復習先・stateの意味を確認し、専用契約テストと静的/実行証拠を記録。M10正式評価は評価ブランチへ引継ぐ
- [ ] Private repoでのPR/CI/費用・権限・公開制約について、**本人用の実施手順、必要な確認事項、停止条件、期待結果**を教材/専用テストで整備し#199へ引継ぐ。本人Private repoの外部操作はこのPRで実施しない

## クイズ・理解事項・任意Phaseの受入（補完）

- [ ] `docs/curriculum/ai-assisted-qa/quizzes/M08.json`〜`M10.json`について、14目標/理解事項の判断能力、正誤理由、復習先を照合。安全でないCI操作や有料Runnerへの自動変更を正解例にしない
- [ ] `knowledge-graph.json`のM08〜M10の理解事項の意味・粒度・前提・教材節・判断/実行の観測をレビューし、未承認ノードを形式的に承認済みにせず、共通グラフ修正は#199へ提案
- [ ] M07→M08の本人作成spec/依存/Config/Reset/RunとM09→M10の配布済みShop/固定SHA/無効workflowの引継ぎをID・revision・ファイルで検査。**Phase 3は選択**であり、未受講によってPhase 1/2の修了が失われないことを確認
- [ ] 通常OpenCodeのCIログ解説・段階ヒント・失敗時復習の教材/プロンプトとM10独立評価の権限境界を確認。実モデルとの学習対話・本人の正式修了は#199へ渡す

## #199最後に実施する実受入（本PRのチェック対象外）

- 本人のM08 Git stage/commit/PR説明・Secret除外の実操作
- 本人Private repoでのM09→M10専用workflowの明示的有効化、実Run/Check/Artifact/費用と本人の判断
- 認証付きOpenCodeによるCI失敗のヒント・復習、M10正式AI評価とPhase 3任意受講の確認

エージェントは固定SHA・必要なspec/Runner配布経路・実行手順・安全条件・成功/拒否の期待値を#199へ引継ぐ。
