# Plan

## Objective

- PR #16のレビュー指示に基づき、Agentic QAのScored isolation、Preparation、Evidence、Scoring、Benchmark、Spec Validatorをfail-close化する。

## Scope

- In: P0/P1と必須P2の契約・実行経路・テスト・教材・Normative Spec・Run Artifact。
- Out: Product Behavior、Application SourceへのChallenge Patch適用、Git/PR操作、upload-artifact単独SHA pin。

## Assumptions

- LLM/model-backed Official Scored Runは基盤不足のため未実行とし、contract fixtureは正式Scoringから除外する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Runtime handleはPreparation callbackへ渡し、Artifactには相対証跡だけを保存する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 固定値を実測結果と証跡へ置換すれば、失敗時に正式Scoringへ進まない契約を成立できる。
- H2: 共有Comparator/CLI/Schema helperを先に確定すれば、Producer/Validatorの不一致を防げる。

## Research Plan

- Round 1 Query: P0/P1 CodeRabbit指摘を現HEADと添付指示へ照合する。
- Round 2 Query: 修正後の壊れた入力テスト、3 Challenge Preparation、全Quality Gateを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- 共有Contract/helper → P0実行経路 → P1/P2 validator/docs → negative tests → Runtime/全Gate → scope/sanitizerの順に修正する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done

- P0/P1必須指示を実装し、壊れた入力がfail-close、3 Challenge preparation、指定validation、Run Artifact監査がPASSする。未実行model-backed runはPASS扱いしない。

## Risks / Unknowns

- Schema必須化によるfixture破壊、runtime cleanup漏れ、Windows改行差分を対象テストとscope監査で検知する。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。

- 既存Run `20260810-061558-JST` は前タスク完了済み。今回の修正は新Run `20260810-130321-JST` で記録し、指示された旧Runへは追補のみ行う。
- 2026-08-10 15:27 JST: 追加レビューでは、policyとActual Tool Scope、narrativeとEvidence artifact、local fixtureとOfficial Scored Runを別境界として維持することを確認した。未計測Scope／未実行Official RunはPASSへ昇格しない。
