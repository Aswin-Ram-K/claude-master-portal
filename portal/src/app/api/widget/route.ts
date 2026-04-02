import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveSessions } from "@/lib/active-sessions";
import { deserializeSessionLog } from "@/lib/json-fields";

export const dynamic = "force-dynamic";

/**
 * Lightweight endpoint for the macOS WidgetKit widget.
 * Returns just enough data for small/medium/large widget views
 * in a single request (avoids multiple round-trips from the widget).
 */
export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      sessionsToday,
      totalRepos,
      recentSessions,
      todayTokens,
      weekCommits,
    ] = await Promise.all([
      prisma.sessionLog.count({
        where: { startedAt: { gte: todayStart } },
      }),
      prisma.repo.count(),
      prisma.sessionLog.findMany({
        where: { startedAt: { gte: todayStart } },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          sessionId: true,
          repoOwner: true,
          repoName: true,
          branch: true,
          startedAt: true,
          durationSeconds: true,
          summary: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
        },
      }),
      prisma.sessionLog.aggregate({
        where: { startedAt: { gte: todayStart } },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      prisma.sessionLog.findMany({
        where: { startedAt: { gte: weekStart } },
        select: { commits: true },
      }),
    ]);

    const activeSessions = getActiveSessions();

    const totalCommits = weekCommits.reduce((sum, s) => {
      const raw = s.commits;
      let commits: unknown[];
      try {
        commits = typeof raw === "string" ? JSON.parse(raw) : (raw as unknown[]);
      } catch {
        commits = [];
      }
      return sum + (Array.isArray(commits) ? commits.length : 0);
    }, 0);

    const tokensToday =
      (todayTokens._sum.inputTokens ?? 0) +
      (todayTokens._sum.outputTokens ?? 0);

    return NextResponse.json({
      portalOnline: true,
      sessionsToday,
      activeSessions: activeSessions.length,
      tokensToday,
      totalCommits,
      totalRepos,
      recentSessions: recentSessions.map((s) =>
        deserializeSessionLog(s as Record<string, unknown>)
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/widget] Error:", error);
    return NextResponse.json(
      { portalOnline: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
