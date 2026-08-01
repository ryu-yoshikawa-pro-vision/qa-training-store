# qa-training-store UI・UXユーザー体験 徹底探索レポート

## 1. 実行結果

- 結果：一部完了
- 対象URL：`http://localhost:8081/`
- 実行日時：2026-08-01 17:44 JST
- 使用Browser：Playwright MCP専用Chromium Browser
- Playwright MCP：対象URL、Accessibility Snapshot、Screenshot、Click、入力、Select、Viewport変更、複数Route遷移を確認
- 独立Browser Context：専用Contextを使用。ユーザーのChrome Profile・既存Tabには接続していない
- コード変更：なし
- レポート以外のファイル変更：なし
- Git操作：なし
- アプリの起動・再起動・停止：なし

正常系と代表的な異常系は探索できた。`payment-processing` Scenarioの注文詳細だけは30秒超のLoadingが継続し、完了状態を確認できなかった。また、AdminのMobileはアプリがデスクトップ利用を明示して操作画面を表示しないため、Mobileの管理Table操作は未確認である。

ScreenshotはPlaywright MCPの一時Artifactとして確認しただけで、リポジトリには保存していない。コードは関連箇所を読む目的だけで使用し、変更していない。

## 2. エグゼクティブサマリー

- Storefrontの目的、商品探索、Filter／Sort、商品詳細、価格表示、Cart、Checkoutの基本構造は理解しやすい。売買・決済が模擬環境であることも明示されている。
- 最も大きい問題は、CheckoutのStep遷移後にスクロール位置が引き継がれ、Mobileでは見出し・進捗・注文完了結果が画面外になること（UX-001）、GuestがLoginした後に元のCart／Checkoutへ戻らずHomeへ戻ること（UX-005）である。
- Guest CartとCustomer Cartの統合、CheckoutのCart version不一致、価格変更の同意など、データは処理される一方で「何が残り、何が変わったか」の説明が不足している（UX-006、UX-019、UX-021）。
- CustomerのProfileに会員Rankが表示されず、Review導線にも商品名・Review状態が不足する。購入後の自己確認と学習上の理解を阻害する（UX-007、UX-010）。
- AdminはDashboard、商品／在庫の分離、Bulk Partial Failure、Review履歴など運用判断に役立つ構成がある。一方、状態BadgeがAccessibility Snapshotでは空セルとして表現され、Unsaved Changes、最後のAdmin制約、Scenario初期化の影響説明が不足する（UX-011〜UX-017）。
- Storefrontの外側の水平Overflowは4 Viewportで確認されなかった。問題は主にネストしたAccount Navigationの横Scrollと、Route遷移後の視点復帰に限られる（UX-002）。

最優先は、Checkout／Login／Cart統合の状態と復帰先を明示すること、次にAdmin・Customer間の状態表示を一貫させることである。Test AccountやScenario説明は新画面を増やすより、既存画面の折りたたみ・Contextual Helpで整理するのが妥当である。

## 3. 探索方法

- 使用Role：Guest、Customer（regular／gold）、Operator、Admin
- 確認した固定Account：`regular@example.com`、`gold@example.com`、`operator@example.com`、`admin@example.com`。固定Passwordは画面記載の`testpass1`を使用した
- 使用Scenario：`default`、`empty-catalog`、`cart-with-invalid-items`、`payment-processing`、`reviewable-orders`、`guest-cart-merge-overflow`、`checkout-resume`、`checkout-replaced`、`admin-bulk-partial-failure` など
- 確認したViewport：`1440×1000`、`1024×900`、`390×844`、`320×700`
- 主な操作：商品検索、Category、Filter、Sort、Variant、Cart数量変更、Guest Cart統合、Login失敗／成功、Signup、配送先Lookup、Checkout、Payment成功／失敗／再試行、Review投稿、商品／在庫／注文／Review／User管理、Test Control初期化
- Scenarioの変更・Resetは専用Context内でUIから実施した。探索終了時にAdminのTest Controlから`default`を選択して初期化し、Login画面への遷移を確認した
- 前回レポートとの比較方法：先に今回の実画面を独立して探索し、その後 `docs/reports/2026-08-01_124943_ui-ux-exploration.md` を読み、再現、否定、新規、未確認に分類した
- 探索上の制約：`payment-processing`の注文詳細がLoadingから進まず、Admin Mobileは画面幅制約により管理画面を表示しない

## 4. 探索範囲

| Wave | Role | 画面・操作 | Desktop | Tablet | Mobile | Small Mobile | 結果 |
|---|---|---|---:|---:|---:|---:|---|
| Wave 1 | Guest | Home、商品一覧、Category、Search、Filter／Sort、商品詳細、Variant、Cart、Login導線 | ○ | △ | ○ | ○ | 正常系・Empty・在庫切れを確認 |
| Wave 2 | Guest / Customer | Login失敗／成功、Signup、Guest Cart統合、Logout | ○ | △ | ○ | ○ | 統合結果と復帰先の問題を確認 |
| Wave 3 | Customer | Profile、配送先、Checkout、Payment、注文履歴／詳細、Review | ○ | △ | ○ | △ | 成功／失敗／再試行を確認。処理中Scenarioは未完了 |
| Wave 4 | Operator / Admin | Dashboard、商品、Category、Brand、在庫、注文、Review、User、Test Control | ○ | ○ | ○* | ○* | `*`はDesktop利用案内の確認。管理操作Tableは未確認 |
| Wave 5 | 全Role | 商品、公開状態、画像、在庫、価格、Sale、Cart、注文、Payment、Shipment、Review、Account状態 | ○ | △ | ○ | △ | 主要な反映と再読込を確認。未確認範囲あり |
| Wave 6 | 全Role | 追加、削除、移動、条件変更、現状維持の整理 | ○ | ○ | ○ | ○ | 本レポートで整理 |

## 5. ユーザージャーニー評価

### 5.1 Guestの商品探索からCartまで

- 目的：初めての利用者が商品を探し、比較し、Variantと数量を決めてCartへ進むこと。
- 操作経路：Home → Category／Search → Filter／Sort → 商品詳細 → Variant／数量 → Cart → 購入手続き。
- 自然だった点：Homeで「ECテスト自動化学習アプリ」と模擬環境の目的が分かる。商品一覧には価格、Sale、Rating、在庫状態、Variantの価格帯があり、Search／Filter／SortのURLと結果が連動した。0件時は条件解除の導線がある。
- 商品詳細では通常価格／Sale価格／Gold会員価格、送料条件、選択Variantの価格と在庫、数量上限が確認できる。追加後はStatusと「カートを見る」が表示される。
- CartではVariant、追加時価格、現在価格、会員適用価格、数量、小計、割引、送料、合計が分かる。空Cartにも商品一覧への導線がある。
- 不自然だった点：GuestがCartからCheckoutへ進むとLoginへ移るが、Login成功後に元のCart／Checkoutへ戻らずHomeへ戻る（UX-005）。Homeの「会員としてはじめる」はLogin済みでもLogin画面へ遷移する（UX-004）。
- 不足情報：Homeの同じ模擬環境説明がHeader、本文末尾、Footerに繰り返される。安全告知は必要だが、主操作との優先順位が弱くなる（UX-009）。
- データ反映：商品価格、Sale、会員価格、在庫、Cart小計は正常系で一貫していた。Variantごとの在庫切れも選択不能として明示された。
- Viewport：DesktopとMobileで主要導線を確認。Storefront本体の外側水平Overflowは確認されなかった。

### 5.2 Login・新規登録・Guest Cart統合

- 目的：Guestの買い物を保持したままCustomerへ移行し、学習用Accountの違いを理解すること。
- Login失敗時はAlertに原因が表示され、入力値も保持された。Signupは学習用の同意を含み、作成後Homeへ遷移してAccountを利用できた。
- Login画面の固定Test Accountは初回学習には便利だが、Platinum、Suspended、Withdrawn Accountは一覧に出ない。全ScenarioのAccountを常時並べる必要はないが、Role／Scenario説明への入口は必要である。
- Guest CartをLogin後に統合すると、Guest商品はCustomer Cartに現れた。しかし通知、統合件数、重複数量、在庫上限による調整結果は表示されなかった。`guest-cart-merge-overflow`では3個と4個が上限5個に収束したが、差分説明はなかった（UX-006）。
- Guest CartからLoginへ進んだ正常系を2回確認した。成功後はHomeへ戻り、元のCart／Checkoutを再発見する必要があった（UX-005）。
- Logout後はGuest Homeへ戻り、Cartは空状態として表示された。この遷移と空Stateは自然だった。

### 5.3 CustomerのCheckoutから注文完了まで

- 目的：配送先、Payment、注文内容を確認し、成功／失敗を理解して注文を完了すること。
- Stepperは配送先→支払方法→確認の3段階を示し、前Stepへ戻れる。配送先未登録時は配送先管理への導線がある。
- Payment画面の4種類のテスト決済は、成功、利用拒否、残高不足、認証失敗の意味を説明している。失敗注文には「支払いを再試行」があり、再選択後に同じ注文を完了できた。
- Confirm画面は商品、配送先、支払方法、商品小計、会員割引、送料、合計を再確認できる。成功後は注文番号、合計、注文詳細、買い物継続が表示され、Cartも空になる。
- 不自然だった点：MobileでStep遷移後の`scrollY`が引き継がれ、見出しや成功結果が初期Viewport外に置かれる（UX-001）。住所Lookupは入力済みの番地を消した（UX-008）。Checkout再開／Cart version不一致は警告なしに進行した（UX-021）。
- 会員Rankの割引価格は商品詳細、Cart、Checkoutで整合したが、Profileで自分のRankを確認できない（UX-007）。

### 5.4 注文管理から配送完了・Reviewまで

- 目的：注文、Payment、Shipmentの状態を区別し、配達完了後に適切なReviewを投稿すること。
- Customerの注文一覧は「支払い失敗」「発送準備待ち」「発送準備中」「発送済み」「配達完了」を表示し、注文詳細にはPayment履歴と注文進捗が分かれている。この状態分離は学習上も有用だった。
- Payment失敗は注文自体が作成済みであること、再試行方法、注文詳細への導線が分かる。Review投稿後はStatusが表示され、編集／削除へ切り替わった。
- 不自然だった点：配達済み注文の商品Actionが全て「レビューを投稿・編集」で、未投稿、公開済み、非表示、削除済みの違いが一覧で分からない。Review画面にも商品名が出ない（UX-010）。
- Adminで発送準備開始後、画面見出しは「発送準備中」になったが、同じ画面の配送欄は「発送準備前」のまま残った。発送済み／配送完了では同期した（UX-013）。
- 追跡番号、配送予定、状態履歴の学習用表示は、実際の模擬配送フローを理解するために追加検討の余地がある。ただし本アプリの目的に対して必須とは断定しない。

### 5.5 Adminの商品・在庫管理

- Dashboardは発送準備待ち、低在庫SKU、非公開Reviewなど、次に対応すべき件数を上部に表示し、単なるNavigation一覧になっていない。商品登録、在庫調整、Category管理へのQuick Actionも自然だった。
- 商品一覧は検索、公開状態、Rank、在庫、価格、Sort、Bulk操作を備える。`admin-bulk-partial-failure`で2件失敗した際は「成功0件／失敗2件」とProduct IDと理由が表示され、Selectionも解除された。Partial FailureのFeedbackは良好だった。
- 商品編集は商品情報とSKU・価格・在庫を分離し、「既存在庫は商品編集では変更しない」と明示する。画像のActive／Inactive、Alt、Main選択も確認できた。
- 問題は、長い商品Formで入力した未保存内容を別画面へ移動しても警告が出ないこと、未保存PreviewがName／Price中心でStorefront表示との差を検証できないことである（UX-011、UX-012）。
- 在庫管理はSKU単位の数量、理由、Version、履歴を分離し、更新後に「在庫と履歴を同時に更新しました」と表示した。Storefrontにも在庫状態が反映された。これは壊してはいけない構成である。

