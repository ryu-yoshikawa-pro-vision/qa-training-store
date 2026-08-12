#!/usr/bin/env python3
import argparse
import copy
import hashlib
import json
import subprocess
from pathlib import Path


HOOK_EVENTS = {
    "PreToolUse",
    "PostToolUse",
    "SubagentStart",
    "SubagentStop",
    "Stop",
    "WrapperStart",
    "WrapperStop",
    "SafetyBlocked",
    "ObservationError",
}

RUNTIME_AGENT_ALLOWLIST = (
    "code_researcher",
    "implementation_researcher",
    "test_investigator",
    "implementation_worker",
    "quality_gate_runner",
)


def parse_porcelain_paths(raw_status: bytes):
    """Parse git porcelain v1 -z paths, retaining rename new+old and copy new paths."""
    entries = raw_status.decode("utf-8", errors="replace").split("\0")
    paths = []
    index = 0
    while index < len(entries):
        entry = entries[index]
        index += 1
        if not entry:
            continue
        status = entry[:2]
        primary = entry[3:] if len(entry) >= 4 else ""
        candidates = [primary]
        if "R" in status or "C" in status:
            if index < len(entries):
                original = entries[index]
                index += 1
                if "R" in status:
                    candidates.append(original)
        for value in candidates:
            normalized = normalize_repo_path(value)
            if normalized:
                paths.append(normalized)
    return unique_list(paths)


def load_expected_invocation_ledger(repo_root: Path, run_root: Path):
    """Load dispatch events and append-only runtime links independently of subagent records."""
    ledger_path = run_root / "expected-invocations.jsonl"
    if not ledger_path.exists():
        return [], [], False

    dispatches = {}
    links = {}
    cancelled = set()
    warnings = []
    for line_number, line in enumerate(ledger_path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            add_warning(
                warnings,
                "expected_invocation_ledger_invalid_json",
                repo_relative(repo_root, ledger_path),
                f"line {line_number}: {exc.msg}",
            )
            continue
        if not isinstance(event, dict):
            add_warning(
                warnings,
                "expected_invocation_ledger_invalid_event",
                repo_relative(repo_root, ledger_path),
                f"line {line_number}: event must be an object",
            )
            continue
        event_type = event.get("event")
        invocation_id = event.get("invocation_id")
        if event_type == "dispatch":
            if not isinstance(invocation_id, str) or not invocation_id:
                add_warning(
                    warnings,
                    "expected_invocation_ledger_missing_id",
                    repo_relative(repo_root, ledger_path),
                    f"line {line_number}: dispatch invocation_id is required",
                )
                continue
            if invocation_id in dispatches:
                add_warning(
                    warnings,
                    "expected_invocation_ledger_duplicate_dispatch",
                    repo_relative(repo_root, ledger_path),
                    f"line {line_number}: duplicate invocation_id={invocation_id}",
                )
                continue
            dispatches[invocation_id] = event
        elif event_type == "link":
            if isinstance(invocation_id, str) and invocation_id:
                links[invocation_id] = event
        elif event_type == "cancel":
            if isinstance(invocation_id, str) and invocation_id:
                cancelled.add(invocation_id)
            else:
                add_warning(
                    warnings,
                    "expected_invocation_ledger_cancel_missing_id",
                    repo_relative(repo_root, ledger_path),
                    f"line {line_number}: cancel invocation_id is required",
                )
        else:
            add_warning(
                warnings,
                "expected_invocation_ledger_unknown_event",
                repo_relative(repo_root, ledger_path),
                f"line {line_number}: event={event_type!r}",
            )

    records = []
    for invocation_id, dispatch in dispatches.items():
        if invocation_id in cancelled:
            continue
        link = links.get(invocation_id, {})
        records.append(
            {
                "invocation_id": invocation_id,
                "expected_agent_name": dispatch.get("expected_agent_name"),
                "expected_model": dispatch.get("expected_model"),
                "expected_role": dispatch.get("expected_role"),
                "dispatch_timestamp": dispatch.get("dispatch_timestamp"),
                "runtime_agent_id": link.get("runtime_agent_id"),
                "linked_timestamp": link.get("linked_timestamp"),
            }
        )
    return records, warnings, True


def load_cancelled_runtime_agent_ids(run_root: Path):
    """Return runtime IDs from append-only cancellations for historical attempts."""
    ledger_path = run_root / "expected-invocations.jsonl"
    if not ledger_path.exists():
        return set()
    links = {}
    cancelled = set()
    for line in ledger_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(event, dict):
            continue
        invocation_id = event.get("invocation_id")
        if event.get("event") == "link" and isinstance(invocation_id, str):
            links[invocation_id] = event.get("runtime_agent_id")
        elif event.get("event") == "cancel" and isinstance(invocation_id, str):
            cancelled.add(invocation_id)
    return {
        runtime_agent_id
        for invocation_id, runtime_agent_id in links.items()
        if invocation_id in cancelled and isinstance(runtime_agent_id, str) and runtime_agent_id
    }


def current_source_changed_files(repo_root: Path):
    """Return current source changes without generated .codex/runs artifacts."""
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), "status", "--porcelain=v1", "-z", "--untracked-files=all"],
            capture_output=True,
            check=False,
        )
    except OSError:
        return [], False
    if result.returncode != 0:
        return [], False

    paths = []
    for value in parse_porcelain_paths(result.stdout):
        normalized = normalize_repo_path(value)
        if normalized and normalized != ".codex/runs" and not normalized.startswith(".codex/runs/"):
            paths.append(normalized)
    return unique_list(paths), True


