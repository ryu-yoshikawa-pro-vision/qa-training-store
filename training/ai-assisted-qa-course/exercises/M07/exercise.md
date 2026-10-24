# M07 実技：失敗原因を証拠で分ける

## 入力

`failure-cases.md`のAは意図的に誤ったAssertionを持つ実行可能なspecです。BはReset metadataの違いを表す説明用ログ、Cは待ち時間の仮説です。B/Cを実アプリで観測済みの事実として扱いません。

## 手順

1. Aを専用の期待失敗経路で実行し、非ゼロ終了と失敗したAssertionを確認します。
2. 修正案が期待結果を弱めないか、仕様と照合して一つだけ直し、別Runで成功を確認します。
3. B/CではTest、Product、Environment、Flakyの仮説を列挙し、追加で必要な証拠を示します。
4. RetryやTimeout延長を原因修正と呼ばず、Trace、Screenshot、ログが示す範囲と限界を記録します。
5. Helper/POM/Fixtureを追加する場合は、実際の重複と維持コストを説明します。

## 提出物

`workspace/M07/diagnosis.md`にbefore/afterの別Run ID、証拠、原因、修正、未解決事項を記録します。