### 5.6 Adminの注文・Review・User管理

- 注文管理はStatus、Customer、日付、金額、Sortを持ち、注文詳細でPayment／Order／Shipmentを確認できる。Shipmentの状態変更はSuccess、Version、Carrier、Tracking入力がある。
- Review管理は公開／非公開の履歴をDialog内で確認でき、再公開後にStorefrontのReviewとRating集計へ反映された。
- User管理はRole、Rank、Status、Versionを表示し、一般Customerの停止Dialogは全Sessionを無効化することを説明する。最後のAdminのRole変更／停止が無効なのは安全だが、理由の表示がない（UX-015）。
- Test ControlはAdmin Navigation内にあること自体は自然である。ただしScenario名だけでは初期Account、対象画面、Reset影響が分からない。初期化するとSessionや途中Cart／Checkoutが失われ、LoginまたはForbiddenへ遷移するが、確認Dialogや影響説明がない（UX-016、UX-017）。
- AdminのMobileでは管理操作を無理に表示せず、「1,024px以上の画面幅が必要」と明示してStoreへ戻る／Logoutを提供した。この境界表示は現状維持が妥当である。

## 6. 指摘一覧

| ID | Severity | 分類 | Role | 画面 | 問題 | ユーザー影響 | 推奨区分 |
|---|---|---|---|---|---|---|---|
| UX-001 | High | State Feedback | Customer | Checkout各Step、完了 | 遷移後もScroll位置が引き継がれ、重要Stateが画面外 | 完了・進捗・再操作可否を誤認 | 構成変更 |
| UX-002 | Medium | Responsive | Customer | Profile／Addresses／Orders | Account NavigationがMobileで横Scroll | 注文履歴を見つけにくい | 構成変更 |
| UX-003 | Low | Wording | Customer | Addresses空State | 「右のフォーム」がMobileと不一致 | 次の操作位置を迷う | 構成変更 |
| UX-004 | Medium | Navigation | Customer／Operator／Admin | Home | Login済みでも「会員としてはじめる」がLoginへ遷移 | 現在のAccount状態とCTAが矛盾 | 表示条件変更 |
| UX-005 | High | Navigation | Guest／Customer | Cart→Login | Login成功後に元のCart／Checkoutへ戻らない | 主要購入フローを再発見する必要 | 構成変更 |
| UX-006 | Medium | Data Flow | Guest／Customer | Login後Cart | 統合数量・上限調整・衝突結果を説明しない | 商品を失った／数量が変わったと誤認 | 追加 |
| UX-007 | Medium | Missing UI | Customer | Profile | 会員Rank・Account状態が確認できない | 割引や権限の自己確認ができない | 追加 |
| UX-008 | Medium | State Feedback | Customer | Addresses | 住所Lookupで入力済み番地が消える | 入力漏れ、保存失敗、データ消失と誤認 | 構成変更 |
| UX-009 | Low | Unnecessary UI | 全Role | Home／Login／Cart／Checkout | 模擬環境説明がHeader、本文、Footerで重複 | 主操作の情報密度が下がる | 表示条件変更 |
| UX-010 | Medium | Information Architecture | Customer | 注文詳細／Review | 商品名・Review状態・投稿条件がActionに反映されない | 何をReviewするか、投稿済みか不明 | 追加 |
| UX-011 | Medium | State Feedback | Admin | 商品新規／編集 | 未保存変更のまま移動しても警告がない | 入力を失う | 追加 |
| UX-012 | Medium | Consistency | Admin／Storefront | 商品Preview | 未保存Previewが画像・説明・Variantを検証できない | Storefront反映を判断できない | 構成変更 |
| UX-013 | Medium | Consistency | Operator／Admin | 注文詳細 | 発送準備の見出しと配送欄が一時的に不一致 | 更新成功か判断しにくい | 構成変更 |
| UX-014 | Medium | Accessibility | Operator／Admin | 管理Table全般 | 視覚BadgeがAccessibility Snapshotでは空セル | Screen Reader利用者が状態を得られない可能性 | 構成変更 |
| UX-015 | Medium | Learning Experience | Admin | Admin User詳細 | 最後のAdminを変更できない理由がない | 安全制約を操作失敗と誤認 | 追加 |
| UX-016 | Medium | Learning Experience | Admin | Test Control | Scenario名だけで初期状態・対象画面が分からない | 学習者がReset条件を選べない | 追加／移動 |
| UX-017 | High | State Feedback | Admin／全Role | Test Control Reset | 影響確認なしにSession／途中状態が失われる | 作業を失い、Login／ForbiddenをErrorと誤認 | 追加 |
| UX-018 | Medium | Missing UI | Guest | Home `empty-catalog` | おすすめ／新着の空Sectionに理由と次の行動がない | 空白を読込失敗と誤認 | 追加 |
| UX-019 | Medium | State Feedback | Customer | Cart `cart-with-invalid-items` | 価格同意CTAがGeneric Errorで失敗し理由が残る | 修正方法が分からない | 構成変更 |
| UX-020 | High | State Feedback | Customer | `payment-processing`注文詳細 | 30秒超Loadingが続き状態が確定しない | Payment状態・再試行可否を判断不能 | 構成変更 |
| UX-021 | Medium | Data Flow | Customer | Checkout `checkout-replaced` | Cart version不一致を説明せずCheckoutを進める | 古い確認内容が置換されたか不明 | 追加 |

## 7. 指摘詳細

### UX-001：Checkout遷移後に重要なStateが画面外になる

- Severity：High
- 分類：State Feedback
- Role：Customer
- 対象画面：`/checkout/address`、`/checkout/payment`、`/checkout/confirm`、`/checkout/complete`
- Viewport：`390×844`（Desktop `1440×1000`では影響小）
- ユーザーの目的：Step、注文内容、支払い結果を確認して購入を完了する
- 関連データ：Checkout Step、配送先、Payment、注文番号、Cart
- 確認回数：完全なCheckoutを2回、Step遷移を複数回
- 確信度：高

#### 現在の状態

配送先選択後のPayment画面で`scrollY=472`、見出しのViewport位置が`-165px`になった。Confirm遷移後は`scrollY=848`、見出しが`-541px`、完了遷移後は`scrollY=700`、見出しが`-408px`だった。Accessibility Snapshotには内容が存在するが、Screenshot初期表示はFooter中心だった。

#### 問題

Route遷移が前画面でCTAを押すために移動したScroll位置を引き継ぎ、次画面の進捗・見出し・成功結果を初期Viewportに置かない。

#### ユーザーへの影響

支払いが完了していない、または二重送信されたと誤認する。注文番号と次の行動を見落とす可能性がある。

#### 再現手順

1. Customerで商品をCartへ追加する。
2. Checkoutで配送先を選択し、Paymentへ進む。
3. Paymentの下部CTAを押し、Confirmへ進む。
4. Confirmの下部CTAを押し、完了画面の初期Viewportを確認する。

#### 期待する体験

各Route遷移後にStepと見出しが視認でき、完了画面では注文番号、合計、注文詳細が直ちに読める。

#### 推奨区分

構成変更

#### 最小限の改善方針

Step遷移時に`main`またはページ見出しへ視点を移す。完了画面は成功Messageと注文番号を初期Viewportに置く。戻る操作とキーボードFocusは別途維持する。

#### 別画面・別Roleへの影響

Checkout各Step、注文完了、注文詳細リンクに影響する。Admin画面の操作には直接影響しない。

#### 根拠

- 実操作：Checkoutを2回完了。`scrollY`と見出し位置をBrowser Evaluateで確認
- Screenshot確認：`.playwright-mcp\page-2026-08-01T08-41-29-588Z.png`
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-40-39-972Z.yml`、`.playwright-mcp\page-2026-08-01T08-40-57-822Z.yml`、`.playwright-mcp\page-2026-08-01T08-41-09-043Z.yml`
- Console Error：主要操作ではError 0件
- コード確認：`src/presentation/pages/checkout-order-pages.tsx`を参照。Scroll復帰の根本原因は未特定

#### 関連する可能性がある実装

- File：`src/presentation/pages/checkout-order-pages.tsx`
- Component：Checkout Step／完了画面、App Frame
- 原因候補：Route遷移後のScroll restorationまたはFocus移動の未統一。コード上の根本原因は未特定

#### 未確認事項

Desktopでの視認性、Browser Back、キーボードFocus、支払失敗後の再試行Routeで同じScroll制御になるかは完全には未確認。

### UX-002：MobileのAccount Navigationが横Scrollになり項目が切れる

- Severity：Medium
- 分類：Responsive
- Role：Customer
- 対象画面：`/account/profile`、`/account/addresses`、`/orders`
- Viewport：`390×844`、比較として`320×700`
- ユーザーの目的：Profile、配送先、注文履歴を切り替える
- 関連データ：Account Navigation、注文履歴
- 確認回数：Profile／Addresses／Ordersを各Mobileで確認。OrdersとAddressesは水平Overflowを測定
- 確信度：高

#### 現在の状態

390pxではAccount Navigationに水平Scroll barが表示され、注文履歴の一部が右端で切れる。Document全体は横に広がらないが、Navigation内部は`clientWidth=349`、`scrollWidth=368`だった。

#### 問題

3項目が一画面に収まらず、横Scroll可能であることを利用者が理解しにくい。

#### ユーザーへの影響

注文履歴への導線を見落とし、Profile／配送先から出られないと感じる。

#### 再現手順

1. `390×844`でCustomerとして`/orders`を開く。
2. Account Navigationを確認する。
3. 3つ目の「注文履歴」が切れ、水平Scroll barが出ることを確認する。

#### 期待する体験

3導線が常に視認できる、または折り返し／縦積みで全項目が読める。横Scrollを採用する場合は可視の手がかりがある。

#### 推奨区分

構成変更

#### 最小限の改善方針

390px以下では2段折り返しまたは縦積みを検討する。横Scrollを残す場合は終端の見切れを示すAffordanceを追加する。

#### 別画面・別Roleへの影響

Profile、Addresses、OrdersのCustomer導線に共通影響する。StorefrontのMobile Navigationとは別Componentである。

#### 根拠

- 実操作：390pxの注文履歴、配送先、プロフィールで同じMenuを確認
- Screenshot確認：`.playwright-mcp\page-2026-08-01T08-34-56-439Z.png`、`.playwright-mcp\page-2026-08-01T08-46-00-373Z.png`
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-34-50-928Z.yml`、`.playwright-mcp\page-2026-08-01T08-45-40-986Z.yml`
- Console Error：Error 0件
- コード確認：`src/presentation/components/account-navigation.tsx`と`src/presentation/styles/global.css`のMobile `overflow-x:auto`を確認

#### 関連する可能性がある実装

- File：`src/presentation/components/account-navigation.tsx`、`src/presentation/styles/global.css`
- Component：`AccountNavigation`
- 原因候補：Mobile CSSで項目を`min-width:max-content`の横並びにしていること（コード確認済み）

#### 未確認事項

Touch操作で横Scrollした場合の発見性、OS固有のScroll bar表示差は未確認。

### UX-003：「右のフォーム」という空State文言がMobile配置と一致しない

- Severity：Low
- 分類：Wording
- Role：Customer
- 対象画面：`/account/addresses`の配送先未登録State
- Viewport：`1440×1000`、`390×844`
- ユーザーの目的：最初の配送先を登録する
- 関連データ：配送先、登録Form
- 確認回数：Desktop／Mobile各1回
- 確信度：高

#### 現在の状態

Desktopでは空Stateの右側にFormがあるため「右のフォーム」は一致する。MobileではFormが空Stateの下に縦積みされるが、文言は「右のフォームから最初の配送先を登録してください。」のままである。

