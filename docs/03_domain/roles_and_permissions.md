# アカウント・会員ランク・権限設計

## 1. 分類

```typescript
type UserRole = "customer" | "operator" | "admin";
type MembershipRank = "regular" | "gold" | "platinum";
type AccountStatus = "active" | "suspended" | "withdrawn";
```

- `role`: 購入者または店舗管理者としての責務
- `membershipRank`: customer向けの会員特典
- `accountStatus`: アカウントの利用可否

`operator`と`admin`は管理専用アカウントです。仕様の例外を増やさないため、Phase 1ではカート利用・商品購入・注文履歴の閲覧・レビュー投稿を許可しません。

## 2. 固定アカウント

| Seed ID | 表示名 | ロール | ランク | 状態 | パスワード |
|---|---|---|---|---|---|
| `user-customer-regular` | 一般テスト会員 | customer | regular | active | `testpass1` |
| `user-customer-gold` | ゴールドテスト会員 | customer | gold | active | `testpass1` |
| `user-customer-platinum` | プラチナテスト会員 | customer | platinum | active | `testpass1` |
| `user-customer-suspended` | 利用停止テスト会員 | customer | regular | suspended | `testpass1` |
| `user-customer-withdrawn` | 退会済みテスト会員 | customer | regular | withdrawn | ログイン不可 |
| `user-operator` | 店舗担当者 | operator | なし | active | `testpass1` |
| `user-admin` | 管理者 | admin | なし | active | `testpass1` |

メールアドレスは`example.com`ドメイン配下のダミー値を使用します。

## 3. 権限マトリクス

| 操作 | ゲスト | customer | operator | admin |
|---|---:|---:|---:|---:|
| 公開商品閲覧 | ○ | ○ | ○ | ○ |
| 会員限定商品閲覧 | × | 条件付き | 管理プレビューのみ | 管理プレビューのみ |
| カート追加 | ○ | ○ | × | × |
| チェックアウト | × | ○ | × | × |
| 自分の注文閲覧 | × | ○ | × | × |
| レビュー投稿 | × | 条件付き | × | × |
| 全注文閲覧・処理 | × | × | ○ | ○ |
| 商品・カテゴリ・ブランド管理 | × | × | ○ | ○ |
| 在庫調整 | × | × | ○ | ○ |
| レビュー非公開 | × | × | ○ | ○ |
| ユーザー一覧・ランク・状態・ロール変更 | × | × | × | ○ |
| 監査ログ閲覧 | × | × | × | Phase 2でadminへ追加 |
| DB Reset/Seed | × | × | × | Automation Buildのadmin |

## 4. 会員ランク特典

| ランク | 商品割引 | 送料 | 限定商品 |
|---|---:|---|---|
| regular | 0% | 商品合計5,000円以上で無料 | regular |
| gold | 5% | 商品合計5,000円以上で無料 | regular・gold |
| platinum | 10% | 常時無料 | すべて |

```text
regular < gold < platinum
```

## 5. 状態とログイン

- `active`: ログイン可能。
- `suspended`: ログイン拒否。既存セッションは保護対象の操作を実行した時点で無効化される。管理者は利用再開が可能。
- `withdrawn`: ログイン不可。Phase 1では固定シードの読み取り専用状態として扱い、管理画面からのステータス変更および顧客自身による退会処理はPhase 2で対応する。

## 6. 権限チェック

ナビゲーション、ルート、データ取得条件、UIの活性・非活性制御、ユースケース（Use Case）、リポジトリ（Repository）整合性の各段階で権限を検証します。単にUIを非表示にするだけでは認可処理とはみなしません。

## 7. 違反時の挙動

| 状況 | 挙動 |
|---|---|
| 未ログインで保護画面へアクセス | ログイン画面へ遷移し、元のURLを保持する |
| customer以外がCheckoutへアクセス | Forbidden |
| 商品の必要ランク不足 | 一覧では非表示とし、URL直接アクセスの場合はForbiddenとする |
| 利用停止・退会状態を検知 | セッションを削除したうえで、理由を付記したログイン画面へ遷移する |
| 存在しないIDへのアクセス | Not Found |

## 8. Phase 1のUser変更範囲

- 会員ランクの変更は、customerに対するregular / gold / platinumへの変更のみを許可する。
- アカウント状態（Account Status）の変更は、`active ↔ suspended`の相互変更のみを許可する。`withdrawn`はシードデータの読み取り専用状態とする。
- ロール（Role）変更は、`operator ↔ admin`の相互変更のみを許可する。customerとの相互変換はPhase 2で対応する。
- ステータスまたはoperator / adminのロールを変更する際は、対象ユーザーの全セッションを同一トランザクション内で削除する。customerをsuspendedへ変更する場合は、アクティブなチェックアウト（activeなCheckout）を同一トランザクション内でabandonedへ変更し、CartおよびOrderは保持する。operatorとadminの間でロールを変更する場合は、CartやCheckoutは変更しない。
- 最後の有効なadminアカウントをsuspendedまたはoperatorへ変更することはできない。
- adminは、自分自身のadmin権限の削除やアカウント停止を行うことはできない。
- Phase 1では変更理由の入力や保存は行わない。変更履歴および理由は、簡易監査（Audit）機能を導入するPhase 2で追加する。
