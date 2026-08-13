# Plan: PR #24 Review Repair

## Objective

Primary Planの契約に合わせ、構造検証とVisual完成判定を分離する。既存基盤を大きく作り直さず、Checkout Processingのfail-open、Android Capture Caseの実行不足、Required CIへのFinal Gate未接続、Android startup raceを修正する。API34 Android canonical captureがこの環境で実行できない場合は解消・偽装せず、Structural ValidationとFinal Visual DoDを分離して記録する。

## Current understanding

- Branchは`feat/implement-screen-catalog-visual-specification`で、既存PR実装コミットと一致し、開始時のworking treeはcleanだった。
- 現RunではWeb canonical assetは存在し、Android required targetsがblockedである。`SCREEN-CHECKOUT-PROCESSING/default/web-desktop`は当初blockedだったが、fresh runtime capture後にcapturedへrebaselineする。
- `pnpm run validate:spec`は現在Structural Validation相当で、blocked/pendingを完成判定としてfailしていない。`verify`もFinal Visual Gate未接続である。
- Native workflowにはcanonical profileの期待値投入とmanual case選択の経路がある。Runtime観測値、case selection、promotion CLIの接続を再確認する。
- Native workflowは現在、Capture Caseの`role`／`setup`／`ready`をmetadata表示にとどめ、scenario resetとroute deep linkだけを実行している。Capture前の実画面assertへ接続する必要がある。
- `ci.yml`のStyle Qualityは`validate:spec`のみを実行し、`verify` aggregateはその結果を受けるがFinal Visual Gateを明示実行していない。Final Gateを同一Required pathへ追加する。
- Native Maestro flowは`launchApp(clearState: true)`を各flowの先頭で直接実行している。Android workflow側のclear-state／task停止／PID消失確認とlaunchを共通helperへ分離する。
- Primary PlanはScreen Catalogをindex、Normative SpecをExpected Behavior SSOT、ScreenshotをNon-normative Referenceと定義している。

## Scope

### In

- `scripts/spec/visual-contract.ts`、validator入口、package scripts、contract tests
- `scripts/spec/android-visual-capture.ts`、`.github/workflows/native-ci.yml`、Native workflow contract tests
- `scripts/spec/materialize-visual-references.ts`と冪等性テスト
- Screen Contract grammar / role / platform / audience / shared / oracle / asset budget / altのvalidatorとnegative tests
- `docs/PROJECT_CONTEXT.md`、ADR/history、今回のRun Artifact

### Out / Non-goals

- Checkout ProcessingのProduct code / behavior修正
- Product Bugを正常Screenshotへ置換すること
- Android API34 runtimeをローカルで捏造・推測してcapture/promotionすること
- Storybook、外部Visual SaaS、Screenshot DB、第二のExpected Behavior SSOT、巨大なcase registryの追加
- Git add/commit/push/rebase/merge/branch操作、PR更新

## Assumptions and open questions

- `system_image`と`avd_profile`はworkflow configuration由来、その他のprofile値はruntime observation由来として責務を分ける。
- API34 Current CI emulatorのresolution/densityは推測で書かず、workflowの実測コマンドと既存CI evidenceからcanonical expected値を確定する。CI evidenceが取得できない場合は、固定値を追加せず、capture時のobserved値をexpected profileへfail-close比較できる形とし、未取得をRunでBLOCKED記録する。
- Existing promotion functionとMarkdown/HTML renderer utilityを再利用し、重複validationや新規DBは追加しない。

## Hypotheses

- H1: final gateは既存summaryを再利用した`pending=0 && blocked=0`判定として最小差分で追加できる。
- H2: Android workflowでadb観測結果をJSON/CLI入力へ渡し、manifest生成を期待値コピーからobserved値記録へ変更できる。
- H3: validator不足契約は既存Markdown parser / parsed spec modelへ局所検査を追加し、現行Specを壊さずnegative fixtureで固定できる。

## Change strategy

1. Current source/test/workflow mappingとPR review evidenceを確定する。
2. Structural / Final APIとpackage/verify wiringを追加し、blocked/pending contract testsを先に固定する。
3. Android profile observation/assertion、case selection、describe/promote CLI、manifest/promotion integrityを修正する。
4. Materializer冪等性とvalidator missing contractsを実装し、negative testsを追加する。
5. DocumentationとRun Artifactを更新し、Structural PASS / Final BLOCKEDを含む全validationを実行する。

## Repair iteration 2 decisions

- Checkout Processing Webのready条件は`支払いを処理しています`のexact semantic headingだけを許可し、failed headingとのOR条件を削除する。Product codeは変更しない。
- Android Capture Caseにはmachine-readableな`nativeSetupId`／`nativeReadyId`を持たせ、自然言語の`setup`／`ready`をshellで解釈しない。既存Native Test ControlとMaestro subflowを小さなexecutorとして再利用する。
- Android screenshotはMaestro flowがrole／setup／route／readyをassertして成功した後だけ取得する。実行不能なAPI34 targetはblockedのまま維持する。
- `launchApp(clearState: true)`のraceはtimeout増加やretry隠蔽ではなく、Android workflowの共通preflightでforce-stop→pm clear→PID消失確認を行い、flow側のlaunchをclearStateなしへ分離して検証する。

## Allowed change surface

