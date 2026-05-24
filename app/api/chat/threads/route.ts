import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import type { ChatMessage, ChatSeed } from "@/lib/briefly-tools";
import { createChatThread, listChatThreadPreviews } from "@/lib/chat-db";

export const dynamic = "force-dynamic";

type CreateThreadRequest = {
  context?: unknown;
  messages?: unknown;
  title?: unknown;
};

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ChatMessage => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as Record<string, unknown>;
    return (
      (candidate.role === "user" || candidate.role === "assistant") &&
      typeof candidate.content === "string" &&
      candidate.content.trim().length > 0
    );
  });
}

function normalizeContext(value: unknown): ChatSeed | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.toolId === "string" &&
    typeof candidate.toolName === "string" &&
    typeof candidate.summary === "string"
  ) {
    return {
      toolId: candidate.toolId as ChatSeed["toolId"],
      toolName: candidate.toolName,
      summary: candidate.summary,
    };
  }

  return null;
}

export async function GET() {
  return NextResponse.json({
    threads: listChatThreadPreviews(),
  });
}

export async function POST(request: Request) {
  let payload: CreateThreadRequest;

  try {
    payload = (await request.json()) as CreateThreadRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const messages = normalizeMessages(payload.messages);
  const context = normalizeContext(payload.context);

  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "messages must contain at least one message." },
      { status: 400 },
    );
  }

  const thread = createChatThread({
    context,
    id: `thread-${randomUUID()}`,
    messages,
    title,
  });

  if (!thread) {
    return NextResponse.json(
      { error: "Failed to create chat thread." },
      { status: 500 },
    );
  }

  return NextResponse.json({ thread });
}
