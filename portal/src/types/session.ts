export interface SessionLog {
  id: string;
  sessionId: string;
  repoOwner: string;
  repoName: string;
  branch: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  summary: string | null;
  filesChanged: string[];
  commits: CommitEntry[];
  inputTokens: number | null;
  outputTokens: number | null;
  model: string | null;
  entrypoint: string | null;
  toolsUsed: string[];
  subagents: SubagentEntry[];
  userMessages: string[];
}

export interface CommitEntry {
  sha: string;
  message: string;
  timestamp: string;
}

export interface SubagentEntry {
  type: string;
  description: string;
}

export interface ActiveSession {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  kind: string;
  entrypoint: string;
  runtimeSeconds: number;
  inputTokens: number;
  outputTokens: number;
  model: string | null;
  lastUserMessage: string | null;
  branch: string | null;
  hostname: string;
}
