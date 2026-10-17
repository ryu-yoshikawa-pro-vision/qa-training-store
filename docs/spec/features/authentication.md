# Authentication

## Purpose / Scope

ログイン、サインアップ、セッション管理、アカウント状態、ロール、顧客向けリダイレクト（Return）先、およびゲストカート統合について定義します。

## Business Rules

### BR-AUTH-001 — ログイン時はアカウント状態とロールを検証してセッションを生成する

有効（active）なアカウントのみがログインできます。これにはサインアップによって作成された有効なアカウントも含まれます。停止中（suspended）または退会済み（withdrawn）のアカウントからのログインは拒否し、セッションを作成しません。

### BR-AUTH-002 — 顧客以外の権限を購入導線へ渡さない

一般顧客（Customer）のみがチェックアウトおよび顧客データを利用し、オペレーター（operator）や管理者（admin）はストア管理のみを行います。ログイン成功時も、各ロールに応じた専用画面（Shell）へ遷移します。

## UI / Behavior Contract

認証の失敗理由は利用者向けの分かりやすい文言で表示し、内部ハッシュやアクターIDなどのシステム情報は露出させません。顧客のログイン成功時は、許可された内部リダイレクト先のみへ遷移し、外部URLや親ディレクトリへの相対パスは受け付けません。

### SCREEN-AUTH-LOGIN — Login

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- メールアドレスとパスワードを受け取り、許可されたアカウント状態およびロールであることを検証する。
- ログインの拒否理由は利用者向け文言で表示し、安全な内部リダイレクト先のみを採用して遷移する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `guest` | `default` | ログインフォームとサインアップへの導線を表示する。 | `required` | `web-desktop, android` | `-` | `BR-AUTH-001`, `AC-AUTH-001` |
| `validation-error` | error | `guest` | `default` | 必須入力項目の不足をサマリー表示で説明する。 | `required` | `web-desktop` | `-` | `BR-AUTH-001`, `AC-AUTH-001` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-AUTH-LOGIN default web-desktop](../assets/screens/SCREEN-AUTH-LOGIN/default/web-desktop.webp)](../assets/screens/SCREEN-AUTH-LOGIN/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-AUTH-LOGIN default android](../assets/screens/SCREEN-AUTH-LOGIN/default/android.webp)](../assets/screens/SCREEN-AUTH-LOGIN/default/android.webp)

##### `validation-error`

###### Web Desktop

[![SCREEN-AUTH-LOGIN validation-error web-desktop](../assets/screens/SCREEN-AUTH-LOGIN/validation-error/web-desktop.webp)](../assets/screens/SCREEN-AUTH-LOGIN/validation-error/web-desktop.webp)

### SCREEN-AUTH-SIGNUP — Signup

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- 新規顧客の表示名、メールアドレス、パスワードを受け付ける。
- 入力バリデーション結果やアカウントの重複状況を明示し、登録成功時は安全な購入導線の入口へ遷移する。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `guest` | `default` | サインアップフォームを表示する。 | `required` | `web-desktop, android` | `-` | `BR-AUTH-001`, `AC-AUTH-001` |
| `validation-error` | error | `guest` | `default` | 入力エラーと修正方法を表示する。 | `not-applicable` | `-` | `reason: 同じフォームバリデーションの視覚差分はLoginのvalidation referenceで代表する` | `AC-AUTH-001` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-AUTH-SIGNUP default web-desktop](../assets/screens/SCREEN-AUTH-SIGNUP/default/web-desktop.webp)](../assets/screens/SCREEN-AUTH-SIGNUP/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-AUTH-SIGNUP default android](../assets/screens/SCREEN-AUTH-SIGNUP/default/android.webp)](../assets/screens/SCREEN-AUTH-SIGNUP/default/android.webp)

##### `validation-error`

### SCREEN-AUTH-ACCOUNT-PROFILE — Account Profile

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- 顧客本人のプロフィール、会員ランク、アカウント状態を表示する。
- 顧客権限以外の機能（Capability）や内部IDは表示しない。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `regular-member` | プロフィール情報と会員ランク特典を表示する。 | `required` | `web-desktop, android` | `-` | `BR-AUTH-002`, `AC-AUTH-002` |

#### Visual References

##### `default`

###### Web Desktop

[![SCREEN-AUTH-ACCOUNT-PROFILE default web-desktop](../assets/screens/SCREEN-AUTH-ACCOUNT-PROFILE/default/web-desktop.webp)](../assets/screens/SCREEN-AUTH-ACCOUNT-PROFILE/default/web-desktop.webp)

###### Android — Canonical Visual Reference

[![SCREEN-AUTH-ACCOUNT-PROFILE default android](../assets/screens/SCREEN-AUTH-ACCOUNT-PROFILE/default/android.webp)](../assets/screens/SCREEN-AUTH-ACCOUNT-PROFILE/default/android.webp)

## Acceptance Criteria

### Criteria

#### AC-AUTH-001 — ログイン拒否時にセッションを作成しない

Related BR: `BR-AUTH-001`

有効（active）、停止中（suspended）、退会済み（withdrawn）のアカウントにおいて、ログインの成功・拒否、セッション作成の有無、および画面上のエラー表示が正しく行われることを確認できます。

#### AC-AUTH-002 — ロール境界と安全なリダイレクト先を保護する

Related BR: `BR-AUTH-002`

顧客（Customer）、オペレーター（operator）、管理者（admin）の間で表示される権限機能と遷移先が厳密に分離され、外部URLや不正なリダイレクト先が採用されないことを確認できます。

## Executable Canonical Sources

- `src/application/use-cases/auth-use-cases.ts`
- `src/domain/policies/permissions.ts`
- `src/presentation/browser/return-to.web.ts`
- `src/seeds/default-dataset.ts`
- `app/login.tsx`, `app/signup.tsx`, `app/_layout.tsx`