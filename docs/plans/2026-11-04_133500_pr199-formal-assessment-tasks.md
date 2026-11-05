# PR #199 正式AI評価・校正・再評価タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。開始時に`AGENTS.md`、[分担Plan](./2026-11-04_pr199-parallel-branches.md)、本リストと対象HEAD/CI/既存コード・テストを確認する。項目ごとに確認したコマンド・結果・SHA/Run・証拠パスと未確認事項を記録し、証拠が成立した項目だけ`[x]`とする。
>
> 自分の所有ファイル以外（製品SUT、正式仕様、Seed/Reset、既存製品テストを含む）は直接変更しない。必要な変更はPR上で#199または#210へ引継ぎ。課金・外部公開・PRマージ・force push・branch削除は実施しない。

## エージェント担当と実モデル校正の境界

PR #217では正式AI評価器のソース・ルーブリック/校正データ、決定論的検査・権限境界、GitHub API/Playwright証拠取得処理、負例テスト・既存GitHub Actions CIまでを実装・確認する。**認証付きOpenCode実モデルでの採点と重大誤PASS 0件の最終校正、本人Private Codespaces/Private PRの証拠確認は#199の最後**に行う。模擬モデルのPASSを実モデル校正PASSへ転用しない。

現在のチェックは18/22件。固定HEAD `d96dce17005a3a703f4604b9e192c91b2c9f0a84`のCI Run `41972670377`は`Vitest (contracts)`85ファイル・1146件PASS、整形・Lint・Training runtime contracts・2ビルド・verify/validate成功。今回追加した完了2件はこの固定HEADの契約検証に基づく。以降の再開処理の修正は別HEADであり、CI未確認として完了に含めない。

## 変更範囲と受入の区別

編集：`training/ai-assisted-qa-course/assessment/**`、`scripts/training/ai-assisted-qa-assessment*.mjs`、`scripts/training/ai-assisted-qa-run-evidence.mjs`、評価専用契約テスト・評価レポート。M00〜M10の教本・演習、`scripts/training/ai-assisted-qa-course.mjs`、manifest、共通Planは他ブランチ/統合先の所有。必要なAPI変更はPRコメントで依頼する。

M04＝Phase 1（22 ID）、M07＝Phase 2（15 ID）、M10＝Phase 3（14 ID）。**正式な受講者の合格判定は全対象IDがLevel 2以上かつ証拠が有効なときのみ**。テストfixtureの`expected_decision`ラベルをLevelへ直接変換しない。

## 入力・根拠・決定論的検査

- [x] `course:assess` がM04/M07/M10を区別して正しい必須目標ID集合（22/15/14）、重複・欠落・不明IDを検査（固定HEADの契約テストと本節の直接照合で検証）
- [x] 固定`source_sha`で公開のscoring/rubric/referenceの必要な資料だけを読取り取得し、source/path/Hash/Schema/revisionの不整合・redirect・HTML等を拒否（固定HEAD `25efa45848c43bc74e73dfc83984b50aef12806e`、Web CI Run `41946344709` の `Vitest (contracts)` 成功。Prettier失敗は別途修正中）
- [ ] 仕様・Skill・state/revision、本人の提出ファイル・Run/Trace・証拠Snapshotのpath/SHA-256を検証し、別HEAD/旧Run/架空ログをPASSにできないこと
- [ ] M04の別条件・本人判断、M07のE2E before/after・Trace、M10のPR head/Run/Check/Artifact/target SHAを、それぞれ必要な実行証拠として独立に確認
- [x] 出力のcriterion/evidence/level/reasonが全必須IDに対応し、未実行・判定不能・blocked/partial・再評価対象が決定論的集計で適切に扱われること（`validateCandidate`・`finalizeAssessment`の固定ID照合と未実行/判定不能/BLOCKED/Level 1負例を確認。HEAD `5499fcc871d345aef990a6d6a010df1c8e586e3d`、Web CI `41953473479`の契約テスト成功。再評価履歴の網羅は別項目）

## OpenCode実モデル・最小権限

- [x] `@opencode/cli`の対象版・`opencode run`の非対話/JSONイベント・stderr/終了コード/タイムアウトを仕様・既存コードと照合し、イベントを模擬したパーサ/異常系契約テストを追加。学習環境での認証付き実CLI接続は#199へ渡す（OpenCode V2のCLI/Config仕様とNode実装を照合。固定HEAD `02abbb7872615baaad6d6e4b03f01390acf76525`のCI Run `41961795221`では`ai-assisted-qa-assessment-process.test.mjs`の4件・既存イベント異常系を含む`Vitest (contracts)`が成功。本人認証付き実CLIは#199で実施）
- [x] 無料モデルの選択・料金確認を起動前ガードとして実装/文書化し、認証欠落・429・上限/不明価格を`blocked`として拒否する負例テストを用意。本人の実契約/費用確認・モデル接続は#199へ渡す（公開Models.devカタログの全公表単価0・正確なモデルIDを検査し、CLI列挙に存在しないモデル・価格不明・非200/429・外部送信不能をNodeでblockedとする。固定HEAD `7402bc0ff149f66f020a568566da4695ce85003a` のCI Run `41963853602`で料金負例を含む契約テスト成功。本人契約と実認証は#199）
- [x] 学習用セッションから分離した評価プロセス/権限設定を実装し、Shell/edit/Web/MCP/Skill/子Agent禁止の設定と模擬拒否を契約テストで検証。実モデル環境の権限拒否確認は#199へ渡す（`createIsolatedAssessmentRuntime`による一時HOME/CWD/XDG、メモリDBと全操作deny設定・Skill/MCP非流入、`ai-assisted-qa-assessment-isolation.test.mjs`のProcess/Tool負例を固定HEAD `2568dcbb2ccee6cbd670947abb502658f7134476`・CI Run `41968096517`の`Vitest (contracts)`で確認。CLI版/モデル列挙も同環境に統一した後のCIと実モデル権限拒否は未確認、#199に引継ぎ）
- [x] 本人提出・ログ中のPrompt Injectionを命令として実行せず、許可した資料/節だけをサイズ上限・Secret除外後に外部モデルへ渡すこと（システム指示と入力JSONの分離、公開出典とSkillの許可リスト、各証拠・Promptサイズ、UTF-8/Secret/Toolイベント拒否を`ai-assisted-qa-assessment-untrusted-input.test.mjs`、既存契約テストで検証。固定HEAD `d96dce17005a3a703f4604b9e192c91b2c9f0a84`・CI Run `41972670377`で4件を含む契約85ファイル1146件PASS。実モデルの意味的なInjection耐性は#199最終受入）

