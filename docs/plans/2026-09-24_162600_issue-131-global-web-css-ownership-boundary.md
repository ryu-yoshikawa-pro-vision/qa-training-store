# Issue #131 Global Web CSS ownership boundary整理 Plan

## 0. 依頼概要

- 対象Issue: #131 `refactor: Global Web CSSのownership boundaryを整理する`
- 作業branch: `plan/issue-131-global-web-css-ownership-boundary`
- branch作成時の`main`: `ac4e57721b55091ace3689eda289d44188241aee`
- 今回はPlanのみを作成する。CSS実装、テスト変更、PR作成、Issue更新、mergeは行わない。
- 目的は`global.css`を分割することではなく、局所UI変更時に確認・変更すべきstyle boundaryを特定でき、無関係な画面・selector・breakpointまでglobal cascade全体を追う必要を減らすことである。

## 1. 結論

Current `main`でもIssue #131の問題は残っているため、Refactor実装は必要と判断する。

Current `main`の`src/presentation/styles/global.css`は、Phase 6 investigation baseline `856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`と同じblob `226a90d371f3960a722172b6249893a771180dd1`である。

- Current `main`: 5,348 lines / 88,146 chars
- Phase 6 investigation baseline: 5,348 lines / 88,146 chars
- blob SHA: 両方とも`226a90d371f3960a722172b6249893a771180dd1`
- Audit baseline `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c`: 5,161 lines / blob `6c88ba16b182a474e7e3146f7c5c4d05dee57c75`

したがって、Phase 6後に別実装でownership問題が解消されたとは判断できない。

またCurrent CSSでは、同じselectorが複数の基礎定義・後段上書き・media queryへ分散している。

例:

- `.storefront-header__inner`: baseと複数responsive blockに分散
- `.admin-main`: base、1023px以下、1180px以下、1024〜1100pxなどへ分散
- `.product-detail-page`、`.home-hero`、`.product-grid`、`.catalog-filters`等も複数箇所に分散
- `@media (max-width: 899px)`が複数blockに存在
- `@media (max-width: 767px)`も複数blockに存在
- 後半の`Premium commerce refresh`等で既存selectorが再定義され、同一featureのstyleをファイル内の複数位置から追う必要がある

これはIssueが問題としている「変更理由ごとのownershipが不明瞭で、局所変更でもglobal cascade全体を意識する必要がある」状態に一致する。

採用する構成は次とする。

1. `global.css`はWeb全体のfoundationだけを所有する。
2. 新規`shared.css`はStorefront / AdminをまたぐWeb presentation primitiveを所有する。
3. 新規`storefront.css`はStorefront / Customer / Public UIを所有する。
4. 新規`admin.css`はAdmin UIを所有する。
5. responsive ruleは独立した`responsive.css`へ集約せず、対象selectorのowner fileへ置く。
6. `root-layout.web.tsx`でCSS import orderを明示し、`tests/contracts/architecture.test.ts`でそのorderとNative非importを保護する。
7. class名rename、CSS Modules全面移行、Cascade Layers導入、design system刷新、新CSS framework導入は行わない。

## 2. Current mapping

### 2.1 Web composition root

CurrentのWeb rootは`src/presentation/root-layout.web.tsx`で、次の順にCSSをimportしている。

```ts
import "@/presentation/styles/fonts.css";
import "@/presentation/styles/global.css";
```

`tests/contracts/architecture.test.ts`にも、Web-only CSSをWeb composition rootからimportし、Native rootではCSSをimportしない契約がある。

Expoの公式資料でも、Global CSSはWeb専用で、Expo Routerではroot layoutから読み込む構成が推奨されている。今回もWeb root importを維持し、nested layoutや各pageへglobal CSS importを分散させない。

参考:

- https://docs.expo.dev/router/web/static-rendering/
- https://docs.expo.dev/guides/tailwind/
- https://docs.expo.dev/versions/v54.0.0/config/metro/#css

### 2.2 Current `global.css`の責務

Phase 6 reportでは次を同一global cascadeが担当していると整理されている。

- Web shell
- Admin
- Storefront
- form / table
- catalog / cart / checkout / order / review
- responsive
- accessibility state