def aggregate_changed_files(baseline, current, accepted_subagent_changes):
    baseline_set = {normalize_repo_path(item) for item in baseline if isinstance(item, str)}
    current_set = {normalize_repo_path(item) for item in current if isinstance(item, str)}
    accepted = {normalize_repo_path(item) for item in accepted_subagent_changes if isinstance(item, str)}
    return sorted((current_set - baseline_set) | accepted)


def fingerprint_file(repo_root: Path, relative_path: str):
    """Return the stable file fingerprint used for dirty-baseline comparison."""
    normalized = normalize_repo_path(relative_path)
    candidate = (repo_root / normalized).resolve()
    try:
        candidate.relative_to(repo_root.resolve())
    except ValueError:
        return {"exists": False, "hash": None, "size": None}
    if not candidate.is_file():
        return {"exists": False, "hash": None, "size": None}

    digest = hashlib.sha256()
    with candidate.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return {
        "exists": True,
        "hash": digest.hexdigest().upper(),
        "size": candidate.stat().st_size,
    }


def expected_file_delta(repo_root: Path, source_baseline):
    """Find expected files modified after their recorded run-start fingerprint."""
    if not isinstance(source_baseline, dict):
        return []
    expected_files = source_baseline.get("expected_files")
    if not isinstance(expected_files, dict):
        return []

    changed = []
    for relative_path, baseline in expected_files.items():
        if not isinstance(relative_path, str) or not isinstance(baseline, dict):
            continue
        expected = {
            "exists": bool(baseline.get("exists")),
            "hash": baseline.get("hash"),
            "size": baseline.get("size"),
        }
        if fingerprint_file(repo_root, relative_path) != expected:
            changed.append(normalize_repo_path(relative_path))
    return unique_list(changed)


def preserve_known_changed_files(existing, accepted_subagent_changes):
    """Preserve known evidence when git status is unavailable instead of erasing it."""
    values = [
        normalize_repo_path(item)
        for item in list(existing) + list(accepted_subagent_changes)
        if isinstance(item, str) and item
    ]
    return sorted(set(values))


def accepted_subagent_changes(parent_action, file_changes):
    """Return files eligible for aggregation only after explicit parent acceptance."""
    if parent_action not in {"accepted", "partially_accepted"}:
        return []
    return [
        normalize_repo_path(item)
        for item in file_changes
        if isinstance(item, str) and item
    ]


