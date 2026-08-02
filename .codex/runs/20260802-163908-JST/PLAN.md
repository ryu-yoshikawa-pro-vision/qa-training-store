# Plan

## Objective
- 添付された `pnpm run test:component` の再現性ある失敗を根本原因に沿って修正し、Component Test を安定して成功させる。

## Scope
- In:
  - `tests/component/review-user-pages.test.tsx`
  - 必要な場合のみ `src/presentation/pages/review-user-pages.tsx` の該当 Form 再取得境界
  - 今回の `.codex/runs/20260802-163908-JST/` 標準 Artifact
- Out:
  - 無関係な製品コード、依存関係、CI、E2E、Git 操作
  - テストの期待値を弱める変更、固定待機、無条件 Retry

## Assumptions
- 失敗は `AdminUserDetail` の mutation 後に最新 DTO が反映される前に、旧 DOM の値を待機条件が満たしたと誤認する非同期テストの race と仮説する。
- 仕様は「mutation 成功後に最新 rank が表示され、同一値の変更ボタンが disabled」であり、この期待値は維持する。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。添付ログ、対象テスト、実装から scope と期待値を確定できる。
- 仮定してよい細部: 再取得完了を示す最新 DOM の assertion を `waitFor` 内で評価する。
- 未回答の重要質問: なし。

## Hypotheses
- H1: mutation 後の `rankSelect` ローカル参照は旧 Form の DOM であり、変更直後には既に `gold` のため、最新 DTO の再取得完了を待てない。
- H2: `screen` から最新の rank select と変更ボタンを `waitFor` 内で取得し、両方を同時に検証すれば race を解消できる。

## Research Plan
- Round 1 Query: 添付 failure、対象 Component Test、`AdminUserDetailForm`、`useAsyncValue`、直近履歴を照合し、再現性と mock 消費順を確認する。
- Round 2 Query: 最小 assertion 修正後に対象テストと `pnpm run test:component` を再実行し、連続実行で race が残らないことを確認する。
- Exit Criteria:
  - failure の根因を現行コード上の根拠で説明できる
  - allowed scope 内の最小差分で対象テストが成功する
  - Component Test 全体と差分監査が成功する

## Approach
- 失敗を単体／全体で再現し、旧 DOM 参照と再取得のタイミングを確認する。
- `waitFor` の条件を最新 DOM 上の rank と disabled 状態へ限定的に修正する。
- 対象テスト、Component Test 全体、format/typecheck、差分監査を実行し、repair iteration として記録する。
- 標準フロー: `PLAN -> TASKS -> 調査 -> 修正 -> 検証 -> REPORT`

## Definition of Done
- 添付の失敗ケースが最新 DTO の rank 表示と disabled 状態を待って成功する。
- `pnpm run test:component` が全11ファイル／76テストで成功する。
- 変更が allowed files と Run Artifact に限定され、typecheck と `git diff --check` が成功する。repo 全体の format:check が既存 baseline で失敗する場合は、対象差分を広げず証跡へ残す。
- repair iteration の入力 finding、計画、変更、検証、残差、停止判断が REPORT に残る。

## Risks / Unknowns
- 実装側の再取得 race が残っている可能性があるため、テストだけを直して終わらせず全体 Component Test と連続実行で確認する。
- 並列 Component Test は環境負荷で遅くなる可能性があるが、固定 Wait や無条件 Retry は追加しない。

## Thinking Log
- 2026-08-02 16:39 (JST): 添付ログの failure は correctness に関わるため `must_fix` と分類し、新規 repair run を初期化した。
- 2026-08-02 16:40 (JST): 対象テスト単体は成功したが、`pnpm run test:component` で同じ1件を再現した。単体／全体で発生頻度が異なるため flaky race を疑った。
- 2026-08-02 16:45 (JST): mutation 後の `await waitFor(() => expect(rankSelect).toHaveValue("gold"))` は mutation 直後の旧 select 参照を評価しており、再取得完了を保証しない。最新 DOM の select と button を同じ `waitFor` 内で確認する方針を確定した。
