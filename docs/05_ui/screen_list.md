# 画面一覧・ルート設計

## 1. ストアフロント・公開

| ID | Route | 画面 | 対象 |
|---|---|---|---|
| CM-01 | `/` | ホーム | 全員 |
| CM-02 | `/products` | 全商品一覧 | 全員 |
| CM-03 | `/search` | 検索結果 | 全員 |
| CM-04 | `/categories/[categoryId]` | カテゴリー別商品一覧 | 閲覧条件を満たす利用者 |
| CM-05 | `/products/[productId]` | 商品詳細 | 閲覧条件を満たす利用者 |
| CM-06 | `/login` | ログイン | 未ログイン |
| CM-07 | `/signup` | 新規登録 | 未ログイン |
| CM-08 | `/forbidden` | 権限不足 | 全員 |
| CM-09 | `+not-found` | Not Found | 全員 |
| CM-10 | `/legal/terms` | 利用規約 | 全員 |
| CM-11 | `/legal/privacy` | プライバシーポリシー | 全員 |
| CM-12 | `/legal/commerce` | 模擬取引表示 | 全員 |
| CM-13 | `/cart` | カート | ゲスト / カスタマー |

検索サジェスト（Search Suggestion）は独立したルートとしては設けず、ストアフロントのヘッダーおよび検索画面のコンボボックスとして提供します。

## 2. カスタマー画面

| ID | Route | 画面 |
|---|---|---|
| SH-01 | `/checkout/address` | 配送先 |
| SH-02 | `/checkout/payment` | 支払方法 |
| SH-03 | `/checkout/confirm` | 注文確認 |
| SH-04 | `/checkout/processing?orderId=...` | 支払い処理中 |
| SH-05 | `/checkout/complete?orderId=...` | 注文完了 |
| SH-06 | `/checkout/failed?orderId=...` | 支払い失敗 |
| SH-07 | `/orders` | 注文一覧 |
| SH-08 | `/orders/[orderId]` | 注文詳細・支払い再試行 |
| SH-09 | `/reviews/[orderItemId]` | レビュー投稿・編集 |
| SH-10 | `/account/profile` | プロフィール |
| SH-11 | `/account/addresses` | 配送先管理 |

## 3. 管理画面（Web、1024px以上）

| ID | Route | 画面 | operator | admin |
|---|---|---|---:|---:|
| AD-01 | `/admin` | 運用概要 | ○ | ○ |
| AD-02 | `/admin/products` | 商品一覧 | ○ | ○ |
| AD-03 | `/admin/products/new` | 商品登録 | ○ | ○ |
| AD-04 | `/admin/products/[productId]` | 商品詳細・編集 | ○ | ○ |
| AD-05 | `/admin/categories` | カテゴリー管理 | ○ | ○ |
| AD-06 | `/admin/brands` | ブランド管理 | ○ | ○ |
| AD-07 | `/admin/inventories` | 在庫一覧・調整 | ○ | ○ |
| AD-08 | `/admin/orders` | 注文一覧 | ○ | ○ |
| AD-09 | `/admin/orders/[orderId]` | 準備開始・発送・配送完了 | ○ | ○ |
| AD-10 | `/admin/reviews` | レビュー管理 | ○ | ○ |
| AD-11 | `/admin/users` | ユーザー一覧 | × | ○ |
| AD-12 | `/admin/users/[userId]` | ユーザー詳細 | × | ○ |
| AD-13 | `/admin/test-control` | テスト制御 | × | Automation admin |

## 4. フェーズ1のナビゲーション

### デスクトップ向けストアフロント

ヘッダー：ロゴ、検索、商品、注文履歴、アカウント、カート。operatorおよびadminには購入ナビゲーションを表示せず、管理画面へのリンクを表示します。

### モバイル向けストアフロント

ボトムナビゲーション：ホーム、検索、カート、注文、アカウント。

### 管理画面

サイドナビゲーション：概要、商品、カテゴリー、ブランド、在庫、注文、レビュー、ユーザー、テスト制御。ロールに応じて項目を非表示にし、ルートガードも適用します。

