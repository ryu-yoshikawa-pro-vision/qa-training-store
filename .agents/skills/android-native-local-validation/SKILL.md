---
name: android-native-local-validation
description: Use when setting up Windows Android tooling, building a local Release APK, installing it on a physical device, running Maestro flows, or investigating a Native physical-device failure.
---

# Android Native Local Validation Skill

## Purpose and boundary

Use this Skill for Windows + PowerShell validation of a local Release APK on a physical Android device, including tool setup, build, install, Maestro flows, and Native physical-device failure investigation. It is not a replacement for the Repository's concrete runbook or command helper.

## Inputs

- The package-local [Windows Android workflow](references/windows-android-workflow.md), which defines retry, stop, failure, evidence, and completion semantics.
- The Repository native runbook and troubleshooting guide as logical external inputs.
- The Repository command helper, fixed toolchain contract, device/app contract, Run artifact contract, and current change/diff context.

## Execution outline

1. Read the package workflow and Repository input mapping.
2. Run the Repository-provided Doctor/preflight before Prepare, a new Build, Install, Test, or Maestro.
3. Execute Prepare only on the first setup or when Native Project regeneration is required; otherwise reuse the valid prepared state.
4. Establish a current Release APK by reusing a valid APK that represents the current changes, or by running Build when no current APK exists or the current changes are not represented.
5. Inspect the APK, then execute Install, Smoke, the single Flow, and later Suites only when the preceding gate passes.
6. Use a unique attempt identity, preserve raw evidence in the Repository artifact location, and record a repo-relative summary in the active Run.
7. Classify the first failure, apply only an in-scope minimal repair when authorized, and revalidate the same unit before later stages.
8. Report each stage separately and complete only when the current Release APK is established and all required gates and evidence are satisfied; executing Build on every run is not itself a completion condition.

## Guardrails

- Do not independently reimplement the Repository command helper or upgrade fixed versions without Repository direction.
- Do not run downstream stages after an upstream failure, mark an unexecuted stage as PASS, or retry without a new hypothesis or evidence.
- Do not bypass a failing Flow by deleting assertions, skipping it, or extending timeouts only.
- Do not automatically delete caches, move files, install arbitrary dependencies, or perform Git operations.
- Do not add generated native directories, APKs, raw evidence, local configuration, or personal device paths to the Repository.
