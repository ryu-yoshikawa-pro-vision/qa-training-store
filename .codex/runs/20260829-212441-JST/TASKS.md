# Tasks

## Now

- [x] 1. Plan、Run、ADR、PROJECT_CONTEXT、対象Workflow、既存contract testを確認しsafe change surfaceを確定する。
- [x] 2. 2つのAndroid Release Gradle commandへ同一JVM argsを追加する。
- [x] 3. 既存contract testの `expectInOrder()` で2jobのcommand順序を固定する。
- [x] 4. diffと対象外ファイルを確認する。
- [x] 5. Plan記載のローカルvalidationをすべて実行する。
- [x] 6. PR #83のRemote CI確認可否と残課題を記録し、Runを完了する。

## Discovered

- D1. `lint:markdown`で既存PlanのMD029を検出したため、Planの意味を変えないコードブロックインデントだけを修正し、関連validationを再実行した。
- D2. PR #83のRemote CIでは、Android 2jobはPASSした一方、既知のExpo dependency mismatchによる`Native Static` failureと、別系統のcontract test timeoutによるWeb CI failureを確認した。PlanのNon-goal／Stop conditionsに従い追加修正は行わない。

## Blocked
