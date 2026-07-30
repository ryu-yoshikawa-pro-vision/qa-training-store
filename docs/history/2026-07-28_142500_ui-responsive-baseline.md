# UI Responsive Baseline 更新履歴

## 変更日時

- 2026-07-28 14:25 JST

## 変更内容

- `docs/PROJECT_CONTEXT.md`へVisual Reviewの標準Viewportを明記した。
- Storefront／customerの主要Flowは320×700でも、横overflow、44px touch target、Page End到達性を検証する基準を追加した。

## 根拠

- Desktop 1440×1000、Tablet 1024×900、Mobile 390×844に加え、320×700の実ブラウザ購入Flowを検証対象へ追加した。
- `e2e/web/mobile-boundary.spec.ts`と`e2e/web/ui-review.spec.ts`で同じ境界を継続的に確認できる。

## 非変更領域

- Domain、Application Use Case、Database、Route、Permission、Seed、管理画面の既存Viewport契約は変更していない。
