import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { hostname } from "os";

const CLAUDE_HOME = process.env.CLAUDE_HOME ?? "/root/.claude";

export interface ActiveSessionInfo {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  kind: string;
  entrypoint: string;
  runtimeSeconds: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  model: string | null;
  lastUserMessage: string | null;
  contextSummary: string | null;
  branch: string | null;
  hostname: string;
  repoName: string | null;
}

/**
 * Check if a process with the given PID is alive.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the last N lines from a file efficiently.
 */
function tailFile(filePath: string, maxLines: number): string[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

/**
 * Extract the git branch for a directory.
 */
function getGitBranch(cwd: string): string | null {
  try {
    return execSync(`git -C ${JSON.stringify(cwd)} branch --show-current`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 3000,
    }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Extract repo name from a working directory path.
 */
function getRepoName(cwd: string): string | null {
  const parts = cwd.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

/**
 * Find the JSONL transcript for a session.
 */
function findJsonlPath(sessionId: string, cwd: string): string | null {
  const projectsDir = join(CLAUDE_HOME, "projects");
  if (!existsSync(projectsDir)) return null;

  // Encode workspace path
  const encodedCwd = cwd.replace(/\//g, "-").replace(/^-/, "");

  const candidates = [
    join(projectsDir, encodedCwd, `${sessionId}.jsonl`),
    join(projectsDir, `-${encodedCwd}`, `${sessionId}.jsonl`),
  ];

  // Also search all project directories
  try {
    const dirs = readdirSync(projectsDir);
    for (const dir of dirs) {
      const candidate = join(projectsDir, dir, `${sessionId}.jsonl`);
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    // Ignore
  }

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  return null;
}

/**
 * Extract token usage and context from JSONL transcript tail.
 */
function extractSessionContext(jsonlPath: string): {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  model: string | null;
  lastUserMessage: string | null;
  contextSummary: string | null;
} {
  const result = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    model: null as string | null,
    lastUserMessage: null as string | null,
    contextSummary: null as string | null,
  };

  // Read full file for accurate token totals, but only last 100 lines for context
  try {
    const content = readFileSync(jsonlPath, "utf-8");
    const allLines = content.split("\n").filter((l) => l.trim());

    // Sum all tokens
    for (const line of allLines) {
      try {
        const obj = JSON.parse(line);
        const usage = obj?.message?.usage;
        if (usage) {
          result.inputTokens += usage.input_tokens ?? 0;
          result.outputTokens += usage.output_tokens ?? 0;
          result.cacheCreationTokens +=
            usage.cache_creation_input_tokens ?? 0;
          result.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
        }
        if (obj?.message?.model) result.model = obj.message.model;
      } catch {
        // Skip malformed lines
      }
    }

    // Extract context from last 100 lines
    const recentLines = allLines.slice(-100);
    const userMessages: string[] = [];
    for (const line of recentLines) {
      try {
        const obj = JSON.parse(line);
        if (
          obj?.message?.role === "user" &&
          typeof obj.message.content === "string" &&
          !obj.message.content.startsWith("<task-notification")
        ) {
          userMessages.push(obj.message.content);
        }
      } catch {
        // Skip
      }
    }

    if (userMessages.length > 0) {
      result.lastUserMessage = userMessages[userMessages.length - 1];
      // Create a context summary from the last few user messages
      const recentMsgs = userMessages.slice(-3);
      result.contextSummary = recentMsgs
        .map((m) => (m.length > 80 ? m.slice(0, 77) + "..." : m))
        .join(" → ");
    }
  } catch {
    // File read error
  }

  return result;
}

/**
 * Get all currently active Claude Code sessions with full context.
 */
export function getActiveSessions(): ActiveSessionInfo[] {
  const sessionsDir = join(CLAUDE_HOME, "sessions");
  if (!existsSync(sessionsDir)) return [];

  const active: ActiveSessionInfo[] = [];
  const now = Date.now();
  const host = hostname();

  const files = readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const data = JSON.parse(
        readFileSync(join(sessionsDir, file), "utf-8")
      );
      const { pid, sessionId, cwd, startedAt, kind, entrypoint } = data;

      if (!isProcessAlive(pid)) continue;

      const runtimeSeconds = Math.round((now - startedAt) / 1000);
      const branch = getGitBranch(cwd);
      const repoName = getRepoName(cwd);

      // Find and parse JSONL transcript
      const jsonlPath = findJsonlPath(sessionId, cwd);
      const context = jsonlPath
        ? extractSessionContext(jsonlPath)
        : {
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            model: null,
            lastUserMessage: null,
            contextSummary: null,
          };

      active.push({
        pid,
        sessionId,
        cwd,
        startedAt,
        kind,
        entrypoint,
        runtimeSeconds,
        branch,
        repoName,
        hostname: host,
        ...context,
      });
    } catch {
      // Skip invalid session files
    }
  }

  return active;
}
