import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "briefly-byop-session";
const CHAT_SCOPE_COOKIE_NAME = "briefly-chat-scope";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionKey() {
  const secret = process.env.BRIEFLY_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing BRIEFLY_SESSION_SECRET.");
  }

  return createHash("sha256").update(secret).digest();
}

function encryptToken(token: string) {
  const iv = randomBytes(12);
  const key = getSessionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

function decryptToken(value: string) {
  const buffer = Buffer.from(value, "base64url");
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const key = getSessionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function readByopTokenFromSession() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;

  if (!value) {
    return "";
  }

  try {
    return decryptToken(value);
  } catch {
    return "";
  }
}

export async function writeByopTokenToSession(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, encryptToken(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_TTL_SECONDS,
  });
}

export async function clearByopTokenSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

function hashScopeValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function ensureBrowserChatScopeId() {
  const store = await cookies();
  const existingValue = store.get(CHAT_SCOPE_COOKIE_NAME)?.value?.trim();

  if (existingValue) {
    return existingValue;
  }

  const scopeId = randomUUID();
  store.set(CHAT_SCOPE_COOKIE_NAME, scopeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_TTL_SECONDS,
  });

  return scopeId;
}

export async function readChatOwnerKey() {
  const byopToken = await readByopTokenFromSession();

  if (byopToken) {
    return `acct:${hashScopeValue(byopToken)}`;
  }

  const browserScopeId = await ensureBrowserChatScopeId();
  return `anon:${hashScopeValue(browserScopeId)}`;
}