## 校正・誤PASS拒否

- [x] 正答・誤答・許容別解・部分達成・根拠不足・未実行の固定校正fixtureと判定契約を整備し、Node集計・モデル応答異常/欠落の負例をCIで検証する。**実モデルでの最終校正は#199**（M00〜M10の106固定Case、各5分類と11件のPrompt Injection負例を検査し、誤PASSをNode校正失敗へ分類。欠落/重複/不明ID・無根拠/未実行も拒否。固定HEAD `7402bc0ff149f66f020a568566da4695ce85003a` のCI Run `41963853602`で契約テスト成功。実モデル校正は#199）
- [x] 旧SHA/別Run、改ざん・偽Trace、重複/欠落ID、Prompt Injection、異常JSON、タイムアウトの負例をCIへ追加。模擬評価器の重大誤PASSを0にし、**実モデルの重大誤PASS 0件は#199最終実受入**で別に確認（旧source SHA・別spec/Run・改変TraceのSHA・重複/欠落Case・11件のInjection偽PASS・JSONイベント異常・子プロセスtimeoutの負例を検証。固定HEAD `d96dce17005a3a703f4604b9e192c91b2c9f0a84`・CI Run `41972670377`で契約85ファイル1146件PASS。自己申告のRunを一括偽造する攻撃の外部出自保証は別項目として未完了、実モデル重大誤PASSは#199）
- [x] 校正記録へモデルID/版・CLI版・Prompt Hash・rubric Hash・資料SHAを保存する契約を実装し、不一致時の再校正要求をテスト。実モデル校正結果の確定は#199へ渡す（モデル/CLI/Prompt/評価資料SHAの校正identity、正常再利用・不一致拒否を`ai-assisted-qa-assessment-calibration-identity.test.mjs`・既存校正cacheテストで確認。固定HEAD `02abbb7872615baaad6d6e4b03f01390acf76525`のCI Run `41961795221`で契約テスト成功。本人の実モデル校正は#199）
- [x] 不一致/校正不能時は合格へ繰り上げず`blocked`/`ungradable`等の正しい状態にし、再試行条件を提示（`isPassingCalibration`・`finalizeAssessment`・`resumeAttempt`・`saveSummary`、失敗校正cacheの拒否/候補欠落/再開負例を固定HEAD `5499fcc871d345aef990a6d6a010df1c8e586e3d`、CI `41953473479`の契約テスト成功で確認）

## 保存・再開・再評価

- [x] `workspace/.course-assessments/`への非公開保存、Git除外、外部送信最小化、Machine/人間可読結果・復習先の整合を確認（既存の結果保存・履歴・要約生成・秘密情報除外を固定HEAD `2a91cae0a57297a53ad783e6eb5a1c9550a252b0` の契約CI成功で確認。本人の送信承認は別途必要）
- [x] 試行ID、排他`.resume.lock`、`.current-publish.lock`、中断→再開/競合を検証。古い正式結果を上書き/削除しない（既存の契約テストと固定HEADの成功済みCIを確認。根拠は下記）
- [x] 版・証拠・校正が一致する既存IDのみ安全に再利用し、変更されたIDと不足IDの再評価/履歴を保全する（完了済み`result.json`の再公開前に現行source・提出SHA・Run/APIの決定論的チェック全内容を保存結果と照合し、変更・欠落・追加・旧Run・別digest・校正不一致を拒否。旧結果と`current.json`を変更せず新試行を要求。`ai-assisted-qa-assessment-resume-current.test.mjs`4件を含む固定HEAD `76b1690ab9d2faab6b571cf9db1ea89b9b3abaa7` の [CI Run 41988470969](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41988470969) `Vitest (contracts)` 87ファイル1157件PASS。整形は別途修正、実利用者の再開は#199で受入）
- [x] Phase 1/2はGit/PRを必須にせず結果の安全なエクスポートと復習後の再挑戦ができること（P1/P2エクスポートとP3/未知Phase拒否、別IDの新試行、元の結果不変、途中失敗/中断・競合を契約テストで確認。HEAD `5499fcc871d345aef990a6d6a010df1c8e586e3d`、Web CI `41953473479`成功）
- [ ] 変更した評価器の直接契約/負例・モック実行・既存CIを固定HEADで検証し、実モデル校正/Private Codespaces/本人認証について#199向け実施手順・期待値・未実行理由を記録

## 実行証拠の真正性・チューターとの分離（補完）

