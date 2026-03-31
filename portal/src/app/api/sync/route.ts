import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listUserRepos, fetchClaudeLogs } from "@/lib/github";
import { getLocalProjects } from "@/lib/claude-local";
import { parseSessionJsonl } from "@/lib/session-parser";
import { createLogEntry, detectRepoSlug } from "@/lib/log-generator";

/**
 * POST /api/sync
 * Pulls .claude-logs/ from GitHub repos and indexes local sessions into the database.
 */
export async function POST() {
  const results = { repos: 0, sessions: 0, errors: [] as string[] };

  try {
    // --- 1. Sync from local JSONL transcripts ---
    const localProjects = getLocalProjects();
    for (const project of localProjects) {
      // Decode workspace path: -home-user-ideas -> /home/user/ideas
      const workspacePath = "/" + project.workspace.replace(/^-/, "").replace(/-/g, "/");
      const repoSlug = detectRepoSlug(workspacePath);

      if (repoSlug) {
        const [owner, name] = repoSlug.split("/");

        // Upsert repo
        await prisma.repo.upsert({
          where: { id: repoSlug },
          create: {
            id: repoSlug,
            owner,
            name,
            totalSessions: project.sessions.length,
            lastSessionAt: project.sessions[0]?.mtime ?? null,
          },
          update: {
            totalSessions: project.sessions.length,
            lastSessionAt: project.sessions[0]?.mtime ?? null,
          },
        });
        results.repos++;

        // Parse and index each session
        for (const session of project.sessions) {
          const logId = `${repoSlug}/${session.id}`;

          // Skip if already synced
          const existing = await prisma.sessionLog.findUnique({
            where: { id: logId },
          });
          if (existing) continue;

          try {
            const parsed = parseSessionJsonl(session.path);
            const entry = createLogEntry(parsed, repoSlug);

            await prisma.sessionLog.create({
              data: {
                id: logId,
                sessionId: entry.sessionId,
                repoOwner: owner,
                repoName: name,
                branch: entry.branch,
                startedAt: entry.startedAt
                  ? new Date(entry.startedAt)
                  : new Date(),
                endedAt: entry.endedAt ? new Date(entry.endedAt) : null,
                durationSeconds: entry.durationSeconds,
                summary: entry.summary,
                filesChanged: entry.filesChanged,
                commits: entry.commits,
                inputTokens: entry.tokenUsage.totalInputTokens,
                outputTokens: entry.tokenUsage.totalOutputTokens,
                model: entry.model,
                entrypoint: entry.entrypoint,
                toolsUsed: entry.toolsUsed,
                subagents: entry.subagents,
                userMessages: entry.userMessages,
                rawLog: JSON.parse(JSON.stringify(entry)),
              },
            });
            results.sessions++;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.errors.push(`${session.id}: ${msg}`);
          }
        }
      }
    }

    // --- 2. Sync from GitHub repos (if token available) ---
    if (process.env.GITHUB_TOKEN) {
      try {
        const repos = await listUserRepos();
        for (const repo of repos) {
          const logs = await fetchClaudeLogs(repo.owner, repo.name);
          if (logs.length === 0) continue;

          const repoSlug = `${repo.owner}/${repo.name}`;
          await prisma.repo.upsert({
            where: { id: repoSlug },
            create: {
              id: repoSlug,
              owner: repo.owner,
              name: repo.name,
              htmlUrl: repo.htmlUrl,
              totalSessions: logs.length,
            },
            update: {
              htmlUrl: repo.htmlUrl,
              totalSessions: logs.length,
            },
          });
          results.repos++;

          for (const log of logs) {
            try {
              const entry = JSON.parse(log.content);
              const logId = `${repoSlug}/${entry.sessionId}`;

              await prisma.sessionLog.upsert({
                where: { id: logId },
                create: {
                  id: logId,
                  sessionId: entry.sessionId ?? log.name,
                  repoOwner: repo.owner,
                  repoName: repo.name,
                  branch: entry.branch,
                  startedAt: entry.startedAt
                    ? new Date(entry.startedAt)
                    : new Date(),
                  endedAt: entry.endedAt ? new Date(entry.endedAt) : null,
                  durationSeconds: entry.durationSeconds,
                  summary: entry.summary,
                  filesChanged: entry.filesChanged ?? [],
                  commits: entry.commits ?? [],
                  inputTokens: entry.tokenUsage?.totalInputTokens,
                  outputTokens: entry.tokenUsage?.totalOutputTokens,
                  model: entry.model,
                  entrypoint: entry.entrypoint,
                  toolsUsed: entry.toolsUsed ?? [],
                  subagents: entry.subagents ?? [],
                  userMessages: entry.userMessages ?? [],
                  rawLog: entry,
                },
                update: {
                  summary: entry.summary,
                  syncedAt: new Date(),
                },
              });
              results.sessions++;
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              results.errors.push(`${repo.name}/${log.name}: ${msg}`);
            }
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.errors.push(`GitHub sync: ${msg}`);
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", ...results });
}
