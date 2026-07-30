# Project Context

## 目的

- このリポジトリで Codex を使うときの運用前提、重要な制約、主要ディレクトリを共有する。

## 運用の要点

- `AGENTS.md` の読込順と run 運用を必ず守る。
- 計画依頼では `docs/plans/TEMPLATE.md` をベースに計画書を作る。
- `docs/reports/` は durable な調査・監査・検証結果だけに使う。review-only、plan-only、status update、軽い確認、通常の evidence command 結果、run progress 記録では作らない。
- run の進捗と実行ログは `.codex/runs/<run_id>/REPORT.md` と `.codex/runs/<run_id>/logs/` に残す。
- プロジェクト配下の読み書きは通常承認なしでよいが、shell / PowerShell / git command によるファイル削除は禁止する。意図した差分としての `apply_patch` は許可する。
- read-only 調査 subagent は調査結果だけを返し、編集・作成・削除を行わない。
- `implementation_worker` は親 agent が承認した小さく限定された実装だけを担当し、対象ファイル以外の編集、削除、rename、git mutation を行わない。
- 重要な意思決定は `docs/adr/` に記録する。
- `docs/PROJECT_CONTEXT.md` 自体は living document として更新し、履歴は `docs/history/` に残す。

## ディレクトリ構成

- `.codex/templates/`: PLAN / TASKS / REPORT の run テンプレート
- `.codex/agents/`: project-scoped custom agents
- `.codex/rules/`: execpolicy ルール
- `.agents/skills/`: repo-local の planning / review workflow と references
- `docs/plans/`: ユーザー向け計画書
- `docs/reports/`: durable な調査・監査・検証レポート
- `docs/reference/`: operator / maintainer 向け補助資料
- `scripts/`: `codex-safe` / `codex-task` / `codex-sandbox` と verify
- `codex-project.toml`: template 適用後の project metadata

## UI デザイン基準

- Storefront と customer 画面は、白／暖色系 Off White、Dark Navy `#111827`、限定的な Gold `#C6A15B` を基調とし、商品画像と情報階層を主役にする。
- 本文色は `#111827`、補足色は原則 `#475569`、Border は `#E2E8F0` とし、Gold の文字色は WCAG AA を満たす `#7A5B22` を使う。
- 最大 Content Width は 1,280px、Spacing は 8px Grid、Button／Touch Target は原則44px以上、CardはBorder中心でShadowを限定する。
- Responsive境界は Mobile 767px以下、Tablet 768〜1023px、Desktop 1024px以上を基本とする。管理操作は既存契約どおり1024px以上に限定し、小画面では専用Warningを表示する。
- Visual Reviewの標準ViewportはDesktop 1440×1000、Tablet 1024×900、Mobile 390×844とし、Storefront／customerの主要FlowはSmall Mobile 320×700でも横overflow、44px touch target、Page End到達性を検証する。
- 共通の視覚実装は `src/presentation/design/tokens.ts`、`src/presentation/styles/global.css`、Storefront／Admin shell、共有Componentへ集約し、Domain、Use Case、Seed、Route、権限制御から分離する。
- 同一条件のVisual Reviewは `e2e/web/ui-review.spec.ts` と `ui-review-*` Playwright projectで取得し、`output/ui-review/<stage>/<viewport>/` に保存する。

## メモ

- この文書はプロジェクト固有の実態に合わせて上書きしてよい。
- 標準経路は host 上の `codex-safe` / `codex-task --run-id <run_id>`。Docker sandbox は experimental かつ opt-in。
