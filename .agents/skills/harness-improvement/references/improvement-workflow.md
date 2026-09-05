# Harness Improvement Workflow

## When to use

- Convert run results or evaluation findings into a harness-improvement candidate.
- Convert a repair-loop repeated failure into a follow-up improvement.
- Convert a review comment or recurring failure into a safe, reviewable proposal.

## Do not use

- The task is to fix product implementation itself.
- A one-off bug has no harness-level prevention candidate.
- There is no evidence for the proposed improvement.

## Inputs

- Evaluation results and findings.
- Run manifests and validation results.
- Hook observations and Subagent records.
- Review comments and repeated failures across runs.
- Repository-supplied target catalog, strictness mapping, failure taxonomy, and artifact contract.

## Candidate model

A candidate has these fields:

```text
candidate_id
target
failure_category
source_runs
evidence
expected_impact
risk
recommended_change
strictness
status
owner_decision
```

### target

`target` identifies the harness component or layer that should be improved. Use the concrete Repository target catalog for the actual path or layer; do not invent a new catalog or registry in the Skill.

### strictness

```text
normal
strict
blocked
```

- `normal`: documentation, examples, or non-safety behavior.
- `strict`: a change that requires review of safety, execution, schema, policy, or contract behavior.
- `blocked`: destructive operation, credential handling, external permission, or policy bypass would be needed.

The Repository mapping decides which concrete target paths or layers receive each classification.

### status

```text
proposed
accepted
rejected
deferred
implemented
```

### owner_decision

```text
not_reviewed
approved
rejected
needs_more_evidence
```

## Evidence requirements

Each candidate must include concrete evidence. At least one of the following is required:

- an evaluation finding;
- an existing improvement candidate;
- a validation command recorded by the active Run;
- a hook observation;
- a Subagent record;
- a review comment; or
- a repeated failure across runs.

Evidence-free candidates are prohibited.

## Classification and prioritization

- Use the supplied Repository failure taxonomy and do not add categories.
- Separate failure type, improvement target, and strictness.
- Prioritize correctness, safety, contract ambiguity, and repeated failure.
- Explain review cost and risk for `strict` and `blocked` candidates.

## Safety and separation

- A `strict` candidate requires the Repository strict workflow review.
- A `blocked` candidate is not handled in the current task without explicit permission and a separate scope.
- Implementation fixes and harness improvements remain separate unless the user explicitly scopes both.
- A candidate is never auto-applied; send it to a plan, document, issue, or follow-up change for review.

## Output format

Include candidate summary, evidence, expected impact, risk, recommended change, strictness, owner decision, and follow-up scope. Rejected and deferred candidates retain their evidence and reason.

## Non-goals

- Automatic application.
- Immediate safety-layer changes.
- Product implementation mixed into a harness proposal.
- Failure-category inference or new taxonomy creation.
