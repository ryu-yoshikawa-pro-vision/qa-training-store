# Test戦略

## 1. Phase 1最重要Risk

1. Role・Ownership違反
2. Search/Filter条件と結果件数・Pageの不一致
3. 商品価格・Sale・会員価格・送料の誤表示
4. 在庫の過剰販売・二重減算
5. Cart/Checkout Version不整合
6. Payment成功・失敗とOrder状態の不一致
7. Order/Shipment状態の不一致
8. Review Eligibility・Summary・評価分布不整合
9. Product Aggregate、SKU、画像Asset関連の部分保存・誤削除
10. Guest Cart統合・Checkout Session再開の不整合
11. Admin Bulk Action・未保存変更の誤操作
12. Keyboard、Focus、Mobile Layoutによる操作不能
13. IndexedDB DataとUIの再読込不整合
14. boolean/null IndexedDB Index Keyの不正利用
15. Password Hash/Seed認証契約の不一致
16. Admin QueryのPage/Filter/Sort不一致

高度な分散Payment、Refund、MigrationはPhase 1 Riskへ含めません。

## 2. Test Level / Test Type

Test Level / Test Typeは、どの層で何を検証するかを示します。Test PerspectiveとExecution / Platform / CI Gateは別軸で管理します。

| Level / Type | Tool | 主責務 |
|---|---|---|
| Unit | Vitest | 価格、権限、閲覧条件、Facet、状態遷移 |
| Application Integration | Vitest | Product Aggregate、Search、Cart統合、Checkout、Payment確定、Order処理、Bulk |
| Repository Contract | Vitest | DexieのCRUD、Tx、Conflict、Sort/Page/Facet、Product Aggregate |
| Static / Operational Contract | Vitest/Node | Image Manifest、File、Hash、active/inactive Asset、実行境界 |
| Component | Testing Library | Form、Combobox、Filter、Error、Accessibility |
| Web E2E | Playwright | 顧客・管理の主要業務FlowとPage Pattern |
| Native Component / Repository / Android Runtime E2E | Jest/Vitest/Maestro | Native UI、SQLite Repository、Android Runtime / Maestro |
| Deployed / Production Smoke | Playwright | Cloudflare配信確認とProduction-validation |

## 3. Test Perspective

Test Perspectiveは、同じTest Levelで確認するRiskの見方です。Current Risk / testで説明できるPerspectiveだけを使い、PerspectiveをTest Levelとして数えません。

| Perspective | 主な適用 |
|---|---|
| Accessibility | axe、Keyboard、Focus、Screen Reader spot check |
| Responsive / Mobile Web | 360px Storefront、Breakpoint、Mobile Filter |
| Role / Ownership | Viewer、customer、operator/adminの権限と所有権 |
| State / Lifecycle | Checkout、Payment、Order、Shipment、Review、Session状態 |
| Boundary | 上限、0件、Page、Filter、Sort、Variation、失敗境界 |
| Failure / Recovery | Conflict、Rollback、Payment失敗、再開、Retry |
| Data / Persistence consistency | Snapshot、Summary、Version、IndexedDB / SQLite永続化 |
| Security / Authorization | Password Hash、Authorization、Test API境界 |
| UX / Visual acceptance | Storefront/Admin分離、CTA、Empty / Error、Screenshot review |

## 4. Execution / Platform / CI Gate

Execution / Platform / CI Gateは、どの入口・環境・workflow jobで実行し、何をRequiredとするかを示します。同時に実行されることだけを理由に、同じcoverage分類とは扱いません。

