---
name: exploratory-qa
description: Execute specification-driven Normal, Gray-box, and isolated Black-box Agentic QA for Scenario Shop.
---

# Exploratory QA Skill

Use this skill when performing exploratory QA, writing a QA Charter, producing `qa-findings.json`, preparing an Agentic QA Challenge, or evaluating a Frozen Black-box run in this repository.

## Required reading

Read `docs/spec/README.md`, the referenced Normative files, `QA_AGENT.md`, and `docs/reference/agentic-qa-workflow.md` before running. For Scored Challenge work, also read the Challenge `challenge.json` and `runbook.md` only; Answer Key and Patch are Evaluator/Preparation inputs and are never passed to the Runner.

## Mode selection

- Normal: readonly product observation from a Charter.
- Gray-box: readonly observation with explicitly allowed Seed/Test Control/Narrow Log support.
- Black-box Scored: Fresh Session, isolated root, learner-safe inputs, positive allowlist, and a successful Forbidden Capability Probe.

Do not treat a repository-level readonly boundary as Black-box isolation. Do not expose source, `.git`, tests, patches, answer keys, build artifacts, search, generic shell, arbitrary browser evaluation, network response bodies, or native package files to a Scored Runner.

## Workflow

1. Derive Required Coverage from the active Charter or Challenge SSOT.
2. Validate JSON through the existing Zod schemas.
3. For Normal / Gray-box, capture the same-format before/after Working Tree Snapshot and require a passing zero-additional-source-diff comparison.
4. Resolve exact `spec_refs[]` and build the learner-safe Normative bundle.
5. For Scored Challenges, complete the fixed baseline → patch → patched sanity sequence in a disposable source copy.
6. Freeze the Runner result before starting the Separate Evaluator.
7. Match Atomic Findings, preserve Frozen evidence, and write `evaluation.json` with sorted `invalid_reasons[]`.

All run artifacts use repo-relative references. Raw screenshots, traces, ADB logs, and MCP logs belong under `.artifacts/`, not in durable Run Artifact files.
