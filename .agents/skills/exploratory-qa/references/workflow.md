# Exploratory QA Workflow

## Scope and separation

Exploratory QA compares Runtime behavior with the Normative Specification through bounded, risk-based exploration. The Coding Agent performs the observations and interactions. Deterministic supporting tools may validate or preserve results, but they do not launch, wrap, retry, or manage the Agent Session.

Do not modify Product Code during QA. If a product change is required, finalize the Finding first and switch explicitly to the Repair workflow.

## Mode selection

- **Normal** is the default for ordinary QA requests. Use a current Charter as the Coverage source and explore the Runtime against the Normative Specification.
- **Gray-box** adds only approved controls such as seed reset, test control, clock or payment delay, deep link, restart, narrow console or log, DOM, or accessibility support. Keep the existing Gray-box boundary.
- **Black-box Scored** is selected only when unknown defect-finding ability is explicitly being evaluated. Its isolation and trusted-capability requirements are defined in [scored mode](scored-mode.md); it is not an automatic fallback for ordinary QA.

Choose the mode before Runtime interaction. If the requested mode cannot satisfy its boundary, stop or record the run as blocked according to the applicable contract.

## Charter, Coverage, Budget, and Stop

For Normal and Gray-box, the Charter fixes the mission, Normative references, risk, role or seed, platform or device, allowed Runtime controls, Required Coverage, exploration Budget, and Stop Condition. Create or revalidate it for the current work before interacting with the Runtime; do not silently reuse a prior Charter.

Required Coverage is the bounded set of missions that the current QA must answer. One Coverage Item is one clearly bounded mission. Treat the current Charter or scored challenge as the Coverage source of truth: do not add, remove, or reorder items while exploring.

The Budget bounds exploration effort and the Stop Condition bounds completion. A fixed Runtime limit must be recorded as measured; use the supplied contract's null or unbounded representation only when the Runtime cannot fix the limit. A single happy path or a single Finding does not by itself complete the work.

## Oracle and risk analysis

Read the Normative Specification and confirm the target Feature's Business Rules, Acceptance Criteria, and normative feature contract before interacting. Expected Behavior comes from the Normative Specification, not Application Source or Existing Tests.

Prioritize risks relevant to the requested scope: primary journey, role or permission, state transition, validation, boundary, error handling, empty or loading state, persistence, session, cross-screen consistency, accessibility, responsive behavior, native behavior, recovery or retry, and data integrity. Choose priorities from the Specification, Charter, or challenge risk rather than executing an exhaustive checklist.

## Normal and Gray-box bootstrap

1. Confirm or create the current Charter and validate its references, bounded coverage, Budget, and Stop Condition.
2. Complete risk analysis.
3. Capture the BEFORE Working Tree Snapshot before the first Runtime interaction.
4. Interact with the Runtime and collect observations.

The required order is:

```text
Charter creation / validation
→ BEFORE Working Tree Snapshot
→ first Runtime interaction
```

An implicit prior-run Charter or a BEFORE Snapshot captured after exploration is invalid.

## Runtime exploration

Use the Browser or Native Runtime capability provided by the Coding Agent. Observe and operate the Runtime itself:

```text
navigate → observe → interact → observe state transition
→ compare against Specification → collect Evidence → choose next exploration
```

After the primary journey, use prioritized risks to consider alternate paths, invalid input, boundaries, repeated actions, back or reload, session transitions, role differences, and recovery. Do not explore without a bounded Budget and Stop Condition.

For Native QA, an unavailable capability is recorded as blocked or not executed with evidence. A passing regression suite is not, by itself, completion of Agentic QA.

## Evidence and Findings

Collect the Runtime-visible Evidence available for the current capability, such as URL or screen, DOM, accessibility tree, screenshot, narrow console or log, and visible state. A screenshot alone is not machine-semantic proof when the contract requires a semantic observation; free-form notes or descriptions alone do not prove an Observation.

Maintain `1 Finding = 1 distinct product deviation`. Each Finding explains:

- Expected behavior and Actual behavior.
- Reproduction steps, Oracle, Role or Seed, and reproduction count.
- Evidence that supports the deviation.
- Severity and Confidence.

Do not merge multiple deviations into one Finding, and do not repair Product Code while Findings are being explored.

For each Coverage Item, use this bounded loop:

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

## Finalization

When exploration is complete, produce the Repository-defined candidate findings artifact. For Normal and Gray-box, capture the AFTER Working Tree Snapshot, compare it with the BEFORE Snapshot from the same Run and Mode, and confirm zero additional Source diff before finalizing Findings. Use the deterministic supporting tools for the Repository's schema, Coverage, Evidence, and scoring checks.

The required Normal and Gray-box finalization order is:

```text
Charter creation / validation
→ BEFORE Working Tree Snapshot
→ Runtime QA
→ candidate Findings
→ AFTER Working Tree Snapshot
→ BEFORE / AFTER comparison
→ additional Source diff = 0
→ Findings finalization
```

## Stop conditions

Stop when Required Coverage is complete, the Budget is exhausted, the explicit Stop Condition is satisfied, an Environment blocker prevents valid exploration, the user scope is complete, or the mode's isolation or trusted-capability requirement fails. Record the reason and unfinished Coverage rather than treating an invalid run as a successful completion.

## Non-goals

- Unbounded exploratory testing.
- Checklist completion without risk or information gain.
- Product repair during QA.
- A custom Agent Runner, LLM wrapper, or session manager to bypass a missing Runtime capability.