#### 問題

レイアウトに依存する方向語がResponsive Layoutと一致しない。

#### ユーザーへの影響

Mobile利用者が右側を探し、登録Formの位置を一度判断し直す。

#### 再現手順

1. 配送先0件のCustomerで`/account/addresses`を開く。
2. DesktopとMobileの空State文言を比較する。
3. MobileでFormが下にあることを確認する。

#### 期待する体験

「登録Formから」などViewport非依存の案内で、直後の操作位置が分かる。

#### 推奨区分

構成変更

#### 最小限の改善方針

方向語を「登録Form」または「画面下のForm」に置き換える。新画面は不要。

#### 別画面・別Roleへの影響

Addresses空Stateのみ。Checkoutの「配送先を登録」導線には直接影響しない。

#### 根拠

- 実操作：配送先0件をDesktop／Mobileで確認
- Screenshot確認：`.playwright-mcp\page-2026-08-01T08-45-50-991Z.png`、`.playwright-mcp\page-2026-08-01T08-46-00-373Z.png`
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-45-40-986Z.yml`
- Console Error：Error 0件
- コード確認：`src/presentation/pages/addresses-page.tsx`の文言を確認

#### 関連する可能性がある実装

- File：`src/presentation/pages/addresses-page.tsx`
- Component：Addresses empty state
- 原因候補：固定方向語の文言。コード上で確認済み

#### 未確認事項

翻訳や将来の別Layoutは未確認。

### UX-004：Login済みでもHomeの「会員としてはじめる」がLoginへ進む

- Severity：Medium
- 分類：Navigation
- Role：Customer／Operator／Admin
- 対象画面：Home
- Viewport：`1440×1000`、`1024×900`、`390×844`
- ユーザーの目的：現在のAccount状態に応じて買い物または管理操作を開始する
- 関連データ：Session、Role、Home CTA
- 確認回数：Customer、Operator、Adminで各1回以上
- 確信度：高

#### 現在の状態

Login済みHomeでもHero CTAのラベルは「会員としてはじめる」、URLは`/login`のままである。HeaderにはLogoutが表示されるため、現在のSessionとCTAが矛盾する。

#### 問題

CTAがGuest専用か、Accountページへの導線か、既存Sessionを再認証する操作かが分からない。

#### ユーザーへの影響

CustomerはLogin画面を再表示され、Operator／Adminは自分の目的と無関係なLogin画面へ移動する。

#### 再現手順

1. Customer、Operator、またはAdminでLoginする。
2. Homeを開く。
3. 「会員としてはじめる」をクリックする。
4. LoginFormが再表示されることを確認する。

#### 期待する体験

GuestにはLogin CTA、Login済みCustomerには「Profileを見る」または「購入を続ける」、運用Roleには管理画面へのCTAを表示する。

#### 推奨区分

表示条件変更

#### 最小限の改善方針

SessionとRoleに応じてCTAを非表示または置換する。新画面は不要。

#### 別画面・別Roleへの影響

Home、Login、Customer／Operator／Admin Navigationに影響する。

#### 根拠

- 実操作：regular、operator、adminでHome CTAを確認
- Screenshot確認：`.playwright-mcp\page-2026-08-01T08-39-04-266Z.png`
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-38-54-928Z.yml`
- Console Error：Error 0件
- コード確認：`src/presentation/pages/home-page.tsx`で`/login`への固定Linkを確認。Role条件の有無は未確認

#### 関連する可能性がある実装

- File：`src/presentation/pages/home-page.tsx`
- Component：Home Hero CTA、App Frame
- 原因候補：CTAがSession／Roleを考慮しない固定Link。コード上の表示条件は未確認

#### 未確認事項

Roleごとに最適なCTAラベルを決める要件は未確認。

### UX-005：GuestのLogin後に元のCart／Checkoutへ戻らない

- Severity：High
- 分類：Navigation
- Role：Guest／Customer
- 対象画面：Cart、Login、Login後Home
- Viewport：Desktop、Mobile
- ユーザーの目的：Cartに入れた商品をLogin後そのまま購入する
- 関連データ：Guest Cart、Session、Checkout開始位置
- 確認回数：2回
- 確信度：高

#### 現在の状態

GuestがCartの「購入手続きへ」を押すと`/login`へ遷移する。regularでLogin成功後はHomeへ戻り、元のCartまたはCheckoutへのReturn情報は表示されない。

#### 問題

Loginが購入フローの途中に挿入されるのに、Login完了後の復帰先が保存・表示されない。

#### ユーザーへの影響

商品を探し直す、Cartを開き直す、購入手続きを再開する必要があり、離脱や二重操作につながる。

#### 再現手順

1. Guestで商品をCartへ追加する。
2. Cartから「購入手続きへ」を押す。
3. Login画面でregular AccountへLoginする。
4. Homeへ遷移し、Cart／Checkoutが自動表示されないことを確認する。

#### 期待する体験

Login後に元のCart、またはLoginが必要だったCheckout Stepへ戻り、復帰したことをMessageで示す。

#### 推奨区分

構成変更

#### 最小限の改善方針

Login入口にReturn先を保持し、成功後に復帰する。復帰できない場合でもHomeに「Cartへ戻る」導線と復帰説明を出す。

#### 別画面・別Roleへの影響

Guest Cart統合、Checkout、Login、Header Cart badgeに影響する。

#### 根拠

- 実操作：Cart→Login→regular Loginを2回確認
- Screenshot確認：Cart／Login画面のMCP Screenshotで確認。Return後のHomeはAccessibility Snapshotで確認
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-34-03-171Z.yml`、`.playwright-mcp\page-2026-08-01T08-34-40-091Z.yml`
- Console Error：Error 0件
- コード確認：Root原因は未特定

#### 関連する可能性がある実装

- File：`src/presentation/pages/auth-pages.tsx`、Cart／Checkoutページ
- Component：Login、Checkout入口
- 原因候補：Login後のReturn URL／Intent保持が不足している可能性。コード上の根本原因は未確認

#### 未確認事項

Signup後、直接URLでCheckoutへ入った場合、Suspended Accountの場合の復帰挙動は未確認。

### UX-006：Guest Cart統合の数量調整結果が説明されない

- Severity：Medium
- 分類：Data Flow
- Role：Guest／Customer
- 対象画面：Login後Cart
- Viewport：`1440×1000`、`390×844`
- ユーザーの目的：Guest中の商品と既存Customer Cartを正しく統合する
- 関連データ：Guest Cart、Customer Cart、SKU数量、購入上限、在庫
- 確認回数：通常統合を複数回、Overflow統合を1回
- 確信度：高

#### 現在の状態

Guest商品はLogin後のCustomer Cartに現れるが、統合成功のToastやSummaryはない。`guest-cart-merge-overflow`ではCustomer側3個とGuest側4個が最大数量5個になったが、2個分がどう扱われたか表示されなかった。

#### 問題

データは制約に従って調整されるが、数量差、保持された商品、削られた数量、在庫／上限理由が見えない。

#### ユーザーへの影響

購入数量が勝手に減った、商品が消えた、または統合されなかったと誤認する。

#### 再現手順

1. `guest-cart-merge-overflow`をTest Controlから初期化する。
2. Guestで同じSKUを4個Cartへ入れる。
3. regularでLoginする。Customer側に同じSKUが3個ある状態を使う。
4. Login後Cartの数量とFeedbackを確認する。

#### 期待する体験

「Guest Cartを統合しました。数量は上限5個のため7個から5個になりました」のように、統合前後と制約を説明する。

#### 推奨区分

追加

#### 最小限の改善方針

Login直後のCartまたはToastに統合Summaryを一度表示し、数量調整・価格変更・在庫不足をItem単位で示す。

#### 別画面・別Roleへの影響

Cart、Checkout、HeaderのCart件数に影響する。Admin在庫の説明とは別に、Customer向け制約表現が必要になる。

#### 根拠

- 実操作：通常統合を複数回、Overflowで3+4→5を確認
- Screenshot確認：Cart画面のMCP Screenshotで確認
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-26-59-451Z.yml`
- Console Error：Error 0件
- コード確認：`src/seeds/scenarios.ts`の`guest-cart-merge-overflow`を参照。表示原因は未特定

#### 関連する可能性がある実装

- File：Cart／Authページ、`src/seeds/scenarios.ts`
- Component：Cart item、Login success handling
- 原因候補：統合処理後のUser向けState Feedbackがない可能性。根本原因は未特定

#### 未確認事項

異なるSKUの統合、価格差と在庫不足が同時にある場合の優先順位は未確認。

### UX-007：Profileで会員RankとAccount状態を確認できない

- Severity：Medium
- 分類：Missing UI
- Role：Customer
- 対象画面：`/account/profile`
- Viewport：Desktop、Mobile
- ユーザーの目的：自分の会員Rank、割引、Account利用状態を確認する
- 関連データ：Customer Rank、Session、Account status、価格／送料Benefit
- 確認回数：regular／goldで各1回
- 確信度：高

#### 現在の状態

ProfileにはEmail、表示名、任意電話番号、保存Buttonだけが表示される。Gold ProfileにもGold表示はない。一方、Home、商品詳細、Cart、CheckoutではRankによる価格や送料が変化する。

#### 問題

価格が変わる根拠であるRankを、Accountの基準画面で確認できない。

#### ユーザーへの影響

「なぜ価格が安いのか」「自分がGoldなのか」をProfileへ戻っても確認できず、学習者は画面間の関係を推測する必要がある。

#### 再現手順

1. regularまたはgoldでLoginする。
2. `/account/profile`を開く。
3. Rank／Account statusの表示がないことを確認する。
4. Gold商品詳細またはCartで会員価格が表示されることと比較する。

#### 期待する体験

Profile上部に現在Rankと短いBenefitを表示し、必要なら詳細説明への既存導線を提供する。

#### 推奨区分

追加

#### 最小限の改善方針

ProfileにRank／Statusの小さなSummaryを追加する。長い制度説明や新画面は必須ではなく、Homeの短い説明を再利用する。

#### 別画面・別Roleへの影響

Product、Cart、Checkoutの価格説明と整合させる。Admin User詳細のRank表示にも影響する。

#### 根拠

- 実操作：regular／gold ProfileとGold商品詳細／Cartを比較
- Screenshot確認：Gold商品詳細、CartのMCP Screenshotで価格差を確認。ProfileはSnapshotを主証拠とした
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-46-14-858Z.yml`、Gold Profileの探索Snapshot
- Console Error：Error 0件
- コード確認：`src/presentation/pages/profile-page.tsx`を参照。Rank表示の根本原因は未特定

#### 関連する可能性がある実装

- File：`src/presentation/pages/profile-page.tsx`、Home／Product／Cartページ
- Component：Profile form、Customer summary
- 原因候補：ProfileがProfile formだけを表示する構成。コード上の根本原因は未特定

#### 未確認事項

PlatinumのBenefit表示、Rank変更後のProfile即時反映は未確認。

### UX-008：住所Lookupで入力済みの番地が消える

- Severity：Medium
- 分類：State Feedback
- Role：Customer
- 対象画面：`/account/addresses`
- Viewport：Desktop、Mobile
- ユーザーの目的：郵便番号から住所候補を取得し、配送先を保存する
- 関連データ：郵便番号、都道府県、市区町村、番地、配送先
- 確認回数：2回
- 確信度：高

#### 現在の状態

郵便番号を入力し、番地に`1-1`を入力した後で「住所候補を利用」を押すと、都道府県／市区町村は補完されたが、番地欄が空になった。番地を再入力して保存すると成功した。

#### 問題

Lookupが既に入力済みのユーザー入力を保持するか、上書きする場合の警告がない。

#### ユーザーへの影響

入力した番地が消えたことに気づかず、住所を不完全なまま保存する可能性がある。

#### 再現手順

1. 配送先追加Formを開く。
2. 郵便番号と番地を入力する。
3. 「住所候補を利用」を押す。
4. 番地欄が空になり、再入力が必要になることを確認する。

#### 期待する体験

未入力欄だけを補完する、または上書き前に確認して、変更された欄を明示する。

#### 推奨区分

構成変更

#### 最小限の改善方針

Lookupは既存値を保持し、候補値と異なる場合はField単位で確認できる状態にする。少なくとも上書き結果をStatusで知らせる。

#### 別画面・別Roleへの影響

Addresses、Checkoutの配送先選択、注文に保存される配送先Snapshotに影響する。

#### 根拠

- 実操作：郵便番号Lookupを2回のForm操作で確認
- Screenshot確認：`.playwright-mcp\page-2026-08-01T08-45-50-991Z.png`でFormを確認
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-35-33-138Z.yml`、`.playwright-mcp\page-2026-08-01T08-45-40-986Z.yml`
- Console Error：Error 0件
- コード確認：`src/presentation/pages/addresses-page.tsx`のLookup処理を参照。上書き意図は未確認

