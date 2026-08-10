---
name: exploratory-qa
description: Execute specification-driven Normal, Gray-box, and isolated Black-box Agentic QA for Scenario Shop.
---

# Exploratory QA Skill

## Execution ownership

Exploratory QA is executed by the Coding Agent itself.

This Skill is the primary execution entry point for Agentic QA.

`scripts/agentic-qa/**` does not launch, wrap, or orchestrate the Coding Agent.
Scripts are deterministic support tools for preparation, validation, isolation
verification, artifact integrity, evaluation, and scoring.

Use this Skill when the user asks to:

- QAしてください
- 探索的テストしてください
- 仕様に沿って動作確認してください
- 画面を実際に操作して問題を探してください
- Agentic QAしてください
- WebをQAしてください
- AndroidをQAしてください
- ユーザージャーニーを確認してください
- 異常系・境界値も確認してください

Code Review and Repair are separate workflows. During QA, do not modify
Product Code; switch explicitly to the Repair workflow only after Findings are
finalized.

## Required reading

Before running, read `docs/spec/README.md`, the referenced Normative files,
`QA_AGENT.md`, and `docs/reference/agentic-qa-workflow.md`. For Black-box
Scored work, also read the Challenge `challenge.json` and `runbook.md` only;
Answer Key and Patch are Preparation/Evaluator inputs and are never passed to
the Coding Agent.

## Mode selection

Choose the mode before exploring:

- **Normal** is the default for ordinary QA requests. Use the active
  `qa-charter.json` as the Coverage SSOT and explore the Runtime against the
  Normative Specification.
- **Gray-box** is for approved Seed Reset, Test Control, Clock Control,
  Payment Delay, Deep Link, App Restart, narrow Console/Log, DOM, or
  Accessibility support. Preserve the existing Gray-box rules.
- **Black-box Scored** is only for evaluating unknown defect-finding ability.
  It requires deterministic Preparation, a Fresh Coding Agent Session from
  the host Runtime, trusted session identity, Tool Isolation, and trusted
  Actual Tool Scope evidence. It must not be selected automatically for an
  ordinary QA request.

If the active Coding Agent Runtime cannot provide those Black-box capabilities,
the Official Scored Run is `BLOCKED`; do not implement a repository-specific
LLM wrapper or Agent Runner to bypass the blocker.

Do not treat a repository-level readonly boundary as Black-box isolation. Do
not expose source, `.git`, tests, patches, Answer Keys, build artifacts,
search, generic shell, arbitrary browser evaluation, network response bodies,
or native package files to a Scored Session.

## Normal / Gray-box bootstrap

After selecting Normal or Gray-box, confirm the current run and inspect
`.codex/runs/<run_id>/qa-charter.json` before any Runtime interaction.

- If the current run already has `qa-charter.json`, validate its schema,
  `spec_refs`, bounded Required Coverage, and current User Scope/Platform/Risk.
- If it does not exist, the Coding Agent creates it in the current run from
  the user request, Normative Specification, BR/AC, Product Risk, requested
  Platform, requested Role/Seed, and available Runtime Capability. Include at
  least `schema_version`, `charter_id`, `spec_refs`, `mission`, `risk`, `role`,
  `seed`, `platform`, `viewport_or_device`, `required_coverage`,
  `allowed_runtime_controls`, `exploration_budget`, and `stop_condition`.
- Keep Required Coverage bounded: one Coverage Item is one clearly bounded
  mission. Do not generate a free-form exhaustive checklist.
- Validate the new Charter deterministically with the existing Zod contract
  before proceeding. Do not implicitly reuse a Charter from a previous run;
  explicit reuse requires copying it into the current run and rechecking the
  current Specification, User Scope, Platform, Role, and Seed.

The Coding Agent must not record guessed runtime limits as measured facts.
Use the existing `exploration_budget` contract, including `null` only where a
limit cannot be fixed by the Runtime. The Charter's Stop Condition and Budget
bound the subsequent exploration.

## Exploration workflow

### Step 1 — Oracle confirmation

Read, in order:

1. `docs/spec/README.md`
2. `QA_AGENT.md`
3. `docs/reference/agentic-qa-workflow.md`

Confirm the target Feature's `BR-*`, `AC-*`, and Normative Feature
Specification. Expected Behavior comes from Normative Specification, not
Application Source or Existing Tests.

### Step 2 — Mission and Coverage

