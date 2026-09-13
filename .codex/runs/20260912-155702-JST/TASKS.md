# Tasks

## Now

- [x] 1. 開始branch／HEAD／worktree／PR状態、前回Run、入口文書を確認し、新規strict Runを作成する。
- [x] 2. 現行sourceのまま `pnpm run verify` を1回実行し、runtime開始条件を判定する。
- [x] 3. 許可条件の場合だけdiagnostic evaluator snapshot、fresh Target、Codex version、Target dataset不存在、固定diagnostic scriptを検証・保存する（script実行前検証で不具合を検出して停止）。
- [x] 5. 実値表、canonical Skill比較、未確定事項、evaluationをRun Artifactへ記録する（runtime未実行のため実値は未取得）。
- [x] 6. evaluation schema、Prettier、Markdown lint、Sanitizer Write／Check、strict collector、`git diff --check`を検証する。
- [x] 7. PR本文を追記し、branch／diffを確認してnon-force pushする。
- [x] 8. `gh pr checks 127`の最終状態を確認し、Runを完了する。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. （必要になったら追記）

## Blocked

- B1. 固定diagnostic scriptのCJS変換失敗（top-level `await`）をcase開始前に検出した。指定どおりscript修正・case実行・retryを行わないため、3ケースのruntime／実値取得は未実行。
