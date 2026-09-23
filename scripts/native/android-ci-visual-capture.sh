#!/usr/bin/env bash
set -euo pipefail
: "${CAPTURE_CASE_SELECTION:?CAPTURE_CASE_SELECTION is required}"
: "${ADB:?ADB is required}"
: "${MAESTRO_BIN:?MAESTRO_BIN is required}"
: "${APK_PATH:?APK_PATH is required}"
: "${ANDROID_OBSERVED_PROFILE_JSON:?ANDROID_OBSERVED_PROFILE_JSON is required}"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}"
: "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"

BATCH_ROOT="$RUNNER_TEMP/spec-visuals"
RAW_ROOT="$BATCH_ROOT/raw"
BATCH_MANIFEST="$BATCH_ROOT/batch.manifest.json"
CASE_LIST_JSON="$RUNNER_TEMP/android-capture-cases.json"
mkdir -p "$RAW_ROOT"

if [[ "$CAPTURE_CASE_SELECTION" == "all" ]]; then
  REQUESTED_MODE="all"
  pnpm exec tsx scripts/spec/android-visual-capture.ts list-cases > "$CASE_LIST_JSON"
else
  REQUESTED_MODE="single"
  jq -n --arg capture_case_key "$CAPTURE_CASE_SELECTION" \
    '{platform: "android", count: 1, capture_case_keys: [$capture_case_key]}' \
    > "$CASE_LIST_JSON"
fi

mapfile -t CASE_KEYS < <(jq -r '.capture_case_keys[]' "$CASE_LIST_JSON")
EXPECTED_CASE_COUNT="${#CASE_KEYS[@]}"
test "$EXPECTED_CASE_COUNT" -gt 0
CAPTURED_CASE_KEYS=()
FAILED_CASE_KEY=""
FAILURE_MESSAGE=""