#### 関連する可能性がある実装

- File：`src/presentation/pages/addresses-page.tsx`
- Component：Address form、Postal lookup
- 原因候補：候補適用時にAddress Form stateを再設定する処理。根本原因は未特定

#### 未確認事項

建物名、電話番号、候補がない郵便番号、編集済み配送先での同じ挙動は未確認。

### UX-009：模擬環境の説明が複数位置に重複する

- Severity：Low
- 分類：Unnecessary UI
- Role：全Role
- 対象画面：Home、Login、Cart、Checkout、Footer
- Viewport：Desktop、Mobile、Small Mobile
- ユーザーの目的：商品選択や購入操作に集中しつつ、実取引でないことを理解する
- 関連データ：学習環境告知、実取引なしの安全説明
- 確認回数：Home／Login／Cart／Checkoutを複数Viewportで確認
- 確信度：高

#### 現在の状態

Header直下、Home本文末尾、各画面のNote、Footerに「実際の注文・決済・配送は行われない」という同趣旨の説明が出る。

#### 問題

安全告知自体は必要だが、同一の常時表示が主操作の近くに繰り返され、重要度の階層が平坦になる。

#### ユーザーへの影響

Login、Cart、Checkoutでフォームや合計確認に使える視覚的な注意が分散する。学習用であることを理解した後も同じ文を読むことになる。

#### 再現手順

1. GuestでHome、Login、Cartを開く。
2. CustomerでCheckout各Stepを開く。
3. Header、本文Note、Footerの同趣旨表示を比較する。

#### 期待する体験

常時必要な短いBadge／告知を1か所に集約し、入力時に重要な注意だけContextualに表示する。

#### 推奨区分

表示条件変更

#### 最小限の改善方針

安全性を損なわない範囲で、Headerの短いBadgeとFooterの詳細説明など役割を分ける。完全削除は推奨しない。

#### 別画面・別Roleへの影響

全Storefront画面とLogin／Checkoutに共通するため、共通Shellの変更影響が大きい。

#### 根拠

- 実操作：Home、Login、Cart、CheckoutをDesktop／Mobile／Small Mobileで確認
- Screenshot確認：`.playwright-mcp\page-2026-08-01T08-34-11-250Z.png`、`.playwright-mcp\page-2026-08-01T08-37-26-219Z.png`、`.playwright-mcp\page-2026-08-01T08-38-12-415Z.png`
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-42-57-730Z.yml`ほか各Route Snapshot
- Console Error：Error 0件
- コード確認：共通Shellと各ページの告知表示を参照。重複の意図は未確認

#### 関連する可能性がある実装

- File：`src/presentation/shells/app-frame.tsx`、各Storefront／Checkoutページ
- Component：Header Notice、Page Note、Footer
- 原因候補：安全告知を複数レベルで常時レンダーしている構成。根本原因は未特定

#### 未確認事項

初回利用者と反復利用者での理解度差、告知を折りたたんだ場合の学習効果は未確認。

### UX-010：Reviewの対象商品とReview状態が分かりにくい

- Severity：Medium
- 分類：Information Architecture
- Role：Customer
- 対象画面：配達済み注文詳細、Review投稿／編集／非表示／削除済み画面
- Viewport：Desktop、`390×844`
- ユーザーの目的：配達済みの商品を特定し、未投稿Reviewを投稿または既存Reviewを編集する
- 関連データ：注文Item、Product、Review status、投稿条件
- 確認回数：配達済み注文の10 Item、未投稿／公開済み／非表示／削除済みRouteを確認
- 確信度：高

#### 現在の状態

注文詳細の全Itemに「レビューを投稿・編集」が表示される。Review画面の見出しは「レビューを投稿」または「レビューを編集」だが、商品名が出ない。非表示Reviewも編集、削除済みReviewは投稿不可という状態が、注文一覧Actionでは分からない。

#### 問題

対象商品と現在状態が画面間で分離され、CustomerがReview対象を記憶またはURLから推測する必要がある。

#### ユーザーへの影響

同じ商品が複数ある注文で誤ったItemを選ぶ可能性がある。投稿済みなのに再投稿しようとしたり、削除済みで困惑する。

#### 再現手順

1. `reviewable-orders`またはDefaultの配達済み注文を開く。
2. ItemごとのReview Actionを比較する。
3. 未投稿、既存、非表示、削除済みの各Review URLを開く。
4. 商品名と状態説明の有無を確認する。

#### 期待する体験

Order Itemに商品名と「未投稿」「公開中」「非表示」「投稿不可」を表示し、Review Formにも商品名とOrder Itemを表示する。

#### 推奨区分

追加

#### 最小限の改善方針

Actionラベルを状態に応じて変え、Review画面上部にProduct name／Variant／注文日を追加する。Reviewの内部状態をCustomer向けStatusに翻訳する。

#### 別画面・別Roleへの影響

Admin Review管理の公開／非公開状態とCustomer表示の対応が必要になる。ProductのReview Summaryには直接影響しない。

#### 根拠

- 実操作：配達済み注文、未投稿Review投稿、既存／非表示／削除済みReviewを確認
- Screenshot確認：`.playwright-mcp\page-2026-08-01T08-35-17-675Z.png`
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-35-07-660Z.yml`およびReview各Route Snapshot
- Console Error：Error 0件
- コード確認：Review／Order User pagesを参照。表示不足の根本原因は未特定

#### 関連する可能性がある実装

- File：`src/presentation/pages/review-user-pages.tsx`、Order detail pages
- Component：Order item review action、Review form
- 原因候補：Review FormがProduct contextを見出しへ渡していない可能性。未確認

#### 未確認事項

CustomerがReview一覧から自分の投稿を横断確認できるか、Review削除後のProduct集計表示は未確認。

### UX-011：Adminの未保存変更を失う前に警告がない

- Severity：Medium
- 分類：State Feedback
- Role：Admin
- 対象画面：商品新規登録、商品編集
- Viewport：`1440×1000`
- ユーザーの目的：長い商品Formを入力し、保存またはPreviewしてから画面を離れる
- 関連データ：Product name、Description、SKU、画像、未保存変更
- 確認回数：新規Formと既存編集Formで各1回
- 確信度：高

#### 現在の状態

新規登録Formで商品名を入力後にBreadcrumbで別画面へ移動しても警告が出なかった。既存商品のShort Descriptionを編集後に商品一覧へ移動しても同様だった。

#### 問題

保存Buttonに到達しないままRouteを離れると、入力内容が失われるが、Unsaved Changesの状態表示や確認Dialogがない。

#### ユーザーへの影響

長いFormを再入力する。学習者は保存操作を忘れたのか、保存済みなのか判断できない。

#### 再現手順

1. Adminで商品新規または編集画面を開く。
2. 商品名または説明を変更する。
3. 保存せずAdmin NavigationまたはBreadcrumbで別画面へ移動する。
4. 確認なしに移動し、入力が保持されないことを確認する。

#### 期待する体験

未保存状態を明示し、離脱時に「破棄して移動／戻る」を選べる。

#### 推奨区分

追加

#### 最小限の改善方針

Form dirty stateを検出し、離脱時だけ確認Dialogを表示する。保存／Previewの操作感は維持する。

#### 別画面・別Roleへの影響

Admin商品編集と新規登録の共通Formに影響する。Operatorの編集権限がある場合にも同じ挙動が必要になる。

#### 根拠

- 実操作：新規Formと既存Formで入力後にNavigation離脱
- Screenshot確認：Admin商品編集FormをMCP Screenshotで確認
- Accessibility Snapshot：商品編集／新規登録のMCP Snapshot
- Console Error：Error 0件
- コード確認：保存Form構成を参照。Unsaved guardの根本原因は未特定

#### 関連する可能性がある実装

- File：`src/presentation/pages/admin-product-pages.tsx`
- Component：Admin product form、App navigation
- 原因候補：dirty stateをRoute離脱へ接続する処理が未実装または未接続の可能性。未確認

#### 未確認事項

Browser Back、Refresh、File upload途中、Confirm Dialog中のKeyboard操作は未確認。

### UX-012：未保存PreviewがStorefront表示を十分に検証できない

- Severity：Medium
- 分類：Consistency
- Role：Admin／Storefront利用者
- 対象画面：Admin商品編集の「未保存内容をプレビュー」
- Viewport：`1440×1000`
- ユーザーの目的：保存前にStorefrontでの見え方を確認する
- 関連データ：Product name、Price、Image、Description、Variant、公開状態
- 確認回数：既存商品編集で1回
- 確信度：高

#### 現在の状態

Previewは「未保存プレビュー」としてProduct ID、商品名、Price、DB未保存であることを表示した。画像、説明、Variant、在庫状態、StorefrontのCard／Detail構造は表示されなかった。

#### 問題

Previewという名称に対して、実際のStorefront差分を確認できる情報が不足する。

#### ユーザーへの影響

商品名と価格以外の変更がStorefrontでどう見えるか、公開前に判断できない。

#### 再現手順

1. Admin商品編集で商品名または画像／説明を変更する。
2. 「未保存内容をプレビュー」を押す。
3. Storefront相当のImage、Description、Variant表示がないことを確認する。

#### 期待する体験

保存されないことを明示しつつ、Storefrontの商品Card／Detailに近い構成で変更結果を確認できる。

#### 推奨区分

構成変更

#### 最小限の改善方針

新しいPreview画面を増やすより、既存Dialog／RegionにImage、Description、代表Variant、公開状態を追加する。Storefrontと同じ表示ロジックを共有できるか検討する。

#### 別画面・別Roleへの影響

Admin編集とStorefrontの商品詳細／一覧の整合性に影響する。

#### 根拠

- 実操作：商品編集で未保存Previewを開いた
- Screenshot確認：Admin商品編集とPreviewをMCP Screenshotで確認
- Accessibility Snapshot：Preview Regionに「DBには保存されていません」とPrice／Nameだけが出るSnapshot
- Console Error：Error 0件
- コード確認：`src/presentation/pages/admin-product-pages.tsx`のPreview実装を確認

#### 関連する可能性がある実装

- File：`src/presentation/pages/admin-product-pages.tsx`
- Component：`product-preview`、Storefront Product Card／Detail
- 原因候補：Previewが要約情報だけを組み立てる実装。コード上で確認したが、設計意図は未確認

#### 未確認事項

画像を変更した場合、公開保存後のStorefront反映とCache更新は未確認。

### UX-013：発送準備開始後の注文状態が同一画面内で一時不一致

