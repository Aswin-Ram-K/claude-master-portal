# Claude Master Portal

A standalone web portal that serves as the centralized hub for your Claude Code experience. Tracks session activity, provides analytics, live instance monitoring, and a scoped chat interface for managing your Claude Code configuration.

**No Docker required.** Runs natively on macOS and Linux with SQLite.

## Features

- **Session Activity Logging** — Track every Claude Code session across all your repos. Captures: summary, files changed, commits, token usage, tools used, model, and more.
- **Analytics Dashboard** — Token trends, session breakdowns by repo and model, peak usage hours, cache hit rates. Filterable by time range.
- **Activity History** — Paginated table of all sessions with sorting, filtering, and detailed metadata.
- **Live Instance Monitoring** — Real-time tracking of active Claude Code sessions with token gauges, runtime timers, and context overview. Polled every 5 seconds.
- **Scoped Chat Interface** — Interactive chat powered by Claude Code CLI (works with Claude Max — no API key needed). Scoped to your Claude Code setup, hooks, settings, and skills. Config changes require explicit approval.
- **Desktop Launcher** — One-click desktop shortcuts for macOS and Linux. Auto-opens the portal in your browser.
- **Auto-Start Hook** — Portal starts automatically whenever any Claude Code session begins.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/Aswin-Ram-K/claude-master-portal.git
cd claude-master-portal
bash setup.sh
```

`setup.sh` handles everything: dependency installation, database creation, desktop shortcut, and hook registration.

Then launch:

```bash
./launcher/portal-dev.sh     # Dev mode with hot reload
# or
./launcher/portal.sh         # Production mode
```

Open **http://localhost:3000** and click **Sync** to pull your session data.

## Prerequisites

- **Node.js 18+**
- **Claude Code CLI** installed (`npm install -g @anthropic-ai/claude-code`)
- **jq** (optional, for automatic hook registration)

## Architecture

```
claude-master-portal/
├── setup.sh                    # One-command setup script
├── launcher/
│   ├── portal-dev.sh           # Dev launcher (hot reload)
│   ├── portal.sh               # Production launcher
│   └── install.sh              # Desktop shortcut installer
├── hooks/
│   ├── session-start-portal.sh # Auto-start on Claude Code session
│   └── stop-session-log.sh     # Generate .claude-logs/ on session end
├── docs/
│   ├── setup.md                # Detailed manual setup guide
│   └── nextjs-upgrade-plan.md  # Planned Next.js 15 migration
├── docker/                     # Optional Docker files for production
└── portal/
    ├── prisma/schema.prisma    # SQLite schema (SessionLog, Repo, ChatMessage)
    └── src/
        ├── app/                # Next.js App Router pages + API routes
        ├── components/         # UI components (layout, shared, analytics, chat)
        ├── hooks/              # React Query hooks
        ├── lib/                # Core logic (parser, db, github, utils)
        └── types/              # TypeScript type definitions
```

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Prisma + SQLite, TanStack Query, Recharts

## Configuration

Copy `.env.example` to `.env` (created automatically by `setup.sh`):

```env
DATABASE_URL=file:./prisma/data/portal.db   # Auto-created
CLAUDE_HOME=~/.claude                        # Path to Claude config
GITHUB_TOKEN=ghp_...                         # Optional: sync from GitHub repos
GITHUB_USERNAME=your-username                # Optional: filter repos
```

The portal works fully offline with local session data. GitHub token is only needed to sync `.claude-logs/` from remote repos.

## Docker (Optional)

For production deployment with nginx reverse proxy:

```bash
cd docker
docker compose up -d --build
```

## Manual Setup

See [docs/setup.md](docs/setup.md) for step-by-step instructions if `setup.sh` doesn't work for your environment.

## License

MIT
