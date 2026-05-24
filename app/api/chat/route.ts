import { NextResponse } from "next/server";

import {
  type ChatMessage,
  type ChatSeed,
  buildChatFallback,
  buildChatPrompt,
  detectLanguage,
} from "@/lib/briefly-tools";
import { readByopTokenFromSession, readChatOwnerKey } from "@/lib/byop-session";
import { compactChatMessagesWithAgent } from "@/lib/chat-compaction";
import { buildChatMessagesForModel } from "@/lib/chat-compaction";
import {
  appendChatMessage,
  getChatThread,
  replaceChatMessages,
} from "@/lib/chat-db";

export const dynamic = "force-dynamic";

type ChatRequest = {
  apiKey?: unknown;
  message?: unknown;
  model?: unknown;
  context?: unknown;
  messages?: unknown;
  threadId?: unknown;
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

async function callPollinationsChat(params: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model: string;
  token: string;
}) {
  const { messages, model, token } = params;
  const endpoint = new URL("https://gen.pollinations.ai/v1/chat/completions");
  endpoint.searchParams.set("key", token);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      ...(model ? { model } : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      response,
      content: null,
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!content) {
    throw new Error("No chat content returned.");
  }

  return {
    ok: true as const,
    response,
    content,
  };
}

async function maybeCompactThread(params: {
  context: ChatSeed | null;
  language: ReturnType<typeof detectLanguage>;
  model: string;
  ownerKey: string;
  threadId: string;
  token: string;
}) {
  const { context, language, model, ownerKey, threadId, token } = params;
  const thread = getChatThread(threadId, ownerKey);

  if (!thread) {
    return null;
  }

  const compactedMessages = await compactChatMessagesWithAgent({
    context,
    language,
    messages: thread.messages,
    summarize: async (prompt) => {
      const result = await callPollinationsChat({
        messages: [
          {
            role: "system",
            content:
              language === "id"
                ? "Kamu adalah agent peringkas riwayat chat. Ringkas sesuai instruksi user dan keluarkan summary final saja."
                : "You are a chat history compaction agent. Summarize exactly as instructed and return only the final summary.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model,
        token,
      });

      if (!result.ok || !result.content) {
        throw new Error("Failed to compact chat history with agent.");
      }

      return result.content.trim();
    },
  });

  const changed =
    compactedMessages.length !== thread.messages.length ||
    compactedMessages.some((message, index) => {
      const previous = thread.messages[index];
      return (
        previous?.role !== message.role ||
        previous?.kind !== message.kind ||
        previous?.content !== message.content
      );
    });

  if (!changed) {
    return thread;
  }

  replaceChatMessages(threadId, ownerKey, compactedMessages);
  return getChatThread(threadId, ownerKey);
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
  const providedMessage =
    typeof payload.message === "string" ? payload.message.trim() : "";
  const requestedModel =
    typeof payload.model === "string" ? payload.model.trim() : "";
  const threadId =
    typeof payload.threadId === "string" ? payload.threadId.trim() : "";
  let messages = normalizeMessages(payload.messages);
  let context = normalizeContext(payload.context);
  const ownerKey = await readChatOwnerKey();

  if (threadId && providedMessage) {
    const thread = getChatThread(threadId, ownerKey);

    if (!thread) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    context = thread.context;
    messages = [
      ...thread.messages,
      {
        role: "user",
        content: providedMessage,
      },
    ];
  }

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

  if (threadId && providedMessage) {
    appendChatMessage(threadId, ownerKey, {
      role: "user",
      content: providedMessage,
    });

    if (token) {
      const compactedThread = await maybeCompactThread({
        context,
        language,
        model: resolvedModel,
        ownerKey,
        threadId,
        token,
      });

      if (compactedThread) {
        messages = compactedThread.messages;
      }
    }
  }

  if (!token) {
    const fallbackMessage = buildChatFallback({
      language,
      message: latestUserMessage.content,
      context,
    });

    if (threadId) {
      appendChatMessage(threadId, ownerKey, {
        role: "assistant",
        content: fallbackMessage,
      });
    }

    return NextResponse.json({
      message: fallbackMessage,
      mode: "fallback",
      source: authSource,
      ...(resolvedModel ? { model: resolvedModel } : {}),
    });
  }

  const prompt = buildChatPrompt({
    language,
    context,
    messages: buildChatMessagesForModel(messages),
  });

  try {
    const result = await callPollinationsChat({
      messages: [
        { role: "system", content: prompt.system },
        ...prompt.messages,
      ],
      model: resolvedModel,
      token,
    });

    if (!result.ok) {
      const fallbackMessage = buildChatFallback({
        language,
        message: latestUserMessage.content,
        context,
      });

      let thread = null;

      if (threadId) {
        appendChatMessage(threadId, ownerKey, {
          role: "assistant",
          content: fallbackMessage,
        });

        if (token) {
          thread = await maybeCompactThread({
            context,
            language,
            model: resolvedModel,
            ownerKey,
            threadId,
            token,
          });
        } else {
          thread = getChatThread(threadId, ownerKey);
        }
      }

      return NextResponse.json({
        message: fallbackMessage,
        mode: "fallback",
        source: authSource,
        ...(resolvedModel ? { model: resolvedModel } : {}),
        ...(thread ? { thread } : {}),
        warning: `Pollinations responded with ${result.response.status}. Showing Briefly fallback chat instead.`,
      });
    }
    const content = result.content;
    let thread = null;

    if (threadId) {
      appendChatMessage(threadId, ownerKey, {
          role: "assistant",
          content,
        });

      thread = token
        ? await maybeCompactThread({
            context,
            language,
            model: resolvedModel,
            ownerKey,
            threadId,
            token,
          })
        : getChatThread(threadId, ownerKey);
    }

    return NextResponse.json({
      message: content,
      mode: "pollinations",
      source: authSource,
      ...(resolvedModel ? { model: resolvedModel } : {}),
      ...(thread ? { thread } : {}),
    });
  } catch {
    const fallbackMessage = buildChatFallback({
      language,
      message: latestUserMessage.content,
      context,
    });

    let thread = null;

    if (threadId) {
      appendChatMessage(threadId, ownerKey, {
        role: "assistant",
        content: fallbackMessage,
      });

      if (token) {
        thread = await maybeCompactThread({
          context,
          language,
          model: resolvedModel,
          ownerKey,
          threadId,
          token,
        });
      } else {
        thread = getChatThread(threadId, ownerKey);
      }
    }

    return NextResponse.json({
      message: fallbackMessage,
      mode: "fallback",
      source: authSource,
      ...(resolvedModel ? { model: resolvedModel } : {}),
      ...(thread ? { thread } : {}),
    });
  }
}
