# Repair Loop Repository Reference

## Purpose

This document defines the Scenario Shop Repository-side contracts that are supplied to the portable `repair-loop` Skill. The package-local Skill and workflow define the generic bounded loop, finding triage, iteration record, validation, and stop semantics.

## Repository inputs

- Repository coding and review policy from `CODE_REVIEW.md`.
- Scope policy from `docs/reference/change-scope-policy.md`.
- Evaluation artifact and finding schema from the Repository evaluation contract.
- Failure categories from `spec/failure-taxonomy.json`.
- Run manifest, run report, hook-observation, and Subagent record locations from the active Run contract.
- Run Artifact lifecycle and path sanitization from [`docs/reference/run-artifacts.md`](run-artifacts.md). Repair workflowはこのRepository-wide契約を利用し、ここでは重複定義しません。

`AGENTS.md` maps these Repository inputs to the package. The package must not assume these paths, schemas, or commands when used in another Repository.

## Shared quality-gate policy

A quality-gate failure is investigated against the baseline, current diff, shared dependency, test or CI contract, and execution environment before it is deferred. Whether the cause is in the current change, required to verify the current change, or an independent existing issue, a safe minimal repair within current authority is handled in the current loop; baseline, existing, or unrelated status alone is not a reason to defer it. If no safe repair is available because the action is unsafe, destructive, permission- or credential-dependent, an irreversible external side effect, requirement-dependent, or the Repository retry stop condition has been reached, record the causal assessment, unexecuted checks, and next action and stop according to the bounded workflow.

## Evaluation and failure taxonomy integration

- The Repository evaluation artifact is the source of truth for loop outcome, findings, residuals, and improvement candidates.
- The Repository failure taxonomy is the source of truth for `failure_category`; Native execution labels are auxiliary evidence and must be mapped rather than added as new evaluation categories.
- `partial` or `fail` results remain visible when the loop stops without satisfying its completion condition.

## Scope and artifact integration

- `allowed_files` and `expected_changed_files` are checked against the Repository change-scope policy.
- Run reports and Run Artifact sanitizationは[`docs/reference/run-artifacts.md`](run-artifacts.md)のappend-only／completion gate契約に従います。
- Hook JSONL, run manifests, evaluation files, and Subagent records are evidence sources; the evaluation artifact and recorded decision remain the final judgment.

## Subagent evidence boundary

Existing Subagent-generated records and observations may be consumed as evidence for scope compliance and parent decisions. This Repository reference does not define or duplicate Subagent roles, tools, permissions, sandbox settings, or delegation rules.

## External review policy

External full review or re-review is started only after explicit user instruction or approval. After the result is reported, repair, thread operations, and another review require the user's decision.

## Durable reporting

Run progress belongs in the active Run report. A durable report file is created only when the user or completion criteria explicitly require a later audit reference. Review-only and light confirmation do not by themselves create a durable report.
