# Agentic QA Scenario Shop Integration

## Purpose and ownership

This document supplies the Scenario Shop-specific artifact layout, concrete schema binding, validator and preparation mapping, and scoring integration for the portable [`exploratory-qa` Skill](../../.agents/skills/exploratory-qa/SKILL.md).

- Portable Mode selection, Charter, Coverage, Budget, Stop, Evidence, Finding, and finalization semantics live in the package-local references.
- `QA_AGENT.md` owns the Repository execution ownership and Machine Contract boundary.
- `scripts/agentic-qa/**` owns deterministic preparation, validation, isolation verification, artifact integrity, evaluation, and scoring. It does not launch, wrap, orchestrate, retry, or manage the Coding Agent.
- Normative Product Specification is `docs/spec/`.

## Repository artifact layout

```text
docs/spec/                         Normative and supporting documentation
training/agentic-qa/challenges/   Learner-safe Challenge + Runbook
training/agentic-qa/instructor/   Answer Key + Patch (Instructor-only)
training/agentic-qa/skills/        Hash-verified scored Skill snapshot
training/agentic-qa/tool-profiles/ Scored Tool Profile
.codex/runs/<run_id>/              Durable Charter, Findings, Evaluation
.artifacts/                        Raw evidence and disposable runtime data
```

Normal / Gray-box uses `.codex/runs/<run_id>/qa-charter.json`, candidate and final `qa-findings.json`, and same-Run working-tree snapshots. Black-box input uses the Challenge directory, learner-safe Bundle, Runbook, hash-verified `training/agentic-qa/skills/scored-v1.md` snapshot, Canonical Runner Input, and Source-free Prepared Target under the isolated artifact chain.

Raw screenshot, trace, ADB log, and MCP log files belong under `.artifacts/`. Durable Run Artifacts contain repo-relative summaries only.

## Machine Contract and validation mapping

- JSON + Zod schemas: `scripts/agentic-qa/contracts.ts`.
- Cross-file and Run Artifact validation: `scripts/agentic-qa/validate-contracts.ts`.
- Normative reference grammar and owner resolution: `scripts/agentic-qa/spec-refs.ts`.
- Coverage integrity: `scripts/agentic-qa/coverage.ts`.
- Learner-safe Bundle: `scripts/agentic-qa/build-learner-bundle.ts`.
- Canonical JSON and artifact identity: `canonical-json.ts` and `canonical-artifact-manifest.ts`.
- Working Tree Snapshot and source-diff comparison: `working-tree-snapshot.ts`.
- Runtime and resource boundary: `resource-boundary-probe.ts` and `isolation.ts`.
- Host evidence gate: `host-capability-gate.ts`.

Each JSON has `schema_version: 1`. Normal / Gray-box `spec_refs[]` accepts `BR-<AREA>-NNN`, `AC-<AREA>-NNN`, or `docs/spec/<normative-file>.md#<slug-heading>`. Invalid references or failed cross-file validation are pre-execution failures.

## Normal / Gray-box concrete binding

For the current Run, create or validate `.codex/runs/<run_id>/qa-charter.json` with the existing Zod contract. It binds `spec_refs[]`, mission, risk, role, seed, platform, viewport or device, required coverage, allowed controls, `exploration_budget`, and Stop Condition.

Before the first Runtime interaction, capture the BEFORE Snapshot:

```text
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase before
```

After Runtime QA, create the candidate `qa-findings.json`, capture the AFTER Snapshot, and compare the same Run / Mode:

```text
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase after
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --before .codex/runs/<run_id>/working-tree-snapshot-normal-before.json --after .codex/runs/<run_id>/working-tree-snapshot-normal-after.json
```

Findings are finalized only when comparison `passed` is true and `additional_source_diff_count` is zero. Normal / Gray-box output sets `charter_id` and `working_tree_snapshot`; Challenge, Benchmark Revision, Runtime Variant, and Runner Profile are null.

