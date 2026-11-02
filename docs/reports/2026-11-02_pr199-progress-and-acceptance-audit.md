# PR #199：進捗・分析受入・CIの横断レビュー（2026-11-02）

## 調査対象・変更境界

`docs/plan-ai-agent-qa-curriculum-redesign` の`supported-behaviors.json`、`validate-supported-behaviors.mjs`、`ai-assisted-qa-supported-behaviors.test.mjs`、現行Plan/Target、Web CI #41367308251を照合した。数値は調査時点のHEAD `1c1d8c525d481005f8e498db55ff0cc12da36c11` に基づく。以後のHEADで再集計すること。製品SUT・正式仕様・Seed/Reset・既存製品用テスト/workflowは変更しない。

## 集計と8時間の変化

- `behaviors[]`は208件：画面操作172、Use Case操作16、非default状態20。操作は188件。
- 操作の基本分析は50/188、残138（画面操作137、Use Case操作1）。非default状態は14/20、残6。未完了の合計は144件。分母の漏れ・重複の最終監査は未完。
- 144件中104件の`basic_analysis_review`は「元の仕様文言と部門共通テンプレートのみでは…」の一般的な不足説明で始まり、残り40件には操作固有の記録がある。**これは作業の切り分けに使う現状分類**であり、104件全てが未調査、40件全てが実行待ちとは断定しない。
- 2026-11-02 00:44〜08:44 JSTでは32コミットで13ファイルが変化したが、`supported-behaviors.json`は先頭のHEAD `c8dba151099c` と末尾`845f9320aee4`で内容が完全一致。学習用契約テスト・作業Planの更新は基本分析済み数に反映されていない。
- その8時間のWeb CIは32回（failure 30、cancelled 2、success 0）。現在のCI失敗を単一の製品不具合として扱わない。

## 基本分析・実行検証・製品適合の判定

[Target](../plans/2026-10-16_qa-curriculum-ai-agent-redesign_target.md)は、全サポート動作の分類100%と、正式仕様、Role/State/Data、主要Risk、TR/Condition/Caseの扱いと採否理由を揃えた**証拠付き基本分析100%**を独立に要求する。静的証拠でも基本分析の条件を満たし得るが、資料を参照したという記述だけで成立するわけではない。

`validate-supported-behaviors.mjs`の`completeAnalysis`は、指定欄が空・定型プレースホルダーではないこと、`requirement_refs`があること、`reviewed_against`にspecification/implementation/seedの3値があることを確認する。別の処理で出典の行・signature等を照合するが、**Risk/TR/Condition/Caseの意味的な十分性、Native分岐、実Web/NativeのPASSは自動証明しない**。従って既存validatorの成功だけを理由に`analyzed`へ変更しない。

次の順でIDごとに判定する。

1. 現行`main`に対応する正式仕様と実装/Seed（#210の未マージ製品差分ではない）を照合する。
2. 当該IDのRole/State/Data・期待結果・Risk/TR/Condition/Case採否に不足があれば個別根拠を補う。新規テストより、既存テスト・分析レポートの再利用を優先する。
3. 基本分析条件が成立すれば`supported-behaviors.json`の対象項目と関連契約テストを整合させる。既存のテストが特定IDの`analyzed`を要求していても、それを理由に根拠なく昇格させない。
4. 基本分析そのものに必要な仕様・根拠が未決なら`review_required`/`blocked`と証拠・再開条件を残し、承認不要の別IDへ進む。実Web/Native・製品適合・教材技術受入が未完でも基本分析の条件が独立に成立する場合は当該IDの基本分析を完了し、実行結果を別の未受入として管理する。

## CIと契約の不一致（横断未完了）

