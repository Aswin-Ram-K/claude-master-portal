import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity
 * Returns aggregated activity data: session logs with filtering/pagination.
 *
 * Query params:
 *   repo     — filter by "owner/name"
 *   limit    — number of results (default 50)
 *   offset   — pagination offset (default 0)
 *   sort     — field to sort by (default "startedAt")
 *   order    — "asc" or "desc" (default "desc")
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const where: Record<string, unknown> = {};
  if (repo) {
    const [owner, name] = repo.split("/");
    if (owner) where.repoOwner = owner;
    if (name) where.repoName = name;
  }

  const [sessions, total] = await Promise.all([
    prisma.sessionLog.findMany({
      where,
      orderBy: { startedAt: order as "asc" | "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        sessionId: true,
        repoOwner: true,
        repoName: true,
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
    }),
    prisma.sessionLog.count({ where }),
  ]);

  return NextResponse.json({ sessions, total, limit, offset });
}
