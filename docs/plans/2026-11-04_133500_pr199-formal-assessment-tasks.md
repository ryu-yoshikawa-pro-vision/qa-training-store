# PR #199 正式AI評価・校正・再評価タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。開始時に`AGENTS.md`、[分担Plan](./2026-11-04_pr199-parallel-branches.md)、本リストと対象HEAD/CI/既存コード・テストを確認する。項目ごとに確認したコマンド・結果・SHA/Run・証拠パスと未確認事項を記録し、証拠が成立した項目だけ`[x]`とする。
>
> 自分の所有ファイル以外（製品SUT、正式仕様、Seed/Reset、既存製品テストを含む）は直接変更しない。必要な変更はPR上で#199または#210へ引継ぎ。課金・外部公開・PRマージ・force push・branch削除は実施しない。

## エージェント担当と実モデル校正の境界

PR #217では正式AI評価器のソース・ルーブリック/校正データ、決定論的検査・権限境界、GitHub API/Playwright証拠取得処理、負例テスト・既存GitHub Actions CIまでを実装・確認する。**認証付きOpenCode実モデルでの採点と重大誤PASS 0件の最終校正、本人Private Codespaces/Private PRの証拠確認は#199の最後**に行う。模擬モデルのPASSを実モデル校正PASSへ転用しない。

確認済みは2/22件。`5b8f37686a7b89c8541d7d2ceb836d0d90072f9d`のWeb CI Run `41862840552`では`Vitest (contracts)`を含むジョブが成功。評価器の再開・排他・履歴の既存実装と該当テストを照合し、チェック対象の既存処理はその後変更していない。新規変更に対するCI結果は未確認であり、新しく追加したテストのPASSは主張しない。

## 変更範囲と受入の区別

編集：`training/ai-assisted-qa-course/assessment/**`、`scripts/training/ai-assisted-qa-assessment*.mjs`、`scripts/training/ai-assisted-qa-run-evidence.mjs`、評価専用契約テスト・評価レポート。M00〜M10の教本・演習、`scripts/training/ai-assisted-qa-course.mjs`、manifest、共通Planは他ブランチ/統合先の所有。必要なAPI変更はPRコメントで依頼する。

M04＝Phase 1（22 ID）、M07＝Phase 2（15 ID）、M10＝Phase 3（14 ID）。**正式な受講者の合格判定は全対象IDがLevel 2以上かつ証拠が有効なときのみ**。テストfixtureの`expected_decision`ラベルをLevelへ直接変換しない。

## 入力・根拠・決定論的検査

- [x] `course:assess` がM04/M07/M10を区別して正しい必須目標ID集合（22/15/14）、重複・欠落・不明IDを検査（固定HEADの契約テストと本節の直接照合で検証）
- [ ] 固定`source_sha`で公開のscoring/rubric/referenceの必要な資料だけを読取り取得し、source/path/Hash/Schema/revisionの不整合・redirect・HTML等を拒否
- [ ] 仕様・Skill・state/revision、本人の提出ファイル・Run/Trace・証拠Snapshotのpath/SHA-256を検証し、別HEAD/旧Run/架空ログをPASSにできないこと
- [ ] M04の別条件・本人判断、M07のE2E before/after・Trace、M10のPR head/Run/Check/Artifact/target SHAを、それぞれ必要な実行証拠として独立に確認
- [ ] 出力のcriterion/evidence/level/reasonが全必須IDに対応し、未実行・判定不能・blocked/partial・再評価対象が決定論的集計で適切に扱われること

## OpenCode実モデル・最小権限

- [ ] `@opencode/cli`の対象版・`opencode run`の非対話/JSONイベント・stderr/終了コード/タイムアウトを仕様・既存コードと照合し、イベントを模擬したパーサ/異常系契約テストを追加。学習環境での認証付き実CLI接続は#199へ渡す
- [ ] 無料モデルの選択・料金確認を起動前ガードとして実装/文書化し、認証欠落・429・上限/不明価格を`blocked`として拒否する負例テストを用意。本人の実契約/費用確認・モデル接続は#199へ渡す
- [ ] 学習用セッションから分離した評価プロセス/権限設定を実装し、Shell/edit/Web/MCP/Skill/子Agent禁止の設定と模擬拒否を契約テストで検証。実モデル環境の権限拒否確認は#199へ渡す
- [ ] 本人提出・ログ中のPrompt Injectionを命令として実行せず、許可した資料/節だけをサイズ上限・Secret除外後に外部モデルへ渡すこと

## 校正・誤PASS拒否

- [ ] 正答・誤答・許容別解・部分達成・根拠不足・未実行の固定校正fixtureと判定契約を整備し、Node集計・モデル応答異常/欠落の負例をCIで検証する。**実モデルでの最終校正は#199**
- [ ] 旧SHA/別Run、改ざん・偽Trace、重複/欠落ID、Prompt Injection、異常JSON、タイムアウトの負例をCIへ追加。模擬評価器の重大誤PASSを0にし、**実モデルの重大誤PASS 0件は#199最終実受入**で別に確認
- [ ] 校正記録へモデルID/版・CLI版・Prompt Hash・rubric Hash・資料SHAを保存する契約を実装し、不一致時の再校正要求をテスト。実モデル校正結果の確定は#199へ渡す
- [ ] 不一致/校正不能時は合格へ繰り上げず`blocked`/`ungradable`等の正しい状態にし、再試行条件を提示

## 保存・再開・再評価

