# Scenario Shop Specification System

このディレクトリは、Scenario Shopの現在のProduct Behaviorを定義するSpecification Systemです。AI、Developer、QA、Learnerは、Expected Behaviorを判断するとき、Normative Product BehaviorとそのFeature内のBR/ACを優先します。

## Responsibility

### Normative Product Behavior

次のファイルだけが、現在の期待挙動を定義します。

- [`product-scope.md`](./product-scope.md)
- [`roles-and-permissions.md`](./roles-and-permissions.md)
- [`state-and-scenarios.md`](./state-and-scenarios.md)
- [`ui-ux-contract.md`](./ui-ux-contract.md)
- `features/**/*.md`

### Supporting / Operational

README、[`glossary.md`](./glossary.md)、[`change-process.md`](./change-process.md)、[`known-deviations.md`](./known-deviations.md)、[`unresolved-specifications.md`](./unresolved-specifications.md)、[`_templates/`](./_templates/feature-spec.md) は、読み方・運用・履歴・未確定事項を補助します。Supporting文書はNormative Oracleではありません。

### Executable Canonical Sources

Seed Scenario ID、Role/Status Type、Route、Design Token、Build Config、App ID、Test ID、Accessibility Labelなどの低レベル値は、各文書のExecutable Canonical Sourcesに記載したCode/Configを正本とします。

## Oracle Priority

1. Normative Product Behavior
2. 同じFeatureのBR / AC
3. Active Known Deviation（差異の説明のみ）
4. ADRによるDecision History
5. Application / Seed / Test / README / Guide（Evidenceまたは実装参照）

ただし、各Featureの`Executable Canonical Sources`で明示された低レベル値については、Code / Configを正本とします。対象はRoute、App ID、Test ID、Accessibility label、Seed ID、Design token、Build configなどです。この例外は値の解決に限り、Application / Seed / Test / README / Guide全般をExpected Product Behaviorの上位Oracleへ昇格させるものではありません。

Known DeviationはExpected Behaviorを書き換えません。Unresolvedの項目は、Product Decisionが完了するまでDefect Oracleにしません。

## Navigation

- [Screen Catalog](./screen-catalog.md)
- [Product Scope](./product-scope.md)
- [Roles and Permissions](./roles-and-permissions.md)
- [State and Scenarios](./state-and-scenarios.md)
- [UI and UX Contract](./ui-ux-contract.md)
- [Storefront](./features/storefront.md)
- [Authentication](./features/authentication.md)
- [Cart](./features/cart.md)
- [Checkout and Payment](./features/checkout-and-payment.md)
- [Orders](./features/orders.md)
- [Reviews](./features/reviews.md)
- [Admin Catalog](./features/admin-catalog.md)
- [Admin Inventory](./features/admin-inventory.md)
- [Admin Orders](./features/admin-orders.md)
- [Admin Users](./features/admin-users.md)
- [Native Customer](./features/native-customer.md)

## Change entry point

仕様変更は [`change-process.md`](./change-process.md) の順序に従います。Generated HTMLは `pnpm run build:spec` で再生成する成果物であり、編集対象ではありません。
