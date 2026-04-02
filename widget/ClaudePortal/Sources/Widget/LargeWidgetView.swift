import SwiftUI
import WidgetKit

struct LargeWidgetView: View {
    let data: WidgetData

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: "circle.hexagongrid.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.portalIndigo)
                Text("Claude Portal")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                Spacer()
                Circle()
                    .fill(data.portalOnline ? Color.green : Color.red)
                    .frame(width: 7, height: 7)
                Text(data.portalOnline ? "Online" : "Offline")
                    .font(.system(size: 10))
                    .foregroundStyle(data.portalOnline ? .green : .red)
            }
            .padding(.bottom, 10)

            if !data.portalOnline {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "wifi.slash")
                        .font(.largeTitle)
                        .foregroundStyle(.portalMuted)
                    Text("Portal is offline")
                        .font(.headline)
                        .foregroundStyle(.portalMuted)
                    Text("Run portal-dev.sh to start")
                        .font(.caption)
                        .foregroundStyle(.portalMuted.opacity(0.7))
                }
                Spacer()
            } else {
                // Stats row
                HStack(spacing: 10) {
                    StatCell(
                        value: "\(data.sessionsToday)",
                        label: "Sessions",
                        icon: "terminal.fill",
                        color: .portalIndigo
                    )
                    StatCell(
                        value: "\(data.activeSessions)",
                        label: "Active",
                        icon: "bolt.fill",
                        color: data.activeSessions > 0 ? .green : .portalMuted
                    )
                    StatCell(
                        value: formatTokens(data.tokensToday),
                        label: "Tokens",
                        icon: "number",
                        color: .portalViolet
                    )
                    StatCell(
                        value: "\(data.totalCommits)",
                        label: "Commits",
                        icon: "arrow.triangle.branch",
                        color: .orange
                    )
                }
                .padding(.bottom, 10)

                // Divider
                Rectangle()
                    .fill(Color.portalCard)
                    .frame(height: 1)
                    .padding(.bottom, 8)

                // Recent sessions header
                HStack {
                    Text("Recent Sessions")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.portalMuted)
                    Spacer()
                }
                .padding(.bottom, 6)

                // Session list
                if data.recentSessions.isEmpty {
                    Spacer()
                    Text("No sessions yet today")
                        .font(.caption)
                        .foregroundStyle(.portalMuted)
                    Spacer()
                } else {
                    VStack(spacing: 6) {
                        ForEach(data.recentSessions.prefix(4)) { session in
                            SessionRow(session: session)
                        }
                    }
                    Spacer(minLength: 0)
                }

                // Footer
                HStack {
                    Text("\(data.totalRepos) repos")
                        .font(.system(size: 9))
                        .foregroundStyle(.portalMuted)
                    Spacer()
                    Text("Updated \(data.lastUpdated, style: .time)")
                        .font(.system(size: 9))
                        .foregroundStyle(.portalMuted)
                }
            }
        }
        .padding(14)
        .containerBackground(for: .widget) {
            Color.portalBg
        }
    }
}

struct SessionRow: View {
    let session: RecentSession

    var body: some View {
        HStack(spacing: 8) {
            // Repo icon
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.portalCard)
                .frame(width: 28, height: 28)
                .overlay(
                    Image(systemName: "folder.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(.portalIndigo)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text("\(session.repoOwner)/\(session.repoName)")
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let model = session.model {
                        Text(model.replacingOccurrences(of: "claude-", with: ""))
                            .font(.system(size: 8))
                            .foregroundStyle(.portalViolet)
                    }
                    if let dur = session.durationSeconds {
                        Text(formatDuration(dur))
                            .font(.system(size: 8, design: .monospaced))
                            .foregroundStyle(.portalMuted)
                    }
                }
            }

            Spacer()

            // Token count
            let tokens = (session.inputTokens ?? 0) + (session.outputTokens ?? 0)
            if tokens > 0 {
                Text(formatTokens(tokens))
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .foregroundStyle(.portalViolet.opacity(0.8))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.portalCard)
        )
    }
}
