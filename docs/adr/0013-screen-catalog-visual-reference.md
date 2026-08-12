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

## Consequences

- Screen Catalogは画面を探索する入口になるが、Expected Behaviorを定義する文書は増えない。
- Web canonical assetとAndroid blockerを同一Target matrixで併記でき、Android capability不足やProduct Fix依存をPASSへ誤昇格しない。
- Visual Referenceの更新には、Normative Spec変更とcapture setup変更の影響確認が必要になる。Pathやhashの存在だけではCurrent性を保証しない。
- Android CIのcanonical captureは明示dispatchに限定され、通常PRの実行時間と既存Native Gateを増やさない。
