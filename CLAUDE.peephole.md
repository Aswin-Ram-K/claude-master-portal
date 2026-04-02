# Claude's Little Peephole

## What This Is

A macOS WidgetKit widget that peeks at Claude Code activity via the Claude Master Portal's `/api/widget` endpoint. Forked from [claude-master-portal](https://github.com/Aswin-Ram-K/claude-master-portal) — the portal repo is the parent; this is the widget side-quest.

## Tech Stack

- **Swift 5.9** / WidgetKit / SwiftUI (macOS 14.0+)
- **XcodeGen** for project generation (`project.yml` -> `.xcodeproj`)
- **Next.js 14** API route (`portal/src/app/api/widget/route.ts`) — the data source
- **Prisma + SQLite** (portal's DB, queried by the API route)

## Architecture

- `widget/` — Swift WidgetKit extension + host app
- `portal/src/app/api/widget/route.ts` — single endpoint the widget calls
- Widget is a **WidgetKit extension** bundled inside a minimal host app (required by macOS)
- `PortalAPIClient` is an `actor` for thread-safe HTTP fetching
- `PortalWidgetProvider` uses **adaptive refresh**: 5min when active sessions exist, 30min when idle

## Key Patterns

- All views use `Color.portalBackground`, `Color.portalCard`, `Color.portalAccent` from `ColorExtension.swift`
- API models match the JSON contract exactly — `Codable` structs with optional fields
- `WidgetData.offline` and `WidgetData.placeholder` are static instances for error/preview states
- Widget sizes: `.systemSmall`, `.systemMedium`, `.systemLarge` — each has its own SwiftUI view
- Build via `widget/build.sh` (xcodegen + xcodebuild + copy to ~/Applications)

## Development

```bash
# Generate Xcode project (for IDE work)
cd widget/ClaudePortal && xcodegen generate

# Build + install
./widget/build.sh

# Portal must be running for the widget to show data
cd portal && npm run dev
```

## Future Ideas

- Deep links from widget tap -> open portal in browser
- Complication-style mini widget for menu bar
- Intent-based widget configuration (choose time range)
- Keychain storage for remote portal URL (not just localhost)
