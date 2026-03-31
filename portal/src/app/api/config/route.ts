import { NextResponse } from "next/server";
import { getLocalSettings } from "@/lib/claude-local";

export const dynamic = "force-dynamic";

/**
 * GET /api/config
 * Returns the current Claude Code configuration from ~/.claude/.
 */
export async function GET() {
  const settings = getLocalSettings();

  return NextResponse.json({
    settings,
    claudeHome: process.env.CLAUDE_HOME ?? "~/.claude",
  });
}
