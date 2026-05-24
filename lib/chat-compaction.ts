import type { ChatMessage, ChatSeed, SupportedLanguage } from "@/lib/briefly-tools";

function readPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

export const CHAT_MESSAGE_LIMIT = readPositiveIntegerEnv("CHAT_LIMIT", 100);
export const CHAT_COMPACT_KEEP_RECENT = readPositiveIntegerEnv(
  "CHAT_KEEP_RECENT",
  24,
);

export type CompactChatParams = {
  context: ChatSeed | null;
  language: SupportedLanguage;
  messages: ChatMessage[];
  summarize: (prompt: string) => Promise<string>;
};

function isSeedContextMessage(message: ChatMessage) {
  return message.kind === "seed-context";
}

function isHistorySummaryMessage(message: ChatMessage) {
  return message.kind === "history-summary";
}

function isConversationMessage(message: ChatMessage) {
  return !isSeedContextMessage(message) && !isHistorySummaryMessage(message);
}

function getLastHistorySummaryIndex(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (isHistorySummaryMessage(messages[index])) {
      return index;
    }
  }

  return -1;
}

function normalizeSummaryText(summary: string) {
  return summary
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function formatMessagesForSummary(messages: ChatMessage[]) {
  return messages
    .map((message, index) => {
      const speaker = message.role === "user" ? "User" : "Assistant";
      return `${index + 1}. ${speaker}: ${message.content.trim()}`;
    })
    .join("\n");
}

function buildSummaryPrompt(params: {
  context: ChatSeed | null;
  existingSummary: string | null;
  language: SupportedLanguage;
  messagesToCompact: ChatMessage[];
}) {
  const { context, existingSummary, language, messagesToCompact } = params;
  const intro =
    language === "id"
      ? [
          "Ringkas percakapan lama berikut menjadi memory summary untuk dipakai agent.",
          "Tujuannya agar percakapan bisa dicompact tanpa kehilangan konteks penting.",
          "Fokus pada: tujuan user, keputusan, constraint, detail penting, follow-up yang masih aktif, dan koreksi yang sudah terjadi.",
          "Jangan buat jawaban percakapan. Jangan menyapa. Jangan menambahkan info baru.",
          "Tulis ringkas, faktual, dan tahan untuk lanjutan chat.",
          "Format wajib:",
          "- 1 paragraf singkat konteks umum",
          "- lalu bullet list sederhana dengan prefix '- '",
          "Maksimal sekitar 220 kata.",
        ].join("\n")
      : [
          "Summarize the older conversation below into a compact memory summary for the agent.",
          "The goal is to compact chat history without losing important context.",
          "Focus on: user goals, decisions, constraints, important details, active follow-ups, and corrections already made.",
          "Do not answer the user. Do not greet. Do not add new information.",
          "Keep it concise, factual, and durable for continued chat.",
          "Required format:",
          "- 1 short paragraph of overall context",
          "- then simple bullet points prefixed with '- '",
          "Keep it under roughly 220 words.",
        ].join("\n");

  return [
    intro,
    context
      ? language === "id"
        ? `\nContext tool awal:\n- Tool: ${context.toolName}\n- Summary:\n${context.summary}`
        : `\nOriginal tool context:\n- Tool: ${context.toolName}\n- Summary:\n${context.summary}`
      : "",
    existingSummary
      ? language === "id"
        ? `\nSummary compact sebelumnya:\n${existingSummary}`
        : `\nPrevious compact summary:\n${existingSummary}`
      : "",
    language === "id"
      ? `\nPercakapan lama yang harus dicompact:\n${formatMessagesForSummary(messagesToCompact)}`
      : `\nOlder conversation to compact:\n${formatMessagesForSummary(messagesToCompact)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function needsChatCompaction(messages: ChatMessage[]) {
  const lastHistorySummaryIndex = getLastHistorySummaryIndex(messages);
  const activeMessages = messages
    .slice(lastHistorySummaryIndex + 1)
    .filter(isConversationMessage);

  return activeMessages.length > CHAT_MESSAGE_LIMIT;
}

export function buildChatMessagesForModel(messages: ChatMessage[]) {
  const lastHistorySummaryIndex = getLastHistorySummaryIndex(messages);
  const latestSummaryMessage =
    lastHistorySummaryIndex >= 0 ? messages[lastHistorySummaryIndex] : null;
  const activeMessages = messages
    .slice(lastHistorySummaryIndex + 1)
    .filter(isConversationMessage);

  return latestSummaryMessage
    ? [latestSummaryMessage, ...activeMessages]
    : activeMessages;
}

export async function compactChatMessagesWithAgent(
  params: CompactChatParams,
): Promise<ChatMessage[]> {
  const { context, language, messages, summarize } = params;
  const lastHistorySummaryIndex = getLastHistorySummaryIndex(messages);
  const activeTail = messages.slice(lastHistorySummaryIndex + 1);
  const activeConversationMessages = activeTail.filter(isConversationMessage);

  if (activeConversationMessages.length <= CHAT_MESSAGE_LIMIT) {
    return messages;
  }

  const existingSummaryMessage =
    lastHistorySummaryIndex >= 0 ? messages[lastHistorySummaryIndex] : null;
  const keepRecent = Math.min(CHAT_COMPACT_KEEP_RECENT, activeConversationMessages.length);
  const messagesToCompact = activeConversationMessages.slice(
    0,
    activeConversationMessages.length - keepRecent,
  );

  if (messagesToCompact.length === 0) {
    return messages;
  }

  const summaryPrompt = buildSummaryPrompt({
    context,
    existingSummary: existingSummaryMessage?.content ?? null,
    language,
    messagesToCompact,
  });
  const summaryText = normalizeSummaryText(await summarize(summaryPrompt));

  if (!summaryText) {
    return messages;
  }

  let seenConversationMessages = 0;
  let insertOffset = activeTail.length;

  for (let index = 0; index < activeTail.length; index += 1) {
    if (!isConversationMessage(activeTail[index])) {
      continue;
    }

    seenConversationMessages += 1;

    if (seenConversationMessages === messagesToCompact.length) {
      insertOffset = index + 1;
      break;
    }
  }

  const insertIndex = lastHistorySummaryIndex + 1 + insertOffset;

  return [
    ...messages.slice(0, insertIndex),
    {
      role: "assistant",
      kind: "history-summary",
      content: summaryText,
    },
    ...messages.slice(insertIndex),
  ];
}
