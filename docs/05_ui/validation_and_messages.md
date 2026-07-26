# Validation・Message設計

UI表示文言の正本は`ui_content_dictionary.md`です。本ファイルは入力Ruleと動的Message構造を定義します。

## 1. 基本Rule

- UIで即時Validationし、Use Caseで同じ業務Ruleを再検証する。
- Error Summaryと項目Errorを関連付ける。
- Submit Error時は最初のFieldではなくError SummaryへFocusする。
- Summary内Linkで該当Fieldへ移動できる。
- 内部ExceptionやDB名を利用者へ表示しない。
- Messageは状態、原因、次の操作を可能な範囲で示す。
- UIは日本語を基本とし、Domain内部値をそのまま表示しない。

## 2. 主な入力

| 項目 | Rule |
|---|---|
| Search Keyword | Trim後0～100文字。Suggestionは2文字以上 |
| Email | 必須、最大254文字。Trim・NFKC・Locale非依存小文字化後に一般的なEmail形式、unique |
| Password | 必須、8～72文字 |
| 表示名 | 必須、1～100文字 |
| 郵便番号 | 7桁数字。学習用辞書一致時だけ候補提示 |
| 住所ラベル | 必須、1～50文字 |
| 宛名 | 必須、1～100文字 |
| 都道府県 | 必須、1～20文字 |
| 市区町村 | 必須、1～100文字 |
| 住所1 | 必須、1～200文字 |
| 建物名・部屋番号 | 任意、0～100文字 |
| 電話番号 | 10～11桁数字 |
| 商品名 | 必須、1～120文字 |
| productCode | 必須、1～50文字。Trim・NFKC・ASCII大文字化後に`[A-Z0-9_-]+`、unique。保存・表示は正規化後の値 |
| 短い説明 | 0～200文字 |
| 商品説明 | 0～5,000文字 |
| Category/Brand名 | 必須、1～80文字。Trim・NFKC・小文字化・空白圧縮後の比較KeyでScope内重複不可 |
| SKU | 必須、1～50文字。Trim・NFKC・ASCII大文字化後に`[A-Z0-9_-]+`、unique。保存・表示は正規化後の値 |
| SKU構成 | draftを含めactive SKU 1件以上。Variationなしはactive SKUちょうど1件、Variationありはactive SKU 1件以上 |
| Variation軸名 | Variationありの場合必須、1～30文字 |
| Variation選択肢 | Variationありの場合必須、1～80文字。Trim・NFKC・小文字化・空白圧縮後の比較Keyで同一商品内active重複不可 |
| 価格 | 1以上の整数 |
| Sale価格 | 通常価格未満。設定する場合は開始・終了を両方必須、開始＜終了 |
| 購入上限 | 1～99の整数 |
| 新規SKU初期在庫 | 0以上の整数。新規SKUはactive固定。既存SKU在庫は商品Formで編集不可 |
| 数量 | 1～99かつ購入上限・在庫以下 |
| 最低評価Filter | 1～5 |
| Review評価 | 1～5。Radio Group |
| Reviewタイトル | 任意、0～120文字 |
| Review本文 | 必須、1～1,000文字 |
| 在庫調整理由 | 必須、1～200文字 |
| 配送会社 | 発送時必須、1～100文字 |
| Tracking Number | 発送時必須、1～100文字 |
| 商品画像Asset | Manifestに存在するassetId、最大3件、同一商品内assetId重複不可。0件はdraftだけ可、1件以上はPrimaryちょうど1件。Alt Text 1～120文字。新規関連付けはactiveのみ、既存inactive関連は維持のみ可 |

## 3. Error CodeとMessage例

`ApplicationError.messageKey`は原則`error.<Code>`（例: `error.AUTHENTICATION_FAILED`）を使用します。以下の表が標準日本語Messageです。

| Code | Message |
|---|---|
| AUTHENTICATION_FAILED | メールアドレスまたはパスワードを確認してください。 |
| LOGIN_TRANSACTION_FAILED | ログイン処理を完了できませんでした。カートの内容は保持されています。もう一度お試しください。 |
| ACCOUNT_SUSPENDED | このアカウントは利用停止中です。 |
| ACCOUNT_WITHDRAWN | このアカウントは退会済みです。 |
| PERMISSION_DENIED | この操作を行う権限がありません。 |
| OUT_OF_STOCK | この商品は在庫切れです。 |
| INSUFFICIENT_STOCK | 選択した数量を用意できません。在庫数を確認してください。 |
| PRICE_CHANGED | 商品価格が変更されました。変更内容を確認してください。 |
| CART_VERSION_CHANGED | カートの内容が更新されました。もう一度確認してください。 |
| CHECKOUT_EXPIRED | 購入手続きの有効期限が切れました。カートからやり直してください。 |
| PAYMENT_FAILED | 支払いを完了できませんでした。注文詳細から再試行できます。 |
| CONFLICT | 他の操作で内容が更新されました。最新の内容を確認してください。 |
| STORAGE_WRITE_FAILED | 保存できませんでした。入力内容を保持したまま再試行してください。 |
| IMAGE_ASSET_NOT_FOUND | 選択した画像を利用できません。画像一覧を更新して選び直してください。 |
| IMAGE_ASSET_INACTIVE | この画像は新しく選択できません。別の画像を選んでください。 |
| PRODUCT_HAS_REFERENCE | この商品はカート・注文・レビューから参照されているため削除できません。非公開または販売終了にしてください。 |
| VARIANT_HAS_REFERENCE | このSKUは利用履歴があるため削除できません。無効化してください。 |
| QUANTITY_LIMIT_EXCEEDED | 選択した数量は在庫または購入上限を超えています。 |

## 4. Search・Filter Message

- 0件: 「条件に一致する商品がありません」。検索語変更、Filter全解除、全商品へのActionを表示する。
- Suggestion 0件: 「候補がありません。Enterでこのキーワードを検索できます」。
- Filter 0件候補: 件数`0`を表示し、Checkbox/Optionを選択不可にする。
- URLの無効Query: 既定値へ正規化し、利用者へ技術Errorを表示しない。

## 5. Form Error Summary

```text
入力内容を確認してください
- 郵便番号を7桁で入力してください
- 電話番号を10～11桁で入力してください
```

各項目をLinkとし、選択するとFieldへFocusします。

## 6. Success・Result Message

- Cart追加: 「商品をカートに追加しました」＋「カートを見る」。
- 保存: 「変更を保存しました」。重要な更新内容はPage内Statusにも反映する。
- Bulk: 「8件を公開しました。2件は更新できませんでした」＋失敗対象Link。
- 注文完了: 注文番号、合計、注文詳細へのLinkを画面内へ表示する。
- Toastは補助通知であり、重要結果の唯一の表示にしない。

## 7. Unsaved・Destructive Message

- 未保存離脱: 「保存していない変更があります」＋「保存して移動」「破棄して移動」「編集に戻る」。
- 商品状態一括変更: 対象件数、変更後状態、実行後の影響を確認する。
- Danger操作は対象名をMessageへ含める。

## 検索文字列の正規化

商品名、短い説明、Category名、Brand名、検索KeywordはTrim、Unicode NFKC、Locale非依存小文字化、連続空白の1文字化を同じ関数で適用します。
