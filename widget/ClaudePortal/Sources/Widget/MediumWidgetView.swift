import SwiftUI
import WidgetKit

struct MediumWidgetView: View {
    let data: WidgetData

    var body: some View {
        VStack(spacing: 0) {
            // Header bar
            HStack {
                Image(systemName: "circle.hexagongrid.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(.portalIndigo)
                Text("Claude Portal")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                Spacer()
                Circle()
                    .fill(data.portalOnline ? Color.green : Color.red)
                    .frame(width: 6, height: 6)
                Text(data.portalOnline ? "Online" : "Offline")
                    .font(.system(size: 10))
                    .foregroundStyle(data.portalOnline ? .green : .red)
            }
            .padding(.bottom, 10)

            if !data.portalOnline {
                Spacer()
                VStack(spacing: 6) {
                    Image(systemName: "wifi.slash")
                        .font(.title)
                        .foregroundStyle(.portalMuted)
                    Text("Portal is offline — start it with portal-dev.sh")
                        .font(.caption)
                        .foregroundStyle(.portalMuted)
                }
                Spacer()
            } else {
                // Stats grid: 2x2
                HStack(spacing: 12) {
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

                Spacer(minLength: 6)

                // Footer
                HStack {
                    Text("\(data.totalRepos) repos tracked")
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

struct StatCell: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(color)

            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(.portalMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.portalCard)
        )
    }
}
