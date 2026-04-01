# Claude Master Portal — Project Context

## Current State

**Branch:** `main`
**Phases 1–7 complete. Phase 7: standalone app (Docker → SQLite).**

### Dev Mode Setup
- **No Docker required** — standalone SQLite database
- Portal runs on host: `cd portal && npm run dev` (port 3000)
- DB: `file:./prisma/data/portal.db` (SQLite, auto-created)
- Desktop shortcut: `~/Desktop/Claude Portal.app`
- Dev launcher: `launcher/portal-dev.sh`
- One-command setup: `./setup.sh`

### Hooks Registered
- **SessionStart**: `hooks/session-start-portal.sh` — lightweight health check, auto-starts portal if down
- **Stop**: `hooks/stop-session-log.sh` — generates `.claude-logs/` entries in repos
- Session logs sync to `~/CLAUDE_MASTER/SESSION_LOGS/` via `/sync` (Step 9 in sync.sh)

## Architecture

```
claude-master-portal/
├── setup.sh                    # One-command install (Node.js + deps + DB + shortcuts + hooks)
├── docker/                     # Optional Docker files for production deployment
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── nginx/
│   ├── Dockerfile / Dockerfile.dev
│   └── entrypoint.sh
├── hooks/
│   ├── session-start-portal.sh # SessionStart hook (lightweight health check)
│   └── stop-session-log.sh     # SessionStop hook for log generation
├── launcher/
│   ├── portal-dev.sh           # Dev launcher (standalone, no Docker)
│   ├── portal.sh               # Production launcher (standalone)
│   ├── install.sh              # Desktop shortcut installer
│   └── windows/                # Windows launcher
├── docs/
│   ├── setup.md                # Manual setup guide
│   └── nextjs-upgrade-plan.md  # Next.js 15 migration plan
└── portal/
    ├── prisma/
    │   ├── schema.prisma       # SQLite schema: SessionLog, Repo, ChatMessage
    │   └── data/               # SQLite database directory (gitignored)
    ├── scripts/generate-session-log.ts
    └── src/
        ├── app/
        │   ├── layout.tsx      # Root: Providers + Sidebar + TopBar
        │   ├── globals.css     # Custom theme classes
        │   ├── page.tsx        # Dashboard (stats, timeline, latest session) + time range
        │   ├── analytics/      # Analytics page (trend charts, breakdowns, insights)
        │   ├── activity/       # Paginated session history table
        │   ├── live/           # Real-time instance monitoring (5s poll)
        │   ├── repos/          # Repo grid + [owner]/[repo] detail
        │   ├── chat/           # Chat UI (Phase 5)
        │   └── api/
        │       ├── sync/       # POST: parse local JSONL + GitHub .claude-logs/
        │       ├── sessions/   # GET: dashboard stats (supports ?range=)
        │       ├── sessions/active/ # GET: live PID-checked sessions
        │       ├── analytics/  # GET: token trends, session trends, breakdowns (SQLite SQL)
        │       ├── activity/   # GET: paginated history
        │       ├── repos/      # GET: repo list + [owner]/[repo]/logs detail
        │       ├── config/     # GET: ~/.claude/settings.json
        │       └── health/     # GET: status check
        ├── components/
        │   ├── layout/         # Sidebar, TopBar, PageTransition
        │   ├── shared/         # Badge, LoadingSkeleton, EmptyState, TimeRangeSelector
        │   └── analytics/      # TokenTrendChart, SessionTrendChart, ModelBreakdown, RepoBreakdown, InsightsRow
        ├── hooks/
        │   ├── useSessionLogs.ts    # useDashboard (with range), useActivity, useRepos, useSync
        │   ├── useAnalytics.ts      # useAnalytics hook for analytics API
        │   └── useActiveSessions.ts # 5s polling for live instances
        ├── lib/
        │   ├── session-parser.ts  # Parses Claude Code JSONL transcripts
        │   ├── log-generator.ts   # Creates .claude-logs/ entries per repo
        │   ├── active-sessions.ts # PID liveness + JSONL tail for live data
        │   ├── github.ts          # Octokit: repo list, .claude-logs/ fetch
        │   ├── claude-local.ts    # Reads ~/.claude/ sessions/settings/projects
        │   ├── db.ts              # Prisma singleton + SQLite WAL mode
        │   ├── json-fields.ts     # JSON serialize/deserialize for SQLite String fields
        │   └── utils.ts           # cn, formatDuration, formatTokenCount, etc.
        └── types/
            ├── session.ts
            ├── activity.ts
            ├── analytics.ts    # TimeRange, AnalyticsData, chart data types
            └── config.ts
```

