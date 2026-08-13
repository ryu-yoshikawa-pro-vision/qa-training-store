# ADR-0013: Screen Catalog と Visual Reference の境界

- Status: Accepted
- Date: 2026-08-12

## Context

Current Repositoryには、Normative Product Specification、既存UI Review、Native Test Control / Maestro、Static Specification HTMLがそれぞれ存在する。Screen CatalogとScreenshotを追加する際に、Catalogを第二のExpected Behavior SSOTへ拡張したり、ScreenshotをProduct Behaviorの規範へ昇格させたりすると、BR / AC / Scenarioとの責任境界が崩れる。また、Web captureが完了してもAndroid canonical captureやProduct Fix依存が残る場合があるため、Platform単位の実行状態を表現できる必要がある。

## Decision

1. `docs/spec/screen-catalog.md`はScreen ID、route family、class、platform、audience、Primary specificationへのSupporting indexとする。Expected UI、BR、AC、Scenarioの本文はCatalogへ複製しない。
2. Screen-owning Feature / root Specificationだけが、固定Grammarの`SCREEN-*` sectionとImportant UI Stateを所有する。Cross-cutting SpecificationはScreen Stateを所有しない。
3. `scripts/spec/visual-registry.ts`はCapture Caseの実行metadataと、Web / Android / viewport単位の`pending` / `captured` / `blocked` statusだけを持つ。RegistryはExpected Behaviorを持たない。
4. Canonical ScreenshotはNon-normative Visual Referenceであり、Normative Specificationと一致しないProduct状態をcanonicalizeしない。Visual-blocking Product Defectは別Product Fixへ分離し、対象Capture Targetをblockする。
5. Webは既存`e2e/web/ui-review.spec.ts`のScenario reset、ready condition、viewport、capture経路を再利用する。Androidは既存Native CIのAPI 34 / `google_apis` / `x86_64` / `pixel_2` profileをcanonical候補とし、`workflow_dispatch`の`capture_spec_visuals=true`だけでRaw Artifactを生成する。PRでcaptureせず、Physical deviceの画像をpromotion inputにしない。
6. ValidatorはCatalog → owner Spec → State → Capture Target / Case → Canonical Asset → Markdown / Generated HTML referenceのintegrityをfail-closeで検証する。新しいScreenshot DB、Route DB、hash manifest、外部Visual SaaSは導入しない。
7. Structural Validation（`validate:spec`）とFinal Completion Validation（`validate:spec-visuals:final`）を分離する。前者は正当な`pending`／`blocked`を記録可能にし、後者だけが`pending=0`、`blocked=0`、全Target capturedを要求する。`verify`はFinal Gateを含む。
8. Android captureはruntime Observe → Record → Validateの順序を必須とする。API／ABI／locale／font scale／UI mode／orientation／resolution／densityはEmulator観測値をmanifestへ記録し、`system_image`／`avd_profile`だけをworkflow configuration由来としてprovenanceへ分離する。固定Profile不一致時はcapture／promotionを実行しない。
9. Android manual captureは`capture_case_key`でtyped Capture Registryの1 Caseを選択し、case metadataをworkflowへ再定義しない。Artifact promotionはmanifest、source SHA、APK digest、canonical output pathを既存`promoteAndroidVisualCapture()`で再検証してからWebPを生成する。

## Consequences

- Screen Catalogは画面を探索する入口になるが、Expected Behaviorを定義する文書は増えない。
- Web canonical assetとAndroid blockerを同一Target matrixで併記でき、Android capability不足やProduct Fix依存をPASSへ誤昇格しない。
- Visual Referenceの更新には、Normative Spec変更とcapture setup変更の影響確認が必要になる。Pathやhashの存在だけではCurrent性を保証しない。
- Android CIのcanonical captureは明示dispatchに限定され、通常PRの実行時間と既存Native Gateを増やさない。
- Final Gateがblocked／pendingを理由にfailすることで、Structural integrityのPASSとVisual DoDの未完了を混同しない。Checkout ProcessingのProduct Defectや未実測API34 captureをScreenshotで隠さず、別Product Fix／manual capture後に再baselineする。

## Addendum: Review Repair iteration 2（2026-08-13）

- WebのCheckout Processing ready matcherはProcessing headingのexact semantic locatorに限定する。Failed heading、URLだけの判定、既存assetの再利用によるtimeout受理は許可しない。
- Android manual captureは`capture_case_key`から`nativeSetupId`／`nativeReadyId`を解決する。Capture driverはTest Control reset、machine setup、canonical route、role assertion、ready matcher assertion、screenshotの順に進み、ready assertionが失敗した場合はartifactをcanonicalへ昇格しない。
- Android startup race対策はworkflowの共通preflightへ閉じ込める。既存Maestro flowはclear-stateを担当せず、Android helperが旧task／process停止、data clear、PID消失確認を完了してから通常の`launchApp`を実行する。Native flowのassertionとProduction validationは削除しない。
- Phase 1 Required CIはStructural gateとFinal gateを同じRequired job pathで実行する。Android canonical captureが未完了の間にPhase 1／`verify`がfailすることは仕様上正しい。

## Addendum: Review Repair iteration 3（2026-08-13）

- Checkout画面のAndroid Capture Caseは、単なるcustomer loginではなく、既存のNative Test Control seedとCheckout UI操作を使うtyped setupで準備する。`customer-checkout-address`はactive sessionを開始し、`customer-checkout-payment`は配送先を保存してPaymentへ進み、`customer-checkout-confirm`は成功テスト決済を保存してConfirmへ進む。
- setupの実行結果はMaestroのstable testID（Checkout画面、住所Next、Payment、成功決済、Confirm）で確認する。generic capture driverはその後にcanonical routeへ遷移し、Capture Case固有のready matcherを満たした場合だけscreenshotを取得する。
- `regular-member`のseed済みcustomer Session／Cartを使い、Capture専用のProduct state databaseやProduct code変更は追加しない。API34 runtimeでこの経路が実測されるまでは、既存のAndroid blockerとFinal Gate fail-closeを維持する。

## Addendum: Review Repair iteration 4（2026-08-13）

- Native Test Controlの`regular-member` resetはcustomer Sessionと会員Cartをseedする。したがってそのscenarioのprofile／addresses／orders系Capture Caseは`customer-seeded-session`でseed stateを利用し、login操作を重複させない。guest seedからcustomer化が必要なdefault／review／processing系だけ既存customer login setupを使う。
- Checkout visual setupはseeded role／Cartを確認し、Addressのactive session開始、住所保存、成功決済選択、Confirm dataロードの順に既存Maestro testIDを操作する。Paymentのnormal stateは`native-checkout-payment-session-ready`、Confirmのloaded stateは`native-checkout-confirm-submit`で検証する。
- Product ListとCategoryのready contractは同一catalog rootだけに依存せず、それぞれ専用heading testID（`native-product-list-heading`／`native-category-heading`）を要求する。Shell navigationの同名ラベルを誤って拾わない。Addressもrootに加えてactive session markerを要求するため、error／locked／wrong deep-link stateをcanonical captureへ進めない。
