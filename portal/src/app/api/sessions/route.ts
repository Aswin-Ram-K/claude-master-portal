import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/sessions
 * Returns dashboard stats and recent sessions.
 */
export async function GET() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalSessions,
    totalRepos,
    sessionsToday,
    recentSessions,
    tokenAggregates,
    todayTokens,
    weekCommits,
  ] = await Promise.all([
    prisma.sessionLog.count(),
    prisma.repo.count(),
    prisma.sessionLog.count({
      where: { startedAt: { gte: todayStart } },
    }),
    prisma.sessionLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true,
        sessionId: true,
        repoOwner: true,
        repoName: true,
        branch: true,
        startedAt: true,
        durationSeconds: true,
        summary: true,
        inputTokens: true,
        outputTokens: true,
        model: true,
        entrypoint: true,
        filesChanged: true,
        commits: true,
        toolsUsed: true,
      },
    }),
    prisma.sessionLog.aggregate({
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.sessionLog.aggregate({
      where: { startedAt: { gte: todayStart } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    // Count commits this week from all sessions
    prisma.sessionLog.findMany({
      where: { startedAt: { gte: weekStart } },
      select: { commits: true },
    }),
  ]);

  const totalCommits = weekCommits.reduce((sum, s) => {
    const commits = s.commits as unknown[];
    return sum + (Array.isArray(commits) ? commits.length : 0);
  }, 0);

  const totalTokens =
    (tokenAggregates._sum.inputTokens ?? 0) +
    (tokenAggregates._sum.outputTokens ?? 0);

  const tokensToday =
    (todayTokens._sum.inputTokens ?? 0) +
    (todayTokens._sum.outputTokens ?? 0);

  return NextResponse.json({
    stats: {
      totalSessions,
      totalRepos,
      totalTokens,
      totalCommits,
      sessionsToday,
      tokensToday,
    },
    recentSessions,
  });
}
