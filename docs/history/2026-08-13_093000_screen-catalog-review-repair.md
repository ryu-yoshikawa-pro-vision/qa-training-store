# Screen Catalog / Visual Specification Review Repair 履歴

2026-08-13のPR #24 review repairで、Structural ValidationとFinal Completion Validationを分離した。

- `validate:spec`はCatalog、owner、State grammar、Capture Target接続、Asset／Markdown／Oracle integrityを検査し、正当な`blocked`／`pending`を許容する。
- `validate:spec-visuals:final`は`pending=0`、`blocked=0`、全Target capturedを要求し、`verify`へ接続した。初回評価時点ではAndroid 25 TargetとCheckout Processing Web Targetがblockedだったが、fresh Web capture後の現在はAndroid 25 Targetのみが残り、Final GateがFAILするのは未完成を正しく表す。
- Android Native CIのNormalize stepは設定後にAPI、ABI、locale、font scale、UI mode、orientation、resolution、densityを再取得し、observed profile JSONをCLIでCanonical Profileへ比較する。不一致時はmanifest／captureへ進まない。
- manifestはruntime-observed fieldsとworkflow-configuration fieldsをprovenance付きで記録する。promotionは`android-visual-capture.ts promote`から既存`promoteAndroidVisualCapture()`を呼び、capture case、source SHA、APK digest、profile、raw PNG、canonical outputを検証してからWebPを生成する。
- manual `capture_case_key`は`describe-case`でRegistryのroute／scenario／role／setup／ready／capture modeへ解決する。PR eventではcaptureを実行しない。
- 実測根拠: 既存Native CI run `31648723045`は`capture_spec_visuals=false`でNormalize／captureを実行していなかった。runtime evidenceからresolution `1080x1920`は確認できたがdensityは記録されていない。Canonical expected density `440`はPixel 2 AVD configurationとの照合値として固定し、manual API34 captureでruntime `wm density`が一致するまでcanonical assetへpromotionしない。
- Product Bug `SCREEN-CHECKOUT-PROCESSING/default/web-desktop`は当初の観測ではProcessing UIをcaptureできずfailedへ遷移すると判断していたが、ユーザー確認後のfresh UI ReviewでProcessing headingをready判定し、現worktreeからraw PNGを取得した。Product codeを変更せず、既存promotion pipelineでcanonical WebP（44,522 bytes）を生成し、Markdown referenceをmaterializeした。Targetは`captured`へ更新し、Final Gateの残存blockerはAndroid 25 targetとなった。
