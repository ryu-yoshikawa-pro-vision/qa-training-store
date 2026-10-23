# M03 開始サンプル：検証責務と設計入力

参照仕様はCartの `BR-CART-001` / `AC-CART-001` です。M02本人のlow-stock分析とは別の公開開始サンプルとして、`default`のvariant `variant-basic-shirt-01`を使います。Seed正本では在庫20、購入上限5なので有効上限は5です。実行時のsession・カート数量はReset後に確認します。既存リスク資料は`TARGET-CART-001` / `RISK-CART-001`です。検証責務本文、状態、優先度、期待条件、未決事項を人が読める形で確認します。

固定Skill revisionは `7cc6cba7772de549841a39d71694cbafbc783324` です。BR/ACとAuthority Entityは別の識別子です。Authority Entityは固定Skillの`authority_entities.py`で、正式仕様から正規化した意味情報をMachine Entityへ変換して生成します。Product Risk Entityは実際のRisk入力、`risk_matrix`の実行結果、current Authority Entityを`analysis_entities.py`で結合して生成します。実行時はhelper/runtimeが出力した参照とfingerprintを記録してください。

Scopeは独立したMachine Entityではなく、`condition_structure.py`が形式を検査する`SCOPE-...`参照です。この公開サンプルでは`SCOPE-101`を「default時の同一SKU合計数量。対象variantの在庫20・購入上限5に対するBR-CART-001の上限判定と、AC-CART-001の超過拒否・変更前数量維持」と定義します。提出記録にはこの参照の意味、仕様ファイル、実際に読んだrepository SHAを残します。`TARGET-CART-001`はリスク台帳の対象IDでありScope参照ではありません。

実行は `condition_structure(direct)`、選択技法runtime、`materialize_coverage(artifact)`、適切なmodeのCase生成、`verify_runtime_evidence`へ進みます。欠落した参照を補って成功扱いにしたり、終了コード0や`ready`だけで統合PASSにしたりしてはいけません。
