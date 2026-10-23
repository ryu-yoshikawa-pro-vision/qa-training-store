# M02 開始サンプル：数量上限の分析

正式仕様 `docs/spec/features/cart.md` の `BR-CART-001` と `AC-CART-001` を読みます。上限は在庫、購入上限、99の最小値です。上限超過は拒否し、変更前数量を維持します。

`low-stock` Seedはdefault datasetから作られ、variant `variant-basic-shirt-02` の在庫を3へ上書きします。同variantの購入上限5はdefault datasetから引き継がれるため、この条件での有効上限は`min(3, 5, 99) = 3`です。シナリオ開始sessionはguestです。実行時のカート数量は在庫値から推測せず、Reset後に確認します。Role、開始State、Data、Journey、Risk、仕様ID、観測方法、未決事項を分けて記録してください。

この分析範囲の参照は`SCOPE-001`とし、「low-stock時のvariant `variant-basic-shirt-02`の数量上限と、超過拒否後の数量維持」を指します。参照の意味、仕様出典、実際に読んだrepository SHAを提出物に記録します。`SCOPE-001`はScope Entityではなく、この分析成果物内の範囲参照です。
