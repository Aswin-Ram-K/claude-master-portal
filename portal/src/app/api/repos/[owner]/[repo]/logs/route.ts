import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchClaudeLogs } from "@/lib/github";

/**
 * GET /api/repos/[owner]/[repo]/logs
 * Returns session logs for a specific repo — from DB first, falls back to GitHub.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
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

  // Aggregate stats
  const stats = {
    totalSessions: sessions.length,
    totalCommits: sessions.reduce((sum, s) => {
      const commits = s.commits as unknown[];
      return sum + (Array.isArray(commits) ? commits.length : 0);
    }, 0),
    totalFilesChanged: new Set(
      sessions.flatMap((s) => (s.filesChanged as string[]) ?? [])
    ).size,
    totalTokens: sessions.reduce(
      (sum, s) => sum + (s.inputTokens ?? 0) + (s.outputTokens ?? 0),
      0
    ),
  };

  return NextResponse.json({
    owner,
    repo,
    stats,
    sessions,
  });
}
