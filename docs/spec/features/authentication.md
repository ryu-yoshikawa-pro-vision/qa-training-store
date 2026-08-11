# Authentication

## Purpose / Scope

Login、Signup、Session、Account Status、Role、Customer向けReturn先、Guest Cart統合を定義します。

## Business Rules

### BR-AUTH-001 — LoginはAccount StatusとRoleを検証してSessionを作る

activeなAccountだけがLoginできます。Signupで作成されたactiveなAccountを含みます。suspended/withdrawnは拒否し、Sessionを作成しません。

### BR-AUTH-002 — Customer以外のCapabilityを購入導線へ渡さない

CustomerだけがCheckoutとCustomer Dataを使い、operator/adminはStore管理だけを行います。Login成功時もRoleに応じたShellへ遷移します。

## UI / Behavior Contract

失敗理由は利用者向け文言で表示し、内部HashやActor IDを露出しません。Customer Login時は許可された内部Return先だけへ戻り、外部・親相対Pathは受け付けません。

## Acceptance Criteria

### Criteria

#### AC-AUTH-001 — Login拒否時にSessionを作らない

Related BR: `BR-AUTH-001`

active、suspended、withdrawnのAccountで、成功/拒否、Session有無、画面のエラーを確認できます。

#### AC-AUTH-002 — Role境界と安全なReturn先を守る

Related BR: `BR-AUTH-002`

Customer、operator、adminで表示Capabilityと遷移先が分離され、外部または不正なReturn先が採用されません。

## Executable Canonical Sources

- `src/application/use-cases/auth-use-cases.ts`
- `src/domain/policies/permissions.ts`
- `src/presentation/browser/return-to.web.ts`
- `src/seeds/default-dataset.ts`
- `app/login.tsx`, `app/signup.tsx`, `app/_layout.tsx`