- Severity：Medium
- 分類：Consistency
- Role：Operator／Admin
- 対象画面：Admin注文詳細
- Viewport：`1440×1000`
- ユーザーの目的：注文のShipment状態を次の状態へ進め、結果を確認する
- 関連データ：Order status、Shipment status、Payment、Operation version
- 確認回数：発送準備開始、発送済み、配送完了を各1回。Reload確認あり
- 確信度：高

#### 現在の状態

「発送準備を開始」を押した直後、ページ見出しは「発送準備中・操作バージョン3」、Status MessageもSuccessだった。一方、「支払い・配送」欄は「配送：発送準備前」のまま残った。後続の発送済み、配送完了では欄も同期した。

#### 問題

同じOrder detailに複数のStatus表示があり、最初の遷移だけ更新タイミングまたは表示Mappingが揃わない。

#### ユーザーへの影響

更新が成功したのか、もう一度操作すべきか判断できない。Customerに反映された状態との対応も一時的に分からない。

#### 再現手順

1. AdminでPayment済み注文詳細を開く。
2. 「発送準備を開始」を押す。
3. 見出しと「支払い・配送」欄を比較する。
4. Reload後も比較する。

#### 期待する体験

Order status、Shipment欄、操作可能Buttonが同一の状態を示し、Success後にCustomer表示へ反映される条件も分かる。

#### 推奨区分

構成変更

#### 最小限の改善方針

Order／Shipmentの表示源を揃え、更新中は明示的なLoading、完了後は全Statusを再取得して同じLabelを表示する。

#### 別画面・別Roleへの影響

Admin注文詳細、Admin一覧、Customer注文一覧／詳細に影響する。

#### 根拠

- 実操作：発送準備開始→発送済み→配送完了、Reload
- Screenshot確認：Admin注文詳細のMCP ScreenshotでHeadingとStatus欄を確認
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-02-27-156Z.yml`、Reload後`.playwright-mcp\page-2026-08-01T08-02-34-949Z.yml`
- Console Error：Error 0件
- コード確認：`src/presentation/pages/admin-operations-pages.tsx`の操作Version／Status Messageを確認。表示不一致の根本原因は未特定

#### 関連する可能性がある実装

- File：`src/presentation/pages/admin-operations-pages.tsx`
- Component：Admin order detail、Shipment status panel
- 原因候補：更新後の表示StateとOrder snapshotの再取得タイミング差。未特定

#### 未確認事項

Customerが同時に注文詳細を開いている場合のリアルタイム反映は未確認。

### UX-014：管理TableのStatus／Role／RankがAccessibility Snapshotで空セルになる

- Severity：Medium
- 分類：Accessibility
- Role：Operator／Admin
- 対象画面：Admin Products、Categories、Brands、Inventories、Orders、Reviews、Users
- Viewport：`1440×1000`
- ユーザーの目的：一覧で状態を読み取り、対象を操作する
- 関連データ：公開状態、在庫状態、Order status、Review status、User role／rank／status
- 確認回数：複数Admin Tableで反復確認
- 確信度：中

#### 現在の状態

Screenshotでは「公開中」「公開待ち」「利用中」などのBadgeが視認できるが、Accessibility Snapshotでは該当Table cellのTextが空になり、Badge内容が読めない構造が繰り返された。

#### 問題

視覚情報とAssistive Technology向けの情報構造が一致しない可能性がある。

#### ユーザーへの影響

Screen Reader利用者がFilter結果、公開状態、User権限を判断できない可能性がある。学習者がSnapshotでテスト対象を特定できない。

#### 再現手順

1. AdminでProductsまたはUsersを開く。
2. ScreenshotでStatus／Role Badgeを確認する。
3. Accessibility Snapshotで同じCellを確認する。
4. Badge相当のTextが空であることを比較する。

#### 期待する体験

Badgeの意味がAccessible name／Textとして読め、視覚表示と同じ状態を得られる。

#### 推奨区分

構成変更

#### 最小限の改善方針

StatusをCellのTextまたは適切なAccessible labelとして提供する。Decorative iconは隠し、状態本体は隠さない。

#### 別画面・別Roleへの影響

Admin全TableとPlaywright Accessibility Snapshot、Screen Reader操作に影響する。

#### 根拠

- 実操作：Products、Categories、Brands、Inventories、Orders、Reviews、Usersを確認
- Screenshot確認：`.playwright-mcp\page-2026-08-01T08-03-53-375Z.png`
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-03-45-948Z.yml`および各Admin Table Snapshot
- Console Error：Error 0件
- コード確認：Badge実装の根本原因は未特定

#### 関連する可能性がある実装

- File：各Admin一覧ページ、共通Table／Badge Component
- Component：Admin table status cell、Role／Rank badge
- 原因候補：Badgeが視覚要素としてのみレンダーされる、またはCellからAccessible nameが分離している可能性。コード上未特定

#### 未確認事項

実際のNVDA／VoiceOverでの読み上げ、Keyboard Table Navigation、BadgeのHTML属性は未確認。

### UX-015：最後のAdminを変更できない理由が表示されない

- Severity：Medium
- 分類：Learning Experience
- Role：Admin
- 対象画面：`/admin/users/user-admin`
- Viewport：`1440×1000`
- ユーザーの目的：User Role／Statusを安全に変更する
- 関連データ：Admin人数、Role、Account status、権限制約
- 確認回数：Admin詳細で1回
- 確信度：高

#### 現在の状態

最後のAdminのRole変更と利用停止操作がDisabledだった。Customer UserにはRank変更やSuspendの説明があるが、最後のAdminには「なぜ操作できないか」の説明がない。

#### 問題

安全のための制約が、未実装、権限不足、操作Version競合のどれか分からない。

#### ユーザーへの影響

Adminが別Accountへ権限を移せない理由を理解できず、Test操作として何を確認すべきか迷う。

#### 再現手順

1. AdminでUser一覧から最後のAdminを開く。
2. Role変更／利用停止Controlを確認する。
3. Disabled理由のTextがないことを確認する。

#### 期待する体験

「最後のAdminは変更・停止できません。先に別のAdminを用意してください」など、安全制約と次の行動を示す。

#### 推奨区分

追加

#### 最小限の改善方針

Disabled Controlの直下に理由を1文で表示する。危険操作Dialogの追加説明と同じ語彙に揃える。

#### 別画面・別Roleへの影響

User一覧、User詳細、Login可否、Admin Navigationに影響する。

#### 根拠

- 実操作：Admin User詳細でDisabled Controlを確認
- Screenshot確認：Admin User詳細のMCP Screenshotで確認
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-04-20-042Z.yml`
- Console Error：Error 0件
- コード確認：User管理ページを参照。制約判定の根本原因は未特定

#### 関連する可能性がある実装

- File：Admin User pages
- Component：User role／status controls
- 原因候補：Disabled理由を説明するUIが不足。判定ロジックの根本原因は未確認

#### 未確認事項

Adminが2人以上いる場合の変更可否と、変更後のSession反映は未確認。

### UX-016：Test ControlのScenario名だけでは初期状態が分からない

- Severity：Medium
- 分類：Learning Experience
- Role：Admin
- 対象画面：`/admin/test-control`
- Viewport：Desktop、Mobile境界表示
- ユーザーの目的：目的に合う決定的なScenarioを選び、確認対象を再現する
- 関連データ：Scenario、初期Account、Seed状態、基準時刻、Payment遅延
- 確認回数：Test Controlを複数Scenarioで確認
- 確信度：高

#### 現在の状態

Scenario Selectには`empty-catalog`、`payment-declined`、`checkout-replaced`などの名前が並ぶ。現在Scenario、Clock、Payment delayは分かるが、Scenarioの説明、初期Login Account、初期Cart、確認すべきRoute、Reset影響は表示されない。

#### 問題

名前から状態を推測しなければならず、似たScenarioの差分や実行順が理解しにくい。

#### ユーザーへの影響

学習者が誤ったAccountで確認し、Scenarioの失敗をアプリの問題と誤認する。

#### 再現手順

1. AdminでTest Controlを開く。
2. Scenario Selectを開く。
3. Scenario名以外の説明、初期Account、確認画面がないことを確認する。

#### 期待する体験

選択中Scenarioに、目的、初期Account、初期データ、主な確認Route、Reset影響を表示する。

#### 推奨区分

追加／移動

#### 最小限の改善方針

Selectの横に短いContextual HelpまたはAccordionを追加する。Scenario Guideを新設する場合も、Scenario説明の集約を目的に限定する。

#### 別画面・別Roleへの影響

LoginのTest Account説明、学習Guide、Admin Test Controlの役割分担に影響する。

#### 根拠

- 実操作：Test ControlのScenario一覧と複数Reset後の画面を確認
- Screenshot確認：Test ControlのMCP Screenshotで確認
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-42-23-741Z.yml`、`.playwright-mcp\page-2026-08-01T08-47-02-402Z.yml`
- Console Error：Error 0件
- コード確認：`src/presentation/pages/review-user-pages.tsx`のTest Control UIを参照

#### 関連する可能性がある実装

- File：`src/presentation/pages/review-user-pages.tsx`
- Component：Test Control、Scenario Select
- 原因候補：Scenario metadataを画面に渡すUIが未実装の可能性。根本原因は未特定

#### 未確認事項

テストAPI利用者向けに別Guideが既に存在するか、README以外の学習導線は未確認。

### UX-017：Test Control初期化の影響が確認なしにSessionへ及ぶ

- Severity：High
- 分類：State Feedback
- Role：Admin／全Role
- 対象画面：`/admin/test-control`
- Viewport：`1440×1000`
- ユーザーの目的：Scenarioを安全に初期化し、同じ条件で学習を再開する
- 関連データ：Session、Cart、Checkout、Order、Scenario、基準時刻
- 確認回数：複数Scenario Resetで確認
- 確信度：高

#### 現在の状態

「シナリオを初期化」を押すと、途中SessionがLoginから外れ、`/login`または一時的に`/forbidden`へ遷移した。途中Cart／Checkoutが維持されるか、どのデータがResetされたかを確認するDialogはない。

#### 問題

破壊的に見える操作に対して、対象、影響、完了後の遷移、復帰方法が操作前後に説明されない。

#### ユーザーへの影響

入力やCheckoutを失い、RedirectをアプリErrorと誤認する。学習Scenarioを切り替えた結果を理解しにくい。

#### 再現手順

1. Adminで途中CartまたはSessionを持つ状態を作る。
2. Test Controlで別Scenarioを選び初期化する。
3. 確認Dialogがなく、Login／Forbiddenへ遷移することを確認する。

#### 期待する体験

初期化前に「全Session、Cart、Checkout、Scenarioデータが初期状態へ戻る」などを表示し、完了後は「Loginが必要」と明示する。

#### 推奨区分

追加

#### 最小限の改善方針

Reset前に確認Dialog、Reset後にResult Bannerと次のLogin／確認手順を表示する。Test Controlの操作範囲を専用Contextに限定する案内も必要。

#### 別画面・別Roleへの影響

全RoleのSession、Cart、Checkout、Admin作業に影響する。Customer画面へ誤って表示しないことが重要。

#### 根拠

