import SwiftUI

@main
struct ClaudePortalApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .defaultSize(width: 400, height: 300)
    }
}

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "circle.hexagongrid.fill")
                .font(.system(size: 48))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color(hex: "818cf8"), Color(hex: "c084fc")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Text("Claude Portal")
                .font(.title2.bold())

            Text("The widget is available in your\nNotification Center and Desktop.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .font(.body)

            Link("Open Portal Dashboard", destination: URL(string: "http://localhost:3000")!)
                .buttonStyle(.borderedProminent)
                .tint(Color(hex: "6366f1"))
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "0a0a0f"))
        .foregroundStyle(.white)
    }
}
