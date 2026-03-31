# Claude Master Portal — Manual Setup Guide

Complete step-by-step guide for setting up the portal. Use this if the auto-setup (`hooks/auto-setup.sh`) fails or if you prefer manual control.

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose v2)
  - macOS/Windows: https://www.docker.com/products/docker-desktop
  - Linux: https://docs.docker.com/engine/install/
- **Git** installed
- **GitHub Personal Access Token** with `repo` scope
  - Generate at: https://github.com/settings/tokens
- **Claude Code CLI** installed (needed for the chat feature)
  - Install: `npm install -g @anthropic-ai/claude-code`

## Step 1: Clone the Repository

```bash
git clone https://github.com/Aswin-Ram-K/claude-master-portal.git
cd claude-master-portal
```

If you already have the repo:
```bash
cd /path/to/claude-master-portal
git pull
```

## Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Your GitHub Personal Access Token (repo scope required)
GITHUB_TOKEN=ghp_your_actual_token_here

# Path to your ~/.claude directory (usually the default)
CLAUDE_HOME=~/.claude

# Set a secure password for PostgreSQL
POSTGRES_PASSWORD=your_secure_password_here

# Your GitHub username
GITHUB_USERNAME=Aswin-Ram-K
```

## Step 3: Start Docker Containers

```bash
# Production mode (with nginx reverse proxy):
docker compose up -d --build

# OR Development mode (with hot reload, no nginx):
docker compose -f docker-compose.dev.yml up -d --build
```

Wait for all containers to become healthy:
```bash
docker compose ps
```

Expected output:
```
NAME                  STATUS
claude-portal         Up (healthy)
claude-portal-db      Up (healthy)
claude-portal-redis   Up (healthy)
claude-portal-nginx   Up (healthy)
```

## Step 4: Run Database Migrations

```bash
docker compose exec portal npx prisma migrate deploy
```

If this is the first run and no migrations exist yet:
```bash
docker compose exec portal npx prisma db push
```

## Step 5: Verify the Portal

Open your browser to:
- **Production mode**: http://localhost (via nginx on port 80)
- **Dev mode**: http://localhost:3000 (direct to Next.js)

You should see the dark-themed dashboard with the sidebar navigation.

Verify the health endpoint:
```bash
curl http://localhost/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Step 6: Install Desktop Shortcut (Optional)

```bash
chmod +x launcher/install.sh
./launcher/install.sh
```

This auto-detects your OS and installs:
- **Linux**: `.desktop` file in `~/.local/share/applications/` (appears in app menus)
- **macOS**: `.app` bundle in `~/Applications/` (searchable via Spotlight)
- **Windows**: Start Menu shortcut (run from Git Bash or WSL)

To run manually instead:
```bash
chmod +x launcher/portal.sh
./launcher/portal.sh
```

## Step 7: Register Auto-Start Hook (Optional but Recommended)

This makes the portal start automatically whenever you open a Claude Code session.

### Option A: Using jq (recommended)

```bash
# Make the hook executable
chmod +x hooks/session-start-portal.sh

# Get the absolute path
HOOK_PATH="$(cd hooks && pwd)/session-start-portal.sh"

# Add to Claude settings
jq --arg hook "$HOOK_PATH" '
  .hooks.SessionStart = ((.hooks.SessionStart // []) + [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": $hook
    }]
  }])
' ~/.claude/settings.json > /tmp/settings.json && mv /tmp/settings.json ~/.claude/settings.json
```

### Option B: Manual edit

Edit `~/.claude/settings.json` and add the `SessionStart` block:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/claude-master-portal/hooks/session-start-portal.sh"
          }
        ]
      }
    ],
    "Stop": [
      ... your existing stop hooks ...
    ]
  }
}
```

**Important**: Use the absolute path to `session-start-portal.sh`.

## Step 8: Register Session Logging Hook (Optional)

This auto-generates `.claude-logs/` entries in each repo after every Claude Code session.

Edit `~/.claude/settings.json` and add a Stop hook:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/claude-master-portal/hooks/stop-session-log.sh"
          }
        ]
      }
    ]
  }
}
```

*Note: The session logging hook (`stop-session-log.sh`) will be created in Phase 2.*

## Step 9: Initial Sync

Once the portal is running, trigger the first sync to pull session logs from your GitHub repos:

- **Via UI**: Click the "Sync" button in the top bar
- **Via API**: `curl -X POST http://localhost/api/sync`

## Stopping the Portal

```bash
# Stop all containers (data is preserved in volumes)
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v
```

## Updating

```bash
git pull
docker compose up -d --build
```

---

## Troubleshooting

### Containers won't start
```bash
# Check Docker is running
docker info

# Check port conflicts
lsof -i :80    # nginx
lsof -i :5432  # postgres (dev mode)
lsof -i :3000  # portal (dev mode)

# View logs
docker compose logs -f
docker compose logs portal    # Just the portal
```

### Database migration fails
```bash
# Check postgres is healthy
docker compose exec postgres pg_isready -U portal

# Reset database (WARNING: deletes all data)
docker compose exec portal npx prisma migrate reset --force

# Or push schema directly
docker compose exec portal npx prisma db push --force-reset
```

### Portal shows blank page
```bash
# Check portal logs
docker compose logs portal

# Verify .env has correct values
cat .env

# Try accessing directly (bypassing nginx)
curl http://localhost:3000
```

### SessionStart hook not firing
```bash
# Verify hook is executable
chmod +x hooks/session-start-portal.sh

# Verify path in settings.json is absolute (not relative)
cat ~/.claude/settings.json | jq '.hooks.SessionStart'

# Test hook manually
echo '{"session_id":"test","source":"startup"}' | ./hooks/session-start-portal.sh
```

### GitHub sync fails
```bash
# Verify token has repo scope
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Check if token is set in .env
grep GITHUB_TOKEN .env
```

### Desktop shortcut doesn't work
```bash
# Run launcher directly to test
./launcher/portal.sh

# On macOS: allow in System Settings → Privacy & Security
# On Linux: check ~/.local/share/applications/claude-portal.desktop exists
# On Windows: run launcher/windows/claude-portal.bat directly
```

### Chat feature not working
```bash
# Verify Claude Code CLI is installed
claude --version

# Verify authentication
claude auth status

# Check the portal container can access the claude binary
docker compose exec portal which claude
```
