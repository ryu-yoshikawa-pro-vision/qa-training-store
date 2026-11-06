# PR #199 Phase 1（M00〜M04）教材・Skillタスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。この文書は作業ブランチ専用の未完了タスクリスト。開始時に`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、関連仕様・テスト、最新HEAD/CIを確認する。
>
> **完了判定**：M00〜M04のチェック済み30件は教材・演習・固定Skill入力/CLI・提出/評価条件の静的照合と実行準備の完了を示す。本人による実操作、正式採点、固定Skill通しRunの成功を意味しない。未完了は本PRのマージ前作業4件のみとし、固定HEAD・コマンド・Run/ログ・結果で証明してからチェックする。実行できない場合は理由・再開条件を残す。
>
> **変更境界**：本ブランチの担当範囲だけを編集。製品SUT・正式仕様・既存Seed/Reset・既存製品テストは読み取り専用。共有ファイルや他ブランチの専有ファイルが必要なら、PRコメントに理由・影響・受入条件を記録し#199で調停する。#199へのマージは行わない。

## 担当と現在の進捗（2026-11-06）

本PRはM00〜M04の22学習目標について、教材・クイズ・演習・提出欄・評価条件、固定Skillの入力/CLI契約を静的に確認・修正する。**教材・静的準備30/30件チェック済み、マージ前の品質ゲート4件未完了（合計30/34件）**。チェック済みは実行・本人修了のPASSではない。

