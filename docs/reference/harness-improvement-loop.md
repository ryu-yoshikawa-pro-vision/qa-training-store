# Harness Improvement Repository Reference

## Purpose

This document supplies Scenario Shop's concrete target catalog, strictness mapping, artifact locations, and shared evaluation contracts to the portable `harness-improvement` Skill. Candidate fields, target meaning, evidence requirements, and review semantics are canonical in the package-local workflow.

## Repository inputs

- Evaluation artifact and finding schema from the Repository evaluation contract.
- Failure categories from `spec/failure-taxonomy.json`.
- Run manifest and Run `REPORT.md` checkpoints.
- Hook JSONL logs under `.codex/logs/` or the applicable `.artifacts/codex-hooks/` location.
- Subagent records and review comments supplied by the active workflow.

## Harness target catalog

Use these concrete Repository targets when filling the candidate `target` field:

- Instruction layer: `AGENTS.md`, `PLANS.md`, `CODE_REVIEW.md`, and `.agents/skills/`.
- Safety layer: `.codex/rules/` and `.codex/hooks/`.
- Execution layer: `scripts/codex-safe.*` and `scripts/codex-task.*`.
- Contract layer: `spec/`, `docs/reference/`, and `examples/`.
- Other: a Repository target that does not fit the listed layers, with its path recorded explicitly.

Do not create a new catalog schema, registry, or JSON configuration for this mapping.

## Strictness mapping

- `normal`: documentation, examples, or non-safety Skill behavior.
- `strict`: changes to the safety layer, runner, schema, rules, hooks, `codex-safe`, `codex-task`, or `spec/` contracts.
- `blocked`: destructive operation, credential handling, external permission, or policy bypass.

Safety-layer changes require strict workflow review. A `blocked` candidate is not applied in the current task without explicit permission and a separate scope.

## Evidence integration

- Evidence may come from `evaluation.json` findings or improvement candidates, run-manifest validation commands, Hook JSONL, a Run checkpoint, a review comment, or repeated failure across runs.
- `failure_category` uses the categories in `spec/failure-taxonomy.json`; no new category is added by candidate creation.
- Hook JSONL records machine facts such as blocked actions or validation behavior.
- Run `REPORT.md` records agent meaning such as Delegation, Result, and Parent decision.

## Relationship to repair loop

- Repair-loop stop reasons and repeated failures can become harness-improvement evidence.
- Structural issues that cannot be resolved by the current repair loop are separated as `strict` or `blocked` follow-up candidates.
- Native repeated stages, missing preflight, overwritten attempt logs, and running downstream stages after an upstream failure remain evidence for a candidate; they do not authorize an automatic runner, safety, or schema change.

## Separation and approval

Implementation fixes and harness improvements remain separate unless the user explicitly scopes both. Candidates start as `proposed`, require owner review, and are never auto-applied. Rejected and deferred candidates retain their evidence and decision reason.

## Non-goals

- Automatic application.
- Immediate safety-layer changes.
- Product implementation mixed into a harness proposal.
- Failure-category inference or new taxonomy creation.