capture_case() (
  set -euo pipefail
  local CASE_KEY="$1"
  local CASE_INDEX="$2"
  local CASE_JSON="$RUNNER_TEMP/android-capture-case-${CASE_INDEX}.json"
  pnpm exec tsx scripts/spec/android-visual-capture.ts describe-case \
    --capture-case-key "$CASE_KEY" \
    > "$CASE_JSON"
  local SCREEN_ID STATE_SLUG SCENARIO ROUTE ROLE SETUP READY NATIVE_SETUP_ID
  local NATIVE_SETUP_SUBFLOW NATIVE_RESET_PAYMENT_DELAY_MS NATIVE_CHECKOUT_STEP
  local NATIVE_READY_ID CAPTURE_MODE CANONICAL_ASSET_PATH
  SCREEN_ID="$(jq -r '.screen_id' "$CASE_JSON")"
  STATE_SLUG="$(jq -r '.state_slug' "$CASE_JSON")"
  SCENARIO="$(jq -r '.scenario' "$CASE_JSON")"
  ROUTE="$(jq -r '.route' "$CASE_JSON")"
  ROLE="$(jq -r '.role' "$CASE_JSON")"
  SETUP="$(jq -r '.setup' "$CASE_JSON")"
  READY="$(jq -r '.ready' "$CASE_JSON")"
  NATIVE_SETUP_ID="$(jq -r '.native_setup_id' "$CASE_JSON")"
  NATIVE_SETUP_SUBFLOW="$(jq -r '.native_setup_subflow // ""' "$CASE_JSON")"
  NATIVE_RESET_PAYMENT_DELAY_MS="$(jq -r '.native_reset_payment_delay_ms' "$CASE_JSON")"
  NATIVE_CHECKOUT_STEP="$(jq -r '.native_checkout_step // ""' "$CASE_JSON")"
  NATIVE_READY_ID="$(jq -r '.native_ready_id' "$CASE_JSON")"
  CAPTURE_MODE="$(jq -r '.capture_mode' "$CASE_JSON")"
  CANONICAL_ASSET_PATH="$(jq -r '.canonical_asset_path' "$CASE_JSON")"
  for value in "$SCREEN_ID" "$STATE_SLUG" "$SCENARIO" "$ROUTE" "$ROLE" "$SETUP" "$READY" "$NATIVE_SETUP_ID" "$NATIVE_RESET_PAYMENT_DELAY_MS" "$NATIVE_READY_ID" "$CAPTURE_MODE" "$CANONICAL_ASSET_PATH"; do
    test -n "$value"
  done
  [[ "$NATIVE_RESET_PAYMENT_DELAY_MS" =~ ^[0-9]+$ ]]
  if [[ -n "$NATIVE_CHECKOUT_STEP" ]]; then
    case "$NATIVE_CHECKOUT_STEP" in
      address|payment|confirm) ;;
      *) echo "Unexpected native checkout step: $NATIVE_CHECKOUT_STEP" >&2; exit 1 ;;
    esac
  fi
  if [[ -n "$NATIVE_SETUP_SUBFLOW" ]]; then
    test -f "$GITHUB_WORKSPACE/maestro/$NATIVE_SETUP_SUBFLOW"
  fi
  echo "capture_case_key=$CASE_KEY"
  echo "screen_id=$SCREEN_ID"
  echo "state_slug=$STATE_SLUG"
  echo "scenario=$SCENARIO"
  echo "route=$ROUTE"
  echo "role=$ROLE"
  echo "setup=$SETUP"
  echo "ready=$READY"
  echo "native_setup_id=$NATIVE_SETUP_ID"
  echo "native_setup_subflow=$NATIVE_SETUP_SUBFLOW"
  echo "native_reset_payment_delay_ms=$NATIVE_RESET_PAYMENT_DELAY_MS"
  echo "native_checkout_step=$NATIVE_CHECKOUT_STEP"
  echo "native_ready_id=$NATIVE_READY_ID"
  echo "capture_mode=$CAPTURE_MODE"
  echo "canonical_asset_path=$CANONICAL_ASSET_PATH"
  local RAW_DIR="$RAW_ROOT/$SCREEN_ID/$STATE_SLUG"
  local RAW_PNG="$RAW_DIR/android.png"
  local MANIFEST="$RAW_DIR/android.manifest.json"
  mkdir -p "$RAW_DIR"
  local scenario_encoded reset_url route_without_leading_slash route_url route_is_root
  scenario_encoded="$(jq -rn --arg value "$SCENARIO" '$value | @uri')"
  reset_url="scenario-shop://test-control/reset?version=1&scenario=${scenario_encoded}&clock=2026-07-01T03%3A00%3A00.000Z&paymentDelayMs=${NATIVE_RESET_PAYMENT_DELAY_MS}"
  route_without_leading_slash="${ROUTE#/}"
  route_url="scenario-shop://${route_without_leading_slash}"
  route_is_root="false"
  if [[ "$ROUTE" == "/" ]]; then route_is_root="true"; fi
  local READY_COUNT
  READY_COUNT="$(jq '.ready_conditions | length' "$CASE_JSON")"
  test "$READY_COUNT" -ge 1
  test "$READY_COUNT" -le 3
  local case_artifact_dir="$RUNNER_TEMP/maestro-artifacts/visual-capture/$SCREEN_ID/$STATE_SLUG"
  local case_junit="$RUNNER_TEMP/maestro-visual-capture-${CASE_INDEX}.xml"
  local -a maestro_env_args
  maestro_env_args=(
    --env "RESET_URL=$reset_url"
    --env "ROUTE_URL=$route_url"
    --env "ROUTE_IS_ROOT=$route_is_root"
    --env "ROLE=$ROLE"
    --env "SETUP_ID=$NATIVE_SETUP_ID"
    --env "SETUP_SUBFLOW=$NATIVE_SETUP_SUBFLOW"
    --env "RESET_PAYMENT_DELAY_MS=$NATIVE_RESET_PAYMENT_DELAY_MS"
    --env "CHECKOUT_STEP=$NATIVE_CHECKOUT_STEP"
    --env "READY_ID=$NATIVE_READY_ID"
    --env "SCREEN_ID=$SCREEN_ID"
    --env "STATE_SLUG=$STATE_SLUG"
  )
  local slot index ready_kind ready_value
  for slot in 1 2 3; do
    index=$((slot - 1))
    ready_kind="$(jq -r ".ready_conditions[$index].kind // \"\"" "$CASE_JSON")"
    ready_value="$(jq -r ".ready_conditions[$index].value // \"\"" "$CASE_JSON")"
    maestro_env_args+=(--env "READY_KIND_${slot}=$ready_kind")
    maestro_env_args+=(--env "READY_VALUE_${slot}=$ready_value")
  done
  bash "$GITHUB_WORKSPACE/scripts/native/android-maestro-run.sh" \
    --flow "$GITHUB_WORKSPACE/maestro/native-visual-capture.yaml" \
    --test-output-dir "$case_artifact_dir" \
    --junit-output "$case_junit" \
    "${maestro_env_args[@]}"
  timeout 30 "$ADB" exec-out screencap -p > "$RAW_PNG"
  test -s "$RAW_PNG"
  pnpm exec tsx scripts/spec/android-visual-capture.ts write-manifest \
    --capture-case-key "$CASE_KEY" \
    --source-commit-sha "$GITHUB_SHA" \
    --automation-apk-path "$APK_PATH" \
    --raw-png-path "$RAW_PNG" \
    --output "$MANIFEST" \
    --observed-profile-json "$ANDROID_OBSERVED_PROFILE_JSON" \
    --system-image google_apis \
    --avd-profile pixel_2 \
    --workflow-run-id "$GITHUB_RUN_ID"
)

