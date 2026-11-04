# PR #199 教材配布・Skill・ライセンス・データ保護タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。開始時に`AGENTS.md`、[分担Plan](./2026-11-04_pr199-parallel-branches.md)、本リストと対象HEAD/CI/既存コード・テストを確認する。項目ごとに確認したコマンド・結果・SHA/Run・証拠パスと未確認事項を記録し、証拠が成立した項目だけ`[x]`とする。
>
> 自分の所有ファイル以外（製品SUT、正式仕様、Seed/Reset、既存製品テストを含む）は直接変更しない。必要な変更はPR上で#199または#210へ引継ぎ。課金・外部公開・PRマージ・force push・branch削除は実施しない。

## 変更範囲

編集：`training/course-sync/**`、`scripts/training/ai-assisted-qa-course-core.mjs`、`scripts/training/prepare-learner-template.mjs`、配布固有の新規契約テスト・監査レポート。共通`scripts/training/ai-assisted-qa-course.mjs`、`package.json`/lockfile、各モジュール、`assessment/**`、Phase 3無効workflow、知識グラフは統合先/他担当が所有。

起点のmanifestではローカル140ファイル、固定Skill由来104ファイル。これはスナップショットであり、変更後の分母は毎回再計算する。

## 配布物の生成と固定SHA

- [ ] `training/course-sync/manifest.json`のallowlist、外部Skill元、`source_sha`、`generated.shop_build`と実ファイル依存閉包（import/asset/runtime）を全件照合
- [ ] cleanな指定commitから`course:sync`→`verify-distribution`→Shop Build→配布物照合を実行し、HEAD/manifest/file Hash・コマンド・出力と失敗を記録
- [ ] 同一固定SHAからの同期を再実行して成果物が一致し、作業中ファイル/未commit差分・別branch差が混入しないことを検証
- [ ] 許可外path、欠落、Symlinkによる領域逸脱、重複/衝突、無効SHA、途中失敗、改ざん済みmanifestやgenerated Shopを負例で拒否
- [ ] 配布済みShop`course/shop/**`と`.course/distribution-manifest.json`の照合、8082 Serve/Seed/Resetへの実行入口を確認。受講者に製品フルBuildを要求しない
- [ ] M09→M10のRunner取得方式をPhase 3担当へ提供（許可ファイル・固定SHA・Hash/manifest検証のインターフェース）。Phase 3のworkflowはこのブランチでは変更しない

## 学習者のロード・非破壊性

- [ ] `course:load` がM00〜M10の単一IDのみ受理し、未知/複数ID・パストラバーサルを拒否すること
- [ ] 全11モジュールの正しい開始入力・必要Skill-localファイル・start/end revision/契約を検査。M03でAuthority/Risk/Scope/技法runtimeを欠く状態を事前拒否
- [ ] 同じID再ロード・他モジュールを含む既存workspace・提出/Trace/個人評価履歴を上書き・削除しないことを成功/途中失敗の両方で確認
- [ ] 先行成果物を失った場合でも、公開可能な独立開始入力で着手でき、本人の前Phase修了を架空に復元しないこと
- [ ] Web教材・クイズと学習用Templateの配布版が確認でき、Web再読込や再回答が本人のworkspaceを変更しないこと

## 配布除外・法的条件・安全性

- [ ] `assessment/reference-solutions/**`、`scoring-tests/**`、`completed-states/**`、完成spec、正式workflow、旧教材、個人成績、`.env`/credential/secretがTemplate・Web・Build/Artifactへ混入しないことを検証
- [ ] 固定`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`の必要`SKILL.md/references/assets/scripts`全ファイルと改変有無を照合。不要な`evals/**`や内部評価runtimeを配布しない
- [ ] 固定Skillと第三者依存ライブラリ/画像/フォント/生成物のライセンス・著作権者・再配布許諾・NOTICE原典を取得・確認し、必要な文面/同梱条件と配布ファイルの対応を記録。出典未確認を「許諾済み」にしない
- [ ] 外部AI送信対象（本人回答・関連節・Run要約）の明示、Token/個人情報/無関係な内容の除外・サイズ上限、Git外保存の実装と説明が一致すること。評価エンジン固有の処理は正式評価担当へ引継ぐ
- [ ] `prepare-learner-template.mjs`の出力許可リスト・Hash・Secret・禁止ファイル、repo外生成先の安全性、コピー後に不足がないことを検証（外部GitHub repo作成・公開は行わない）
- [ ] 依存/配布の契約・異常系テスト、Build/Serve、検証証拠を固定HEADで報告。未確認事項を元Planに引継ぐ

## 後続作業（本PRでは先行実施しない）

- **マージ後の本人作業**：Public Template作成・公開。ここでは手順/配布物監査まで。公開の実施を本ブランチの完了条件には含めない
- **他作業完了後の本人作業**：Private repo・2コアCodespacesの実検証。未実行をPASSとしない（本ブランチのマージ前完了率には計上しない）

## Web・AIチューター・成果物保全との接続（補完）

- [ ] 公開Webと学習用Templateが同一教材Markdown/クイズJSONの版を参照し、`source_sha`/revisionの不一致を受講者へ説明・受入可能にする契約を検証。Web画面の一問ずつの操作・アクセシビリティ・共通生成処理の修正は**#199本体**へ引継ぎ、製品画面の実受入である#219と混同しない
- [ ] Phase 1/2で作った分析Markdown、spec/Config、Trace、Run、非公開の評価結果を**Git/PRなしで**本人がダウンロード/保全できる経路を配布済み環境と手順で検証。後続の`course:load`、再ロード、停止/再作成で既存成果物の消去・上書きをしない
- [ ] 通常OpenCodeチューターの認証・無料モデル/料金確認・段階ヒント・復習用入力の配布境界と、独立正式評価の権限・外部送信・結果履歴を分けて検証。Secret/不要データ送信・モデルの自動有料切替・AI自己申告による修了を拒否し、採点エンジン固有の実装は#217へ渡す
- [ ] 現ブランチが参照する11モジュールの公開開始/終了状態22件、前後の成果物ID・revision・公開開始サンプル・評価資料の配布除外について、非破壊ロードと構造照合を実施。#214〜#217の改訂後に必要な再検証条件は#199へ引き継ぎ、**全ブランチ統合後の最終版検証は#199が担当**。意味的なLevel 2評価とは区別
