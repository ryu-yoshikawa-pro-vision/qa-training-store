# アカウント・会員ランク・権限設計

## 1. 分類

```typescript
type UserRole = "customer" | "operator" | "admin";
type MembershipRank = "regular" | "gold" | "platinum";
type AccountStatus = "active" | "suspended" | "withdrawn";
```

- `role`: 購入者または店舗管理者としての責務
- `membershipRank`: customerの購入特典
- `accountStatus`: アカウント利用可否

`operator`と`admin`は管理専用アカウントです。例外を増やさないため、Phase 1ではカート・購入・自分の注文・レビュー投稿を許可しません。

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

メールアドレスは`example.com`配下のダミー値を使用します。

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
- `suspended`: ログイン拒否。既存Sessionは保護操作時に無効化。管理者が再開可能。
- `withdrawn`: ログイン不可。Phase 1では固定Seedの読取専用状態として扱い、管理画面からの変更と顧客自身の退会処理はPhase 2。

## 6. 権限チェック

ナビゲーション、ルート、データ取得条件、UI活性、Use Case、Repository整合性の各段階で確認します。UI非表示だけを認可として扱いません。

## 7. 違反時の挙動

| 状況 | 挙動 |
|---|---|
| 未ログインで保護画面 | ログインへ遷移し元URLを保持 |
| customer以外がCheckoutへアクセス | Forbidden |
| 商品ランク不足 | 一覧非表示、直接URLはForbidden |
| 利用停止・退会を検知 | Session削除後、理由付きログイン画面 |
| 存在しないID | Not Found |

## 8. Phase 1のUser変更範囲

- 会員ランク変更はcustomerに対するregular/gold/platinumだけを許可する。
- Account Status変更は`active ↔ suspended`だけを許可する。`withdrawn`はSeedの読取専用状態である。
- Role変更は`operator ↔ admin`だけを許可する。customerとの相互変換はPhase 2とする。
- Statusまたはoperator/admin Role変更時は、対象Userの全Sessionを同一Transactionで削除する。customerをsuspendedへ変更する場合はactive Checkoutを同一Transactionでabandonedへ変更し、CartとOrderは保持する。operator/admin間のRole変更ではCart/Checkoutを変更しない。
- 最後の有効なadminをsuspendedまたはoperatorへ変更できない。
- adminは自分自身のadmin権限削除・停止をできない。
- Phase 1では変更理由を入力・保存しない。変更履歴と理由は簡易Auditを導入するPhase 2で追加する。
