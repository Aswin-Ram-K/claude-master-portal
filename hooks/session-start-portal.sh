#!/bin/bash
set -euo pipefail

# Claude Master Portal — SessionStart Hook
# Auto-starts the portal containers when any Claude Code session begins.
# Runs async so it doesn't block session startup.

echo '{"async": true, "asyncTimeout": 60000}'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PORTAL_DIR/docker-compose.yml"

# Exit if Docker is not available
if ! command -v docker &>/dev/null; then
  exit 0
fi

# Exit if Docker daemon is not running
if ! docker info &>/dev/null 2>&1; then
  exit 0
fi

# Exit if compose file doesn't exist
if [ ! -f "$COMPOSE_FILE" ]; then
  exit 0
fi

# Check if containers are already running
if docker compose -f "$COMPOSE_FILE" ps --status running 2>/dev/null | grep -q "claude-portal"; then
  exit 0
fi

# Create .env if missing
if [ ! -f "$PORTAL_DIR/.env" ]; then
  if [ -f "$PORTAL_DIR/.env.example" ]; then
    cp "$PORTAL_DIR/.env.example" "$PORTAL_DIR/.env"
  fi
fi

# Start containers in background
docker compose -f "$COMPOSE_FILE" up -d 2>/dev/null || true
