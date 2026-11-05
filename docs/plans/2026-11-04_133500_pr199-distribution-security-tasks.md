# PR #199 教材配布・Skill・ライセンス・データ保護タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。開始時に`AGENTS.md`、[分担Plan](./2026-11-04_pr199-parallel-branches.md)、本リストと対象HEAD/CI/既存コード・テストを確認する。項目ごとに確認したコマンド・結果・SHA/Run・証拠パスと未確認事項を記録し、証拠が成立した項目だけ`[x]`とする。
>
> 自分の所有ファイル以外（製品SUT、正式仕様、Seed/Reset、既存製品テストを含む）は直接変更しない。必要な変更はPR上で#199または#210へ引継ぎ。課金・外部公開・PRマージ・force push・branch削除は実施しない。

## この環境のエージェントが担当する範囲

PR #218では配布許可リスト・固定版Skill/Shop・`course:sync/load/check`・安全なTemplate生成/エクスポートをGitHub上のコード・契約/負例テスト・許可済みCIで検証し、ライセンス原典と通知条件を調査する。**学習者Private Codespacesへの実配布、実Port/本人ファイル保存・OpenCode認証/料金、実Web操作、再配布に必要な最終権利承認は#199の最後**に受け入れる。使用権限不明を「配布可能」と断定しない。

2026-11-05時点 **5/21件チェック済み**（根拠：[配布監査レポート](../reports/2026-11-05_pr218-distribution-audit.md)、監査対象HEAD `69e71fc685d3e66072c5cd21d17b140dd3a9c459`）。固定SkillのGitツリー全件照合、#216へのRunner取得契約引継ぎ、固定SHAのfixture再同期、`course:load`のID検証、11モジュール・22状態の静的照合を完了。新規修正後HEADのCI・実同期・本人環境の実受入は未確認であり、該当チェックを付けない。基点由来のMarkdown lint失敗は修正済み#199との同期後に再確認し、配布機構の不具合と決め付けない。

## 変更範囲

編集：`training/course-sync/**`、`scripts/training/ai-assisted-qa-course-core.mjs`、`scripts/training/prepare-learner-template.mjs`、配布固有の新規契約テスト・監査レポート。共通`scripts/training/ai-assisted-qa-course.mjs`、`package.json`/lockfile、各モジュール、`assessment/**`、Phase 3無効workflow、知識グラフは統合先/他担当が所有。

起点のmanifestではローカル140ファイル、固定Skill由来104ファイル。2026-11-05に固定Skillの漏れ1件を修正し、現在は105ファイル（13 Skill、Git treeと全件一致）。これはスナップショットであり、変更後の分母は毎回再計算する。

## 配布物の生成と固定SHA

