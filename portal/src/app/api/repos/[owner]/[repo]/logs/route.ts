import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deserializeSessionLog } from "@/lib/json-fields";

export const dynamic = "force-dynamic";

/**
 * GET /api/repos/[owner]/[repo]/logs
 * Returns session logs for a specific repo — from DB first, falls back to GitHub.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
  const { owner, repo } = params;
  const repoSlug = `${owner}/${repo}`;

  // Try database first
  const sessions = await prisma.sessionLog.findMany({
    where: { repoOwner: owner, repoName: repo },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      sessionId: true,
      branch: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      summary: true,
      filesChanged: true,
      commits: true,
      inputTokens: true,
      outputTokens: true,
      model: true,
      entrypoint: true,
      toolsUsed: true,
    },
  });

  // Deserialize JSON string fields for SQLite compatibility
  const deserializedSessions = sessions.map(s => deserializeSessionLog(s as Record<string, unknown>));

  // Aggregate stats
  const stats = {
    totalSessions: deserializedSessions.length,
    totalCommits: deserializedSessions.reduce((sum, s) => {
      const commits = s.commits as unknown[];
      return sum + (Array.isArray(commits) ? commits.length : 0);
    }, 0),
    totalFilesChanged: new Set(
      deserializedSessions.flatMap((s) => (s.filesChanged as string[]) ?? [])
    ).size,
    totalTokens: deserializedSessions.reduce(
      (sum, s) => sum + ((s.inputTokens as number) ?? 0) + ((s.outputTokens as number) ?? 0),
      0
    ),
  };

  return NextResponse.json({
    owner,
    repo,
    stats,
    sessions: deserializedSessions,
  });
  } catch (error) {
    console.error("[api/repos/logs] Unhandled error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load data", detail: message },
      { status: 500 }
    );
  }
}