**実Codespaces/Private Port/費用/再ロード操作、認証付きOpenCode対話、配布先Python helper・固定SkillのM02→M03実Run、正式AI評価は[#199の最終実受入](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/docs/plan-ai-agent-qa-curriculum-redesign/docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md)へ移管済み。本PRのタスクリストには含めない。** #217の採点、#218の配布、知識グラフと横断統合も各所有PR/#199で判定する。

検証済みと未確認の範囲は[本PRの監査レポート](../reports/2026-11-04_pr214-phase1-evidence-audit.md)を参照。最新確認済みHEAD `2b55c501184b7b27d6a863261cff99ab9563f428`の[Web CI](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41862809264)では、Vitest (contracts)・Training runtime contracts・必須Chromium E2Eは成功したが、Style QualityがPrettier不一致5ファイルで失敗し、verify/validateも失敗した。**Web CI全体成功とは扱わない。**

\n## 対象・変更境界

22学習目標。対象：`docs/curriculum/ai-assisted-qa/modules/M00..M04/**`（各モジュールディレクトリ）、対応する`training/ai-assisted-qa-course/exercises/Mxx/**`、`states/Mxx/**`、該当クイズと新規の専用契約テスト。評価エンジン・`assessment/**`・共通manifest・知識グラフは直接変更しない。採点基準・知識グラフの調整が必要なら正式評価/統合先へ根拠を引き継ぐ。

各目標の受入は**教本・演習P01〜P06・提出欄・本人判断の必要証拠・評価基準への対応・復習先**を個別に照合する。未実施の本人操作/実モデル判定はPASSにしない。

## M00：基本操作と安全なAI利用（4目標）

- [x] `M00-01`：開始ガイド→別ファイルを開く/変更/保存→実行場所と出力の確認を、初心者がGit知識なしで実施できる手順に整合
- [x] `M00-02`：AgentとChat、OpenCodeのread/edit/command権限、固定Skillとhelper、無料モデル/Secretの扱いを具体的な許可・拒否判断へ結び付ける
- [x] `M00-03`：本人が目的・参照・範囲・成果物・完了条件を持つAI依頼を作り、結果の誤りを本人が訂正する別条件課題を照合
- [x] `M00-04`：差分・未実行/失敗、Private Port・費用、再ロードによる上書き禁止の教材判断例・拒否条件・手順・既存`loadModule`と契約テストをソース照合し、P05/P06と提出欄を確認（実環境の操作は#199で判定）

## M01：QA・テスト基礎（4目標）

- [x] `M01-01`：期待結果と観測値を正式Cart/IndexedDBの事実から説明し、架空のサーバーDBや架空の製品不具合を教材へ混ぜない
- [x] `M01-02`：探索/回帰/自動化候補の採否、Web数量select、正式なsort・在庫0追加拒否を正本に照合
- [x] `M01-03`：分析→設計→実行→評価→改善でAIの補助と人間の確定責任を分け、AI自己申告でPASSしない演習/提出/採点条件を照合
- [x] `M01-04`：Unit/Integration/Component/E2Eの責務、全件E2E化しない理由を別のCart条件で判断できることを確認

## M02：テスト分析（5目標）

- [x] `M02-01`：仕様BR/AC、画面観測、既存テスト、AIの推測の優先順位を矛盾例で示せること
- [x] `M02-02`：Role/State/Data/Journeyと操作前後の状態を根拠付きで整理し、TR相当の責務へつなぐこと
- [x] `M02-03`：Seed/Resetが保証する初期条件と保証しない条件を区別し、再現可能な入力を選ぶこと
- [x] `M02-04`：影響/可能性/優先度を根拠付きで比較し、未確認の発生率を捏造しないこと
- [x] `M02-05`：AI分析案の仕様誤読、条件漏れ、未根拠の期待結果を特定し、未決を残すこと

## M03：テスト設計（5目標）

- [x] `M03-01`：同値分割の有効/無効クラス、代表値、同値とみなす限界を説明できること
- [x] `M03-02`：数量/在庫/上限の境界前・境界・直後、拒否後の数量・Cart不変を設計できること
- [x] `M03-03`：未演習条件から本人がデシジョンテーブルの条件・動作・ルール・Caseを作り、到達不能/穴を判断できること
- [x] `M03-04`：状態遷移の許可/拒否と事前・事後状態を正式仕様から作成できること
- [x] `M03-05`：Risk→TR→Condition→Case→BR/ACのID・前提・期待結果を追えること

## M04：Phase 1総合演習（4目標）

- [x] `M04-01`：正しいAI案は採用し、誤りだけを仕様根拠付きで修正する演習と採否理由
- [x] `M04-02`：事例の動作/リスク/費用からUnit/Integration/Component/Web E2Eを選び理由を説明
- [x] `M04-03`：Automate/Later/Do not automateを頻度・再現性・保守費用・リスクで判断
- [x] `M04-04`：仕様未決・製品不具合・環境障害・AI推測を区別し、確認事項を保持。正式Phase修了は評価ブランチへ引継ぎ

## 固定Skillの通し確認・横断受入

- [x] 固定`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`のM02 `spec-analysis/test-analysis`について、Authority/Risk/Scope、出典・入力例・固定commit・CLI契約をソース照合し、専用契約テストを追加（実Run/CIの最終結果は別ゲートで判定）
- [x] M03の`condition_structure(direct)`→技法runtime→`materialize_coverage(artifact)`→`case_structure`→`verify_runtime_evidence`の依存・入出力・`valid`・fingerprint/拒否条件を固定資料と契約テストで静的照合し、Case検証先・JSON判定手順を修正（実連続Runは#199で判定）
- [x] 固定Skillの`SKILL.md/references/assets/scripts`とPython helperの配布元104ファイルを固定SHA/サイズ/パスで照合し、Skill-local入口・依存を契約テストで確認（配布後の実ファイルとPython実行は#199で判定）
- [x] 22目標すべてについて教材→演習→提出→評価条件→復習先、`start/end`状態と対応を全量照合し、固有テスト・検証ログを残す。内容未受入の目標を一括完了にしない

## クイズ・理解事項・自習・引継ぎ（補完）

- [x] `docs/curriculum/ai-assisted-qa/quizzes/M00.json`〜`M04.json`について、各設問の`objective_ids`・`knowledge_ids`、正答・誤答理由・解説・復習節、選択肢の妥当性を22目標と照合。単に問題があること、定義問題に正答したことを実技のLevel 2に換算しない
- [x] `knowledge-graph.json`のM00〜M04に属する理解事項をIDごとに読み、意味・粒度/重複・前提・`can_do`・説明節・クイズ/実技の実際の観測点を確認。`draft_requires_content_review`を形式的に承認済みへ変更せず、レビュー証拠・不一致・必要なグラフ修正を#199に引継ぐ
- [x] 通常OpenCodeチューターの説明→段階ヒント→別条件→誤解別復習→再挑戦の教材・起動コマンド・提出/復習経路を静的照合し、モデル引数と正式評価との分離を専用契約テストへ追加（実モデル対話は#199で判定）
- [x] M04終了の分析・Case・BR/AC・Risk/TR・初期データとM05開始入力のID/revisionを相互照合。Phase 1の提出MarkdownをGit/PRなしで保存・取り出す手順を教材で確認し、配布/エクスポートの実行不足は#218、評価不足は#217に引継ぐ

## 本PRで残るマージ前作業（エージェント担当）

- [x] **フォーマット修正**：Style Qualityで検出された専用契約テスト5ファイルを整形。[Web CI #42152886222](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42152886222)の`Format check`はPASS。Markdownlint別エラーMD018と追加空行も修正し、最終CI成功は次の未完了項目で判定する。
- [x] **最新baseとの整合**：#199 HEAD `76344d6530876e6eddae4bc5b0eba21374d14036`までの追加3コミットは#199統合Plan 1ファイルのみで、本PR差分25ファイルとの重複なし。baseは取り込まずに最新差分・依存をレビューした。配布manifestの104→105ファイル差分と件数固定テストの更新は#199統合側へ引き継ぎ、#218所有ファイルは変更していない。
- [x] **最終HEADの検証**：HEAD `ca9d493fa0aee2464be65a9239bdb4a9e17e4cb7`の[Web CI #42153146071](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42153146071)が全体Success。Style Quality（Prettier/Markdownlint/文章品質・Skill/仕様・教材検証）、Code Quality、Vitest (contracts)、Training runtime contracts、必須Chromium E2E、Cloudflare Preview Smoke、verify/validateが成功。本人実操作・モデルの受入は#199へ移管済みで本CIのPASSには含めない。
- [x] **独立レビューと引継ぎ**：本PRの25変更ファイルを関連Cart仕様・数量`select`・固定Skill入出力/拒否・提出/採点・M04→M05契約と再照合。追加の本PR固有の修正指摘なし（既知の採点条件・配布件数不整合は#199/#217/#218で継続）。[監査レポート](../reports/2026-11-04_pr214-phase1-evidence-audit.md)に結果を記録。CodeRabbit外部レビュー未実施、#199統合最終レビューは別判定。**自動マージしない。**

この4件は本PRで対応する作業のみ。#199で行う本人実操作や統合最終受入は本PRのチェック条件にしない。

## 過去の作業・照合記録（当時の未完了記述は現行タスクではない）

以下の2026-11-04時点の記録には、移管前の「5件未チェック」「実受入を待つ」といった表現が残る。これらは当時の実施状況の記録であり、**現在のチェック対象は上記30件と品質ゲート4件のみ**。実操作は#199へ移管済み。

## 2026-11-04 M00-01〜M00-04の再照合・実行制約

基準：PR #214の変更開始前HEAD `24414422e62285b23cce2f79780a81fe821e17f8`、更新後の教材Blob `M00/README.md@8c5b24908838f644ca73daa4ed1142218ed83786`、演習Blob `M00/exercise.md@1d59b9bf9e9b30ae9435df584fe7ec7e101e5323`、提出Blob `M00/submission-template.md@763464df7686785a45f9e49221fe94bcd2f1b65c`。直接ファイルを再取得して内容を照合。対象の`start/end`は`ai-assisted-qa-course-v3`。確認方法は読み取りによる条件照合であり、`pnpm`、Codespaces、OpenCodeを実行した結果ではない。

- **M00-01：教材対応の確認完了**。開始ガイドはGit/GitHub知識不要を前提にし、M00 README第2章からP01（ルートと作業ディレクトリ、意図的エラーと復旧）、P02（別ファイルの保存・開き直し・`cat`）、提出P01/P02、`M00-CR-01`、`M00-Q01`の復習先まで追跡。必須となる本人の実出力・保存結果は提出条件として残す。本人の操作成功は未実証。
- **M00-02：教材対応の確認完了**。README第3章・3A.4でChat/Agent、read/edit/command、固定Skill、helper、モデル/Secretを区別。演習手順5・P03/P06、提出欄のSkill revisionと許可/拒否、`M00-CR-02`、`M00-Q02/Q06`との対応を確認。固定Skillの実読み込み・本人による権限判断は未実証で、後述の固定Skill通し項目と独立に検証する。
- **M00-03：教材対応を修正して確認完了**。実AIが正答しても誤り訂正の技能を確認できるよう、P04に「タブを閉じればCodespace停止・Remoteへ自動反映」という**架空の誤回答**を追加。実AIの回答・採否と、本人による別条件の訂正・2資料の出典を分離して提出させる。README/提出欄を整合させ、専用`tests/contracts/ai-assisted-qa-phase1-m00-correction.test.mjs`を追加。`M00-CR-03`と`M00-Q03`の復習先を照合。専用契約テストのソースを直接検査したが、Vitest実行・CI結果は未確認。
- **M00-04：未完了/BLOCKED**。`pnpm course:load M00`で編集済み`submission.md`の競合拒否・非0終了・内容不変を実学習環境で実行していない。Ports 6080のPrivate表示、本人の費用/支払者/モデル画面、Secret拒否の判断も実環境では未確認。自作`practice.md`の保全や架空提案の正答を代用しない。個人用Private 2-core Codespacesと所定の利用許可・費用条件が確定した後、P05/P06の結果をRun/提出ファイルと結び付けて再開する。

この3件のチェックは**教材・課題・提出欄・評価条件への設計上の対応**を表す。受講者本人のLevel 2、実AI評価、実Codespaces受入、正式Phase 1合格、CI PASSを表さない。実モデル・実環境・評価エンジン側の未確認は担当タスク（本リストの固定Skill・横断受入、#217、#218、#199統合）に残す。実行ログは未取得であり、実施したコマンドを`pnpm`や`vitest`と偽って記録しない。

## 2026-11-04 M01-01〜M01-04の教材整合と修正

参照：M01の更新済み教材Blob `a2a6e10d292855e9b16adb7c61c0dc0f80ca0fb3`、演習Blob `3fbe6c2a272224c1226a133e8ecf7a4f6f0fea31`、提出テンプレートBlob `f0d2b3788cea443677a17ff48d39249a9e798af0`。正式仕様`docs/spec/features/cart.md`の`BR-CART-001/003`、`docs/spec/features/storefront.md`の`BR-STOREFRONT-002/003`、既存`src/presentation/pages/cart-page.tsx`の数量`select`・`src/application/use-cases/cart-use-cases.ts`・Dexieリポジトリを読み取り照合した。教材・演習・提出欄と`M01-CR-01〜04`、`M01-Q01〜Q05`の対応を静的に確認。開始/終了のstate revisionは`ai-assisted-qa-course-v3`。

- **M01-01**：P01のUI観測、P02の価格変更時の未確認、P03の架空の欠陥メモを各々実観測と区別。教材に残っていたサーバーAPI・注文テーブルを使う誤った例、Web数量自由入力による境界超過例を、実際の`select`とUse Case/Dexieの検証に修正。仮想観測を実不具合として扱わない。
- **M01-02**：P04-Aは`BR-STOREFRONT-002`の決定的ソートと主観的UX探索を区別、P04-Bは`BR-STOREFRONT-003`の在庫0バリエーション追加不可を回帰/自動化の前提へ対応。数量`select`に存在しない入力をWeb E2Eで操作できたとしない。
- **M01-03**：第4章の分析→設計→実行→評価→改善のAIと人の分担、P06でのAI過大保証の棄却、本人の訂正文・追加テスト、提出P06と`M01-CR-03`の対応を確認。
- **M01-04**：P05がUnit/Integration/Web E2Eの3層で止まり、`K-M01-04`のComponent能力を独立に測れなかったため、数量選択UIのComponent責務と検出できない保存処理を追加し、4層すべてに検出可能/不可能な欠陥と採否・費用を求めるよう改訂。本文の実習Dも4層・実在するCart処理に修正。

回帰防止として`tests/contracts/ai-assisted-qa-phase1-m01-contract.test.mjs`を追加。M01教材・演習・提出・採点・クイズ・状態をGitHubから再取得し、各目標の対応条件を静的に照合した（M01-01=4/4、M01-02=4/4、M01-03=3/3、M01-04=4/4）。**Vitest、実Web UI、実IndexedDBのRun、CIは未実行・未確認**であり、契約テストが実際にPASSしたという意味ではない。本人による実行・回答と正式AI Level 2評価は別に受け入れる。

## 2026-11-04 M02-01〜M02-05の教材・仕様・評価条件照合

固定対象：教材`M02/README.md@c8e0b3336c16331afc7de9c9e7b331a10fc3ebdd`、演習`M02/exercise.md@b0d9e1d213fffb6723f182c7884ad88ada7494da`、提出`M02/submission-template.md@a8346ae8d3a20d10e8495a7d38584016b49c9123`、`M02-CR-01〜05`、`M02-Q01〜Q08`と`start/end.json`の`ai-assisted-qa-course-v3`。正式Cart/Storefront仕様、`docs/spec/state-and-scenarios.md`と`src/seeds/scenarios.ts`を読み、既存状態を変更しない照合。

- **M02-01**：`BR-CART-001/003`を基にP01の「追加/更新・4操作を各々独立初期値2から」、P02の価格変更/在庫切れと2時点、P03の検索条件を確認。推測と観測の区別、提出・`M02-CR-01`・関連3設問へ対応。
- **M02-02**：Role/State/Data/Journeyの実条件と論理用架空商品を区別し、P01〜P03・提出・`M02-CR-02`・設問へ対応。
- **M02-03**：P06は`default`と`cart-with-invalid-items`の実資料・Reset処理を参照し、保証・要観測・未定義を独立分類。現在Cartや前テストの副作用をSeed名だけで断定せず、`M02-CR-03`に対応。
- **M02-04**：P04でImpact/Likelihood/Priorityと根拠不足、**架空の追加情報**による再優先順位付け、Risk/Scopeの出典を`M02-CR-04`へ対応。
- **M02-05**：P05の架空の短時間注文仕様から5件の確認質問、保留する期待値と影響Caseを`M02-CR-05`へ対応。回答がないまま期待結果を確定しない。
- 修正：M02第2.3節の上限3・直接数量4という図がWebの選択式UIでも実行できると誤読されないよう、`src/presentation/pages/cart-page.tsx`の`select`とUse Caseの境界入力を明記した。新規`tests/contracts/ai-assisted-qa-phase1-m02-source-boundary.test.mjs`でこの境界とP課題を確認するテストを追加。

GitHubの最新ファイルを再取得し、M02の5目標すべてについて教材・P課題・提出・評価条件・クイズ・stateの対応を静的に確認した。**契約テストのVitest実行、実Seed/Reset、本人の操作・固定Skill実行、正式採点、CI PASSは未確認**。それらを静的照合のチェックへ混ぜない。

## 2026-11-04 M03-01〜M03-05教材照合

対象の読み取り：教材`M03/README.md@eb0c2b14d9f238f287bfc53daf98c5d729e63c48`、演習`M03/exercise.md@e82fc80751e66e53ef374cc1d27226b29b4c349c`、提出`M03/submission-template.md@4e39482ffc4e5042f7836a2ccc78f3eb3a64b710`、採点`M03-CR-01〜05`、クイズ`M03-Q01〜Q09`、開始/終了stateの`ai-assisted-qa-course-v3`。

- `M03-01`：P01の再検証4同値クラスと2 Case、代表値、理由を評価条件へ照合。
- `M03-02`：P02の2仮想条件×3境界、拒否後の数量不変・Seed条件を照合。
- `M03-03`：通常練習の検索8ルールとP03の価格変更×在庫切れ4ルールを別に導き、未決・到達不能・準備不足を区別する条件を照合。
- `M03-04`：P04の数量1→2→拒否→0、事前・事後状態・Caseと、Web `select`では上限外/0を選べないことを照合。教材本文のUI自由入力表現をUse Case/契約テストに修正。
- `M03-05`：Risk・Scope・TR→TCN→CI→Case→BR/AC、技法の採否、機械的validと仕様の意味的正しさ、P05/P06、採点条件を照合。固定Skillの実Runは別の未完了項目。
- 新しい専用契約テスト`tests/contracts/ai-assisted-qa-phase1-m03-design.test.mjs`を追加した。

各目標について演習・提出・採点・state・クイズの参照をGitHubの最新ファイルで静的に確認。**Vitestの実行、実Shop操作、固定Skillの実Run、本人のLevel 2、CIは未実施・未受入**。教材対応をこれらのPASSに読み替えない。

## 2026-11-04 M04-01〜M04-04の教材整合確認

対象：`M04/README.md@afd06cd3cda7296813f1ed4da05b6b2f96a9b614`、演習`M04/exercise.md@d17900feb00926d146105b4a0753f519df696abd`、提出`M04/submission-template.md@50fecc438bb58a973d0ffc5a0df88e824ea4d78d`、`M04-CR-01〜04`・`M04-Q01〜04`・start/end revision `ai-assisted-qa-course-v3`を照合。

- `M04-01`：P01〜P03は検索facetのAND/OR誤読、承認ラベルの未決、在庫0と非公開の重複判断を、仕様根拠に基づき採否・修正する。
- `M04-02`：P04はUnit計算/Integration Dexie保存/Component数量select/Web E2E導線の**4層を独立**に比較するよう修正。検出できない欠陥と費用、全件E2E案の棄却を提出欄に要求。
- `M04-03`：P05の確定仕様・データ準備の変化からAutomate/Later/Do not automateを再判定し、再開条件と費用の出典を示す。
- `M04-04`：P06は本人の別Case、Role/State/Data/Seed・BR/AC・拒否後不変・実Shopでの実行可能性と代替候補を要求。未決の確認先、影響Case、次の担当者への引継ぎを残す。**実Shop上の可否と本人採点は未実行**。
- 本文中の存在しない「カート更新API」をUse Case→Dexie/IndexedDBへ訂正。別システムのメール再設定例は架空と明記。専用`tests/contracts/ai-assisted-qa-phase1-m04-review.test.mjs`を追加。

GitHubから再取得した教材・P課題・提出・評価条件・クイズ・start/endの静的照合に限る。**Vitest、実M06入力Caseの実行可能性、本人の正式Phase 1評価、CIは未受入**。実行なしでPhase修了とはしない。

## 2026-11-04 M00〜M04クイズ32問の確認

`M00=6/M01=5/M02=8/M03=9/M04=4`、計32問の問題文・4選択肢・正答・誤答理由をレビューし、22学習目標に対する`objective_ids`と`knowledge_ids`の対応を確認。全問で選択肢値4種が重複せず、正答は4種のうち1つ、説明は空欄なし。復習先は**既存`scripts/spec/slug-heading.ts`のNFKC正規化・ハイフン連続圧縮に従って**見出しと照合し32/32一致。独自の簡易slug判定による誤検出は採用しない。

`M04-Q02`の正答はIntegration/Componentをまとめて「連携点」としていたため、Unit=計算、Integration=保存連携、Component=UI部品、Web E2E=導線へ修正（`M04.json@b70ef11ab0af57a2b5c7ea88bd9be507c2b8cbab`）。M02-Q03の復習リンクは既存slug実装では元の1ハイフンが正しいためその状態へ戻し、追加変更なし。

クイズは**知識の確認**に過ぎず、本人のP課題・固定Skill実行・独立した正式AI評価によるLevel 2を証明しない。既存の横断リンク契約テストはコードを読んだが、Vitest・CIでの実行は未確認。

## 2026-11-04 知識グラフ33理解事項の確認・#199引継ぎ

`knowledge-graph.json@1333e120e8f97af85961701563309f04a82ae3e6`の`type=knowledge`・M00〜M04の33ノード（M00=8/M01=5/M02=8/M03=8/M04=4）をIDごとに確認。全件で固有ID・意味を持つ`can_do`・教材`teaches`・目標`requires_knowledge`・教材の復習見出しがある。復習リンクは既存`scripts/spec/slug-heading.ts`と同じ規則で検査し33/33で存在。クイズ未対応の`K-M00-01/04`、`K-M02-03`、`K-M03-05`は別の実技/採点確認対象であり、クイズがないだけで欠陥と断定しない。

意味上の修正候補は#199へ[コメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6628359908)で引継ぎ済み。`K-M01-04`の四層復習先はM01第5章、`K-M04-03`の自動化選定復習先はM04第5章が適切。`M03-04`の`applies_to: F-CHECKOUT`のみという関係は、現行M03 Cart事例との整合判断が必要。**グラフ正本そのものはこのPRで変更せず、33ノードとも`draft_requires_content_review`のまま**。修正完了・学習者の理解度・AI採点PASSとは宣言しない。

## 2026-11-04 M04→M05契約・Git/PR不要のMarkdown取り出し

M04終了`states/M04/end.json@bc54b5f494525f9654b9e0ab808653a324fa1597`とM05開始`states/M05/start.json@73c22e32a507a4e3fcf22cdf6e1c005c74c3ea2e`を相互照合。`ai-assisted-qa-course-v3`のもと`M04-result-01=workspace/M04/review.md`と`M04-result-02=workspace/M04/submission.md`が`M04-result-v1`/`M04-to-M05-handoff-v1`で一致し、M05では両入力ともoptionalかつ`same_input_contract=true`。M05の別ID公開fallback`M05-public-start-01`を本人の成果物と混同しない。

M04演習と提出テンプレートに、承認Caseの元ID、Risk/TR・Scope・BR/AC、revision、Role/State/Data/Seed・Reset・不変条件・未決事項と、M05へ渡す2 Markdownの保存確認を明記。M02分析・M03設計・Skill runtime証拠をM05の2ファイル契約で検査したという誤認を避ける。M04教材へM00〜M04の本人MarkdownをGit/PRなしでCodespaceからDownload（表示されない環境ではUTF-8全文コピー）し、PCで開き直して照合する手順を追加。M03 runtime JSONは別に保持する。契約の回帰防止として`tests/contracts/ai-assisted-qa-phase1-handoff.test.mjs`を追加（**Vitest未実行**）。

配布・取り出し・M00再ロード保護/2-core Private Codespacesの**実行不足**を[PR #218](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/218#issuecomment-6628409789)に、本人の**正式AI評価未受入**を[PR #217](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6628410571)に引継ぎ済み。Markdown持ち帰りや正式M04評価を実施済みと報告しない。学習配布/評価の完了判定と最終CIは担当PR側で別に確認する。

## 2026-11-04 続行：22学習目標・配布元Skill・残条件の再検証

固定した静的検証記録：[`docs/reports/2026-11-04_pr214-phase1-evidence-audit.md`](../reports/2026-11-04_pr214-phase1-evidence-audit.md)。学習目標22/22について採点条件の必須P番号→実演習P見出し→提出P欄の対応一致。開始/終了stateの22/22目標IDとrevision一致。復習先はリポジトリの`slug-heading.ts`規則で32/32一致。`tests/contracts/ai-assisted-qa-phase1-objective-evidence.test.mjs`に固有の回帰テストを追加。**テストソースはあるがVitest実行は未確認**。

固定`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`のソース104/104はGitツリーとのblob SHA・サイズ・パス一致を直接照合。ただし、実受講環境のSkillコピー・helper実行は未検証。M00再ロードの競合拒否は既存`loadModule`と関連テストに実装されていることを読取確認したが、Ports/費用/本人再ロードの**実行証拠はなし**。これらの未完項目はチェックしない。

**この22目標横断照合項目のチェックは対応付けのレビュー完了のみを指す。** M00-04単独の本人実環境受入、M02→M03固定Skill統合、OpenCodeチューター、正式AI評価のLevel 2まで一括で完了としない。評価基準の独立性不足は[PR #217のコメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/217#issuecomment-6628709053)に引継ぎ済み。

## 2026-11-04 続行：残る実環境ゲートの状況

残る5項目は**未チェック**。検証済みのソースと、未実施の実行を区別する。

- **M00-04**：`loadModule`の再ロード競合拒否実装と既存テストを確認。編集済み`submission.md`の実Codespacesでの非0終了・前後不変、Ports 6080 Private、支払者/利用枠/モデル条件の実画面は未確認。**架空の危険提案を判断できたことは実操作の代わりにならない**。
- **M02固定Skill実Run**：配布元の指定commitとmanifestのSHA・サイズは104/104一致。実在のCart/Scope/RiskのAuthorityと出典・revisionを、`spec-analysis/test-analysis`で生成したモデル実行ログは未取得。
- **M03固定Skill連続実Run**：`condition_structure(direct)`、技法runtime、`materialize_coverage(artifact)`、`case_structure`、`verify_runtime_evidence`の同一入力連鎖を起動できていない。既存`workspace/M03/*-runtime-evidence.json`のplaceholderを正しい実行証拠として扱わない。
- **Skill-local/Helper**：GitHub上で104ファイルの存在・SHA・sizeを確認。受講者環境に配布された13入口・43 scripts・28 assets・20 referencesの存在と、Python helperの実返却値は未確認。配布担当[#218](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/218#issuecomment-6628809934)へ実受入を引継ぎ。
- **OpenCodeチューター**：`tutor-core.mjs`と既存契約テストを読み、モデル明示・読み取り専用・先行同意・正式評価分離の設計は確認。実OpenCode 2.0.22とプロバイダモデルが利用できないため対話は未実施。V2設定の`autoupdate`とネストした教材への`read`範囲、および説明→段階ヒント→別条件練習→復習→再挑戦の実受入を[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6628775876)へ引継ぎ。AIの正答と本人Level 2は別に評価する。

確認はソース照合によるもの。Vitest、OpenCode、Codespaces、CI PASSを実行済みとして記録しない。

## 2026-11-04 実動作確認を除く作業の完了記録

上記の5項目それぞれについて、**実動作以外の準備は5/5件チェック済み**。元の受入5項目は人間の実動作証拠がまだないので未チェックのままとする。具体的な修正、固定Skill/仕様の照合、JavaScriptによる直接静的検査44+13件、未実行の条件は[検証レポート](../reports/2026-11-04_pr214-phase1-evidence-audit.md)に記録。新規`tests/contracts/ai-assisted-qa-phase1-pinned-skill-entry.test.mjs`と既存の専用テストはCIによる実行結果を未取得。CI完了は待機しない。

## #199へ移管した最終実受入（本PRではチェックしない）

- M00初回ロード、受講者本人のPrivate Port・費用・Secret・権限と実操作
- 学習者のOpenCodeモデルへの認証付き対話、段階的なヒント/再挑戦とM04独立採点の区別
- 固定Skill/Python helperの学習環境でのM02→M03全工程実行と有効な実証拠の確認

受入実施前にチェックを追加して「完了」としない。実行不能の場合は入力・再開条件を#199へ記録する。
