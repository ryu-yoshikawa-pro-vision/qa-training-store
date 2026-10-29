# M03 設計提出

## Condition Design

- 固定Skill revision / Skill名 / mode:
- Authority・Product Risk Entityの出力参照/fingerprintとsource revision:
- Scope参照の意味・正式な出典・仕様revision（Scopeは独立Entityではない）:
- 入力artifact ID・fingerprint:
- 技法と選定理由・適用限界:
- current TCN / Model:

### 4技法の別条件worksheet

各行はM03の完成例と異なる条件を使い、仕様が決めていない期待結果を追加しません。条件を実行できない場合は不足入力と確認方法を記録します。

| 学習項目 | 条件・入力 | 導出したクラス/境界/ルール/遷移 | 期待結果と仕様根拠 | 適用限界・未決事項 | 対応Case ID |
| --- | --- | --- | --- | --- | --- |
| M03-01 同値分割 |  |  |  |  |  |
| M03-02 境界値 |  |  |  |  |  |
| M03-03 デシジョンテーブル |  |  |  |  |  |
| M03-04 状態遷移 |  |  |  |  |  |

## CoverageとCase

- TR→TCN→CI→Case→BR/AC対応:
- 期待結果と仕様根拠:
- 実行不能/未決/欠落した参照:

## Runtime証拠

- 固定Skillの実行request: `workspace/M03/condition-runtime-evidence.json` / `workspace/M03/case-runtime-evidence.json`
- `artifact_markdown`と現在の提出artifactの一致、および`course:assess M04`による再検証:
- condition_structure(direct)結果:
- 技法runtime結果:
- materialize_coverage(artifact)結果:
- case_structure結果:
- verify_runtime_evidence valid:
- artifact一覧とrevision:

## 意味上のレビュー

- 不正/不足/別解を確認した根拠:
- 未実行またはBLOCKEDの理由:

## 理解ノード別の確認記録

| 理解ノード | 本人の判断・操作 | 証拠パス／Run | 未確認・要復習 |
| --- | --- | --- | --- |
| K-M03-06 | 未記入 | 未記入 | 未確認 |
| K-M03-07 | 未記入 | 未記入 | 未確認 |
| K-M03-08 | 未記入 | 未記入 | 未確認 |


## 反復実践 P01〜P06 の記録

この欄は演習の転記ではなく、**本人の予測・実操作/実判断・観測・再確認**を記録する場所です。結果が未確認なら「未確認」、実行できなければ「未実行/BLOCKED」と理由を書いてください。実行していない内容を成功と報告しません。

<!-- prettier-ignore -->
| 課題 | 提出すべき具体的な証拠 | 予測・判断と根拠 | 本人の操作・AI/Skill案の採否 | 実結果・証拠（Run/SHA/パス）・修正/未決 |
| --- | --- | --- | --- | --- |
| P01 | Cart再検証4状態の同値クラスとCase | 未記入 | 未記入 | 未確認 |
| P02 | 2種類の仮想上限×3境界・Seedの不足 | 未記入 | 未記入 | 未確認 |
| P03 | 価格変更×在庫切れ4ルールと未決の順序 | 未記入 | 未記入 | 未確認 |
| P04 | 数量1→2→拒否→0の状態遷移表 | 未記入 | 未記入 | 未確認 |
| P05 | 新条件2件の技法採否・Case根拠 | 未記入 | 未記入 | 未確認 |
| P06 | 2件の固定Skill検証と一時的な負例 | 未記入 | 未記入 | 未確認 |

必要な証拠は関連する既存の必須提出物にも反映し、同じ内容を二重に作らないでください。学習用の架空データ・合成ログ・AI自己申告と、実行したspec/Runを区別してください。
