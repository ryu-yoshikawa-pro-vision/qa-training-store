# Black-box Scored Mode

## Selection

Select Black-box Scored mode only to evaluate an Agent's unknown defect-finding ability. Its Required Coverage comes only from the supplied challenge input. Do not select it automatically for an ordinary QA request, and do not use a Repository-level read-only boundary as a substitute for isolation.

## Isolation boundary

The evaluated Coding Agent receives only the learner-safe normative input, the challenge mission or runbook, the scored Skill input, and the constrained output contract supplied by the preparation workflow. Source, version-control metadata, tests, patches, answer keys, build artifacts, prior runs, generic shell, arbitrary browser evaluation, network response bodies, and native package files remain outside the learner boundary unless the trusted contract explicitly permits them.

The Runner is the Fresh Coding Agent Session being evaluated. It is not a Repository-specific Node.js runner, LLM API wrapper, CLI wrapper, or orchestration process.

## Trusted capability

An Official Scored Run requires a Fresh Session, trusted session identity, Tool Isolation, a trusted Actual Tool Scope inventory, a source-free Prepared Target, and trusted host capability evidence. These are Host or preparation receipts, not claims inferred from the Repository.

`Sec-Fetch-Dest` or similar browser UX information is defense-in-depth only and is not a security boundary. The trusted isolation and actual resource negative probe are authoritative.

## Preparation boundary

Preparation validates the machine contract and challenge, checks the protected patch and baseline or patched sanity, creates the learner-safe specification input and source-free target, freezes the canonical input and artifact identities, performs forbidden-boundary checks, and hands the prepared runtime capability to the Host. It does not start the Coding Agent Session, route its tools, retry it, or manage its lifecycle.

The protected patch is applied only to a disposable target for the scored preparation. It is not committed to the application branch or copied into the Runner-visible input. The preparation does not start the run when the precondition, patch check, postcondition, or deterministic reset sanity fails.

## Blocked and stop semantics

Record the Official Scored Run as `BLOCKED`, `DEFERRED`, or `NOT EXECUTED` when required Host capability, trusted proof, source-free target, or isolation is missing. Do not infer missing receipts, promote a deterministic fixture to an Official Run, or repair the blocker with a custom Runner or wrapper.

Stop rather than score when the target is not in the required initial state, the protected patch does not apply, the reproduction condition is absent after preparation, the output is not constrained or frozen, the benchmark identity is inconsistent, or the isolation or Tool Scope proof is invalid.

## Findings and evaluation boundary

The Runner's findings are frozen before evaluation. The separate Evaluator may read the protected answer material only after the run and records matches, atomicity, duplicates, non-defects, environment blockers, isolation or Tool Scope failures, and unexpected valid findings according to the supplied Repository contract. A ground-truth change requires a new revision and Fresh Run rather than rewriting the original result.

Metrics apply only to a valid Official Scored Run; undefined zero denominators remain null according to the supplied contract.

## Non-goals

- Treating Normal or Gray-box QA as Black-box isolation.
- Running a hidden or repository-specific agent orchestrator.
- Passing an invalid or untrusted run by filling in missing Host evidence.
- Rewriting Frozen Findings or changing benchmark identity after execution.