- [ ] `training/course-sync/manifest.json`のallowlist、外部Skill元、`source_sha`、`generated.shop_build`と実ファイル依存閉包（import/asset/runtime）を全件照合
- [ ] cleanな固定commitを入力とする`course:sync`→`verify-distribution`→Shop Build→SHA/manifest照合を既存のGitHub Actions・契約テストで確認し、実行ログ/結果/失敗を記録。学習者個人の実配布は#199へ引継ぐ
- [x] 同一固定SHAからの同期を再実行して成果物が一致し、作業中ファイル/未commit差分・別branch差が混入しないことを検証
  - 証拠：[Web CI #41967650261 / Vitest (contracts)](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261/job/127048586023)、HEAD `594a72b724eb`の`re-syncs a pinned Git commit and rejects dirty or divergent sources` **PASS**。一時Gitリポジトリのclean commit実SHAで同期、`verifySyncedCourseDistribution`で22状態確認、同SHA再同期の`copied=[]`と出力snapshot完全一致、未commitの追加ファイル拒否、別branchでcommit後のSHA不一致拒否、拒否後も出力snapshot不変を確認。CI Run全体は別件のM03検証不整合でFAILしたが、当該テストはPASS。これはcommit固定のfixture検証であり、実`dist/**`・現行コース固定HEADからのShop Build連結は次項で未完。
- [ ] 許可外path、欠落、Symlinkによる領域逸脱、重複/衝突、無効SHA、途中失敗、改ざん済みmanifestやgenerated Shopを負例で拒否
- [ ] Shop/manifest照合と8082 Serve/Seed/Resetの起動契約・入口・全Buildへのfallback禁止を既存コード/CIで検査。本人Codespacesでの実Port/Browser操作は#199へ渡す
- [x] M09→M10のRunner取得方式をPhase 3担当へ提供（許可ファイル・固定SHA・Hash/manifest検証のインターフェース）。Phase 3のworkflowはこのブランチでは変更しない
  - 証拠：[#216への引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/216#issuecomment-6648932414)（2026-11-05、固定SHA、配布manifest/hash、取得後の検証順序、失敗時BLOCKED、Run証拠を記載）。取得元の実確定・実Runner実行は#216/#199側に残る。

## 学習者のロード・非破壊性

- [x] `course:load` がM00〜M10の単一IDのみ受理し、未知/複数ID・パストラバーサルを拒否すること
  - 証拠：[Web CI #41967650261 / Vitest (contracts)](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261/job/127048586023)（HEAD `594a72b724eb`）で`rejects unknown, multiple, and traversal module IDs in the public load CLI` **PASS**（6負例：引数なし、M11、M00+M01、`../M00`、`M00/../M01`、`M00 M01`）。`binds the fixed SHA, loads one module, preserves learner edits, and checks states read-only`もPASS。実装`scripts/training/ai-assisted-qa-course.mjs`の`args.length===1`、`loadModule()`の`MODULE_ID_PATTERN=/^M(?:0[0-9]|10)$/`を確認。manifestのload対象は全11 ID。**同Run全体は別のM03検証不整合によりFAIL**、修正後HEADのCIは別確認。本人Private Codespacesでの全11実ロードは#199。
- [ ] 全11モジュールの開始入力・Skill-localファイル・start/end revisionをmanifest/validator/契約テストで検査し、M03のAuthority/Risk/Scope欠落を拒否。学習者による実ロード・修了の判定は#199へ渡す
- [ ] 同じID再ロード・他モジュールを含む既存workspace・提出/Trace/個人評価履歴を上書き・削除しないことを成功/途中失敗の両方で確認
- [ ] 先行成果物を失った場合でも、公開可能な独立開始入力で着手でき、本人の前Phase修了を架空に復元しないこと
- [ ] Web生成物と学習Templateが同一のMarkdown/クイズJSON・固定SHA/revisionに対応することを静的/CIで検証し、異版時のBLOCKEDと再読込非上書き契約を確認。公開Webの実ブラウザ受入は#199へ渡す

## 配布除外・法的条件・安全性

- [ ] `assessment/reference-solutions/**`、`scoring-tests/**`、`completed-states/**`、完成spec、正式workflow、旧教材、個人成績、`.env`/credential/secretがTemplate・Web・Build/Artifactへ混入しないことを検証
- [x] 固定`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`の必要`SKILL.md/references/assets/scripts`全ファイルと改変有無を照合。不要な`evals/**`や内部評価runtimeを配布しない
  - 証拠：[2026-11-05配布監査](../reports/2026-11-05_pr218-distribution-audit.md)。固定Git tree `truncated=false`、13 Skillの105/105ファイルでパス・Blob SHA・サイズ一致、欠落/改変0。`evals/**`配布0。本人Codespacesへの実配置・Python実行は別受入。
- [ ] 固定Skillと第三者素材/生成物のライセンス原典・権利者・再配布条件・NOTICEを一次資料で調査し、出典と未確認項目を台帳化。許諾の最終判断・不足時の公開可否は#199へ引継ぎ、未確認のまま「許諾済み」にしない
- [ ] 外部AI送信対象（本人回答・関連節・Run要約）の明示、Token/個人情報/無関係な内容の除外・サイズ上限、Git外保存の実装と説明が一致すること。評価エンジン固有の処理は正式評価担当へ引継ぐ
- [ ] `prepare-learner-template.mjs`の出力許可リスト・Hash・Secret・禁止ファイル、repo外生成先の安全性、コピー後に不足がないことを検証（外部GitHub repo作成・公開は行わない）
- [ ] 依存/配布の契約・異常系テスト、Build/Serve、検証証拠を固定HEADで報告。未確認事項を元Planに引継ぐ

## 後続作業（本PRでは先行実施しない）

- **マージ後の本人作業**：Public Template作成・公開。ここでは手順/配布物監査まで。公開の実施を本ブランチの完了条件には含めない
- **他作業完了後の本人作業**：Private repo・2コアCodespacesの実検証。未実行をPASSとしない（本ブランチのマージ前完了率には計上しない）

## Web・AIチューター・成果物保全との接続（補完）

- [ ] 公開Webと学習用Templateが同一教材Markdown/クイズJSONの版を参照し、`source_sha`/revisionの不一致を受講者へ説明・受入可能にする契約を検証。Web画面の一問ずつの操作・アクセシビリティ・共通生成処理の修正は**#199本体**へ引継ぎ、製品画面の実受入である#219と混同しない
- [ ] Phase 1/2の提出Markdown・spec/Config・Trace/Run・非公開評価結果についてGit/PR不要のエクスポート手順・保存先・除外・再ロード非破壊性をfixture/契約・CIで検証。本人のダウンロード・復元は#199へ渡す
- [ ] 通常OpenCodeチューターの無料モデル/Secret・段階ヒント・復習用入力と正式評価の外部送信/権限/履歴の分離を、配布ファイルと公開設定/契約テストで検証。実モデル認証・料金/実対話は#199へ渡す
- [x] 現ブランチの11モジュール・22状態のID/revision/公開サンプル/評価資料除外を固定版manifest・契約テストで照合。#214〜#217更新後の統合版を用いた実ロード/非破壊性の最終実受入は#199へ引継ぐ
  - 証拠：2026-11-05、HEAD `706484ba1b2da68f875177865bf6f066f635a244`の固定`manifest.json`を11 IDで集計。各IDのlesson/quiz/公開startはそれぞれ1、end state 1、load entries 7〜15件、配布禁止`reference-solutions/scoring-tests/completed-states/evals`のlocal source/target 0。GitHub上の全22 state JSONを実ファイル照合し、module_id・state・`revision=ai-assisted-qa-course-v3`・`source_sha=null`（sync時bind）・`public_contract=true`・`read_only=true`・非公開評価資料除外フラグが一致。11 startすべて`public_fallback.public=true`。さらに[Web CI #41967650261 / Vitest contracts](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967650261/job/127048586023)で`checks all 22 module states without modifying state or learner files` **PASS**。修正後HEADのCI最終結果・本人Private環境は別受入。

## #199最後に実施する実受入（このPRのチェック対象外）

- 本人Private学習環境へ固定Shop/11モジュール/Skillを同期し、実Portで起動・ロード・再ロード・提出物保持を確認
- 本人のGit/PR不要の成果物ダウンロードと復元、Web教材とのrevision照合、実OpenCodeの料金/権限/Secretを確認
- 外部Skill・第三者素材の再配布権利と公開条件の最終判断。Public Template公開自体は従来どおり#199マージ後の本人作業

配布元の固定commit・ファイルSHA/manifest・期待結果・実行手順・未確認原典を#199に引き継ぐ。