[Web CI #41367308251](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41367308251)ではStyle Quality、Vitest contracts、Chromium E2E (required)、verify、validateが失敗した。Code Quality、unit/integration/repository/component、主要な別E2Eは成功。

- **Vitest contracts**：`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`で15失敗。先頭の集計期待に旧値 `basically_analyzed:80` / `requires_review:108` / `unreviewed_state_conditions:2` が残る。ほか14件は現台帳の`review_required`に対して固定`analyzed`を要求する。既存の証拠を確認し、台帳が確定的に分析済みなら再成立させる。そうでなければテストの旧期待と責務を見直し、進捗偽装や検証の無効化をしない。
- **Style Quality**：学習用テスト6ファイルでPrettier違反。
- **required Chromium E2E**：`e2e/web/phase1-required.spec.ts:181`の「価格・在庫・Rank変更でCheckout再確認」が3試行で失敗。指定メッセージが見つからない。画面挙動・仕様・E2E期待のどこに原因があるかは未確定。#199で製品SUTや既存製品E2Eを書き換えず、調査・#210への引継ぎを守る。
- 1つの対象の学習用契約テストがPASSしても、全契約テストと全CIのPASSを主張しない。

## 仕様判断と#210の境界

注文確認の復旧導線や価格変更、Web/Nativeの支払方法表示、商品一覧emptyの復帰導線、管理在庫の0/1〜5/6分類、Signup差、管理注文のフィルターなどは個別分析に静的な差異・未確認条件が記録されている。事実・仕様解釈・実動作未確認を分ける。#210で修正済みであっても#199が参照する`main`で同じ結果が成立するとは見なさない。

本人の仕様確定、外部公開・課金・権限、最終受入、#210の製品改修は、承認不要の分析・教材・検証作業を終えるまで先行しない。未決に依存する項目を根拠なく完了にはせず、必要な判断と選択肢を蓄積する。後続承認なしでは100%に至らない場合はその限界を明示する。

## 4定期実行の処理方針

00/15/30/45分は**同一の現在作業**を引き継ぐ。時刻ごとの担当分けをしない。具体的な次の1件は最新`docs/plans/2026-11-01_pr199-execution-tasks.md`の現在作業と最新台帳から選ぶ。

1件の進め方は「不足条件確認→根拠補完→基本分析の完了判定→必要な直接検証→台帳更新または再開条件記録」。同一根拠で複数IDが成立する場合はIDごとに検証してまとめて更新してよい。新情報のない検証待ちIDは再調査せず、着手可能な次のIDへ進む。4実行の競合時は最新HEADと対象ファイルを再取得し、安全なfast-forwardでのみ確定する。

## 独立レビュー・実行上の未受入

本監査は台帳構造・受入契約・作業順・公開CIの横断レビュー。**144項目の全件の意味的受入・51学習目標の全件レビュー、実Web/Android/iOS、正式AI評価の実モデル校正、配布物生成・Secret/NOTICEの実監査は未実施**。Codexへの実装指示は、この横断調査と必要なレビューを完了した後で整理する。本書で作業を省略・完了扱いしない。

## 2026-11-02 16時台：定期実行以外の独立レビュー

### 進捗と共通契約の不整合

調査開始HEAD `399d499901c208f2b630c459581a1ca0505a5e89` の台帳は基本分析70/188操作、16/20非default状態、未完了122件（操作118、状態4）。先の50/188・14/20から22件進行した。**この数字は基本分析の状態であり、製品適合・Web/Native実行・教材の技術受入とは別**。以後は最新HEADを再集計する。

`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`には固定80→70のように逐次更新していた集計期待と、#210分離後に`review_required`へ戻した操作を`analyzed`と断定する個別期待が残っていた。これは定期実行で基本分析を進めるたびに再発し得る横断的なテスト不備である。

- `3bd1e92f7639`：固定の分析済み数を実台帳の分類から独立計算する方式へ変更。#210後の再照合待ちは明示的な再確認記録と監査根拠がある場合に限って許容。リスク・関連Use Case・証拠参照の検査とvalidatorの負例テストは維持。
- [Web CI #41404856741](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41404856741)：変更前14失敗から変更後2失敗へ減少したが、この時点でcontracts jobは**failure**。残り2件をログで確認した。
- `b2992df42afe`：注文詳細A01-01は`audit_branch_refs`が未設定だが、`implementation_evidence`・`seed_evidence`・個別監査記録が存在するため、存在しない任意欄を必須扱いせず実在する証拠のパスと記録を検査。Checkout住所再開の親操作A02-01は再分析待ちであり、固定`analyzed`期待をやめて再確認記録を検査する。**最新HEADのcontracts再実行結果は別途確認が必要**。

旧HEADのCI失敗には、学習用ファイルのPrettier違反と既存製品用required Chromium E2EのCheckout文言不一致もある。今回の契約修正を全CI成功・製品修正成功として扱わない。

### 既存調査済みの未完了項目の独立確認

調査開始HEADでは`review_required`の122件のうち21件に`reviewed_against`のspecification/implementation/seedが記録され、`audit_branch_refs`も存在した。このうち20件は#210分離後の現行`main`への再照合待ちを明示し、1件は管理ユーザー詳細A02-03の最終管理者保護の実証不足だった。21件を照合フラグだけで基本分析完了扱いにはしない。

特にCheckout確認A01-01/A01-03/A02-01/A02-02/A02-03は同じ`basic_analysis_review`文面を共有し、各ID固有のRole/State/Data・Case採否が独立に確かめられたことを文面の存在だけでは保証できない。個別IDの実体照合は共通逐次の定期実行に任せる。旧製品差分で「修正済み」とある歴史的な記述は、#199の現行`main`に修正が存在するという証拠には使わない。

### 51学習目標の横断的な構造監査

調査開始HEADの11モジュール`M00`〜`M10`について、教材README・演習`exercise.md`、採点`scoring-tests/Mxx.json`、公開クイズ`quizzes/Mxx.json`の存在とID対応を確認した。採点JSONの`objective_ids`は合計51件で、51件すべてに`criteria`がある。クイズは合計78問で、11モジュールの51目標が各モジュールの設問から参照される。校正用`cases`は合計106件で、不正解・証拠不足等の負例が各モジュールに存在する。

| モジュール | 目標 | クイズ | 校正Case |
| --- | ---: | ---: | ---: |
| M00 | 4 | 6 | 8 |
| M01 | 4 | 5 | 8 |
| M02 | 5 | 8 | 8 |
| M03 | 5 | 9 | 13 |
| M04 | 4 | 4 | 12 |
| M05 | 5 | 12 | 10 |
| M06 | 5 | 8 | 12 |
| M07 | 5 | 7 | 10 |
| M08 | 4 | 5 | 9 |
| M09 | 5 | 7 | 8 |
| M10 | 5 | 7 | 8 |
| **合計** | **51** | **78** | **106** |

この存在・IDの対応検査は既存`scripts/training/validate-ai-assisted-qa.ts`とも責務が重なるため、同じ目的の新しいvalidatorは作成しない。**構造上の配置確認≠内容の正しさ≠学習者が達成したこと**。教材本文と個々のCaseの期待・実Runの再現性、51目標それぞれの独立した内容レビュー、実OpenCode評価モデルの校正・誤PASS拒否は未受入のまま残す。特にM04/M07/M10の正式評価とM05〜M07の実Chromium確認は、静的なJSONの存在では代替できない。

### 後続の作業境界

定期実行4件は分担せず共通現在作業を継続する。今回の横断契約修正を個別IDの基本分析進捗に加算しない。製品SUT・正式仕様・Seed/Reset・既存製品用テスト、#210の製品改修、自動化の設定、外部公開・課金・権限・本人の最終受入には触れていない。Codex向け指示は、残る横断レビュー・調査の完了後に作成する。

## 2026-11-02 教材・正式AI評価・配布処理の独立レビュー

### 担当と変更範囲

CI全体の失敗修正はCodexへ切り分ける。共通逐次の4定期実行は変更せず、個別サポート動作の基本分析を継続させる。ここでは教材・演習の内容、正式AI評価、教材配布のコードと契約テストのみ変更する。Codexの作業指示は本監査で残る作業を確認し終えるまで作成しない。Scenario Shop製品SUT・正式仕様・Seed/Reset・製品用E2E・#210は変更しない。

### M00〜M10の構造と内容確認

教材README・演習・公開クイズ・採点JSONの11モジュール構成、51学習目標の採点基準との対応、78問の確認クイズ、106件の校正Caseは前節の集計どおり。クイズの選択肢の値重複や正答値の欠落も確認対象とし、今回調べた78問に異常はなかった。**これはID・配置・選択肢の構造上の検査結果であり、51学習目標の授業内容の意味的な全件受入、出題の妥当性、実モデル校正ではない**。

M07について、`training/ai-assisted-qa-course/exercises/M07/exercise.md`の診断素材Aの手順が`repaired-assertion.spec.ts`を誤ったAssertionの実行元として案内していた。実ファイルでは`workspace/M07/failure-assertion.spec.ts`が「存在しない商品」を期待する意図的なAssertion失敗を持ち、`workspace/M07/repaired-assertion.spec.ts`は`throw new Error("TODO: ...")`で中断する未完成spec。実行元とエラー原因が一致しないため、学習者が誤った失敗原因を判定する問題だった。

[修正コミット](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/259b49915f8a40b87c8a0dd3d9e190253893be13)で、診断素材Aの独立Runと修正用specの`--label before/after`を区別した。教材READMEのTODOとAssertion失敗を混同する説明も修正。既存の`ai-assisted-qa-course-distribution.test.mjs`に3つのRun手順と実ファイルを照合する契約テストを追加した。**実Chromium Runは未実施**。

追加レビューで、診断素材Aは`course:run`の`MODULE_SPECS.M07`の許可一覧に存在せず、`--label diagnostic`も既存`LABELS`に含まれないと判明した。教材だけの修正では実行できないため、`failure-assertion.spec.ts --label main`を許可し、M07の`execution_evidence.required_runs`と`validate-ai-assisted-qa.ts`へ`main`・failed・1 test・Trace必須の診断Runを追加。既存のrepaired before/afterとmaintenance before/afterの要求は維持した。これは新しい製品用E2Eを追加する変更ではなく、既存の学習用診断素材を実行・正式評価できるよう整合させたもの。

### 正式AI評価の入力境界

`scripts/training/ai-assisted-qa-assessment.mjs`の正式評価Promptには4MiBの入力上限があったが、`buildCalibrationPrompt`から`obtainCalibration`へ渡す校正Promptには対応する上限検査がなかった。いずれも外部OpenCodeモデルへの入力であり、校正だけ無制限にすべき根拠はない。

[修正コミット](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/ba4d967abc6d83847d9172bf9af339aa82ec9d77)で、UTF-8バイト長による共通の4MiB上限を校正・正式評価の両方に適用した。ASCIIの上限値、複数バイト文字の超過、非文字列入力を契約テストへ追加した。モデルの認証・外部送信の本人確認を迂回する変更はない。**実OpenCodeの接続・校正、誤PASS率、再評価の実受入は未実施**。

### 学習用配布の外部ファイル境界

`scripts/training/ai-assisted-qa-course-core.mjs`の外部Skill取得は固定Git blob SHAの照合を実施するものの、取得後の`arrayBuffer()`で全内容を読み込んでから長さを検査していた。許可リストが公開固定リポジトリを指す場合も、サイズ超過レスポンスを無制限にメモリへ取り込む必要はない。

[修正コミット](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/ba4d967abc6d83847d9172bf9af339aa82ec9d77)で、既存の応答サイズ制限付き読込を再利用し、各Skillファイルのmanifestの`size`を上限として読み込み中に拒否するよう変更した。manifest自体も正の安全な整数、最大1MiB（現行最大ファイルは約272KB）を要求する。content-length超過時に本文を読み取らず、配布先へファイルを作らない負例を契約テストに追加した。エラー文は[追加修正](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/67569832c4a7472db7321e6f1c534591fb354312)で`external Skill`と明示した。

### 未受入と次の検証

- 本監査ではCI実行を自分の実行環境から起動していない。PRへのpushで起動するGitHub Actionsの最終HEAD結果を確認する。既知のStyle Quality・既存製品用required Chromium E2Eなどの失敗解消はCodex担当であり、テストPASSを先取りしない。
- M04/M07/M10の実OpenCodeモデル校正、根拠不足・旧SHA・改ざん・Prompt Injection・不正なLevel 2で最終修了PASSを防げること、非公開履歴の再評価は未受入。
- 配布のclean main起点生成と実学習用コピー、起動・Reset・Chromium、Secret/NOTICE実検証は未受入。Public Template公開・本人所有Private Codespacesの作成、課金・権限・最終受入は指定どおり後続工程。
- 教材の残りの意味的な全件レビューは継続。今回のM07修正やJSONの存在確認だけで51目標の内容レビュー完了とはしない。

### Phase別知識グラフの評価ソースの修正（2026-11-02）

`ai-assisted-qa-assessment.mjs`の`filterPhaseKnowledgeGraph`は、対象Phaseの`ASSESS-P1/P2/P3`ノードを選ぶ際に`phaseModules[0].slice(0, 2)`を使っていたため、`M00`→`M0`のような値と`P1`が一致せず、3つの評価ノードをすべて除外していた。さらに`P1/P2/P3`のPhaseノード自体も選択しておらず、`ASSESS-P1 → P1`や`M00 → P1`などの`part_of`リンクも失っていた。`phaseId`を正規の引数として渡し、対象Phaseのassessment/phaseノードとリンクを残し、他Phaseを除外するよう修正した。`tests/contracts/ai-assisted-qa-assessment.test.mjs`にP1/P2/P3の回帰テストを追加。内容の全件受入や実OpenCode校正に代わるものではない。

### OpenCode中断時のPrompt再開（2026-11-02、独立調査）

正式AI評価の`runOpenCode`は校正と採点のPromptを`flag: "wx"`で保存する。OpenCode実行後・結果確定前にプロセスが停止した場合、同一試行を`--resume`しても既存の`calibration-prompt.md`または`assessment-prompt.md`への再書込みが`EEXIST`となる。未確定試行の安全な再開という評価Planの契約に反する。

既存ファイルが通常ファイルで、内容がUTF-8バイト単位で完全一致する場合のみ再利用し、内容相違・ディレクトリ・シンボリックリンクを拒否するよう修正した。校正と採点の両経路に同じ処理を適用し、同一内容の再実行・変更時拒否・既存内容不変の契約テストを追加。正式評価の結果・合否判定ロジックは変更しない。

直接のNode/Vitestと実OpenCodeによる強制中断・再開の通し実行、および最新HEADのGitHub Actions成功はこの記録時点では未確認。実モデル校正・誤PASS判定の技術受入は引き続き未完了。