Current mainでもこの構造は変わっていない。

Current file内には少なくとも次の責務が混在する。

#### Web foundation

- `:root` custom properties
- `*`
- `html`
- `body`
- anchor
- `:focus-visible`
- `.sr-only`
- reduced motion

#### Shared presentation

- buttons
- status / test-mode badges
- state panel
- form error summary
- dialog
- breadcrumbs
- page header
- common form patterns
- shared table / scroll container
- common notice / message patterns

#### Storefront / Customer / Public

- Storefront header / navigation / footer
- Home
- Catalog / Search
- Product
- Cart
- Login / Signup
- Account / Address
- Checkout
- Order
- Review
- Guide / Legal

#### Admin

- Admin shell / sidebar / main
- Admin metrics
- Product editor
- Inventory / Order / Review / User surfaces
- resource tables
- viewport warning
- Admin-specific forms / action panels

### 2.3 Current responsive ownership

Current `global.css`には15個のmedia blockがあり、主な境界は次。

- `min-width: 900px`
- `max-width: 1023px`
- `max-width: 899px`
- `max-width: 599px`
- `max-width: 800px`
- `prefers-reduced-motion`
- `max-width: 1180px`
- `1024px〜1100px`
- `max-width: 767px`
- `max-width: 420px`
- `900px〜1180px`
- `max-width: 1100px`
- `max-width: 600px`

同じbreakpointが複数の離れた位置に存在し、StorefrontとAdminのresponsive ruleも同一stylesheet内にある。

一方、`docs/spec/ui-ux-contract.md`では基本responsive boundaryを次としている。

- Mobile: 767px以下
- Tablet: 768〜1023px
- Desktop: 1024px以上
- Storefront / Customer追加境界: 390×844、320×700
- Admin: 1024px未満では管理操作を提供しない

Issue #131では既存behavior維持が必須なので、今回のRefactorではbreakpoint値を統一・正規化しない。900px、1180px等のfeature固有boundaryも、Current behaviorに必要ならそのまま維持する。

### 2.4 Current protection

既存の主な保護は次。

- `tests/contracts/architecture.test.ts`
- `tests/contracts/visual-contract.test.ts`
- `e2e/web/accessibility.spec.ts`
- `e2e/web/mobile-boundary.spec.ts`
- `e2e/web/phase1-required.spec.ts`
- `e2e/web/ui-ux-improvements.spec.ts`
- `e2e/web/ui-review.spec.ts`
- `.github/workflows/ci.yml`

Web CIはPRで以下を実行する。

- format / lint / typecheck / contract tests
- automation / production Web build
- Chromium E2E
- accessibility
- mobile boundary
- UI review screenshots
  - 1440×1000
  - 1024×900
  - 390×844
  - 320×700
- production smoke
- final verify

したがって、今回のRefactor用に新しいvisual testing frameworkを追加する必要はない。

## 3. ゴール / 完了条件

### 3.1 ゴール

Web CSSについて、次の質問へCurrent sourceだけで回答できる状態にする。

- 全Web共通のfoundationはどこか。
- StorefrontとAdminの両方で使うpresentation primitiveはどこか。
- Storefront固有styleはどこか。
- Admin固有styleはどこか。
- responsive ruleは誰が所有するか。
- selectorを変更した時に、どのE2E / accessibility / visual確認が必要か。

### 3.2 完了条件

実装後に次を満たす。

- `global.css`はfoundation responsibilityだけを持つ。
- `shared.css`、`storefront.css`、`admin.css`のownershipをファイル先頭コメントと実際のselector配置から説明できる。
- Storefront固有selectorがAdmin fileへ入らない。
- Admin固有selectorがStorefront fileへ入らない。
- shared selectorをStorefront / Admin fileで重複定義しない。
- responsive ruleは対象selectorを所有するfileへ配置する。
- 独立したresponsive dumping groundを作らない。
- Current className / DOM semantics / route / product behaviorを変更しない。
- Current CSS propertyの最終的な意味、specificity、cascade、responsive behavior、accessibility behaviorを維持する。
- Native stylingを変更しない。
- `root-layout.web.tsx`のCSS import orderをcontract testで固定する。
- E2E / accessibility / UI review / buildで意図しないUI差分がない。
- 新しいCSS framework、CSS-in-JS、CSS Modules全面移行、Cascade Layersを導入しない。