## Tech Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- TanStack Query for server state + polling
- Recharts for analytics visualizations (area, bar, pie charts)
- Prisma ORM + SQLite (WAL mode for concurrent reads)
- Octokit for GitHub API, Claude Code CLI subprocess for chat (Phase 5)

## Theme

- Background: `#0a0a0f`, cards: `#12121a`, accent: indigo→violet gradient
- Fonts: Inter (UI), JetBrains Mono (code/numbers)
- Custom classes: glass-card, gradient-text, gradient-border, shimmer, glow-hover

## Phase 5 — Chat Interface (COMPLETE)

Scoped chat interface powered by Claude CLI subprocess.

### Architecture
- **Read-only CLI + portal-side writes**: CLI spawns with `--allowedTools "Read,Bash(cat:*,ls:*,...)"` — no Edit/Write. For config changes, the system prompt instructs Claude to output structured `config-change` proposals. The portal parses these, shows a diff preview, and applies approved changes via Node.js `fs`.
- **Dev mode**: Portal runs on host (`npm run dev`) — fully standalone, no Docker.
- **Streaming**: CLI → stream-json stdout → SSE API route → fetch ReadableStream on client
- **Persistence**: ChatMessage model with conversationId, metadata (cost/duration/proposals), stored in SQLite. Conversation ID in localStorage for continuity.

### Files
- `src/lib/chat-context.ts` — Scope definition, CLI args, system prompt, `isPathInScope()` security check
- `src/lib/chat-cli.ts` — `spawnChatCli()` subprocess manager, `extractConfigChangeProposals()` parser
- `src/app/api/chat/route.ts` — POST SSE streaming endpoint
- `src/app/api/chat/apply/route.ts` — POST apply approved config changes (with scope validation)
- `src/app/api/chat/history/route.ts` — GET conversation history
- `src/hooks/useChat.ts` — Client-side chat state, SSE consumption, approval flow
- `src/components/chat/StreamingText.tsx` — Streaming markdown renderer with syntax highlighting
- `src/components/chat/ConfigDiffPreview.tsx` — Side-by-side before/after diff view
- `src/components/chat/ApprovalDialog.tsx` — Radix UI approval dialog with diff preview
- `src/types/chat.ts` — TypeScript types for the chat system

## Phase 6 — Analytics & Dashboard Enhancements (COMPLETE)

### Sync Fix
- **Bug:** Workspace path decoder (`-Users-aswinram-CLAUDE-MASTER` → broken path) was lossy — hyphens in dir names were indistinguishable from path separators. Zero sessions were being indexed.
- **Fix:** Use `parsed.cwd` from JSONL transcripts (ground truth) instead of decoding workspace names. Added `createFallbackSlug()` for non-git directories (`local/<dirname>`).

### Analytics Page (`/analytics`)
- 4 Recharts panels: stacked area (token trend), stacked bar (session trend by repo), donut (model breakdown), horizontal bar list (repo breakdown)
- Insights row: avg duration, avg tokens/session, peak hour, cache hit rate
- Time range selector (Today/7d/30d/90d/All) shared with dashboard
- New `GET /api/analytics?range=` endpoint with SQLite raw SQL aggregations (`strftime`, `json_extract`)
- Cache hit rate computed from `json_extract("rawLog", '$.tokenUsage.cacheReadTokens')` (no schema migration needed)

### Dashboard Enhancement
- Added `TimeRangeSelector` to dashboard page
- `GET /api/sessions` now accepts optional `?range=` query param
- Stats scope to selected range; default is "today" (preserves legacy behavior)

## Phase 7 — Standalone App (Docker → SQLite) (COMPLETE)

