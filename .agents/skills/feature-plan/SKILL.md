---
name: feature-plan
description: Use when a task needs planning, an explicit plan, or Plan Mode in this repository.
---

# Feature Planning Skill

## Purpose and boundary

Use this Skill for complex or multi-stage work, explicit planning requests, migration or side-effect boundaries, public contracts, and Plan Mode. Do not use it for a clear one-file typo or wording-only change. Planning must finish before implementation begins.

## Inputs

- The user request and the existing repository code, tests, configuration, and documentation.
- The package-local [planning workflow](references/planning-workflow.md), including repo mapping and ambiguity handling.
- The package-local [plan template](assets/plan-template.md) as the reusable output skeleton.
- Repository plan storage convention, filename convention, active Run connection, and lifecycle supplied as a logical external input.

## Execution outline

1. Read the package-local planning workflow before fixing the design.
2. Map entry points, main flow, abstractions, tests, safe change surface, and unknowns from the existing repository.
3. Separate confirmed facts, assumptions, non-goals, open questions, pure logic, side-effect boundaries, and consumer-facing impact.
4. Resolve blocking ambiguity explicitly; do not guess when purpose, scope, safety, migration, completion, or validation would change.
5. Save the completed plan using the Repository plan storage convention and the package-local template before implementing any change.
6. Hand implementation back only after the plan has a concrete validation plan and unambiguous completion criteria.

## Outputs

- A plan containing Goal, Current understanding, Assumptions, Non-goals, Impacted areas, Files to inspect, Change strategy, Validation plan, Risks, Open questions, and Follow-up notes.
- A Repository-persisted plan artifact whose path and naming come from the supplied Repository input.

## Guardrails

- Keep generic planning workflow and template content in this package.
- Keep Repository save paths, filename rules, active Run lifecycle, and retention rules in the Repository mapping.
- Do not start implementation while a blocking question remains unanswered.
