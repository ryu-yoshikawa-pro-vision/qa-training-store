# Issue #93 商品詳細Rating Anchor調査・修正計画

## 0. 依頼概要

- 依頼内容: 商品詳細の評価リンクを初回のMouse click／Keyboard EnterでReview Sectionへ遷移させる。
- 背景: Issue #93では、Current `main`相当で`href="#reviews"`の初回Anchor操作が成立せず、2回目で遷移する場合が報告されている。
- 期待成果: 現象を実Browserで再現した場合だけ原因を特定し、Browser native Anchor semanticsを保った最小修正と回帰テストを提供する。再現できなければsource変更なしで停止する。

## 1. ゴール / 完了条件

- ゴール: Mouse click 1回、Keyboard Enter 1回、`/products/...#reviews`直リンクのすべてでReview Sectionが確認可能な位置に表示されることを、URL fragment・target DOM・Sticky Headerとの関係と合わせて確認する。
- 完了条件（DoD）:
  - Current `main`相当のBaselineでIssue本文の現象を再現する、または再現不能条件を十分に記録する。
  - 再現時は初回だけ失敗するRoot CauseをEvidenceで分類し、原因だけを最小差分で修正する。
  - `#reviews`、Review Sectionのfocusability、Keyboard操作、deep link、既存Product Detail機能を維持する。
  - 修正時は既存Playwrightを中心にRegressionを追加または更新し、指定Validationを実行する。
  - 修正完了時だけcommit／push／OPEN PRを作成する。再現不能時は実装・commit・push・PRを行わない。

## 2. 現状理解と前提

- Current understanding:
  - `ProductDetailView`はRatingをネイティブ`<a href="#reviews">`で描画し、同じComponent内の`<section id="reviews" tabIndex={-1}>`をtargetにしている。
  - Productデータ取得とReview一覧取得は非同期で、Product Detailがloadedになった後にRatingとtargetが同時に描画される。
  - Web Storefront Headerのレスポンシブ定義は複数箇所にあるため、今回のレビュー対応ではHeader本体を変更せず、Review target向けの`scroll-margin-top`をDesktop（900px以上）のみに適用する。
  - 現在の作業HEAD `cf5b7b0`は`origin/main`よりIssue #108／#111の2コミット後方だが、差分はAdmin overflow、SearchCombobox、Run／Plan文書であり、Product Detail／Header／関連E2Eの実装は変わっていない。これをRuntimeで確認する。
  - Issue #93はOPEN、追加コメントはない。
- Assumptions:
  - Repositoryが定義するWeb保証範囲としてPlaywright Chromiumを主対象とし、Desktop 1440×1000を主Viewport、Mobile 390×844を補助確認に使う。
  - `default` ScenarioをGuestの再現条件として既存Playwright Fixtureで初期化する。
  - `origin/main`との差分が関連経路へ影響しないことをread-only diffで確認できれば、ユーザー指定branchのHEADをIssue #93のCurrent `main`相当Baselineと扱う。rebase／mergeは行わない。
- Non-goals:
  - Review機能本体、Rating表示形式、Product Detail全体のlayout redesign、Gallery／Variation／Cartの設計変更。
  - 再現根拠のない`scrollIntoView`、専用click handler、`preventDefault`、固定待機、hash書換え、retry、polling。
  - Generic hash navigation abstraction、dependency update、無関係な既存failureの修正。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue本文が停止条件、Non-goals、DoD、確認対象を定義している。
- 仮定してよい細部: 既存の`playwright.config.ts`と`e2e/web/fixtures.ts`の起動・Scenario resetを再利用し、test-only production hookは追加しない。
- 未回答の重要質問: なし。実際のbrowser結果によりRoot Causeと修正有無を決定する。

## 4. 影響範囲

- Impacted areas:
  - Web Product DetailのRating Anchor、Review target、Storefront sticky Header、URL fragment／scroll／focusの実Browser挙動。
  - 既存Playwright Chromium、Accessibility、Component Test、Product DetailのGallery／Variation／Cart回帰。
- Files to inspect:
  - `src/presentation/pages/product-detail-page.tsx`
  - `src/presentation/shells/storefront-shell.tsx`
  - `src/presentation/shells/app-frame.tsx`
  - `src/presentation/root-layout.web.tsx`
  - `src/presentation/styles/global.css`
  - `app/products/[productId].tsx`
  - `e2e/web/fixtures.ts`
  - `e2e/web/phase1-required.spec.ts`
  - `e2e/web/accessibility.spec.ts`
  - `tests/component/catalog-pages.test.tsx`
  - `tests/component/presentation-foundation.test.tsx`
  - `playwright.config.ts`、`package.json`、`.github/pull_request_template.md`

