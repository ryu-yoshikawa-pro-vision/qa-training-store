# 規約・ポリシー表示

## 1. 位置付け

Phase 1では、学習用アプリであることを説明する静的ページとして提供します。Version付き同意履歴や法的契約の再現は行いません。

| Route | 表示名 |
|---|---|
| `/legal/terms` | 利用規約 |
| `/legal/privacy` | プライバシーポリシー |
| `/legal/commerce` | 模擬取引表示 |

## 2. 共通注意

- 本アプリはSoftware TestとTest Automation学習用の模擬ECです。
- 実際の商品販売、Payment、配送、契約締結は行いません。
- 実在する氏名、住所、電話番号、Password、Card情報を入力しないでください。
- DataはBrowserまたは端末内に保存され、ResetやData削除で消失します。
- 認証・権限は疑似実装であり、本番Service相当のSecurityを提供しません。

## 3. Privacy表示

- Analytics、外部Error Tracking、外部Payment、外部業務APIを使用しません。
- Web業務DataはIndexedDB、Session IDはLocal Storageへ保存します。
- Hosting Serviceには通常のAccess Logが残る場合があります。
- Dummy Dataだけを使用してください。

## 4. 模擬取引表示

| 項目 | 表示内容 |
|---|---|
| 販売事業者 | Scenario Shop（架空） |
| 所在地・連絡先 | 実在情報なし |
| 販売価格 | 画面表示の日本円税込Dummy価格 |
| 商品代金以外 | Dummy送料500円。条件により無料 |
| 支払方法 | TEST-* 模擬Paymentのみ |
| 商品引渡し | 実配送なし。管理画面の状態変更だけ |

## 5. 表示位置

- Storefront Footer
- 全画面Headerの小さな「テスト環境」Badge
- Login、Signup、Cart、Checkoutの注意表示
- Homeの学習用環境説明

Version付き規約同意履歴はPhase 3で必要性を再評価します。
