# デザインシステム・レスポンシブ設計

## 1. 方針

- 架空店舗名は`Scenario Shop`とし、製品説明名「ECテスト自動化学習アプリ」と分離する。
- 洗練は装飾量ではなく、情報の優先順位、余白、状態、次の操作の明確さで作る。
- Storefrontは商品画像と購入判断を主役にし、AdminはTable/Formの可読性と操作効率を主役にする。
- Phase 1はLight Themeのみ。Dark Modeは対象外。
- WebとNativeでTokenと意味を共通化し、操作ComponentはPlatform固有実装を許可する。
- 外部Web Font・大規模UI Framework・外部画像CDNを使用しない。

## 2. Visual Language

### Storefront

- 背景はWhiteを基本とし、Sectionの区切りに`surface-subtle`を使用する。
- 商品画像は1:1、明るい無地または簡潔な生活背景で統一する。
- Accent Colorは主要CTA、選択状態、Linkだけに使う。
- Product Cardへ不要なBorderやShadowを重ねず、画像・商品名・価格の順を明確にする。

### Admin

- 背景は淡いSlate、Content PanelはWhite。
- Side Navigation、Page Header、Filter Bar、Tableを固定パターンとして使う。
- KPI Chartではなく、対応件数とResource Linkを優先する。
- 商品写真よりStatus、ID、日時、操作を高密度に表示する。

## 3. Brand・Icon・Image

| 項目 | 決定 |
|---|---|
| Storefront Logo | `Scenario Shop`のWordmark＋単純なShopping Bag Symbol |
| Admin Label | `Scenario Shop Admin` |
| Icon | 同一のOutline Icon Set。絵文字をAction Iconに使わない |
| Product Image | 1:1、Seed内で同一照明・余白・背景方針 |
| Placeholder | Image Icon＋「画像を表示できません」 |
| Test Mode | Header内の小さな環境Badge。重要NoticeはLogin/Signup/Checkoutで再掲 |

## 4. Layout Token

| Token | 値 |
|---|---:|
| spacing-1～9 | 4, 8, 12, 16, 24, 32, 40, 48, 64px |
| radius-small | 4px |
| radius-medium | 8px |
| radius-large | 12px |
| radius-pill | 999px |
| content-max | 1,280px |
| admin-max | 1,440px |
| reading-max | 760px |
| mobile-page-padding | 16px |
| desktop-page-padding | 24px |
| grid-gap-mobile | 12px |
| grid-gap-desktop | 24px |
| control-height-web | 44px |
| control-height-native | 48px |
| minimum-touch-target | 44×44px |
| admin-side-nav-width | 248px |

## 5. Typography

OS標準Font Stackを使用します。

| Token | Size / Line height / Weight | 用途 |
|---|---|---|
| display | 36 / 44 / 700 | Home Hero |
| heading-1 | 30 / 38 / 700 | 画面Title |
| heading-2 | 24 / 32 / 700 | Section |
| heading-3 | 20 / 28 / 600 | Card/Panel |
| body | 16 / 24 / 400 | 標準本文 |
| body-small | 14 / 20 / 400 | 補足 |
| label | 14 / 20 / 600 | Input Label |
| caption | 12 / 18 / 400 | Meta情報 |
| mono | 14 / 20 / 400 | ID、SKU、Version |

Mobileのdisplayは32/40、heading-1は28/36へ縮小します。本文は16px未満にしません。

## 6. Color Token

| Token | Foreground / Background |
|---|---|
| storefront-background | `#FFFFFF` |
| admin-background | `#F8FAFC` |
| surface | `#FFFFFF` |
| surface-subtle | `#F8FAFC` |
| surface-muted | `#F1F5F9` |
| text-primary | `#0F172A` |
| text-secondary | `#475569` |
| text-disabled | `#64748B` |
| border | `#CBD5E1` |
| border-strong | `#94A3B8` |
| action-primary | `#1D4ED8` |
| action-primary-hover | `#1E40AF` |
| action-secondary | `#334155` |
| focus | `#7C3AED` |
| sale | `#B91C1C` / `#FEF2F2` |
| success | `#166534` / `#DCFCE7` |
| warning | `#92400E` / `#FEF3C7` |
| danger | `#B91C1C` / `#FEE2E2` |
| info | `#075985` / `#E0F2FE` |

