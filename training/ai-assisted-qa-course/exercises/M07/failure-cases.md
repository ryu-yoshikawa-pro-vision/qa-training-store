# M07 診断素材

## A：誤ったAssertion（実行可能）

`failure-assertion.spec.ts` は画面に存在しない見出しを期待します。実際のテスト失敗として実行し、Traceとエラーメッセージから失敗箇所を特定してください。失敗を成功扱いにするためAssertionを削除してはいけません。

## B：Reset条件の不一致（説明用ログ）

> reset requested scenario=default; observed metadata scenario=low-stock

このログは教材用のシナリオです。製品で実行した証拠ではありません。Reset引数、ブラウザーの再読込、同じRun IDのmetadataを追加確認する計画を示してください。

## C：遅延仮説（説明用ログ）

> locator resolved; expected cart quantity=2; received=1; retry changed result

Retryだけではflakyと確定できません。Reset後の初期数量、連続Run、Trace時刻、アプリの応答を比べ、テスト・製品・環境どの仮説が残るか記録してください。

## 分類前に照合する仕様・初期状態・ログ

原因分類は診断の**結論候補**であり、PlaywrightのFAILや1回のRetry成功だけでは確定しません。A〜Cについて、先に以下の資料と観測を対応させてください。

| 仮説 | 最初に照合するもの | 根拠にならないもの・必要な追加確認 |
| --- | --- | --- |
| **Test**（Locator/Assertion/Setup） | 実行したspecの最初の失敗行と、`docs/spec/features/cart.md`のBR/AC、`resetScenario`の引数 | 実画面を見ずに「製品バグ」と決めない。対象画面でのRole/Name、一意性、期待数量と実行順序を照合する |
| **Product**（業務実装） | 正式BR/ACと一致する事前状態・操作、画面で観測した数量/明細、Traceの通信・Console | Assertionの期待値だけでは製品の不具合と確定できない。前提が揃った独立Runでも同じ不一致かを確認する |
| **Environment**（起動/配布/Reset） | 配布元`source_sha`、8082/Browser起動、Reset結果、test API metadata | 接続失敗やReset未成立をCartの業務FAILに換算しない。Reset実装はmetadataのscenario一致を検証するが、それだけで全データの正しさは保証しない |
| **Flaky**（条件下で結果変動） | 同じspec SHAと開始状態の別Run、失敗/成功の時刻・Trace・通信、前テストの残存状態 | RetryでPASSしただけではFlakyと確定しない。Reset漏れ、テスト自身の競合、製品応答・環境負荷を切り分ける |

診断Aは**実行する前は結果が未確認**です。診断B/Cは合成ログであり、実装中のScenario Shopがこの状態になった証拠ではありません。Bで`default`を要求して`low-stock`を観測したと仮定する場合も、`training/playwright/support/reset-scenario.ts`のReset検査・シナリオ定義・同一Runのmetadataを見なければ原因を絞れません。Cでは初回失敗とRetry成功をそれぞれ区別し、Traceにないネットワーク状態や製品コードの動作を推測で補いません。

## 記録

各素材に原因候補、追加証拠、最小の安全な次の操作、まだ分からない点を書きます。Aは診断素材として変更せず、独立した`main` RunでAssertion失敗を記録してください。修正対象の`repaired-assertion.spec.ts`は配布直後のTODOエラーを`before` Runで記録し、業務Assertionの実装後に`after` Runを別途取得します。Aの失敗と修正対象のbefore/afterを同一Runとして扱わないでください。
