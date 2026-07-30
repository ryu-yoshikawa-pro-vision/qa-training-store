# UI/UX Continuous Excellence 実行計画

## 0. 依頼概要
- 依頼内容: `docs/plans/2026-07-28_goal.txt`の全指示を実行し、全37画面・4 Role・主要状態・Desktop／Tablet／Mobileを監査して、既存仕様を維持したままUI/UX品質を継続改善する。
- 背景: 直前の`61d52d3`でDesign Systemを統合し、`2b15e6a`でTable semantics／font／touch target／Visual Harnessを補正済み。ただし現行Visual ReviewはDesktop／Tablet各12画面、Mobile 7画面に限られる。
- 期待成果: 全Route coverage、重大度付きBaseline Audit、Wave別の必要最小限の改善、Before／After証跡、全Regression、完了基準監査、指定形式の最終報告。

## 1. ゴール / 完了条件
- ゴール: Storefront、customer、Adminの全画面を、明確さ・一貫性・操作性・信頼感・Accessibility・情報設計の観点で高品質にし、Critical／High／修正可能なMediumを0件にする。
- 完了条件（DoD）:
  - 正式Route 37画面を実装とScreenshotの両方で確認する。
  - Guest／customer／operator／admin、1440×1000／1024×900／390×844を確認し、主要Flowは320×700でも完了できる。
  - 全Waveで問題選択→最小実装→対象Test→一意Stage撮影→比較→次判断を実施する。
  - 直近2回の最終Visual Reviewで新しい重要問題がない。
  - Goal指定の必須Regressionと、利用可能なMobile／cross-role／Firefox／WebKitを実行する。
  - Domain／Application／Database／Seed意味／Route／Permission／Test Control／Build／Deploy契約を変更しない。

## 2. Repo mapping

### Entry points
- Root／runtime: `app/_layout.tsx`、`src/presentation/providers/app-runtime-provider.tsx`、`src/presentation/shells/app-frame.tsx`
- Route guard: `src/presentation/guards/route-guard.tsx`
- Shell: `src/presentation/shells/storefront-shell.tsx`、`src/presentation/shells/admin-shell.tsx`
- Pages: `src/presentation/pages/*.tsx`
- Shared UI: `src/presentation/components/*.tsx`、`src/presentation/patterns/admin-patterns.tsx`
- Visual foundation: `src/presentation/design/tokens.ts`、`src/presentation/styles/fonts.css`、`src/presentation/styles/global.css`
- Visual/Test harness: `playwright.config.ts`、`e2e/web/ui-review.spec.ts`、`e2e/web/accessibility.spec.ts`、`e2e/web/mobile-boundary.spec.ts`

### Main flow
- Expo Routerの`app/**`は薄いfaçadeで、`AppRuntimeProvider`がcurrent userとApplication serviceを供給する。
- `AppFrame`が`/admin` prefixでStorefront／Admin shellを切り替え、`RouteGuard`がpublic、guest-or-customer、customer、staff、admin、automation-adminを判定する。
- Pageは既存Use Case／DTOだけを読み、shared componentとGlobal CSSで表示する。
- Playwright fixtureはSeed Scenarioをresetし、Role login／状態準備後にE2EとScreenshotを行う。

### Key abstractions
- Navigation／chrome: `StorefrontShell`、`AdminShell`、`AccountNavigation`
- State／feedback: `StatePanel`、`FormErrorSummary`、`StatusBadge`、`ConfirmDialog`
- Commerce: `ProductCard`、`ProductImage`、Catalog／Cart／Checkout pages
- Admin: `PageHeader`、`FilterBar`、`ResourceTable`、`ContextualSaveBar`
- Test control: `scenario` fixture、`window.__TEST_API__`、Playwright UI Review stage

### Existing tests
- Unit 22、Integration 89、Repository 13、Component 47、Contract 20が直前RunでPASS。
- Required Chromium E2E 14、a11y 3、Mobile Boundary 3、Mobile Required 14、Cross-role 1、Firefox/WebKit smoke各1が直前の大規模UI RunでPASS。
- 現行Visual ReviewはDesktop／Tablet各12、Mobile 7で、全Route／edge state／keyboard／320pxは未充足。

