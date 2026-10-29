# M07 実技：失敗原因を証拠で分ける

## 入力

`failure-cases.md`のAは意図的に誤ったAssertionを持つ実行可能なspecです。BはReset metadataの違いを表す説明用ログ、Cは待ち時間の仮説です。B/Cを実アプリで観測済みの事実として扱いません。

## 手順

1. Aの`workspace/M07/repaired-assertion.spec.ts`を修正前に実行し、失敗したAssertionとTraceを確認します。失敗Runも証拠として保存されます。

   ```bash
   pnpm course:run M07 repaired-assertion.spec.ts --label before
   ```

2. 修正案が期待結果を弱めないか、仕様と照合して一つだけ直し、別Runで成功を確認します。

   ```bash
   pnpm course:run M07 repaired-assertion.spec.ts --label after
   ```

3. B/CではTest、Product、Environment、Flakyの仮説を列挙し、追加で必要な証拠を示します。
4. RetryやTimeout延長を原因修正と呼ばず、Trace、Screenshot、ログが示す範囲と限界を記録します。
5. `workspace/M07/maintenance.spec.ts`の2件を単独実行し、変更前Runを記録します。両testのResetと「マグ追加→カート表示」の重複を探します。
6. テストごとのResetをPlaywright標準fixtureへ移し、重複する画面操作を小さなPage Objectへまとめます。追加ボタンのLocatorには完全一致を指定し、変更箇所を1か所に集めます。数量1・数量2のAssertionは各testに残し、仕様の確認を弱めません。
7. 同じ2件を別Runで実行し、修正前後のspec・コマンド・結果を記録します。1件だけの操作で抽象化が不要な別例も挙げ、採用しない理由を説明します。失敗時はReset、Locator、AssertionとTraceを確認し、結果を推測しません。

変更前にCodespacesのターミナルで次を実行し、2件の結果を記録します。

```bash
pnpm course:run M07 maintenance.spec.ts --label before
```

Page Objectとfixtureを実装した後、次のコマンドを実行します。出力先を分け、変更前の結果を上書きせず、両Runで2件がそれぞれPASSしたことを確認します。

```bash
pnpm course:run M07 maintenance.spec.ts --label after
```

`course:run`は検証済み配布manifestの`source_sha`と実行specの`spec_sha256`を含むreceipt、spec snapshot、JSON reportとattachmentを一意のRun directoryに保存します。再挑戦しても前の結果は上書きされません。`course:assess M07`は同じ配布`source_sha`に属し、修正前後で異なるspec SHAを持つ別Runを照合します。

## 提出物

`workspace/M07/diagnosis.md`に診断と保守演習のbefore/afterの別Run ID、証拠、原因、差分、未解決事項を記録します。編集した`workspace/M07/maintenance.spec.ts`も提出します。

## 理解ノード別の確認

既存の演習と提出物を利用して、次の能力を別々に確認してください。本人が実行していない操作を完了と報告せず、未確認を明示します。

- **K-M07-06**：画面操作をPage Objectへまとめ、仕様Assertionの責務を保持して別Runで検証できる
- **K-M07-07**：fixtureのスコープを理解し、各テスト前Resetとテスト間独立性を確認できる

## 反復実践：実失敗から原因を探し、保守変更を比較する（P01〜P06）

従来のAssertion失敗1件、説明用ログB/C、POM/fixture実装の手順を終えた後に、違う条件で診断力を確認します。失敗を作るのは**自分の学習用specだけ**で、製品コードや共通Config、他の受講者データを壊しません。診断で使ったTrace・spec SHA・期待結果・変更差分は`diagnosis.md`へ記録します。

1. **P01 Testと環境を分離する（M07-01・02）**：教材の実Run Aを使い、原因候補を「Assertionの期待」「Locatorの特定」「Reset/データ」「Browser/起動」の4つに分けます。最初の失敗行・実画面・仕様を根拠に、**調べる順序と一つずつ除外した事実**を記録します。**証拠**：少なくとも2つの候補の採否根拠と最小修正箇所。
2. **P02 Resetを変えた場合の診断計画（M07-01・02）**：`failure-cases.md`の合成Bについて、`default`と`low-stock`の違いを実際のSeed資料へ照合します。架空のログで最初に観測した値を抽出し、もし自分のspecでReset引数を誤ったら**どのmetadata・開始状態・業務Assertionで検知するか**を整理します。Bを再現済みと報告しません。**証拠**：仕様・Seed・追加取得する証拠の対応表。
3. **P03 Retry成功を原因修正と呼ばない（M07-01〜03）**：合成Cの初回失敗・Retry成功を読み、「遅延」「不安定なLocator」「前テストの残状態」の3仮説を立てます。それぞれを反証するためのTrace・Run順序・ネットワーク結果を指定し、根拠なくTimeoutを増やす提案を棄却します。**証拠**：仮説ごとの観測条件と結論保留の理由。
4. **P04 保守変更で業務Assertionを維持（M07-04・05）**：既存の2 testのPage Object/fixture化後、数量1と数量2のAssertionを**別testに維持したまま**、Locator変更の仮想要求「カート追加ボタンのaccessible nameが変わる」を当てます。変更前後で触るファイル・test・assertionの数を比較し、実在しない新しいラベルで実装を壊さず説明します。**証拠**：変更影響表、選んだ抽象化の責務。
5. **P05 新しい回帰条件を自分で追加（M07-04・05）**：既存2件とは異なる**「マグを追加→数量2へ変更→再度Cartを開いて数量2を確認」**という3番目のtestを、保守変更後の`maintenance.spec.ts`へ追加します。各testが個別のResetを使うこと、Page Objectに業務Assertionを隠さないことを確認します。**証拠**：新しいtest・期待結果・変更前後の責務・実Run。
6. **P06 再実行と変更の範囲を確かめる（M07-02・04・05）**：従来の2件のbefore Runを保全し、変更後の`pnpm course:run M07 maintenance.spec.ts --label after`では**3件以上PASS**することを確認します。条件・順番を変えてもResetが独立する理由を説明します。Run/Traceがなければ未検証、実Runで失敗が残ればそのまま報告します。**証拠**：before/afterのRun ID、件数、spec SHA、失敗診断、残る制約。

**完了条件**：P05は説明だけでなく新しいtestのコードと実行結果を提出します。P02/P03の合成ログは診断計画であり、再現性を実証した結果ではありません。
