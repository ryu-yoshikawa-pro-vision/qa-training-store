# Scenario Shop Specification System

このディレクトリは、Scenario Shopの現在のProduct Behaviorを定義するSpecification Systemです。機能を学ぶときは、まず次の順で対象の期待動作を読みます。

## 学習者向けの読み始め

1. [Product Scope](./product-scope.md)で対象範囲を確認する。
2. [Roles and Permissions](./roles-and-permissions.md)でRoleと権限を確認する。
3. 対象FeatureのPurpose / Scopeを読む。
4. 同じFeatureのBusiness RulesとAcceptance Criteria（BR / AC）を読む。
5. 必要な状態とScenarioを[State and Scenarios](./state-and-scenarios.md)で確認する。
6. 必要な画面状態を[UI and UX Contract](./ui-ux-contract.md)で確認する。
7. 実装するときだけ、Feature文書のExecutable Canonical SourcesにあるCode / Configを参照する。

現在のUIや`/guide`は対象を観察する入口として使えますが、期待動作を決める正本ではありません。初期データやSeed IDなどの具体値は、必要になった段階で文書が示す実装上の参照先へ進みます。

## Navigation

- [Product Scope](./product-scope.md)
- [Roles and Permissions](./roles-and-permissions.md)
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
- [State and Scenarios](./state-and-scenarios.md)
- [UI and UX Contract](./ui-ux-contract.md)
- [Screen Catalog](./screen-catalog.md)

## 仕様を管理・変更するときのルール

### Responsibility

#### Normative Product Behavior

次のファイルだけが、現在の期待挙動を定義します。

- [`product-scope.md`](./product-scope.md)
- [`roles-and-permissions.md`](./roles-and-permissions.md)
- [`state-and-scenarios.md`](./state-and-scenarios.md)
- [`ui-ux-contract.md`](./ui-ux-contract.md)
- `features/**/*.md`

#### Supporting / Operational

README、[`glossary.md`](./glossary.md)、[`change-process.md`](./change-process.md)、[`known-deviations.md`](./known-deviations.md)、[`unresolved-specifications.md`](./unresolved-specifications.md)、[`_templates/`](./_templates/feature-spec.md) は、読み方・運用・履歴・未確定事項を補助します。Supporting文書はNormative Oracleではありません。

#### Executable Canonical Sources

Seed Scenario ID、Role/Status Type、Route、Design Token、Build Config、App ID、Test ID、Accessibility Labelなどの低レベル値は、各文書のExecutable Canonical Sourcesに記載したCode/Configを正本とします。

### Oracle Priority

1. Normative Product Behavior
2. 同じFeatureのBR / AC
3. Active Known Deviation（差異の説明のみ）
4. ADRによるDecision History
5. Application / Seed / Test / README / Guide（Evidenceまたは実装参照）

ただし、各Featureの`Executable Canonical Sources`で明示された低レベル値については、Code / Configを正本とします。対象はRoute、App ID、Test ID、Accessibility label、Seed ID、Design token、Build configなどです。この例外は値の解決に限り、Application / Seed / Test / README / Guide全般をExpected Product Behaviorの上位Oracleへ昇格させるものではありません。

Known DeviationはExpected Behaviorを書き換えません。Unresolvedの項目は、Product Decisionが完了するまでDefect Oracleにしません。

### Change entry point

仕様変更は [`change-process.md`](./change-process.md) の順序に従います。Generated HTMLは `pnpm run build:spec` で再生成する成果物であり、編集対象ではありません。
