# QA学習用ECアプリ Phase 1 最終修正計画

## 0. 依頼概要

- 依頼内容: 再レビューで残ったRun Artifact、Mobile staff LogoutのPR検証、Deploy Smokeのlocal server依存、CI Contractの問題だけを最小差分で修正する。
- 背景: 前回Strict RunのJSONと正式Planが欠落し、PRではMobile境界が未検証、deployed smokeでもExpo serverが起動し得る。
- 期待成果: 新旧Runの正式成果物を揃え、Mobile境界2件、deploy URL validation、Playwright/CI契約を実装し、指定検証を完了する。

## 1. ゴール / 完了条件

- ゴール: 添付指示の作業順と禁止事項を守り、Phase 1最終修正の全DoDを実装・実測する。
- 完了条件（DoD）:
  - 新規Strict Runの5成果物、前回Runの5成果物、前回/今回の正式Planが存在する。
  - `AGENTS.md`が標準Run Artifactと一時ファイルを区別し、過去Run保護を明記する。
  - `mobile-chromium`でoperator/adminのMobile Logout、session削除、route guardを専用E2E 2件として検証する。
  - PRを含む全validate eventで専用E2Eを実行し、full Mobile 14件はPR以外で維持する。
  - 有効なdeploy URL指定時はlocal Expo serverを起動せず、空URLはCIでSmoke前に失敗させる。
  - CI/Playwright Config Contract Testと全必須検証がPASSする。
  - PR本文更新案を新規Run REPORTと最終報告へ記載する。

## 2. 現状理解と前提

### Current understanding

#### Entry points

- Run policy/artifact: `AGENTS.md`、`.codex/runs/<run_id>/`、`.codex/templates/`
- Mobile E2E: `e2e/web/fixtures.ts`、`phase1-required.spec.ts`、`playwright.config.ts`
- Logout UI: `StorefrontShell`の`staff-mobile-actions`、`AdminShell`の`admin-viewport-warning__actions`
- CI/deploy: `.github/workflows/ci.yml`の`validate` / `deploy-preview` / `deploy-production`
- Contract: `tests/contracts/ci-workflow.test.ts`、新規Playwright Config contract

#### Main flow

- `scenario()`がTest API reset、reload、metadata、初期session、console error収集を共通化し、`login()`が認証操作を共通化する。
- Storefront staff actionは899px以下、Admin warningは1023px以下で表示され、Pixel 7設定の`mobile-chromium`からAccessible Role/Nameで操作できる。
- 現在の`mobile-chromium.testMatch`は`phase1-required.spec.ts`だけを許可するため、別specをCLI指定しても0件になる。
- 現在の`test:e2e:mobile`はproject全体を実行し、`phase1-required.spec.ts`の14件を対象にしている。
- `deployed-smoke`はbaseURLだけをdeploy URLへ切り替えるが、config全体の`webServer`は常に定義されている。
- deploy jobsはWrangler outputをSmokeへ渡すが、output非空を検証していない。

#### Key abstractions

- Playwright fixture `scenario` / helper `login`
- localStorage key `scenario-shop.session-id`
- Playwright project `mobile-chromium` / `deployed-smoke`
- Wrangler step output `steps.deploy.outputs.deployment-url`
- Run manifest / evaluation schema

#### Existing tests

- `phase1-required.spec.ts` 13/14がcustomer/admin Logoutとsession削除・guardをDesktop/full Mobileで検証する。
- `logout-button.test.tsx`がStorefront staff actionとAdmin warningの配置をcomponentで検証する。
- `ci-workflow.test.ts`がjob分離、Production build、deploy output、Smoke順序を文字列契約として検証する。
- Playwright Configのdeploy/local `webServer`境界を直接検証するContract Testはない。

#### Safe change surface

- `AGENTS.md` 1.1と7への指定方針追記
- fixtureへのsession削除確認helper追加と既存logout E2Eでの再利用
- 新規`mobile-boundary.spec.ts`
- package scriptsと`mobile-chromium.testMatch`の局所更新
- `playwright.config.ts`の環境変数判定とwebServer条件
- CI stepと既存CI contract、新規Playwright config contract

#### Unknowns

- 実ブラウザでMobile locatorが表示要素1件に一意となるかは専用E2Eで確認する。
- Dynamic importによるPlaywright Config contractがVitest環境で安定するかはtargeted contractで確認する。
- Cloudflare secretsと実deploy URLはlocalでは検証せず、CI実行時だけ確定する。

### Assumptions

- 空文字または空白だけの`DEPLOYED_BASE_URL`はlocal扱いとし、deployed project baseURLもlocal URLへ正規化する。
- `mobile-chromium`のtestMatchへ2 specを許可し、`test:e2e:mobile`は`phase1-required.spec.ts`を明示して14件を維持する。
- session削除確認はfixtureの共通helperへ抽出し、既存2件と新規2件で再利用する。

### Non-goals

