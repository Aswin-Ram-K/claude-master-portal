import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const CLAUDE_HOME = process.env.CLAUDE_HOME ?? "/root/.claude";

export interface LocalSession {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  kind: string;
  entrypoint: string;
}

export interface LocalConfig {
  settings: Record<string, unknown>;
  hooks: { event: string; command: string }[];
}

/**
 * Read all active session files from ~/.claude/sessions/
 */
export function getLocalSessions(): LocalSession[] {
  const sessionsDir = join(CLAUDE_HOME, "sessions");
  if (!existsSync(sessionsDir)) return [];

  return readdirSync(sessionsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const data = JSON.parse(
          readFileSync(join(sessionsDir, f), "utf-8")
        );
        return data as LocalSession;
      } catch {
        return null;
      }
    })
    .filter((s): s is LocalSession => s !== null);
}

/**
 * Read Claude Code settings.json
 */
export function getLocalSettings(): Record<string, unknown> {
  const settingsPath = join(CLAUDE_HOME, "settings.json");
  if (!existsSync(settingsPath)) return {};
  try {
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * List all project workspaces and their session JSONL files.
 */
export function getLocalProjects(): {
  workspace: string;
  sessions: { id: string; path: string; size: number; mtime: Date }[];
}[] {
  const projectsDir = join(CLAUDE_HOME, "projects");
  if (!existsSync(projectsDir)) return [];

  return readdirSync(projectsDir)
    .filter((d) => {
      const stat = statSync(join(projectsDir, d));
      return stat.isDirectory();
    })
    .map((workspace) => {
      const wsDir = join(projectsDir, workspace);
      const sessions = readdirSync(wsDir)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => {
          const filePath = join(wsDir, f);
          const stat = statSync(filePath);
          return {
            id: f.replace(".jsonl", ""),
            path: filePath,
            size: stat.size,
            mtime: stat.mtime,
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      return { workspace, sessions };
    })
    .filter((p) => p.sessions.length > 0);
}