### What Changed
- **Database**: PostgreSQL → SQLite with Prisma. DB file at `portal/prisma/data/portal.db`
- **JSON fields**: Prisma `Json` type → `String`. Manual `JSON.stringify()`/`JSON.parse()` at read/write boundaries
- **Analytics SQL**: PostgreSQL functions → SQLite equivalents (`TO_CHAR` → `strftime`, `EXTRACT` → `strftime`, `->>'key'` → `json_extract`)
- **WAL mode**: Enabled via `$queryRawUnsafe('PRAGMA journal_mode=WAL')` for concurrent read performance
- **Redis**: Removed entirely (was dead code). Deleted `redis.ts`, removed `ioredis` dependency
- **Docker**: All Docker files archived to `docker/` directory
- **Launchers**: Rewritten to check Node.js instead of Docker, set SQLite DATABASE_URL
- **Setup**: New `setup.sh` at project root replaces Docker-based `hooks/auto-setup.sh`
- **Hooks**: `session-start-portal.sh` simplified to lightweight curl health check

### JSON Serialization Pattern
- **Writes** (sync route, chat route): `JSON.stringify(value)` before Prisma create/upsert
- **Reads** (sessions, activity, repos, chat history): `typeof x === 'string' ? JSON.parse(x) : x` guard
- Utility at `src/lib/json-fields.ts` with `deserializeSessionLog()`, `deserializeChatMetadata()`

## Key Design Decisions

- All API routes use `export const dynamic = "force-dynamic"` (Prisma/fs at runtime)
- Session filenames use full sessionId (not short prefix) to avoid collisions
- Commit extraction handles heredoc format: `<<'EOF'\n...\nEOF`
- Active session detection: read ~/.claude/sessions/*.json → check PID with process.kill(pid, 0) → tail JSONL for tokens/context
- No API keys needed — Claude Max subscription handles everything via CLI
- Sync uses `parsed.cwd` from JSONL (not workspace dir name decoding) — workspace encoding is lossy
- Non-git sessions tracked under `local/<dirname>` fallback slug
- Analytics raw SQL uses `Prisma.sql` fragments with `Prisma.empty` for conditional WHERE
- Cache hit rate queried from `rawLog` JSON field via `json_extract` to avoid schema migration
- SQLite WAL mode uses `$queryRawUnsafe` (not `$executeRawUnsafe`) because PRAGMA returns result rows
- JSON fields use `typeof` guards to handle both pre-migration (object) and post-migration (string) data

## Known Issues

- **`/analytics` Suspense boundary**: Pre-existing `useSearchParams()` build warning — needs `<Suspense>` wrapper. Documented as Phase 1 in `docs/nextjs-upgrade-plan.md`. Does not affect dev mode.
- **Next.js 14 CVEs**: 4 HIGH-severity CVEs fixed in Next.js 15+. Upgrade plan at `docs/nextjs-upgrade-plan.md`.

## Important Patterns

- Hooks: `useQuery` with `refetchInterval` (5s live, 30s dashboard, 60s repos, 60s analytics)
- All pages use `<PageTransition>` wrapper (Framer Motion fade+slide)
- Responsive: 1-col mobile → 2-col tablet → 4-col desktop grid patterns
- Sidebar collapses to 60px icons on mobile, 240px expanded on desktop

## Launcher & Desktop Shortcut

- **macOS .app** at `~/Applications/Claude Portal.app`, copy on `~/Desktop/Claude Portal.app`
- `.app` runs `launcher/portal-dev.sh` which starts Next.js dev server (standalone, no Docker)
- **Critical**: `.app` bundles don't inherit shell PATH — `portal-dev.sh` and `portal.sh` explicitly set PATH to include `/opt/homebrew/bin`, nvm node, `~/.local/bin`
- When no terminal is attached (`.app` context), output redirects to `launcher/portal-dev.log`
- Error dialogs shown via `osascript` when Node.js is missing or version < 18
- Icon: `portal/public/icon.svg` (source) → `icon.png` + `icon.icns` (generated via qlmanage + iconutil)
- Icon set on `.app` via `NSWorkspace.setIcon:forFile:` to embed in Finder metadata (prevents iCloud sync flicker)
- **Don't use symlinks for Desktop shortcuts** — Finder aliases or real copies are needed for icon display
- `launcher/install.sh` creates the .app, copies icon, registers with LaunchServices, creates Finder alias on Desktop
