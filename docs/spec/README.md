# Scenario Shop Specification System

当ディレクトリは、Scenario Shopにおける現在の製品動作（仕様）を体系的に定義した仕様ドキュメント群です。各機能を把握・学習する際は、以下の順序に沿って期待動作を確認してください。

## 学習者向けの読み進め方

1. [Product Scope](./product-scope.md) で対象範囲を確認する。
2. [Roles and Permissions](./roles-and-permissions.md) でロールと権限を確認する。
3. 対象機能（Feature）の「目的とスコープ（Purpose / Scope）」を読む。
4. 同機能の「ビジネスルールと受け入れ基準（BR / AC）」を読む。
5. 必要な状態とシナリオを [状態とシナリオ](./state-and-scenarios.md) で確認する。
6. 必要な画面状態を [UI/UX契約](./ui-ux-contract.md) で確認する。
7. 実際に実装を行う段階でのみ、各機能ドキュメントの「実行可能な正本ソース（Executable Canonical Sources）」に記載されているコードや設定ファイル（Code / Config）を参照する。

なお、稼働中のUIや `/guide` 画面は現在の挙動を観察するための参考情報としては利用できますが、仕様の期待動作を決定づける正本ではありません。初期データやSeed IDといった具体値が必要になった場合は、各ドキュメントで指定されている実装側の参照先を確認してください。

## ナビゲーション（Navigation）

- [Product Scope](./product-scope.md)
- [Roles and Permissions](./roles-and-permissions.md)
- [Storefront](./features/storefront.md)
- [Authentication](./features/authentication.md)
- [Cart](./features/cart.md)
- [CheckoutとPayment](./features/checkout-and-payment.md)
- [注文](./features/orders.md)
- [Reviews](./features/reviews.md)
- [Admin Catalog](./features/admin-catalog.md)
- [Admin Inventory](./features/admin-inventory.md)
- [Admin Orders](./features/admin-orders.md)
- [Admin Users](./features/admin-users.md)
- [Native Customer](./features/native-customer.md)
- [状態とシナリオ](./state-and-scenarios.md)
- [UI/UX契約](./ui-ux-contract.md)
- [画面カタログ](./screen-catalog.md)

## 仕様の管理・変更ルール

### 責任分担

#### 正式な製品動作

現在期待される製品の挙動は、以下のドキュメントのみを正本として定義します。

- [`product-scope.md`](./product-scope.md)
- [`roles-and-permissions.md`](./roles-and-permissions.md)
- [`state-and-scenarios.md`](./state-and-scenarios.md)
- [`ui-ux-contract.md`](./ui-ux-contract.md)
- `features/**/*.md`

#### 補助・運用文書

README、[`glossary.md`](./glossary.md)、[`change-process.md`](./change-process.md)、[`known-deviations.md`](./known-deviations.md)、[`unresolved-specifications.md`](./unresolved-specifications.md)、[`_templates/`](./_templates/feature-spec.md) は、ドキュメントの読み方・運用手順・改訂履歴・未確定事項を補足・案内するための文書です。これらは正式な仕様の正本ではありません。

#### 実行可能な正本ソース

Seed Scenario ID、Role/Status Type、Route、Design Token、Build Config、App ID、Test ID、Accessibility Label などの低レベルな具体値については、各機能ドキュメントの「実行可能な正本ソース」に指定されているコードや設定ファイル（Code / Config）を正本とします。

### オラクル（正本判定）の優先順位

1. 正式な製品動作（上記で指定された正本ドキュメント）
2. 対象機能のビジネスルールと受け入れ基準（BR / AC）
3. アクティブな既知の差異（Active Known Deviation、差分の説明のみに限定）
4. ADRによる意思決定履歴（Decision History）
5. 実装アプリケーション / Seed / テストコード / README / ガイド（観測記録または実装上の参照情報）

ただし、各機能の `Executable Canonical Sources` で明示されている低レベル値に関しては、コードや設定ファイル（Code / Config）を正本として扱います。対象となるのは Route、App ID、Test ID、Accessibility label、Seed ID、Design token、Build config などです。この例外規定は特定の値の解決にのみ適用され、アプリケーション実装・Seed・テスト・README・ガイド全般が、期待される製品動作のドキュメントより上位の正本に繰り上がるわけではありません。

既知の差異（Known Deviation）によって期待動作の定義そのものが書き換わることはありません。また、未確定（Unresolved）の項目については、プロダクトとしての意思決定（Product Decision）が完了するまで、不具合判定の正本基準としては扱いません。

### 変更手続き

仕様を変更する際は、必ず [`change-process.md`](./change-process.md) に定められたプロセスに従ってください。なお、ビルドによって生成されるHTMLファイル群は `pnpm run build:spec` コマンドで再生成される成果物であり、直接編集する対象ではありません。