| Execution / Platform | Current entrypoint / CI Gate | Coverage boundary |
|---|---|---|
| Web PR / main / schedule / manual | Web CI（PR、push、schedule、`workflow_dispatch`） | Webのstyle、code、Vitest、build、E2E、UI Review、SmokeをCurrent workflowで判定 |
| `e2e-chromium` matrix | `required`=`pnpm run test:e2e:chromium`、`accessibility`=`pnpm run test:a11y`、`mobile-boundary`、`cross-role`、`training-web-baseline` | `required`を含む5 leg。`training-web-baseline`はTrainingでありFormal Regression coverageへ昇格しない |
| UI Review | `ui-review` job / `ui-review-desktop`、`ui-review-tablet`、`ui-review-mobile`、`ui-review-small-mobile` project | ScreenshotによるUI Reviewの別責務。Formal RegressionのTest Levelやcoverage countへ合算しない |
| Production Smoke / Preview Deployed Smoke | `production-smoke`、Preview / Production deployed smoke | Build済みartifactまたはdeployed URLの配信・代表Flow確認 |
| non-PR Extended E2E | `extended-e2e`（non-PR） / `mobile-chromium` | PR required E2Eとは別のMobile extended coverage |
| weekly / manual Cross-browser Smoke | `Cross Browser Smoke` workflow / `firefox-smoke`、`webkit-smoke` | weeklyまたは`workflow_dispatch`の互換性確認。PR required gateではない |
| Native PR conditional / Native manual | `native-ci`のNative change検出または`workflow_dispatch` | Native変更時だけNative gateを要求し、Web Phase 1のPlaywright coverageへ混在させない |
| Android Build + Runtime / Maestro | `native-ci / verify`が`android-automation-build`、`android-production-build`、`android-runtime`等を要求 | AndroidはBuild、SQLite / Contract、Emulator Runtime / MaestroをRequiredとする |
| iOS Build-only reusable gate | `native-ios` reusable workflowの`ios-automation-build`、`ios-production-build`、`ios-verify` | iOSはAutomation / Production-validation Simulator Build-only。iOS Runtime / Maestro PASSはRequired guaranteeではない |
| Formal / Training boundary | `playwright.config.ts`のFormal E2E / Smoke、`playwright.training.config.ts`のTraining | `ui-review-*`はUI Review、`training-web-baseline`はTrainingとして責務を分離する |

### Phase 1 Risk mapping

Risk mappingは既存のPhase 1重要Riskを1 Risk = 1 rowで表し、Representative Formal Test / suiteは安定した代表実行単位、CI Gateはそのsuiteに最も近いCurrent workflow job / matrix legを示します。

