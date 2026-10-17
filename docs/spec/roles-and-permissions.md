# Roles and Permissions

## Roles

| Actor | Storefront | Cart | Checkout | Customer data | Store management | User management |
|---|---:|---:|---:|---:|---:|---:|
| guest | read | yes | no | no | no | no |
| customer(active) | read | yes | yes | own only | no | no |
| customer(suspended/withdrawn) | login denied | no session | no | no | no | no |
| operator(active) | guest-equivalent read | no | no | no | yes | no |
| admin(active) | guest-equivalent read | no | no | no | yes | yes |

## Customer Rank

権限水準は `regular`、`gold`、`platinum` の順に高くなります。ランク制限商品は、同等以上のランクを持つCustomerのみ閲覧できます。価格割引および配送料の適用条件は、現在のランクに基づいて商品単価ごとに計算します。具体的なランクの定義値は `src/domain/policies/permissions.ts` および価格計算ユースケースを正本とします。

## Authorization

認可制御（Authorization）はUI上の表示制御にとどまらず、アプリケーションのユースケース層で確実に適用・強制します。Customerは自身のアカウント（Account）、配送先住所（Address）、注文履歴（Order）、レビュー（Review）のみ操作できます。OperatorおよびAdminはストア管理を行えますが、Customer向けの購入導線は利用できません。ユーザー管理（User management）を実行できるのはAdminのみです。

## Account Status

Customerのログインおよびチェックアウト（Checkout）が許可されるのは `active` 状態のみです。`suspended` および `withdrawn` のアカウントはログインが拒否されます。管理画面などの操作で変更可能なアカウント状態の遷移は `active ↔ suspended` に限られ、`withdrawn` はシードデータとして固定された読み取り専用の状態です。

## Canonical Sources

ロールやステータスの型定義は `src/domain/contracts/entities.ts`、認可ポリシーは `src/domain/policies/permissions.ts`、セッション管理およびルートガードは `src/application/` および `src/presentation/`、固定アカウントデータは `src/seeds/default-dataset.ts` を参照してください。

## Screen Contracts

### SCREEN-BOUNDARY-FORBIDDEN — Forbidden

Screen Catalog: [Screen Catalog](./screen-catalog.md)

#### Functions

- ロール（Role）または権限（Permission）の不足によりアクセスできないルートであることを説明する。
- 利用者が安全にストアフロント（Storefront）やアクセス可能な導線へ戻れるアクションを表示する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `guest, customer, operator, admin` | `default` | 権限不足の説明と安全な戻り先を表示する。 | `required` | `web-desktop, android` | `-` | [Roles and Permissions](./roles-and-permissions.md#authorization), [UI and UX Contract](./ui-ux-contract.md#boundary-ux) |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-BOUNDARY-FORBIDDEN default web-desktop](assets/screens/SCREEN-BOUNDARY-FORBIDDEN/default/web-desktop.webp)](assets/screens/SCREEN-BOUNDARY-FORBIDDEN/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-BOUNDARY-FORBIDDEN default android](assets/screens/SCREEN-BOUNDARY-FORBIDDEN/default/android.webp)](assets/screens/SCREEN-BOUNDARY-FORBIDDEN/default/android.webp)