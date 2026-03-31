import { readFileSync } from "fs";

/**
 * Parsed data from a Claude Code JSONL session transcript.
 *
 * JSONL line types:
 *   - queue-operation: enqueue/dequeue of user messages
 *   - user:            user message (role=user in message)
 *   - assistant:       assistant response with content[], usage, model
 *   - system:          system messages (context, reminders)
 *   - last-prompt:     final prompt summary (appears at end)
 *
 * Assistant content[] block types:
 *   - thinking:   model reasoning (with signature)
 *   - text:       plain text response
 *   - tool_use:   tool invocation {name, id, input}
 *   - tool_result: tool output {tool_use_id, content}
 */

export interface ParsedSession {
  sessionId: string;
  version: string | null;
  model: string | null;
  entrypoint: string | null;
  cwd: string | null;
  gitBranch: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;

  userMessages: string[];
  toolsUsed: string[];
  filesChanged: string[];
  gitCommands: string[];
  commits: { sha: string | null; message: string; timestamp: string | null }[];
  subagents: { type: string; description: string }[];

  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };

  summary: string;
}

interface JsonlLine {
  type?: string;
  message?: {
    role?: string;
    content?: string | ContentBlock[];
    model?: string;
    usage?: UsageBlock;
  };
  sessionId?: string;
  version?: string;
  entrypoint?: string;
  cwd?: string;
  gitBranch?: string;
  timestamp?: string;
  lastPrompt?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  caller?: { type: string };
}

interface UsageBlock {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export function parseSessionJsonl(filePath: string): ParsedSession {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as JsonlLine);

  let sessionId = "";
  let version: string | null = null;
  let model: string | null = null;
  let entrypoint: string | null = null;
  let cwd: string | null = null;
  let gitBranch: string | null = null;
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;

  const userMessages: string[] = [];
  const toolsUsed = new Set<string>();
  const filesChanged = new Set<string>();
  const gitCommands: string[] = [];
  const commits: ParsedSession["commits"] = [];
  const subagents: ParsedSession["subagents"] = [];

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;

  for (const line of lines) {
    // Track timestamps
    if (line.timestamp) {
      if (!firstTimestamp) firstTimestamp = line.timestamp;
      lastTimestamp = line.timestamp;
    }

    // Session metadata (from first user or assistant message)
    if (line.sessionId && !sessionId) sessionId = line.sessionId;
    if (line.version && !version) version = line.version;
    if (line.entrypoint && !entrypoint) entrypoint = line.entrypoint;
    if (line.cwd && !cwd) cwd = line.cwd;
    if (line.gitBranch) gitBranch = line.gitBranch;

    const msg = line.message;
    if (!msg) continue;

    // User messages
    if (msg.role === "user" && typeof msg.content === "string") {
      // Skip system-injected messages (task-notification, etc.)
      if (!msg.content.startsWith("<task-notification")) {
        userMessages.push(msg.content);
      }
    }

    // Assistant messages — extract tools, tokens, model
    if (msg.role === "assistant") {
      if (msg.model && !model) model = msg.model;

      // Token usage
      const usage = msg.usage;
      if (usage) {
        inputTokens += usage.input_tokens ?? 0;
        outputTokens += usage.output_tokens ?? 0;
        cacheCreationTokens += usage.cache_creation_input_tokens ?? 0;
        cacheReadTokens += usage.cache_read_input_tokens ?? 0;
      }

      // Content blocks
      const content = msg.content;
      if (!Array.isArray(content)) continue;

      for (const block of content) {
        if (block.type === "tool_use" && block.name) {
          toolsUsed.add(block.name);

          const input = block.input ?? {};

          // Track files from Write/Edit tools
          if (
            (block.name === "Write" || block.name === "Edit") &&
            typeof input.file_path === "string"
          ) {
            filesChanged.add(input.file_path);
          }

          // Track git commands from Bash
          if (block.name === "Bash" && typeof input.command === "string") {
            const cmd = input.command;
            if (cmd.includes("git ")) {
              gitCommands.push(cmd);
              extractCommits(cmd, commits);
            }
          }

          // Track subagents
          if (block.name === "Agent") {
            const desc =
              typeof input.description === "string"
                ? input.description
                : "Unknown";
            const agentType =
              typeof input.subagent_type === "string"
                ? input.subagent_type
                : "general-purpose";
            subagents.push({ type: agentType, description: desc });
          }
        }
      }
    }
  }

  // Calculate duration
  let durationSeconds: number | null = null;
  if (firstTimestamp && lastTimestamp) {
    const start = new Date(firstTimestamp).getTime();
    const end = new Date(lastTimestamp).getTime();
    if (!isNaN(start) && !isNaN(end)) {
      durationSeconds = Math.round((end - start) / 1000);
    }
  }

  // Generate summary from first meaningful user message
  const summary = generateSummary(userMessages, filesChanged);

  return {
    sessionId,
    version,
    model,
    entrypoint,
    cwd,
    gitBranch,
    startedAt: firstTimestamp,
    endedAt: lastTimestamp,
    durationSeconds,
    userMessages,
    toolsUsed: Array.from(toolsUsed),
    filesChanged: Array.from(filesChanged),
    gitCommands,
    commits,
    subagents,
    tokenUsage: {
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
    },
    summary,
  };
}

/**
 * Extract commit messages from git commit commands.
 * Handles both inline -m and heredoc formats.
 *
 * Heredoc format from Claude Code:
 *   git commit -m "$(cat <<'EOF'\nActual commit message\n\nBody...\nhttps://...\nEOF\n)"
 */
function extractCommits(
  cmd: string,
  commits: ParsedSession["commits"]
): void {
  // Heredoc format: git commit -m "$(cat <<'EOF'\nActual message\n..."
  // The \n in the string are literal backslash-n from JSON encoding
  const heredocMatch = cmd.match(
    /<<\\?'?EOF\\?'?\n(.+?)(?:\n\n|\nhttps:|\nEOF)/
  );
  if (heredocMatch) {
    commits.push({
      sha: null,
      message: heredocMatch[1].trim(),
      timestamp: null,
    });
    return;
  }

  // Inline: git commit -m "simple message"
  const inlineMatch = cmd.match(
    /git commit\s[^]*?-m\s+"([^"]+)"/
  );
  if (inlineMatch) {
    const msg = inlineMatch[1];
    // Skip if it's a heredoc wrapper like $(cat <<...
    if (!msg.startsWith("$(cat")) {
      commits.push({
        sha: null,
        message: msg.split("\\n")[0].trim(),
        timestamp: null,
      });
    }
  }
}

function generateSummary(
  userMessages: string[],
  filesChanged: Set<string>
): string {
  // Use the first substantial user message as the basis
  const firstMsg = userMessages.find((m) => m.length > 10) ?? userMessages[0];
  if (!firstMsg) return "Claude Code session";

  const fileCount = filesChanged.size;
  const truncated =
    firstMsg.length > 120 ? firstMsg.slice(0, 117) + "..." : firstMsg;

  if (fileCount > 0) {
    return `${truncated} (${fileCount} file${fileCount === 1 ? "" : "s"} changed)`;
  }
  return truncated;
}
