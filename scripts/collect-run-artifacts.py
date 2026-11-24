#!/usr/bin/env python3
import argparse
import copy
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys


def parse_args():
    parser = argparse.ArgumentParser(description="Aggregate run-local artifacts into run.json.")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--runs-root")
    parser.add_argument("--manifest-path")
    parser.add_argument("--base-manifest")
    parser.add_argument("--refresh-git-changed-files", action="store_true")
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


def assert_no_reparse_components(path: Path, description: str):
    absolute_path = Path(os.path.abspath(path))
    current = Path(absolute_path.anchor)
    reparse_flag = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    for part in absolute_path.parts[1:]:
        current = current / part
        try:
            metadata = current.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(metadata.st_mode) or getattr(metadata, "st_file_attributes", 0) & reparse_flag:
            raise ValueError(f"{description} must not contain a symlink or reparse point: {current}")


def resolve_run_paths(repo_root: Path, args):
    if not re.fullmatch(r"\d{8}-\d{6}-JST", args.run_id):
        raise ValueError("--run-id must match YYYYMMDD-HHMMSS-JST")

    canonical_repo_root = repo_root.resolve(strict=True)
    expected_runs_root = canonical_repo_root / "runs"
    runs_root = Path(args.runs_root) if args.runs_root else expected_runs_root
    if not runs_root.is_absolute():
        runs_root = canonical_repo_root / runs_root
    runs_root = Path(os.path.abspath(runs_root))
    assert_no_reparse_components(runs_root, "Run root")
    if runs_root.resolve(strict=False) != expected_runs_root:
        raise ValueError("--runs-root must resolve to the repository's direct runs directory")
    if not runs_root.is_dir():
        raise ValueError(f"Run root does not exist: {runs_root}")

    run_root = runs_root / args.run_id
    assert_no_reparse_components(run_root, "Run directory")
    if not run_root.is_dir():
        raise ValueError(f"Run directory does not exist: runs/{args.run_id}")
    canonical_run_root = run_root.resolve(strict=True)
    if canonical_run_root != expected_runs_root / args.run_id:
        raise ValueError("Run directory must resolve directly under runs/<id>")

    legacy_run_root = canonical_repo_root / ".codex" / "runs" / args.run_id
    try:
        legacy_run_root.lstat()
    except FileNotFoundError:
        pass
    else:
        raise ValueError(
            f"Ambiguous Run ID exists in both runs/{args.run_id} and .codex/runs/{args.run_id}"
        )

    manifest_path = Path(args.manifest_path) if args.manifest_path else run_root / "run.json"
    if not manifest_path.is_absolute():
        manifest_path = canonical_repo_root / manifest_path
    manifest_path = Path(os.path.abspath(manifest_path))
    assert_no_reparse_components(manifest_path, "Manifest path")
    try:
        manifest_path.relative_to(canonical_run_root)
    except ValueError as exc:
        raise ValueError("--manifest-path must remain inside the selected runs/<id> directory") from exc
    if manifest_path == canonical_run_root or (manifest_path.exists() and not manifest_path.is_file()):
        raise ValueError("--manifest-path must identify a file inside runs/<id>")

    base_manifest_path = None
    if args.base_manifest:
        base_manifest_path = Path(args.base_manifest)
        if not base_manifest_path.is_absolute():
            base_manifest_path = canonical_repo_root / base_manifest_path
        base_manifest_path = Path(os.path.abspath(base_manifest_path))
        assert_no_reparse_components(base_manifest_path, "Base manifest path")
        if base_manifest_path == manifest_path or (
            base_manifest_path.exists()
            and manifest_path.exists()
            and os.path.samefile(base_manifest_path, manifest_path)
        ):
            raise ValueError("--base-manifest must not be the output manifest path")

    return canonical_repo_root, expected_runs_root, canonical_run_root, manifest_path, base_manifest_path


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


