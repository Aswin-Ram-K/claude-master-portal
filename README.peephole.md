# Claude's Little Peephole

A tiny macOS WidgetKit widget that lets you peek at what Claude Code is up to.

Forked from [claude-master-portal](https://github.com/Aswin-Ram-K/claude-master-portal) for giggles.

## What It Does

Sits on your desktop/Notification Center and shows:
- **Small**: Active sessions count + portal status (online/offline pulse)
- **Medium**: Today's sessions, tokens burned, active sessions, commits this week
- **Large**: All of the above + recent session list with repo/branch/model

Adaptive refresh: polls every **5 minutes** when Claude is cooking, backs off to **30 minutes** when idle.

## Prerequisites

- macOS 14.0+ (Sonoma)
- Xcode 16+ with Swift 5.9
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`
- Claude Master Portal running on `localhost:3000` (provides the `/api/widget` data endpoint)

## Build & Install

```bash
chmod +x widget/build.sh
./widget/build.sh
```

This generates the Xcode project, builds the app + widget extension, and copies it to `~/Applications/`.

Then: **right-click desktop -> Edit Widgets -> search "Claude Portal"**

## Architecture

```
widget/
├── build.sh                          # One-command build + install
└── ClaudePortal/
    ├── project.yml                   # XcodeGen spec (app + widget extension)
    ├── Assets.xcassets/              # Colors (dark indigo/violet theme)
    └── Sources/
        ├── App/ClaudePortalApp.swift # Host app (required by WidgetKit)
        └── Widget/
            ├── ClaudePortalWidget.swift    # WidgetBundle + WidgetConfiguration
            ├── PortalWidgetProvider.swift  # TimelineProvider (adaptive refresh)
            ├── PortalAPI.swift             # API client (fetches /api/widget)
            ├── SmallWidgetView.swift       # Compact glanceable view
            ├── MediumWidgetView.swift      # Stats grid
            ├── LargeWidgetView.swift       # Stats + recent sessions list
            └── ColorExtension.swift        # Theme colors matching portal

portal/src/app/api/widget/route.ts    # Next.js endpoint the widget calls
```

## API Contract

The widget calls `GET http://localhost:3000/api/widget` and expects:

```json
{
  "portalOnline": true,
  "sessionsToday": 3,
  "activeSessions": 1,
  "tokensToday": 48200,
  "totalCommits": 7,
  "totalRepos": 4,
  "recentSessions": [
    {
      "sessionId": "abc123",
      "repoOwner": "Aswin-Ram-K",
      "repoName": "claude-master-portal",
      "branch": "main",
      "startedAt": "2026-04-01T10:00:00Z",
      "durationSeconds": 1200,
      "summary": "Added widget endpoint",
      "model": "opus",
      "inputTokens": 5000,
      "outputTokens": 2000
    }
  ]
}
```

## Theme

Matches the portal's dark aesthetic:
- Background: `#0a0a0f`
- Cards: `#12121a`
- Accent: indigo -> violet gradient
- Active pulse: green glow

## License

Side quest. No license. Have fun.