## 4. Ownership contract

### 4.1 `global.css`

責務:

- CSS custom properties
- document-level reset / box sizing
- `html` / `body`
- raw elementに必要な最小global behavior
- anchorの全体契約
- global focus-visible
- screen-reader-only utility
- global reduced-motion
- 全画面に必ず効くaccessibility / document behavior

入れないもの:

- `.storefront-*`
- `.admin-*`
- Catalog / Product / Cart / Checkout / Order / Review固有selector
- Admin editor / table / metrics固有selector
- feature固有breakpoint

### 4.2 `shared.css`

責務:

Storefront / Adminのどちらか一方の画面仕様ではなく、複数Web surfaceで再利用されるpresentation primitive。

候補:

- `.button*`
- status / test-mode badge
- state panel
- form error summary
- dialog
- breadcrumbs
- page header
- common form primitives
- common notices / operation messages
- consumerが複数領域にまたがるtable / scroll primitive
- 共通image stateなど、実際に複数ownerから利用されるもの

実装時にはclass名だけで分類せず、TSX consumerを確認して決める。

Storefrontでしか使われないselectorを「将来Adminでも使うかもしれない」という理由でsharedへ移さない。逆も同様。

### 4.3 `storefront.css`

責務:

- Storefront shell / header / footer / navigation
- Home
- Catalog / Search
- Product detail / product card
- Cart
- auth
- Account / Addresses
- Checkout
- Order
- Review
- Guide / Legal
- Storefront / Customer / Public固有のresponsive rule

### 4.4 `admin.css`

責務:

- Admin shell / sidebar / main
- Admin viewport warning
- Admin dashboard / metrics
- Admin product editor
- Admin Inventory / Order / Review / User / Test Control presentation
- Admin固有table / editor behavior
- Admin固有responsive rule

### 4.5 responsive rule

responsiveは「別責務」として1ファイルへ集約しない。

原則:

- Storefront selectorのmedia rule -> `storefront.css`
- Admin selectorのmedia rule -> `admin.css`
- shared primitiveのmedia rule -> `shared.css`
- document / reduced-motion -> `global.css`

既存breakpoint値はbehavior preservationのため維持する。Issue #131の範囲でbreakpoint taxonomy自体を再設計しない。

## 5. CSS import order

`src/presentation/root-layout.web.tsx`を次のorderにする。

```ts
import "@/presentation/styles/fonts.css";
import "@/presentation/styles/global.css";
import "@/presentation/styles/shared.css";
import "@/presentation/styles/storefront.css";
import "@/presentation/styles/admin.css";
```

理由:

- document foundationを先に適用する。
- reusable primitiveをfeature styleより先に適用する。
- StorefrontとAdminはclass ownershipを分離するため、相互上書きを前提にしない。
- order依存が必要なselectorが見つかった場合は、単純に後ろへ移して解決せず、そのselectorのownerを再確認する。

`@import`を使ったaggregator方式は採用しない。

理由:

- root compositionでload orderを直接確認できる。
- Expo Routerのroot layout import方針にそのまま沿える。
- `global.css`を「他CSSを読むだけのindex file」にしてownership名と実責務をずらさない。

## 6. Cascadeを壊さず移行する手順

### Task 0: 実装開始時にCurrent mainを再確認する

実装branchで最初に次を再確認する。

- `main` SHA
- Issue #131 state / body
- `global.css` blob SHA
- `root-layout.web.tsx`
- `architecture.test.ts`
- Web CI / E2EのCurrent command

もし`global.css`のblobが`226a90d371f3960a722172b6249893a771180dd1`から変わっている場合は、変更部分を再mappingしてから以下を進める。

### Task 1: selector ownership inventoryを作る

Current `global.css`のtop-level ruleとmedia ruleを、次へ分類する。

- foundation
- shared
- Storefront
- Admin

分類はselector名ではなくconsumerで決める。

確認対象:

- `src/presentation/shells/**`
- `src/presentation/pages/**`
- `src/presentation/components/**`
- `src/presentation/patterns/**`
- `src/presentation/root-layout.web.tsx`
- `app/**`

