# M07 診断素材

## A：誤ったAssertion（実行可能）

`failure-assertion.spec.ts` は画面に存在しない見出しを期待します。実際のテスト失敗として実行し、Traceとエラーメッセージから失敗箇所を特定してください。失敗を成功扱いにするためAssertionを削除してはいけません。

## B：Reset条件の不一致（説明用ログ）

> reset requested scenario=default; observed metadata scenario=low-stock

このログは教材用のシナリオです。製品で実行した証拠ではありません。Reset引数、ブラウザーの再読込、同じRun IDのmetadataを追加確認する計画を示してください。

## C：遅延仮説（説明用ログ）

> locator resolved; expected cart quantity=2; received=1; retry changed result

Retryだけではflakyと確定できません。Reset後の初期数量、連続Run、Trace時刻、アプリの応答を比べ、テスト・製品・環境どの仮説が残るか記録してください。

## 記録

各素材に原因候補、追加証拠、最小の安全な次の操作、まだ分からない点を書きます。Aの修正前後は独立したRunとして保存してください。
