# 状態遷移設計

## 1. Phase 1

### 商品

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> published
  draft --> [*]: 参照なし物理削除
  published --> unpublished
  published --> discontinued
  unpublished --> published
  unpublished --> discontinued
  discontinued --> [*]
```

### Account

```mermaid
stateDiagram-v2
  [*] --> active
  active --> suspended
  suspended --> active
  withdrawn --> [*]
```

Phase 1では`active ↔ suspended`だけを管理操作として扱います。`withdrawn`は固定Seedの読取専用状態で、退会遷移はPhase 2です。

### Checkout Session

```mermaid
stateDiagram-v2
  [*] --> active
  active --> converted: Order作成
  active --> abandoned: Rank/Account変更または新Session置換
  active --> expired: 24時間超過
  converted --> [*]
  abandoned --> [*]
  expired --> [*]
```

Cart変更時はCheckout Sessionを同じTransactionで更新しません。Cart Item変更で親Cart Versionだけを更新し、Checkout Route Guard・確認画面取得・注文確定時にSessionの`cartVersion`との不一致を検出してCartへ戻します。その後にCheckoutを再開始した際、旧active Sessionをabandonedへ変更して新しいCart VersionのSessionを作成します。

### Order

```mermaid
stateDiagram-v2
  [*] --> pending_payment
  pending_payment --> payment_failed: 明確なPayment失敗
  pending_payment --> paid: Payment成功確定
  payment_failed --> pending_payment: 再Payment開始
  paid --> preparing: 準備開始
  preparing --> shipped: 発送
  shipped --> delivered: 配送完了
  delivered --> [*]
```

### Payment

```mermaid
stateDiagram-v2
  [*] --> processing
  processing --> succeeded
  processing --> failed
  failed --> [*]
  succeeded --> [*]
```

### Shipment

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> shipped
  shipped --> delivered
```

### Review

```mermaid
stateDiagram-v2
  [*] --> published
  published --> hidden
  hidden --> published
  published --> deleted
  hidden --> deleted
  deleted --> [*]
```

### Cart

```mermaid
stateDiagram-v2
  [*] --> active
  active --> consumed: Order作成
  active --> abandoned
  consumed --> [*]
  abandoned --> [*]
```

## 2. 操作制約

- Payment processing中は再Payment・Cancel不可。
- paid Orderを直接shippedへ変更できない。必ずpreparingを経由する。
- OrderとShipmentの状態を別々の操作で更新しない。
- Review deletedは終端。
- 強制状態変更Use CaseはPhase 1へ設けない。

## 3. 将来拡張

- Phase 2: cancelled、cancel_requested、return_requested、returned、refund_pending、refund_failed、refunded。
- Phase 3: payment_unknown、reconciliation_required。

将来状態をPhase 1のDB CHECK制約やUIへ先行追加しません。
