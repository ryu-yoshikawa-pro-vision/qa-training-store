# Plan（計画）

## Objective（目的）

- PR #181 / Issue #131の保存Planに従い、Web CSS ownershipをfoundation / shared / Storefront / Adminへ分け、既存cascade・responsive・accessibility・visual behaviorを保つ。
- Repositoryのstandard implementation workflowで、検証、Run sanitization、commit、通常push、最新head CI、PR本文更新まで完了する。

## Source of truth

- 保存Plan: docs/plans/2026-09-24_162600_issue-131-global-web-css-ownership-boundary.md
- Issue #131、PR #181、最新main、およびCurrent sourceを実装判断の根拠とする。
- 保存Planの実装順序・移動前gate・停止条件・検証コマンドを再定義しない。

## Scope（対象範囲）

- In: CSS selector / named at-rule consumer inventory、cascade依存gate、before/after UI Review、4 CSS ownership file、Web root import、architecture contract、Project Context/history、Plan指定のvalidation、Run artifacts、commit/push、CI、PR本文。
- Out: Native styling、className / DOM / route / product behavior変更、breakpoint変更、CSS Modules、Cascade Layers、新framework/dependency、恒久parser/linter/registry、PR merge、Issue close、branch削除、force push。

## Assumptions（仮定）

- Current mainが保存Plan記載のbaselineから変化していなければ、そのPlanとsource mappingを有効として使う。差異があれば該当箇所を再mappingする。
- before/after captureは既存UI Review spec・capture registry・4 projectを使う。
- git push認証は現在のGit設定に委ね、credentialをArtifactや報告へ出さない。

## Questions / Ambiguity（質問・曖昧性）

- Blocking questionなし。owner間cascade dependencyが解消できない場合はPlanの停止条件に従い、Evidenceを記録して実装を止める。

## Approach（進め方）

- Task 0でmain / Issue / root / architecture / CIを照合する。
- active Runの有無を確認し、なければstandard Runを初期化する。
- source consumer / selector / named at-rule inventoryとoverride / cascade mappingを作り、owner間依存0件の移動前gateを満たすまでCSSを変更しない。
- gate後にbefore UI Reviewを取得し、保存Planの順番でCSSを移動する。
- architecture contract、Project Context/history、static ownership review、指定検証、after UI Review比較を行う。
- local差分とRunを確定してsanitizeし、commit / normal push / head一致 / 最新Web CI・Mobile App CI / PR本文更新まで行う。

## Definition of Done（完了条件）

- 保存Planの4 ownership boundaryと全成功条件を満たす。
- 移動前gateで未解決のcross-owner source-order依存が0件。
- 同一route/scenario/viewportのbefore/after比較に意図しない差分がない。
- Plan指定のfocused contract、Web build、Chromium E2E、accessibility、mobile boundary、pnpm run verify、git diff --checkが成功。
- Run Artifact sanitizerでresidual finding 0、scope外差分0。
- commit SHAがlocal HEAD / remote branch head / PR #181 headで一致し、同SHAのWeb CI / Mobile App CIがsuccess。
- PR本文にmapping、実装、検証、visual比較、最新CI結果を反映する。

## Risks / Unknowns（リスク・未知点）

- 5,348行のCSSには後段overrideとresponsive ruleが分散する。owner間依存またはowner不明が残れば移動しない。
- Playwright UI Reviewは複数viewport・多数routeを実行する。環境依存failureは最初のfailureと派生errorを分けて診断する。

## Thinking Log（判断記録）

- 2026-09-24: PR #181 open / head 4eb7b59e、Issue #131 open、origin/main ac4e5772、global.css blob 226a90d3で保存Planのbaseline前提と一致。Issue #131のactive Runなし。Run 20260924-174828-JSTをstandard implementationとして初期化した。
- RunはPR #179の直近repair Runを再利用しない。task identityとsession lifecycleが異なるため。