def evaluate_runtime_agent_compliance(expected_records, observed):
    """Compare one expected invocation record to one SubagentStart by runtime agent_id."""
    expected = []
    for record in expected_records:
        if not isinstance(record, dict):
            continue
        expected.append(
            {
                "invocation_id": record.get("invocation_id") or record.get("subagent_run_id"),
                "agent_name": record.get("expected_agent_name") or record.get("agent_name"),
                "role": record.get("expected_role") or record.get("role"),
                "agent_id": record.get("runtime_agent_id"),
                "configured_model": record.get("expected_model") or record.get("model"),
                "dispatch_timestamp": record.get("dispatch_timestamp"),
            }
        )

    expected_by_id = {}
    violations = []
    for item in expected:
        agent_id = item.get("agent_id")
        if not isinstance(item.get("invocation_id"), str) or not item.get("invocation_id"):
            violations.append(
                {
                    "kind": "missing_expected_invocation_id",
                    "invocation_id": item.get("invocation_id"),
                }
            )
            continue
        if not isinstance(agent_id, str) or not agent_id:
            violations.append(
                {
                    "kind": "missing_expected_runtime_agent_id",
                    "invocation_id": item.get("invocation_id"),
                }
            )
            continue
        if agent_id in expected_by_id:
            violations.append({"kind": "duplicate_expected_invocation_identifier", "agent_id": agent_id})
            continue
        expected_by_id[agent_id] = item
        if item.get("agent_name") not in RUNTIME_AGENT_ALLOWLIST:
            violations.append(
                {
                    "kind": "expected_agent_not_allowlisted",
                    "agent_name": item.get("agent_name"),
                    "invocation_id": item.get("invocation_id"),
                }
            )
        if item.get("configured_model") != "gpt-5.6-luna":
            violations.append(
                {
                    "kind": "expected_model_mismatch",
                    "model": item.get("configured_model"),
                    "invocation_id": item.get("invocation_id"),
                }
            )

    observed_by_id = {}
    unexpected = []
    matched_ids = set()
    for item in observed:
        agent_id = item.get("agent_id") if isinstance(item, dict) else None
        if not isinstance(agent_id, str) or not agent_id:
            violations.append({"kind": "missing_observed_invocation_identifier", "event_id": item.get("event_id")})
            unexpected.append(item)
            continue
        if agent_id in observed_by_id:
            violations.append({"kind": "duplicate_observed_invocation_identifier", "agent_id": agent_id})
            unexpected.append(item)
            continue
        observed_by_id[agent_id] = item
        expected_item = expected_by_id.get(agent_id)
        if expected_item is None:
            unexpected.append(item)
            if item.get("agent_type") not in RUNTIME_AGENT_ALLOWLIST:
                violations.append(
                    {
                        "kind": "unexpected_or_generic_agent",
                        "agent_type": item.get("agent_type"),
                        "agent_id": agent_id,
                        "event_id": item.get("event_id"),
                    }
                )
            else:
                violations.append({"kind": "unexpected_invocation", "agent_id": agent_id})
            continue

        matched_ids.add(agent_id)
        if item.get("agent_type") != expected_item.get("agent_name"):
            violations.append(
                {
                    "kind": "agent_identity_mismatch",
                    "agent_id": agent_id,
                    "expected": expected_item.get("agent_name"),
                    "observed": item.get("agent_type"),
                }
            )
        if item.get("agent_type") not in RUNTIME_AGENT_ALLOWLIST:
            violations.append(
                {
                    "kind": "non_allowlisted_agent",
                    "agent_type": item.get("agent_type"),
                    "agent_id": agent_id,
                }
            )
        if item.get("model") != "gpt-5.6-luna":
            violations.append({"kind": "model_mismatch", "model": item.get("model"), "agent_id": agent_id})

    missing = [item for item in expected if item.get("agent_id") not in matched_ids]
    if not expected:
        violations.append({"kind": "empty_expected_invocation_set"})

    configured_effort = "max"
    observed_efforts = sorted(
        {item.get("reasoning_effort") for item in observed if isinstance(item, dict) and item.get("reasoning_effort")}
    )
    runtime_observed = bool(observed_efforts)
    runtime_matches_configured = None
    if runtime_observed:
        runtime_matches_configured = all(value == configured_effort for value in observed_efforts)
        if not runtime_matches_configured:
            violations.append(
                {
                    "kind": "reasoning_effort_mismatch",
                    "configured": configured_effort,
                    "observed_values": observed_efforts,
                }
            )

    if expected and not missing and not unexpected and not violations:
        status = "pass"
    elif missing or any(item.get("kind", "").startswith("missing_") for item in violations):
        status = "incomplete"
    else:
        status = "fail"

    return {
        "status": status,
        "allowlist": list(RUNTIME_AGENT_ALLOWLIST),
        "expected": expected,
        "observed": observed,
        "missing": missing,
        "unexpected": unexpected,
        "violations": violations,
        "reasoning_effort": {
            "configured": configured_effort,
            "configured_accepted": True,
            "runtime_observed": runtime_observed,
            "observed_values": observed_efforts,
            "runtime_matches_configured": runtime_matches_configured,
        },
    }


def validate_failure_taxonomy_relation(evaluation):
    """Return contract errors for primary_failure_category/failure_categories."""
    if not isinstance(evaluation, dict):
        return ["evaluation must be an object"]
    primary = evaluation.get("primary_failure_category")
    categories = evaluation.get("failure_categories")
    if not isinstance(categories, list):
        return ["failure_categories must be an array"]
    errors = []
    if evaluation.get("result") == "pass" and primary is None and categories:
        errors.append("final pass with null primary_failure_category must have failure_categories=[]")
    if primary is not None and primary not in categories:
        errors.append("primary_failure_category must be included in failure_categories")
    return errors


