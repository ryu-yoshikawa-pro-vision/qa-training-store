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

## 反復実践：新しいCaseを実際に追加・実行する（P01〜P06）

既存の**固定3 Caseと削除Case**を先に完了します。P01〜P06はその再掲ではなく、業務Assertionを変える判断と**追加の別test**を含みます。編集するspecは`workspace/M06/new-case.spec.ts`、観測の記録は`submission.md`です。Resetはtestごとに行い、既定の`course:run`から追加testも実行します。

1. **P01 新しい数量変更Caseを作る（M06-01〜03）**：固定3件が終わったら、`BR-CART-001`の別責務として**`CASE-CART-005: 追加済みのマグを数量1から2に更新する`**を新規testとして`new-case.spec.ts`に実装します。`default`のReset→マグを1点追加→Cartで数量1を確認→数量2を選択→Cartで数量2を確認します。**証拠**：Case ID、初期状態、本人が選んだLocator/Action/Assertion、最初の失敗があればその結果。
2. **P02 数量更新と削除の違いを確かめる（M06-01・03）**：既存CASE-CART-004は削除ボタン、P01は数量selectによる更新です。`cart-page.tsx`では数量selectが1以上であることを読み、**Web UIから数量0へ変更できるというE2Eは作りません**。`BR-CART-001`の数量0削除規則を確認できる層・呼出経路と、UIで検証済みと言えない範囲を記録します。**証拠**：仕様/コード出典、2つの操作経路、どの層のどのCaseが不足するか。
3. **P03 有効上限の見える範囲を調べる（M06-03）**：`default`のマグと`low-stock`のシャツMについて、商品詳細の購入上限表示・数量選択肢・カート側の数量選択肢を実画面で比較します。「選択肢がない」ことと「APIが拒否して数量を保持する」ことを別のAssertionに分け、必要なら**新しいtest**を追加します。**証拠**：2状態の観測、各Assertionの証明範囲。
4. **P04 Reset/Contextの独立性を試す（M06-02・04）**：P01の数量2を確認した後、CASE-CART-004を続けて実行する場合と、逆順に実行する場合で、各testの開始時状態をどのように保証するか説明します。テスト順序・前のCart状態に依存するコードを見つけたら自分で修正します。**証拠**：Reset位置、独立している根拠、少なくとも1回の再実行結果。
5. **P05 M04の本人CaseをE2Eへ転用（M06-01・05）**：M04で承認したCaseがUI/Seedで実行可能なら、固定3件・削除・数量変更と**異なる条件**をもう1 testとして追加します。例えば在庫違い・別Roleなどのうち、仕様・Reset・観測が確認できたもののみ採用します。M04成果物がない、または実行不能なら公開fallbackを使い、**既知の数量1→2 Caseが代替の実技入力**である旨を明示します。未実行を実施済みにしません。**証拠**：元Case、採否、本人実装かfallbackか、実行可能性。
6. **P06 増やしたtestを再実行して証拠を照合（M06-02・04・05）**：`pnpm course:run M06 new-case.spec.ts --label initial`と`--label repeat`を実行します。**CASE-CART-004とCASE-CART-005の2件以上**が両RunでPASSし、spec SHA・配布SHA・Run ID・report内の実行test数が一致することを確認します。追加Caseの失敗はAssertionを削って隠さず原因・修正・再実行を記録します。

**完了条件**：固定3件とは別に新規の数量変更Caseを実装し、CASE-CART-004と005を独立に実行した証拠が必要です。P05で実行可能な本人Caseがある場合はそれも実装し、実行不能なら理由と代替を示します。数量0を選択できない現行UIへ存在しない操作を強要しません。
