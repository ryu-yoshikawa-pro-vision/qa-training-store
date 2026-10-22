# M03 開始サンプル：検証責務と設計入力

参照仕様はCartの `BR-CART-001` / `AC-CART-001`、対象variantはM02の別条件サンプルです。検証責務本文、状態、優先度、期待条件、未決事項を人が読める形で確認します。

固定Skill revisionは `7cc6cba7772de549841a39d71694cbafbc783324` です。Skill実行では、実在するAuthority、Product Risk、Scopeとrevisionを照合してから `condition_structure(direct)`、選択技法、`materialize_coverage(artifact)`、Case、`verify_runtime_evidence`へ進みます。IDらしい文字列を作って代用してはいけません。
