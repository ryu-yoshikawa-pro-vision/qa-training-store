# PROJECT_CONTEXT 更新履歴

- 更新日時: 2026-07-28 01:39:13 JST
- 対象: `docs/PROJECT_CONTEXT.md`
- 理由: 全画面UI改善で確立したDesign System、Responsive境界、Visual Review経路を今後の作業基準として引き継ぐため。

## 追加した基準

- 白／暖色系Off White、Dark Navy、限定Goldによる共通Palette。
- WCAG AAを満たす本文・補足・Gold文字色。
- 1,280px Content Width、8px Grid、44px Touch Target、Border中心のCard。
- Mobile／Tablet／Desktop境界と、管理画面の1024px操作境界。
- Presentation層への視覚責務の集約と、Domain／Use Case／Seed／Route／権限制御の非変更。
- `e2e/web/ui-review.spec.ts`による同一条件Screenshot取得経路。

## 根拠

- `docs/plans/2026-07-27_232419_ec-ui-design-overhaul.md`
- `.codex/runs/20260727-231718-JST/REPORT.md`
- `output/ui-review/before/`
- `output/ui-review/after/`
