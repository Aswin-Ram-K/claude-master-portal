import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/repos
 * Returns all repos with Claude Code activity.
 */
export async function GET() {
  const repos = await prisma.repo.findMany({
    orderBy: { lastSessionAt: "desc" },
  });

  return NextResponse.json({ repos });
}
