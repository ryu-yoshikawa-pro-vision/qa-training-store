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

## 反復実践 P01〜P06：異なる失敗と保守判断

既存のbefore/after RunとPage Object/fixture演習を維持します。実在するRunと教材用の合成ログは必ず区別してください。

1. **P01** 誤Assertionの失敗Runを取得し、Trace・期待結果・仕様ID・最小修正・別Runを示す（M07-01〜04）。
2. **P02** `failure-cases.md`のReset条件不一致について、必要なReset引数・scenario metadata・同一Run内の追加証拠を順序付きで調べる。合成ログを実行結果として提出しない（M07-01・02）。
3. **P03** Retryで結果が変わる合成例について、Test/Product/Environment/Flakyの競合仮説を作り、どのRun・Trace・アプリ応答で区別するか記録する（M07-01〜03）。
4. **P04** `maintenance.spec.ts`の2 testから重複操作を小さいPage Objectに、テストごとのResetを標準fixtureに移し、数量1・2の業務Assertionを保持する（M07-04・05）。
5. **P05** 共有コードが1箇所だけの別例と、複数testで共通のLocatorが変わった例を比較し、抽象化の採否・費用・変更範囲を理由付きで決める（M07-05）。
6. **P06** 保守のbefore/after別Runを実行し、テスト順序や再実行で状態が残らないか確認する。設計の変更ではない場合と仕様期待を変えた場合を区別する（M07-02・04・05）。

`diagnosis.md`へ仮説・次に取得する証拠・変更前後のRun・残課題を記載します。実環境で再現できない失敗は、実行不能/合成資料による分析と明示します。
