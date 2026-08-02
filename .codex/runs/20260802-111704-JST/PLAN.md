# 品質ゲート実行計画

## 目的

現行Branchの品質ゲートをコード変更なしで実行し、失敗・警告・環境要因の有無を確認する。

## 仮説

- `pnpm run verify` がプロジェクトの静的検査、テスト、Web buildを網羅する。
- `bash scripts/verify` はCodex harness／template契約を検証するため、併せて実行する。
- 既存E2Eの主要ゲートは前回成功済みだが、品質ゲートの判断材料として必要な範囲を確認する。

## 実行範囲

- `pnpm run verify`
- `bash scripts/verify`
- 必要に応じてE2E／format／Git差分確認
- コード変更、依存追加、Git mutationは行わない

## 完了条件

- 品質ゲートの終了コードと主要結果をREPORTに記録する。
- 失敗があれば修正せず、原因とNextを明記する（本依頼は検証のみ）。

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
