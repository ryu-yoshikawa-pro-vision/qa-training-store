#!/usr/bin/env python3
import argparse
import copy
import json
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Aggregate run-local artifacts into run.json.")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--runs-root")
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
            "schema_version": 2,
            "run_id": run_id,
            "task_type": "implementation",
            "workflow_level": "standard",
            "preset": "safe",
            "runtime": "host",
            "repo": None,
            "branch": None,
            "base_branch": None,
            "codex_task_reports": [],
            "changed_files": [],
            "validation": {"status": "not_run", "commands": [], "warnings": []},
            "safety": {
                "network": False,
                "scope_violation": False,
            },
            "artifact_summary": {
                "codex_task_report_count": 0,
                "evaluation_present": False,
            },
            "evaluation_path": None,
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
    existing_is_v1 = isinstance(existing_data, dict) and existing_data.get("schema_version") == 1
    base_is_v1 = isinstance(base_data, dict) and base_data.get("schema_version") == 1
    legacy_source = existing_data if existing_is_v1 else (base_data if base_is_v1 else None)
    manifest["schema_version"] = 1 if legacy_source is not None else 2
    if legacy_source is None:
        for key in ("agents_used", "hook_observations", "subagents"):
            manifest.pop(key, None)
        safety = manifest.get("safety")
        if isinstance(safety, dict):
            for key in ("delete_attempt_blocked", "git_mutation_attempt_blocked"):
                safety.pop(key, None)
        summary = manifest.get("artifact_summary")
        if isinstance(summary, dict):
            for key in ("hook_event_count", "subagent_run_count"):
                summary.pop(key, None)

    for source in (base_data or {}, existing_data or {}):
        for key in ("run_id", "task_type", "workflow_level", "preset", "runtime", "repo", "branch", "base_branch", "evaluation_path", "status", "primary_failure_category"):
            value = source.get(key)
            if value is not None:
                manifest[key] = copy.deepcopy(value)
        if "codex_task_reports" in source and isinstance(source.get("codex_task_reports"), list):
            manifest["codex_task_reports"] = copy.deepcopy(source.get("codex_task_reports"))
        if "changed_files" in source and isinstance(source.get("changed_files"), list):
            manifest["changed_files"] = copy.deepcopy(source.get("changed_files"))
        if "validation" in source and isinstance(source.get("validation"), dict):
            manifest["validation"] = copy.deepcopy(source.get("validation"))
        if "safety" in source and isinstance(source.get("safety"), dict):
            manifest.setdefault("safety", {})["network"] = bool(source["safety"].get("network"))
            manifest.setdefault("safety", {})["scope_violation"] = bool(source["safety"].get("scope_violation"))
        if "artifact_summary" in source and isinstance(source.get("artifact_summary"), dict):
            for key in ("codex_task_report_count", "evaluation_present"):
                if key in source["artifact_summary"]:
                    manifest.setdefault("artifact_summary", {})[key] = copy.deepcopy(source["artifact_summary"][key])

    if legacy_source is not None:
        for key in ("agents_used", "hook_observations", "subagents"):
            if key in legacy_source:
                manifest[key] = copy.deepcopy(legacy_source[key])
        legacy_safety = legacy_source.get("safety")
        if isinstance(legacy_safety, dict):
            for key in ("delete_attempt_blocked", "git_mutation_attempt_blocked"):
                if key in legacy_safety:
                    manifest.setdefault("safety", {})[key] = copy.deepcopy(legacy_safety[key])
        legacy_summary = legacy_source.get("artifact_summary")
        if isinstance(legacy_summary, dict):
            for key, value in legacy_summary.items():
                if key not in ("codex_task_report_count", "evaluation_present"):
                    manifest.setdefault("artifact_summary", {})[key] = copy.deepcopy(value)
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

    manifest["changed_files"] = unique_list(
        [normalize_repo_path(item) for item in manifest.get("changed_files", []) if isinstance(item, str)]
    )

    safety = manifest.get("safety") if isinstance(manifest.get("safety"), dict) else {}
    safety["network"] = bool(safety.get("network"))
    safety["scope_violation"] = bool(safety.get("scope_violation"))
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
    artifact_summary = {
        "codex_task_report_count": len(manifest["codex_task_reports"]),
        "evaluation_present": evaluation_present,
    }
    if manifest.get("schema_version") == 1:
        existing_summary = manifest.get("artifact_summary")
        if isinstance(existing_summary, dict):
            for key, value in existing_summary.items():
                if key not in artifact_summary:
                    artifact_summary[key] = copy.deepcopy(value)
    manifest["artifact_summary"] = artifact_summary

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    if args.strict and manifest["validation"]["warnings"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
