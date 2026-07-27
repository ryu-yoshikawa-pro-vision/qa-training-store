# Phase 1 最終修正 Strict Run 計画

## 目的

再レビューで残った Run Artifact、Mobile staff Logout のPR検証、Deploy後Smokeの実行境界、CI Contractの問題を、既存のPhase 1実装を変えずに解消する。

## 対象範囲

- 前回Strict Runの `run.json` / `evaluation.json` と正式Planの原文復元
- Run Artifactの長期保存対象と一時ファイルの区別
- Mobile staff Logout専用E2E、package script、PR CI step
- Deploy先を対象とするPlaywright実行時のlocal webServer無効化
- Preview / Production deploy URLのCI検証
- CI / Playwright Config contract test
- 必須検証、Strict evaluation、PR本文更新案

## 対象外

- 添付指示「変更してはいけないもの」に列挙された実装
- 無関係なrefactor、rename、file move、UI変更
- Git/GitHub mutation、PR本文の直接更新、Cloudflare実Deploy

## 現在確認されている問題

- 前回Strict RunからJSON 2件と正式Planが欠落している。
- PRではMobile E2E全体が除外され、staff Logout境界が実ブラウザ検証されない。
- deployed smokeでもPlaywrightのlocal Expo serverが起動し得る。
- Deploy URLが空の場合の明示的なCI failureと、それらを固定するcontractが不足している。

## 実装方針

ユーザー指定の作業順を守り、復元、運用ルール、専用E2E、Playwright境界、CI、Contract Testの順に最小差分で変更する。Repo mapping後に対象ファイルと検証方法を確定し、正式Planへ保存する。

## Run Artifact復元方針

基準commit `7dea554eb4685f9461291d75c845512491bb311d` の原文を、許可されたread-only履歴参照だけで取得する。前回Runには今回の作業記録を追加しない。

## Mobile E2E方針

既存fixtureのscenario reset、login、session確認、console監視を再利用し、`mobile-chromium` projectでoperator/adminのLogout・session削除・route guardをAccessible Role/Nameから検証する。

## Deploy Smoke方針

有効な `DEPLOYED_BASE_URL` の有無をPlaywright Configで判定し、deploy対象時だけ `webServer` を無効化する。CIではSmoke前にURLの非空を検証してsilent local fallbackを防止する。

## 検証計画

添付指示のinstall、static validation、全Vitest、automation/production build、Chromium/a11y/mobile-boundary E2Eを順に実行する。可能な範囲で追加E2Eも実行する。Cloudflare実Deployは行わない。

## 完了条件

- 新旧Runと正式Planに指定artifactが存在する。
- AGENTS.md、Mobile E2E、Playwright、CI、Contract Testが添付DoDを満たす。
- 必須検証が全件PASSする。
- Run manifest/evaluation/reportを最終化し、PR本文更新案をREPORTと最終報告へ記載する。

## Rollback方針

Git操作やfile deletion/renameは行わない。問題が出た場合は今回の追加・編集箇所だけを逆差分で戻せる単位に保ち、既存Phase 1実装や過去Runの原文へ変更を波及させない。

## Repo mapping（実装前に更新）

- Entry points: `AGENTS.md`、`e2e/web/fixtures.ts`、`phase1-required.spec.ts`、`playwright.config.ts`、`.github/workflows/ci.yml`、`tests/contracts/ci-workflow.test.ts`。
- Main flow: fixtureがreset/login/session/consoleを管理し、mobile projectがPixel 7でshellの可視Mobile actionを操作する。Deploy jobはWrangler outputをdeployed-smokeへ渡す。
- Key abstractions: 標準Run Artifact、Playwright fixture/project、`DEPLOYED_BASE_URL`、`steps.deploy.outputs.deployment-url`。
- Existing tests: full Mobile 14件、Logout component、CI workflow contract。専用Mobile 2件とPlaywright config contractは未追加。
- Safe change surface: AGENTS 1.1/7、fixture/helper、新規spec、package/config、CI、contractだけ。UI/domain/routeは変更しない。
- Unknowns: Mobile locatorの実ブラウザ一意性、dynamic config importの安定性、Cloudflare実deploy結果。

## Subagent判断

- `implementation_mapping`: mobile project filter、shell/CSS、fixture helperを調査。filter修正と既存fixture再利用を採用。Profile変更案は対象外のため不採用。
- `test_mapping`: CI contractとPlaywright webServer空白を調査。CI順序・無条件step・config contractを採用。
- `clock_reset_mapping`: 新旧Run 5成果物とschema手段を調査。最終artifact列挙とevaluation schema検証を採用。
- 3件ともread-onlyで、編集・作成・削除・rename・Git/GitHub操作なし。