def parse_args():
    parser = argparse.ArgumentParser(description="Aggregate run-local artifacts into run.json.")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--runs-root")
    parser.add_argument("--hook-log", action="append", default=[])
    parser.add_argument("--manifest-path")
    parser.add_argument("--base-manifest")
    parser.add_argument("--strict", action="store_true")
    return parser.parse_args()


def repo_root_from_script() -> Path:
    return Path(__file__).resolve().parents[1]


def repo_relative(repo_root: Path, path: Path) -> str:
    try:
        return path.resolve().relative_to(repo_root.resolve()).as_posix()
    except ValueError:
        return f"<external>/{path.name}"


def normalize_repo_path(value):
    if not isinstance(value, str):
        return value
    return value.replace("\\", "/")


def unique_list(values):
    result = []
    seen = set()
    for value in values:
        marker = json.dumps(value, sort_keys=True, ensure_ascii=True)
        if marker in seen:
            continue
        seen.add(marker)
        result.append(value)
    return result


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def default_manifest(repo_root: Path, run_id: str):
    template_path = repo_root / ".codex" / "templates" / "RUN_MANIFEST.json"
    if template_path.exists():
        data = load_json(template_path)
    else:
        data = {
            "schema_version": 1,
            "run_id": run_id,
            "task_type": "implementation",
            "workflow_level": "standard",
            "preset": "safe",
            "runtime": "host",
            "agents_used": [],
            "repo": None,
            "branch": None,
            "base_branch": None,
            "codex_task_reports": [],
            "changed_files": [],
            "expected_invocation_ledger": None,
            "expected_invocations": [],
            "source_baseline": {
                "kind": "git_status",
                "changed_files": [],
            },
            "source_integrity": None,
            "validation": {"status": "not_run", "commands": [], "warnings": []},
            "safety": {
                "network": False,
                "delete_attempt_blocked": False,
                "git_mutation_attempt_blocked": False,
                "scope_violation": False,
            },
            "artifact_summary": {
                "codex_task_report_count": 0,
                "hook_event_count": 0,
                "subagent_run_count": 0,
                "evaluation_present": False,
            },
            "hook_observations": {
                "log_paths": [],
                "event_counts": {},
                "blocking_event_count": 0,
                "safety_blocked_count": 0,
                "observation_error_count": 0,
                "ignored_cancelled_runtime": [],
                "runtime_agent_compliance": {
                    "status": "unknown",
                    "allowlist": list(RUNTIME_AGENT_ALLOWLIST),
                    "expected": [],
                    "observed": [],
                    "missing": [],
                    "unexpected": [],
                    "violations": [],
                "reasoning_effort": {
                    "configured": "max",
                    "configured_accepted": True,
                    "runtime_observed": False,
                    "observed_values": [],
                    "runtime_matches_configured": None,
                },
                },
            },
            "subagents": {
                "records": [],
                "summary": {
                    "total": 0,
                    "read_only": 0,
                    "writable": 0,
                    "scope_violations": 0,
                    "used_in_final_plan": 0,
                },
            },
            "evaluation_path": None,
            "completion_state": {
                "LOCAL_IMPLEMENTATION_COMPLETE": False,
                "MERGE_READY": False,
                "external_checks": "pending",
                "reasons": ["Parent has not completed local and external acceptance decisions."],
            },
            "status": "pending",
            "primary_failure_category": None,
        }
    data["run_id"] = run_id
    return data


def add_warning(warnings, warning_type: str, path: str, message: str):
    warnings.append({"type": warning_type, "path": normalize_repo_path(path), "message": message})


def extend_unique_strings(target, values):
    target.extend(normalize_repo_path(value) for value in values if isinstance(value, str) and value)
    return unique_list(target)


def merge_validation_status(base_status: str, commands, warnings):
    statuses = {item.get("status") for item in commands if isinstance(item, dict)}
    if "blocked" in statuses:
        return "blocked"
    if "failed" in statuses:
        return "failed"
    if warnings:
        return "passed_with_warnings"
    if "passed" in statuses:
        return "passed"
    if "skipped" in statuses:
        return "skipped"
    return base_status or "not_run"


def safety_text(event):
    parts = []
    metadata = event.get("metadata")
    if isinstance(metadata, dict):
        for key in ("type", "kind", "category", "blocked_type", "operation"):
            value = metadata.get(key)
            if isinstance(value, str):
                parts.append(value.lower())
    decision = event.get("decision")
    if isinstance(decision, dict):
        reason = decision.get("reason")
        if isinstance(reason, str):
            parts.append(reason.lower())
    tool = event.get("tool")
    if isinstance(tool, dict):
        for key in ("name", "operation", "target"):
            value = tool.get(key)
            if isinstance(value, str):
                parts.append(value.lower())
    return " ".join(parts)