### Safe change surface
- Presentation: `src/presentation/**`
- UI test／Visual Harness: `e2e/web/**`、`tests/component/**`、`playwright.config.ts`
- 必要なRun Artifactと本計画。
- `app/**`はRoute wiringを変えず、edge stateの表示上どうしても必要な場合だけ局所変更する。

### Unknowns
- 全37画面の現状Visual品質と、現行Harness外のrouteにCritical／High／Mediumがあるか。
- 320pxで`html { min-width: 360px; }`が実際にoverflowを起こすか。
- Mobile fixed navigationがForm／CTA／footerを実操作で隠すか。
- 全RouteのAxe結果と、実ブラウザTab順／Dialog focus／Combobox keyboard操作の残課題。

## 3. 現状理解と前提
- Current understanding:
  - Design baselineはWhite／暖色Off White、Dark Navy `#111827`、限定Gold `#C6A15B`、AA対応Gold文字`#7A5B22`、1,280px content、8px Grid、44px target。
  - Storefrontは商品画像と購入判断、AdminはTable／Formの可読性と業務効率を主役にする。
  - 正式Routeは公開13、customer 11、Admin 13の計37画面。
  - Adminは1024px未満でDesktop案内を表示する既存契約。
  - 直前Baselineは`output/ui-review/review-fix-final-20260728-v3`で、既存Beforeは上書き禁止。
  - `global.css`は後勝ちの同名Ruleが多いため、最終有効Ruleだけを局所編集する。
- Assumptions:
  - 1024×900はScreenshot上Tabletという名称だが、Admin契約上は操作可能境界として扱う。
  - 同一Presentationを共有するRole／状態は代表Scenarioで検証し、coverage表で代表関係を明示する。
  - 各WaveはAuditで有効な問題がなければ検証のみで完了してよい。
- Non-goals:
  - Domain／Use Case／DB／Seed／Route／auth／permission／価格／割引／送料／在庫／注文／Payment／Review集計の変更。
  - Wishlist、Recommendation、Coupon、Point、Chart、Guest Checkout等の新機能。
  - CSS Architecture全面再構築、Design System Library導入、外部API／font／画像、Deploy、Git mutation。
  - 参考画像の配色・機能の模倣、主観的な装飾、既存Screenshotの削除・上書き。

## 4. 質問 / 曖昧性
- 必ず質問する不透明点: なし。Goalが対象、制約、優先順位、完了基準、自律判断範囲を明示している。
- 仮定してよい細部: 一意Stage名、同一UIを共有する状態の代表化、Wave内の修正順、追加Screenshotの切り出し。
- 未回答の重要質問: AuditでDomain／Route／外部Service／大規模仕様変更が必要な問題を発見した場合は実装せず、残存課題へ記録する。

## 5. 影響範囲
- Impacted areas:
  - UI Review coverageとStage成果物。
  - 必要に応じた共通foundation、Storefront、Checkout／Account、Admin、Edge StateのPresentation。
  - Behavior／Accessibility／Responsive boundaryを守るTest。
- Files to inspect／change candidates:
  - `playwright.config.ts`
  - `e2e/web/ui-review.spec.ts`
  - `e2e/web/accessibility.spec.ts`
  - `e2e/web/mobile-boundary.spec.ts`
  - `tests/component/presentation-foundation.test.tsx`
  - `src/presentation/styles/global.css`
  - Baseline Auditで問題原因となった`src/presentation/pages|components|shells|patterns/**`

## 6. 変更方針
- Change strategy:
  1. Visual HarnessをUI非変更のまま全37Routeへ拡張し、Role／Scenario／ready条件／一意filenameを固定する。
  2. `goal-baseline-<timestamp>`をDesktop→Tablet→Mobileの順に`--workers=1`で生成し、代表Screenshotを全件実見する。
  3. Audit backlogをCritical→High→Mediumの順に確定し、関連性のある問題だけを各Waveへ割り当てる。
  4. Wave 1〜5を最小差分で進め、変更しないWaveも検証結果を残す。
  5. 最終Regression後、異なる一意StageでVisual Reviewを2回行い、重要問題が増えていないことを確認する。
