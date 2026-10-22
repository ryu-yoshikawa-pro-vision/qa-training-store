# M02 開始サンプル：数量上限の分析

正式仕様 `docs/spec/features/cart.md` の `BR-CART-001` と `AC-CART-001` を読みます。上限は在庫、購入上限、99の最小値です。上限超過は拒否し、変更前数量を維持します。

`low-stock` Seedではvariant `variant-basic-shirt-02` の在庫が3です。これは購入上限やカート数量を決めません。Role、開始State、Data、Journey、Risk、仕様ID、観測方法、未決事項を分けて記録します。根拠のない値は補わないでください。
