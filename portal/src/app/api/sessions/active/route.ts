import { NextResponse } from "next/server";
import { getActiveSessions } from "@/lib/active-sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = getActiveSessions();
  return NextResponse.json({ sessions });
}