- [x] 評価器のNode側が許可したspec/Configで新しいPlaywright Runを要求・検証する処理と、旧Run/手入力PASS/別spec拒否のfixture・CIテストを整備。本人spec・実Codespacesでの新Runによる受入は#199へ渡す（`runAiAssistedQaSpecCli`は固定Config・許可specで毎回別Run IDを発行し、`verifyModuleRunEvidence`は不足receipt・旧source SHA・別spec/report・改ざん・不一致を拒否。新規`ai-assisted-qa-assessment-fresh-run.test.mjs`は模擬spawn2回のRun分離、固定起動引数、発行receiptと改ざん拒否を検証。固定HEAD `76b1690ab9d2faab6b571cf9db1ea89b9b3abaa7` の [Run 41988470969](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41988470969) `Vitest (contracts)`成功。ローカルreceipt/report/Hashの一括偽造に対する実行出自保証は本項目でなく上記真正性項目として未完了）
- [ ] M07 before/afterの別Run・Page Object/fixture import・業務Assertion不変を検証するコード/fixtureを作り、Node側実行とAI意味評価の権限境界をテスト。本人の実Runは#199で受け入れる
- [x] M10のPR HEAD/attempt/Check/Artifact/target SHAをGitHub APIで取得・照合する経路と、merge-ref/旧Run/偽データ拒否のAPI mock・非公開token保護テストを整備。本人Private repoの実API照合は#199へ渡す（既存`ai-assisted-qa-github-run-evidence.mjs`と専用API/Artifact mockを確認。固定HEAD `5499fcc871d345aef990a6d6a010df1c8e586e3d`、CI Run `41953473479` の契約テスト成功。Private API実行は未実施）
- [x] 通常OpenCodeチューターの教材/指示/学習セッションから正式評価への情報・権限流入を禁止する契約/負例を整備し、本人との実対話/復習・再評価は#199に引き継ぐ（偽のチューターAGENTS.md/グローバル設定/セッション秘密を独立評価子プロセスのHOME/CWDから隔離し、学習用キーは引継がず選択`opencode/`キーだけ明示許可するモックを固定HEAD `2568dcbb2ccee6cbd670947abb502658f7134476`・CI Run `41968096517`で検証。実認証・Managed policy・学習者との実対話/再評価は#199で受入）

## 2026-11-05 再開・Trace回帰の新規CIと整形修正

- **再開時の履歴保全（項目16は未チェック）：** `resumeAttemptUnlocked`の完成済み`result.json`再公開前に、`loadPhaseInputs`を実行して現在のsource SHA/状態revision/scoring・rubric Asset・目標ID・必要提出物/Run SHA（Phase 3は現行GitHub API）を再確認。保存`challenge.json`、`answers.md`、`challenge-answer.json`、`result.challenge.answer_sha256`も一致して初めて旧結果を再公開する。不一致なら元の正式結果・履歴は書き換えず、別の試行IDで再評価を要求。`ai-assisted-qa-assessment-resume-current.test.mjs`は同一/異版/異証拠/欠落ID相当/回答変更・receipt改変を検証。途中切断で完成済み結果がある場合も、オンライン資料取得ができなければ自動再公開せず、履歴を残して停止。
- **失敗テスト固有のTrace（項目3・4・19の一部）：** `reportSpecs`が失敗したテスト自身にTraceを付けているかを保持し、`verifyModuleRunEvidence`で`require_trace`かつ失敗Runの場合は、そのテストの添付を要求するよう修正。report/receipt/TraceのSHAが一致していても、別のPASSテストにTraceを付け替えれば`ungradable`となる負例を追加。すべてのローカル証拠を同時に捏造できる場合の出自保証とは異なるため項目3・19は未チェック。
- **検証済み範囲：** 中間HEAD `6843ad154c49b0a12f9b58c24ad29df1efa53ce3` の [CI Run 41984064210](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41984064210) では`Vitest (contracts)`87ファイル・1150件PASS、`Code Quality`と2種類のビルドも成功した。一方`Style Quality`は`ai-assisted-qa-assessment.mjs`と再開契約テストのPrettier差分で失敗。CIの一時診断で出力された正確な差分（ソース3か所、テスト2か所）を適用し、診断用契約テストを削除した。
- **完了判定：** 新しい整形修正HEADのCI完了は未確認。従来の完了16/22件を維持し、項目16・18はまだチェックしない。本人の実認証・実Chromium/実モデル評価は#199で実施する。

## 2026-11-05 固定HEADでの完了確認と再開時の入力再検査

- **項目9・11をチェック：** [CI Run 41972670377](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41972670377) / HEAD `d96dce17005a3a703f4604b9e192c91b2c9f0a84`で全体成功、`Vitest (contracts)`85ファイル・1146件PASS。4件の`untrusted-input`、3件の`m06-assertions`、11件のPrompt Injection誤PASS検知、偽Trace・改変Run・不正Case・JSON/CLI異常系も成功を確認。Nodeが本人テキストをコマンドとして実行しない契約および公開出典許可リストまでを完了とし、モデルが意味的に指示へ従う可能性は#199の実モデル校正で評価する。ローカルreceipt/report/snapshotの一括偽造への耐性は項目3として未完了。
- **項目16の作業（未チェック）：** `resumeAttemptUnlocked`は従来、完了済み`result.json`を現在の証拠検査前に再公開していた。今回`assertReusablePreparedInputs`で版・scoring Asset・状態・必須ID・証拠Snapshotとfingerprintを再照合し、`assertReusableFinalizedAnswer`でchallenge・回答ファイル/receipt/保存結果のSHAを照合するよう変更した。完了済み試行の再開も`loadPhaseInputs`で現行Playwright Run、GitHub API（P3）、仕様・教材に再照会し、変化/欠落があれば元の履歴を改変せず新規試行を要求する。新規契約`ai-assisted-qa-assessment-resume-current.test.mjs`を追加。**これらの変更後HEADのCIは未確認**、項目16はチェックしない。
- **復旧上の変更：** 完了済み結果の再公開時にも教材のリモート取得・P3 API/Run確認が必要になる。オフライン・API障害では古い結果を自動再公開しない。既存`history`/過去結果は削除しない。#199では本人の環境で再開・履歴・別ID試行を受け入れる。

## 2026-11-05 中間CIの実失敗と修正

- [Run 41971695497](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41971695497) の`Vitest (contracts)`は84ファイルPASS・**2テスト失敗**。新規許可リストの`skills/e2e-*`が数字を含むため正規のM05〜M10外部Skillを拒否していた（`[a-z-]+`→`[a-z0-9-]+`に修正）。既存のM06`initial/repeat`順序テストはM05のAssertionのないspecを転用していたため、新しいM06検証により`ungradable`に分類された。Case 004/005それぞれにPlaywright Assertionを持つ同一specと、保存snapshot・receiptの一致SHAを使用するようfixtureを修正し、本来の時系列検査を保持した。
- 同Runの`Style Quality`不一致4ファイルは、一時診断テストが出力したPrettierの正確な差分に合わせて修正した。`ai-assisted-qa-assessment-format-diagnostic.test.mjs`は削除済み。修正後HEADのCI結果は未確認。
- この中間Runは契約失敗・整形失敗のため**成功実績として扱わない**。現時点のタスクリストは14/22のまま。提出物の意味評価やRunの真の出自を検証せずに追加チェックしない。