def collect_hook_observations(
    repo_root: Path,
    run_root: Path,
    run_id: str,
    explicit_logs,
    expected_records=None,
    ignored_runtime_agent_ids=None,
):
    expected_records = expected_records or []
    ignored_runtime_agent_ids = set(ignored_runtime_agent_ids or [])
    summary = {
        "log_paths": [],
        "event_counts": {},
        "blocking_event_count": 0,
        "safety_blocked_count": 0,
        "observation_error_count": 0,
        "ignored_cancelled_runtime": [],
        "runtime_agent_compliance": {
            "status": "unknown",
            "allowlist": list(RUNTIME_AGENT_ALLOWLIST),
            "expected": [],
            "observed": [],
            "missing": [],
            "unexpected": [],
            "violations": [],
            "reasoning_effort": {
                "configured": "max",
                "configured_accepted": True,
                "runtime_observed": False,
                "observed_values": [],
                "runtime_matches_configured": None,
            },
        },
    }
    warnings = []
    safety = {"delete_attempt_blocked": False, "git_mutation_attempt_blocked": False}

    default_hook_log = repo_root / ".codex" / "observations" / "hooks.jsonl"
    candidate_paths = []
    explicit_paths = []
    for raw in explicit_logs:
        path = Path(raw)
        if not path.is_absolute():
            path = repo_root / path
        explicit_paths.append(path)
        candidate_paths.append(path)
    if default_hook_log.exists():
        candidate_paths.append(default_hook_log)
    logs_dir = run_root / "logs"
    if logs_dir.exists():
        candidate_paths.extend(sorted(logs_dir.glob("*.jsonl")))
    candidate_paths = unique_list([str(path.resolve()) for path in candidate_paths if path.exists()])
    explicit_markers = {str(path.resolve()) for path in explicit_paths}
    if default_hook_log.exists():
        explicit_markers.add(str(default_hook_log.resolve()))

    for raw_path in candidate_paths:
        path = Path(raw_path)
        matched_in_file = 0
        for index, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError as exc:
                if raw_path in explicit_markers:
                    add_warning(
                        warnings,
                        "hook_observation_invalid_jsonl",
                        repo_relative(repo_root, path),
                        f"line {index}: {exc.msg}",
                    )
                continue
            if not isinstance(payload, dict):
                continue
            event = payload.get("event")
            if event not in HOOK_EVENTS or payload.get("run_id") != run_id:
                continue
            matched_in_file += 1
            summary["event_counts"][event] = summary["event_counts"].get(event, 0) + 1
            if payload.get("blocking") is True:
                summary["blocking_event_count"] += 1
            if event == "SafetyBlocked":
                summary["safety_blocked_count"] += 1
                text = safety_text(payload)
                if "delete" in text or "remove-item" in text or " rm " in f" {text} ":
                    safety["delete_attempt_blocked"] = True
                if "git " in text or "git_" in text or "git-" in text:
                    safety["git_mutation_attempt_blocked"] = True
            if event == "ObservationError":
                summary["observation_error_count"] += 1
            if event == "SubagentStart":
                agent_type = payload.get("agent_type")
                agent_id = payload.get("agent_id")
                model = payload.get("model")
                observed = {
                    "agent_type": agent_type if isinstance(agent_type, str) else None,
                    "agent_id": agent_id if isinstance(agent_id, str) else None,
                    "model": model if isinstance(model, str) else None,
                    "event_id": payload.get("event_id"),
                }
                reasoning_effort = payload.get("reasoning_effort")
                if isinstance(reasoning_effort, str) and reasoning_effort:
                    observed["reasoning_effort"] = reasoning_effort
                for key in ("session_id", "turn_id"):
                    value = payload.get(key)
                    if isinstance(value, str) and value:
                        observed[key] = value
                if observed.get("agent_id") in ignored_runtime_agent_ids:
                    summary["ignored_cancelled_runtime"].append(observed)
                    continue
                summary["runtime_agent_compliance"]["observed"].append(observed)
        if matched_in_file:
            summary["log_paths"].append(repo_relative(repo_root, path))

    summary["log_paths"] = unique_list(summary["log_paths"])
    summary["event_counts"] = dict(sorted(summary["event_counts"].items()))
    compliance = summary["runtime_agent_compliance"]
    compliance.update(evaluate_runtime_agent_compliance(expected_records, compliance["observed"]))
    return summary, warnings, safety


