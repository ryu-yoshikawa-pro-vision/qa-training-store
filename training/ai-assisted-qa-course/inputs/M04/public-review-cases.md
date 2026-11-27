# M04 公開レビュー入力：カート数量上限

このファイルはM04でレビューする公開入力です。M04のレビュー回答、採点資料、完成したM04提出物ではありません。候補の採否は学習者が正式仕様を確認して判断します。

## 承認済みの入力Case

### CASE-CART-BASE-01

- Role: guest
- State: `default`
- Data: `variant-basic-shirt-01`。default Seedの在庫は20、購入上限は5。操作前の同一SKU合計数量は2。
- 操作: 同一SKUの数量を6へ変更する。
- 期待結果: 上限超過の操作全体を拒否し、自動補正せず、操作前の数量2を維持する。
- 観測: 数量変更の結果と、カートに残る同一SKUの数量。
- 仕様根拠: `docs/spec/features/cart.md` の `BR-CART-001` と `AC-CART-001`。

このCaseはM03相当の承認済み入力です。M04で作成するレビュー・自動化判断・提出物の完成例を意味しません。

## 未レビュー候補

### CASE-CART-CANDIDATE-01

- Role: guest
- State: `default`
- Data: `variant-basic-shirt-01`。在庫20、購入上限5。操作前数量2。
- 操作: 同一SKUの数量を6へ変更する。
- 提案された期待結果: 数量を上限5へ丸めて更新する。
- 観測候補: 更新後の数量。
- 提案の根拠欄: 未記入。

### CASE-CART-CANDIDATE-02A / CASE-CART-CANDIDATE-02B

両候補とも次の内容です。ID以外に条件・操作・期待結果の違いはありません。

- Role: guest
- State: `default`
- Data: `variant-basic-shirt-01`。在庫20、購入上限5。操作前数量1。
- 操作: 同一SKUの数量を2へ変更する。
- 期待結果: 数量2で変更が完了する。
- 観測候補: 更新後の数量。
- 仕様根拠: `BR-CART-001`。

### CASE-CART-CANDIDATE-03

- Role: guest
- State: `default`
- Data: `variant-basic-shirt-01`。在庫20、購入上限5。**操作前数量は記載されていません。**
- 操作: 同一SKUの数量を6へ変更する。
- 期待結果候補: 上限超過を拒否し、操作前の数量を維持する。
- 観測候補: 更新後の数量。
- 未確認事項欄: 未記入。

この候補では、操作前数量を推測して補わず、ACが求める「変更前の数量が維持されたこと」をどのように検証できるかをレビューしてください。
