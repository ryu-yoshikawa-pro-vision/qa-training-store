# PR #199 Phase 3（M08〜M10）GitHub・CI教材タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。作業開始時に`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、このリスト、最新HEAD/CI、関連仕様・テストを確認する。
>
> **完了条件**：各チェック項目の仕様/教材/コードの整合と必要な実行証拠（対象HEAD、実行環境・コマンド・結果・Run）を得たときだけ`[x]`へ変更する。未実行/BLOCKEDは理由・再開条件を記録して未完のまま保持。製品SUT・正式製品仕様・既存Seed/Reset・製品用テスト/workflow、および他ブランチの所有ファイルは変更しない。変更依頼はPR上で#199へ引継ぐ。個別PRは#199をbaseとし、許可なくマージしない。

## 変更範囲

14学習目標。編集：`docs/curriculum/ai-assisted-qa/modules/M08..M10/**`、対応する`training/ai-assisted-qa-course/exercises/Mxx/**`・`states/Mxx/**`・`templates/phase3/**`・`scripts/training/ai-assisted-qa-github-run-evidence.mjs`・固有の契約テスト。配布manifest、course sync、正式採点エンジン、共通テスト/lockfileは別担当。

## M08：Git・PR・変更レビュー（4目標）

- [ ] `M08-01`：working tree/stage/commit/branch/remote、変更→stage→commit、push/PR未実行の境界を実ファイル・履歴で確認
- [ ] `M08-02`：`git status/diff/check-ignore`でM07 specと必要なPage Object/fixture/helperだけを選択、ログ/Trace/Secret/個人記録の混入を拒否
- [ ] `M08-03`：PR base→head全差分と最終commit単独差分の違い、仕様/Case→spec→Run→SHAの説明表を本人が作れることを確認
- [ ] `M08-04`：AIレビューの誤指摘・見落とし・不要な抽象化を根拠付きで採否。数の多さで評価しない

## M09：CI・品質ゲート（5目標）

- [ ] `M09-01`：YAML event/job/step/runner、配布済みShopの生成者・取得・Serve・Test、install/build/server/testの責務を教材と完成見本で対応
- [ ] `M09-02`：PR head/merge SHA、Run/attempt/Check/Artifact、`target-sha.txt`の照合を固定SHAの正例・旧Run負例で確認
- [ ] `M09-03`：install/配布/Serve/test/artifactの最初の失敗箇所と、`if-no-files-found`、`if: always()`、SHA不一致の扱いを別条件で確認
- [ ] `M09-04`：本人Private repoの無料Actions条件・trigger・回数/保存・費用/停止条件を複数の架空ケースで判断。費用不明時はBLOCKED
- [ ] `M09-05`：外部PRと`pull_request_target`の危険、checkout・依存取得・Browser・Artifact・Secret・権限の最小化を判断し、安全なworkflow例へ対応

## M10：同一specのCI実行・Phase 3総合演習（5目標）

- [ ] `M10-01`：Phase 2本人specとConfig/Reset/依存を確認し、M07 specまたは指定fallbackを選び、不要な成果物を含めずstage
- [ ] `M10-02`：無効workflowを本人が安全に有効化する条件（無料枠、権限、対象spec、cleanup）を教材へ明示。**#199では完成見本を無効のまま**にする
- [ ] `M10-03`：実PR HEADとRun/Check/Artifact/対象spec/target-shaの一致・古いRun拒否を校正する
- [ ] `M10-04`：CI固有の失敗、製品/テスト失敗をログ/環境/対象SHAで分類して再実行判断を示す
- [ ] `M10-05`：AI提案の採否、CIが保証する範囲と未確認/残リスクの報告を具体的な証拠で確認

## M09→M10の技術的受入

- [ ] 配布済み`course/shop/index.html`と`.course/distribution-manifest.json`を、本人Private repoのRunnerへ**どの経路で取得・配置するか**を契約化。固定SHA、取得元、ハッシュ、許可範囲、権限を定義。配布ブランチのmanifest/生成契約と整合
- [ ] 無効workflow見本の`verify-distribution`、`PLAYWRIGHT_USE_PREBUILT_DIST=true`を維持し、不足時に製品フルBuildへ暗黙にfallbackしないことを負例テストで確認
- [ ] M07本人specとM10 fallbackが異なるtest rootで、相対import・fixture/Resetを含めローカルとCIで同一specを実行できる契約を照合
- [ ] GitHub Actionsで使うworkflow権限、`persist-credentials: false`、pull_requestを使う場合の外部PR安全性、Artifact/ログのSecret防護とcleanup条件を点検
- [ ] M08〜M10の14目標それぞれで教本・P01〜P06・提出・採点基準・復習先・stateの意味を確認し、専用契約テストと静的/実行証拠を記録。M10正式評価は評価ブランチへ引継ぐ
- [ ] Private repoの実PR/CI実行・課金に関係する外部操作は、決定済みの後続本人作業として扱い、学習用サンプル実行だけで本人の修了を認定しない
