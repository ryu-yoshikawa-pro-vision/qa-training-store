# 管理者ユーザー

## 目的・対象範囲

管理者がユーザーの会員ランク、オペレーター／管理者ロール、アカウントステータスを管理する契約を定義します。

## ビジネスルール

### BR-ADMINUSER-001 — ユーザー変更はロール、ステータス、最終管理者保護を守る

会員ランクはカスタマー内のみ、ロールはoperator／admin間のみ、ステータスはactive／suspended間のみ変更可能です。最後の管理者の変更、自身の権限を失わせる自己破壊的変更、退会済み（withdrawn）ユーザーに対する変更操作は拒否します。

## UI・振る舞い契約

操作を拒否する際はその理由を提示し、操作者自身のアカウントに対するロール／ステータス変更や、退会済み（withdrawn）ユーザーに対する更新を操作可能に見せないようにします。ステータス変更時は、必要なセッションやチェックアウトの無効化について利用者へ説明を表示します。

### SCREEN-ADMIN-USERS — 管理者ユーザー

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- ユーザーのロール、ランク、アカウントステータス、および絞り込み条件を表示する。
- 操作者自身、退会済み（withdrawn）、最後の管理者などに対する変更の境界条件を説明する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `admin` | `default` | ユーザー一覧とステータス／ロールを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINUSER-001`, `AC-ADMINUSER-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-USERS default web-desktop](../assets/screens/SCREEN-ADMIN-USERS/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-USERS/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-USERS default web-tablet](../assets/screens/SCREEN-ADMIN-USERS/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-USERS/default/web-tablet.webp)

### SCREEN-ADMIN-USER-DETAIL — 管理者ユーザー詳細

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- ユーザー詳細と、許可されたロール／ランク／ステータスの操作を表示する。
- 自己破壊的変更、退会済み（withdrawn）ユーザーに対する変更操作、最後の管理者に対する変更操作をUI上で操作可能に見せない。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `admin` | `default` | ユーザー詳細と保護理由を表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-ADMINUSER-001`, `AC-ADMINUSER-001` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-USER-DETAIL default web-desktop](../assets/screens/SCREEN-ADMIN-USER-DETAIL/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-USER-DETAIL/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-USER-DETAIL default web-tablet](../assets/screens/SCREEN-ADMIN-USER-DETAIL/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-USER-DETAIL/default/web-tablet.webp)

## 受入基準

### 基準

#### AC-ADMINUSER-001 — ユーザー変更の境界を守る

関連ビジネスルール: `BR-ADMINUSER-001`

許可されたランク／ロール／ステータスの変更のみが成功し、最後の管理者の変更、自身に対する変更、退会済み（withdrawn）ユーザーの変更、ロールの不整合は拒否されます。

## 実行可能な正本ソース

- `src/application/use-cases/admin-master-use-cases.ts`
- `src/domain/policies/permissions.ts`
- `app/admin/users/`