## 2026-11-05 モデル入力の境界とM06 no-op拒否

- **前回HEADのCI：** 固定HEAD `511c342f00e23a1879be97febbdb5900fc8e6c2a` の [Run 41969416598](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41969416598) が全体成功。今回追加した修正の検証結果とは区別する。
- **項目9・11（引き続き未チェック）：** `readChallengeAnswer`に通常ファイル/symlink拒否、256 KiB上限、UTF-8/NUL、Secret検査を追加。 `buildCalibrationPrompt`も4 MiB上限・Secret検査を実行する。`buildAssessmentPrompt`/校正Promptは文字列をJSONに格納し、学習者によるrole偽装やTool使用要求をデータとして扱う契約テスト`ai-assisted-qa-assessment-untrusted-input.test.mjs`を追加。NodeはToolイベントを拒否するが、実モデルの意味的な誘導を全面的に防いだとは言えない。11件のInjection校正fixtureに対する実モデルの重大誤PASS 0件は#199最終受入。
- **公開出典の許可リスト：** `assertAllowedAssessmentSourcePath`で対象モジュールの教材/演習/クイズ/end-state、Phase知識グラフ、公開の仕様/演習契約、および外部Skillの固定repo/commitからの許可済み`SKILL.md`以外の参照を拒否。M00〜M10の全`scoring.sources`を受け入れ、`workspace`/`.github`/評価器コード/別モジュールの参照を拒否するテストを追加。各ファイル・合計・モデル入力のサイズ制限とSecret検査を保持。
- **項目19（引き続き未チェック）：** `assertM06CaseAssertions`でM06の`CASE-CART-001〜005`を含む必須testにPlaywright AssertionがあることをAST検査し、`TODO`を除去しただけのno-op、定数に対する`expect(true)`、Case欠落・重複・構文異常を拒否する。 `course:run`実行前と保存済みRunの現行spec/snapshotの両方に適用。これは業務上の正しさの意味判定でも、偽のreceipt/JSON/Hashを同時生成した場合の実行証明でもないため、現時点で「架空ログをPASSにできない」とは宣言しない。
- **検証：** `readChallengeAnswer`と外部モデル入力の負例、新規M06 Assertionテストを追加しているが、当該HEADの契約テストは未確認。中間Runの`Style Quality`は評価器・Run検証・新規2テストの整形不一致を検出。正確なPrettier差分取得用の一時契約テストを追加した。差分適用後にこの診断テストを削除する。現時点のチェックは14/22を維持する。
- **#199での最終受入：** 本人が実Codespacesと認証済みOpenCodeを利用し、公開資料/本人成果物以外の情報が送られないこと、Prompt Injectionとno-opを実モデルが誤PASSしないこと、M06/07の新規Playwright Runと業務Assertionを、独立した元データ・ブラウザ結果で確認する。実現できないローカルRunの暗号学的な出自保証をモックで代用しない。

## 2026-11-05 評価CLI事前確認の分離とM07実行数

- **版・モデル一覧も独立プロセスで検査：** `getOpenCodeVersion`と`verifyOpenCodeModelAvailable`を共通`runIsolatedOpenCodeCommand`へ統一し、正式評価と同様の独立HOME/CWD/Configと明示選択した`opencode/`の認証キーのみ使用。新しい`ai-assisted-qa-assessment-isolation.test.mjs`のmockでは、版確認のKeyなし、モデル列挙の選択Keyのみ、学習用HOME/Token未継承、正常・例外時の一時ディレクトリ削除を検証する。**変更後のCI成功は未確認。**
- **M07 before/afterの実条件に近づけた契約テスト：** `ai-assisted-qa-assessment-m07-run-versions.test.mjs`の模擬Runを`before`2件PASS・`after`3件PASSへ変更し、3件目の別商品ページ→Cart再入場・数量2 Assertionもfixture化。既存の別Run・異なるSHA・時間順・現行after SHA照合の負例を保持。本人の実Chromium Runと業務AssertionのAI意味評価は未受入。**変更後のCI成功は未確認。**
- **誤判定を防ぐ境界：** `verifyModuleRunEvidence.status=passed`はRunフォーマット・実行結果・SHAの決定論的検証であり、学習者による業務Assertionの適切性を独立に証明しない。M07の採点基準によるAI意味評価と本人実Runは#199で最終受入とし、項目20はまだチェックしない。

## 2026-11-05 評価隔離の契約完了チェックと追加検証

- **項目8・22をチェック：** 固定HEAD `2568dcbb2ccee6cbd670947abb502658f7134476` の [Web CI Run 41968096517](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41968096517) で`Vitest (contracts)`84ファイル・1138件PASS、`Code Quality`と2種類のビルドは成功。評価プロセスの独立HOME/CWD/Config/Data/Cache・メモリDB・チューターAGENTS/資格情報非継承と、評価Agentの全操作deny、Shell/edit/Web/MCP/Skill/subagent Tool event拒否を専用契約テストで検証した。証拠は模擬プロセスと固定SHAであり、本人認証済みOpenCodeの実際の権限拒否やManaged settingsの優先順位までは確認していない。後者は#199へ引継ぎ。
- **Style Quality修正：** 同Runの`Style Quality`は隔離・M07の2契約テストで改行/引用符の不一致。診断用テストが出力したPrettier差分を正確に適用し、診断用ファイルを削除した。修正後HEADの整形成功は未確認。
- **CLI事前確認も隔離：** モデル列挙`opencode models`と版確認`opencode --version`が従来`ROOT`の学習用cwd/HOMEを使う問題を修正し、両者とも`runIsolatedOpenCodeCommand`に統一。利用者の明示的な`OPENCODE_API_KEY`のみ選択提供者へ受け渡し、偽のチューターHOME/キーと別プロセス、正常/例外時の一時ディレクトリ削除を新規負例で検証する。**新規テストは現HEAD CI未確認**。
- **残る問題：** M07正常before/afterが不可能になる旧SHA比較を修正したが、業務Assertionの保持をRun件数/SHAだけで証明できない。自己申告Run receiptと報告データを一括偽造する攻撃にも、Hashだけでは実行の出自を保証できない。項目3・4・11・16・18・19・20は継続未チェック。実モデルでの重大誤PASS 0件は#199最終受入。

