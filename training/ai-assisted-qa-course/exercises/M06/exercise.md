# M06 実技：3つのCart CaseをE2Eにする

## 入力

`workspace/M06/cart-cases.spec.ts`には、通常追加、購入上限超過の拒否と数量保持、low-stockの在庫境界を確認する3つの未完成Caseがあります。Case IDごとにLocator、Action、業務Assertionを自分で選び、TODOを実装して実行します。

## 手順

1. 各testの前にResetを呼び、defaultまたはlow-stockを指定します。
2. 通常追加はカート行と数量を、上限超過は拒否メッセージと変更前数量を確認します。
3. low-stockでは対象variantの在庫3と数量上限を確認し、Seedが保証しない値は仮定しません。
4. 3回の実行で状態が独立することを確認し、失敗時はRun、Trace、Screenshotを対応付けます。
5. 表示だけのAssertionが業務期待を証明するかレビューします。

## 提出物

`workspace/M06/submission.md` と本人が編集したspec、実行証拠。元のCase IDから期待結果まで追跡できるようにします。
