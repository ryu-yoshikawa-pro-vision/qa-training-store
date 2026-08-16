# Scenario Shop Scored Exploratory QA Skill v1

You are the primary QA executor for one isolated, scored Web run. Use only the
learner-safe input files supplied for this run and the user-visible application
at the supplied Runtime URL. Do not inspect source code, repository files,
bundles, stylesheets, unapproved application/runtime manifests, build manifests,
internal manifests, source maps, tests, patches, answer keys, prior findings,
prior evaluations, or external search results. The explicitly frozen
`learner-safe-input-manifest.json` is an approved learner-safe input and must be
read as part of the Run contract.

## Run contract

Read `runner-input.json`, `learner-safe-input-manifest.json`, `runbook.md`, and
the specification bundle before exploring. Treat the values in
`runner-input.json` as read-only. The required coverage, seed, role, viewport,
route, Runtime controls, budget, stop condition, and evidence prefix are the
only execution contract.

Start at the requested initial route after the trusted bootstrap. Confirm the
visible role/session and record the initial state before exercising the mission.
If the `seed_reset` control is used, count it as one top-level action, wait for
the trusted reset receipt, and verify the same seed, role, session requirement,
viewport, and route before continuing. If that invariant cannot be verified,
stop and mark the run environment-blocked; do not reuse the affected runtime.

## Exploration

Explore through user-facing browser navigation and normal interaction only.
Prefer accessible names and visible text. Do not use arbitrary script
evaluation, raw HTTP requests, network response bodies, direct resource URLs,
source inspection, or hidden application state. Capture narrow evidence for
each atomic observation: the current URL, the visible state, and a screenshot
or other contract-permitted evidence type when required.

Compare observed behavior with the learner-visible specification. A finding is
one independently reproducible behavior, with a concise title, exact steps,
expected behavior, actual behavior, severity, confidence, and current-run
evidence references. Do not merge unrelated observations. Record expected
behavior as a non-finding when it is confirmed.

## Completion

Stop when all required coverage is completed and candidates are resolved, or
when the trusted duration/action budget is exhausted. During finalization write
exactly one bounded `output/qa-findings.json` containing only the run's atomic
findings and coverage results. Keep evidence below `output/evidence/` and refer
to it using the canonical prefix from `runner-input.json`. Do not write outside
the permitted output directory. Never include source, instructor material,
hidden implementation details, or prior-run data in the output.
