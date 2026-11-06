# M03 開始サンプル：検証責務と設計入力

参照仕様はCartの `BR-CART-001` / `AC-CART-001` です。M02本人のlow-stock分析とは別の公開開始サンプルとして、`default`のvariant `variant-basic-shirt-01`を使います。Seed正本では在庫20、購入上限5なので有効上限は5です。実行時のsession・カート数量はReset後に確認します。既存リスク資料は`TARGET-CART-001` / `RISK-CART-001`です。検証責務本文、状態、優先度、期待条件、未決事項を人が読める形で確認します。

## この公開サンプルのRiskとScope

- Risk台帳の公開行は同梱の`public-risk-input.csv`です。これは`training/workbook/01_target-risk.csv`の`RISK-CART-001`行をこの開始サンプル用に切り出したものです。Impactは「高」、Likelihoodは「中」、優先度は「高」。Likelihoodは実測値ではなく比較上の評価です。
- この演習でrisk_matrixへ渡す数値対応はImpact `4` / Likelihood `2`、schemeは`risk-scheme-v1`です。これは既存の公開M02例と同じ比較入力であり、計算されたRisk level「高」と数値対応の意味判断を混同しません。
- Scope参照は`SCOPE-101`です。「default時のvariant-basic-shirt-01について、在庫20・購入上限5に対するBR-CART-001の上限判定と、AC-CART-001の超過拒否・変更前数量維持」を指します。`SCOPE-101`は独立したMachine Entityではありません。
- Riskの出典は`training/workbook/01_target-risk.csv`（同梱行は同じsource SHAにpinした公開sample）、Scopeと期待結果の出典は`docs/spec/features/cart.md`およびdefault Seedです。同期元SHAはcourse distributionのsource SHAで固定します。
- 数量5・6の設計例は条件の説明に使えますが、Reset後にカートへ入っている数量は未確定です。実行前に状態を確認し、超過拒否時は既知の数量をセットアップしてから不変条件を観測します。

固定Skill revisionは `7cc6cba7772de549841a39d71694cbafbc783324` です。BR/ACとAuthority Entityは別の識別子です。Authority Entityは固定Skillの`authority_entities.py`で、正式仕様から正規化した意味情報をMachine Entityへ変換して生成します。Product Risk Entityは実際のRisk入力、`risk_matrix`の実行結果、current Authority Entityを`analysis_entities.py`で結合して生成します。実行時はhelper/runtimeが出力した参照とfingerprintを記録してください。

Scopeは独立したMachine Entityではなく、`condition_structure.py`が形式を検査する`SCOPE-...`参照です。この公開サンプルでは`SCOPE-101`を「default時の同一SKU合計数量。対象variantの在庫20・購入上限5に対するBR-CART-001の上限判定と、AC-CART-001の超過拒否・変更前数量維持」と定義します。提出記録にはこの参照の意味、仕様ファイル、実際に読んだrepository SHAを残します。`TARGET-CART-001`はリスク台帳の対象IDでありScope参照ではありません。

実行は `condition_structure(direct)`、選択技法runtime、`materialize_coverage(artifact)`、適切なmodeのCase生成、`verify_runtime_evidence`へ進みます。欠落した参照を補って成功扱いにしたり、終了コード0や`ready`だけで統合PASSにしたりしてはいけません。

## 固定Authority helperに渡す入力（未実行の準備例）

以下は正式仕様`docs/spec/features/cart.md`の`BR-CART-001` / `AC-CART-001`から作る**入力候補**です。固定Skillで生成済みのEntity、実行ログ、本人の提出済み成果物ではありません。実際に読んだ仕様と`.course/distribution-manifest.json`の`source_sha`を照合してから、`workspace/M03/authority-input.json`へ保存します。出典が一致しなければ使用せずBLOCKEDにします。

```json
{
  "authorities": [
    {
      "authority_id": "AUTH-CART-BR001",
      "authority_type": "business_rule",
      "active_content": {
        "spec_id": "BR-CART-001",
        "rule": "同一SKU合計数量の上限は在庫・購入上限・99の最小値。超過操作は自動補正せず全体を拒否し、変更前数量を維持する。数量0は明細を削除する。"
      },
      "scope": "SCOPE-101",
      "source_refs": ["docs/spec/features/cart.md#BR-CART-001"],
      "relations": [],
      "related_authority_refs": []
    },
    {
      "authority_id": "AUTH-CART-AC001",
      "authority_type": "acceptance_criterion",
      "active_content": {
        "spec_id": "AC-CART-001",
        "criterion": "在庫・購入上限・99の境界を超えた指定は拒否され、現在数量が維持されること。"
      },
      "scope": "SCOPE-101",
      "source_refs": ["docs/spec/features/cart.md#AC-CART-001"],
      "relations": [],
      "related_authority_refs": ["AUTH-CART-BR001"]
    }
  ]
}
```

`authority_entities.py`の入力はこの`authorities`形式であり、出力Entityの`content_fingerprint`はhelperが計算します。fingerprintを本人やAIが手入力してはいけません。Python 3.11と固定Skillの実体を確認し、次のコマンドを本人が実行した場合に限りその結果を提出します。

```bash
python3 .agents/skills/spec-analysis/scripts/authority_entities.py < workspace/M03/authority-input.json > workspace/M03/authority-output.json
```

このhelperは`spec-analysis`による仕様の意味分析や、`test-analysis`の`risk_matrix`・`analysis_entities`実行を代行しません。両者のRisk参照は`RISK-CART-001`、数値入力はImpact 4、Likelihood 2、採用済みschemeは`risk-scheme-v1`です。リスクマトリクスの結果と生成したProduct Risk Entityを照合してから、`SCOPE-101`の意味・出典・source SHAとともにM03へ渡してください。実行できない場合は、出力Entityを推測で作成せず未実行と記録します。
