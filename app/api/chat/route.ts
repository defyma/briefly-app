import { NextResponse } from "next/server";

import {
  buildChatFallback,
  buildChatPrompt,
  detectLanguage,
  type ChatMessage,
  type ChatSeed,
} from "@/lib/briefly-tools";
import { readByopTokenFromSession } from "@/lib/byop-session";

export const dynamic = "force-dynamic";

type ChatRequest = {
  apiKey?: unknown;
  model?: unknown;
  context?: unknown;
  messages?: unknown;
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

function getAuthSource(apiKey: string | undefined) {
  if (apiKey) {
    return "byop" as const;
  }

  if (process.env.POLLINATIONS_API_KEY) {
    return "server" as const;
  }

  return "anonymous" as const;
}

export async function POST(request: Request) {
  let payload: ChatRequest;

  try {
    payload = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const providedKey =
    typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";
  const requestedModel =
    typeof payload.model === "string" ? payload.model.trim() : "";
  const messages = normalizeMessages(payload.messages);
  const context = normalizeContext(payload.context);

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "messages must contain at least one user message." },
      { status: 400 },
    );
  }

  const sessionToken = await readByopTokenFromSession();
  const token = providedKey || sessionToken || process.env.POLLINATIONS_API_KEY || "";
  const authSource = getAuthSource(providedKey || sessionToken || undefined);
  const resolvedModel = requestedModel || process.env.POLLINATIONS_TEXT_MODEL || "";
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const language = detectLanguage(
    [context?.summary || "", latestUserMessage?.content || ""].join("\n"),
  );

  if (!latestUserMessage) {
    return NextResponse.json(
      { error: "A user message is required." },
      { status: 400 },
    );
  }

  if (!token) {
    return NextResponse.json({
      message: buildChatFallback({
        language,
        message: latestUserMessage.content,
        context,
      }),
      mode: "fallback",
      source: authSource,
      ...(resolvedModel ? { model: resolvedModel } : {}),
    });
  }

  const endpoint = new URL("https://gen.pollinations.ai/v1/chat/completions");
  endpoint.searchParams.set("key", token);
  const prompt = buildChatPrompt({ language, context, messages });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: prompt.system },
          ...prompt.messages,
        ],
        ...(resolvedModel ? { model: resolvedModel } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return NextResponse.json({
        message: buildChatFallback({
          language,
          message: latestUserMessage.content,
          context,
        }),
        mode: "fallback",
        source: authSource,
        ...(resolvedModel ? { model: resolvedModel } : {}),
        warning: `Pollinations responded with ${response.status}. Showing Briefly fallback chat instead.`,
      });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("No chat content returned.");
    }

    return NextResponse.json({
      message: content,
      mode: "pollinations",
      source: authSource,
      ...(resolvedModel ? { model: resolvedModel } : {}),
    });
  } catch {
    return NextResponse.json({
      message: buildChatFallback({
        language,
        message: latestUserMessage.content,
        context,
      }),
      mode: "fallback",
      source: authSource,
      ...(resolvedModel ? { model: resolvedModel } : {}),
    });
  }
}