- 添付指示「変更してはいけないもの」の全項目。
- Profile/logout本体、shell DOM/CSS、Route、DB、Seed、Clock、a11y対象、UIの変更。
- Git/GitHub mutation、PR本文直接更新、Cloudflare実Deploy。
- Workflow/Playwrightの過剰な抽象化、既存test削除、skip/only/retry/timeout変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。目的、順序、対象、非目標、DoD、検証方法は添付指示で確定している。
- 仮定してよい細部: session確認helper名、Contract Test内のmodule reload helper、CI contractの局所抽出方法。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Run Artifact policyと新旧Run/Plan
  - Mobile Playwright fixture/spec/project/package script
  - Deploy target判定とPlaywright webServer
  - GitHub Actions validate/deploy step
  - CI/Playwright contract
- Files to inspect/change:
  - `AGENTS.md`
  - `.codex/runs/20260727-134412-JST/{run.json,evaluation.json}`
  - `.codex/runs/20260727-184001-JST/{PLAN.md,TASKS.md,REPORT.md,run.json,evaluation.json}`
  - `docs/plans/2026-07-27_135212_phase1-repair.md`
  - `docs/plans/2026-07-27_184001_phase1-final-repair.md`
  - `e2e/web/fixtures.ts`
  - `e2e/web/phase1-required.spec.ts`
  - `e2e/web/mobile-boundary.spec.ts`
  - `package.json`
  - `playwright.config.ts`
  - `.github/workflows/ci.yml`
  - `tests/contracts/ci-workflow.test.ts`
  - `tests/contracts/playwright-config.test.ts`

## 5. 変更方針

- Change strategy:
  - Artifact復元: 前回JSON/Planは指定commitの原文を維持し、今回情報を混在させない。
  - Policy: ユーザー指定分類を1.1へ追加し、7へcleanup保護を1行追加する。
  - Mobile: fixture共通処理を再利用し、2件の専用specをAccessible Role/Nameだけで操作する。
  - Project boundary: mobile projectはfull specとboundary specを許可し、full script側で14件の対象を明示する。
  - Deploy boundary: deploy URLをtrim判定し、有効時だけdeployed baseURL/undefined webServer、空時はlocal baseURL/local webServerとする。
  - CI: Accessibility後に無条件Mobile boundary step、各deploy直後にURL validationを追加する。
  - Contract: Mobile stepの無条件性、deploy→validate URL→Smoke順序、output参照、Playwrightの3環境状態を固定する。
- 実行タスク:
  - [x] 1. 新規Strict Runを初期化する。
  - [x] 2. 前回RunのJSONを原文復元する。
  - [x] 3. 前回正式Planを原文復元し、今回Planを別fileへ保存する。
  - [x] 4. `AGENTS.md`のRun Artifact方針を明確化する。
  - [x] 5. fixture/package/configを含むMobile境界E2Eを追加する。
  - [x] 6. Deploy Smokeのlocal server依存を解消する。
  - [x] 7. CI stepとContract Testを更新する。
  - [x] 8. 指定順に全検証し、必要ならbounded repairを行う。
  - [x] 9. Run Artifact/evaluation/PR本文案を最終化する。

## 6. 検証方法

- Validation plan:
  - Artifact: 新旧Run各5件、前回/今回Plan、temporary files不在をread-only列挙する。
  - Dependency: `pnpm install --frozen-lockfile`
  - Static: format、format:check、lint、typecheck、image manifest、security
  - Tests: unit、integration、repository、component、contracts
  - Build: automation `build:web`、production env `build:web`
  - E2E: Chromium、a11y、mobile-boundary
  - Optional: full Mobile、cross-role、Firefox、WebKit
  - Contract listing: full Mobile 14件、boundary 2件を`--list`で確認する。
  - Schema: evaluation schema validationとrun/evaluation JSON parseを確認する。
- 成功判定:
  - 必須コマンドがexit code 0。
  - Mobile boundary 2件がPixel 7でPASSし、full Mobileは14件のまま。
  - Playwright contractで未指定/有効/空文字のwebServerとbaseURLが期待どおり。
  - CI contractでPR除外なし、deploy URL validation順、output参照を確認する。
  - 標準Run Artifact以外の一時fileをRun Directoryへ残さない。

## 7. リスクと未解決論点

- Risks:
  - project `testMatch`更新だけだとfull Mobileが16件になるため、full scriptの対象明示を同時に行う。
  - hidden desktop/mobile duplicate locatorは可視性で一意となるが、必要ならvisible containerへrole locatorをscopeする。
  - raw config dynamic importは環境変数/module cacheに依存するため、各testでreset/restoreする。
  - Cloudflare output空はCI shellでfailし、Playwright側ではlocal実行との互換性のため空文字をlocal扱いにする。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: 「4. 影響範囲」の必要最小file。
- 付随ドキュメント:
  - 本計画書。
  - 新規Strict Runの5成果物。
  - 復元した前回Run JSON 2件と正式Plan。
  - `docs/reports/`は作成しない。

## 9. 備考

- read-only subagent 3件へMobile実装面、test/CI面、artifact/policy面を分担した。親agentは`mobile-chromium`のfile filter不足、CI/Playwright契約、artifact schema確認を採用し、今回対象外のProfile変更提案は不採用とした。
- `feature-plan`により、事実と仮定、pure config判断とbrowser/CI副作用、consumer-facing E2Eと内部contractを分離した。