- 実行タスク:
  - [ ] 全Route／Role／State coverageをUI Review Harnessへ追加する。
  - [ ] Baseline Stageを撮影・実見し、重大度付きAuditをRun Reportへ記録する。
  - [ ] Wave 1 Foundationの有効な問題を修正・検証する。
  - [ ] Wave 2 Storefrontの有効な問題を修正・検証する。
  - [ ] Wave 3 Checkout／Accountの有効な問題を修正・検証する。
  - [ ] Wave 4 Adminの有効な問題を修正・検証する。
  - [ ] Wave 5 Edge Stateの有効な問題を修正・検証する。
  - [ ] Keyboard／Axe／320px／overflow／touch targetの不足Testを追加する。
  - [ ] 全Regressionと最終Visual Review 2回を完了する。

## 7. 検証方法
- Validation plan:
  - Wave単位: `format:check`、`typecheck`、対象Component Test、対象E2E、a11y／mobile boundary、Web Build。
  - 最終:
    - `pnpm install --frozen-lockfile`
    - `pnpm run format`
    - `pnpm run format:check`
    - `pnpm run lint`
    - `pnpm run typecheck`
    - `pnpm run test:unit`
    - `pnpm run test:integration`
    - `pnpm run test:repository`
    - `pnpm run test:component`
    - `pnpm run test:contracts`
    - `pnpm run build:web`
    - `pnpm run test:e2e:chromium`
    - `pnpm run test:a11y`
    - `pnpm run test:e2e:mobile-boundary`
    - `pnpm run test:e2e:mobile`
    - `pnpm run test:e2e:cross-role`
    - `pnpm run test:e2e:smoke:firefox`
    - `pnpm run test:e2e:smoke:webkit`
    - `git diff --check`
  - Visual: 各StageをDesktop／Tablet／Mobileで順次実行し、既存Stageを再利用しない。
- 成功判定:
  - 未実行をPASSとしない。
  - Axe Critical／Serious 0、水平overflow 0、主要target 44px以上、Keyboard flow成功。
  - Critical／High／修正可能なMedium 0、直近2回のVisual Reviewで新しい重要問題0。
  - Domain／Application／DB／Seed／Route／Permission差分0。

## 8. リスクと未解決論点
- Risks:
  - 全Route captureの準備処理が長大化するため、既存fixture helperとScenarioを再利用し、業務操作を変えない。
  - `global.css` cascadeの副作用は対象selectorと関連Viewportだけを先に検証して抑える。
  - Windows Nodeだけが存在しWSL PATHにないため、repository外副作用を避けた一時runnerを使い、完了時に標準成果物から分離する。
  - Browser未導入時は既存install状態を確認し、実行不能なら理由と未実行を明記する。
- Open questions:
  - Baseline Audit後にのみ具体的なUI修正Backlogを確定する。
  - 文書のFont／Breakpoint／Seed Version driftは今回のUI実装と分離し、必要なら残存課題として報告する。

## 9. 成果物
- 変更ファイル:
  - 本計画、Run Artifact、全Route Visual Harness、Auditで必要性を確認したPresentation／Testだけ。
- 付随ドキュメント:
  - `.codex/runs/20260728-115847-JST/PLAN.md`
  - `.codex/runs/20260728-115847-JST/TASKS.md`
  - `.codex/runs/20260728-115847-JST/REPORT.md`
  - `.codex/runs/20260728-115847-JST/run.json`
  - Final Visual Stages in `output/ui-review/`

## 10. Follow-up notes
- 参考6画像は原則だけを採用し、Chart／Wishlist／Social Login等のPhase 1非目標は実装しない。
- 過去RunのHigh／Medium 0という判断を尊重しつつ、現行Harness外の画面とGoal固有の320px／Keyboard／全Route条件を新しい根拠で再評価する。
