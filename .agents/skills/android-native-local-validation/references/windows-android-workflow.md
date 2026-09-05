# Windows Android Validation Workflow

## Scope and inputs

This workflow covers local Release APK validation on a Windows host, using PowerShell and a USB-connected physical Android device. Tool versions, device identity, application identity, command sequence, paths, and troubleshooting actions come from the Repository runbook and helper supplied as external inputs.

## Preflight and stage gates

Before a new Build, Install, Test, or Maestro execution:

1. Read the latest Run report, relevant prior attempt evidence, current diff/status, shell and version conditions, and the previous success or failure condition.
2. Run Doctor and confirm the fixed toolchain contract, Android SDK, ADB device state, host/device capacity, APK identity, and CI/local differences.
3. Record the observation, cause hypotheses, strongest hypothesis, evidence, condition to change, success condition, and next information before a retry.
4. Do not start Build or a downstream stage when preflight is incomplete, an upstream stage failed, or the required APK or device state is unavailable.

The normal gate order is:

```text
Doctor / preflight
→ Prepare
→ Release Build
→ APK inspection
→ Install
→ Smoke
→ single control Flow
→ Runtime Suite
→ Boundary Suite
→ evidence / completion
```

The Repository may define additional concrete Flow gates. A later gate runs only after its upstream gate passes.

## Evidence and attempt identity

Use a unique attempt identity for every execution and keep complete raw Gradle, ADB, Maestro, JUnit, hierarchy, screenshot, and APK evidence in the Repository-supplied artifact root. Do not overwrite a failed attempt with a later attempt. The active Run stores a concise, repo-relative summary with command, result, first anomaly, derived errors, classification, and next action.

Build, Install, Smoke, each Flow, and each Suite are reported separately. A screenshot or final log line alone does not prove a semantic pass when the underlying Flow or device state is not confirmed.

## Failure classification

Separate the first anomaly from derived errors such as `BUILD FAILED`, missing APK, Install failure, or Maestro startup failure. Use the Repository-compatible execution classification:

```text
ENVIRONMENT_FAILURE
DEPENDENCY_FAILURE
CONFIGURATION_FAILURE
SOURCE_FAILURE
BUILD_CACHE_FAILURE
DEVICE_FAILURE
TEST_FAILURE
TRANSIENT_FAILURE
UNKNOWN
```

Do not infer `TRANSIENT_FAILURE` without evidence. Keep environment, dependency, configuration, source, cache, device, and test causes distinct.

## Retry and stop

Retry only for a stated purpose: reproducibility, additional evidence, hypothesis testing, or recovery from a confirmed external transient. Change one condition at a time where practical.

Stop and return to investigation when the same error occurs twice consecutively, the same stage fails three times, the first anomaly remains unchanged after different responses, no new evidence or hypothesis is added, a downstream stage would run after an upstream failure, or the required environment/device/APK condition is not understood.

Cache deletion, daemon stopping, dependency reinstall, clean build, timeout increase, assertion removal, and Flow skipping are not explanations by themselves and must not be used as blind retries or as a way to claim success. A capacity failure may be retried only after capacity is corrected and the changed condition is recorded.

## Repair boundary

When a Product or Flow repair is explicitly authorized, apply the smallest in-scope repair, rerun the same failing unit, and proceed to later Suites only after that unit passes. Do not mix unrelated product changes, dependency upgrades, or environment cleanup into the validation loop.

## Completion

Native validation is complete only when every Repository-required gate passes: toolchain/preflight, preparation, Release APK Build and inspection, physical-device Install and startup, the control Flow, required Runtime and Boundary Suites, and evidence persistence. Build success alone is not Native validation completion.

Never report an unexecuted or blocked stage as PASS. If a required physical device or capability is unavailable, record a blocked or not-executed result with evidence and stop according to the Repository contract.

## Safety and non-goals

- Preserve Git state; do not perform Git operations without explicit authorization.
- Do not delete or move user data, caches, generated files, APKs, or device data automatically.
- Do not bypass assertions, skip a failing Flow, or hide a failure behind a changed timeout.
- Do not upgrade the fixed toolchain or invent a new command runner in this workflow.
