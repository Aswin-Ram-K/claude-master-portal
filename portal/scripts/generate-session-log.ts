#!/usr/bin/env npx tsx
/**
 * generate-session-log.ts
 *
 * CLI script that parses a Claude Code JSONL transcript and writes a
 * structured log entry to .claude-logs/ in the repo where the session ran.
 *
 * Usage:
 *   npx tsx scripts/generate-session-log.ts --session-id <id> [--workspace <path>] [--claude-home <path>]
 *   npx tsx scripts/generate-session-log.ts --jsonl <path-to-jsonl> [--repo-dir <path>]
 *
 * When called from a stop hook, reads session info from stdin.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";
import { parseSessionJsonl } from "../src/lib/session-parser";
import {
  createLogEntry,
  writeLogToRepo,
  detectRepoSlug,
  resolveJsonlPath,
} from "../src/lib/log-generator";

interface CliArgs {
  sessionId?: string;
  workspace?: string;
  claudeHome?: string;
  jsonl?: string;
  repoDir?: string;
  fromHook?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--session-id":
        args.sessionId = argv[++i];
        break;
      case "--workspace":
        args.workspace = argv[++i];
        break;
      case "--claude-home":
        args.claudeHome = argv[++i];
        break;
      case "--jsonl":
        args.jsonl = argv[++i];
        break;
      case "--repo-dir":
        args.repoDir = argv[++i];
        break;
      case "--from-hook":
        args.fromHook = true;
        break;
    }
  }
  return args;
}

function findClaudeHome(): string {
  const candidates = [
    process.env.CLAUDE_HOME,
    join(process.env.HOME ?? "", ".claude"),
    "/root/.claude",
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  throw new Error(
    "Could not find ~/.claude directory. Set CLAUDE_HOME env var."
  );
}

/**
 * When called from a stop hook, try to read session info from stdin.
 */
function readStdinHookData(): {
  sessionId?: string;
  cwd?: string;
} | null {
  try {
    // Non-blocking read — stdin may or may not have data
    const data = readFileSync("/dev/stdin", { encoding: "utf-8", flag: "r" });
    if (data.trim()) {
      return JSON.parse(data);
    }
  } catch {
    // No stdin data or not valid JSON
  }
  return null;
}

/**
 * Find the most recent JSONL for a given workspace.
 */
function findMostRecentSession(
  claudeHome: string,
  workspace: string
): { sessionId: string; jsonlPath: string } | null {
  const encodedWorkspace = workspace.replace(/\//g, "-");
  const projectDir = join(claudeHome, "projects", encodedWorkspace);

  if (!existsSync(projectDir)) return null;

  const jsonlFiles = readdirSync(projectDir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({
      name: f,
      path: join(projectDir, f),
      mtime: statSync(join(projectDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (jsonlFiles.length === 0) return null;

  return {
    sessionId: jsonlFiles[0].name.replace(".jsonl", ""),
    jsonlPath: jsonlFiles[0].path,
  };
}

async function main() {
  const args = parseArgs();
  const claudeHome = args.claudeHome ?? findClaudeHome();

  let jsonlPath: string | undefined = args.jsonl;
  let repoDir: string | undefined = args.repoDir;
  let sessionId = args.sessionId;

  // If called from hook, try stdin
  if (args.fromHook) {
    const hookData = readStdinHookData();
    if (hookData?.cwd) {
      repoDir = repoDir ?? hookData.cwd;
    }
  }

  // Resolve JSONL path
  if (!jsonlPath) {
    const workspace = args.workspace ?? repoDir ?? process.cwd();

    if (sessionId) {
      jsonlPath =
        resolveJsonlPath(claudeHome, workspace, sessionId) ?? undefined;
    } else {
      // Find most recent session for this workspace
      const recent = findMostRecentSession(claudeHome, workspace);
      if (recent) {
        jsonlPath = recent.jsonlPath;
        sessionId = recent.sessionId;
      }
    }
  }

  if (!jsonlPath || !existsSync(jsonlPath)) {
    console.error(
      "Error: Could not find JSONL transcript.",
      jsonlPath ? `Tried: ${jsonlPath}` : "No path resolved."
    );
    console.error(
      "Usage: npx tsx scripts/generate-session-log.ts --session-id <id> --workspace <path>"
    );
    process.exit(1);
  }

  // Resolve repo directory
  if (!repoDir) {
    // Try to extract from parsed session
    const tempParsed = parseSessionJsonl(jsonlPath);
    repoDir = tempParsed.cwd ?? process.cwd();
  }
  repoDir = resolve(repoDir);

  console.log(`Parsing session: ${jsonlPath}`);
  const parsed = parseSessionJsonl(jsonlPath);

  // Detect repo slug
  const repoSlug = detectRepoSlug(repoDir);
  console.log(`Repo: ${repoSlug ?? "unknown"} (${repoDir})`);

  // Create and write log entry
  const entry = createLogEntry(parsed, repoSlug);
  const logPath = writeLogToRepo(repoDir, entry);

  console.log(`Session log written: ${logPath}`);
  console.log(`  Summary: ${entry.summary}`);
  console.log(`  Duration: ${entry.durationSeconds ?? "?"}s`);
  console.log(
    `  Tokens: ${entry.tokenUsage.totalInputTokens} in / ${entry.tokenUsage.totalOutputTokens} out`
  );
  console.log(`  Files changed: ${entry.filesChanged.length}`);
  console.log(`  Commits: ${entry.commits.length}`);
  console.log(`  Tools: ${entry.toolsUsed.join(", ")}`);

  // Stage the log file for the stop hook to commit
  try {
    execSync(`git -C ${JSON.stringify(repoDir)} add ${JSON.stringify(logPath)}`, {
      stdio: "pipe",
    });
    console.log("Log file staged for commit.");
  } catch {
    console.log("Note: Could not git-add the log file (may not be a git repo).");
  }
}

main().catch((err) => {
  console.error("Error generating session log:", err.message);
  process.exit(1);
});
