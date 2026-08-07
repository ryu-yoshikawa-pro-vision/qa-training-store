# 品質ゲート範囲外エラー対応方針（2026-08-07）

## 背景

2026-08-07の品質ゲートで、今回のNative／PR #9変更が直接触れていない4つのPresentationファイルから、strict TypeScriptのimplicit-any 6件が検出された。`pnpm run verify`はFormatとLint（0 errors／64 warnings）の後、`typecheck:app`で停止した。

## 判断

「今回の変更範囲外」に見えることだけを理由に、品質ゲートのエラーを保留しない。Baseline、変更差分、共有依存、CI／テスト契約、実行環境を調査し、変更影響の可能性があるかを判定する。安全な最小修正が可能なら、元の依頼やPRの範囲外であっても対応する。

真に無関係、環境依存、unsafe、または要件判断が必要な場合だけ保留する。その場合は、根拠、影響評価、未実行の検証、次アクションをRun Artifactと最終報告へ残す。Repair Loopはboundedに扱い、同じ失敗の反復やscope violationを押し切らない。

## 今回の適用

- `confirm-dialog.tsx`と`product-detail-page.tsx`の`DialogRenderProps`、`search-combobox.tsx`の`Key`／`KeyboardEvent<HTMLInputElement>`／`SearchSuggestion`、`admin-product-pages.tsx`の`boolean`を明示した。
- ロジックは変更せず、React Ariaの型宣言に合わせた型注釈だけを追加した。
- 修正後の`typecheck:app`、`format:check`、`lint`はPASSした。関連コンポーネントテストと完全な`pnpm run verify`は続けて検証する。
