#!/usr/bin/env bash
set -u

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/../.." && pwd -P)"

json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

normalize_enum_value() {
  local raw="$1"
  local default_value="$2"
  local fallback_value="$3"
  shift 3

  NORMALIZED_VALUE="$default_value"
  ORIGINAL_VALUE=""

  if [[ -z "${raw//[[:space:]]/}" ]]; then
    return 0
  fi

  local allowed
  for allowed in "$@"; do
    if [[ "$raw" == "$allowed" ]]; then
      NORMALIZED_VALUE="$raw"
      return 0
    fi
  done

  NORMALIZED_VALUE="$fallback_value"
  ORIGINAL_VALUE="$raw"
}

emit_error() {
  printf '%s\n' "$1" >&2
  exit 0
}

hook_input=""
if [[ ! -t 0 ]]; then
  hook_input="$(cat 2>/dev/null || printf '')"
fi

payload_value() {
  local value=""
  if [[ -z "$hook_input" ]] || ! command -v python >/dev/null 2>&1; then
    printf '%s' "$value"
    return 0
  fi
  value="$(printf '%s' "$hook_input" | python -c 'import json, sys
try:
    payload = json.load(sys.stdin)
except Exception:
    payload = {}
for name in sys.argv[1:]:
    candidate = payload.get(name) if isinstance(payload, dict) else None
    if isinstance(candidate, str) and candidate.strip():
        print(candidate)
        break
' "$@" 2>/dev/null || printf '')"
  printf '%s' "$value"
}

payload_event="$(payload_value hook_event_name event)"
payload_source="$(payload_value source)"
payload_cwd="$(payload_value cwd)"
payload_run_id="$(payload_value run_id)"
observed_agent_type="$(payload_value agent_type agentType)"
observed_agent_id="$(payload_value agent_id agentId)"
observed_model="$(payload_value model)"
observed_reasoning_effort="$(payload_value reasoning_effort model_reasoning_effort)"
observed_permission_mode="$(payload_value permission_mode permissionMode)"
observed_session_id="$(payload_value session_id sessionId)"
observed_turn_id="$(payload_value turn_id turnId)"
payload_tool_name="$(payload_value tool_name tool)"
payload_tool_operation="$(payload_value tool_operation operation)"
payload_tool_target="$(payload_value tool_target target)"

observation_log="${CODEX_OBSERVATION_LOG:-$repo_root/.codex/observations/hooks.jsonl}"
tool_name="${CODEX_HOOK_TOOL_NAME:-$payload_tool_name}"
tool_operation="${CODEX_HOOK_TOOL_OPERATION:-$payload_tool_operation}"
tool_target="${CODEX_HOOK_TOOL_TARGET:-$payload_tool_target}"
input_summary="${CODEX_HOOK_INPUT_SUMMARY:-}"
run_id="${CODEX_RUN_ID:-$payload_run_id}"
decision_reason="${CODEX_HOOK_DECISION_REASON:-optional observation hook recorded the event}"
cwd_value="${CODEX_HOOK_CWD:-${payload_cwd:-$(pwd 2>/dev/null || printf '')}}"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)"
event_stamp="$(date -u +%Y%m%dT%H%M%SZ 2>/dev/null || date +%Y%m%dT%H%M%SZ)"
event_id="${event_stamp}-$$"

normalize_enum_value "${CODEX_HOOK_EVENT:-$payload_event}" "ObservationError" "ObservationError" \
  "PreToolUse" "PostToolUse" "SubagentStart" "SubagentStop" "Stop" "WrapperStart" "WrapperStop" "SafetyBlocked" "ObservationError"
event_name="$NORMALIZED_VALUE"
original_event="$ORIGINAL_VALUE"

normalize_enum_value "${CODEX_HOOK_SOURCE:-$payload_source}" "codex_hook" "unknown" \
  "codex_hook" "codex_task" "codex_safe" "subagent" "manual" "unknown"
