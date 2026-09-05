# Repair Workflow

## When to use

- Apply a review finding.
- Repair a validation failure through a bounded loop.
- Decide whether an evaluation result of `partial` or `fail` is actionable.

## Do not use

- Requirement discovery or plan creation is the primary task.
- The user requested review-only output.
- The root cause is environmental and no repair is required.
- An unsafe action or destructive operation would be needed.

## Inputs

- Review findings.
- Evaluation result and findings.
- Validation failure.
- Scope report and the declared `allowed_files` / `expected_changed_files`.
- Observation artifacts and Subagent records.
- Repository-supplied artifact, scope, taxonomy, evaluation, and sanitization contracts.

## Entry conditions

Start a repair loop only when both an actionable repair signal and an explicit bounded scope are present.

### A. Actionable repair signal

At least one of the following must be true:

- there is an actionable review finding;
- there is a validation failure;
- the evaluation result is `partial` or `fail`;
- an evaluation finding is actionable.

### B. Explicit bounded scope

All of the following must be true:

- the requirement is sufficiently clear;
- the scope is clear;
- `allowed_files` can be declared;
- there is no unsafe, destructive, permission, credential, or policy ambiguity.

Scope clarity or an allowed file set by itself is not a repair trigger.

Do not start when the requirement or scope is unclear, an unsafe or destructive action is needed, a credential or permission decision is required, the user requested review-only output, or the root cause is environmental with no repair required.

## Iteration model

Record these fields for every iteration:

- `iteration_number`
- `input_findings`
- `repair_plan`
- `allowed_files`
- `changed_files`
- `validation_commands`
- `validation_result`
- `remaining_delta`
- `decision`

The decision is one of:

```text
continue
stop_success
stop_no_progress
stop_scope_violation
stop_unsafe
stop_max_iterations
stop_needs_human
```

## Finding triage

Use exactly these classifications:

```text
must_fix
should_fix
defer
reject
needs_human
```

- `must_fix`: correctness, safety, contract, CI, or data integrity.
- `should_fix`: maintainability, clarity, or test confidence.
- `defer`: outside the current scope and suitable for later work.
- `reject`: false positive, already addressed, or unsupported by evidence.
- `needs_human`: requirement judgment, destructive-change judgment, permission judgment, credential judgment, policy-boundary judgment, or a user/reviewer decision.

Prioritize `must_fix`. Handle `should_fix` only when it does not block the required repair. Record the reason for every `defer`, `reject`, or `needs_human` classification.

When a finding is classified as `needs_human`, set `decision = stop_needs_human` immediately. `needs_human` is an escalation condition, not a loop continuation condition. Until the human decision is returned, do not continue repair, expand scope, perform an unsafe or destructive operation, or guess a policy judgment.

## Repair planning and scope

- Explain why each repair addresses the root cause.
- Declare the allowed files and expected scope before editing.
- Confirm that changed files remain inside the declared scope after each iteration.
- If scope is ambiguous or a scope violation appears, stop and escalate rather than expanding the loop.

## Validation per iteration

Run the minimum validation set that is sufficient for the changed contract, without omitting required checks. Record commands, results, remaining delta, and the next decision. Do not call a repair successful based only on an assumed result.

`--max-iterations` is a reserved or validated runner option that documents the bound. The workflow does not automatically rerun the agent; stop at the configured maximum and record `stop_max_iterations`.

## Stop conditions

Stop the loop when any of the following occurs:

- the configured maximum iteration count is reached;
- the same failure category repeats;
- the same stage fails three times, or the first error remains unchanged after different responses;
- no new log, environment fact, or hypothesis is added;
- the allowed scope is exceeded;
- unsafe or destructive action is required;
- validation is not reproducible because of the environment;
- the root cause is unknown while repairs continue;
- the repair introduces a new failure; or
- requirement ambiguity requires a human decision.

Repeated failure is evidence, not a reason to retry blindly. A stop condition is recorded as `stop_*` and the loop is not continued.

## Evaluation and failure taxonomy

- Summarize each iteration so it can be connected to the supplied evaluation artifact, findings, and improvement candidates.
- A successful repair may still leave a documented residual; represent that state as `partial` when the Repository evaluation contract requires it.
- Use the Repository-supplied failure taxonomy rather than inventing categories.
- The Native execution labels `ENVIRONMENT_FAILURE`, `DEPENDENCY_FAILURE`, `CONFIGURATION_FAILURE`, `SOURCE_FAILURE`, `BUILD_CACHE_FAILURE`, `DEVICE_FAILURE`, `TEST_FAILURE`, `TRANSIENT_FAILURE`, and `UNKNOWN` are auxiliary execution classifications; map them to the supplied evaluation taxonomy when needed.

## Evidence and report

- Use observation and Subagent evidence to explain what happened, not as the final source of truth.
- Preserve the existing meaning of Subagent-generated records and observations without importing their contracts into this Skill.
- Record the loop in the Repository-supplied run report and evaluation artifacts according to their append-only and sanitization rules.
- A durable report is created only when the user, the completion criteria, or an audit requirement calls for it.

## External review boundary

An external full review or re-review requires explicit user instruction or approval. After reporting its result, stop and wait for the user's decision before repairing findings or manipulating review threads.

## Non-goals

- Unlimited self-healing.
- A runner-level automatic repair loop.
- Exceptions that bypass safety or scope controls.
- Automatic integration of a repair summary into a run manifest.
