# Agentic QA Skill-first + Harness-backed Architecture

- Date: 2026-08-10 21:09:51 JST
- Context: PR #16のArchitecture responsibility correction

## Decision

Agentic QAのPrimary QA ExecutorをCoding Agent + Exploratory QA Skillへ固定した。
Normal／Gray-boxはSkill-firstの日常QA、Black-box Scoredは評価用途とする。

## Harness boundary

`scripts/agentic-qa/**`はDeterministic Preparation、Validation、Isolation
Verification、Artifact Integrity、Evaluation、Scoringだけを担当する。Coding Agentの
起動、wrap、orchestration、retry、session lifecycle managementは実装しない。

Black-boxのFresh Coding Agent Session、trusted identity、Tool Isolation、Actual Tool
Scope inventoryがCurrent Coding Agent Runtime／Hostから取得できない場合、Official
Scored E2EはBLOCKEDとする。Repository独自RunnerやLLM wrapperでBlockerを回避しない。

## Implementation note

Preparation callbackとruntime handoffを削除し、deterministic preparationと独立した
isolation／Forbidden Probeへ分離した。Contract Fixtureは`run-contract-fixture.ts`へ
renameし、Official model-backed Runへ昇格しない契約を維持した。
