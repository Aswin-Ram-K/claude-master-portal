import WidgetKit
import SwiftUI

struct ClaudePortalWidget: Widget {
    let kind: String = "ClaudePortalWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PortalWidgetProvider()) { entry in
            PortalWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Claude Portal")
        .description("Monitor your Claude Code sessions, tokens, and activity at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct PortalWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: PortalEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(data: entry.data)
        case .systemMedium:
            MediumWidgetView(data: entry.data)
        case .systemLarge:
            LargeWidgetView(data: entry.data)
        default:
            MediumWidgetView(data: entry.data)
        }
    }
}

@main
struct PortalWidgetBundle: WidgetBundle {
    var body: some Widget {
        ClaudePortalWidget()
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    ClaudePortalWidget()
} timeline: {
    PortalEntry(date: .now, data: .placeholder)
}

#Preview("Medium", as: .systemMedium) {
    ClaudePortalWidget()
} timeline: {
    PortalEntry(date: .now, data: .placeholder)
}

#Preview("Large", as: .systemLarge) {
    ClaudePortalWidget()
} timeline: {
    PortalEntry(date: .now, data: WidgetData(
        portalOnline: true,
        sessionsToday: 5,
        activeSessions: 2,
        tokensToday: 142_500,
        totalCommits: 12,
        totalRepos: 6,
        recentSessions: [
            RecentSession(sessionId: "1", repoOwner: "Aswin-Ram-K", repoName: "claude-master-portal", branch: "main", startedAt: "2026-04-01T10:30:00Z", durationSeconds: 1800, summary: "Added widget support", model: "claude-opus-4-6", inputTokens: 24000, outputTokens: 8000),
            RecentSession(sessionId: "2", repoOwner: "Aswin-Ram-K", repoName: "CLAUDE_MASTER", branch: "main", startedAt: "2026-04-01T09:15:00Z", durationSeconds: 900, summary: "Sync pipeline fix", model: "claude-sonnet-4-6", inputTokens: 12000, outputTokens: 4000),
            RecentSession(sessionId: "3", repoOwner: "local", repoName: "scripts", branch: nil, startedAt: "2026-04-01T08:00:00Z", durationSeconds: 300, summary: nil, model: "claude-haiku-4-5-20251001", inputTokens: 3000, outputTokens: 1500),
        ],
        lastUpdated: Date()
    ))
}

#Preview("Offline", as: .systemMedium) {
    ClaudePortalWidget()
} timeline: {
    PortalEntry(date: .now, data: .offline)
}
