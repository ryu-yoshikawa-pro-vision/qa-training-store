#!/usr/bin/env python3
"""Validate the repository-governed GPT-5.6 Luna subagent contract."""

from __future__ import annotations

import json
import sys
from pathlib import Path

if sys.version_info < (3, 11):
    raise SystemExit("Python 3.11+ is required for TOML contract validation")

try:
    import tomllib
except ModuleNotFoundError as exc:  # pragma: no cover - Python version is checked above.
    raise SystemExit("Python 3.11+ is required for TOML contract validation") from exc


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_AGENTS = {
    "code_researcher": "read-only",
    "implementation_researcher": "read-only",
    "test_investigator": "read-only",
    "implementation_worker": "workspace-write",
    "quality_gate_runner": "workspace-write",
}
FAILURE_CATEGORIES = {
    "instruction_gap",
    "scope_creep",
    "missing_context",
    "missing_validation",
    "unsafe_action_blocked",
    "bad_subagent_delegation",
    "flaky_or_env_issue",
    "review_gap",
    "repair_loop_stalled",
    "artifact_contract_gap",
}


def load_toml(path: Path) -> dict:
    with path.open("rb") as handle:
        return tomllib.load(handle)


def contains_toml_key(value, expected_key: str) -> bool:
    if isinstance(value, dict):
        if expected_key in value:
            return True
        return any(contains_toml_key(child, expected_key) for child in value.values())
    if isinstance(value, list):
        return any(contains_toml_key(child, expected_key) for child in value)
    return False


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []
    config_path = ROOT / ".codex" / "config.toml"
    config = load_toml(config_path)

    for legacy in ("codex_hooks", "max_threads", "max_depth"):
        if contains_toml_key(config, legacy):
            fail(errors, f"legacy config key remains: {legacy}")

    features = config.get("features", {})
    if features.get("hooks") is not True:
        fail(errors, "features.hooks must be true")
    if features.get("multi_agent") is not True:
        fail(errors, "features.multi_agent must be true")

    agents_config = config.get("agents", {})
    expected_defaults = {
        "enabled": True,
        "default_subagent_model": "gpt-5.6-luna",
        "default_subagent_reasoning_effort": "max",
        "max_concurrent_threads_per_session": 6,
    }
    for key, expected in expected_defaults.items():
        if agents_config.get(key) != expected:
            fail(errors, f"agents.{key} must be {expected!r}")

    hooks = config.get("hooks", {})
    for event in ("SubagentStart", "SubagentStop"):
        event_hooks = hooks.get(event)
        if not isinstance(event_hooks, list) or not event_hooks:
            fail(errors, f"hooks.{event} observation hook is missing")
            continue
        command_text = json.dumps(event_hooks, ensure_ascii=False)
        if "observe.ps1" not in command_text:
            fail(errors, f"hooks.{event} must call observe.ps1")

    agent_dir = ROOT / ".codex" / "agents"
    files = sorted(agent_dir.glob("*.toml"))
    names = {path.stem for path in files}
    if names != set(EXPECTED_AGENTS):
        fail(errors, f"custom agent file set mismatch: {sorted(names)!r}")

    for name, sandbox in EXPECTED_AGENTS.items():
        path = agent_dir / f"{name}.toml"
        if not path.exists():
            continue
        data = load_toml(path)
        if data.get("name") != name:
            fail(errors, f"{name}: name must match filename")
        if data.get("model") != "gpt-5.6-luna":
            fail(errors, f"{name}: model must be gpt-5.6-luna")
        if data.get("model_reasoning_effort") != "max":
            fail(errors, f"{name}: model_reasoning_effort must be max")
        if data.get("sandbox_mode") != sandbox:
            fail(errors, f"{name}: sandbox_mode must be {sandbox}")
        child_agents = data.get("agents", {})
        child_features = data.get("features", {})
        if child_agents.get("enabled") is not False:
            fail(errors, f"{name}: child agents.enabled must be false")
        if child_features.get("multi_agent") is not False:
            fail(errors, f"{name}: child features.multi_agent must be false")
        instructions = data.get("developer_instructions")
        if not isinstance(instructions, str) or not instructions.strip():
            fail(errors, f"{name}: developer_instructions is required")
            continue
        if "additional subagent spawn禁止" not in instructions:
            fail(errors, f"{name}: recursive delegation prohibition is missing")
        if name in {"code_researcher", "implementation_researcher", "test_investigator"}:
            if "編集" not in instructions or "作成" not in instructions:
                fail(errors, f"{name}: behavioral read-only contract is incomplete")
        if name == "implementation_worker":
            for marker in ("Write Parallel Capability Gate", "focused validation", "allowed scope"):
                if marker not in instructions:
                    fail(errors, f"{name}: missing worker contract marker {marker!r}")
        if name == "quality_gate_runner":
            for marker in (
                "Local Required Validation Set",
                "Source",
                "Failure Taxonomy",
                "自動修正",
                "timeout",
                "codex-local-validation.mjs",
                "underlyingのpython/bash/powershell/pnpm commandを直接組み立てない",
                "QUALITY_GATE_RUNNER_PASS",
                "QUALITY_GATE_RUNNER_INCOMPLETE",
            ):
                if marker not in instructions:
                    fail(errors, f"{name}: missing quality runner contract marker {marker!r}")

    taxonomy_path = ROOT / "spec" / "failure-taxonomy.json"
    taxonomy = json.loads(taxonomy_path.read_text(encoding="utf-8"))
    if "$schema" in taxonomy:
        fail(errors, "failure taxonomy catalog must not declare $schema")
    category_ids = {item.get("id") for item in taxonomy.get("categories", [])}
    if category_ids != FAILURE_CATEGORIES:
        fail(errors, "failure taxonomy category set does not match the existing SSOT")
    if len(taxonomy.get("categories", [])) != len(FAILURE_CATEGORIES):
        fail(errors, "failure taxonomy must contain exactly the existing 10 categories")

    hook_schema = json.loads(
        (ROOT / ".codex" / "templates" / "hook-observation.schema.json").read_text(encoding="utf-8")
    )
    properties = hook_schema.get("properties", {})
    for field in ("agent_type", "agent_id", "model"):
        if field not in properties:
            fail(errors, f"hook observation schema is missing runtime field: {field}")

    dispatcher = ROOT / "scripts" / "codex-local-validation.mjs"
    if not dispatcher.exists():
        fail(errors, "validation dispatcher is missing")
    else:
        dispatcher_text = dispatcher.read_text(encoding="utf-8")
        for action in ("validate-orchestration", "verify-bash", "verify-powershell", "test-contracts", "verify"):
            if f'"{action}"' not in dispatcher_text:
                fail(errors, f"validation dispatcher is missing action: {action}")
        if "shell: false" not in dispatcher_text or "spawn(" not in dispatcher_text:
            fail(errors, "validation dispatcher must spawn argv without a shell")

    expected_ledger = ROOT / "scripts" / "record-expected-invocation.py"
    if not expected_ledger.exists():
        fail(errors, "expected invocation ledger recorder is missing")

    evaluation_schema_path = ROOT / ".codex" / "templates" / "evaluation.schema.json"
    evaluation_schema = json.loads(evaluation_schema_path.read_text(encoding="utf-8"))
    if not isinstance(evaluation_schema.get("allOf"), list) or not evaluation_schema["allOf"]:
        fail(errors, "evaluation schema must enforce primary/failure category relation")
    for condition in evaluation_schema.get("allOf", []):
        conditional = condition.get("if") if isinstance(condition, dict) else None
        if isinstance(conditional, dict) and "primary_failure_category" in conditional.get("properties", {}):
            if "primary_failure_category" not in conditional.get("required", []):
                fail(errors, "evaluation schema conditional category blocks must require primary_failure_category")

    if errors:
        print("LUNA_ORCHESTRATION_VALIDATION_FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("LUNA_ORCHESTRATION_VALIDATION_PASS")
    print(f"agents={','.join(sorted(EXPECTED_AGENTS))}")
    print("model=gpt-5.6-luna")
    print("reasoning_effort=max")
    print("child_multi_agent=false")
    return 0


if __name__ == "__main__":
    sys.exit(main())