def collect_subagents(repo_root: Path, run_root: Path, run_id: str):
    records = []
    warnings = []
    changed_files = []
    agents_used = []
    subagents_dir = run_root / "subagents"
    if not subagents_dir.exists():
        return {
            "records": [],
            "summary": {
                "total": 0,
                "read_only": 0,
                "writable": 0,
                "scope_violations": 0,
                "used_in_final_plan": 0,
            },
        }, warnings, changed_files, agents_used

    summary = {
        "total": 0,
        "read_only": 0,
        "writable": 0,
        "scope_violations": 0,
        "used_in_final_plan": 0,
    }

    for path in sorted(subagents_dir.glob("*.json")):
        try:
            payload = load_json(path)
        except (OSError, json.JSONDecodeError) as exc:
            add_warning(warnings, "subagent_invalid_json", repo_relative(repo_root, path), str(exc))
            continue

        if not isinstance(payload, dict):
            add_warning(warnings, "subagent_invalid_json", repo_relative(repo_root, path), "Top-level JSON must be an object")
            continue

        if payload.get("parent_run_id") != run_id:
            add_warning(
                warnings,
                "subagent_parent_run_mismatch",
                repo_relative(repo_root, path),
                f"parent_run_id={payload.get('parent_run_id')!r}",
            )
            continue

        allowed_files = payload.get("allowed_files") if isinstance(payload.get("allowed_files"), list) else []
        file_changes = payload.get("changed_files") if isinstance(payload.get("changed_files"), list) else []
        mode = payload.get("mode")
        scope = payload.get("scope") if isinstance(payload.get("scope"), dict) else {}
        scope_compliant = scope.get("compliant")
        used_in_final_plan = payload.get("used_in_final_plan") is True
        parent_decision = payload.get("parent_decision") if isinstance(payload.get("parent_decision"), dict) else {}
        parent_action = parent_decision.get("action")
        agent = payload.get("agent") if isinstance(payload.get("agent"), dict) else {}
        agent_name = agent.get("name")

        if mode == "writable" and len(allowed_files) == 0:
            add_warning(
                warnings,
                "subagent_writable_missing_allowed_files",
                repo_relative(repo_root, path),
                "writable subagent should declare allowed_files",
            )
        if mode == "read_only" and len(file_changes) != 0:
            add_warning(
                warnings,
                "subagent_read_only_changed_files",
                repo_relative(repo_root, path),
                "read-only subagent should have changed_files=[]",
            )

        records.append(
            {
                "path": repo_relative(repo_root, path),
                "subagent_run_id": payload.get("subagent_run_id"),
                "agent_name": agent_name,
                "model": agent.get("model"),
                "runtime_agent_id": (
                    payload.get("metadata", {}).get("runtime_agent_id")
                    if isinstance(payload.get("metadata"), dict)
                    else None
                ),
                "role": payload.get("role"),
                "mode": mode,
                "status": payload.get("status"),
                "allowed_files_count": len(allowed_files),
                "changed_files_count": len(file_changes),
                "scope_compliant": scope_compliant,
                "used_in_final_plan": used_in_final_plan,
                "parent_decision": parent_action,
            }
        )
        accepted_changes = accepted_subagent_changes(parent_action, file_changes)
        if accepted_changes:
            changed_files.extend(accepted_changes)
        elif file_changes:
            add_warning(
                warnings,
                "subagent_changes_not_accepted",
                repo_relative(repo_root, path),
                f"parent_decision={parent_action!r}; changed_files are excluded from the aggregate until accepted.",
            )
        if isinstance(agent_name, str) and agent_name:
            agents_used.append(agent_name)

        summary["total"] += 1
        if mode == "read_only":
            summary["read_only"] += 1
        if mode == "writable":
            summary["writable"] += 1
        if scope_compliant is False:
            summary["scope_violations"] += 1
        if used_in_final_plan:
            summary["used_in_final_plan"] += 1

    return {"records": records, "summary": summary}, warnings, unique_list(changed_files), unique_list(agents_used)


def collect_report_paths(repo_root: Path, run_root: Path):
    reports_dir = run_root / "reports"
    if not reports_dir.exists():
        return []
    return [repo_relative(repo_root, path) for path in sorted(reports_dir.glob("*.report.json"))]


