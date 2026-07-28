#!/usr/bin/env bash
set -euo pipefail

exec "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" \
  -NoLogo \
  -NoProfile \
  -File "C:\Users\sella\Documents\qa-training-store\.codex\tmp\20260728-115847-JST\ui-review-win.ps1" \
  "$@"
