# PR #199 正式AI評価・校正・再評価タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。開始時に`AGENTS.md`、[分担Plan](./2026-11-04_pr199-parallel-branches.md)、本リストと対象HEAD/CI/既存コード・テストを確認する。項目ごとに確認したコマンド・結果・SHA/Run・証拠パスと未確認事項を記録し、証拠が成立した項目だけ`[x]`とする。
>
> 自分の所有ファイル以外（製品SUT、正式仕様、Seed/Reset、既存製品テストを含む）は直接変更しない。必要な変更はPR上で#199または#210へ引継ぎ。課金・外部公開・PRマージ・force push・branch削除は実施しない。

## エージェント担当と実モデル校正の境界

PR #217では正式AI評価器のソース・ルーブリック/校正データ、決定論的検査・権限境界、GitHub API/Playwright証拠取得処理、負例テスト・既存GitHub Actions CIまでを実装・確認する。**認証付きOpenCode実モデルでの採点と重大誤PASS 0件の最終校正、本人Private Codespaces/Private PRの証拠確認は#199の最後**に行う。模擬モデルのPASSを実モデル校正PASSへ転用しない。

確認済みは4/22件。`5b8f37686a7b89c8541d7d2ceb836d0d90072f9d`のWeb CI Run `41862840552`では`Vitest (contracts)`を含むジョブが成功。評価器の再開・排他・履歴の既存実装と該当テストを照合し、チェック対象の既存処理はその後変更していない。新規変更に対するCI結果は未確認であり、新しく追加したテストのPASSは主張しない。

## 変更範囲と受入の区別

編集：`training/ai-assisted-qa-course/assessment/**`、`scripts/training/ai-assisted-qa-assessment*.mjs`、`scripts/training/ai-assisted-qa-run-evidence.mjs`、評価専用契約テスト・評価レポート。M00〜M10の教本・演習、`scripts/training/ai-assisted-qa-course.mjs`、manifest、共通Planは他ブランチ/統合先の所有。必要なAPI変更はPRコメントで依頼する。

M04＝Phase 1（22 ID）、M07＝Phase 2（15 ID）、M10＝Phase 3（14 ID）。**正式な受講者の合格判定は全対象IDがLevel 2以上かつ証拠が有効なときのみ**。テストfixtureの`expected_decision`ラベルをLevelへ直接変換しない。

## 入力・根拠・決定論的検査

- [x] `course:assess` がM04/M07/M10を区別して正しい必須目標ID集合（22/15/14）、重複・欠落・不明IDを検査（固定HEADの契約テストと本節の直接照合で検証）
- [x] 固定`source_sha`で公開のscoring/rubric/referenceの必要な資料だけを読取り取得し、source/path/Hash/Schema/revisionの不整合・redirect・HTML等を拒否（固定HEAD `25efa45848c43bc74e73dfc83984b50aef12806e`、Web CI Run `41946344709` の `Vitest (contracts)` 成功。Prettier失敗は別途修正中）
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

- [x] `workspace/.course-assessments/`への非公開保存、Git除外、外部送信最小化、Machine/人間可読結果・復習先の整合を確認（既存の結果保存・履歴・要約生成・秘密情報除外を固定HEAD `2a91cae0a57297a53ad783e6eb5a1c9550a252b0` の契約CI成功で確認。本人の送信承認は別途必要）
- [x] 試行ID、排他`.resume.lock`、`.current-publish.lock`、中断→再開/競合を検証。古い正式結果を上書き/削除しない（既存の契約テストと固定HEADの成功済みCIを確認。根拠は下記）
- [ ] 版・証拠・校正が一致する既存IDのみ安全に再利用し、変更されたIDと不足IDの再評価/履歴を保全する
- [ ] Phase 1/2はGit/PRを必須にせず結果の安全なエクスポートと復習後の再挑戦ができること
- [ ] 変更した評価器の直接契約/負例・モック実行・既存CIを固定HEADで検証し、実モデル校正/Private Codespaces/本人認証について#199向け実施手順・期待値・未実行理由を記録

