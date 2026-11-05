# PR #199 Phase 3（M08〜M10）GitHub・CI教材タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。作業開始時に`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、このリスト、最新HEAD/CI、関連仕様・テストを確認する。
>
> **完了条件**：各チェック項目の仕様/教材/コードの整合と必要な実行証拠（対象HEAD、実行環境・コマンド・結果・Run）を得たときだけ`[x]`へ変更する。未実行/BLOCKEDは理由・再開条件を記録して未完のまま保持。製品SUT・正式製品仕様・既存Seed/Reset・製品用テスト/workflow、および他ブランチの所有ファイルは変更しない。変更依頼はPR上で#199へ引継ぐ。個別PRは#199をbaseとし、許可なくマージしない。

## このPRで実施する範囲

GitHub接続エージェントはM08〜M10の教材・クイズ・演習・Git/CI操作例・無効workflow見本と安全な配布/証拠検証コード、契約・負例テストおよび既存CIを担当する。**本人Private repoでの課金/権限判断・実PR・実CIとOpenCode実モデルの学習/修了は#199の最後に受け入れる**。ここでの成功は技術準備/自動テストの成功であり、受講者の修了ではない。

現在4/24件チェック済み。M08-01〜04は隔離Gitの技術検証と教材/固定サンプルのレビューであり、本人のGit実操作・AI実モデル受入・PR作成を意味しない。検証基点の実装HEADは`61796817e8b2`（PR HEADは変更のたびに再取得する）。GitHub Actionsの変更後CIは完了確認前のため、CI合格を根拠とする他項目は未チェック。既存#199のCI失敗原因は修正済みだが、このブランチの古いCI失敗は基点が古いことによるMarkdown lintであり、別の業務不具合と扱わない。エージェント側では最新#199との差分を照合し、修正後のCIを再確認する。

## 変更範囲

14学習目標。編集：`docs/curriculum/ai-assisted-qa/modules/M08..M10/**`、対応する`training/ai-assisted-qa-course/exercises/Mxx/**`・`states/Mxx/**`・`docs/curriculum/ai-assisted-qa/quizzes/M08.json`〜`M10.json`・`templates/phase3/**`・`scripts/training/ai-assisted-qa-github-run-evidence.mjs`・固有の契約テスト。配布manifest、course sync、正式採点エンジン、共通テスト/lockfileは別担当。

## 2026-11-05 技術検証・引継ぎ

- **M08-01/02（隔離Git検証：PASS）**：対応テスト`tests/contracts/ai-assisted-qa-phase3-git-fixture.test.mjs`を追加。実装基点`61796817e8b2`、Linux・Git 2.47.3・Node.js 22.16.0。作業環境の一時リポジトリで`git init`、`git switch -c practice/m08-review`、`git status --short --untracked-files=all`、`git add -- <個別パス>`、`git diff --cached --name-only`、`git diff --cached --check`、`git commit`、`git show --name-only`を実行し、対象ファイルのみの記録を確認。`.env`、`output/trace.zip`、`workspace/M08/local-only-run.log`は配布用ignore契約で除外され、`git add -f -- .env`は強制stageできる負例、`git restore --staged`後に作業ファイルが残ることも確認。ダミー値のみ使用。新規Vitest自体のGitHub CI結果は未確認であり、本人の操作や修了の証明ではない。
- **M09→M10の配布物検証契約（修正済み・受入未完）**：`scripts/training/ai-assisted-qa-github-run-evidence.mjs`の検証条件を`templates/phase3/course-e2e.workflow.yml.disabled`の11 step、`verify-distribution`、`PLAYWRIGHT_USE_PREBUILT_DIST="true"`に合わせた。専用テストに完成見本の正例、配布確認省略・製品フルBuild・prebuilt無効・旧fallbackの拒否を追加。実コードの安全性・テストの成功は変更後CIで再確認するまで未確定。
- **残る受入阻害条件**：`training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled`は旧契約のままで、配布物検証とprebuilt固定を欠く。所有範囲に明示されていないため、このPRでは直接変更しない。#199統合側で修正または所有者を確定し、M10 fallbackを改めて契約テストする。本人Private repoのRunnerへ`course/shop/index.html`と`.course/distribution-manifest.json`を取得・配置する固定SHA/ハッシュ付き経路も未確定。生成・配布契約の担当PRと照合するまでworkflowを有効化せず、受入をBLOCKEDとする。
- **CI**：基点`f6b104187781`のWeb CIは成功。以後の実装HEADではGitHub Actionsの再検証中であり、旧HEADのPASSを現在HEADへ流用しない。途中RunのPrettier警告に対する書式修正も行ったが、最新HEADの結果は確認が必要。

