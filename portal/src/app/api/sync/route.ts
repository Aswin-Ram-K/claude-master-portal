import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listUserRepos, fetchClaudeLogs } from "@/lib/github";
import { getLocalProjects } from "@/lib/claude-local";
import { parseSessionJsonl } from "@/lib/session-parser";
import { createLogEntry, detectRepoSlug, createFallbackSlug } from "@/lib/log-generator";

/**
 * POST /api/sync
 * Pulls .claude-logs/ from GitHub repos and indexes local sessions into the database.
 */
export async function POST() {
  const results = { repos: 0, sessions: 0, errors: [] as string[] };

  try {
    // --- 1. Sync from local JSONL transcripts ---
    const localProjects = getLocalProjects();

    // Phase A: Parse all sessions and group by resolved repo slug
    const repoMap = new Map<
      string,
      {
        owner: string;
        name: string;
        sessions: { parsed: ReturnType<typeof parseSessionJsonl>; id: string }[];
        latestMtime: Date | null;
      }
    >();

    for (const project of localProjects) {
      for (const session of project.sessions) {
        // Skip if already synced (quick check before expensive parse)
        const existing = await prisma.sessionLog.findFirst({
          where: { sessionId: session.id },
          select: { id: true },
        });
        if (existing) continue;

        try {
          const parsed = parseSessionJsonl(session.path);
          const slug =
            detectRepoSlug(parsed.cwd ?? "") ??
            createFallbackSlug(parsed.cwd, project.workspace);
          const [owner, name] = slug.includes("/")
            ? slug.split("/", 2)
            : ["local", slug];

          if (!repoMap.has(slug)) {
            repoMap.set(slug, {
              owner,
              name,
              sessions: [],
              latestMtime: session.mtime,
            });
          }
          const entry = repoMap.get(slug)!;
          entry.sessions.push({ parsed, id: session.id });
          if (session.mtime && (!entry.latestMtime || session.mtime > entry.latestMtime)) {
            entry.latestMtime = session.mtime;
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          results.errors.push(`${session.id}: ${msg}`);
        }
      }
    }

    // Phase B: Compute log entries outside the transaction (may throw on malformed data),
    // then batch all DB writes in a single transaction for performance.
    type RepoWrite = {
      slug: string;
      repoData: (typeof repoMap extends Map<string, infer V> ? V : never);
      sessionWrites: Array<{
        logId: string;
        entry: ReturnType<typeof createLogEntry>;
        sessionId: string;
      }>;
    };

    const repoWrites: RepoWrite[] = [];
    for (const [slug, repoData] of repoMap) {
      const sessionWrites: RepoWrite["sessionWrites"] = [];
      for (const { parsed, id: sessionId } of repoData.sessions) {
        try {
          const entry = createLogEntry(parsed, slug);
          const logId = `${slug}/${entry.sessionId || sessionId}`;
          sessionWrites.push({ logId, entry, sessionId });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          results.errors.push(`${sessionId}: ${msg}`);
        }
      }
      repoWrites.push({ slug, repoData, sessionWrites });
    }

    await prisma.$transaction(async (tx) => {
      for (const { slug, repoData, sessionWrites } of repoWrites) {
        await tx.repo.upsert({
          where: { id: slug },
          create: {
            id: slug,
            owner: repoData.owner,
            name: repoData.name,
            totalSessions: sessionWrites.length,
            lastSessionAt: repoData.latestMtime,
          },
          update: {
            totalSessions: { increment: sessionWrites.length },
            lastSessionAt: repoData.latestMtime,
          },
        });
        results.repos++;

        for (const { logId, entry, sessionId } of sessionWrites) {
          await tx.sessionLog.create({
            data: {
              id: logId,
              sessionId: entry.sessionId || sessionId,
              repoOwner: repoData.owner,
              repoName: repoData.name,
              branch: entry.branch,
              startedAt: entry.startedAt
                ? new Date(entry.startedAt)
                : new Date(),
              endedAt: entry.endedAt ? new Date(entry.endedAt) : null,
              durationSeconds: entry.durationSeconds,
              summary: entry.summary,
              filesChanged: JSON.stringify(entry.filesChanged),
              commits: JSON.stringify(entry.commits),
              inputTokens: entry.tokenUsage.totalInputTokens,
              outputTokens: entry.tokenUsage.totalOutputTokens,
              model: entry.model,
              entrypoint: entry.entrypoint,
              toolsUsed: JSON.stringify(entry.toolsUsed),
              subagents: JSON.stringify(entry.subagents),
              userMessages: JSON.stringify(entry.userMessages),
              rawLog: JSON.stringify(entry),
            },
          });
          results.sessions++;
        }
      }
    });

    // --- 2. Sync from GitHub repos (if token available) ---
    if (process.env.GITHUB_TOKEN) {
      try {
        const repos = await listUserRepos();
        for (const repo of repos) {
          try {
            const logs = await fetchClaudeLogs(repo.owner, repo.name);
            if (logs.length === 0) continue;

            const repoSlug = `${repo.owner}/${repo.name}`;

            // Parse log entries outside the transaction — JSON.parse can throw on malformed
            // content, and throwing inside a Prisma interactive transaction poisons the tx.
            type GhLogWrite = { logId: string; entry: Record<string, unknown>; logName: string };
            const ghLogWrites: GhLogWrite[] = [];
            for (const log of logs) {
              try {
                const entry = JSON.parse(log.content) as Record<string, unknown>;
                const logId = `${repoSlug}/${entry["sessionId"] as string}`;
                ghLogWrites.push({ logId, entry, logName: log.name });
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                results.errors.push(`${repo.name}/${log.name}: ${msg}`);
              }
            }

            // Wrap per-repo DB writes in a transaction (network fetch and parsing stay outside)
            await prisma.$transaction(async (tx) => {
              await tx.repo.upsert({
                where: { id: repoSlug },
                create: {
                  id: repoSlug,
                  owner: repo.owner,
                  name: repo.name,
                  htmlUrl: repo.htmlUrl,
                  totalSessions: ghLogWrites.length,
                },
                update: {
                  htmlUrl: repo.htmlUrl,
                  totalSessions: ghLogWrites.length,
                },
              });
              results.repos++;

              for (const { logId, entry, logName } of ghLogWrites) {
                await tx.sessionLog.upsert({
                  where: { id: logId },
                  create: {
                    id: logId,
                    sessionId: (entry["sessionId"] as string) ?? logName,
                    repoOwner: repo.owner,
                    repoName: repo.name,
                    branch: entry["branch"] as string | undefined,
                    startedAt: entry["startedAt"]
                      ? new Date(entry["startedAt"] as string)
                      : new Date(),
                    endedAt: entry["endedAt"] ? new Date(entry["endedAt"] as string) : null,
                    durationSeconds: entry["durationSeconds"] as number | undefined,
                    summary: entry["summary"] as string | undefined,
                    filesChanged: JSON.stringify(entry["filesChanged"] ?? []),
                    commits: JSON.stringify(entry["commits"] ?? []),
                    inputTokens: (entry["tokenUsage"] as Record<string, number> | undefined)
                      ?.totalInputTokens,
                    outputTokens: (entry["tokenUsage"] as Record<string, number> | undefined)
                      ?.totalOutputTokens,
                    model: entry["model"] as string | undefined,
                    entrypoint: entry["entrypoint"] as string | undefined,
                    toolsUsed: JSON.stringify(entry["toolsUsed"] ?? []),
                    subagents: JSON.stringify(entry["subagents"] ?? []),
                    userMessages: JSON.stringify(entry["userMessages"] ?? []),
                    rawLog: JSON.stringify(entry),
                  },
                  update: {
                    summary: entry["summary"] as string | undefined,
                    syncedAt: new Date(),
                  },
                });
                results.sessions++;
              }
            });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.errors.push(`GitHub repo ${repo.owner}/${repo.name}: ${msg}`);
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
