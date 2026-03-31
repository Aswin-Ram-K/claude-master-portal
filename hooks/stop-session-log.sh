#!/bin/bash
set -euo pipefail

# Claude Master Portal — Stop Hook for Session Logging
# Generates a .claude-logs/ entry when a Claude Code session ends.
# Should run BEFORE the git-check stop hook so the log file gets committed.

# Read hook input from stdin
input=$(cat)

# Check for recursion prevention
stop_hook_active=$(echo "$input" | jq -r '.stop_hook_active // empty')
if [[ "$stop_hook_active" = "true" ]]; then
  exit 0
fi

# Only run in git repos
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GENERATOR="$PORTAL_DIR/portal/scripts/generate-session-log.ts"
WORKSPACE="$(pwd)"

# Check if generator script exists
if [ ! -f "$GENERATOR" ]; then
  exit 0
fi

# Check if npx/tsx is available
if ! command -v npx &>/dev/null; then
  exit 0
fi

# Run the session log generator
# Uses the most recent session for this workspace
cd "$PORTAL_DIR/portal" && npx tsx scripts/generate-session-log.ts \
  --workspace "$WORKSPACE" \
  --from-hook 2>/dev/null || true