## 2026-11-05 継続実装：独立評価のHOMEとM07 before/after

- **確認済みの基点：** 固定HEAD `8d9c3c9cb2e2f815334d92de2c55e2df1149bbcb` の [Web CI Run 41964417139](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41964417139) は全体成功。以降の変更は別HEADであり、追加機能の成功とは混同しない。
- **項目8/22（権限分離）・22/22（チューターからの指示流入）は未チェック：** 公式OpenCode V2 [Instructions](https://dev.opencode.ai/v2/docs/instructions/)によると`OPENCODE_DISABLE_PROJECT_CONFIG`はグローバル`AGENTS.md`を遮断しない。評価のみ`createIsolatedAssessmentRuntime`で一時作業ディレクトリとHOME/USERPROFILE、XDG_CONFIG_HOME/APPDATA、XDG_DATA_HOME/LOCALAPPDATA、XDG_CACHE_HOMEを分離し`OPENCODE_DB=:memory:`、pure、project/外部Skill無効化を適用。評価Agent・トップレベル両方の`permissions`に全操作denyを設定し、`instructions: []`、`plugins: []`、`skills: []`、`mcp.servers: {}`で学習用設定を持ち込まない。`ai-assisted-qa-assessment-isolation.test.mjs`で擬似チューターAGENTSと設定/キーを隔離し、子プロセスのcwd/HOME/Configの検査とShell/edit/Web/MCP/Skill/subagent要求拒否をモック検証する。実OpenCode 2.0.22での設定解決・Managed policyの優先順位・認証セッションは#199へ引継ぎ。**新HEADの契約CI・整形成功は未確認。**
- **認証の扱い：** OpenCode V2の認証DBをそのまま継承するとチューターの保存セッションを読み込むため、専用一時DBは空にし、利用者が設定した`OPENCODE_API_KEY`は明示選択した`opencode/`提供者の子プロセスに限り渡す。Prompt/結果には含めない。保存済みDBアカウントは引き継がないので、環境変数が使えない実認証は`blocked`となり得る。実モデルでの接続性は#199で確認する。
- **料金ガードの修正：** OpenCode Goは月額プランがある（[V2公式Go](https://dev.opencode.ai/v2/docs/console/go/)）。モデル単価が0でも月額費用をゼロと判定できないため、`opencode-go/`の選択をNode側で拒否。`ai-assisted-qa-assessment-free-pricing.test.mjs`へ月額契約提供者を拒否する負例を追加。モデルカタログで0と見える場合でも本人の契約・残量確認は#199へ残る。
- **M07正式Runの構造的な不具合を修正（項目4/20は未チェック）：** M07の`maintenance.spec.ts`beforeもPASSを要求するが、従来はbeforeと現行afterのspec SHA一致を要求していたため、正常な変更後にbeforeが必ず`ungradable`となる。`verifyModuleRunEvidence`でafter契約と対になるbeforeのみ現行spec比較を免除し、before snapshotのSHA・JSON report・resultは従来どおり検証。afterは現行spec SHA必須、before/afterの異なるSHA・別Run・正しい実行順を維持。`ai-assisted-qa-assessment-m07-run-versions.test.mjs`へ正常/古いafter/同一SHA/時系列逆/対のないbeforeを追加。実Chromiumでの3件目再入場などの業務Assertionは#199で受入。本人の任意specでの意味検証はまだ未完了。
- **現CIの状況：** 一時HEADの [Run 41967073136](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41967073136)では`Vitest (contracts)`82ファイル1134件、`Code Quality`、2ビルドは成功、`Style Quality`は新設`ai-assisted-qa-assessment-isolation.test.mjs`のPrettier警告のみ。続くRunは後続commitでキャンセルされたため、正確な整形差分を取り直し、一時診断テストを削除する。修正後CIの成功はまだ確認していない。
- **進捗判定：** 12/22件の既存チェックを維持。隔離/権限設定、M07 before/after、Run真正性は最新HEADのテスト結果と実受入の境界を確認してからチェックする。既存の7PR分担・SUT/共有Validatorの変更禁止を維持。

## 2026-11-05 料金ガード・106校正Caseの検証

- **項目7・10をチェック：** 固定HEAD `7402bc0ff149f66f020a568566da4695ce85003a` の [GitHub Actions Run 41963853602](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41963853602) の `Vitest (contracts)` ログは82ファイル、1132テスト成功、1件expected fail、15件skip。公開料金カタログがゼロ単価の`opencode`系モデルだけを採用し、価格不明・非0・欠落・401/429・redirect・不正JSON・モデル列挙不一致を拒否する模擬契約テストを確認。本人認証/契約料金/残クォータの実受入は#199に残す。校正fixture 106件（M00〜M10各5分類）、11件のPrompt Injectionを誤PASSとした場合のNode校正失敗、校正結果の欠落・重複・不明Case・不正判定を拒否するテストも成功。実モデルの重大誤PASS 0件は未確認。
- **Style Qualityは当時失敗：** 同Runで`Style Quality`が3ファイルを指摘。CI用の一時診断テストを使用してPrettierの正確な差分を取得し、評価器1か所、校正テスト3か所、料金テスト4か所を修正した。診断用テストは削除済み。修正後のCI成功は未確認であり、項目18は未チェック。
- **残る制約：** 価格カタログは公開の参考値であり、実アカウントの課金/無料枠を保証しない。`OPENCODE_DISABLE_PROJECT_CONFIG`は公式V2仕様上、グローバル`AGENTS.md`を遮断しないため、チューター由来の指示流入を完全には排除できていない。独立評価環境・権限と実モデル校正は完了扱いにしない。

## 2026-11-05 OpenCode固定HEAD契約の確認・価格事前ガード

- **項目6・12をチェック：** 固定HEAD `02abbb7872615baaad6d6e4b03f01390acf76525` の [Web CI Run 41961795221](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41961795221) で `Vitest (contracts)`（79ファイル・1122件PASS・1件既知のexpected fail・15件skip）、`Style Quality`、`Code Quality`、build2本、Training runtime contractsのジョブ成功を確認。workflow全体は後続の更新により`cancelled`だが当該ジョブは完走している。OpenCode V2のCLI・Agent config・イベント終端・Tool拒否・stderr/exitCode/timeout/出力上限（子プロセス4テスト）、モデル・CLI版・System Prompt Hash・rubric/scoring資料SHA一致/変更による別校正IDの検証を直接確認。実認証付きモデルの最終校正は#199に残る。
- **項目7（未チェック）：** 現行のモデル送信前同意だけでは有料・不明価格を防げないため、`verifyCurrentFreeModelPrice`を新設し公開`models.dev/api.json`（固定URL、HTTP200、非redirect、JSON、最大20MiB）のモデル料金を送信前に照合。`opencode`/`opencode-go`の入力・出力・その他公表単価がすべてゼロであるモデルだけを許し、欠落・未知・課金料金・401/429・異常HTTPは`blocked`として停止。`opencode models`の列挙結果に指定IDが現れない場合も送信前に拒否する。本人の送信同意と契約確認は引き続き必須。`ai-assisted-qa-assessment-free-pricing.test.mjs`の正負例を追加したが、**追加後HEADのCIは未確認**。公開カタログと本人契約が一致する保証はないため最終料金受入は#199。
- **既存の項目3・4・8〜11・16・18〜20・22は継続未チェック。** Run receiptの同時偽造による実行出自、正式AIの命令遮断、重大誤PASS 0件は未受入とする。

## 2026-11-05 継続実装：OpenCode V2と校正の版一致

- **前回CI失敗：** 固定HEAD `49b256f9cc784a7baad0e8ac94f50dcf709cbadf` の [Run 41959640236](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41959640236) で `Code Quality / Lint`が失敗。原因は新設した`tests/contracts/ai-assisted-qa-assessment-m07-dependencies.test.mjs:11`の`Buffer`未import（`no-undef`）。`node:buffer`からのimportを追加。前回Runの`verify/validate`失敗はこの必須ジョブ失敗による。修正後CIは未確認。
- **OpenCode V2設定の不整合を修正（項目6・8の一部）：** 公式V2 Configは自動更新制御に`update: "disable"`を要求し、旧`autoupdate: false`は不適切。`buildAssessmentAgentConfig`と契約テストを修正した。既存の`run --standalone --pure --model --agent --format json --file`、`permissions: [{action:"*",resource:"*",effect:"deny"}]`、project config/外部Skill無効化も照合した。根拠：[V2 Commands](https://dev.opencode.ai/v2/docs/cli/commands/)、[Config](https://dev.opencode.ai/v2/docs/config/)、[Permissions](https://dev.opencode.ai/v2/docs/permissions/)。実CLI `2.0.22` の権限拒否・認証との併用は未確認。
- **子プロセス負例（項目6の一部）：** `runCaptured`のNode側境界を直接検証する`ai-assisted-qa-assessment-process.test.mjs`を追加。stderrとstdoutの分離、非0終了、強制終了時のtimeout/出力超過、実行不能コマンドの拒否を対象にした。Windowsの存在しない実行ファイルの動作はPOSIXとは異なるため、そのテストのみWindowsでskipする。現HEADの契約CI未確認。
- **校正同一性（項目12の一部）：** `obtainCalibration`は`model_id`、`opencode_version`、校正/評価Prompt Hash、各Assetの`source_path`とSHAを含むidentityから不変校正IDを生成し、既存成功cacheのidentity/判定と一致しない場合に自動再利用・送信しない。今回`ai-assisted-qa-assessment-calibration-identity.test.mjs`を追加し、モデルID・CLI版・rubric SHA・scoring SHAの変更が別校正IDを要求することと旧cacheの改ざん拒否を確認する契約を記述した。CI未確認のため項目12はチェックしない。
- **現時点の判定：** 既存の完了8/22は維持。Runの自己申告値・report・receiptの同時偽造耐性、料金が未知のモデルを実行前に排除する機構、実モデル校正とPrivate Codespaces権限検証は未完了として扱う。

### #199最終実受入へ渡す手順・期待値

1. Private Codespacesで`opencode --version`が固定の`2.0.22`を返し、評価用Agent設定が`update: disable`と全操作`deny`として読み込まれることを`opencode debug config`と専用Agent表示で確認する。グローバル`AGENTS.md`の混入や認証への依存も記録する。現状のモックだけで権限遮断済みとはしない。
2. 本人のモデル提供者画面で無料枠/料金、認証、当日の利用上限を確認し、未知価格・無効認証・429・上限到達では**モデルへ再送せず**`blocked`となることを実確認する。料金は変動するため、モデル名の`free`表記だけでは判定しない。本人の明示的な送信承認がない間は実行しない。
3. 検証済み教材と本人specで`pnpm course:run M05 p05-cart-locator.spec.ts --label main`、M07のbefore/after別Runを発行し、内容・SHA・Trace・業務Assertionを確認する。合成receiptを実Runの代わりにしない。
4. `pnpm course:assess M04|M07|M10 --model <確認済みモデルID>`で初回・再開・欠落・改ざん・校正失敗・モデル異常・再評価を受け入れる。重大誤PASS 0件を実モデルで確認する。本人Private GitHubのPR HEAD/attempt/Check/Artifact/target SHAは別途実APIで照合し、同一の評価記録へ結果を残す。

## 2026-11-05 M10既存API検証の確認・Prettier修復

- **項目21チェック済み：** `scripts/training/ai-assisted-qa-github-run-evidence.mjs`の`verifyGitHubRunEvidence`と`tests/contracts/ai-assisted-qa-github-run-evidence.test.mjs`を確認。PR head exact SHA、pull_request Run、run_attemptと成功Check/Job、Artifact digest、Zip内`target-sha.txt`とPlaywright JSON結果を別々に照合。API mockにはmerge-refの誤用、別Run attempt/Job、偽Artifact/異常digest、別spec、再試行・異常結果・権限過大workflowの拒否がある。トークンを実行証拠JSONへ格納できないschemaと、固定された読取りAPI呼び出し・権限不足時のBLOCKEDも確認。コードとテストは本PRで変更しておらず、固定HEAD `5499fcc871d345aef990a6d6a010df1c8e586e3d` の [Run 41953473479](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41953473479) `Vitest (contracts)`が成功。**Private repoの実API権限と実Run/Artifact照合は#199最終受入**に残し、実施済みとは記録しない。
- **Style Qualityの差分確定：** 本PR HEAD `e4ceac26c4410ff0675c127942cd3d9f60a5d483` の [Run 41958961076](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41958961076) で診断用の一時的なVitestを実行。`Vitest (contracts)`は78 test files・1118 tests PASS。Prettier 3.8.1の差分は `tests/contracts/ai-assisted-qa-assessment.test.mjs` の `toThrow(/Usage: pnpm course:run/)` の改行のみだった。出力された差分どおりに1行へ修正し、診断専用テストファイルを削除済み。**修正後のStyle Quality成功は未確認**であり、該当CIの完了は待たない。

## 2026-11-05 M07外部import境界とCI記録

- **CI確認：** 固定HEAD `ba245138fed5369b495186e8f8de5b0f87ddb255` の [Run 41956684994](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41956684994) で`build-production`・`build-automation`・`Code Quality`は成功。`Vitest (contracts)`を含む一部ジョブは確認時点で実行中。`Style Quality`は`tests/contracts/ai-assisted-qa-assessment.test.mjs`でPrettier不一致。M05 P05 fixtureの記述を整理して修正したが、修正後HEADのformatter成功は未確認。
- **M07 Page Object / fixture import：** `scripts/training/ai-assisted-qa-run-evidence.mjs`へ`assertM07SourceDependencies`を追加。既存依存`typescript`で`maintenance.spec.ts`の構文・静的import/re-export・動的import・import type/equals・`require`を確認し、`@playwright/test`と固定教材のReset補助関数以外の依存を拒否する。本人がPage Object/fixtureを別ファイルへ分離すると、spec単体SHAでは依存ファイルの内容が証明されないため、教材が指定する**同一spec内実装**に限定。`course:run`の起動前と正式評価でRun receiptを再読込する際の現在spec・保存snapshotを両方検査する。
- **追加テスト：** `tests/contracts/ai-assisted-qa-assessment-m07-dependencies.test.mjs`に正例、別Page Object/fixture・再export・dynamic import・require・型import・不正構文の拒否、および不正specを渡した`course:run`がPlaywright起動前に停止する負例を追加。TypeScript AST APIの主要例は手元のTypeScriptでも単独確認したが、**新HEADのVitest/formatter/Playwright実Runは未確認**。意図的なimport隠蔽や業務Assertionの意味評価・実行の出自をこの検査だけで証明したとは扱わない。
- **項目3・4・19・20は継続未チェック。** Run内の自己申告receiptとSHAを同時に偽造した場合は真正性を証明できない。M07の別Runテスト数・順序・変更後の業務Assertionは引き続きNode/AIの実受入が必要。#215のM05実行手順との不一致は#199統合前に修正。既存7件の完了チェックは変更しない。

## 2026-11-05 継続対応：校正失敗の扱いとM05 P05

- **項目13をチェック：** 旧HEAD `5499fcc871d345aef990a6d6a010df1c8e586e3d` の [CI Run 41953473479](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41953473479) は全体成功。校正 `status !== passed`、`critical_false_passes > 0`、`mismatches` の欠落/不一致を `isPassingCalibration` が拒否し、`finalizeAssessment` は `blocked` へ倒す。候補JSONの欠落・不正は `ungradable`、CLI/API/Secret等の不可用は `blocked` に分類。`saveSummary` は復習先と新試行での再評価を案内。失敗校正を成功cacheにしない既存負例・同一試行の無断再送拒否も契約CIで確認した。ただし外部プロバイダー認証・課金時の実挙動は#199に残る。
- **M05 P05の独立receiptを実装（未チェック）：** `course:run`のM05許可specへ`p05-cart-locator.spec.ts`を追加し、`verifyModuleRunEvidence`は公開M05 JSONの`required_runs`を変更せず、このspecの`main` Run（1件以上PASS、現行spec・snapshot・JSON report・source SHA一致）も必須とする。M05-CR-02/03へ2明細・scope内各1件・数量1のread-only Assertionと削除未実行、DB証明の限界を明記。専用receipt欠落を`ungradable`とする契約テスト・校正fixtureとREADMEを更新した。固定HEAD `7d466bc99de759c80c52e99e1ba9934b405517ba`の [CI Run 41955882847](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41955882847) で`Vitest (contracts)`、`Code Quality`、2種類のビルド、Training runtime contractsは成功、`Style Quality`は`tests/contracts/ai-assisted-qa-assessment.test.mjs`の長いtest名により失敗。該当test名を修正したが、新HEAD CIの成功は未確認。実Chromium実行・本人P05成果物の妥当性・空Assertionの意味判定は未確認。
- **他PRとの調停：** #215所有の`training/ai-assisted-qa-course/exercises/M05/exercise.md`には`course:run`がP05を拒否する旧説明がある。#199結合前に教材PRへ手順・提出欄の更新を依頼する。#217では教材の所有ファイル・共有Validator・製品SUTを変更しない。
- **Run真正性の限界：** `source_sha`、receipt、spec snapshot、report、TraceのSHA一致とCase IDを確認できるが、意図的に生成した自己申告ログとハッシュを同時に偽造する攻撃に対して暗号学的な実行証明は持たない。項目3/19は継続未チェックとする。

## 2026-11-05 固定HEADのCI成功と完了条件

- **項目5・17をチェック：** 固定HEAD `5499fcc871d345aef990a6d6a010df1c8e586e3d`、[Web CI Run 41953473479](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41953473479) は `Vitest (contracts)` / `Style Quality` / `Code Quality` / 2種類のビルド / 関連Chromium E2E / `verify`を含む全体成功。Node集計器がPhase必須IDを別入力として最終再照合し、欠落・不明・重複IDを `ungradable` にする。既存テストで `not_run`、`ungradable`、`blocked` とLevel 1（未達）を確認。M04/M07/M10の51 ID、criterion/evidence/reference制約は`validateCandidate`と`validatePhaseObjectiveIds`が照合する。Phase 1/2はGit/PRなしにエクスポートでき、元の結果を保持して別IDで再試行できる。中断・競合・不要ファイル除外は既存の契約テストも対象。ただし実OpenCodeでの意味校正、Playwright/Private GitHubの真正性検証、モデル送信の実受入は#199へ残る。項目3・4・10・11・20・21と別の再開照合項目はこのチェックで完了した扱いにしない。

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

## 2026-11-05 PR #217 引継ぎ：完了結果の再公開ガード

- **固定HEADの確認：** `8e855ca865662d2f8dc8968831640d210826691e` の [Web CI Run 41984914554](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41984914554) はworkflow全体成功。`Vitest (contracts)`、Style Quality、Code Quality、build2本、verify/validate、required Chromium E2Eも個別成功。これは今回の修正**前**の固定HEADの結果。
- **再開時の問題：** 完了済み`result.json`について、`loadPhaseInputs`でPhase 3の現行GitHub Run/Checkを再取得しても、`assertReusablePreparedInputs`は保存された提出物/版/Hashしか照合していなかった。取得した`deterministicChecks`が`blocked`/`ungradable`へ変化しても、旧PASS結果を`reconcileFinalizedAssessment`で再公開できる経路があった。
- **今回の変更：** `scripts/training/ai-assisted-qa-assessment.mjs`で完成済み試行を再公開する前に`assertReusableDeterministicChecks`を呼び出し、保存結果と現行チェックのID・status・集合を照合。完成済みPASSは現行チェックがすべて`passed`の場合だけ再公開する。差異は旧結果・currentポインタを書き換える前に拒否し、新規試行IDを要求。`tests/contracts/ai-assisted-qa-assessment-resume-current.test.mjs`へPASS、Run失効、blocked、欠落、追加、重複、ID差異、未完了結果の負例を追加。`assessment/README.md`にもこの制約を記載。
- **検証とチェック：** 上記固定HEADのCI成功は確認したが、今回追加した変更後の最終HEADに対するformatter/契約CIは未確認。この差分の動作をPASSとは扱わず、専用タスクリストの**16/22件は据え置き**。項目16（再開）と18（変更後CI）は修正後CI・結果保存/再公開の検証を確認してからチェックする。
- **依然未受入：** 本人による実Chromium/Private Codespaces・認証OpenCode/Private GitHub API、同時に偽造されたローカルRun一式の実行出自、M07業務Assertionの意味判定、実モデルの重大誤PASS 0件は#199の最終実受入へ引き継ぐ。製品SUT、他PRの教材・共有Validatorは変更していない。Draft維持・自動マージしない。

## 2026-11-05 続行：保存結果照合・M07 Assertion・正式Runの契約

- **今回チェックした2項目（16→18/22件）：** 固定HEAD `76b1690ab9d2faab6b571cf9db1ea89b9b3abaa7` の [Web CI Run 41988470969](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41988470969) で`Vitest (contracts)`87ファイル・1157件PASS（expected fail 1、skip 15）。再開時の版/証拠/校正の不一致拒否と、新しい公式`course:run`のNode起動/Config・receipt検証項目をチェック。完成済み結果の再公開時には決定論的チェックのstatusに加え、Run ID・target SHA・Artifact digestを含む値全体を`isDeepStrictEqual`で照合する。
- **M07の追加対応（未チェック項目の一部）：** `assertM07MaintenanceAssertions`で同一spec内のbefore各test2件以上・after各test3件以上に動的Playwright Assertionがあることを確認。重複名、空test、定数`expect(true)`のみのtestをRun前・現行spec・保存snapshotで拒否する。依存import閉包、before/after別SHA・順序のテストも成功。ただし数量・Reset・別ページ再入場の業務意味、before/afterのAssertion不変性は静的なテストだけでは保証できないためM07の補完項目は未チェック。
- **整形とCI：** 同Runの`Style Quality`は`ai-assisted-qa-run-evidence.mjs`とM07契約テストのPrettier不一致で失敗。CIの一時診断からPrettier 3.8.1の正確な整形済み内容を取得して反映し、診断テストは除去した。今回の修正後の最新HEADに対する最終CIは未確認のため、変更後CI完了の項目はチェックしていない。
- **引き続き未完了（4項目）：** ローカル証拠一式を意図的に偽造した場合の実行出自保証、M04/M07/M10実行証拠と本人判断の実受入、最新HEADの全品質ゲート、M07の業務Assertion意味評価・不変性。本人のPrivate Codespaces/認証OpenCode/Private GitHub/実モデル106 Case校正と重大誤PASS 0件は従前どおり#199最後に実受入する。製品SUT・共有Validator・他PRの専有ファイルは変更していない。

## #199最後に実施する実受入（このPRのチェック対象外）

- 本人の認証済みOpenCode実モデルを独立・制限権限で起動し、M04/M07/M10を未演習条件で採点
- 実モデルの正答/誤答/別解/部分/旧Run/偽ログ/注入/異常の校正と重大な誤PASS 0件の確認
- 本人Private 2コアCodespacesでの新規Playwright RunとPrivate GitHub APIのRun/Artifact照合、個人成績の保全・再評価

ここでのモックCI成功は実モデル校正の代替にならない。実モデル校正未達は正式修了をBLOCKEDとする。