## 実行証拠の真正性・チューターとの分離（補完）

- [ ] 評価器のNode側が許可したspec/Configで新しいPlaywright Runを要求・検証する処理と、旧Run/手入力PASS/別spec拒否のfixture・CIテストを整備。本人spec・実Codespacesでの新Runによる受入は#199へ渡す
- [ ] M07 before/afterの別Run・Page Object/fixture import・業務Assertion不変を検証するコード/fixtureを作り、Node側実行とAI意味評価の権限境界をテスト。本人の実Runは#199で受け入れる
- [ ] M10のPR HEAD/attempt/Check/Artifact/target SHAをGitHub APIで取得・照合する経路と、merge-ref/旧Run/偽データ拒否のAPI mock・非公開token保護テストを整備。本人Private repoの実API照合は#199へ渡す
- [ ] 通常OpenCodeチューターの教材/指示/学習セッションから正式評価への情報・権限流入を禁止する契約/負例を整備し、本人との実対話/復習・再評価は#199に引き継ぐ

## 2026-11-05 非公開保存と現在のCI確認

- **項目14をチェック：** `.gitignore` で `/workspace/.course-assessments/`、`/workspace/course-assessment-exports/`、M10私有証拠を除外。`createAttemptDirectory` は試行ディレクトリを `0700`、`atomicWriteJson` は一時結果を `0600` で作成し、同名の結果を上書きしない。Nodeの `saveSummary` は保存したMachine結果のcriterion/evidence/level/rationale/gaps/review_pathsから日本語要約と復習先を導出。`resolveWorkspaceFile`・`assertNoSecretText`・`confirmExternalSend` は入力をworkspace内・サイズ制限・Secret拒否・明示SEND確認へ限定。完全な外部送信禁止ではなく、本人によるモデル使用確認が必要。これらの保存・要約・排他・履歴テストを含む固定HEAD `2a91cae0a57297a53ad783e6eb5a1c9550a252b0` の [Web CI Run 41950753751](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41950753751) は全体成功。現行HEADの追加変更は別検証とし、OpenCode実認証は#199へ残す。
- **項目5（未チェック）：** `finalizeAssessment` に必須ID全件の外部入力 `requiredObjectiveIds` を追加し、保存する実結果の最終判定時にも欠落・別Phase ID・重複を `ungradable` とするよう変更。Nodeの `validatePhaseObjectiveIds` と `validateCandidate` の後に最終確認として実施。対応するテストと `not_run/ungradable/blocked` の負例を追加したが、新HEADの契約CIは未確認。
- **項目17（未チェック）：** `exportAssessment` に直接API向けP1/P2限定ガードを追加。P2でGit/PR不要の結果エクスポート・保存済み結果不変・別IDの再試行を行うテストを追加。現HEADのCI未確認のためチェックしない。

## 2026-11-05 CI失敗の修復（追記）

