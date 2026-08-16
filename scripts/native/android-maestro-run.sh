#!/usr/bin/env bash
set -euo pipefail

PACKAGE_ID="${PACKAGE_ID:-com.ryuyoshikawa.scenarioshop}"
ADB_BIN="${ADB:-adb}"
MAESTRO_BIN="${MAESTRO_BIN:-maestro}"
OUTPUT_DIR=""
JUNIT_PATH=""
FLOW_PATH=""
ENV_ARGS=()

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --flow)
      if [[ "$#" -lt 2 ]]; then
        echo "--flow requires a file path." >&2
        exit 2
      fi
      FLOW_PATH="$2"
      shift 2
      ;;
    --test-output-dir)
      if [[ "$#" -lt 2 ]]; then
        echo "--test-output-dir requires a directory path." >&2
        exit 2
      fi
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --junit-output)
      if [[ "$#" -lt 2 ]]; then
        echo "--junit-output requires a file path." >&2
        exit 2
      fi
      JUNIT_PATH="$2"
      shift 2
      ;;
    --env)
      if [[ "$#" -lt 2 || "${2:-}" != *=* ]]; then
        echo "--env requires KEY=VALUE." >&2
        exit 2
      fi
      ENV_ARGS+=("-e" "$2")
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$FLOW_PATH" || -z "$OUTPUT_DIR" || -z "$JUNIT_PATH" ]]; then
  echo "Usage: android-maestro-run.sh --flow FLOW --test-output-dir DIR --junit-output FILE [--env KEY=VALUE]..." >&2
  exit 2
fi
if [[ ! -f "$FLOW_PATH" ]]; then
  echo "Maestro flow does not exist: $FLOW_PATH" >&2
  exit 2
fi

mkdir -p "$OUTPUT_DIR"

echo "Preparing Android application state before Maestro launch."
timeout 30 "$ADB_BIN" shell am force-stop "$PACKAGE_ID"
pm_clear_output="$(timeout 60 "$ADB_BIN" shell pm clear "$PACKAGE_ID" | tr -d '\r')"
if [[ "$pm_clear_output" != *Success* ]]; then
  echo "Android pm clear did not report Success: $pm_clear_output" >&2
  exit 1
fi
timeout 30 "$ADB_BIN" shell am force-stop "$PACKAGE_ID"

process_stopped=false
for _ in $(seq 1 30); do
  set +e
  package_pids="$(timeout 10 "$ADB_BIN" shell pidof "$PACKAGE_ID" 2>/dev/null)"
  pid_status=$?
  set -e
  if [[ "$pid_status" -ne 0 && "$pid_status" -ne 1 ]]; then
    echo "Unable to verify Android application process termination (status=$pid_status)." >&2
    exit "$pid_status"
  fi
  if [[ "$pid_status" -eq 1 ]]; then
    timeout 10 "$ADB_BIN" get-state >/dev/null
  fi
  if [[ -z "${package_pids//[[:space:]]/}" ]]; then
    process_stopped=true
    break
  fi
  sleep 1
done
if [[ "$process_stopped" != true ]]; then
  echo "Android application process remained after force-stop and pm clear." >&2
  exit 1
fi

echo "Starting Maestro flow after Android state cleanup: $FLOW_PATH"
maestro_args=(test "${ENV_ARGS[@]}" --test-output-dir="$OUTPUT_DIR" --format junit --output "$JUNIT_PATH" "$FLOW_PATH")
"$MAESTRO_BIN" "${maestro_args[@]}"
