#!/usr/bin/env bash
set -euo pipefail
: "${AUTOMATION_APK_PATH:?AUTOMATION_APK_PATH is required}"
: "${PRODUCTION_APK_PATH:?PRODUCTION_APK_PATH is required}"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}"

test -f "$AUTOMATION_APK_PATH"
test -s "$AUTOMATION_APK_PATH"
test -f "$PRODUCTION_APK_PATH"
test -s "$PRODUCTION_APK_PATH"

declare -a HBC_PATHS=()
extract_hermes_candidates() {
  local apk_path="$1"
  local output_dir="$2"
  local entry
  local index=0
  local -a entries=()

  mkdir -p "$output_dir"
  mapfile -t entries < <(
    unzip -Z1 "$apk_path" |
      grep -E '^assets/.*\.(bundle|hbc)$' || true
  )
  if ((${#entries[@]} == 0)); then
    echo "APK has no JavaScript/Hermes candidate asset: $apk_path" >&2
    return 1
  fi

  HBC_PATHS=()
  for entry in "${entries[@]}"; do
    local output_path="$output_dir/bundle-${index}.hbc"
    unzip -p "$apk_path" "$entry" > "$output_path"
    test -s "$output_path"
    HBC_PATHS+=("$output_path")
    index=$((index + 1))
  done
}

validator_args=()
extract_hermes_candidates "$AUTOMATION_APK_PATH" "$RUNNER_TEMP/native-bundle-guard/automation-hbc"
for path in "${HBC_PATHS[@]}"; do
  validator_args+=(--automation-bundle-path "$path")
done
extract_hermes_candidates "$PRODUCTION_APK_PATH" "$RUNNER_TEMP/native-bundle-guard/production-hbc"
for path in "${HBC_PATHS[@]}"; do
  validator_args+=(--production-bundle-path "$path")
done

pnpm run validate:native-production-bundle "${validator_args[@]}"
