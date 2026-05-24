import { NextResponse } from "next/server";

import { getChatThread } from "@/lib/chat-db";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_: Request, context: RouteParams) {
  const { threadId } = await context.params;
  const thread = getChatThread(threadId);

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  return NextResponse.json({ thread });
}
