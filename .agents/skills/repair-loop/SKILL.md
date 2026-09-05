---
name: repair-loop
description: Use when applying review findings, fixing validation failures, or running a bounded Review -> Repair -> Validate loop.
---

# Repair Loop Skill

## Purpose and boundary

Use this Skill to triage actionable review findings or validation failures and run a bounded Review -> Repair -> Validate loop. It is not an instruction to keep retrying indefinitely, and it does not authorize unsafe, destructive, or scope-violating action.

## Inputs

- Review findings, evaluation results, validation failures, scope reports, and observation evidence.
- The package-local [repair workflow](references/repair-workflow.md), which defines triage, iteration, validation, and stop semantics.
- Repository-supplied inputs for artifact persistence, evaluation integration, failure taxonomy, scope policy, and sanitization.
- Subagent-generated records and observations when they are available as evidence; this Skill does not import a Subagent role, tool, permission, sandbox, or delegation contract.

## Execution outline

1. Read the Repository mapping and the package-local repair workflow.
2. Confirm that an entry condition and an explicit allowed scope exist.
3. Classify findings as `must_fix`, `should_fix`, `defer`, `reject`, or `needs_human`.
4. Define one bounded iteration with its allowed files, repair plan, and minimum validation.
5. Apply the repair, record the changed files and validation result, and compare the remaining delta.
6. Stop on success or any defined stop condition; do not start an automatic runner-level loop.
7. Connect the result to the Repository-supplied evaluation and run-artifact contract.

## Outputs

- Per-iteration input findings, repair plan, allowed scope, changed files, validation, remaining delta, and decision.
- A final stop reason and follow-up state that can be represented by the supplied evaluation and report artifacts.

## Guardrails

- Preserve bounded iteration, repeated-failure, unsafe-action, scope, and human-escalation semantics from the package-local workflow.
- Keep Repository paths, artifact locations, taxonomy files, and sanitization commands in the Repository mapping.
- Do not change Subagent contracts or remove existing use of Subagent-generated evidence.
- Do not begin an external full review or re-review without explicit user instruction or approval.