Use `qa-charter.json` for Normal/Gray-box and `challenge.json` for Black-box
Scored. Treat their Required Coverage as SSOT; do not add, remove, or reorder
Coverage Items.

### Step 3 — Risk analysis

Before interacting with the Runtime, prioritize risks in the target Scope:
Primary user journey, Role/Permission, State Transition, Validation, Boundary,
Error Handling, Empty State, Loading/Async behavior, Persistence, Session,
Cross-screen consistency, Accessibility, Responsive behavior, Native-specific
behavior, Recovery/Retry, and Data integrity. Choose priorities from the
Specification, Charter, or Challenge risk; do not mechanically execute a
checklist or explore without a bounded Budget and Stop Condition.

### Step 4 — BEFORE Working Tree Snapshot

For Normal and Gray-box, after Charter creation/validation and risk analysis,
capture the BEFORE Working Tree Snapshot with the existing
`working-tree-snapshot.ts` before the first Runtime interaction. A BEFORE
Snapshot taken after Findings or after Runtime exploration is invalid.

```text
Charter creation / validation
→ BEFORE Working Tree Snapshot
→ first Runtime interaction
```

### Step 5 — Runtime exploration

For Web, use Playwright-MCP or an equivalent Browser Capability provided to the
Coding Agent first. For Android, use Maestro-MCP or an equivalent Native
Runtime Capability when available. The Coding Agent observes and operates the
Runtime itself:

```text
navigate → observe → interact → observe state transition
→ compare against Specification → collect evidence → choose next exploration
```

Do not stop after one happy path. According to the prioritized risks, consider
alternate paths, invalid input, boundaries, repeated actions, back/reload,
session transitions, role differences, and recovery. Avoid unbounded
exploration and do not treat a passing Maestro Regression Suite as completion
of Agentic QA. If Native capability is unavailable, record
`blocked_environment` or an accurate not-executed result.

### Step 6 — Evidence and Findings

Collect, where available, the current URL/screen, DOM, Accessibility tree,
Screenshot, narrow Console/Log, and Runtime-visible state. Preserve the
existing Evidence semantics: a Screenshot alone is not machine-semantic
proof, and `notes` or `description` alone cannot prove an Observation.

Maintain `1 Finding = 1 distinct product deviation`. Each Finding records
Expected, Actual, Reproduction Steps, Oracle, Role/Seed, Evidence, Reproduction
Count, Severity, and Confidence according to the Machine Contract. Do not merge
multiple problems, and do not repair Product Code while exploring.

### Step 7 — Exploration loop

For each Required Coverage Item, follow this bounded loop and prefer new
information gain:

```text
Coverage Itemを選ぶ
↓ Specification確認
↓ Runtime観察
↓ 操作
↓ 結果観察
↓ Expected / Actual比較
↓ 必要なら追加探索
↓ Evidence取得
↓ Findingまたは正常観測を記録
↓ 次Coverageへ
```

Stop when Required Coverage is complete, the Exploration Budget is exhausted,
the explicit Stop Condition is satisfied, an Environment blocker prevents
valid exploration, or the user-specified scope is complete. Finding one issue
does not end the whole QA run.

## Finalization and supporting harness

After exploration, the Coding Agent produces a candidate `qa-findings.json`.
For Normal and Gray-box, capture the AFTER Working Tree Snapshot, compare it
with the BEFORE Snapshot, and confirm zero additional Source diff before
finalizing Findings. Then use the deterministic supporting scripts for Schema
validation, Coverage integrity, Evidence integrity, and Evaluation/Scoring
(Scored only). The direction is:

```text
Coding Agent + Skill → qa-findings.json → deterministic supporting scripts
```

For Normal/Gray-box, the required finalization sequence is:

```text
Charter creation / validation
→ BEFORE Working Tree Snapshot
→ Runtime QA
→ qa-findings candidate
→ AFTER Working Tree Snapshot
→ BEFORE / AFTER comparison
→ additional Source diff = 0
→ qa-findings finalization
```

Use same-format snapshots from the same Run and Mode. For Black-box,
Preparation may create a disposable patched runtime, learner-safe bundle,
isolated root, Tool Profile, and Forbidden Capability Probe; it does not create
or launch the Coding Agent Session.

All run artifacts use repo-relative references. Raw screenshots, traces, ADB
logs, and MCP logs belong under `.artifacts/`, not in durable Run Artifact
files.
