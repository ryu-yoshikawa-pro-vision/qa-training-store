---
name: harness-improvement
description: Use when converting run results, evaluation findings, repair-loop outcomes, or repeated failures into harness improvement candidates.
---

# Harness Improvement Skill

## Purpose and boundary

Use this Skill to turn evidence from runs, evaluations, repair loops, reviews, or repeated failures into reviewable harness-improvement candidates. A candidate is a proposal, not an automatic change, and must remain separate from unrelated product implementation.

## Inputs

- Evaluation results, run manifests, validation results, hook observations, Subagent records, review comments, and repeated failures.
- The package-local [improvement workflow](references/improvement-workflow.md), which defines the candidate model, evidence, classification, and review boundary.
- Repository-supplied target catalog, strictness mapping, failure taxonomy, and artifact/evaluation contract.

## Execution outline

1. Collect concrete evidence and identify the failure or recurrence it supports.
2. Create a candidate with `target`, `failure_category`, `evidence`, `expected_impact`, `risk`, `recommended_change`, and `strictness`.
3. Keep product implementation fixes and harness improvement proposals separate.
4. Use the Repository target catalog and strictness mapping for concrete paths and Repository-layer applicability.
5. Mark the candidate as reviewable and do not auto-apply it.

## Candidate and output boundary

The candidate model and the meaning of the `target` field are defined by the package-local workflow. Repository paths, path-based strictness, taxonomy categories, and artifact locations are supplied by the Repository mapping. Output includes the candidate summary, evidence, impact, risk, recommendation, strictness, owner decision, and follow-up scope.

## Guardrails

- Reject evidence-free proposals and do not invent failure categories.
- Keep `normal`, `strict`, and `blocked` decisions explicit.
- Treat safety, runner, schema, policy, destructive, credential, permission, and bypass implications according to the supplied Repository mapping.
- Do not auto-apply candidates or bundle them into unrelated implementation work.