case_index=0
for CASE_KEY in "${CASE_KEYS[@]}"; do
  case_index=$((case_index + 1))
  case_log="$RUNNER_TEMP/android-capture-case-${case_index}.log"
  set +e
  capture_case "$CASE_KEY" "$case_index" > "$case_log" 2>&1
  case_status=$?
  set -e
  cat "$case_log"
  if [[ "$case_status" -ne 0 ]]; then
    FAILED_CASE_KEY="$CASE_KEY"
    FAILURE_MESSAGE="capture failed with exit code $case_status"
    cp "$case_log" "$BATCH_ROOT/failed-case-${case_index}.log"
    break
  fi
  CAPTURED_CASE_KEYS+=("$CASE_KEY")
done

if [[ -z "$FAILED_CASE_KEY" && "${#CAPTURED_CASE_KEYS[@]}" -eq "$EXPECTED_CASE_COUNT" ]]; then
  COMPLETE=true
else
  COMPLETE=false
fi
capture_case_keys_json="$(jq -c '.capture_case_keys' "$CASE_LIST_JSON")"
if [[ "${#CAPTURED_CASE_KEYS[@]}" -eq 0 ]]; then
  captured_case_keys_json='[]'
else
  captured_case_keys_json="$(printf '%s\n' "${CAPTURED_CASE_KEYS[@]}" | jq -R . | jq -s -c '.')"
fi
jq -n \
  --argjson schema_version 1 \
  --arg workflow_run_id "$GITHUB_RUN_ID" \
  --arg source_commit_sha "$GITHUB_SHA" \
  --arg requested_mode "$REQUESTED_MODE" \
  --argjson expected_case_count "$EXPECTED_CASE_COUNT" \
  --argjson capture_case_keys "$capture_case_keys_json" \
  --argjson captured_case_count "${#CAPTURED_CASE_KEYS[@]}" \
  --argjson captured_case_keys "$captured_case_keys_json" \
  --argjson complete "$COMPLETE" \
  --arg failed_case_key "$FAILED_CASE_KEY" \
  --arg failure_message "$FAILURE_MESSAGE" \
  '{schema_version: $schema_version, workflow_run_id: $workflow_run_id, source_commit_sha: $source_commit_sha, requested_mode: $requested_mode, expected_case_count: $expected_case_count, capture_case_keys: $capture_case_keys, captured_case_count: $captured_case_count, captured_case_keys: $captured_case_keys, complete: $complete} + (if $failed_case_key == "" then {} else {failed_case_key: $failed_case_key, failure_message: $failure_message} end)' \
  > "$BATCH_MANIFEST"
cat "$BATCH_MANIFEST"
if [[ "$COMPLETE" != true ]]; then
  echo "Android visual batch is incomplete; canonical promotion is forbidden." >&2
  exit 1
fi
