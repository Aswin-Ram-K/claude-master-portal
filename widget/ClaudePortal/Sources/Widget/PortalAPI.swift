import Foundation

// MARK: - API Models

struct PortalStats: Codable {
    let totalSessions: Int
    let totalRepos: Int
    let totalTokens: Int
    let totalCommits: Int
    let sessionsToday: Int
    let tokensToday: Int
}

struct SessionsResponse: Codable {
    let stats: PortalStats
    let recentSessions: [RecentSession]
}

struct RecentSession: Codable, Identifiable {
    var id: String { sessionId }
    let sessionId: String
    let repoOwner: String
    let repoName: String
    let branch: String?
    let startedAt: String
    let durationSeconds: Int?
    let summary: String?
    let model: String?
    let inputTokens: Int?
    let outputTokens: Int?
}

struct ActiveSession: Codable, Identifiable {
    var id: Int { pid }
    let pid: Int
    let sessionId: String
    let cwd: String
    let runtimeSeconds: Int
    let inputTokens: Int
    let outputTokens: Int
    let model: String?
    let lastUserMessage: String?
    let branch: String?
}

struct ActiveSessionsResponse: Codable {
    let sessions: [ActiveSession]
}

struct HealthResponse: Codable {
    let status: String
}

// MARK: - Widget Data (what we actually display)

struct WidgetData {
    let portalOnline: Bool
    let sessionsToday: Int
    let activeSessions: Int
    let tokensToday: Int
    let totalCommits: Int
    let totalRepos: Int
    let recentSessions: [RecentSession]
    let lastUpdated: Date

    static let placeholder = WidgetData(
        portalOnline: true,
        sessionsToday: 3,
        activeSessions: 1,
        tokensToday: 48_200,
        totalCommits: 7,
        totalRepos: 4,
        recentSessions: [],
        lastUpdated: Date()
    )

    static let offline = WidgetData(
        portalOnline: false,
        sessionsToday: 0,
        activeSessions: 0,
        tokensToday: 0,
        totalCommits: 0,
        totalRepos: 0,
        recentSessions: [],
        lastUpdated: Date()
    )
}

// MARK: - Unified Widget API Response (matches GET /api/widget)

struct WidgetAPIResponse: Codable {
    let portalOnline: Bool
    let sessionsToday: Int?
    let activeSessions: Int?
    let tokensToday: Int?
    let totalCommits: Int?
    let totalRepos: Int?
    let recentSessions: [RecentSession]?
}

// MARK: - API Client

actor PortalAPIClient {
    static let shared = PortalAPIClient()
    private let baseURL = "http://localhost:3000/api"
    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 5
        config.timeoutIntervalForResource = 10
        self.session = URLSession(configuration: config)
    }

    /// Fetches all widget data in a single request via /api/widget
    func fetchWidgetData() async -> WidgetData {
        guard let url = URL(string: "\(baseURL)/widget") else { return .offline }
        do {
            let (data, response) = try await session.data(from: url)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                return .offline
            }
            let decoded = try JSONDecoder().decode(WidgetAPIResponse.self, from: data)
            guard decoded.portalOnline else { return .offline }

            return WidgetData(
                portalOnline: true,
                sessionsToday: decoded.sessionsToday ?? 0,
                activeSessions: decoded.activeSessions ?? 0,
                tokensToday: decoded.tokensToday ?? 0,
                totalCommits: decoded.totalCommits ?? 0,
                totalRepos: decoded.totalRepos ?? 0,
                recentSessions: decoded.recentSessions ?? [],
                lastUpdated: Date()
            )
        } catch {
            return .offline
        }
    }
}
