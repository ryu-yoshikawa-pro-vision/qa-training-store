---
name: exploratory-qa
description: Execute specification-driven Normal, Gray-box, and isolated Black-box Agentic QA for Scenario Shop.
---

# Exploratory QA Skill

## Purpose and boundary

This Skill is the primary entry point for specification-driven exploratory QA. It covers Normal, Gray-box, and isolated Black-box Scored selection and execution boundaries. It does not authorize Product Code changes during QA; switch explicitly to the Repair workflow only after Findings are finalized.

Use it for requests to perform exploratory, specification-based, runtime, web, Android, user-journey, abnormal-case, boundary, or Agentic QA.

Typical trigger requests include QA, exploratory testing, specification-based runtime confirmation, screen interaction, Agentic QA, Web QA, Android QA, user-journey checks, and abnormal or boundary-case investigation.

## Execution ownership

The Coding Agent executes the QA workflow with runtime capabilities supplied by its environment. Supporting harness tools may prepare, validate, isolate, preserve artifacts, evaluate, or score, but do not launch, wrap, retry, or manage the Coding Agent Session. Repository-specific ownership and machine contracts are supplied as external inputs.

## Inputs

- The user scope, Normative Specification, and Repository QA contract.
- The package-local [Normal and Gray-box workflow](references/workflow.md).
- The package-local [Black-box Scored workflow](references/scored-mode.md) when scored evaluation is explicitly requested.
- A Charter or challenge input supplied by the active workflow, plus available Browser or Native Runtime capability.
- Repository-supplied schema, artifact, validator, preparation, evaluation, and scoring mapping. The package does not assume their paths or field names.

## Execution outline

1. Read the portable workflow and the Repository QA input mapping before interacting with the Runtime.
2. Select Normal, Gray-box, or explicitly requested Black-box Scored mode before exploration, then apply the package-local boundary for the selected mode.
3. Confirm the Charter or scored coverage, risk priorities, bounded Budget, and Stop Condition.
4. Explore the Runtime against the Normative Specification, collecting semantic Evidence and atomic Findings.
5. Finalize only after the required coverage, snapshots or isolation evidence, source-diff condition, and Repository output contract are satisfied.

## Guardrails

- Keep Required Coverage bounded and do not mechanically expand or reorder its missions.
- Treat a screenshot or free-form note alone as insufficient semantic proof when the workflow requires stronger Evidence.
- Keep `1 Finding = 1 distinct product deviation`; do not merge unrelated deviations.
- Do not treat a Repository read-only boundary as Black-box isolation or create a custom Runner/LLM wrapper to bypass a blocked scored run.
- If the required trusted capability is unavailable, record the scored run as blocked or not executed according to the supplied Repository contract.