def load_manifest_candidate(path: Path):
    if not path or not path.exists():
        return None
    try:
        data = load_json(path)
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def merge_manifests(default_data, existing_data, base_data):
    manifest = copy.deepcopy(default_data)
    for source in (base_data or {}, existing_data or {}):
        for key in ("schema_version", "run_id", "task_type", "workflow_level", "preset", "runtime", "repo", "branch", "base_branch", "evaluation_path", "completion_state", "status", "primary_failure_category", "source_integrity"):
            value = source.get(key)
            if value is not None:
                manifest[key] = value
        if "agents_used" in source and isinstance(source.get("agents_used"), list):
            manifest["agents_used"] = source.get("agents_used")
        if "codex_task_reports" in source and isinstance(source.get("codex_task_reports"), list):
            manifest["codex_task_reports"] = source.get("codex_task_reports")
        if "changed_files" in source and isinstance(source.get("changed_files"), list):
            manifest["changed_files"] = source.get("changed_files")
        if "expected_invocation_ledger" in source:
            manifest["expected_invocation_ledger"] = source.get("expected_invocation_ledger")
        if "expected_invocations" in source and isinstance(source.get("expected_invocations"), list):
            manifest["expected_invocations"] = source.get("expected_invocations")
        if "source_baseline" in source and isinstance(source.get("source_baseline"), dict):
            manifest["source_baseline"] = source.get("source_baseline")
        if "validation" in source and isinstance(source.get("validation"), dict):
            manifest["validation"] = source.get("validation")
        if "safety" in source and isinstance(source.get("safety"), dict):
            manifest["safety"] = source.get("safety")
        if "artifact_summary" in source and isinstance(source.get("artifact_summary"), dict):
            manifest["artifact_summary"] = source.get("artifact_summary")
        if "hook_observations" in source and isinstance(source.get("hook_observations"), dict):
            manifest["hook_observations"] = source.get("hook_observations")
        if "subagents" in source and isinstance(source.get("subagents"), dict):
            manifest["subagents"] = source.get("subagents")
    return manifest


