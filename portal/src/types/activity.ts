export interface ActivityEvent {
  id: string;
  type: "session" | "commit" | "sync";
  repo: string;
  branch: string | null;
  summary: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface RepoSummary {
  id: string;
  owner: string;
  name: string;
  lastSessionAt: string | null;
  totalSessions: number;
  htmlUrl: string | null;
}

export interface DashboardStats {
  totalSessions: number;
  totalRepos: number;
  totalTokens: number;
  totalCommits: number;
  sessionsToday: number;
  tokensToday: number;
}
