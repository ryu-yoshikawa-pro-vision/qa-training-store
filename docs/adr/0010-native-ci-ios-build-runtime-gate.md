# ADR-0010: iOS Simulator Native CIのBuild／Runtime正式Gate化

- Status: Accepted
- Date: 2026-08-08
- Approved-by: user `/goal` request for Phase 2後半
- Superseded-by: ADR-0011（2026-08-09）

## Context

Android Native CIはDetect、Static／Production Guard、Build、Runtime／Maestro、final verifyへ責務分離されている。既存iOS Workflowは`workflow_dispatch`のみの一体Jobで、Automation Buildだけを実行しており、Native CIのfinal GateとProduction-validationへ接続されていない。iOSは物理端末や署名ではなく、GitHub-hosted macOS Runner上のSimulatorをPhase 2の正式Runtimeとする。

## Decision

1. `.github/workflows/native-ios-ci.yml`は`workflow_call`と`workflow_dispatch`を提供し、`native_changed`がfalseのときは重いJobをSkipできる。Native CIからは1つのiOS Gateとして呼び出す。
2. iOS Gate内部は`ios-automation-build`、`ios-production-build`、`ios-runtime`、`ios-verify`へ分離する。2つのBuild Jobはそれぞれclean checkout、metadata検査、`expo prebuild`、Pods、workspace／scheme解決、`iphonesimulator` Release、`CODE_SIGNING_ALLOWED=NO`の`xcodebuild`を実行し、Automation／Production-validationの`.app`を固定名でArtifactに保存する。Runtimeは成功したArtifactをInstall／Launchし、Xcode Buildを再実行しない。Runtime条件はどちらか一方のBuild成功を許容し、`ios-verify`が両Build／Runtimeの必須結果をfail-closeで集約する。
3. RuntimeはAutomation Appで主要購入Maestro、実`expo-sqlite` Contract Harness、Production-validation AppでTest Control／Deep Link／Service／UI／Handler／Harnessの到達不能性を検証する。成功時Evidenceは必要十分、失敗時はJUnit、Screenshot、Hierarchy、Runtime log、`simctl diagnose`を保存する。
4. `native-ci / verify`はDetect、Native Static、Production Bundle Guard、Android Automation／Production Build、Android Runtime、iOS Gateの各結果をNative変更時にsuccess必須としてfail-closeする。AndroidとiOSは互いに依存させず、Web CIはNative CIを待たない。
5. 複雑なReusable Workflow階層、Composite Action共通化、DerivedData／Pods Cache最適化、物理iPhone署名は導入しない。

## Consequences

- Runtime／Maestroだけが失敗した場合、iOS Xcode Buildを再実行せずに診断できる。
- `workflow_dispatch`単独実行とNative CIからの呼出しで同じiOS Build／Runtime契約を検証できる。
- WindowsローカルではiOS実Runtimeを確認できないため、Remote macOS CI成功まではPhase 2完全完了と記録しない。
- iOS Build／RuntimeのArtifact名、Input、Job結果をCI Contract Testへ固定する必要がある。