| Risk / Risk label | Representative Requirement / AC | Representative Technique | Representative Perspective | Primary Test Level | Representative Formal Test / suite | CI Gate |
|---|---|---|---|---|---|---|
| Role・Ownership違反 | `FR-AU-*` / `FR-AD-*`、Acceptance §2 | Use Case policy + Route Guard | Role / Ownership、Security / Authorization | Unit | `tests/unit/policies.test.ts` | `Vitest (unit)` |
| Search/Filter条件と結果件数・Pageの不一致 | `FR-PR-*`、Acceptance §3 | Repository query + deterministic tie-break | Boundary | Repository Contract | `tests/repository-contract/storefront-catalog.test.ts` | `Vitest (repository)` |
| 商品価格・Sale・会員価格・送料の誤表示 | `FR-MO-*` / `FR-CA-*`、Acceptance §4 | PriceCalculator + Test Clock | Data / Persistence consistency | Unit | `tests/unit/pricing.test.ts` | `Vitest (unit)` |
| 在庫の過剰販売・二重減算 | `FR-ST-*` / `FR-PY-*`、Acceptance §4 | Transaction + stock revalidation | Failure / Recovery | Application Integration | `tests/integration/checkout-order-use-cases.test.ts` | `Vitest (integration)` |
| Cart/Checkout Version不整合 | `FR-CA-*` / `FR-CH-*`、Acceptance §5 | Version / Conflict revalidation | State / Lifecycle | Application Integration | `tests/integration/checkout-order-use-cases.test.ts` | `Vitest (integration)` |
| Payment成功・失敗とOrder状態の不一致 | `FR-PY-*` / `FR-OR-*`、Acceptance §6 | Payment attempt idempotency + state transition | State / Lifecycle、Failure / Recovery | Application Integration | `tests/integration/checkout-order-use-cases.test.ts` | `Vitest (integration)` |
| Order/Shipment状態の不一致 | `FR-OR-*` / `FR-ST-*`、Acceptance §6 | Order/Shipment transaction + state transition | State / Lifecycle | Application Integration | `tests/integration/admin-operations-use-cases.test.ts` | `Vitest (integration)` |
| Review Eligibility・Summary・評価分布不整合 | `FR-RV-*` / `FR-PR-017`、Acceptance §7 | Eligibility + summary delta | State / Lifecycle、Data / Persistence consistency | Application Integration | `tests/integration/review-user-use-cases.test.ts` | `Vitest (integration)` |
| Product Aggregate、SKU、画像Asset関連の部分保存・誤削除 | `FR-PR-*` / `FR-AD-*`、Acceptance §3 | Aggregate transaction + asset/stock boundary | Data / Persistence consistency、Boundary | Application Integration | `tests/integration/admin-product-use-cases.test.ts` | `Vitest (integration)` |
| Guest Cart統合・Checkout Session再開の不整合 | `FR-CA-*` / `FR-CH-*` / `FR-AU-*`、Acceptance §2・4・5 | Cart merge + Checkout resume | State / Lifecycle、Failure / Recovery | Application Integration | `tests/integration/auth-account.test.ts` + `tests/integration/checkout-order-use-cases.test.ts` | `Vitest (integration)` |
| Admin Bulk Action・未保存変更の誤操作 | FR-AD-*、Acceptance §8 | Dirty-state guard + bounded bulk action | Boundary、UX / Visual acceptance | Component | `tests/component/admin-product-pages.test.tsx` | `Vitest (component)` |
| Keyboard、Focus、Mobile Layoutによる操作不能 | `NFR-AX-*` / `NFR-CP-*`、Acceptance §10 | Keyboard/axe + responsive boundary | Accessibility、Responsive / Mobile Web | Web E2E | `e2e/web/accessibility.spec.ts` + `e2e/web/mobile-boundary.spec.ts` | `e2e-chromium / accessibility` + `mobile-boundary` |
| IndexedDB DataとUIの再読込不整合 | `NFR-RL-*` / `FR-TC-*`、Acceptance §3・5・9 | Fixed Read-only Inspection + reload | State / Lifecycle、Data / Persistence consistency | Web E2E | `e2e/web/phase1-required.spec.ts` | `e2e-chromium / required` |
| boolean/null IndexedDB Index Keyの不正利用 | NFR-RL-011 / FR-PR-041/050、Acceptance §1 | Persistence projection + unique/index contract | Data / Persistence consistency | Repository Contract | `tests/repository-contract/repositories.test.ts` | `Vitest (repository)` |
| Password Hash/Seed認証契約の不一致 | `NFR-SC-*` / `FR-AU-*`、Acceptance §2 | PBKDF2 format/verify + seed hash | Security / Authorization | Unit | `tests/unit/password-hasher.test.ts` | `Vitest (unit)` |
| Admin QueryのPage/Filter/Sort不一致 | FR-AD-* / NFR-MA-011、Acceptance §8 | Repository query Page/Filter/Sort | Boundary | Application Integration | `tests/integration/admin-operations-use-cases.test.ts` | `Vitest (integration)` |

## 5. Unit重点

PriceCalculator（SKU単価ごとのfloorと明細割引合計）、Shipping Remaining、Catalog Visibility、Search Filter/Facet、Product Price Range、Variation Rule、Cart Quantity/Merge、Checkout Start/Resume、Product/Order/Payment/Review State、Admin Protection、Review Summary Delta・未丸め平均・表示丸め境界、PasswordHasher Format/Verify。

## 6. Repository Contract重点

- Unique/Index/Sort/Page/Facet
- version Conflict
- ApplicationTransactionRunnerのTransaction Scope・Rollback
- Cart Item変更と親Cart versionの同時更新
- 初回Cart追加でactive Cart未作成の場合も、Cart作成・明細追加・親Version更新が1つのTransactionで完了すること
- JSON/Date/Boolean変換
- Category名一意性
- active Cart・default Address一意性
- Review評価別件数合計
- Admin Overview Read Model（低在庫1～5、在庫切れ0の境界を含む）
- Admin商品一覧のactive SKU合計在庫Filter（複数SKU混在、合計0、1、5、6）
- Home新着最大8件に公開中の在庫切れ商品を含めるViewer Rule
- Product Aggregate全体Rollback、Variant削除/無効化、既存在庫変更拒否
- Cart統合とCheckout startOrResumeの原子性
- Image Asset Manifest参照整合。欠落・Hash不一致・容量超過はBuild失敗とし、Runtime RecoveryはTest対象にしない
- isDefaultKey/isActiveKey/optionScopeKey変換とUnique制約
- Storefront Home/Navigation Queryと表示名付きFacet
- Admin全一覧QueryのSearch/Filter/Sort/Page
- CartDto Read Modelの価格差・上限・問題Code
- Product Previewの非永続化と画像0件Placeholder
- Order Item代表画像SnapshotとOrder金額Snapshot
- 会員ランク変更とactive Checkout abandonedの原子性
- Payment再開の冪等性とConflict後の最新結果返却
- Gateway結果に時刻を含めず、Test Clockの同一時刻がPayment/Historyへ保存されること

