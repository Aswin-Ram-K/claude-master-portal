import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deserializeSessionLog } from "@/lib/json-fields";
import { getDateRangeStart } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
  const range = req.nextUrl.searchParams.get("range");
  const startDate = getDateRangeStart(range);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const where = startDate ? { startedAt: { gte: startDate } } : {};

  const [
    totalSessions,
    totalRepos,
    sessionsToday,
    recentSessions,
    tokenAggregates,
    todayTokens,
    weekCommits,
  ] = await Promise.all([
    prisma.sessionLog.count({ where }),
    prisma.repo.count(),
    prisma.sessionLog.count({
      where: { startedAt: { gte: todayStart } },
    }),
    prisma.sessionLog.findMany({
      where,
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
      where,
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.sessionLog.aggregate({
      where: startDate
        ? { startedAt: { gte: startDate } }
        : { startedAt: { gte: todayStart } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.sessionLog.findMany({
      where: startDate
        ? { startedAt: { gte: startDate } }
        : { startedAt: { gte: weekStart } },
      select: { commits: true },
    }),
  ]);

  const totalCommits = weekCommits.reduce((sum, s) => {
    const raw = s.commits;
    let commits: unknown[];
    try {
      commits = typeof raw === 'string' ? JSON.parse(raw) : raw as unknown[];
    } catch {
      commits = [];
    }
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
    recentSessions: recentSessions.map(s => deserializeSessionLog(s as Record<string, unknown>)),
  });
  } catch (error) {
    console.error("[api/sessions] Unhandled error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load data", detail: message },
      { status: 500 }
    );
  }
}
