# qa-training-store UI・UX探索レポート

## 1. 実行結果

- 結果：完了（一部未確認範囲あり）
- 対象URL：`http://localhost:8081/`
- 実行環境：Chrome、専用agent-created tab
- 使用Browser：Playwright MCP Browser
- Playwright MCP利用可否：利用可能
- 探索日時：2026-08-01 JST
- Viewport：`1440x1000`、`1024x900`、`390x844`、`320x700`
- コード変更：なし
- 製品ファイル変更：なし
- Git操作：なし
- アプリの起動・停止：なし
- Screenshot：MCPのインラインArtifactとして確認。リポジトリには保存していない。

## 2. 結論

今回の探索では、次のUX問題を確認した。

1. Checkout完了後などにスクロール位置が維持され、成功結果や重要な状態が画面外になる（High）。
2. Mobileのアカウントメニューが横スクロールになり、「注文履歴」が切れて見える（Medium）。
3. 配送先空状態の「右のフォーム」という文言がMobile配置と一致しない（Low）。

## 3. 探索範囲

| Role | 画面 | Desktop | Tablet | Mobile | Small Mobile | 結果 |
|---|---|---:|---:|---:|---:|---|
| Storefront | Home | 確認済み | 未確認 | 確認済み | 確認済み | 問題なし |
| Storefront | 商品一覧・絞り込み | 確認済み | 未確認 | 確認済み | 未確認 | 問題なし |
| Storefront | Category / Brand | 未確認 | 未確認 | 未確認 | 未確認 | 未確認 |
| Storefront | Search | 確認済み | 未確認 | 未確認 | 未確認 | 検索結果を確認 |
| Storefront | 商品詳細・在庫切れ | 確認済み | 未確認 | 確認済み | 未確認 | 問題なし |
| Storefront | Cart | 確認済み | 未確認 | 確認済み | 未確認 | 問題なし |
| Customer | Login | 確認済み | 未確認 | 確認済み | 未確認 | バリデーション確認 |
| Customer | Signup | 一部確認 | 未確認 | 未確認 | 未確認 | 初期フォームのみ |
| Customer | Profile / Addresses | 確認済み | 未確認 | 確認済み | 確認済み | UX-002、UX-003 |
| Customer | Checkout | 確認済み | 未確認 | 確認済み | 未確認 | UX-001 |
| Customer | 注文一覧・詳細 | 未確認 | 未確認 | 確認済み | 未確認 | 問題なし |
| Customer | Review編集 | 未確認 | 未確認 | 確認済み | 未確認 | 問題なし |
| Admin | Overview | 確認済み | 未確認 | 未確認 | 未確認 | 問題なし |
| Admin | 商品一覧 | 確認済み | 確認済み | 境界表示 | 未確認 | 問題なし |
| Admin | 商品編集 | 確認済み | 未確認 | 境界表示 | 未確認 | 問題なし |
| Admin | Categories / Brands / Inventories / Orders / Reviews / Users / Test Control | 確認済み | 未確認 | 未確認 | 未確認 | 初期表示を確認 |

## 4. 指摘一覧

| ID | Severity | Category | Role | 画面 | Viewport | 問題 | ユーザー影響 |
|---|---|---|---|---|---|---|---|
| UX-001 | High | 操作性・状態表示 / Responsive | Customer | Checkout、Addresses、Login後Home | 1440x1000、390x844 | 遷移後のスクロール位置が維持され重要情報が画面外になる | 完了や成功を見落とし、再操作する可能性 |
| UX-002 | Medium | Responsive / Navigation | Customer | Profile、Addresses、Orders | 390x844、320x700 | アカウントメニューの3つ目の項目が切れて見える | 注文履歴を見つけにくい |
| UX-003 | Low | 文言 / Responsive | Customer | Addresses空状態 | 1440x1000、390x844 | 「右のフォーム」がMobile配置と不一致 | 次に操作すべき場所を迷う |

## 5. 指摘詳細

### UX-001：遷移後に重要な状態・結果が画面外になる

- Severity：High
- Category：操作性・状態表示、Responsive
- Role：Customer
- 対象画面：Checkout、Addresses、Login後Home
- Viewport：`390x844`、比較として`1440x1000`
- 確信度：高
- 確認回数：4回以上

#### 問題

画面遷移や操作完了後にスクロール位置がリセットされず、成功通知や注文完了情報が初期表示のviewport外に配置される。

#### ユーザーへの影響

注文完了や注文番号を見落とし、支払が完了していないと誤認したり、再度操作したりする可能性がある。

#### 再現手順

