# Plan: Mobile / Web 商品画像オーバーフロー修正

## Objective

- 対象Plan `docs/plans/2026-08-23_113300_mobile-web-image-overflow.md` に従い、Nativeの商品画像オーバーフローを実Runtimeで再現・原因特定し、直接原因だけを最小修正する。
- Webは既存UI Reviewの2 route × 2 viewportで独立確認し、再現時だけ既存コードを修正する。

## Scope

- In:
  - Nativeの最初の再現画面と、画像から外側へ追跡した直接原因となる既存layout / image style。
  - 直接原因に対応する既存Native targeted test、必要な代表画面Runtime確認。
  - Web `/products` と `/products/product-basic-shirt` の既存UI Review確認。
  - 標準Run Artifactの更新とsanitizer。
- Out:
  - 原因確認なしのwrapper、clipping、`max-width`、`flexShrink`、画像縮小処理。
  - Webの通常の `object-fit: cover` crop変更、新規viewport harness / responsive E2E。
  - 無関係なリファクタリング、デザイン変更、画像アセット/API/DB変更。
  - Git commit / push / merge / rebase / branch操作。

## Assumptions

- 報告されたNative Runtimeが利用可能ならそれを優先し、再現箇所が不明な場合はHome → Catalog → Product Detailの順に確認する。
- `NativeProductImage`の`width: "100%"`、既存`aspectRatio`、`resizeMode`は原因確認なしに変更しない。
- Web UI Reviewのfixture・build・browserが評価可能なら、既存のscreenshotとoverflow assertionだけで判定する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 原因が既存repo conventionの局所修正で解消できる場合は、その最小差分を採用する。
- 未回答の重要質問: Nativeの最初の再現画面、期待幅を最初に壊すlayer、Webの再現有無。Runtime / UI Reviewで解消し、解消不能なら推測修正せずBlockedとする。

## Hypotheses

- H1: 画像の直接親ではなく、`ScrollView` content、card、row、sibling、paddingと固定幅の組合せが期待幅を広げている。
- H2: 親layoutが正常で、画像自身のwidth / aspectRatio / resizeModeが表示領域だけを壊している。
- H3: Webは既存CSSのcontainer clippingと`object-fit: cover`により非再現である。FAIL時は画像/layout起因と環境・harness起因を分離する。

## Research Plan

- Round 1 Query: active Run、直近Run / artifact、差分、Android preflight、Native source / tests / runtimeを確認し、最初の再現画面と最初に期待幅を壊すlayerを特定する。
- Round 2 Query: Native修正後Runtimeとtargeted testを確認し、Webの既存UI Review screenshot / overflow結果を2 route × 2 viewportで判定する。
- Exit Criteria:
  - H1 / H2のいずれかをRuntime観測とlayout境界で支持または反証し、直接原因を特定する。特定不能ならNative修正をBlockedとする。
  - Webは画像container・隣接UI・通常cropをscreenshotで確認し、FAIL時は原因分類を記録する。
  - production / test codeを変更した場合はtargeted test、Runtime、Web UI Review、最後に`pnpm run verify`を実行する。変更しなかった場合は`pnpm run lint:markdown`を実行する。

## Approach

1. 同一タスクのactive Runがないことを確認し、Run `20260823-145707-JST`を初期化した。Plan / Tasks / Reportを日本語で更新する。
2. Android skill / Runbookのpreflightに従い、Doctorと実行条件を確認する。Build / Install / Maestroが必要な場合だけ、同一Runの一意なattemptへ証跡を保存する。
3. Nativeを報告Runtimeで再現し、画像・直接親から外側へ幅を追跡する。最初の再現時点で無目的な全画面探索を止める。
4. 直接原因が特定できた場合だけ該当既存component / styleを最小編集し、変更を含むRuntimeで再確認する。shared styleならPlanの代表画面だけを確認する。
5. 対応する既存Native targeted testを実行し、Web UI Reviewをbefore stageで実行する。Web再現時のみafter stageで修正・再確認する。
6. 条件に応じて品質ゲート、Run Artifact更新、sanitizerを実行する。

## Definition of Done

- Nativeの直接原因が実Runtimeで特定され、原因箇所だけが変更され、変更を含むRuntimeで画像が想定container内に収まる。
- Native targeted testが成功し、shared style変更時はPlan指定の代表画面を確認する。
- Webの2 route × 390x844 / 320x700でoverflowとscreenshot確認が完了する。非再現ならWeb code / testを変更しない。再現修正時はafter stageを成功させる。
- 最終品質ゲート、Run Artifact、sanitizerが条件どおり成功する。未実施・BlockedはPASSと扱わず明記する。

## Risks / Unknowns

- 実Runtimeが古いAPKのままだと修正後確認を誤るため、source変更後はMetro reloadまたは変更を含むAPK Build / Installを確認する。
- Nativeの症状が再現しない、またはlayerを特定できない場合は、production codeを変更せずNative: Blockedとする。
- Web UI Reviewが環境・fixture・harnessで評価不能な場合はWeb: Blockedとし、FAILだけを根拠に修正しない。

## Thinking Log

- 2026-08-23 JST: 対象Plan、入口文書、最近のADR / Runを確認した。現在branchは対象branchでworking treeはclean、同一タスクのactive Runはなく、新規Runを初期化した。
- 2026-08-23 JST: Nativeは実Runtimeでの原因特定が完了条件であり、画像の既存`width: "100%"`を予防的に変更しない方針を固定した。
- 2026-08-23 JST: 実機RuntimeでProduct DetailのText/Buttonは`x=48..1032`、Imageだけ`x=48..1080`となることを確認した。width削除と`alignSelf`では境界が変わらず、Image自身のintrinsic幅がpadding内側を越える直接原因と判定したため、原因確認済みの`maxWidth: "100%"`だけを`styles.productImage`へ適用した。
- 2026-08-23 JST: 修正後の同一working tree APKでHome / Catalog / Product DetailのImageViewが各content内側へ収まることを確認した。Web UI Reviewは2 route × 2 viewportで非再現。`pnpm run verify`は今回差分外のPlan MD047で停止したため、baseline failureとして記録した。