def collect_git_changed_files(repo_root: Path):
    commands = (
        ("git", "diff", "--name-only", "--relative", "-z", "HEAD", "--"),
        ("git", "ls-files", "--others", "--exclude-standard", "-z"),
    )
    changed_files = []
    for command in commands:
        try:
            result = subprocess.run(
                command,
                cwd=repo_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
        except OSError as exc:
            raise RuntimeError(f"Git command failed to start: {command[0]}: {exc}") from exc
        if result.returncode != 0:
            detail = os.fsdecode(result.stderr).strip()
            suffix = f": {detail}" if detail else ""
            raise RuntimeError(
                f"Git command failed (exit={result.returncode}): {' '.join(command)}{suffix}"
            )

        for raw_path in result.stdout.split(b"\0"):
            if not raw_path:
                continue
            normalized = normalize_repo_path(os.fsdecode(raw_path))
            if (
                normalized == ".codex/runs"
                or normalized.startswith(".codex/runs/")
                or normalized == "runs"
                or normalized.startswith("runs/")
            ):
                continue
            changed_files.append(normalized)

    return unique_list(changed_files)


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
    data.pop("preset", None)
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
    assert_no_reparse_components(reports_dir, "Run report directory")
    if not reports_dir.exists():
        return []
    if not reports_dir.is_dir():
        raise ValueError(f"Run report path is not a directory: {reports_dir}")
    report_paths = []
    for path in sorted(reports_dir.glob("*.report.json")):
        assert_no_reparse_components(path, "Run report path")
        try:
            path.resolve(strict=True).relative_to(run_root)
        except ValueError as exc:
            raise ValueError(f"Run report path resolves outside runs/<id>: {path}") from exc
        if not path.is_file():
            raise ValueError(f"Run report path resolves outside runs/<id>: {path}")
        report_paths.append(repo_relative(repo_root, path))
    return report_paths


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
    if existing_data is not None:
        legacy_source = existing_data if existing_is_v1 else None
    else:
        base_is_v1 = isinstance(base_data, dict) and base_data.get("schema_version") == 1
        legacy_source = base_data if base_is_v1 else None
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
            if value is not None or (key == "preset" and key in source):
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
    try:
        repo_root, _runs_root, run_root, manifest_path, base_manifest_path = resolve_run_paths(repo_root, args)
    except (OSError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc

    default_data = default_manifest(repo_root, args.run_id)
    existing_data = load_manifest_candidate(manifest_path)
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

    existing_changed_files = [
        normalize_repo_path(item) for item in manifest.get("changed_files", []) if isinstance(item, str)
    ]
    if args.refresh_git_changed_files:
        existing_changed_files.extend(collect_git_changed_files(repo_root))
    manifest["changed_files"] = unique_list(existing_changed_files)

    safety = manifest.get("safety") if isinstance(manifest.get("safety"), dict) else {}
    safety["network"] = bool(safety.get("network"))
    safety["scope_violation"] = bool(safety.get("scope_violation"))
    manifest["safety"] = safety

    evaluation_path = run_root / "evaluation.json"
    try:
        assert_no_reparse_components(evaluation_path, "Run evaluation path")
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    evaluation_present = evaluation_path.exists()
    manifest["evaluation_path"] = repo_relative(repo_root, evaluation_path) if evaluation_present else None
    if args.strict and not evaluation_present:
        add_warning(
            validation_warnings,
            "evaluation_missing",
            repo_relative(repo_root, evaluation_path),
            "Strict collection requires evaluation.json",
        )
    if evaluation_present:
        if not evaluation_path.is_file():
            raise SystemExit(f"Run evaluation path is not a file: {evaluation_path}")
        try:
            evaluation = load_json(evaluation_path)
        except (OSError, json.JSONDecodeError) as exc:
            add_warning(validation_warnings, "evaluation_invalid_json", repo_relative(repo_root, evaluation_path), str(exc))
        else:
            evaluation_repo_path = repo_relative(repo_root, evaluation_path)
            if not isinstance(evaluation, dict):
                add_warning(
                    validation_warnings,
                    "evaluation_not_object",
                    evaluation_repo_path,
                    "Evaluation JSON must be an object",
                )
            else:
                schema_valid = not args.strict
                if args.strict:
                    schema_path = (repo_root.resolve() / ".codex" / "templates" / "evaluation.schema.json").resolve()
                    validator_path = (repo_root.resolve() / "scripts" / "validate-output-schema.py").resolve()
                    try:
                        schema_result = subprocess.run(
                            [sys.executable, str(validator_path), str(schema_path), str(evaluation_path.resolve())],
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                            check=False,
                        )
                    except OSError:
                        schema_result = None
                    if schema_result is None:
                        add_warning(
                            validation_warnings,
                            "evaluation_schema_validator_failed",
                            evaluation_repo_path,
                            "Evaluation schema validator could not run",
                        )
                        schema_valid = False
                    elif schema_result.returncode != 0:
                        add_warning(
                            validation_warnings,
                            "evaluation_schema_invalid",
                            evaluation_repo_path,
                            "Evaluation does not satisfy the configured schema",
                        )
                        schema_valid = False
                    else:
                        schema_valid = True

                if evaluation.get("run_id") == args.run_id:
                    if schema_valid:
                        manifest["primary_failure_category"] = evaluation.get("primary_failure_category")
                else:
                    add_warning(
                        validation_warnings,
                        "evaluation_run_id_mismatch",
                        evaluation_repo_path,
                        "Evaluation run_id does not match the selected Run",
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

    try:
        assert_no_reparse_components(manifest_path.parent, "Manifest parent path")
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    if args.strict and manifest["validation"]["warnings"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