一時的な調査表はRun Artifactまたは実装メモに残してよいが、恒久的な新しいmanifest / registryは追加しない。

### Task 2: duplicate / override chainを整理する

Current fileには同一selectorの複数定義がある。

実装時は各selectorについて次を区別する。

1. base rule
2. 同じowner内の後段base override
3. responsive override
4. state / pseudo-class
5. Issue修正で後付けされた局所override

base ruleが複数位置へ分散している場合は、最終computed valueを確認し、同じowner file内の1つのbase ruleへ統合する。

一方、responsive overrideやstate ruleはbaseへ無理にflattenしない。

特に次のようなselectorを重点確認する。

- `.storefront-header__inner`
- `.admin-main`
- `.admin-shell`
- `.product-detail-page`
- `.home-hero`
- `.product-grid`
- `.catalog-filters`
- `.product-detail-hero`
- `.product-purchase-panel`
- `.cart-page`
- `.order-card`
- `.address-form-panel`
- `.resource-table*`

目標はselector数削減ではない。同じ変更理由のstyleを1つのownership boundaryから追える状態にすること。

### Task 3: foundationを`global.css`へ残す

まず`global.css`をfoundationへ縮小する。

この段階ではCSS値を変更しない。

移動対象を他fileへ移すだけとし、次を保持する。

- body scrolling contract
- focus-visible
- accessibility utility
- font inheritance
- color / spacing custom properties
- reduced motion
- existing root document behavior

### Task 4: shared selectorを`shared.css`へ移す

Storefront / Admin両方または複数Web featureで使うpresentation primitiveを移す。

consumerが一方しかないものはshared化しない。

移動後、shared selectorのfeature側再定義を残さない。ただしowner固有modifierやmedia ruleはowner fileに残してよい。

例:

- `.button`本体 -> shared
- Storefrontだけで使うbutton container -> Storefront
- Adminだけのaction panel -> Admin

### Task 5: Storefront selectorとresponsive ruleを`storefront.css`へ移す

Storefront / Customer / Publicを1つのownerとする。

Current後半の`Premium commerce refresh`のような「変更履歴単位」のblockは残さず、対象featureのcanonical sectionへ統合する。

ただし、値・specificity・breakpointを同時に改善しない。

### Task 6: Admin selectorとresponsive ruleを`admin.css`へ移す

Admin shell / pages / editor / tableをAdmin ownerへ移す。

1024px未満のAdmin viewport warningと1024〜1100px等の既存Admin responsive behaviorを同じowner fileに置く。

### Task 7: root importとarchitecture contractを更新する

`root-layout.web.tsx`へ新しいCSS file importを追加する。

`tests/contracts/architecture.test.ts`は最低限次を保護する。

- Web rootが`fonts.css`、`global.css`、`shared.css`、`storefront.css`、`admin.css`をこの順序でimportする。
- Native rootはCSSをimportしない。
- Native entry pointからWeb CSSを参照しない。

新しいCSS parserやownership lint toolは追加しない。

### Task 8: static ownership self-reviewを行う

実装後に一度、次を確認する。

- `.admin-` selectorが`storefront.css`に残っていない。
- `.storefront-` selectorが`admin.css`に残っていない。
- 同一exact selectorがowner fileをまたいで定義されていない。
- responsive ruleが対象owner fileにある。
- `global.css`へfeature selectorが残っていない。
- `Premium commerce refresh`等の時系列blockへfeature styleが残っていない。
- TSXのclassName renameが発生していない。

この確認のための一時コマンドは使ってよいが、新しい恒久lint scriptは追加しない。

## 7. 今回採用しない案

### 7.1 ファイルサイズだけを基準に等分する

採用しない。

行数を均等化してもownershipは明確にならない。

### 7.2 `responsive.css`を作る

採用しない。

selectorのbase styleとresponsive styleが別ownerへ分かれ、局所変更時に再び複数fileを横断するため。

### 7.3 CSS Modulesへ全面移行する

採用しない。

- className変更が大量に発生する。
- component sourceまで変更範囲が広がる。
- Issueの目的はglobal CSS技術の置換ではなくownership整理である。
- Current global class contractを保ったまま達成できる。

