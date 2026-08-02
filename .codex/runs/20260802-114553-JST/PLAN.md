# PR #4 CI Component失敗 Repair Plan

## 入口

GitHub Actionsの`tests/component/review-user-pages.test.tsx`で、未配達Review URLの注文日時期待値が見つからず失敗した。

## Finding triage

- `must_fix`: `src/presentation/pages/review-user-pages.tsx`の注文日時表示が実行環境のtimezoneに依存し、JSTのシナリオ時刻契約を破っている。
- `defer`: `catalog-pages.test.tsx`のReact `act(...)` warning。今回のfailure原因ではなく、別iterationへ分離する。

## Allowed files

- `src/presentation/pages/review-user-pages.tsx`
- `tests/component/review-user-pages.test.tsx`
- `.codex/runs/20260802-114553-JST/`（Run Artifactのみ）

## Iteration 1 repair plan

`orderCreatedAt`の表示に`Asia/Tokyo` timezoneを明示し、UTC環境でもシナリオ日時がJSTで表示されるようにする。既存のテスト期待値を維持し、UTCで再現テスト、対象Component、全verifyで確認する。

## Stop condition

同じfailureが再発、allowed files超過、要件曖昧性、または新しいfailureが出た場合は修正を止める。

## Objective
- （今回の指示を達成する）

## Scope
- In:
- Out:

## Assumptions
- （不明点があれば明示）

## Questions / Ambiguity
- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Hypotheses
- H1:
- H2:

## Research Plan
- Round 1 Query:
- Round 2 Query:
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach
- どう進めるか（高レベル手順）
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done
- 満たしたら完了とする条件

## Risks / Unknowns
- リスクと対策

## Thinking Log
- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
