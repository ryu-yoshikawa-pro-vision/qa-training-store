# プロジェクト概要・スコープ

## 1. 名称

- プロジェクト名: ECテスト自動化学習アプリ
- Storefront表示名: Scenario Shop
- 英語名: EC Automation Training App
- Repository: `ec-automation-training-app`

`Scenario Shop`は学習用の架空店舗名であり、実在する店舗・企業とは無関係です。

## 2. 目的

ECサイトに多い画面・権限・価格・在庫・注文状態を、決定的なデータで再現できる学習用SUTを提供します。最優先は、PlaywrightでWeb E2Eを設計・実装・失敗分析できる状態を早期に完成させることです。

- PlaywrightによるWeb E2E学習
- テスト設計、状態遷移、境界値、権限、価格・在庫整合性の学習
- 一般的なECの商品探索・購入体験の学習
- SaaS型管理画面の一覧・詳細・編集操作の学習
- AIエージェントによる仕様理解・テスト実装
- 後続PhaseでMaestroによるNative E2Eと高度な障害シナリオを追加

本アプリは実ECではなく、実際の販売・決済・配送・契約締結を行いません。

## 3. 対象Platform

| Platform | Phase 1 | Phase 2以降 |
|---|---:|---:|
| Desktop Web | 購入者・管理 | 継続 |
| Mobile Web | 購入者 | 継続 |
| Android/iOS | Expo共通コードを維持するがRelease対象外 | 購入者機能・Maestro |
| Native管理画面 | 対象外 | 当面対象外 |

## 4. Phase 1の実装対象

### Storefront

- Home、全商品、検索結果、カテゴリ別一覧、商品詳細
- Search Suggestion、Rating/Saleを含むFilter、Sort、Pagination
- 適用Filter表示、Mobile Filter、0件時の復旧導線、戻る時の状態復元
- 商品Gallery、Variation、会員価格、在庫、送料条件、Review分布
- 固定Account、新規登録、Login/Logout、Role/Rank/Status
- guest/customer Cart、Login時Cart統合
- 配送先、Checkout Session、注文確認
- 決定的な模擬Payment成功・明確失敗・再試行
- Order履歴、`paid → preparing → shipped → delivered`
- Review投稿・編集

### Admin

- Side Navigation、Page Header、Breadcrumbを持つAdmin Shell
- 対応件数とQuick Actionを示すOverview。売上Chartは含めない
- 商品、Category、Brand、在庫、Order、User、ReviewのResource一覧・詳細・編集
- 商品本体・SKU・GitHub画像Asset参照の追加、変更、削除
- 商品公開/非公開、Review非公開/再公開の限定Bulk Action
- Contextual Save Bar、未保存離脱保護

### 技術・テスト

- Seed、Reset、Test Clock、処理Delay
- IndexedDB/Dexie、Playwright、Cloudflare Pages 1環境

## 5. Phase 1対象外

- Native Build・Maestro
- Guest Checkout
- Cancel申請、Return、Refund
- Payment timeout/unknown、Gateway台帳、照合、Finalize失敗復旧
- Import/Export、Migration Recovery、DB自動修復
- Version付き規約同意履歴
- 詳細Audit Log、Runtime Ring Buffer
- Public DemoとAutomation Targetの分離
- Visual Regression、厳密な性能Release Gate、iOS Release Gate
- Wishlist、Recommendation Engine、行動履歴Personalization
- Coupon、Point、Review画像、売上分析Chart、Saved View

上記は不要なのではなく、学習価値が確認できたものだけをPhase 2以降で再評価します。

## 6. 全体対象外

実決済・通知・配送会社連携、複数店舗/倉庫、Marketplace、デジタル/定期購入、複数通貨、多言語、2軸Variation、一部Cancel/Return/Refund、CSV一括、PWA、Native Admin、App Store公開。

## 7. 重要制約

- DataはOrigin/端末ごとに分離され、別端末と共有しない。
- 認証・認可は疑似実装で、本物のSecurity Boundaryではない。
- 実端末間の在庫競合は再現しない。必要な競合は将来Fault Scenarioで疑似再現する。
- 模擬Paymentは外部決済を呼ばず、指定した結果を決定的に返す。
- 実在する個人情報・Card情報を入力しない。
- Phase 1は認証・Cart統合の学習を優先するため会員Checkoutのみとする。一般ECのConversion最適化とは異なる意図的な制約である。
- 郵便番号補完は外部APIを使わず、Seedで使用する限定的な学習用住所辞書だけを利用する。未一致時は手入力できる。
- 商品画像BinaryはGitHub Repositoryの`public/images/products/`を正本とし、Cloudflare Pagesから同一Originで配信する。アプリは画像Assetの関連付けだけをIndexedDBへ保存する。したがって、管理UIで新規商品を作成する際は、Deploy済みAsset Catalog内の画像から選択する。管理画面単独では新規画像Binaryを追加できず、RepositoryへのCommit/PRと再Deployが必要である。Release済みAssetはappend-onlyとする。
- BrowserへGitHub Tokenを保持せず、管理UIからGitHub APIへのUpload・削除は行わない。新規画像Binaryの追加はRepositoryへのCommit/PRと再Deployで行う。

## 8. Phase 1環境

| Environment | Purpose | Test Control |
|---|---|---:|
| local | 開発・手動確認 | ON |
| Cloudflare Automation | Playwright・QA学習 | ON |

一般利用向けPublic DemoはPhase 3で必要性を再評価します。

## 9. Phase 1成功条件

- Homeから商品を探し、検索・Filter・カテゴリ・商品詳細を経てCartへ追加できる。
- 管理者が商品本体、SKU、画像参照を登録・変更・削除し、公開条件を満たす商品を公開できる。
- customerがCartへの追加、数量変更、明細削除、Checkout、Payment成功、Order確認を完了できる。
- 明確なPayment失敗後、同じOrderから再試行できる。
- operator/adminがOverviewから対象Resourceを見つけ、Orderを準備開始、発送、配送完了へ進められる。
- delivered Orderの商品へReviewを投稿できる。
- Storefront 360px幅とAdmin 1024px以上で主要操作が完了できる。
- Playwright Chromiumの主要Flowが安定して実行できる。
- UIからDBを直接操作せず、Use CaseとRepository境界を維持する。
- Phase 1の必須Playwright E2E 12本が安定し、細かな組合せ・境界値はUnit/Application/Component/Contract Testで担保する。


## 実装契約

Phase 1実装は`04_data/domain_types.md`、`04_data/application_contracts.md`、`04_data/repository_interfaces.md`、`04_data/indexeddb_schema.md`の型・Transaction・Index契約に従います。実装者が別DTO、別Password Hash、別Admin Query方式を独自採用しません。`future/phase2`配下はPhase 1の正本ではありません。

- 商品画像はGitHubへ事前登録し、Build生成Manifest Moduleから参照します。管理画面は画像の関連付けだけを行い、画像Uploadは行いません。
