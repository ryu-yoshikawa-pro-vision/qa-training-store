# M06 実技：3つのCart CaseをE2Eにする

## 入力

`workspace/M06/cart-cases.spec.ts`には、通常追加、購入上限超過の拒否と数量保持、low-stockの在庫境界を確認する固定3 Caseがあります。開始時に`workspace/M03/cases.md`、`workspace/M04/review.md`と必要な提出記録の有無・revisionを確認してください。本人のPhase 1 Caseがある場合は、固定Caseと同じ検証責務か、条件・期待結果が異なるかをCase IDとBR/ACで記録します。本人Caseがない、またはM06への入力契約に合わない場合は、`inputs/M06/start.md`と公開未完成specを使い、配布元revisionを記録します。公開fallbackはM06の独立実習を可能にしますが、Phase 1本人成果物や修了の証拠にはなりません。M03/M04成果物の自動コピー、修復、上書きはしません。

固定CaseのIDごとにLocator、Action、業務Assertionを自分で選び、TODOを実装して実行します。条件が異なる本人Caseを同じCaseだと記録せず、本人Caseを全件自動実装する追加課題も必須にしません。

## 手順

1. 各testの前にResetを呼び、defaultまたはlow-stockを指定します。
2. 通常追加はカート行と数量を、上限超過は拒否メッセージと変更前数量を確認します。
3. low-stockでは対象variantの在庫3、default datasetから引き継ぐ購入上限5、有効上限3を確認します。実行時のカート数量はReset後に確認し、未確認値を仮定しません。
4. 3回の実行で状態が独立することを確認し、失敗時はRun、Trace、Screenshotを対応付けます。
5. 表示だけのAssertionが業務期待を証明するかレビューします。

## 提出物

`workspace/M06/submission.md` と本人が編集したspec、実行証拠。各テストを入力元・revision・Case ID・BR/AC・Role/State/Data・spec/test・期待結果・業務Assertion・Seed/Reset・Runまで追跡できるようにします。本人Caseと固定Caseが一致しない場合は差と非対応理由を記録し、fallback使用時はPhase 1修了を主張しません。