- **原因確認：** 固定HEAD `365c951cc48588188ce60254c4f4b4b6cab46775` の [CI Run 41949252201](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41949252201) は `Style Quality`（Prettier警告3ファイル）と `build-automation` / `build-production` の失敗を確認。ビルドで最初に起きた失敗は共有 `scripts/training/validate-ai-assisted-qa.ts:565` における M06 `evaluation_policy.execution_evidence.required_runs` の固定配列不一致。原因は本PRで追加した `required_case_ids` 属性。
- **修正：** 共有Validator/manifestは編集しない。M06の `required_runs` を元の固定構造に戻し、追加Case ID (001〜005) の必須集合は担当スクリプト `ai-assisted-qa-run-evidence.mjs` の `M06_CASE_IDS` として保持。`ai-assisted-qa-assessment.test.mjs` のモックも固定構造に戻し、重複ID拒否の負例を維持。Prettierが警告した3ファイルのうちM06.jsonの追加配列を撤去し、残り2ファイルも短い配列などの整形を修正。
- **部分的に確認した新しいCI：** 固定HEAD `68f26855e54a16fcefffecc4b504f147d60afe01` の [CI Run 41950254754](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41950254754) では `build-production`、`build-automation`、`Training runtime contracts`、`Code Quality` が成功。`Style Quality` は `ai-assisted-qa-assessment-pinned-assets.test.mjs` の1ファイルのみ警告で失敗。その後、100文字以内に折り畳めるJSON負例の短い配列を整形したが、修正後のCI成功は未確認。
- **受入判定：** 新規テストは固定HEADの `Vitest (contracts)` 成功を確認してからチェックする。Run証拠の偽造耐性にはself-generated receiptの限界が残るため、モックPASSだけで「架空ログは通過不能」とは断定しない。現時点のチェックは3/22のまま。

## 2026-11-05 継続作業・実装結果

