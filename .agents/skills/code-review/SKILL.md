---
name: code-review
description: Use when reviewing changes, handling /review, or doing self-review in this repository.
---

# Code Review Skill

## Purpose and boundary

Use this Skill for review requests, `/review`, and self-review before implementation is considered complete. Review findings are the normal output. This workflow does not implement fixes; when a finding or validation failure requires repair, switch explicitly to the bounded repair workflow.

## Inputs

- The requested review scope and the current change set.
- The package-local [review workflow](references/review-workflow.md).
- Repository coding policy, supplied by the Repository mapping as a logical external input.
- Repository review persistence policy, supplied by the Repository mapping as a logical external input.
- Approved external review results, when the user explicitly authorizes that review service.

## Execution outline

1. Follow the package-local review workflow's diff triage and deep-review order.
2. Prioritize correctness, security, behavioral regression, missing tests, and maintainability.
3. Report findings with the required severity, evidence, location, impact, and suggested direction. If there are no findings, state residual risk and unvalidated areas.
4. Generate a durable review report only when the user explicitly requests one or the supplied Repository review persistence policy requires it. The concrete destination, naming, and retention rules come from that external input.

## Guardrails

- Do not weaken an existing contract to make a finding disappear.
- Do not start an external full review or re-review without explicit approval.
- Review-only work returns findings and does not silently switch into implementation or repair.
