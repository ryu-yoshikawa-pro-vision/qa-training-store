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
