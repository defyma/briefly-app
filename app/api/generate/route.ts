import { NextResponse } from "next/server";

import {
  buildFallbackResult,
  buildPrompt,
  getToolDefinition,
  normalizeModelResult,
  type ToolId,
} from "@/lib/briefly-tools";

export const dynamic = "force-dynamic";

type GenerateRequest = {
  toolId?: unknown;
  input?: unknown;
  apiKey?: unknown;
  model?: unknown;
};

function isToolId(value: unknown): value is ToolId {
  return (
    value === "meeting-notes" ||
    value === "task-breakdown" ||
    value === "reply-draft"
  );
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
  let payload: GenerateRequest;

  try {
    payload = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const toolId = payload.toolId;
  const input =
    typeof payload.input === "string" ? payload.input.trim() : "";
  const providedKey =
    typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";
  const requestedModel =
    typeof payload.model === "string" ? payload.model.trim() : "";

  if (!isToolId(toolId)) {
    return NextResponse.json(
      { error: "toolId must be one of meeting-notes, task-breakdown, or reply-draft." },
      { status: 400 },
    );
  }

  if (!input) {
    return NextResponse.json(
      { error: "input is required." },
      { status: 400 },
    );
  }

  const tool = getToolDefinition(toolId);

  if (!tool) {
    return NextResponse.json(
      { error: "Unknown tool requested." },
      { status: 404 },
    );
  }

  const authSource = getAuthSource(providedKey || undefined);
  const token = providedKey || process.env.POLLINATIONS_API_KEY || "";
  const resolvedModel = requestedModel || process.env.POLLINATIONS_TEXT_MODEL || "";

  if (!token) {
    return NextResponse.json({
      ...buildFallbackResult(tool.id, input, authSource),
      ...(resolvedModel ? { model: resolvedModel } : {}),
    });
  }

  const endpoint = new URL("https://gen.pollinations.ai/v1/chat/completions");
  endpoint.searchParams.set("key", token);

  const prompt = buildPrompt(tool, input);

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
          { role: "user", content: prompt.user },
        ],
        response_format: { type: "json_object" },
        ...(resolvedModel ? { model: resolvedModel } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const fallback = buildFallbackResult(tool.id, input, authSource);

      return NextResponse.json({
        ...fallback,
        ...(resolvedModel ? { model: resolvedModel } : {}),
        warning: `Pollinations responded with ${response.status}. Showing Briefly fallback output instead.`,
      });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      throw new Error("Pollinations returned no content.");
    }

    const normalized = normalizeModelResult(
      tool,
      content,
      authSource,
      resolvedModel || undefined,
    );

    if (!normalized) {
      throw new Error("Pollinations content could not be parsed.");
    }

    return NextResponse.json(normalized);
  } catch {
    const fallback = buildFallbackResult(tool.id, input, authSource);

    return NextResponse.json({
      ...fallback,
      ...(resolvedModel ? { model: resolvedModel } : {}),
    });
  }
}
