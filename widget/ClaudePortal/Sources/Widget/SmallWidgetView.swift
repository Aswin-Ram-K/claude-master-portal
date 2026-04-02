import SwiftUI
import WidgetKit

struct SmallWidgetView: View {
    let data: WidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "circle.hexagongrid.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.portalIndigo)
                Text("Portal")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                Spacer()
                Circle()
                    .fill(data.portalOnline ? Color.green : Color.red)
                    .frame(width: 7, height: 7)
            }

            Spacer()

            if !data.portalOnline {
                VStack(spacing: 4) {
                    Image(systemName: "wifi.slash")
                        .font(.title2)
                        .foregroundStyle(.portalMuted)
                    Text("Portal Offline")
                        .font(.caption)
                        .foregroundStyle(.portalMuted)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                // Sessions today — big number
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(data.sessionsToday)")
                        .font(.system(size: 36, weight: .bold, design: .monospaced))
                        .foregroundStyle(LinearGradient.portalGradient)
                    Text("sessions today")
                        .font(.system(size: 11))
                        .foregroundStyle(.portalMuted)
                }

                Spacer()

                // Bottom row: active + tokens
                HStack {
                    Label("\(data.activeSessions) live", systemImage: "bolt.fill")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(data.activeSessions > 0 ? .green : .portalMuted)

                    Spacer()

                    Text(formatTokens(data.tokensToday))
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(.portalViolet)
                }
            }
        }
        .padding(14)
        .containerBackground(for: .widget) {
            Color.portalBg
        }
    }
}

func formatTokens(_ count: Int) -> String {
    if count >= 1_000_000 {
        return String(format: "%.1fM tok", Double(count) / 1_000_000)
    } else if count >= 1_000 {
        return String(format: "%.1fK tok", Double(count) / 1_000)
    }
    return "\(count) tok"
}

func formatDuration(_ seconds: Int?) -> String {
    guard let s = seconds, s > 0 else { return "--" }
    let m = s / 60
    if m < 60 { return "\(m)m" }
    return "\(m / 60)h \(m % 60)m"
}
