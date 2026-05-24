import { NextResponse } from "next/server";

import {
  buildFallbackResult,
  buildPrompt,
  getToolDefinition,
  normalizeModelResult,
  type ToolId,
} from "@/lib/briefly-tools";
import { readByopTokenFromSession } from "@/lib/byop-session";

export const dynamic = "force-dynamic";

const POLLINATIONS_ENDPOINT = "https://gen.pollinations.ai/v1/chat/completions";
const PRIMARY_TIMEOUT_MS = 30_000;
const RETRY_TIMEOUT_MS = 20_000;

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

async function requestStructuredResult(params: {
  token: string;
  prompt: ReturnType<typeof buildPrompt>;
  model?: string;
  timeoutMs: number;
  useResponseFormat: boolean;
}) {
  const { token, prompt, model, timeoutMs, useResponseFormat } = params;
  const endpoint = new URL(POLLINATIONS_ENDPOINT);
  endpoint.searchParams.set("key", token);

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
      ...(useResponseFormat ? { response_format: { type: "json_object" } } : {}),
      ...(model ? { model } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const rawText = await response.text();
  const data = JSON.parse(rawText) as {
    error?: unknown;
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    ok: response.ok,
    status: response.status,
    error:
      typeof data.error === "string"
        ? data.error
        : `Pollinations responded with ${response.status}.`,
    content: data.choices?.[0]?.message?.content,
  };
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

  const sessionToken = await readByopTokenFromSession();
  const authSource = getAuthSource(providedKey || sessionToken || undefined);
  const token = providedKey || sessionToken || process.env.POLLINATIONS_API_KEY || "";
  const resolvedModel = requestedModel || process.env.POLLINATIONS_TEXT_MODEL || "";

  if (!token) {
    return NextResponse.json({
      ...buildFallbackResult(tool.id, input, authSource),
      ...(resolvedModel ? { model: resolvedModel } : {}),
    });
  }

  const prompt = buildPrompt(tool, input);

  let lastError = "";

  try {
    const attempts = [
      { timeoutMs: PRIMARY_TIMEOUT_MS, useResponseFormat: true },
      { timeoutMs: RETRY_TIMEOUT_MS, useResponseFormat: false },
    ] as const;

    for (const attempt of attempts) {
      const response = await requestStructuredResult({
        token,
        prompt,
        model: resolvedModel || undefined,
        timeoutMs: attempt.timeoutMs,
        useResponseFormat: attempt.useResponseFormat,
      });

      if (!response.ok) {
        lastError = response.error;
        continue;
      }

      if (typeof response.content !== "string") {
        lastError = "Pollinations returned no content.";
        continue;
      }

      const normalized = normalizeModelResult(
        tool,
        response.content,
        authSource,
        resolvedModel || undefined,
      );

      if (normalized) {
        return NextResponse.json(normalized);
      }

      lastError = "Pollinations content could not be parsed.";
    }

    const fallback = buildFallbackResult(tool.id, input, authSource);

    return NextResponse.json({
      ...fallback,
      ...(resolvedModel ? { model: resolvedModel } : {}),
      warning:
        lastError ||
        "Pollinations did not return a usable structured result. Showing Briefly fallback output instead.",
    });
  } catch (error) {
    const fallback = buildFallbackResult(tool.id, input, authSource);
    const warning =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "Pollinations timed out while generating a structured result. Showing Briefly fallback output instead."
          : error.message
        : undefined;

    return NextResponse.json({
      ...fallback,
      ...(resolvedModel ? { model: resolvedModel } : {}),
      ...(warning ? { warning } : {}),
    });
  }
}
