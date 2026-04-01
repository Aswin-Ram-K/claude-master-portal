# Claude Master Portal — Manual Setup Guide

Use this if `setup.sh` doesn't work for your environment or if you prefer manual control.

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`
- **jq** (optional) — for automatic hook registration

## Step 1: Clone the Repository

```bash
git clone https://github.com/Aswin-Ram-K/claude-master-portal.git
cd claude-master-portal
```

## Step 2: Configure Environment

```bash
cp .env.example portal/.env
```

Edit `portal/.env`:

```env
# Database (auto-created, no setup needed)
DATABASE_URL=file:./prisma/data/portal.db

# Path to your ~/.claude directory
CLAUDE_HOME=~/.claude

# GitHub Personal Access Token (optional — only for syncing remote repos)
GITHUB_TOKEN=ghp_your_token_here

# GitHub username (optional — filters repo list)
GITHUB_USERNAME=your-username
```

## Step 3: Install Dependencies

```bash
cd portal
npm install
```

## Step 4: Set Up Database

```bash
npx prisma generate
mkdir -p prisma/data
npx prisma db push
```

This creates a SQLite database at `portal/prisma/data/portal.db`.

## Step 5: Start the Portal

```bash
# Development mode (with hot reload):
npm run dev

# Or use the launcher:
cd ..
./launcher/portal-dev.sh
```

Open **http://localhost:3000**.

## Step 6: Install Desktop Shortcut (Optional)

```bash
chmod +x launcher/install.sh
./launcher/install.sh
```

Creates:
- **macOS**: `.app` bundle in `~/Applications/` (Spotlight-searchable)
- **Linux**: `.desktop` file in `~/.local/share/applications/`

## Step 7: Register Auto-Start Hook (Optional)

Makes the portal start automatically with every Claude Code session.

### With jq:

```bash
chmod +x hooks/session-start-portal.sh
HOOK_PATH="$(cd hooks && pwd)/session-start-portal.sh"

jq --arg hook "$HOOK_PATH" '
  .hooks.SessionStart = ((.hooks.SessionStart // []) + [{
    "matcher": "",
    "hooks": [{"type": "command", "command": $hook}]
  }])
' ~/.claude/settings.json > /tmp/settings.json && mv /tmp/settings.json ~/.claude/settings.json
```

### Manual edit:

Add to `~/.claude/settings.json`:

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
    ]
  }
}
```

## Step 8: Initial Sync

Click **Sync** in the top bar, or:

```bash
curl -X POST http://localhost:3000/api/sync
```

## Stopping the Portal

```bash
# If using the launcher, it manages the process.
# If running npm run dev, just Ctrl+C.

# Kill by port:
lsof -ti:3000 | xargs kill
```

## Updating

```bash
git pull
cd portal
npm install
npx prisma db push
npm run dev
```

---

## Troubleshooting

### Portal shows blank page

```bash
# Check the dev server is running
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":"..."}

# Hard-refresh the browser (Cmd+Shift+R) to clear cached assets
```

### Database issues

```bash
cd portal

# Reset database (WARNING: deletes all data)
rm -f prisma/data/portal.db*
npx prisma db push
```

### SessionStart hook not firing

```bash
# Verify hook is executable
chmod +x hooks/session-start-portal.sh

# Verify path in settings.json is absolute
cat ~/.claude/settings.json | jq '.hooks.SessionStart'

# Test hook manually
echo '{"session_id":"test"}' | ./hooks/session-start-portal.sh
```

### GitHub sync fails

```bash
# Verify token has repo scope
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Check token is set
grep GITHUB_TOKEN portal/.env
```

### Chat feature not working

```bash
# Verify Claude Code CLI is installed
claude --version

# Verify authentication
claude auth status
```