- [ ] `workspace/.course-assessments/`への非公開保存、Git除外、外部送信最小化、Machine/人間可読結果・復習先の整合を確認
- [x] 試行ID、排他`.resume.lock`、`.current-publish.lock`、中断→再開/競合を検証。古い正式結果を上書き/削除しない（既存の契約テストと固定HEADの成功済みCIを確認。根拠は下記）
- [ ] 版・証拠・校正が一致する既存IDのみ安全に再利用し、変更されたIDと不足IDの再評価/履歴を保全する
- [ ] Phase 1/2はGit/PRを必須にせず結果の安全なエクスポートと復習後の再挑戦ができること
- [ ] 変更した評価器の直接契約/負例・モック実行・既存CIを固定HEADで検証し、実モデル校正/Private Codespaces/本人認証について#199向け実施手順・期待値・未実行理由を記録

## 実行証拠の真正性・チューターとの分離（補完）

- [ ] 評価器のNode側が許可したspec/Configで新しいPlaywright Runを要求・検証する処理と、旧Run/手入力PASS/別spec拒否のfixture・CIテストを整備。本人spec・実Codespacesでの新Runによる受入は#199へ渡す
- [ ] M07 before/afterの別Run・Page Object/fixture import・業務Assertion不変を検証するコード/fixtureを作り、Node側実行とAI意味評価の権限境界をテスト。本人の実Runは#199で受け入れる
- [ ] M10のPR HEAD/attempt/Check/Artifact/target SHAをGitHub APIで取得・照合する経路と、merge-ref/旧Run/偽データ拒否のAPI mock・非公開token保護テストを整備。本人Private repoの実API照合は#199へ渡す
- [ ] 通常OpenCodeチューターの教材/指示/学習セッションから正式評価への情報・権限流入を禁止する契約/負例を整備し、本人との実対話/復習・再評価は#199に引き継ぐ

## 2026-11-05 継続作業の検証

- **必須目標ID 22/15/14：チェック済み。** `validatePhaseObjectiveIds`はPhaseと終端stateのID・件数・重複、各scoringのmodule接頭辞・ID集合・欠落・余分を検査。`tests/contracts/ai-assisted-qa-assessment.test.mjs`の正例・欠落・重複・不明ID・終端state不一致を含む既存HEAD `6da6af7e41568bd66aa3634f04e4f51ac0522f82`に対する GitHub Actions [Run 41942464990](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41942464990)の`Vitest (contracts)`は成功。`assessment/scoring-tests/M00..M10.json`とM04/M07/M10終端stateの直接照合でも、P1=22/22、P2=15/15、P3=14/14で順序を含め一致。Run全体は`Style Quality / Format check`失敗のため成功扱いにしない。整形を修正済みだが修正後CIは未確認。
- **コード整形の修正：** 前述Runの`Style Quality`ログでは`scripts/training/ai-assisted-qa-assessment.mjs`と`tests/contracts/ai-assisted-qa-assessment.test.mjs`の2ファイルがPrettier警告。該当ブロックを整形し後続Runを確認する。修正後のformatterが成功したとは記載しない。

## 2026-11-05 の検証・変更記録

- **チェック済み：保存・再開の排他と履歴保護。** `scripts/training/ai-assisted-qa-assessment.mjs`の`withAttemptResumeLock`、`reconcileFinalizedAssessment`、`showHistory`と`tests/contracts/ai-assisted-qa-assessment.test.mjs`の同時再開（同一/別Nodeプロセス）、強制終了、最新ポインタ競合、結果の改変拒否、履歴の不変性を確認。既存の直接検証はGitHub Actions Web CI Run [41862840552](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41862840552)（HEAD `5b8f37686a7b89c8541d7d2ceb836d0d90072f9d`、`Vitest (contracts)`成功）。新規変更のCIは別扱い。
- **実装済み・新規CI未確認：** `ai-assisted-qa-run-evidence.mjs`のPlaywright JSON `config.rootDir`相対照合、別spec・skip・期待失敗・空attemptの拒否。実Playwright専用Configの`testDir`と比較し、`ai-assisted-qa-assessment.test.mjs`に同形式・nested suitesの正例と改ざん負例を追加。比較対象の旧ソースBlobは`d7c88233102c9402db268b65a3ac37039856051e`。
- **実装済み・新規CI未確認：** `validatePhaseObjectiveIds`を評価器で利用し、固定されたM04/M07/M10終端stateの必須目標22/15/14件と各scoring JSONを照合し、欠落・重複・不明IDを拒否。コネクタによる既存JSON直接比較ではP1=22/22、P2=15/15、P3=14/14、いずれも重複なし・順序を含め一致。GitHub上のデータの静的照合であり、新規テスト実行の代わりではない。
- **公開参照の整合：** `assessment/playwright/M06/remove-item.spec.ts`のtest名を`CASE-CART-004`へ修正し、`assessment/README.md`のCase件数を固定3件＋追加2件に修正。業務Assertionの実ブラウザRunは未実施。
- **未完了：** 新規CI・formatter・Playwright実Run、M06/M07のAssertion内容と外部importの証拠閉包、OpenCode実CLI・実モデル校正、M10 Private API照合。新規Run成功を確認するまで上記実装項目にはチェックを付けない。本人認証・Private Codespaces・重大誤PASS 0件の実校正は#199最終受入へ引継ぐ。

## #199最後に実施する実受入（このPRのチェック対象外）

- 本人の認証済みOpenCode実モデルを独立・制限権限で起動し、M04/M07/M10を未演習条件で採点
- 実モデルの正答/誤答/別解/部分/旧Run/偽ログ/注入/異常の校正と重大な誤PASS 0件の確認
- 本人Private 2コアCodespacesでの新規Playwright RunとPrivate GitHub APIのRun/Artifact照合、個人成績の保全・再評価

ここでのモックCI成功は実モデル校正の代替にならない。実モデル校正未達は正式修了をBLOCKEDとする。
