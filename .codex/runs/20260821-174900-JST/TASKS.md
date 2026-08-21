# Tasks

## Now

- [x] 1. Repository Planning / Review Contractを再確認する
- [x] 2. Main PlanをTemplate必須項目へ再整理する
- [x] 3. MNT-003 / REP-002 / PR Slice / MCP / Oracle / SHA pinning指摘を反映する
- [x] 4. R3 Storefront parityをCurrent BR/AC全dimensionのrebaselineへ修正する
- [x] 5. R7 Flow Jの正本ValidationをFocused Playwrightへ修正する
- [x] 6. R8をNative Product PRのmerge gateとして明示する
- [x] 7. Branch差分を確認し、Plan + Run Artifact以外の変更がないことを確認する
- [ ] 8. `sanitize-codex-artifacts`をWrite + Checkで実行する
- [ ] 9. `pnpm run format:check`を実行する
- [ ] 10. `pnpm run lint:markdown`を実行する

## Discovered

- D1. Current Native Test Control scenario allowlistに`gold-member` / `platinum-member`がないため、Runtime検証だけを目的としたscenario追加は禁止する → Plan反映済み。
- D2. Cross Browser CI splitは実装branchに存在するがmain未反映のため、R13を`BLOCKED_BY_DEPENDENCY`とする → Plan反映済み。
- D3. `BR-STOREFRONT-002` / `AC-STOREFRONT-002`は在庫・Sale・最低評価・Facet件数・stable sortも要求する → R3へ全dimensionを反映済み。
- D4. REP-012はProduct Runtime FindingではなくTest Oracle Finding → Focused Playwrightを正本Validationへ変更済み。

## Blocked

- B1. GitHub connector環境ではRepository script / pnpm commandを直接実行できないため、Task 8〜10はRepositoryをローカル取得できる環境で実行する。

現在のPlanning RunはValidation未完了のため100%完了扱いにしない。
