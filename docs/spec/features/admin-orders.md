# Admin Orders

## Purpose / Scope

Operator/AdminがOrderを準備、発送、配送完了へ進める管理契約を定義します。

## Business Rules

### BR-ADMINORD-001 — OrderとShipmentを同じ状態順で進める

paid → preparing、preparing → shipped、shipped → deliveredだけを許可し、対応するShipmentも同じTransactionで更新します。

## UI / Behavior Contract

Order一覧/詳細はCustomer Snapshot、現在状態、次Action、Order Action Version、Shipment情報を表示します。古いVersionでの操作はConflictとして拒否します。

## Acceptance Criteria

### Criteria

#### AC-ADMINORD-001 — 配送操作をVersion付きで実行する

Related BR: `BR-ADMINORD-001`

準備、発送、配送完了が順序とVersionを守り、OrderだけまたはShipmentだけが更新される状態を作りません。

## Executable Canonical Sources

- `src/application/use-cases/admin-operations-use-cases.ts`
- `src/domain/policies/state-transitions.ts`
- `app/admin/orders/`