### 7.4 CSS Cascade Layersを導入する

採用しない。

`@layer`はcascade precedenceを新しい規則へ変えるため、今回の「既存意味を維持した境界整理」より大きなbehavioral changeになる。

### 7.5 新CSS framework / design system刷新

Issueの明示的Non-goalなので行わない。

### 7.6 breakpointの統一

今回行わない。

899 / 900、1100、1180等にはCurrent component behavior上の理由がある可能性がある。ownership整理とbreakpoint redesignを同時に行うと、回帰原因を切り分けにくくなる。

## 8. 変更対象

実装時の想定変更file。

### 必須

- `src/presentation/styles/global.css`
- `src/presentation/styles/shared.css` 新規
- `src/presentation/styles/storefront.css` 新規
- `src/presentation/styles/admin.css` 新規
- `src/presentation/root-layout.web.tsx`
- `tests/contracts/architecture.test.ts`

### 条件付き

既存E2Eでownership移行の回帰を十分検出できない具体的なgapが見つかった場合のみ、次を更新する。

- `e2e/web/accessibility.spec.ts`
- `e2e/web/mobile-boundary.spec.ts`
- `e2e/web/ui-ux-improvements.spec.ts`

visual behaviorを変えないRefactorなので、テスト数を増やすこと自体を目的にしない。

### 原則変更しない

- `src/presentation/**/*.tsx`のclassName
  - `root-layout.web.tsx`を除く
- Domain
- Application
- Infrastructure
- Native presentation
- `src/presentation/design/tokens.ts`
- route
- seed
- database
- product仕様

## 9. 検証計画

