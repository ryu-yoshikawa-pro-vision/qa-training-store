# 2026-08-02 Dirty Navigationガード追補

## 変更理由

PR #4追加修正の最終確認で、Dirtyな商品編集画面のBrowser Backと保存完了後の遷移を同時に扱う必要が明確になった。

## 記録

- React AriaのModal／DialogでFocus trap、Escape、復帰Focusを担保する。
- Expo Routerの`usePreventRemove`でBrowser BackのActionを保留し、履歴URL／stateを編集画面へ復元して確認する。
- 変更破棄後にDirty guardを解除して元のActionをDispatchする。保存中はguardを無効化し、保存完了後の既存遷移を妨げない。

## 参照

- `src/presentation/pages/admin-product-pages.tsx`
- `e2e/web/ui-ux-improvements.spec.ts`
- `tests/component/admin-product-pages.test.tsx`