source_name="$NORMALIZED_VALUE"
original_source="$ORIGINAL_VALUE"

normalize_enum_value "${CODEX_HOOK_SEVERITY:-}" "info" "warning" \
  "debug" "info" "warning" "error" "critical"
severity="$NORMALIZED_VALUE"
original_severity="$ORIGINAL_VALUE"

if [[ -n "$run_id" ]]; then
  run_id_json="\"$(json_escape "$run_id")\""
else
  run_id_json="null"
fi

if [[ -n "$cwd_value" ]]; then
  cwd_json="\"$(json_escape "$cwd_value")\""
else
  cwd_json="null"
fi

if [[ -n "$tool_name" || -n "$tool_operation" || -n "$tool_target" ]]; then
  tool_json="{\"name\":$(if [[ -n "$tool_name" ]]; then printf '"%s"' "$(json_escape "$tool_name")"; else printf 'null'; fi),\"operation\":$(if [[ -n "$tool_operation" ]]; then printf '"%s"' "$(json_escape "$tool_operation")"; else printf 'null'; fi),\"target\":$(if [[ -n "$tool_target" ]]; then printf '"%s"' "$(json_escape "$tool_target")"; else printf 'null'; fi)}"
else
  tool_json="null"
fi

if [[ -n "${input_summary//[[:space:]]/}" ]]; then
  input_summary_json="\"$(json_escape "$input_summary")\""
else
  input_summary_json="null"
fi

metadata_json='{"hook":"observe.sh"'
if [[ -n "$original_event" ]]; then
  metadata_json+=",\"original_event\":\"$(json_escape "$original_event")\""
fi
if [[ -n "$original_source" ]]; then
  metadata_json+=",\"original_source\":\"$(json_escape "$original_source")\""
fi
if [[ -n "$original_severity" ]]; then
  metadata_json+=",\"original_severity\":\"$(json_escape "$original_severity")\""
fi
metadata_json+='}'

log_dir="$(dirname "$observation_log")"
mkdir -p "$log_dir" 2>/dev/null || emit_error "Observation hook: failed to create log directory"

payload="{\"schema_version\":1,\"event_id\":\"$(json_escape "$event_id")\",\"run_id\":$run_id_json,\"timestamp\":\"$(json_escape "$timestamp")\",\"source\":\"$(json_escape "$source_name")\",\"event\":\"$(json_escape "$event_name")\",\"severity\":\"$(json_escape "$severity")\",\"blocking\":false,\"tool\":$tool_json,\"cwd\":$cwd_json,\"input_summary\":$input_summary_json,\"decision\":{\"action\":\"observe\",\"reason\":\"$(json_escape "$decision_reason")\"},\"evidence\":[],\"metadata\":$metadata_json"
if [[ -n "$observed_agent_type" ]]; then payload+=",\"agent_type\":\"$(json_escape "$observed_agent_type")\""; fi
if [[ -n "$observed_agent_id" ]]; then payload+=",\"agent_id\":\"$(json_escape "$observed_agent_id")\""; fi
if [[ -n "$observed_model" ]]; then payload+=",\"model\":\"$(json_escape "$observed_model")\""; fi
if [[ -n "$observed_reasoning_effort" ]]; then payload+=",\"reasoning_effort\":\"$(json_escape "$observed_reasoning_effort")\""; fi
if [[ -n "$observed_permission_mode" ]]; then payload+=",\"permission_mode\":\"$(json_escape "$observed_permission_mode")\""; fi
if [[ -n "$observed_session_id" ]]; then payload+=",\"session_id\":\"$(json_escape "$observed_session_id")\""; fi
if [[ -n "$observed_turn_id" ]]; then payload+=",\"turn_id\":\"$(json_escape "$observed_turn_id")\""; fi
payload+='}'

printf '%s\n' "$payload" >> "$observation_log" 2>/dev/null || emit_error "Observation hook: failed to append event"
exit 0
