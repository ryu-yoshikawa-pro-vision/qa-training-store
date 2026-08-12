# Plan

## Objective

- 既存4 custom agentを最小修正し、新規`quality_gate_runner`を加え、Parent CodexがNative delegationで5 agentを使い分けられる状態にする。

## Scope

- In: `.codex/config.toml`、5 agent TOML、`AGENTS.md`、`scripts/verify`/`verify.ps1`、新Plan、今回のRun Artifact。
- Out: PR #20由来の独自監査基盤、launcher、ledger、dispatcher、parallel write、Product Code、CI、Git mutation。

## Assumptions

- `[agents]`のproject defaultをmodel/reasoning effortのSSOTとし、agent TOMLへ個別値を戻さない。
- 既存`max_threads = 4`、`max_depth = 1`、hooks、wrapperは維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。添付指示で完了条件と変更範囲が確定している。
- 仮定してよい細部: 既存markerを保ちながら文言を最小変更する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: TOMLのproject defaultと個別model削除で、将来のmodel変更をconfig一箇所へ集約できる。
- H2: Native smoke testは追加scriptなしで、Parentからcustom agentを直接起動して確認できる。

## Research Plan

- Round 1 Query: 既存agent/config/verify/AGENTS/plan/RunとADRを確認し、安全な変更面を確定する。
- Round 2 Query: 3 read-only researcherの結果を統合し、実装後に5 agentをNative smoke testする。
- Exit Criteria:
  - H1/H2をstatic contractとNative responseで確認する。
  - runtime capability不足があれば独自代替を作らずREPORTへ記録する。

## Approach

- 新Planを保存し、read-only調査結果を採用する。
- configとagent定義、Parent policy、既存verify contractを順に最小差分で更新する。
- TOML/static validation、Native smoke、repository verify、sanitizer、scope auditを実行する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 5 agentがparse可能で、model/reasoning effortのSSOTがconfigにあり、役割/sandbox/禁止事項が明確である。
- 5 agent Native smoke、`bash scripts/verify`、PowerShell verify、`pnpm run verify`、`git diff --check`、sanitizerが完了または未実行理由を記録している。
- Git mutation、Product Code、独自orchestration frameworkを追加していない。

## Risks / Unknowns

- 文字列ベースverifyの旧model markerを残すと失敗するため、更新後に両verifyを実行する。
- Native custom agent discovery/model metadataがruntime surfaceで確認できない場合は、Codex capabilityの事実として記録する。

## Thinking Log

- 2026-08-12 14:15 JST: baselineは`feat/native-subagent-orchestration`でmainと同一HEAD、working tree clean。既存4 agentは個別model/effortを持ち、verify Bashにはworker model hard-codeがある。
- 2026-08-12 14:16 JST: ADR-0012のcustom orchestration禁止とADR-0006のRun Artifact sanitizationを適用する。今回の正本は新Planとし、旧Planは履歴として保持する。