TextとBackgroundの組合せはWCAG AAを満たすことを自動・手動確認します。状態はText/Iconを併用し、色だけで表しません。

## 7. Elevation

| Token | 値 |
|---|---|
| shadow-card | `0 1px 2px rgba(15,23,42,.08)` |
| shadow-sticky | `0 -4px 16px rgba(15,23,42,.10)` |
| shadow-popover | `0 8px 24px rgba(15,23,42,.16)` |
| shadow-modal | `0 20px 40px rgba(15,23,42,.24)` |

Nativeでは対応するElevation/Shadowへ変換します。

## 8. 共通Component

StorefrontHeader、StorefrontFooter、MobileBottomNavigation、AdminShell、AdminSideNavigation、PageHeader、Breadcrumbs、LearningNotice、TestModeBadge、Button、IconButton、Text/Password/NumberField、Select、Checkbox、RadioGroup、Combobox、FormErrorSummary、InlineError、StatusBadge、MembershipBadge、ProductCard、ProductGallery、PriceDisplay、ShippingProgress、RatingDisplay、RatingDistribution、VariationSelector、QuantityControl、FilterBar、AppliedFilterChips、ResourceIndex、ResourceDetailsLayout、ContextualSaveBar、BulkActionBar、Empty/Error/LoadingState、ConfirmDialog、Modal/BottomSheet、Pagination、StepIndicator、OrderTimeline。

## 9. Button

- Primary、Secondary、Tertiary、Danger。
- default/hover/focus/pressed/disabled/loading。
- Loading中はLabelを「処理中」に変え、幅を大きく変えない。
- Icon-onlyはAccessible Name必須。
- Dangerは確認Dialogまたは明示入力を伴う。
- 商品詳細の主要CTAは「カートに追加」、Checkoutは「注文を確定する（¥12,340）」形式とする。

## 10. Form

- Label、必須/任意Text、補足、Control、Errorの順。
- Checkoutは原則1列Form。管理商品編集のみSection化した2列Pageを許可する。
- Error SummaryはForm先頭に置き、Submit Error時はSummaryへFocusする。
- Summary内Linkから該当Fieldへ移動する。
- Focus Ringは2px、focus Token、2px Offset。
- Numberは単位を視覚・Accessible Nameで明示。
- 任意Fieldは「任意」とText表示し、必須だけをAsteriskにしない。

## 11. Responsive Breakpoint

| 区分 | 幅 | Layout |
|---|---:|---|
| compact | 360～599 | Storefront 2列商品Grid、Bottom Nav、16px Padding |
| medium | 600～899 | Storefront 3列商品Grid、24px Padding |
| large | 900～1279 | Storefront 4列、Header Nav |
| wide | 1280以上 | max幅で中央配置 |

管理画面は1024px未満で閲覧説明だけ表示し、編集操作を無効化します。

## 12. 商品Grid

- 360～599px: 2列。
- 600～899px: 3列。
- 900px以上: 4列。
- CSS Gridは`minmax(0, 1fr)`を使用し、Card固定最小幅を設けない。
- 画像Aspect 1:1、商品名最大2行。
- 360pxでは左右Padding 16px、Gap 12pxを確保する。

## 13. 管理Table

- 20件Page、Sticky HeaderはDesktopのみ。
- Header/Cell関連付け、Sort状態通知。
- 横幅不足はTable全体Scroll。
- 重要操作は明示Button、補助操作だけRow Menu。
- SelectionはBulk Action対象画面だけ表示する。
- Loading時はColumn構造を保つSkeletonを表示する。

## 14. Motion

- 通常Transition 150ms、Modal 200ms。
- `prefers-reduced-motion`で0ms。
- Automation Buildは常時0ms。
- LoadingはAnimationより状態Textを優先する。
