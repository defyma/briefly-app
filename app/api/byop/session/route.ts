import { NextResponse } from "next/server";

import {
  clearByopTokenSession,
  readByopTokenFromSession,
  writeByopTokenToSession,
} from "@/lib/byop-session";

export const dynamic = "force-dynamic";

type ByopSessionRequest = {
  apiKey?: unknown;
};

export async function GET() {
  const token = await readByopTokenFromSession();

  return NextResponse.json({
    connected: Boolean(token),
  });
}

export async function POST(request: Request) {
  let payload: ByopSessionRequest;

  try {
    payload = (await request.json()) as ByopSessionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";

  if (!apiKey.startsWith("sk_")) {
    return NextResponse.json(
      { error: "apiKey must be a valid Pollinations user key." },
      { status: 400 },
    );
  }

  try {
    await writeByopTokenToSession(apiKey);
  } catch {
    return NextResponse.json(
      { error: "Server session secret is missing." },
      { status: 500 },
    );
  }

  return NextResponse.json({ connected: true });
}

export async function DELETE() {
  await clearByopTokenSession();

  return NextResponse.json({ connected: false });
}