## Black-box preparation mapping

`prepare-challenge.ts` validates the machine contract, Challenge, protected Patch, learner-safe specification Bundle, disposable source, baseline and patched sanity, deterministic reset, Source-free Prepared Target, Canonical Artifact Manifest, Runner Input, isolated root, Tool Profile, Forbidden Probe, and Host handoff. It does not start the Agent Session.

The protected Patch is Instructor-only, applied to a disposable copy with `git apply --check` followed by `git apply`, and never committed to the application branch or copied into the Runner-visible input.

The preparation sequence is fixed by the contract tests:

```text
machine_contract_challenge_spec_validation
→ protected_patch_validation
→ learner_safe_specification_bundle_benchmark_identity
→ disposable_source_dependency_preparation
→ baseline_build_pre_patch_sanity
→ patch_apply
→ patched_build_post_patch_sanity
→ scored_initial_state_deterministic_reset_sanity
→ source_free_prepared_target_copy_hash_validation
→ learner_safe_runner_input_skill_runbook_output_contract_freeze
→ isolated_runner_root_from_frozen_input
→ repository_forbidden_boundary_preflight
→ disposable_source_cleanup
→ host_trusted_runtime_capability_handoff
```

Missing Host Capability Receipt, unproven required evidence, missing trusted URL, failed precondition, failed Patch check, or absent post-patch reproduction blocks the Official Scored Run. It is recorded as `BLOCKED / DEFERRED / NOT EXECUTED`; Repository-side deterministic preparation is not promoted to an Official Run.

## Runner, evaluator, and identity mapping

- Runner lifecycle and constrained output: `runner-input.ts`, `prepared-runtime-lifecycle.ts`, `runner-output-import.ts`.
- Official verification and trust boundary: `official-verification.ts`, `host-capability-gate.ts`, and `resource-boundary-probe.ts`.
- Separate evaluation and scoring: `evaluate.ts`.
- Benchmark revision and identity: `benchmark-revision.ts` and `canonical-artifact-manifest.ts`.

The Runner and Evaluator are separate Sessions. The Evaluator freezes Runner Findings, reads the Answer Key only on the evaluator side, and writes `evaluation.json`. `blocked_environment`, Isolation / Tool Scope failure, and Benchmark Identity mismatch set `valid_for_scoring=false`. Ground Truth changes require a new Benchmark Revision and Fresh Re-run.

`invalid_non_atomic`、Duplicate、`TN` / `FP_non_defect` / `NE`、Unexpected Valid Finding are distinct evaluation classifications. `invalid_reasons[]` is enum-only, unique, and dictionary ordered. `FP_non_defect` is counted once for Precision, and Environment / Harness blockers keep `valid_for_scoring=false`.

Clean committed input uses `git:<40 lowercase hex>`. Uncommitted or mixed input uses `sha256:<64 lowercase hex>` over the Canonical Benchmark Manifest Input, excluding Runtime Variant and Runner Profile. Benchmark Identity is `challenge_id + benchmark_revision + runtime_variant_id`; same-condition comparison also requires Prepared Target hash, Runner Input hash, and Runner Profile.

Metrics apply only to valid Scored Runs:

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

Zero denominators are `null`. Frozen Findings are not rewritten for adjudication or Ground Truth changes.

Static server `Sec-Fetch-Dest` is defense-in-depth browser UX information and is not a Security Boundary; Host-trusted Tool Isolation and the actual Runtime Resource Negative Probe are authoritative.

## CI and repository references

The `style-quality` CI job runs `pnpm run validate:spec` and the repository contract tests. The final `pnpm run verify` includes the full unit, integration, repository, component, contract, build, and security gates. Specification impact summaries use `scripts/spec/summarize-impact.ts` and are emitted to the existing CI step summary.

The supporting reference [`run-artifacts.md`](run-artifacts.md) defines the broader Run artifact layout. The package-local workflow remains the only portable semantic source for exploratory QA behavior.
