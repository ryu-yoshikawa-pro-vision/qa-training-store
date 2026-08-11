# Spec Impact Summary CI連携の記録

## 背景

Wave 5では、Changed BR / ACと変更された直接参照Normative fileからAffected Challenge IDをReview Summaryへ出す必要がある。既存実装には影響判定helperとテストがあったが、CI実行経路へ接続されていなかった。

## 判断

既存のStyle Quality Jobへ`Specification impact summary` Stepを追加し、新規CI Jobは増やさない。`scripts/spec/summarize-impact.ts`はPRではbase branchとのdiff、pushではevent before SHA、ローカルWorking Tree modeでは未追跡`docs/spec`も参照する。結果はGitHub Actionsの`GITHUB_STEP_SUMMARY`へMarkdownとして追記し、変更なしも明示する。

## 検証

- `pnpm run summarize:spec-impact -- --base-ref HEAD --working-tree`でChanged BR / AC、Normative file、3 Challenge IDを出力。
- `pnpm run test:contracts`: 24 files / 185 tests PASS。
- `pnpm run validate:spec`、`pnpm run build:spec`、`pnpm run typecheck`、`pnpm run lint:markdown`、targeted Prettier / ESLint PASS。