- `scripts/spec/**`
- `tests/contracts/**`
- `e2e/web/ui-review.spec.ts`
- `maestro/**`
- `scripts/native/**`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `package.json`
- `src/presentation/native/native-purchase-screens.tsx`（Payment正常stateを示す既存controls containerへの最小semantic testIDのみ）
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/0013-screen-catalog-visual-reference.md`
- `docs/history/**`（今回判断の追記用）
- `.codex/runs/20260813-084749-JST/**`

Product `app/**`は変更しない。`src/**`の今回の変更もPaymentの業務挙動・表示・操作を変更せず、valid Checkout Session時だけready検証へ利用するsemantic markerを公開する最小変更に限定する。

## Validation plan

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`（Structural PASS）
- `pnpm run validate:spec-visuals:final`（現状BLOCK/FAIL。blocked/pending残存が理由であることを確認）
- `pnpm run build:spec`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test:contracts`
- `pnpm run test`
- `pnpm run build:web`
- `pnpm run verify`（Final Gate接続後は現状BLOCK/FAILが正しい）
- 可能な範囲で`pnpm run native:android:doctor`とNative static contract tests
- 最後にself-review、`git diff --check`、Run Artifact sanitizer Write/Check

## Definition of Done for this repair

- Structural Validationは現行blocked targetを理由にfailしない。
- Final Gateはpendingまたはblockedが1件でもあればfail-closeし、`verify`へ接続される。
- Android manifestはobserved runtime valuesを記録し、capture前にexpected profileとassertする。wrong profile/source/APK/case/outputはpromotionしない。
- manual dispatchはRegistryの任意のAndroid required targetを`capture_case_key`で選べる。
- materializerは2回実行して差分なし。
- 指摘されたvalidator不足契約とnegative testsを追加する。
- 未実行API34 captureはblockedとして明示し、Final PASSへ偽装しない。Checkout Processing Web Targetはfresh captureとpromotionの証跡が揃った場合だけcapturedへ更新する。

## Thinking log

- 2026-08-13 JST: 既存実装はPR #24のHEADにあり、review repairとして新Runを開始。レビュー指摘はPrimary PlanのFinal Gate、Android evidence provenance、validator fail-close不足に直接関係するため、must_fixとして扱う。

## Rebaseline update

- 2026-08-13 JST: ユーザー確認とfresh Web UI Reviewにより、Checkout Processing Product Fixは実装前からCurrent Runtimeへ反映済みであることを確認した。`payment-processing` scenarioでProcessing headingがreadyとなり、fresh raw PNGからcanonical WebPとMarkdown referenceを生成した。
- この変更によりCheckout Processing Web Targetはblockedではなくcapturedとなった。Product codeは変更していない。Final DoDの残存blockerはAPI34 Android required targetsである。

## Completion review

- Structural ValidationはPASS、Final Visual DoDはAndroid 25 required target未captureのためBLOCKEDとする。Final Gate／verifyのFAILは未完成状態に対する正しいfail-close結果である。
- Native role／setup／ready driver、Android cleanup helper、Required CI接続、strict Web matcher、contract tests、static／Web validationは完了した。
- API34 canonical Emulator／AVDを実測できる環境はこのworktreeにないため、Native CI主要flowの修正後runtime確認とAndroid capture／promotionは次のmanual dispatchへ残す。Physical API30 deviceの画像はcanonicalへ昇格しない。
- Scope audit、`git diff --check`、Run Artifact sanitizer Write／CheckはPASS。Git mutation、Product source変更、second SSOT、gate weakening、secret／local absolute path混入はない。

## Repair iteration 3 decisions

- `regular-member`はNative customer Sessionとactive Cartをseedするが、Payment／Confirmへ直接進めるactive Checkout Sessionはseedしない。したがって対象Targetを単なる`customer-login` setupでcapture可能とは扱わない。
- RegistryのCheckout Android Targetは`customer-checkout-address`／`customer-checkout-payment`／`customer-checkout-confirm`へ明示接続する。共通Maestro subflowは既存customer loginとCheckoutのstable testIDを使い、`CHECKOUT_STEP`まで実際に進める。
- `native_checkout_step`はCapture Caseからworkflowへ渡し、workflowへ個別screen分岐を複製しない。generic capture flowはsetup成功後にcanonical routeとready matcherをassertし、失敗時はscreenshotへ進まない。

## Repair iteration 3 validation boundary

- 新規setupの静的契約とTypeScript／Maestro syntaxはlocalで確認する。
- API34 `google_apis`／`x86_64`／`pixel_2` Emulatorがlocalにないため、実runtime capture／promotionはmanual GitHub Actions dispatch後にのみ実施し、physical API30画像はcanonicalへ昇格しない。

## Repair iteration 4 decisions

- `regular-member` Native resetはcustomer Sessionと会員Cart（basic-shirt-02を含む）を復元するため、Checkout visual setupでcustomer loginを重複実行しない。setupはseeded customer role／Cartをassertし、Addressを開いてactive Checkout Sessionを開始する。
- Paymentのroot、payment method、NextはCheckout Sessionが不正でも描画され得るため、既存画面の操作だけではCapture Case固有のready条件をfail-closeできない。画面挙動は変更せず、valid `state.session`時だけ既存payment controls containerへsemantic testIDを付与し、ready matcherへ接続する。
- Confirmはconfirmationロード後だけ存在する既存`native-checkout-confirm-submit`をready条件へ追加する。CategoryはProduct List／Category専用heading testIDをready条件へ追加し、Shell navigationの同名ラベルを避けてdeep-link取り違えを検出する。
- Android capture flowの順序（reset → setup → route → role → ready → screenshot）、Final Gate、startup helper、canonical profile、manual dispatch境界は変更しない。API34 capture／promotionは今回も実行しない。
