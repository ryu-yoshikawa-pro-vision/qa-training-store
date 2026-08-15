# Screen Catalog / Visual Specification 品質ゲート追補

2026-08-13の追補では、既存Prettier baselineを設定変更やignore拡張で隠さず、Repository標準の`pnpm run format`で意味非変更整形した。`pnpm run format:check`と`pnpm run verify`は、lint 0 errors／65 warningsを含めてpassedした。

Nativeは明示的なVirtual Store引数をWindows Prepareへ固定したことで、API30 ARM physical deviceのlocal Release Build、Install、Smoke、Runtime、Boundary、Purchaseをpassedへ回復した。Physical deviceはsupplemental evidenceであり、API34／`google_apis`／`x86_64`／`pixel_2` canonical captureへ昇格していない。local emulator binary、AVD、API34 system imageがないため、canonical captureはNative CI manual dispatchの後続作業としてblockedである。

Review Flowは同一APK・同一端末で、threshold変更と`centerElement`変更を各1回含むbounded validationを実行したが、対象buttonがHierarchyに存在する状態でもMaestro `scrollUntilVisible`が未検出となった。Flowは元へ復元し、Product codeやVisual Specificationへ修正を混ぜず、Maestro 2.8.0とReact Native ScrollViewのselector／visibility契約の別調査へ残した。

Checkout processingは`CheckoutProcessingContent`が`resumePayment`後に即時`complete`／`failed`へredirectするためprocessing UIをcanonical captureできない。PlanのProduct Fix分離契約に従い、このVisual Specification branchでは修正せず、別Product Fix PR → merge → rebaseline／recaptureを必要条件として記録する。