## 7. E2E Release Gate

`e2e_design.md`のWE-CORE-001〜WE-CORE-012はPhase 1のRequirement / business-flow mappingです。Current executable required legは`pnpm run test:e2e:chromium`で、`e2e/web/phase1-required.spec.ts`と`e2e/web/ui-ux-improvements.spec.ts`を`chromium` projectで実行します。PRのWeb E2E coverage全体は`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline`からなる`e2e-chromium` matrixであり、12件のmappingやrequired leg commandと同一視しません。次はE2Eへ重複展開せず、下位Testへ割り当てます。

- Filter全組合せ、Sort tie-break、Facet件数: Unit/Application
- 全入力文字数境界、Error Summary詳細: Component/Application
- 全Conflict・Rollback・Unique制約: Repository Contract
- Review評価分布Delta、平均未丸め保存・表示丸め、価格/送料全組合せ: Unit/Application
- Bulk各対象の失敗理由: Application Integration

### Current Native CIとの境界

Web Phase 1のE2E Release GateへNative / Maestro Flowを混在させません。Native変更時のCurrent Native contractは、AndroidがBuild + Runtime / Maestro、iOSがBuild-onlyです。iOSのSimulator Runtime / Maestro PASSは保証せず、standalone `workflow_dispatch`とNative変更時のtop-level `native-ci`からのiOS reusable workflow呼出しを区別します。Native変更時は`native-ci / verify`がiOS成功を要求します。

## 8. Data方針

- TestごとにSeed Scenarioを明示する。
- UIで長い前提を作らない。
- Seed期待値はSeed Catalog/Metadataから取得する。
- Test APIの書込みはReset、Scenario Seed、Clock、Payment Delayだけとし、読取りはMetadataと固定Read-only Inspection DTOだけに限定する。任意DB書換えや任意Queryを提供しない。
- UI Pattern境界に必要な12/13 Variation、0件、部分成功を専用Seedで用意する。

## 9. Accessibility

Search Combobox、Mobile Filter、Product Gallery、Checkout、Rating、Product Form、Admin NavigationをKeyboardで確認し、重大なaxe違反をRelease前に解消します。全画面のVisual RegressionはPhase 3です。

## 10. UX確認

機械Testだけでなく、Phase 1受入時に次をScreenshotと実操作で確認します。

- StorefrontとAdminの視覚的・情報密度の分離
- 360px商品2列Gridの可読性
- 主要CTAと現在地の明確さ
- 0件・初期Empty・Errorの次Action
- UI文言辞書との一致

## 11. 性能

many-productsを使いSearch Suggestion、Facet、一覧描画をBenchmarkしますが、Phase 1のRelease Gateに固定時間を置きません。重大な操作不能や明確な退行があれば修正します。

## 12. 完了基準

- Unit/Application/Repository Contract成功。
- PRのWeb CIで`e2e-chromium` matrix（`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline`）が成功する。`required` legのcommandは`pnpm run test:e2e:chromium`。
- mainでChromium Mobileと可能な範囲のFirefox/WebKit確認。
- Deployed Smoke成功。
- Critical/High未解決なし。

## 内部整合性とE2E

在庫履歴、Order/Payment/Shipment、Review Summaryなどの内部整合性はApplication Integration TestとDexie Contract Testを正本とします。E2EはUIを優先し、必要な場合だけAutomation Buildの固定Read-only Inspection DTOを使用します。

- Cross-role Lifecycleは`e2e-chromium` matrixの`cross-role` legとしてPR Web CIに含めます。
