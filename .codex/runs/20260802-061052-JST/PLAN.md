# PLAN

- 目的: `src/presentation/components/one-time-notice.tsx` と `src/presentation/pages/guide-page.tsx` のみを最小差分で更新する。
- 方針: Scenario Reset Notice は既存 storage payload / 型 / 契約を変更せず、表示だけを拡張する。Guide は内部名を日本語ラベルへ置換し、Route は安全な内部 Path のみ Link 化する。
- 既知の制約: git mutation は行わない。テストコードは変更しない。
