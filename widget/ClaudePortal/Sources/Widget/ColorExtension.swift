import SwiftUI

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b, a: UInt64
        switch hex.count {
        case 6:
            (r, g, b, a) = (int >> 16, int >> 8 & 0xFF, int & 0xFF, 255)
        case 8:
            (r, g, b, a) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (r, g, b, a) = (0, 0, 0, 255)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// Portal theme colors
extension Color {
    static let portalBg = Color(hex: "0a0a0f")
    static let portalCard = Color(hex: "12121a")
    static let portalIndigo = Color(hex: "818cf8")
    static let portalViolet = Color(hex: "c084fc")
    static let portalAccent = Color(hex: "6366f1")
    static let portalMuted = Color(hex: "64748b")
}

extension LinearGradient {
    static let portalGradient = LinearGradient(
        colors: [.portalIndigo, .portalViolet],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