- **固定SHA取得の完了チェック：** `fetchPinnedAssessmentAsset`の検査と`tests/contracts/ai-assisted-qa-assessment-pinned-assets.test.mjs`の負例は、固定HEAD `25efa45848c43bc74e73dfc83984b50aef12806e`のGitHub Actions [Run 41946344709](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41946344709)で`Vitest (contracts)`成功。タスクリスト項目2をチェック。Run全体の`Style Quality`は`tests/contracts/ai-assisted-qa-assessment-pinned-assets.test.mjs`と`ai-assisted-qa-assessment.test.mjs`のPrettier失敗。2ファイルの折返しを再修正したが、修正後CIは未確認。
- **M06 Case ID の実行証拠：** `scoring-tests/M06.json`でmain（001〜003）およびinitial/repeat（004・005）の独立Case IDを必須化し、`verifyModuleRunEvidence`が同一Runのtest名でIDの過不足・重複を拒否するよう更新。reportとreceiptの整合ハッシュを更新してもCase ID重複が`ungradable`となる負例を`ai-assisted-qa-assessment.test.mjs`へ追加。さらに採点基準で001のMug数量1、002の超過拒否後数量1、003のlow-stock数量3、004の削除、005の数量1→2と再読込を別々に照合するよう要求した。**Case IDだけ付けた空testや弱いAssertionを実ブラウザで拒否できたことは未検証。** 新規CIも未確認のため補完項目とM04/M07実行証拠項目はチェックしない。
- **OpenCode JSONイベントと独立権限：** `ai-assisted-qa-assessment-core.mjs`で`step_finish`のreasonを`stop`/`end_turn`に限定し、terminal後のイベント、複数session、tool/errorイベントを拒否。プロバイダーのerrorイベントおよびCLI非0終了は`BLOCKED`として扱う。`ai-assisted-qa-assessment.mjs`の評価プロセス環境へ`OPENCODE_DISABLE_EXTERNAL_SKILLS=true`を追加。固定`2.0.22`はOpenCode V2の公式`run --standalone --pure --format json`と`agents.permissions`スキーマに対応する。参考：[CLI](https://dev.opencode.ai/v2/docs/cli/commands/)、[Config](https://dev.opencode.ai/v2/docs/config/)、[Agents](https://dev.opencode.ai/v2/docs/agents/)。**実モデル認証、無料枠・価格、実プロセスの権限拒否、429再現は未確認。** CLI・料金・権限チェックを完了としない。
- **残る不足：** `course:run`のM05許可specにはP05本人用の`p05-cart-locator.spec.ts`がない。#215演習は直接実行しか案内できず、正式receiptが作れない。評価範囲と新Run契約の調停が必要。外部importしたPage Object/fixtureの依存ファイルSHAがRun証拠に含まれない問題、故意に作った偽receipt・空testを真の実行証拠として識別する限界、M10 Private GitHub照合も未解決。Runnerに対する単なるstring allowlist追加だけで合格とはしない。
- **CI未確認：** 最新コードへのformatter、直接Vitest、専用Playwright実Runはローカル依存を利用できず未実施。GitHub Actionsの新HEADを確認後に失敗ファイル/ジョブに限定して修復し、固定SHA・Run証拠を追記する。CI完了待機は行わない。

## 2026-11-05 追加の実装修正・未完了条件

- **固定SHA取得（2項目目、チェック済み）：** 既存の`scripts/training/ai-assisted-qa-course-core.mjs`でscoring/rubricを許可パス、固定`source_sha`、サイズ・SHA-256、スキーマ・revision、HTTP 200・非redirect・非HTMLで検証する処理を再確認。`tests/contracts/ai-assisted-qa-assessment-pinned-assets.test.mjs`を新設し、正常な固定SHA・異なるURL・redirect・HTML・サイズ超過・Hash不一致・不明パス・不正revisionをモック検証する。Web CI Run [41946344709](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41946344709) の `Vitest (contracts)` は固定HEADで成功。`Style Quality` の別FAILを解消するまでPR全体は成功扱いにしない。
- **Run証拠の真正性（3項目目および補完、未チェック）：** `ai-assisted-qa-run-evidence.mjs`のRun attachmentへSHA-256を保存し、照合時はTraceを再読込したSHAをreceiptと比較。同じサイズのTrace改変を`ai-assisted-qa-assessment.test.mjs`で拒否する負例を追加。過去のSHAなしTrace receiptは再評価で`ungradable`として扱い、元の履歴は削除せず新Runが必要。`assessment/README.md`に制限を明記。正当なブラウザRunによる検証は#199最終実受入に引継ぐ。
- **教材からの評価条件の引継ぎ（4・10・11・20項目目の一部、未チェック）：** #214/#215の現HEADと照合し、`scoring-tests/M00.json`の架空誤回答の独立訂正、M01/M04の4層採否・限界・費用、M03の数量遷移（4拒否・2保持・0削除）と通常Cart統合の分離、M07の別ページ経由Cart再入場を独立したrequired_evidence/pass_conditions/reject_ifへ追加。`M07/maintenance-after/cart.spec.ts`の3件目を`reload()`から別商品ページ→Cart再入場へ変更し、関連する既存の合格校正fixtureも更新した。`tests/contracts/ai-assisted-qa-assessment-practical-criteria.test.mjs`を追加。模擬モデルの意味評価・実Chromium・認証済みOpenCode評価は未実施。
- **CIとレビュー：** 前回の固定HEAD `6da6af7e41568bd66aa3634f04e4f51ac0522f82`に対するWeb CI Run [41942464990](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41942464990)の`Vitest (contracts)`は成功、`Style Quality`は`Format check`で2ファイルの整形不足により失敗。該当箇所を修正し追加テストにも整形上の注意を反映したが、新HEADの成功は未確認。新規CIに失敗があれば実行ログを根拠に再修正する。
- **残る重要な検証：** M06固定Caseの業務Assertion・M07外部importの証拠閉包、失敗RunとPass Runの実証、M10のGitHub API照合、校正fixtureの意味判定と重大誤PASS拒否、外部送信/課金ガード、実モデルの認証/無料価格の確認。本人Private Codespaces/OpenCode/Private PR実受入は#199最後に行う。

- **3件目をチェック：** 固定HEAD `25efa45848c43bc74e73dfc83984b50aef12806e` の Web CI Run [41946344709](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41946344709) で追加した `ai-assisted-qa-assessment-pinned-assets.test.mjs` を含む `Vitest (contracts)` は成功。`fetchPinnedAssessmentAsset` で固定 `source_sha` と許可パス、サイズ・SHA-256、JSONのSchema/module/revision、redirect・非200・HTMLを拒否する。ただしPrettierチェックが落ちているため整形は継続修正する。

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