1. 配送先を登録する。
2. Checkoutで配送先、支払方法、確認画面へ進む。
3. 「¥2,000を支払う」を押す。
4. 完了画面の初期表示を確認する。

#### 期待される状態

遷移後はページ見出しまたは`main`先頭へ移動し、成功結果・注文番号がすぐ視認できる状態になる。

#### 実際の状態

Checkout完了後、DOMには「ご注文が完了しました」、注文番号、注文詳細リンクが存在した。しかしMobileでは`scrollY=700`、`scrollHeight=1544`、`innerHeight=844`となり、Screenshotではfooterと固定Mobileナビが主に表示され、成功情報が見えなかった。

住所登録後も成功statusがDOMに存在したが、Desktopでstatusの位置が`top=-638.44`となり画面外だった。CheckoutのPayment / Confirmでも遷移後に`scrollY`が約140となり、画面上部の進捗表示がviewport外になった。

#### 証拠

- Screenshot：MCPインラインArtifact（論理名：`ux-001-checkout-complete-mobile.png`、`ux-001-address-save-desktop.png`）
- Accessibility Snapshot上の確認：完了見出し、注文番号、成功status、Checkout進捗を確認
- Console Errorの有無：なし（`[]`）

#### 関連画面

- `/checkout/address`
- `/checkout/payment`
- `/checkout/confirm`
- `/checkout/complete`
- `/account/addresses`
- Login後のHome

#### 原因候補

- ファイル：`src/presentation/shells/app-frame.tsx`、`src/presentation/pages/checkout-order-pages.tsx`、`src/presentation/pages/addresses-page.tsx`
- Component：AppFrame、Checkoutページ、Addressesページ
- 原因候補：route遷移後のscroll restoration / focus移動が共通化されていない可能性
- 未確認部分：根本原因は今回のUI探索だけでは未確定

#### 最小限の改善案

遷移時にページ見出しまたは`main`へscroll/focusを移し、成功statusは視認可能な位置へ移動する。

#### 修正時の注意点

戻る操作、Checkoutのステップ移動、キーボードフォーカス、deep link、二重送信防止を壊さないこと。

### UX-002：Mobileのアカウントメニューが横スクロールになり項目が切れる

- Severity：Medium
- Category：Responsive、Navigation
- Role：Customer
- 対象画面：Profile、Addresses、Orders
- Viewport：`390x844`、`320x700`
- 確信度：高
- 確認回数：4観測（3画面の390px表示、Profileの320px表示）

#### 問題

アカウントメニューが横スクロールになり、Small Mobileでは「注文履歴」のラベルが右端で切れて見える。

#### ユーザーへの影響

注文履歴への導線を発見しにくく、横スクロール可能であることに気づかない利用者は操作に迷う。

#### 再現手順

1. `320x700`で`/account/profile`を開く。
2. アカウントメニューを確認する。
3. `clientWidth=294`、`scrollWidth=368`、`overflowX=auto`を確認する。

#### 期待される状態

3つのメニュー項目とラベルが視認できる、またはスクロール可能であることが明確に分かる。

#### 実際の状態

水平スクロールバーが表示され、3つ目の「注文履歴」が切れて見えた。文書全体の横幅は`320px`内に収まっており、問題はネストしたナビゲーションの視認性である。

#### 証拠

- Screenshot：MCPインラインArtifact（論理名：`ux-002-account-navigation-small-mobile.png`）
- Accessibility Snapshot上の確認：3リンク自体は存在
- Console Errorの有無：なし

#### 関連画面

- `/account/profile`
- `/account/addresses`
- `/orders`

#### 原因候補

- ファイル：`src/presentation/components/account-navigation.tsx`、`src/presentation/styles/global.css`
- Component：Account navigation
- 原因候補：Mobile CSSの`overflow-x:auto`と項目幅指定
- 未確認部分：最適なレイアウト方式は未検討

#### 最小限の改善案

390px以下では折り返しまたは縦積みにする。横スクロールを残す場合は、スクロール可能であることを明示する。

#### 修正時の注意点

選択状態、キーボード操作、タッチ操作、Desktop / Tabletレイアウトを維持すること。

### UX-003：「右のフォーム」という文言がMobile配置と一致しない

- Severity：Low
- Category：文言、Responsive
- Role：Customer
- 対象画面：`/account/addresses`の空状態
- Viewport：Desktop `1440x1000`、Mobile `390x844`
- 確信度：高
- 確認回数：Desktop / Mobile各1回

#### 問題

空状態の説明が「右のフォームから最初の配送先を登録してください。」となっている。

#### ユーザーへの影響

