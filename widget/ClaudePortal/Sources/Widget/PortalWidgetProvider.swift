import WidgetKit
import SwiftUI

struct PortalEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct PortalWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> PortalEntry {
        PortalEntry(date: .now, data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (PortalEntry) -> Void) {
        if context.isPreview {
            completion(PortalEntry(date: .now, data: .placeholder))
            return
        }
        Task {
            let data = await PortalAPIClient.shared.fetchWidgetData()
            completion(PortalEntry(date: .now, data: data))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PortalEntry>) -> Void) {
        Task {
            let data = await PortalAPIClient.shared.fetchWidgetData()
            let entry = PortalEntry(date: .now, data: data)
            // Adaptive: 5min when Claude is cooking, 30min when idle
            let minutes = data.activeSessions > 0 ? 5 : 30
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: minutes, to: .now)!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }
}
