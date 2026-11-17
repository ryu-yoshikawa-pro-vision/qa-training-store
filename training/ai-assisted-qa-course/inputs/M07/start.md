# M07 開始サンプル：別々の失敗原因

演習素材には、誤ったAssertion、Reset後scenario metadataの不一致、待ち時間を原因と誤認するログ断片があります。ログ断片は説明用入力であり、Scenario Shopで観測した実行事実ではありません。

各ケースでRun ID、コマンド、stdout/stderr、Traceの有無を対応付けます。未実行は失敗ではありません。Retryや固定Timeoutを先に増やさず、追加確認で原因を区別してください。修正後は別Runとして実行します。