Desktopでは自然だが、Mobileではフォームが下に配置されるため、利用者が「右」を探す可能性がある。

#### 再現手順

1. 配送先未登録状態でAddresses画面を開く。
2. 空状態の説明文を確認する。
3. DesktopとMobileでフォーム位置を比較する。

#### 期待される状態

画面幅に依存しない案内文が表示される。

#### 実際の状態

Desktopではフォームが右側、Mobileでは空状態の下側にフォームが配置されている。

#### 証拠

- Screenshot：MCPインラインArtifact（論理名：`ux-003-address-empty-mobile.png`）
- Accessibility Snapshot上の確認：空状態説明と登録フォームを確認
- Console Errorの有無：なし

#### 関連画面

- `/account/addresses`

#### 原因候補

- ファイル：`src/presentation/pages/addresses-page.tsx`
- Component：Addresses empty state
- 原因候補：固定方向語「右のフォーム」
- 未確認部分：なし

#### 最小限の改善案

「右のフォーム」を「下のフォーム」または「登録フォーム」など、レイアウト非依存の文言にする。

#### 修正時の注意点

Desktopでも登録フォームの位置と役割が明確に伝わる文言にすること。

## 6. 共通傾向

- Header、商品カード、CTA、固定Mobileナビは一貫していた。
- Skip link、見出し、フォームラベル、エラーリンク、操作結果statusを確認できた。
- 改善余地は、route遷移時の視点復帰、Mobileナビの横スクロール、方向語に依存する文言に集約される。
- AdminはDesktop前提を明示しており、Mobileでは適切な境界案内が表示された。

## 7. 問題が確認されなかった点

- `320x700`のHomeでページ末尾まで到達でき、外側の水平overflowは確認されなかった。
- 在庫切れ商品の数量選択とカート追加は無効化されていた。
- ログイン未入力時のエラー通知とフォーカス移動を確認した。
- 商品検索、絞り込み、カート、注文一覧・詳細、レビュー編集の基本導線は利用できた。
- Adminの商品一覧Tablet表示には横スクロール案内があった。
- Console error/warnはなかった。

## 8. 未確認範囲

| Role | 画面・操作 | 未確認理由 | 確認に必要なもの |
|---|---|---|---|
| Storefront | Category / Brand一覧からの遷移 | 探索範囲の都合 | 各一覧と遷移操作 |
| Customer | 支払失敗・処理遅延 | Scenario切替を実施していない | 独立Context内の安全なScenario |
| Customer | Cart無効商品、Checkout再開・競合 | 状態生成を実施していない | 対応SeedまたはScenario |
| Customer | Logout | 探索時間の都合 | ログアウト操作 |
| Customer | Review投稿・Review一覧 | 編集画面のみ確認 | 投稿・一覧画面 |
| Customer | suspended / withdrawn、Forbidden、Not Found | 対象経路未確認 | Seedアカウントと各route |
| 全体 | Storefront / CustomerのTablet全画面 | 主要画面を優先 | Tablet全画面 |
| 全体 | Checkout / CartのSmall Mobile | 主要操作を優先 | `320x700`での追加確認 |
| Admin | Small Mobile全画面 | Desktop境界案内のみ確認 | Admin各画面の追加確認 |

## 9. 探索中に発生したエラー

| 操作 | エラー | 再試行回数 | 結果 |
|---|---|---:|---|
| Cart Mobileのスクロール | `Input.synthesizeScrollGesture` timeout | 0 | 直接route遷移とSnapshotで確認 |
| Mobile viewport変更直後のScreenshot | `Page.captureScreenshot` timeout | 2回 | 待機後に再取得できた |
| Home CTAの遷移待ちクリック | `expectNavigation` timeout | 0 | locator確認後、直接Login routeを確認 |

いずれもBrowser操作・描画タイミング由来と判断し、製品不具合とは判定していない。

## 10. 修正優先順位案

### 優先度1

UX-001：Checkout完了、成功status、進捗表示を遷移後すぐ視認できるようにする。

### 優先度2

UX-002：Mobileアカウントナビの3導線を常時発見可能にする。

### 優先度3

UX-003：レイアウトに依存しない空状態文言へ変更する。

## 11. 最終確認

- [x] ソースコードを変更していない
- [x] 設定ファイルを変更していない
- [x] テストを追加・変更していない
- [x] 依存関係を変更していない
- [x] アプリを起動・再起動・停止していない
- [x] Git操作を行っていない
- [x] UI・UXの修正を行っていない
- [x] 推測を事実として記載していない
- [x] 未確認範囲を明示した
