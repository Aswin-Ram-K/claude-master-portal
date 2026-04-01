#!/bin/bash
set -euo pipefail

# Claude Master Portal — SessionStart Hook
# Lightweight check: ensure portal is running when a Claude Code session starts.

echo '{"async": true, "asyncTimeout": 30000}'

# Quick check — if portal is already running, exit
if curl -sf http://localhost:3000/api/health &>/dev/null 2>&1; then
  exit 0
fi

# Try to start portal in background
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAUNCHER="$PORTAL_DIR/launcher/portal-dev.sh"

if [ -x "$LAUNCHER" ]; then
  nohup "$LAUNCHER" &>/dev/null &
fi
