# Plan（計画）

## 目的

- PR #176の最終レビューで確認した2件を修正し、Plan-only PRを品質ゲートに通せる状態へする。

## 修正内容

- 保存PlanのGitHub Docs 2 URLをMarkdown linkへ変更し、末尾の余分な空行を削除する。
- Reusable Workflow化後も`NODE_VERSION` / `PNPM_VERSION` / `HUSKY`を親workflowとcalled workflowで一致させる契約を追加する。
- `native-ci-workflow.test.ts`で3値の一致を比較する実装方針をPlanへ追加する。
- PR本文の検証欄を初回Remote CIの実結果へ更新する。

## 対象外

- Native CI実装
- Product code変更
- workflow実装変更
- merge、Issue close
