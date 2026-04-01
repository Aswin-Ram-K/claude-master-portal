import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deserializeChatMetadata } from "@/lib/json-fields";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    const parsed = messages.map(m => deserializeChatMetadata(m as Record<string, unknown>));

    return NextResponse.json({ messages: parsed, conversationId });
  } catch (error) {
    console.error("[api/chat/history] Unhandled error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load data", detail: message },
      { status: 500 }
    );
  }
}