def main():
    args = parse_args()
    repo_root = repo_root_from_script()
    runs_root = Path(args.runs_root) if args.runs_root else (repo_root / ".codex" / "runs")
    if not runs_root.is_absolute():
        runs_root = repo_root / runs_root
    run_root = runs_root / args.run_id
    manifest_path = Path(args.manifest_path) if args.manifest_path else (run_root / "run.json")
    if not manifest_path.is_absolute():
        manifest_path = repo_root / manifest_path

    default_data = default_manifest(repo_root, args.run_id)
    existing_data = load_manifest_candidate(manifest_path)
    base_manifest_path = None
    if args.base_manifest:
        base_manifest_path = Path(args.base_manifest)
        if not base_manifest_path.is_absolute():
            base_manifest_path = repo_root / base_manifest_path
    base_data = load_manifest_candidate(base_manifest_path) if base_manifest_path else None
    manifest = merge_manifests(default_data, existing_data, base_data)
    manifest["run_id"] = args.run_id

    validation_warnings = []
    existing_validation = manifest.get("validation") if isinstance(manifest.get("validation"), dict) else {}
    validation_commands = []
    if isinstance(existing_validation.get("commands"), list):
        validation_commands.extend(existing_validation.get("commands"))
    validation_warnings.extend(existing_validation.get("warnings") if isinstance(existing_validation.get("warnings"), list) else [])

    report_paths = collect_report_paths(repo_root, run_root)
    manifest["codex_task_reports"] = unique_list(
        [normalize_repo_path(item) for item in manifest.get("codex_task_reports", []) if isinstance(item, str)] + report_paths
    )

    subagents, subagent_warnings, subagent_changed_files, subagent_agents = collect_subagents(repo_root, run_root, args.run_id)
    validation_warnings.extend(subagent_warnings)
    manifest["subagents"] = subagents

    expected_invocations, expected_warnings, expected_ledger_present = load_expected_invocation_ledger(
        repo_root, run_root
    )
    cancelled_runtime_agent_ids = load_cancelled_runtime_agent_ids(run_root)
    validation_warnings.extend(expected_warnings)
    if expected_ledger_present:
        expected_records = expected_invocations
        manifest["expected_invocation_ledger"] = repo_relative(repo_root, run_root / "expected-invocations.jsonl")
        manifest["expected_invocations"] = expected_invocations
    else:
        expected_records = subagents["records"]
        add_warning(
            validation_warnings,
            "expected_invocation_ledger_missing",
            repo_relative(repo_root, run_root),
            "Expected invocation ledger is missing; legacy subagent records are used only for historical compatibility.",
        )

    hook_summary, hook_warnings, safety_updates = collect_hook_observations(
        repo_root,
        run_root,
        args.run_id,
        args.hook_log,
        expected_records=expected_records,
        ignored_runtime_agent_ids=cancelled_runtime_agent_ids,
    )
    validation_warnings.extend(hook_warnings)
    manifest["hook_observations"] = hook_summary

    baseline_data = manifest.get("source_baseline") if isinstance(manifest.get("source_baseline"), dict) else None
    baseline_files = baseline_data.get("changed_files", []) if baseline_data else []
    if baseline_data is None:
        add_warning(
            validation_warnings,
            "source_baseline_missing",
            repo_relative(repo_root, manifest_path),
            "Run baseline is missing; current source changes cannot be distinguished from pre-existing changes.",
        )
    current_files, current_files_available = current_source_changed_files(repo_root)
    if not current_files_available:
        add_warning(
            validation_warnings,
            "source_changed_files_unavailable",
            repo_relative(repo_root, manifest_path),
            "Git status could not be read; existing changed_files are preserved and accepted subagent changes are merged.",
        )
        manifest["changed_files"] = preserve_known_changed_files(
            manifest.get("changed_files", []), subagent_changed_files
        )
    else:
        expected_delta = expected_file_delta(repo_root, baseline_data)
        manifest["changed_files"] = aggregate_changed_files(
            baseline_files,
            unique_list(current_files + expected_delta),
            subagent_changed_files,
        )
    manifest["agents_used"] = unique_list(
        [item for item in manifest.get("agents_used", []) if isinstance(item, str) and item] + subagent_agents
    )

    safety = manifest.get("safety") if isinstance(manifest.get("safety"), dict) else {}
    safety["network"] = bool(safety.get("network"))
    safety["delete_attempt_blocked"] = bool(safety.get("delete_attempt_blocked")) or safety_updates["delete_attempt_blocked"]
    safety["git_mutation_attempt_blocked"] = bool(safety.get("git_mutation_attempt_blocked")) or safety_updates["git_mutation_attempt_blocked"]
    parent_scope_violation = bool(safety.get("parent_scope_violation"))
    subagent_scope_violation = subagents["summary"]["scope_violations"] > 0
    runtime_compliance_violation = bool(manifest["hook_observations"]["runtime_agent_compliance"]["violations"])
    if "parent_scope_violation" not in safety and bool(safety.get("scope_violation")):
        add_warning(
            validation_warnings,
            "legacy_scope_violation_unattributed",
            repo_relative(repo_root, manifest_path),
            "Existing scope_violation=true has no parent/subagent/runtime attribution; it is preserved as a parent-scope warning.",
        )
        parent_scope_violation = True
    safety["parent_scope_violation"] = parent_scope_violation
    safety["subagent_scope_violation"] = subagent_scope_violation
    safety["runtime_compliance_violation"] = runtime_compliance_violation
    safety["scope_violation"] = parent_scope_violation or subagent_scope_violation or runtime_compliance_violation
    manifest["safety"] = safety

    evaluation_path = run_root / "evaluation.json"
    evaluation_present = evaluation_path.exists()
    if evaluation_present:
        manifest["evaluation_path"] = manifest.get("evaluation_path") or repo_relative(repo_root, evaluation_path)
        try:
            evaluation = load_json(evaluation_path)
        except (OSError, json.JSONDecodeError) as exc:
            add_warning(validation_warnings, "evaluation_invalid_json", repo_relative(repo_root, evaluation_path), str(exc))
        else:
            if isinstance(evaluation, dict):
                taxonomy_errors = validate_failure_taxonomy_relation(evaluation)
                for error in taxonomy_errors:
                    add_warning(
                        validation_warnings,
                        "failure_taxonomy_relation_invalid",
                        repo_relative(repo_root, evaluation_path),
                        error,
                    )
                if evaluation.get("run_id") == args.run_id:
                    manifest["primary_failure_category"] = evaluation.get("primary_failure_category")
                else:
                    add_warning(
                        validation_warnings,
                        "evaluation_run_id_mismatch",
                        repo_relative(repo_root, evaluation_path),
                        f"run_id={evaluation.get('run_id')!r}",
                    )

    manifest["validation"] = {
        "status": merge_validation_status(existing_validation.get("status"), validation_commands, unique_list(validation_warnings)),
        "commands": unique_list(validation_commands),
        "warnings": unique_list(validation_warnings),
    }
    manifest["artifact_summary"] = {
        "codex_task_report_count": len(manifest["codex_task_reports"]),
        "hook_event_count": sum(hook_summary["event_counts"].values()),
        "subagent_run_count": subagents["summary"]["total"],
        "evaluation_present": evaluation_present,
    }

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    if args.strict and manifest["validation"]["warnings"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
