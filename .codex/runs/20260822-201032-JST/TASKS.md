# Tasks

## Now

- [x] 1. 必須文書・最新`origin/main`・G1実装経路・Hermes artifactを確認し、実装計画を保存する
- [x] 2. Hermes inspectorとbundle path CLIを実装し、固定`hermes-compiler`依存を追加する
- [x] 3. Native CIをActual APK artifact download／extract／validator再利用へ接続し、重複raw scanを削除する
- [x] 4. Workflow contractとProduction-validation Maestro contractを更新する
- [x] 5. Positive／negative／swapped control、実Production Hermes artifact、focused repository gatesを検証する
- [ ] 6. Run Artifactを更新・sanitizeし、差分確認後にnormal commit／push可否を判断する

## Discovered

- D1／D2は下記Blockedへ移管した。StandaloneのActual Production Hermes outputとWorkflowのActual APK artifact接続は確認済みだが、追加のLocal APK／Remote Runは外部実行条件に依存する。

## Blocked

- B1. ローカルProduction `assembleRelease`は`react-native-reanimated`の`build.ninja still dirty after 100 tries`で停止。実装方式はExpo Production Hermes artifactで検証継続し、同じ条件の再試行はしない。
- B2. Local Gradle Production APKは上流CMake/Ninja failureのため取得できず、APK内HBCのLocal inspectionとMaestro実Runtimeは未実行。
- B3. 修正HeadのRemote Native CI／`native-ci / verify`はこのRunではdispatchしておらず、Remote artifact／Maestro結果は未取得。
