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

## 2. Test Level

| Level | Tool | 主責務 |
|---|---|---|
| Unit | Vitest | 価格、権限、閲覧条件、Facet、状態遷移 |
| Application Integration | Vitest | Product Aggregate、Search、Cart統合、Checkout、Payment確定、Order処理、Bulk |
| Repository Contract | Vitest | DexieのCRUD、Tx、Conflict、Sort/Page/Facet、Product Aggregate |
| Static Asset Contract | Vitest/Node | Image Manifest、File、Hash、active/inactive Asset |
| Component | Testing Library | Form、Combobox、Filter、Error、Accessibility |
| Web E2E | Playwright | 顧客・管理の主要業務FlowとPage Pattern |
| Deployed Smoke | Playwright | Cloudflare配信確認 |

## 3. Unit重点

PriceCalculator（SKU単価ごとのfloorと明細割引合計）、Shipping Remaining、Catalog Visibility、Search Filter/Facet、Product Price Range、Variation Rule、Cart Quantity/Merge、Checkout Start/Resume、Product/Order/Payment/Review State、Admin Protection、Review Summary Delta・未丸め平均・表示丸め境界、PasswordHasher Format/Verify。

## 4. Repository Contract重点

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

## 5. E2E Release Gate

Phase 1の必須E2Eは`e2e_design.md`の12本です。次はE2Eへ重複展開せず、下位Testへ割り当てます。

- Filter全組合せ、Sort tie-break、Facet件数: Unit/Application
- 全入力文字数境界、Error Summary詳細: Component/Application
- 全Conflict・Rollback・Unique制約: Repository Contract
- Review評価分布Delta、平均未丸め保存・表示丸め、価格/送料全組合せ: Unit/Application
- Bulk各対象の失敗理由: Application Integration

## 6. Data方針

- TestごとにSeed Scenarioを明示する。
- UIで長い前提を作らない。
- Seed期待値はSeed Catalog/Metadataから取得する。
- Test APIの書込みはReset、Scenario Seed、Clock、Payment Delayだけとし、読取りはMetadataと固定Read-only Inspection DTOだけに限定する。任意DB書換えや任意Queryを提供しない。
- UI Pattern境界に必要な12/13 Variation、0件、部分成功を専用Seedで用意する。

## 7. Accessibility

Search Combobox、Mobile Filter、Product Gallery、Checkout、Rating、Product Form、Admin NavigationをKeyboardで確認し、重大なaxe違反をRelease前に解消します。全画面のVisual RegressionはPhase 3です。

## 8. UX確認

機械Testだけでなく、Phase 1受入時に次をScreenshotと実操作で確認します。

- StorefrontとAdminの視覚的・情報密度の分離
- 360px商品2列Gridの可読性
- 主要CTAと現在地の明確さ
- 0件・初期Empty・Errorの次Action
- UI文言辞書との一致

## 9. 性能

many-productsを使いSearch Suggestion、Facet、一覧描画をBenchmarkしますが、Phase 1のRelease Gateに固定時間を置きません。重大な操作不能や明確な退行があれば修正します。

## 10. 完了基準

- Unit/Application/Repository Contract成功。
- PR Chromium成功。
- mainでChromium Mobileと可能な範囲のFirefox/WebKit確認。
- Deployed Smoke成功。
- Critical/High未解決なし。



## 内部整合性とE2E

在庫履歴、Order/Payment/Shipment、Review Summaryなどの内部整合性はApplication Integration TestとDexie Contract Testを正本とします。E2EはUIを優先し、必要な場合だけAutomation Buildの固定Read-only Inspection DTOを使用します。

- Cross-role LifecycleはPR Gateへ含めず、mainまたは週次で実行します。
