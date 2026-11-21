#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/new-run.sh [options]

Options:
  --run-id <id>
  --task-type <plan|review|implementation|investigation|repair|harness-improvement>
  --workflow-level <lightweight|standard|strict>
  --no-plan
  --no-run-manifest
  --force
  -h, --help

Notes:
  - When --run-id is omitted, the script generates YYYYMMDD-HHMMSS-JST using JST.
  - Existing run directories are never overwritten. --force does not change that rule.
EOF
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

run_id=""
task_type="implementation"
workflow_level="standard"
no_plan=0
no_run_manifest=0

generate_run_id() {
  TZ=Asia/Tokyo date +%Y%m%d-%H%M%S-JST
}

validate_run_id() {
  local value="$1"
  [[ "$value" =~ ^[0-9]{8}-[0-9]{6}-JST$ ]]
}

parse_args() {
  while (($#)); do
    case "$1" in
      --run-id)
        [[ $# -ge 2 ]] || { echo "--run-id requires a value" >&2; exit 2; }
        run_id="$2"
        shift 2
        ;;
      --task-type)
        [[ $# -ge 2 ]] || { echo "--task-type requires a value" >&2; exit 2; }
        task_type="$2"
        shift 2
        ;;
      --workflow-level)
        [[ $# -ge 2 ]] || { echo "--workflow-level requires a value" >&2; exit 2; }
        workflow_level="$2"
        shift 2
        ;;
      --no-plan)
        no_plan=1
        shift
        ;;
      --no-run-manifest)
        no_run_manifest=1
        shift
        ;;
      --force)
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        usage >&2
        exit 2
        ;;
    esac
  done
}

render_run_manifest() {
  local template_path="$1"
  local output_path="$2"
  local content
  content="$(<"$template_path")"
  content="${content//<run_id>/$run_id}"
  content="${content//\"task_type\": \"implementation\"/\"task_type\": \"$task_type\"}"
  content="${content//\"workflow_level\": \"standard\"/\"workflow_level\": \"$workflow_level\"}"
  printf '%s\n' "$content" > "$output_path"
}

parse_args "$@"

if [[ -z "$run_id" ]]; then
  run_id="$(generate_run_id)"
fi

if ! validate_run_id "$run_id"; then
  echo "Invalid --run-id: expected YYYYMMDD-HHMMSS-JST" >&2
  exit 2
fi

case "$task_type" in
  plan|review|implementation|investigation|repair|harness-improvement) ;;
  *)
    echo "Invalid --task-type: $task_type" >&2
    exit 2
    ;;
esac

case "$workflow_level" in
  lightweight|standard|strict) ;;
  *)
    echo "Invalid --workflow-level: $workflow_level" >&2
    exit 2
    ;;
esac

runs_root="$repo_root/runs"
legacy_runs_root="$repo_root/.codex/runs"
run_root="$runs_root/$run_id"
legacy_run_root="$legacy_runs_root/$run_id"

validate_runs_root() {
  local canonical_runs_root

  if [[ -L "$runs_root" ]]; then
    echo "Run root must not be a symlink or reparse point: runs" >&2
    exit 1
  fi
  if [[ ! -d "$runs_root" ]]; then
    echo "Run root must be a directory: runs" >&2
    exit 1
  fi

  canonical_runs_root="$(cd -P -- "$runs_root" && pwd -P)"
  if [[ "$canonical_runs_root" != "$repo_root/runs" ]]; then
    echo "Run root must resolve directly to the repository's runs directory: runs" >&2
    exit 1
  fi
}

path_entry_exists() {
  [[ -e "$1" || -L "$1" ]]
}

# --force is retained for compatibility, but an existing ID is never overwritten.
if [[ -e "$runs_root" || -L "$runs_root" ]]; then
  validate_runs_root
  if path_entry_exists "$run_root"; then
    echo "Run directory already exists and will not be overwritten: runs/$run_id" >&2
    exit 1
  fi
fi

if path_entry_exists "$legacy_run_root"; then
  echo "Run ID already exists in the legacy root and will not be overwritten: .codex/runs/$run_id" >&2
  exit 1
fi

for template in \
  "$repo_root/.codex/templates/TASKS.md" \
  "$repo_root/.codex/templates/REPORT.md"; do
  if [[ ! -f "$template" ]]; then
    echo "Required run template is missing: ${template#"$repo_root/"}" >&2
    exit 1
  fi
done
if (( ! no_plan )) && [[ ! -f "$repo_root/.codex/templates/PLAN.md" ]]; then
  echo "Required run template is missing: .codex/templates/PLAN.md" >&2
  exit 1
fi
if (( ! no_run_manifest )) && [[ ! -f "$repo_root/.codex/templates/RUN_MANIFEST.json" ]]; then
  echo "Required run template is missing: .codex/templates/RUN_MANIFEST.json" >&2
  exit 1
fi

if [[ ! -e "$runs_root" && ! -L "$runs_root" ]]; then
  if ! mkdir -- "$runs_root"; then
    echo "Unable to create the repository runs directory safely: runs" >&2
    exit 1
  fi
fi
validate_runs_root

if path_entry_exists "$run_root"; then
  echo "Run directory already exists and will not be overwritten: runs/$run_id" >&2
  exit 1
fi
if path_entry_exists "$legacy_run_root"; then
  echo "Run ID already exists in the legacy root and will not be overwritten: .codex/runs/$run_id" >&2
  exit 1
fi

if ! mkdir -- "$run_root"; then
  echo "Run directory already exists and will not be overwritten: runs/$run_id" >&2
  exit 1
fi
cp "$repo_root/.codex/templates/TASKS.md" "$run_root/TASKS.md"
cp "$repo_root/.codex/templates/REPORT.md" "$run_root/REPORT.md"
if (( ! no_plan )); then
  cp "$repo_root/.codex/templates/PLAN.md" "$run_root/PLAN.md"
fi
if (( ! no_run_manifest )); then
  render_run_manifest "$repo_root/.codex/templates/RUN_MANIFEST.json" "$run_root/run.json"
fi

printf 'Initialized run: runs/%s\n' "$run_id"
