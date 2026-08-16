# Screen Catalog / Visual Specification Current Rebaseline

## Goal

既存の Screen Catalog / Visual Specification 計画を、現在の `qa-training-store` worktree（`feat/implement-screen-catalog-visual-specification`）へ再適用し、Screen Inventory、Screen-owning Specification、typed Capture Registry、Canonical Visual、Markdown / HTML、Validator、Native CI契約を一つの変更範囲で接続する。

## Current understanding

- 現在のHEADはPR #16以降のSpecification / Agentic QA基盤を含む `cef7aa9` で、worktreeは専用作業ブランチ上にある。
- `app/` の論理route familyは、platform variant（Web / Native）とdynamic routeを正規化すると、Planの38 Screen Universeと一致する。内訳はProduct 31、Supporting 4、Boundary 2、Test-only 1。
- 現行 `docs/spec/` はNormative root 4件とFeature 11件のBR/AC Grammarを持つが、Screen Contract、State Matrix、Visual Referenceは未導入である。`native-customer.md` はcross-cutting ownerのまま維持する。
- 現行 `e2e/web/ui-review.spec.ts` は4 viewport、Scenario reset、ready condition、画像待機、full-page capture、overflow確認を持つ。これをcapture setupの実行源として再利用する。
- 現行 `scripts/spec/validate-all.ts` はMarkdown link / Feature Grammar / BR-ACとAgentic QA契約を検証し、`scripts/spec/build-spec.ts` はMarkdown imageをplaceholderにしている。`sharp` 0.35.3は既存devDependencyである。
- 旧 `docs/plans/2026-08-02_215142_route-inventory.md` には後半Nativeをplaceholderとする記録があるが、Current `app/*.native.tsx` はLogin、Profile、Addresses、Checkout、Orders、Reviewを `src/presentation/native-route` の実UIへ接続している。Current scanを採用し、AdminのみNative Excluded、非Admin25 ScreenをAndroid current surfaceとして扱う。AndroidはRunbookとNative CIのAPI 34 / `google_apis` / `x86_64` / `pixel_2`系プロファイルを正本候補とし、iOS Runtime captureは追加しない。
- Canonical image、typed visual registry、screen catalog、visual validator、HTML asset copy、Native capture inputは現在存在しない。

## Assumptions

- 既存PlanのCatalog Universe 38は初期仮説として検証し、Current route scanと矛盾した場合はCurrentを採用する。今回のscanでは差分なしとして進める。
- Capture RegistryはExpected Behaviorを持たず、Screen ID / State slug / platform / route projection / setup / ready / capture mode / statusだけを保持する。
- Webのbaselineは既存UI Reviewの代表viewportを使い、responsive差分があるSurfaceだけ追加viewportをrequiredにする。共通Admin mobile warningはAdmin Dashboardのshared visual ownerではなく、独立したrequired responsive stateとして所有させる。
- Android capabilityがない場合はplaceholderやstale imageで埋めず、Targetをblockedとして記録する。ただし本RunではWeb / Spec / HTMLを先行完了し、Androidを最後のfirst slotで検証する。

## Non-goals

- Product behavior / business rule / UI redesign、Native Admin、iOS Runtime Screenshot、Storybook / Chromatic / Percy / Applitools、Screenshot DB / Route DB /全Asset hash manifestを追加しない。
- `git add`、commit、push、merge、rebase、branch mutationを行わない。
- 他worktreeのsource、asset、artifactを参照・コピーしない。

## Change strategy

1. Current route / scenario / UI Review / Native CIをrebaselineし、38件のCatalogとowner mappingを確定する。
2. CatalogとNormative owner Specへ固定Screen Contract Grammarを追加する。cross-cutting SpecはSCREEN sectionを持たない。
3. Metadata-only typed Capture Registry、既存UI Reviewへのmetadata接続、Web capture / WebP promotionを追加する。
4. Markdown画像のactual HTML rendering、safe asset copy、Validatorの4-way integrity / route / ownership / image契約を追加する。
5. Android first-slotでDoctor → Build/Install/Smoke → Test Control/Maestro → canonical raw evidenceを実行し、source / APK digest / profileを検証する。Native CIは既存Workflowにdispatch inputとcapture branchを追加する。
6. Contract test、Web regression、spec build、full verify、self-review、sanitizer、release markerを完了条件として記録する。

## Validation plan

- format / markdown lint
- `pnpm run validate:spec` / visual contract validation / negative contract tests
- `pnpm run build:spec` とgenerated HTML asset/link inspection
- lint / typecheck / `pnpm run test:contracts`
- worktree専用 `PLAYWRIGHT_BASE_URL` を明示した UI Review / Web regression
- Native Runbook Doctor、Android local Release build/install/smoke、必要な Maestro Runtime / Boundary / capture evidence
- `pnpm run verify` と `git diff --check`
- Run Artifact sanitizer Write / Check、secret / absolute path / scope audit

## Risks / Open questions

- ルートの具体的なstate数とCapture Target数はCurrent UIの到達可能性を確認して確定する。到達不能な状態はProduct Bugとしてcanonicalizeせず、別PR依存のblockedにする。
- Android local toolchainまたはEmulatorが利用できない場合、Android TargetをPASSへ繰り上げず、release markerを`blocked`としてcleanup後に作成する。
- `PLAYWRIGHT_BASE_URL`がShell環境に未設定の場合は、他worktreeの8081/8082/8083を使わず、このworktree専用の空きポートを明示してRuntime生成元を確認する。

## Implementation status

- Screen Catalog Universe、Screen-owning Contract、Important UI State grammar、typed Capture Registry、4-way validator、Markdown / Generated HTML image supportは実装済み。
- Web canonical captureは既存UI Reviewを再利用して68 targetをpromotion済み。Guideは長大なfull-page画像を避けるため、Planの`viewport` capture modeを適用した。
- Web checkout processingはCurrent routeがfailedへ解決されるためblockedとし、Product Fixをこの変更へ混ぜていない。
- Android local first-slotは明示Virtual Store引数をPrepareへ固定後、API30 ARM physical deviceのRelease Build／Install／Smoke／Runtime／Boundary／Purchaseをpassedした。local emulator binary、AVD、API34 system imageは存在せず、API34／`google_apis`／`x86_64`／`pixel_2` canonical captureは未実行のblockedを維持する。Review FlowはMaestro-MCPの段階診断で、先頭から7件目への`speed: 10` timeoutと物理日本語IMEの非同期dismiss raceを分離し、Flowの最初のscrollを`speed: 50`へ変更、`hideKeyboard`後のanimation待機とIME表示時だけの条件付きBackを追加した。標準Native入口で1/1 PASSしたが、Physical deviceはcanonical promotion inputではない。
- Native CIへ`workflow_dispatch` input `capture_spec_visuals`、canonical profile normalization、baseline raw PNG + manifest artifact uploadを追加した。通常PRのcaptureは実行しない。
- 既存Prettier baselineは意味非変更の`pnpm run format`で整形し、`pnpm run format:check`、`pnpm run verify`、Markdown lint、Spec validation、全test、Web／Spec buildをpassedした。Review Flowは標準Native入口で1/1 PASSへ回復した。残りはcanonical Android CI capture、別Product Fix後のprocessing recaptureである。