ネイティブアプリのナビゲーションは、フェーズ2において同様の情報アーキテクチャ（Information Architecture）に基づいて設計します。

## 5. ルートガード（Route Guard）

1. 公開ルートは未ログイン状態でも利用可能です。`/cart` は guest および customer を許可し、operator および admin からのアクセスは拒否（Forbidden）とします。
2. customer ルートは、セッションが存在し、アクティブ状態であり、`role=customer` であることを確認します。
3. admin ルートは、Web環境であり、かつ `operator` または `admin` であることを確認します。
4. admin 専用（admin-only）ルートは、`role=admin` であることを確認します。
5. 配送先・支払方法・注文確認（address / payment / confirm）では、アクティブなチェックアウトセッション（Checkout Session）と進行状況（unlockedStep）を確認し、未到達の後段ステップへ直接アクセスした場合は必要な前段ステップへリダイレクトします。なお、前の画面へ戻る操作を行っても unlockedStep は減らしません。支払い処理中・注文完了・支払い失敗（processing / complete / failed）では、orderId、注文の所有権、ならびに注文および決済状態（Order / Payment状態）を確認します。
6. 存在しないIDへのアクセスは Not Found、存在するものの権限不足で閲覧できない場合は Forbidden とします。
7. operator または admin がストアフロントの購入ルートへ直接アクセスした場合は Forbidden とし、管理画面へのリンクを表示します。

## 6. チェックアウトへの直接アクセス

| アクセス条件 | 挙動 |
|---|---|
| payment へのアクセス時、配送先住所（Address）が未設定 | address へ replace |
| confirm へのアクセス時、支払方法（Payment）が未設定 | payment へ replace |
| processing へのアクセス時、Order ID の指定なし | orders へ replace |
| processing へのアクセス時、他ユーザーの Order ID を指定 | forbidden へ replace |
| processing へのアクセス時、注文状態が pending_payment 以外、または最新の決済状態が processing 以外 | 注文詳細へ replace |
| complete / failed へのアクセス時、Order ID の指定なし | orders へ replace |
| complete / failed へのアクセス時、他ユーザーの Order ID を指定 | forbidden へ replace |
| complete へのアクセス時、注文状態が paid 以降でない | 注文詳細へ replace |
| failed へのアクセス時、注文状態が payment_failed でない | 注文詳細へ replace |
| セッション期限切れ（expired Session）時 | cart へ replace し、期限切れを通知 |
| カートのバージョン（Cart version）不一致時 | cart へ replace し、再確認を通知 |

## 7. クエリパラメータ（Query）

### ストアフロント

- `/search`: `q,category,brand,minPrice,maxPrice,inStock,onSale,minRating,sort,page`
- `/products`: `category,brand,minPrice,maxPrice,inStock,onSale,minRating,sort,page`
- `/categories/[categoryId]`: `brand,minPrice,maxPrice,inStock,onSale,minRating,sort,page`

`category` と `brand` は複数の値をカンマ区切りで保持し、同一ファセット内はOR条件、ファセット間はAND条件として解釈します。

無効な値が指定された場合は既定値へと正規化し、URLを replace します。検索条件およびページ番号（page）はURLで管理し、スクロール位置は History State またはセッション内のUI状態（UI State）へ保存します。

### 管理画面

基本パラメータである `q,status,sort,page,pageSize` に加え、各対象固有のフィルターを追加します。選択状態（Selection）はURLへ保持せず、ページ離脱時に破棄します。

商品のプレビュー表示は独立したルートを持たず、`/admin/products/new` または `/admin/products/[productId]` 内のダイアログやオーバーレイ（Dialog / Overlay）として表示します。

## 8. 将来予定されているルート

- フェーズ2（Phase 2）：キャンセル・返品（Cancel / Return）、退会、ネイティブアプリ対応、必要に応じたゲスト購入（Guest Checkout）。
- フェーズ3（Phase 3）：決済突合（Payment Reconciliation）、データ復旧（Recovery）、インポート・エクスポート（Import / Export）、監査ログ詳細（Audit詳細）。