## 2026-11-05 M08-03/04とM09の追加確認

- **M08-03（隔離Git実行：PASS）**：`tests/contracts/ai-assisted-qa-phase3-review.test.mjs`にmock PR APIとCase/spec/Run/commit SHAの追跡用fixtureを追加。Linux Git 2.47.3で`git init --initial-branch=main`、mainの基点commit→練習branchで2コミット→`git diff --name-only HEAD^ HEAD`、`git diff --name-only main...HEAD`、`git merge-base main HEAD`を実行。2回目単独は`workspace/M08/review-candidate.md`のみ、base...headは先行`first-change.md`も含むことを確認。fixture SHA: base `d75db311cc6774c2ef986bea129a80131e454c8a`、親 `26ebaf49093873456377dff4d3ab8023d158dc1b`、head `6348684b63083ed317367df03597133366c04c57`。実PR・API Run・実テストPASSは存在せず、fixture上の`run_id=null`・`not_executed`・未確認事項として明示。M08提出表とM09 handoff契約の列・ID・revisionを照合。
- **M08-04（教材と仮想レビューの採否確認）**：`exercises/M08/exercise.md`のP05にAIの見落としDを追加し、`submission-template.md`へ停止条件を反映。A「Run未実行をCI成功とする」は却下、B「仕様ID・diff・Runを対応付ける」は採用（Runがなければ未実行）、C「重複のない小変更をFactoryへ分割」は却下、ただし重複と変更負荷が実証された別条件は便益・リスクを確認して再検討。D「AIが問題なしでもstageに非公開メモが混在」はコミット停止・stage再点検。教材`M08/README.md`、クイズ`M08-Q03/Q04`、提出様式と照合した。実モデルの応答・本人の採否は受入していない。
- **M09-01はBLOCKED**：`course/shop/index.html`と`.course/distribution-manifest.json`のPrivate runnerへの固定SHA取得・配置経路は配布担当との合意待ち。現在の`.disabled`見本の存在検証は取得処理を意味しないため、この項目を未チェックに保持。
- **M09-02/03/05（検証拡充・未チェック）**：`tests/contracts/ai-assisted-qa-phase3-ci-diagnostics.test.mjs`に実workflowの11ステップ・runner・対象SHA・配布ガード・Browser/Test/Artifactの責務、危険なevent/権限/認証情報保持/証拠欠落の負例、合成A/B/Cと別条件X/Y/Zの照合を追加。GitHub API Run/attempt/Check/Artifactについては`ai-assisted-qa-github-run-evidence.test.mjs`の既存固定SHA/旧Run負例を参照。新規契約テストのCI完了を確認するまでPASSは未確定。
- **M09-04/05（教材更新・未チェック）**：M09にGitHub公式のActions課金/使用量、プラン別含有利用量とfork/`pull_request_target`の安全条件を追記。本人Billing・予算・権限は未確認であり、無効workflowの有効化は引き続きBLOCKED。架空の更新21回/2回と実請求額を混同しない。
- **CI**：PR #216の直近確認HEAD`1b6f94c98bfe`はWeb CI Run `41941211966`がpending。M08-03のGit実行とM08-04の教材レビューは実施済みだが、新たに追加したVitest・formatterの全PASSとは扱わない。CIがFAILなら該当項目を見直す。

## M08：Git・PR・変更レビュー（4目標）

- [x] `M08-01`：作業用の隔離Git fixture/既存CIでworking tree→stage→commitの教材・証拠様式を検証。受講者本人のGit操作は#199最終実受入へ渡す
- [x] `M08-02`：安全なstage/ignore対象とSecret/Trace混入の禁止を教材・隔離Gitの負例テストで照合し、本人のリポジトリ選択操作は#199へ渡す
- [x] `M08-03`：PR base/head、差分、Case/spec/Run/SHA説明表の教材と固定サンプル・API/テスト契約を照合。本人によるPR説明は#199へ移す
- [x] `M08-04`：AIレビューの誤指摘・見落とし・不要な抽象化を根拠付きで採否。数の多さで評価しない

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
