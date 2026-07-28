#!/usr/bin/env bash
set -euo pipefail

task_node_dir="/mnt/c/Users/sella/Documents/qa-training-store/.codex/tmp/20260728-115847-JST/bin"
export PATH="$task_node_dir:$PATH"

exec pnpm "$@"
