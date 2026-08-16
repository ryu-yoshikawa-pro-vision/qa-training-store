# Screen Catalog / Visual Specification 実装履歴

2026-08-12のCurrent rebaselineでは、`app/**`のroute familyを再走査し、Catalog Universe 38件（Product 31、Supporting 4、Boundary 2、Test-only 1）を確定した。旧Native route inventoryのplaceholder記録よりCurrent sourceを優先し、Admin NativeだけをExcludedとした。

Normative owner SpecificationへScreen ContractとImportant UI State grammarを追加し、Catalogはindex、typed Capture Registryは実行metadata、ScreenshotはNon-normative Visual Referenceという境界をADR-0013へ記録した。既存UI ReviewのScenario reset / ready / viewport captureを再利用して、Web canonical WebP 68件（合計約5.2 MiB、1件1 MiB以下）を生成し、MarkdownとGenerated Specification HTMLのclick-through imageへ接続した。

AndroidはAPI 34 / `google_apis` / `x86_64` / `pixel_2`をcanonical profileとしてNative CIのmanual `capture_spec_visuals` inputへ接続した。Windows local Release buildは`react-native-nitro-modules`のCMake prefab command解決でCreateProcess error 2となり、短縮Repository aliasと短縮virtual storeでも解消しなかった。物理API30 ARM端末は補助証跡に限定し、stale / physical screenshotはcanonical assetへ昇格していないため、Android 25 targetはblockedとして保持する。

Webのcheckout processing routeはpayment-processing seedからfailed画面へ解決され、Normative processing UIを誤ってcanonicalizeしないよう、Product Fix分離のblocked targetとして記録した。
