# Screen Catalog / Visual Specification Review Flow 修正履歴

2026-08-13のMaestro-MCP段階診断で、Review Flowの失敗をロケータ欠落と誤認せず、スクロール到達時間とIME dismiss raceへ分離した。

`inspect_screen`では、注文詳細の対象要素が`resource-id=native-order-review-order-delivered-item-7`、`class=android.widget.Button`、`clickable=true`として階層に存在することを確認した。先頭から手動スクロールを2回行った後は、同じ`scrollUntilVisible`が成功したため、対象IDやProduct datasetの欠落ではないと判断した。

限定仮説を順に検証し、注文詳細側の`speed: 10`は先頭から7件目へ到達する前に30秒timeoutとなること、`speed: 50`では対象要素まで到達することを確認した。Review入力後は物理端末の日本語IMEが`hideKeyboard`直後も残り、保存ボタンtapが先行するraceを確認した。`waitForAnimationToEnd`後もIMEキーが見える場合だけ`pressKey: Back`を実行する条件付きFlowを追加し、IMEが既に閉じた環境ではBackを送らない契約にした。

Flowの動作変更は`maestro/native-review.yaml`に限定し、assertion削除、固定sleep、Flow skip、Product code変更は行っていない。条件を回帰契約へ固定するため`tests/contracts/native-test-control-maestro.test.ts`も更新した。Maestro-MCPで全Flow 28 commandsをPASSし、標準Native入口でも`native-review` 1/1 PASS（`.artifacts/native-local/20260813-003900-native-review-speed-ime-fix/`）を確認した。

標準入口の初回試行は、共有短縮Alias `C:\q` がmain worktreeを指す安全ガードで停止した。別worktreeは操作せず、現在worktreeの絶対Pathを`RepositoryAlias`に指定して再実行した。Android cleanup後はapp PIDなし、ADB device状態を確認した。`QA_STORE_COORD_DIR`は未設定のためrelease markerは作成していない。

API34／`google_apis`／`x86_64`／`pixel_2` canonical captureは引き続きNative CI manual dispatchが必要であり、checkout processingはProduct Fix別PR後のrebaseline／recaptureが必要である。
