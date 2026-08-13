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
