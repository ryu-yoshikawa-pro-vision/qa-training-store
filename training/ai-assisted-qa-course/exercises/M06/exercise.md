# M06 実技：3つのCart CaseをE2Eにする

## 入力

`workspace/M06/cart-cases.spec.ts`には、通常追加、購入上限超過の拒否と数量保持、low-stockの在庫境界を確認する固定3 Caseがあります。開始時に`workspace/M03/cases.md`、`workspace/M04/review.md`と必要な提出記録の有無・revisionを確認してください。本人のPhase 1 Caseがある場合は、固定Caseと同じ検証責務か、条件・期待結果が異なるかをCase IDとBR/ACで記録します。本人Caseがない、またはM06への入力契約に合わない場合は、`inputs/M06/start.md`と公開未完成specを使い、配布元revisionを記録します。公開fallbackはM06の独立実習を可能にしますが、Phase 1本人成果物や修了の証拠にはなりません。M03/M04成果物の自動コピー、修復、上書きはしません。

固定CaseのIDごとにLocator、Action、業務Assertionを自分で選び、TODOを実装して実行します。さらに、固定3件とは異なる削除Caseを`workspace/M06/new-case.spec.ts`で構成します。条件が異なる本人Caseを同じCaseだと記録せず、本人Caseを全件自動実装することは要求しません。

## 手順

1. 各testの前にResetを呼び、defaultまたはlow-stockを指定します。
2. 通常追加はカート行と数量を、上限超過は拒否メッセージと変更前数量を確認します。
3. low-stockでは対象variantの在庫3、default datasetから引き継ぐ購入上限5、有効上限3を確認します。実行時のカート数量はReset後に確認し、未確認値を仮定しません。
4. 次のコマンドで固定3 Caseを実行します。3件が個別に成功したことを確認し、失敗時はRun、Trace、Screenshotを対応付けます。

   ```bash
   pnpm course:run M06 cart-cases.spec.ts --label main
   ```

5. 表示だけのAssertionが業務期待を証明するかレビューします。
6. 別Case `CASE-CART-004`：defaultをResetし、ゲストとしてマグを1点追加し、カートの明細を削除します。削除前に対象商品と数量1を確認し、削除後は対象明細がなく、カートが空であることを確認します。Cart仕様の機能範囲と`empty`画面状態を読み、画面操作と期待結果を対応させます。`BR-CART-001`の数量0の規則と、画面の削除ボタンによる操作を同じ実行だと決めつけません。
7. `new-case.spec.ts`のTODOを自分で実装し、次のコマンドで単独実行と再実行を行います。出力先を分けることで前のRunの結果を上書きしません。Resetと各Runの結果・対象specを対応付けます。失敗時は最初のエラー、サーバー、Reset、LocatorとAssertionを順に確認し、期待を弱めず修正します。

   ```bash
   pnpm course:run M06 new-case.spec.ts --label initial
   pnpm course:run M06 new-case.spec.ts --label repeat
   ```

   `course:run`は毎回異なる`run_id`と出力先を使い、検証済み配布manifestの`source_sha`と実行したspecの`spec_sha256`をreceiptに記録します。再挑戦する場合も以前の結果を保全し、実行時の両SHA・結果を記録します。実行していない内容を補いません。

## 提出物

`workspace/M06/submission.md`、固定Caseのspec、別Caseの`workspace/M06/new-case.spec.ts`、実行証拠。各テストを入力元・revision・Case ID・BR/AC・Role/State/Data・spec/test・期待結果・業務Assertion・Seed/Reset・Runまで追跡できるようにします。本人Caseと固定Caseが一致しない場合は差と非対応理由を記録し、fallback使用時はPhase 1修了を主張しません。

## 理解ノード別の確認

既存の演習と提出物を利用して、次の能力を別々に確認してください。本人が実行していない操作を完了と報告せず、未確認を明示します。

- **K-M06-06**：別CaseのReset・Action・Locator・業務Assertionを選んで新規specを作成し、単独実行できる
- **K-M06-07**：一意の要素選択・Action成立・仕様上の業務結果を別々に検証できる

## 反復実践 P01〜P06：CaseからE2Eへ

既存の固定3件とCASE-CART-004を維持します。以下の結果・元Case・BR/AC・Runを`submission.md`へ記録してください。新規specは既定の`new-case.spec.ts`へ別testを追加することで、既存の専用`course:run`を利用できます。追加前の実行証拠は保全します。

1. **P01** 固定3 Caseについて、各Reset、Locator、Action、業務Assertion、前後Runを確認する（M06-01〜03）。
2. **P02** CASE-CART-004の削除操作を`new-case.spec.ts`へ自力で実装し、単独・再実行する（M06-01・02）。
3. **P03** BR-CART-001の「数量0なら削除」をCASE-CART-004の削除ボタンと区別し、別testとして追加する。UI操作が対応しなければ実装不能の根拠を記録する（M06-01・03）。
4. **P04** low-stockの上限ちょうどと超過について、操作前数量と拒否後の数量維持を別testまたは追加Assertionで確かめる（M06-01・03）。
5. **P05** M04で承認した本人Caseを1件選び、固定Caseとの差、必要なTest Data、Reset、Locator、業務Assertionを説明して`new-case.spec.ts`へ追加する。前工程がない場合は公開fallbackから同等の別条件を選び、前工程修了を主張しない（M06-01・05）。
6. **P06** 追加後の`new-case.spec.ts`を`--label initial`と`--label repeat`で再実行し、全testの結果・spec SHA・Run ID・失敗修正を照合する（M06-02・04・05）。

P05の入力が現行Shopで実行できない場合は別の承認済みCaseを選び直し、未解決の仕様・データ不足は記録します。実行結果を創作せず、Assertionを弱めてPASSにしないでください。