## 5. 変更方針

- Change strategy:
  1. Issue本文・仕様・Git状態・関連コード・既存Test・起動条件を固定し、Gray-box QA Charterを検証する。
  2. BEFORE Working Tree Snapshot取得後、fresh sessionのMouse、Keyboard、direct hashを実Browserで操作し、URL、DOM、bounding box、sticky header境界、focus、consoleを記録する。2回目操作は1回目の状態を記録した後だけ行う。
  3. 現象が再現できた場合、Anchor／target存在性、hydration、async layout shift、focus、sticky header、routerのどの分類かを追加Evidenceで切り分ける。再現不能の場合はここでsource変更を停止する。
  4. 再現時だけ、Root Causeに直接対応する最小のproduction変更と既存層のRegression Testを実装する。native Anchor semanticsとfragmentを維持する。
  5. targeted test、指定静的検証、Component／E2E／a11y、`verify`、diff reviewを順に実行し、failureは初回異常と派生エラーを分離してbounded repairする。
  6. Run Artifactをsanitizeし、変更時だけbranch safetyを再確認してcommit／push／PRを作成する。
- 実行タスク:
  - [ ] 1. Issue・仕様・Git・関連config・既存testを固定する
  - [ ] 2. Gray-box Charterを作成・検証し、BEFORE Snapshotを取得する
  - [ ] 3. Current baselineのfresh ChromiumでMouse初回操作を再現する
  - [ ] 4. fresh ChromiumでKeyboard初回操作とdirect `#reviews`を確認する
  - [ ] 5. 再現結果からRoot Causeと実装要否を判定する
  - [ ] 6. 再現時だけ最小修正とRegression Testを実装する
  - [ ] 7. targeted／指定／統合Validationを実行する
  - [ ] 8. 最終diff review、sanitizer、commit／push／PR確認を行う

## 6. 検証方法

- Validation plan:
  - Runtime: Playwright Chromium 1.62.0、Desktop 1440×1000、Mobile 390×844（必要時）、devまたは既存E2E相当の起動方法を記録する。
  - User-visible: Rating href、初回Mouse click、fresh pageでの初回Keyboard Enter、direct `#reviews`、URL fragment、Review target bounding boxとviewport／Desktop header境界、console error。Review Sectionのfocusabilityは既存markupを維持し、E2Eではfocus stateや`tabIndex`数値を固定しない。
  - Code／test: 変更時は最寄りのComponent／E2Eを先に実行し、`pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run test:component:web`、`pnpm run test:e2e:chromium`、`pnpm run test:a11y`、`git diff --check`、`pnpm run verify`を実行する。
  - QA artifact: `qa-charter.json`、BEFORE／AFTER Snapshot、candidate／final `qa-findings.json`、`.artifacts/`のraw screenshot／DOM／consoleをcurrent Runへ保存し、契約validatorとsanitizerで確認する。
- 成功判定:
  - 再現時は修正後のMouse／Keyboard／direct hashが初回で成立し、指定ValidationがPASSする。
  - 非再現時は実行環境・条件・全結果・runtime evidence・追加再現条件を記録し、source diffが0である。

## 7. リスクと未解決論点

- Risks:
  - 初回Anchor移動後の画像／Review非同期描画によるlayout shiftを、単なるscroll不足と誤認する可能性がある。操作直後と安定後の位置を分けて採取する。
  - Sticky Headerによる部分的な隠れを「遷移失敗」と誤認する可能性がある。Headerの実高さとtargetのviewport上端を比較する。
  - `origin/main`の未取り込み変更を原因と誤認しないよう、関連ファイル差分を事前に確認する。
  - Dev server／browser環境差でIssueを再現できない可能性があるため、browser version、viewport、起動条件、consoleを記録する。
- Open questions:
  - 初回操作が実際に失敗するか、失敗する場合の最初の異常分類はRuntime evidence取得後に決定する。

## 8. 成果物

- 変更ファイル: Root Causeが再現された場合のみ、必要なproduction／testファイル。再現不能時はsource変更なし。
- 付随ドキュメント: current Run `.codex/runs/20260904-180025-JST/`、本計画書、必要なQA evidence。`docs/reports/`はIssueのdurable調査レポートとして明示必要になる場合のみ使用する。

## 9. 備考

- Issue #93のSTOP条件を、一般的な「念のための改善」より優先する。
- Commit／Push／PRは再現、修正、Validationが完了した場合だけ実施し、mergeは行わない。