- 実操作：`empty-catalog`、`reviewable-orders`、`cart-with-invalid-items`等をUIからResetし、Session遷移を確認
- Screenshot確認：Test Control Reset前後のMCP Screenshotで確認
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-47-02-402Z.yml`、Reset後`.playwright-mcp\page-2026-08-01T08-47-26-116Z.yml`
- Console Error：Reset後のConsole Error 0件。ただしRedirectは発生
- コード確認：`src/presentation/pages/review-user-pages.tsx`でReset後Reload処理を確認

#### 関連する可能性がある実装

- File：`src/presentation/pages/review-user-pages.tsx`
- Component：Test Control reset、Session／page reload handling
- 原因候補：Resetがアプリ全体の状態とSessionを初期化する設計。説明UIが不足している。Reset仕様の根本原因は未特定

#### 未確認事項

Reset中の同時操作、複数Browser Contextへの影響、API利用時の表示は未確認。

### UX-018：`empty-catalog`でHomeの空Sectionに説明がない

- Severity：Medium
- 分類：Missing UI
- Role：Guest
- 対象画面：Home、商品一覧
- Viewport：Desktop、Mobile
- ユーザーの目的：商品がない状態の理由を理解し、次の行動を選ぶ
- 関連データ：公開商品、Category件数、おすすめ／新着Section
- 確認回数：`empty-catalog` Reset後にHomeと`/products`を確認
- 確信度：高

#### 現在の状態

商品一覧は「現在、表示できる商品はありません」「商品が公開されると一覧が表示されます」と説明し、Filter件数も0になる。一方、Homeの「おすすめ商品」「新着商品」は見出しだけが残り、空理由や商品一覧へのActionが表示されない。

#### 問題

同じ公開Catalogの空状態が画面によって説明されない。

#### ユーザーへの影響

Homeの空白をLoading失敗、Session不整合、表示Bugと誤認する。学習者がScenarioの意図を理解しにくい。

#### 再現手順

1. Test Controlで`empty-catalog`を初期化する。
2. Guest Homeを開く。
3. おすすめ／新着Sectionが空で説明なしであることを確認する。
4. `/products`の明示的なEmpty Stateと比較する。

#### 期待する体験

Homeにも「現在公開中の商品がありません」と表示し、商品一覧またはTest Guideへの導線を示す。

#### 推奨区分

追加

#### 最小限の改善方針

既存Product listのEmpty State文言をHome Sectionへ短く再利用する。新画面は不要。

#### 別画面・別Roleへの影響

Home、Product list、Category count、Test Control Scenario説明に影響する。

#### 根拠

- 実操作：`empty-catalog` Home／Product listを確認
- Screenshot確認：Empty Catalog後のMCP Screenshotで確認
- Accessibility Snapshot：Home／Product listのEmpty State Snapshot
- Console Error：Error 0件
- コード確認：Home／Product listの表示分岐を参照。根本原因は未特定

#### 関連する可能性がある実装

- File：`src/presentation/pages/home-page.tsx`、Product list pages
- Component：Home Product Section、Empty State
- 原因候補：Home Sectionが空配列をそのまま描画し、Empty Stateを共有していない可能性。未特定

#### 未確認事項

`many-products`でHome SectionがOverflowまたはPaginationをどう扱うかは未確認。

### UX-019：Cartの価格同意CTAがGeneric Errorで失敗する

- Severity：Medium
- 分類：State Feedback
- Role：Customer
- 対象画面：Cart `cart-with-invalid-items`
- Viewport：Desktop
- ユーザーの目的：価格変更を確認し、購入可能な商品だけでCheckoutへ進む
- 関連データ：Cart item、追加時価格、現在価格、公開状態、在庫、Checkout可否
- 確認回数：Scenarioで価格同意操作を1回、各Invalid Item削除を確認
- 確信度：高

#### 現在の状態

Cartには価格変更、非公開、SKU無効、在庫切れItemが混在する。上部には「現在価格を確認して同意する」が出るが、押すとAlert「カートを更新できませんでした。」だけが表示され、価格Warningが残った。下部には購入不可Itemを修正／削除する案内がある。

#### 問題

複数のInvalid状態がある場合、CTAが何を解決できるButtonなのか不明で、失敗理由と次の操作がGeneric Errorに集約される。

#### ユーザーへの影響

価格同意を再試行すべきか、先にInvalid Itemを削除すべきか分からない。

#### 再現手順

1. `cart-with-invalid-items`を初期化し、regularでLoginする。
2. Cartの価格変更WarningとInvalid Itemを確認する。
3. 「現在価格を確認して同意する」を押す。
4. Generic ErrorとWarningが残ることを確認する。

#### 期待する体験

価格だけ同意可能なら価格を更新し、非公開／在庫切れが原因なら「先に削除してください」とButton状態・説明を一致させる。

#### 推奨区分

構成変更

#### 最小限の改善方針

CTAの有効条件を価格変更だけに限定するか、Invalid Itemがある場合は無効化してItem単位の修正導線を優先する。失敗時は原因を具体化する。

#### 別画面・別Roleへの影響

Cart、Checkout可否、Product公開／在庫、Adminでの価格変更に影響する。

#### 根拠

- 実操作：Invalid Cartで価格同意を押し、Generic Alertを確認
- Screenshot確認：Invalid Cart画面のMCP ScreenshotでWarning／Item Errorを確認
- Accessibility Snapshot：`.playwright-mcp\page-2026-08-01T08-08-16-983Z.yml`
- Console Error：Browser Console Errorではなく画面Alert。Console Error 0件
- コード確認：`src/presentation/pages/cart-page.tsx`の価格確認表示を参照。更新失敗原因は未特定

#### 関連する可能性がある実装

- File：`src/presentation/pages/cart-page.tsx`、Cart service
- Component：Cart price change banner、Invalid item row
- 原因候補：複数Invalid状態を一つの価格同意Actionで処理している可能性。未特定

#### 未確認事項

価格変更だけでInvalid ItemがないCart、在庫だけが変化したCartでの同意結果は未確認。

### UX-020：`payment-processing`の注文詳細がLoadingから進まない

- Severity：High
- 分類：State Feedback
- Role：Customer
- 対象画面：`/orders/order-payment-failed`、`payment-processing` Scenario
- Viewport：Desktop相当
- ユーザーの目的：処理中Paymentの状態、待つべきか再試行すべきかを理解する
- 関連データ：Payment processing、Order status、再試行、Loading state
- 確認回数：Snapshot／Navigateを複数回。30秒超待機
- 確信度：中（Scenario固有のLoading不具合の可能性を含む）

#### 現在の状態

`payment-processing`を初期化し、regularで`/orders/order-payment-failed`へ移動すると、「読み込んでいます／表示に必要な情報を準備しています」が30秒超継続した。NavigateとSnapshotがTimeoutし、LogoutやHome遷移も同じTabでは一時的に進まなかった。別の安定した専用Tabを選択すると探索を再開できた。

#### 問題

処理中という一時状態から、成功、失敗、再試行可能、Timeoutのいずれにも遷移しない。

#### ユーザーへの影響

Payment処理を待つべきか、注文が作成されたか、再試行してよいか判断できない。

#### 再現手順

1. Test Controlで`payment-processing`を初期化する。
2. regularでLoginする。
3. `/orders/order-payment-failed`を開く。
4. 30秒以上Loadingが続くことを確認する。

#### 期待する体験

処理中なら状態、経過、次の確認方法を示す。一定時間でTimeoutと注文詳細／再試行への安全な導線を出す。

#### 推奨区分

構成変更

#### 最小限の改善方針

Payment processingを画面上の明示Stateとして扱い、Polling／再読込／Timeoutのいずれかを設計する。二重Paymentを防ぐ説明を付ける。

#### 別画面・別Roleへの影響

Customer注文詳細、Payment履歴、Admin注文一覧、Test Controlの遅延設定に影響する。

#### 根拠

- 実操作：Scenario初期化後に30秒超待機し、Navigate／Snapshotを再試行
- Screenshot確認：Loading画面をMCP Screenshotで確認
- Accessibility Snapshot：Loading Snapshotを複数回取得。完了注文情報は得られなかった
- Console Error：`.playwright-mcp\console-2026-08-01T08-17-03-106Z.log`周辺。Tool Timeoutは発生したが、Browser Console Errorは確認できず
- コード確認：`src/seeds/scenarios.ts`のPayment processing Scenarioを参照。Root causeは未特定

#### 関連する可能性がある実装

- File：Payment／Order detail pages、`src/seeds/scenarios.ts`
- Component：Order detail loader、Payment status polling
- 原因候補：processing状態のOrder取得または遷移条件が未完了になる可能性。未特定

#### 未確認事項

Server側の基準時刻、他のPayment processing Order、一定時間後に自然回復するかは未確認。今回の探索はこの状態を理由に全体を終了せず、未確認として記録した。

### UX-021：CheckoutのCart version不一致が説明されない

- Severity：Medium
- 分類：Data Flow
- Role：Customer
- 対象画面：`checkout-replaced` ScenarioのCheckout
- Viewport：Desktop
- ユーザーの目的：確認済みのCart内容がそのまま注文に使われることを理解する
- 関連データ：Cart version、Checkout session、商品価格、数量、注文Snapshot
- 確認回数：`checkout-resume`／`checkout-replaced`／version不一致系を確認
- 確信度：中

#### 現在の状態

Seed上でCheckout sessionのCart versionと現Cart versionが異なるScenarioを使ったが、画面には古いCheckoutが置換された、Cartが更新された、再確認が必要という説明が出なかった。配送先、Payment、Confirmを進め、注文完了まで到達した。

#### 問題

システム上の競合やCheckout再開がユーザー向けの意味に翻訳されず、確認した価格・数量が最新である保証が画面から分からない。

#### ユーザーへの影響

意図しない価格／数量で注文した可能性を認識できない。学習者はCart versionの意味を学べない。

#### 再現手順

1. `checkout-replaced`またはCart version不一致Scenarioを初期化する。
2. regularでLoginし、配送先を用意する。
3. Checkoutの配送先、Payment、Confirmを進める。
4. Version不一致の説明がなく注文が完了することを確認する。

#### 期待する体験

Cartまたは価格が更新された場合、Confirm前に「最新のCartを再確認してください」と表示し、変更内容を示す。

#### 推奨区分

追加

#### 最小限の改善方針

Version不一致を内部IDではなく、商品・価格・数量の変更Summaryとして表示する。Confirm CTA前に再同意を要求するかはScenario要件に合わせる。

#### 別画面・別Roleへの影響

Cart、Checkout、注文Snapshot、Admin注文詳細の確定価格に影響する。

#### 根拠

- 実操作：version不一致ScenarioでCheckoutを完了
- Screenshot確認：Checkout Confirm／CompleteのMCP ScreenshotでWarningがないことを確認
- Accessibility Snapshot：Checkout各StepのSnapshot
- Console Error：Error 0件
- コード確認：`src/seeds/scenarios.ts`の`checkout-replaced`／Cart version mismatchデータを確認。UIでの警告未表示を実操作で確認

#### 関連する可能性がある実装

- File：`src/seeds/scenarios.ts`、`src/presentation/pages/checkout-order-pages.tsx`、Cart service
- Component：Checkout session loader、Cart version validation
- 原因候補：Version mismatchをCheckout UIへ変換するFeedbackが不足。根本原因は未特定

#### 未確認事項

価格だけ、数量だけ、在庫だけが変化するVersion mismatchの表示差は未確認。

## 8. 追加した方がよいUI・情報

| 優先度 | Role | 画面 | 追加候補 | 必要な理由 | 表示条件 | 過剰設計のRisk |
|---|---|---|---|---|---|---|
| P1 | Customer | Checkout／完了 | 遷移後の見出しFocus、注文番号の初期表示 | 完了・進捗を見落とさないため | Route遷移後、完了時 | 共通Scroll変更で既存Back操作を壊す |
| P1 | Guest／Customer | Login後Cart | Cart統合Summary | 数量上限、価格、在庫の変化を理解するため | Guest Cartを統合した直後のみ | 毎回のCart表示に常設しない |
| P1 | Customer | Checkout | Cart version／価格変更Summary | Confirm内容の信頼性を判断するため | Version不一致時のみ | 内部Version番号を直接見せない |
| P1 | Customer | Payment processing | 処理中、Timeout、再確認Action | 待つ／再試行の判断に必要 | Payment processing時のみ | 通常Success画面を複雑にしない |
| P2 | Customer | Profile | Rank、Account status、短いBenefit | Product／Cartの価格差の根拠になるため | Login済み常時 | 長い制度説明をProfileへ詰め込まない |
| P2 | Customer | Order／Review | Product name、Variant、Review status | 対象と投稿可否を識別するため | Review可能／投稿済み／非表示時 | 内部Review statusをそのまま表示しない |
| P2 | Admin | Product Form | Unsaved Changes警告 | 長いFormの入力消失を防ぐため | Dirty stateで離脱時のみ | 保存済み画面にDialogを出さない |
| P2 | Admin | Test Control | Scenario目的、初期Account、確認Route、Reset影響 | 学習者がScenarioを選ぶため | Scenario選択時のContextual Help | 新しいGuide画面を必須にしない |
| P3 | Guest | Home empty Section | 空理由と商品一覧／Guide導線 | Empty CatalogをLoading失敗と区別するため | 商品0件時のみ | 通常CatalogのHomeを冗長にしない |
| P2 | Admin | User詳細 | 最後のAdminを変更できない理由 | 安全制約を理解するため | 操作Disabled時のみ | 危険操作の説明を重複させない |

## 9. 削除した方がよいUI・情報

| 優先度 | Role | 画面 | 削除候補 | 不要な理由 | 削除によるRisk |
|---|---|---|---|---|---|
| P3 | 全Role | Home／Login／Cart／Checkout | 同一内容の常時重複告知の一部 | 安全説明を複数回読ませ、主操作の階層を下げる | 模擬環境でないと誤認する可能性。Headerの短い告知は残す |
| P4 | Admin | 注文詳細 | Routine画面に常時出るUser ID | Customer名／Emailで運用判断でき、内部IDは主目的ではない | 調査時に必要な場合があるため詳細Accordionへ残す |
| P3 | Customer | Review Action | 全状態で同じ「投稿・編集」文言 | 状態を表さず誤操作を誘う | 投稿導線を見失う可能性。状態別Labelへ置換する |

## 10. 別画面へ移動した方がよいUI・情報

| 優先度 | 現在の画面 | 対象要素 | 移動先候補 | 移動理由 | 新画面の必要性 |
|---|---|---|---|---|---|
| P2 | Login | 固定Test Accountの全一覧・Password説明 | Test Guide、Help、Accordion | Loginの主目的を保ちつつ初回学習者を支援するため | DialogまたはAccordionで十分 |
| P2 | Test Control | Scenarioの詳細、初期Account、確認Route | Scenario GuideまたはContextual Help | Reset操作と学習手順を分離するため | 既存画面へ統合。新画面は必要性を見て判断 |
| P3 | Home | 会員Rankの長い制度説明 | Help／Account説明 | 商品探索時の情報密度を上げないため | 現在の短いBenefitは現状維持。長文を増やす場合だけ移動 |
| P3 | Admin注文詳細 | 内部User ID、操作Versionの詳細 | 詳細Accordion | 運用に必要な人だけ参照できるようにするため | DialogまたはAccordionで十分 |

Test Account情報をLoginから完全に削除する必要はない。初回利用時には有用であり、折りたたみ表示とTest GuideへのLinkの組合せが自然である。

## 11. データフロー評価

| データ | 変更元 | 反映先 | 別Roleへの反映 | 再読込後 | 自然さ | 問題ID |
|---|---|---|---|---|---|---|
| 商品 | Admin商品編集 | Admin一覧、Storefront一覧／詳細 | Admin→Guest／Customer | 主要項目は保持 | 概ね自然 | UX-012 |
| 公開状態 | Admin商品／Category操作 | Storefront一覧、Search | Guest／Customerの公開Catalog | 反映確認 | 概ね自然 | UX-018 |
| 画像 | Admin商品編集 | Preview、Storefront | Guest／Customer | 一部未確認 | 判断材料不足 | UX-012 |
| 在庫 | Admin在庫調整 | Admin履歴、Product detail、Cart | Admin→Customer | Version／履歴保持 | 自然 | — |
| 価格 | Admin商品／SKU編集 | Product、Cart、Checkout、Order | Admin→Customer | Order snapshot保持 | 概ね自然 | UX-019、UX-021 |
| Sale | Sale設定 | Product、Cart、Checkout | Guest／Gold | 表示保持 | 自然 | — |
| 会員Rank割引 | Account Rank | Product、Cart、Checkout、Order | Customer | Order確定価格保持 | 自然。ただしProfile不足 | UX-007 |
| 送料 | Cart金額／Rank | Cart、Checkout、Order | Customer | Order金額保持 | 自然 | — |
| Cart | Guest／Customer操作 | Header、Cart、Checkout | Guest→Customer統合 | Login後保持 | 統合結果が不明 | UX-005、UX-006 |
| Checkout | Address／Payment／Confirm | Complete、Order、Cart消費 | Customer→Admin | Scenario競合は不明 | 基本は自然 | UX-001、UX-021 |
| 注文 | Customer確定 | Customer履歴／詳細、Admin一覧／詳細 | Customer↔Admin | Order snapshot保持 | 概ね自然 | UX-013 |
| Payment | Checkout／Retry | Order payment history、Complete | Customer→Admin | 成功／失敗は保持 | processingのみ不明 | UX-020 |
| Shipment | Admin操作 | Admin詳細、Customer Order | Admin→Customer | 発送済み以降保持 | 初回遷移に不一致 | UX-013 |
| Review | Customer投稿、Admin公開／非表示 | Product Review、Rating、Admin履歴 | Customer↔Admin | 投稿／履歴保持 | 概ね自然 | UX-010 |
| Account状態 | Admin Suspend／Role変更 | User詳細、Login／Session | Admin→Customer | Suspend仕様は一部確認 | 制約説明不足 | UX-015、UX-017 |

## 12. データフロー詳細

### 12.1 商品・公開状態

- 操作：Admin Product／Categoryで公開状態、価格、説明を確認した。
- 直後の反映：Admin一覧のFilterとStatusは更新された。Bulk Partial Failureは成功／失敗件数を表示した。
- Storefrontへの反映：公開中の商品、Search、Product detailで確認できた。UnpublishedはGuest表示から除外された。
- 不自然な点：未保存PreviewはStorefrontとの差分を十分に確認できない（UX-012）。
- 不足Feedback：公開／非公開の反映先をAdmin操作直後に要約する表示は限定的。

### 12.2 在庫

- 操作：Admin InventoryでSKU、Reason、数量、Versionを入力し、在庫を+1した。
- 処理中Feedback：更新中の操作状態を確認した。
- 保存結果：`在庫と履歴を同時に更新しました。`と履歴が表示され、Versionが増えた。
- 別画面反映：Product detailではVariantの在庫状態、Cart／Checkoutでは購入可能状態に反映された。
- Role間反映：Adminの具体数とCustomerの「在庫あり／残り5点／在庫切れ」の表現は目的に応じて分かれていた。
- 評価：自然。現在庫数をCustomer全画面に出す必要はなく、残りわずか・Variant在庫を必要な場所に出す現状は維持候補。

### 12.3 価格・割引・送料

- 操作：Guest、GoldでProduct、Cart、Checkoutを比較した。
- 反映：Sale通常価格、Sale価格、会員価格、Cart会員割引、送料、合計が整合した。
- 再読込後：Order詳細には確定時の商品価格、割引、送料が保存されていた。
- 不自然な点：Cart price change Scenarioで同意CTAがGeneric Errorになった（UX-019）。Checkout version不一致の説明がない（UX-021）。
- 評価：価格計算自体は自然。追加すべきなのは計算機能ではなく、変更理由と再確認Feedbackである。

### 12.4 Cart・Checkout

- Guest Cart→Login→Customer Cartの統合は動作したが、統合結果、上限調整、Return先が不明だった（UX-005、UX-006）。
- Cart Invalid Itemでは非公開、SKU無効、価格変更、在庫切れがItem単位で表示され、削除ButtonとCheckout disabledは分かりやすかった。
- CheckoutはStep、Address、Payment、Confirm、Completeが分離され、正常系とPayment失敗再試行は自然だった。
- MobileではCTAへ到達できるが、CTAへScrollした位置が次Stepへ引き継がれる（UX-001）。
- Complete後にCartが空になる理由は注文完了と合わせて理解できる。

### 12.5 注文・Payment・Shipment

- Customer Order list／detailはOrder statusとPayment statusを分けて表示し、支払失敗の再試行も自然だった。
- Adminで発送準備、発送済み、配送完了へ進める操作は可能で、Version／Carrier／Trackingを表示した。
- 初回の発送準備だけHeadingと配送欄が不一致だった（UX-013）。
- `payment-processing`では注文詳細Loaderが終わらず、処理中から次の状態へ進まなかった（UX-020）。
- 評価：状態モデルは学習価値が高いが、処理中と更新直後のFeedbackを優先改善する必要がある。

### 12.6 Review

- Customerの未投稿ReviewはRating、Title、Bodyを入力して投稿でき、投稿直後にSuccess Statusが表示された。
- AdminのReview履歴は公開→非公開→公開の履歴とStorefront反映を確認できた。
- ProductのRating集計は再公開後に更新された。
- Customer Order detailのReview ActionとReview FormにProduct／状態Contextが不足する（UX-010）。

### 12.7 Account状態

- Admin User detailではCustomerのRole、Rank、Statusを表示し、Suspend時に全Session無効化の説明があった。
- 最後のAdminの変更不可理由がない（UX-015）。
- Test Control ResetではSessionがLogin／Forbiddenへ遷移するが、これはUser Suspendとは別の全Scenario初期化である。両方とも次の行動説明が必要（UX-017）。
- Suspend後の既存Customer SessionからCart／Checkoutがどの時点で停止するかは未確認。

## 13. 画面別の情報過不足

| Role | 画面 | 足りない情報 | 不要な情報 | 移動候補 | 現状維持すべき点 |
|---|---|---|---|---|---|
| Guest | Home | Empty Sectionの理由／Action | 模擬環境告知の一部重複 | 長いBenefit説明→Help | Purpose、商品を見るCTA、Category入口 |
| Guest | 商品一覧／Search | 重大な不足なし | なし | なし | Filter chip、0件時の解除導線 |
| Guest | 商品詳細 | 重大な不足なし | なし | なし | Variant、価格、在庫、Cart追加Feedback |
| Guest／Customer | Cart | 統合／価格変更の結果 | 重複告知の一部 | なし | 価格内訳、Invalid Item理由、Checkout disabled |
| Customer | Login | Role／Scenarioの詳しい導線 | Test Accountの常時全量 | Test Guide／Accordion | 失敗Alert、学習用安全注意、Signup導線 |
| Customer | Profile | Rank、Account status | なし | Rank制度の長文→Help | Formと保存結果 |
| Customer | Addresses | Lookupの上書き結果 | なし | なし | Default表示、削除確認、最大5件説明 |
| Customer | Checkout | Version変更、遷移後Focus | 告知重複の一部 | なし | Stepper、合計内訳、Payment説明 |
| Customer | Order／Review | Product context、Review status | 内部状態をそのまま出すこと | なし | Payment履歴とOrder進捗の分離 |
| Operator／Admin | Dashboard | 未対応作業の優先順をさらに明示する余地 | なし | なし | 件数、Quick Action、Recent Order |
| Admin | Product | Unsaved guard、Storefront相当Preview | なし | Preview詳細→既存Dialog内 | Product／SKU／Inventoryの分離 |
| Admin | Order／User | Status理由、最後のAdmin制約理由 | Routine User ID | 詳細Accordion | Version、危険操作の一部説明 |
| Admin | Test Control | Scenario目的、初期Account、Reset影響 | なし | Guide／Help | Admin Navigation内での配置 |

## 14. 前回レポートとの差分

| 種別 | 内容 | 今回の判断 | 根拠 |
|---|---|---|---|
| 再現確認 | 前回UX-001：Checkout等で遷移後のScroll位置が維持される | 今回も問題と判断 | `390×844`のCheckoutで`scrollY=472→848→700`、完了情報が画面外。UX-001 |
| 再現確認 | 前回UX-002：Account Navigationの横Scroll | 今回も問題と判断 | Orders／Addressesで内部`scrollWidth>clientWidth`、ScreenshotでScroll bar。UX-002 |
| 再現確認 | 前回UX-003：「右のフォーム」文言 | 今回も軽微な問題と判断 | Desktopは右、Mobileは下。Desktop／Mobile Screenshot。UX-003 |
| 前回指摘を否定 | 前回の「Storefront外側の水平Overflowなし」 | 今回も問題と判断しなかった | `1440`、`1024`、`390`、`320`でDocument横幅を確認。ネストNavだけを別問題化 |
| 前回指摘を否定 | 前回の「Admin Mobileは境界案内」 | 今回も現状維持と判断 | 390pxで「1,024px以上が必要」と表示。無理にTableを出していない |
| 新規発見 | Guest Login後に元のCart／Checkoutへ戻らない | Highとして追加 | Cart→Login→Homeを2回確認。UX-005 |
| 新規発見 | Guest Cart統合結果が不明 | Mediumとして追加 | 通常統合と3+4→5のOverflowを確認。UX-006 |
| 新規発見 | ProfileのRank不足、Review context不足 | Mediumとして追加 | regular／gold Profile、配達済みOrder／Reviewを確認。UX-007、UX-010 |
| 新規発見 | Address Lookupが番地を消す | Mediumとして追加 | 同操作を2回確認。UX-008 |
| 新規発見 | Admin Form／Preview／Order／User／Test Controlの状態説明不足 | Medium／Highとして追加 | Admin各画面をDesktopで実操作。UX-011〜UX-017 |
| 新規発見 | Empty Catalog Homeの空Section | Mediumとして追加 | Product listには説明があるがHomeにはない。UX-018 |
| 新規発見 | Invalid Cart価格同意のGeneric Error、Checkout version不一致 | Mediumとして追加 | 代表的異常系をUI操作。UX-019、UX-021 |
| 前回未確認 | Payment失敗・処理遅延、Cart invalid、Scenario Reset、Admin全画面、Role間反映 | 今回一部確認。処理遅延のみ未完了 | Scenario操作を追加したが、`payment-processing`のLoaderが完了しなかった。UX-020 |

前回の「問題なし」は基本導線が操作できるという意味では妥当だったが、今回、ReviewのContext、Cart統合、状態の説明まで含めると追加課題が見つかった。前回指摘を件数だけ増やすのではなく、同一原因は統合している。

## 15. 問題が確認されなかった重要事項

- Homeでアプリの目的と模擬取引であることを初回に理解できる。商品を見るCTAとCategory／Search入口は明確である。
- Search、Filter、Sort、0件State、Filter解除、Category件数の関係は自然だった。
- Product detailのVariant選択は価格、送料無料条件、在庫、数量上限に連動した。Sale価格と会員価格もProduct→Cart→Checkoutで整合した。
- 在庫切れVariantは選択不能、Product detailのCart CTAも無効化され、購入できない状態を隠していない。
- Cartの価格内訳、Invalid Item理由、Checkout disabled、空CartのStorefront導線は良好だった。価格変更同意の複合異常だけをUX-019として切り出した。
- CheckoutのStep、Payment選択肢、失敗後の再試行、注文完了の注文番号・合計・詳細Linkは、正常系／失敗系で理解しやすい。
- Customer Order detailはPayment履歴とOrder／Shipment進捗を分けており、状態の混同を抑えている。
- Review投稿直後のSuccess、Admin Review履歴、再公開後のProduct Rating反映は自然だった。
- Admin Dashboardは作業優先度を示し、InventoryをProduct編集から分離している。Bulk Partial Failureの成功／失敗内訳も十分だった。
- Mobile Storefrontは外側の水平Scroll、固定Navによる主要Contentの恒久的な隠れ、Dialogの画面外を確認しなかった。
- Admin Mobile／Small Mobileでデスクトップ要件を明示しており、操作不能なAdmin Tableを無理に表示していない。

## 16. 優先順位案

### 優先度1：ユーザーの判断・操作に直結する問題

- UX-001、UX-005、UX-006、UX-019、UX-020、UX-021
- 同時に検討：CheckoutのScroll復帰、Login Return、Cart統合Summary、価格／Version変更Feedbackは、Cartから注文完了までの同一Journeyとして設計する。
- 分離すべき問題：`payment-processing`のLoaderは決済状態モデルの検証が必要であり、Login ReturnやScroll修正と同一実装にまとめない。

### 優先度2：データフローや画面間整合性の問題

- UX-008、UX-010、UX-013、UX-014
- 同時に検討：Order／Shipmentの表示源、Review statusのCustomer表現、Address Formの保存結果、Admin TableのAccessible name。
- 分離すべき問題：Admin TableのAccessibilityはVisual状態が正しいかとは別の検証軸である。

### 優先度3：情報配置や不要表示の問題

- UX-004、UX-007、UX-009、UX-011、UX-012、UX-015、UX-016、UX-017、UX-018
- 同時に検討：Role／Account情報、Test Account／Scenario説明、Home Empty Stateは、Help／Accordion／条件表示の情報設計として整理する。
- 分離すべき問題：Unsaved guardとTest Control Reset確認は、どちらもState Feedbackだが、データ保護対象と権限が異なる。

### 優先度4：視覚的・文言上の軽微な問題

- UX-002、UX-003
- Account Navigationは低優先度に見えるが、Mobileで注文導線が切れるため、共通Responsive修正の機会に対応する。
- UX-003は文言変更だけで解決でき、新画面は不要。

## 17. 過剰設計を避けるための判断

- LoginのTest Account情報は完全削除しない。折りたたみ、Dialog、Test GuideへのLinkで常時情報量を下げればよい。
- Rank説明のために新画面を増やさず、ProfileのRank Summaryと既存の短いBenefit表示でまず解決する。
- Cart統合、価格変更、Version不一致は、既存Cart／CheckoutにItem単位のSummaryを追加すればよく、専用画面は不要。
- Empty CatalogはProduct listの既存Empty StateをHome Sectionへ再利用すればよい。
- ReviewはOrder detailとReview FormのContext追加で解決でき、Review一覧の新設を先に要求しない。
- Unsaved ChangesはRoute離脱時のDialogで対応できる。Draft管理や自動保存を直ちに導入する必要はない。
- Test ControlのScenario詳細はAccordionまたはHelpで十分。新しいGuide画面はScenario数と利用者調査を踏まえて判断する。
- 現状維持：Product／SKU／Inventoryの分離、Checkout Stepper、Payment履歴、Admin Mobile境界案内、Bulk Partial Failure Feedback、Review履歴。

## 18. 未確認範囲

| Role | 画面・操作 | 未確認理由 | 確認に必要なもの |
|---|---|---|---|
| Customer | `payment-processing`が成功／失敗へ遷移するか | 注文詳細Loadingが30秒超継続 | Scenarioの状態遷移確認、基準時刻／Payment delayの検証 |
| Customer | Suspend後の既存Session、Cart、Checkout | Admin User停止Dialogまで確認し、別Session反映は未実施 | 独立Contextを2つ使ったRole間確認 |
| Customer | Withdrawn Account、Forbidden、Not Found | 主要正常系を優先 | Seed Accountと各Route |
| Customer | Review一覧、削除後のRating集計 | Product detailとOrder Item Reviewを確認したが横断一覧は未確認 | Review一覧が存在する場合のRoute確認 |
| Operator | Operator権限でUser管理／Test Controlの可否 | Adminを中心に確認 | Operatorで各Admin Routeを確認 |
| Admin | 商品作成の保存、公開後のStorefront画像／Description完全反映 | 新規Formの未保存離脱とPreviewを優先 | Adminで保存→Guest／Customer再読込 |
| Admin | Product削除Blocked、Cross-role lifecycle | Scenario一覧は確認したが全操作は未確認 | 対応ScenarioとAdmin／Storefrontの往復 |
| 全Role | 各画面を4 Viewportすべてで完全比較 | 主要画面をDesktop／Mobile中心に確認 | Tablet／Small Mobileの全Route |
| Admin | Mobile／Small MobileのTable操作 | アプリが1,024px未満で管理画面を表示しない | Desktop利用前提が変わらない限り確認対象外 |
| 全Role | 外部実決済、実配送、個人Account | アプリの模擬環境であり対象外 | 不要。実データを入力しない |

## 19. 探索中に発生したエラー

| 操作 | Error | 再試行回数 | 結果 |
|---|---|---:|---|
| `payment-processing`で`/orders/order-payment-failed`へNavigate | PlaywrightのNavigation／Page operation timeout。画面はLoading継続 | 2回以内 | 同じ専用Context内の安定した別Tabを選択して探索を再開。Scenarioは未確認として記録 |
| 同じ`payment-processing`画面のSnapshot／Logout | Loading継続によりSnapshot／ClickがTimeout | 各2回以内 | 画面状態は確定せず、別手段やCLIへ切り替えなかった |
| `cart-with-invalid-items`の価格同意 | 画面Alert「カートを更新できませんでした。」 | 1回 | 価格Warningが残った。UX-019として記録 |
| Test Control Scenario初期化 | 操作後に`/login`または一時的に`/forbidden`へ遷移 | 各Scenarioで1回 | Reset自体は完了。影響説明不足をUX-017として記録 |

主要正常系のConsole Errorは`browser_console_messages(level=error)`で0件だった。Errorがないことを理由にUX上のFeedback不足を除外していない。

## 20. 最終結論

- 現在のUI・UXで最も大きな課題は、Checkout／Login／Cartの間で、ユーザーの視点と意図が保持されないことである。Checkout完了が画面外に残り、Login後の復帰先も失われる。
- ユーザーが判断するために不足しているのは、Cart統合結果、Cart version／価格変更、Payment処理中、会員Rank、Review対象とStatus、Test Scenarioの初期条件である。
- 不要または移動すべきなのは、同一の模擬環境告知の重複表示、Loginに常時展開されるTest Account情報の一部、Routine Admin画面の内部IDである。安全告知そのもの、Test Accountの存在、Test Controlの存在は削除しない。
- データの流れは、価格計算、在庫履歴、Payment履歴、Review公開履歴など処理自体は概ね成立している。しかし、統合・競合・処理中・更新直後の結果をユーザー向けに翻訳するFeedbackが弱い。
- 最初に改善すべき範囲は、UX-001／005／006／019／021を一つの購入Journeyとして整理し、UX-020を独立したPayment Stateとして解決することである。
- 後回しにできる範囲は、重複告知の整理、方向語、Admin内部IDなどの低優先度情報配置である。Storefrontの基本構造、Checkout Stepper、在庫管理分離、Admin Mobile境界表示は維持すべきである。

## 21. 最終確認

- [x] Playwright MCPで実画面を操作した
- [x] ScreenshotとAccessibility Snapshotの両方を確認した
- [x] Guest、Customer、Operator、Adminの主要画面を探索した
- [x] 主要な正常系ジャーニーを最後まで確認した（`payment-processing`のみ未完了）
- [x] DesktopとMobileを比較した
- [x] 主要データのRole間反映を確認した（未確認範囲はSection 18に記載）
- [x] 必要なもの、不要なもの、移動候補を整理した
- [x] 前回レポートを単に追認していない
- [x] 指摘を増やすための細分化をしていない
- [x] コードを変更していない
- [x] レポート以外のファイルを作成・変更していない
- [x] アプリを起動・再起動・停止していない
- [x] Git操作をしていない
- [x] 実際の修正をしていない
- [x] 未確認範囲を明記した