### 9.1 focused static / contract

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm exec vitest run tests/contracts/architecture.test.ts
```

確認:

- import order
- Native CSS boundary
- CSS file resolution
- TypeScript source変更の副作用なし

### 9.2 Web build

```bash
pnpm run build:web
```

目的:

- Expo / Metroが複数global CSS importを正しくbundleできること
- production相当Web exportでCSS欠落がないこと

### 9.3 Behavior / accessibility

```bash
pnpm run test:e2e:chromium
pnpm run test:a11y
pnpm run test:e2e:mobile-boundary
```

重点確認:

- body scroll
- Header / Footer
- Storefront navigation
- Breadcrumb
- Catalog filter 900px boundary
- 320px purchase flow
- Admin viewport warning
- touch target
- focus-visible
- serious / critical Axe violation 0
- horizontal overflowなし

### 9.4 Visual

Current CIのUI Reviewを利用する。

実装前後で同じroute / viewportをcaptureできる場合は、別stageで保存する。

例:

```bash
UI_REVIEW_STAGE=issue-131-before pnpm exec playwright test e2e/web/ui-review.spec.ts --project=ui-review-desktop --workers=1
UI_REVIEW_STAGE=issue-131-before pnpm exec playwright test e2e/web/ui-review.spec.ts --project=ui-review-tablet --workers=1
UI_REVIEW_STAGE=issue-131-before pnpm exec playwright test e2e/web/ui-review.spec.ts --project=ui-review-mobile --workers=1
UI_REVIEW_STAGE=issue-131-before pnpm exec playwright test e2e/web/ui-review.spec.ts --project=ui-review-small-mobile --workers=1
```

実装後はstageを`issue-131-after`に変えて同じcaptureを取得する。

比較対象:

- Desktop 1440×1000
- Tablet 1024×900
- Mobile 390×844
- Small Mobile 320×700

比較で意図しない差分が出た場合は、style値を新仕様へ合わせるのではなく、移動前のcascade / specificity / import orderを調べて回帰を直す。

### 9.5 repository標準検証

```bash
pnpm run verify
git diff --check
```

PRでは`.github/workflows/ci.yml`の以下が成功することを確認する。

- Style Quality
- Code Quality
- Vitest
- Web build automation / production
- Chromium E2E
- Accessibility
- Mobile Boundary
- UI Review 4 viewport
- Production Smoke
- final verify

## 10. 成功判定

実装完了時、次のすべてを満たす。

1. CSS ownershipを4 boundaryで説明できる。
2. selectorの変更理由から変更fileを一意に判断できる。
3. responsive ruleのownerがselector ownerと一致する。
4. cross-file duplicate selectorに依存しない。
5. global foundation以外のfeature styleが`global.css`に残らない。
6. className、DOM semantics、route、business behaviorを変更していない。
7. visual / accessibility / responsive behaviorがCurrent mainと同等。
8. standard validationとPR CIが成功する。
9. Native styleを変更していない。
10. 新framework / dependencyを追加していない。

「CSS fileが4つになった」ことだけでは完了としない。

## 11. リスク

### 11.1 import orderによる見た目変更

最大のリスク。

Current file内では後段overrideが多数あるため、単純にselectorをfileへ切り出すとsource orderが変わる。

対策:

- 最終computed valueを基準にbase ruleを統合する。
- feature間上書きを前提にしないownershipへ分ける。
- responsive / pseudo-classは意味を保ったままowner file内へ移す。
- before / after UI reviewとE2Eで確認する。

### 11.2 broad selectorの誤分類

`textarea`、`a`、`progress`等のraw element selectorをfeature fileへ移すと別画面へ影響する。

対策:

- raw element selectorはconsumerが全Webへ及ぶ限り`global.css`またはsharedへ置く。
- feature-specificであることが確認できる場合だけowner fileへ移す。

### 11.3 sharedの過剰拡大

「複数画面で使う」だけでsharedへ集めると、Storefront-only sharedとAdmin-only sharedまで一箇所へ戻り、Issueの問題を再作成する。

対策:

- Storefront内複数画面の共通styleはStorefront ownerに残す。
- Admin内複数画面の共通styleはAdmin ownerに残す。
- sharedはStorefront / Adminの境界をまたぐprimitiveに限定する。

### 11.4 Refactorとvisual redesignの混在

CSSを移動する途中でspacing / color / breakpointを改善すると、回帰か仕様変更か判断できなくなる。

対策:

- 今回はproperty値の改善を行わない。
- Current computed behavior維持を優先する。
- 別のUI改善が必要なら別Issueへ分ける。

## 12. 実装順序

実装時は次の順で進める。

1. Current main / Issue / CSS blob再確認
2. selector consumer inventory
3. duplicate / override chain mapping
4. baseline UI review capture
5. `global.css` foundation整理
6. `shared.css`作成・移動
7. `storefront.css`作成・移動
8. `admin.css`作成・移動
9. responsive ruleを各ownerへ移動
10. root CSS import order更新
11. architecture contract更新
12. static ownership self-review
13. focused contract / build
14. Chromium / a11y / mobile-boundary
15. after UI review capture
16. `pnpm run verify`
17. diff / scope review
18. PR作成時にIssue #131の目的、ownership表、validation結果を記載

## 13. 実装時に止めて再判断する条件

次の場合は、その場で追加抽象化せずPlanを再評価する。

- 同じselectorがStorefrontとAdminで意図的に異なる値を必要としている。
- direct import順だけではCurrent cascadeを維持できず、feature間の上書き依存が見つかった。
- selector consumerを確認してもownerを一意に決められない。
- className renameなしでは境界を作れない箇所が大量にある。
- before / after visualで多数の差分が出る。
- Current mainが本Plan作成後にCSS architectureを変更している。

この場合も、CSS ModulesやCascade Layersへ即座に拡張しない。まずCurrent selectorの責務とconsumerを再確認する。

## 14. 成果物

今回の成果物:

- branch: `plan/issue-131-global-web-css-ownership-boundary`
- Plan: 本ファイル

実装時の想定成果物:

- ownership分離済みWeb CSS
- updated root CSS composition
- architecture contract
- existing E2E / accessibility / UI reviewによる回帰Evidence
- PR本文のownership mappingとvalidation結果

## 15. 対象外

- Web UI全面リデザイン
- CSS framework変更
- CSS Modules全面移行
- Native StyleSheetとの共通化
- design token再設計
- 全class rename
- breakpoint taxonomy再設計
- DRY化だけを理由にした共通化
- CSS parser / custom linter / selector registryの新設
- product behavior変更
- route変更
- database / seed変更
