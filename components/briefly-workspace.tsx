"use client";

import { useEffect, useState } from "react";
import { BrieflyLogo } from "@/components/briefly-logo";

import {
  BYOP_AUTH_MODELS,
  BYOP_MODEL_OPTIONS,
  DEFAULT_MODEL_ID,
  detectLanguage,
  TOOL_DEFINITIONS,
  formatBriefForCopy,
  type ChatMessage,
  type ChatSeed,
  type GeneratedBrief,
  type ToolId,
} from "@/lib/briefly-tools";

const STORAGE_KEY = "briefly-byop-token";
const MODEL_STORAGE_KEY = "briefly-model-id";
const CHAT_THREADS_STORAGE_KEY = "briefly-chat-threads";
const ACTIVE_CHAT_THREAD_STORAGE_KEY = "briefly-active-chat-thread";
const BYOP_STATE_STORAGE_KEY = "briefly-byop-state";
const POLLINATIONS_CLIENT_ID =
  process.env.NEXT_PUBLIC_POLLINATIONS_CLIENT_ID ?? "";
const DEFAULT_BYOP_BUDGET = "10";
const DEFAULT_BYOP_EXPIRY_DAYS = "7";
type WorkspaceView = ToolId | "chat";

type ToolState = {
  input: string;
  result: GeneratedBrief | null;
  error: string;
  isLoading: boolean;
};

type ToolStateMap = Record<ToolId, ToolState>;
type ChatThread = {
  id: string;
  title: string;
  context: ChatSeed | null;
  messages: ChatMessage[];
  updatedAt: number;
};

function buildInitialState(): ToolStateMap {
  return {
    "meeting-notes": {
      input: "",
      result: null,
      error: "",
      isLoading: false,
    },
    "task-breakdown": {
      input: "",
      result: null,
      error: "",
      isLoading: false,
    },
    "reply-draft": {
      input: "",
      result: null,
      error: "",
      isLoading: false,
    },
  };
}

function LoadingOutput({ toolName }: { toolName: string }) {
  return (
    <div className="mt-4 flex flex-1 flex-col px-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-950">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-stone-950" />
              <span
                className="h-2.5 w-2.5 animate-pulse rounded-full bg-stone-950"
                style={{ animationDelay: "140ms" }}
              />
            </span>
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-cyan-200/80">
            AI processing
          </p>
        </div>
        <div className="rounded-full border border-cyan-200/15 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100/80">
          {toolName}
        </div>
      </div>

      <div className="mt-14 flex items-center gap-3 text-3xl italic text-stone-300">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
        <span>Thinking...</span>
      </div>

      <p className="mt-5 max-w-xl text-sm leading-7 text-stone-400">
        Briefly is reading the input, structuring the response, and preparing a cleaner output card.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[1.25rem] border border-white/8 bg-black/20 p-4"
          >
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/15" />
            <div className="mt-4 space-y-3">
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
          Pipeline
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            Read input
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            Detect intent
          </span>
          <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-amber-100">
            Structure output
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            Render result
          </span>
        </div>
      </div>
    </div>
  );
}

function renderInlineFormatting(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const content = token.slice(1, -1);
    const key = `${keyPrefix}-${partIndex++}`;

    if (token.startsWith("`")) {
      parts.push(
        <code
          key={key}
          className="rounded bg-white/10 px-1.5 py-0.5 text-[0.95em] text-cyan-100"
        >
          {content}
        </code>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <strong key={key} className="font-semibold text-white">
          {content}
        </strong>,
      );
    } else if (token.startsWith("_")) {
      parts.push(
        <em key={key} className="italic">
          {content}
        </em>,
      );
    } else if (token.startsWith("~")) {
      parts.push(
        <span key={key} className="line-through opacity-80">
          {content}
        </span>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function RenderChatMessage({ content }: { content: string }) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].startsWith("```")) {
        i += 1;
      }
      blocks.push(
        <pre
          key={`code-${i}`}
          className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cyan-100"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (/^>\s+/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s+/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-cyan-300/40 pl-4 text-stone-300"
        >
          {quoteLines.map((quoteLine, index) => (
            <p key={`quote-line-${index}`} className="whitespace-pre-wrap break-words">
              {renderInlineFormatting(quoteLine, `quote-${i}-${index}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^(\*|-)\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\*|-)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^(\*|-)\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc space-y-2 pl-5">
          {items.map((item, index) => (
            <li key={`ul-item-${index}`} className="whitespace-pre-wrap break-words">
              {renderInlineFormatting(item, `ul-${i}-${index}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal space-y-2 pl-5">
          {items.map((item, index) => (
            <li key={`ol-item-${index}`} className="whitespace-pre-wrap break-words">
              {renderInlineFormatting(item, `ol-${i}-${index}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^>\s+/.test(lines[i]) &&
      !/^(\*|-)\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i += 1;
    }

    blocks.push(
      <p key={`p-${i}`} className="whitespace-pre-wrap break-words">
        {renderInlineFormatting(paragraphLines.join("\n"), `p-${i}`)}
      </p>,
    );
  }

  return <div className="space-y-4">{blocks}</div>;
}

function ChatLoading() {
  return (
    <div className="mt-4 flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-white">
        AI
      </div>
      <div className="flex max-w-3xl flex-1 flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-4">
        <div className="flex items-center gap-3 text-lg italic text-stone-300">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
          <span>Thinking...</span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function createByopState() {
  return `briefly-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRedirectUri() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}/app`;
}

export function BrieflyWorkspace() {
  const [toolState, setToolState] = useState<ToolStateMap>(buildInitialState);
  const [activeView, setActiveView] = useState<WorkspaceView>("meeting-notes");
  const [apiKey, setApiKey] = useState("");
  const [persistToken, setPersistToken] = useState(true);
  const [byopNotice, setByopNotice] = useState("");
  const [copiedToolId, setCopiedToolId] = useState<ToolId | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatContext, setChatContext] = useState<ChatSeed | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [copiedChatKey, setCopiedChatKey] = useState<string | null>(null);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(STORAGE_KEY) ?? "";
    const savedModel = window.localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_MODEL_ID;

    if (savedToken) {
      setApiKey(savedToken);
    }

    setSelectedModel(
      BYOP_MODEL_OPTIONS.some((model) => model.id === savedModel)
        ? savedModel
        : DEFAULT_MODEL_ID,
    );

    const savedThreads = window.localStorage.getItem(CHAT_THREADS_STORAGE_KEY);
    const savedActiveThread = window.localStorage.getItem(
      ACTIVE_CHAT_THREAD_STORAGE_KEY,
    );

    if (savedThreads) {
      try {
        const parsed = JSON.parse(savedThreads) as ChatThread[];
        if (Array.isArray(parsed)) {
          setChatThreads(parsed);
        }
      } catch {}
    }

    if (savedActiveThread) {
      setActiveChatThreadId(savedActiveThread);
    }

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";

    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    const returnedKey = params.get("api_key")?.trim() ?? "";
    const returnedState = params.get("state")?.trim() ?? "";
    const returnedError = params.get("error")?.trim() ?? "";
    const expectedState =
      window.localStorage.getItem(BYOP_STATE_STORAGE_KEY) ?? "";

    if (returnedKey) {
      if (expectedState && returnedState && expectedState !== returnedState) {
        setByopNotice("BYOP state mismatch. Please connect again.");
      } else {
        setApiKey(returnedKey);
        setPersistToken(true);
        setSettingsOpen(true);
        setByopNotice("Pollinations connected. Your BYOP key is ready.");
      }
    } else if (returnedError === "access_denied") {
      setByopNotice("Pollinations access was denied.");
      setSettingsOpen(true);
    }

    window.localStorage.removeItem(BYOP_STATE_STORAGE_KEY);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);

  useEffect(() => {
    if (!persistToken) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (apiKey) {
      window.localStorage.setItem(STORAGE_KEY, apiKey);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [apiKey, persistToken]);

  useEffect(() => {
    window.localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    window.localStorage.setItem(
      CHAT_THREADS_STORAGE_KEY,
      JSON.stringify(chatThreads),
    );
  }, [chatThreads]);

  useEffect(() => {
    if (activeChatThreadId) {
      window.localStorage.setItem(
        ACTIVE_CHAT_THREAD_STORAGE_KEY,
        activeChatThreadId,
      );
    } else {
      window.localStorage.removeItem(ACTIVE_CHAT_THREAD_STORAGE_KEY);
    }
  }, [activeChatThreadId]);

  useEffect(() => {
    const activeThread = chatThreads.find(
      (thread) => thread.id === activeChatThreadId,
    );

    if (activeThread) {
      setChatContext(activeThread.context);
      setChatMessages(activeThread.messages);
      return;
    }

    if (chatThreads.length > 0 && !activeChatThreadId) {
      const latest = [...chatThreads].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setActiveChatThreadId(latest.id);
      return;
    }

    if (!activeThread) {
      setChatContext(null);
      setChatMessages([]);
    }
  }, [chatThreads, activeChatThreadId]);

  const resolvedModel = selectedModel;
  const activeToolId = activeView === "chat" ? chatContext?.toolId || "meeting-notes" : activeView;
  const activeTool = TOOL_DEFINITIONS.find((tool) => tool.id === activeToolId)!;
  const activeState = toolState[activeTool.id];

  async function handleGenerate(toolId: ToolId) {
    const current = toolState[toolId];

    if (!current.input.trim()) {
      setToolState((previous) => ({
        ...previous,
        [toolId]: {
          ...previous[toolId],
          error: "Please add some input first.",
        },
      }));
      return;
    }

    setToolState((previous) => ({
      ...previous,
      [toolId]: {
        ...previous[toolId],
        error: "",
        isLoading: true,
      },
    }));

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolId,
          input: current.input,
          apiKey: apiKey.trim() || undefined,
          model: resolvedModel || undefined,
        }),
      });

      const data = (await response.json()) as GeneratedBrief & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setToolState((previous) => ({
        ...previous,
        [toolId]: {
          ...previous[toolId],
          result: data,
          error: "",
          isLoading: false,
        },
      }));
    } catch (error) {
      setToolState((previous) => ({
        ...previous,
        [toolId]: {
          ...previous[toolId],
          error:
            error instanceof Error
              ? error.message
              : "Something went wrong while generating the result.",
          isLoading: false,
        },
      }));
    }
  }

  async function handleCopy(toolId: ToolId) {
    const result = toolState[toolId].result;

    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(formatBriefForCopy(result));
    setCopiedToolId(toolId);
    window.setTimeout(() => setCopiedToolId(null), 1600);
  }

  async function handleCopyChatMessage(messageKey: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedChatKey(messageKey);
    window.setTimeout(() => setCopiedChatKey(null), 1600);
  }

  function makeThreadTitle(toolName: string, summary: string) {
    const firstLine = summary.split("\n")[0]?.trim() || toolName;
    return firstLine.length > 42 ? `${firstLine.slice(0, 41)}...` : firstLine;
  }

  function createThreadId() {
    return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function updateThread(threadId: string, updater: (thread: ChatThread) => ChatThread) {
    setChatThreads((previous) =>
      previous.map((thread) => (thread.id === threadId ? updater(thread) : thread)),
    );
  }

  function handleDiscussInChat(toolId: ToolId) {
    const result = toolState[toolId].result;
    const tool = TOOL_DEFINITIONS.find((item) => item.id === toolId);

    if (!result || !tool) {
      return;
    }

    const summary = formatBriefForCopy(result);
    const language = detectLanguage(summary);

    setChatContext({
      toolId,
      toolName: tool.name,
      summary,
    });
    const seedMessages: ChatMessage[] = [
      {
        role: "assistant",
        kind: "seed-context",
        content: summary,
      },
      {
        role: "assistant",
        kind: "default",
        content:
          language === "id"
            ? `Kita lanjut dari hasil ${tool.name} tadi. Bilang aja kalau mau revisi, diperjelas, atau diteruskan ke versi lain.`
            : `We can continue from the ${tool.name} result. Tell me if you want it revised, sharpened, or extended.`,
      },
    ];
    const threadId = createThreadId();
    const thread: ChatThread = {
      id: threadId,
      title: makeThreadTitle(tool.name, summary),
      context: {
        toolId,
        toolName: tool.name,
        summary,
      },
      messages: seedMessages,
      updatedAt: Date.now(),
    };

    setChatThreads((previous) => [thread, ...previous].slice(0, 12));
    setActiveChatThreadId(threadId);
    setChatMessages(seedMessages);
    setChatInput("");
    setChatError("");
    setActiveView("chat");
  }

  function handleConnectPollinations() {
    if (!POLLINATIONS_CLIENT_ID) {
      setByopNotice(
        "Missing NEXT_PUBLIC_POLLINATIONS_CLIENT_ID. Add your pk_... key first.",
      );
      setSettingsOpen(true);
      return;
    }

    const redirectUri = getRedirectUri();
    const state = createByopState();
    const params = new URLSearchParams({
      client_id: POLLINATIONS_CLIENT_ID,
      redirect_uri: redirectUri,
      budget: DEFAULT_BYOP_BUDGET,
      expiry: DEFAULT_BYOP_EXPIRY_DAYS,
      models: BYOP_AUTH_MODELS,
      state,
    });

    window.localStorage.setItem(BYOP_STATE_STORAGE_KEY, state);
    window.location.href = `https://enter.pollinations.ai/authorize?${params.toString()}`;
  }

  function handleDisconnectPollinations() {
    setApiKey("");
    setByopNotice("Saved BYOP key removed from this browser.");
  }

  async function handleSendChat() {
    if (!chatInput.trim()) {
      setChatError("Please enter a message first.");
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: chatInput.trim() },
    ];

    setChatMessages(nextMessages);
    if (activeChatThreadId) {
      updateThread(activeChatThreadId, (thread) => ({
        ...thread,
        messages: nextMessages,
        updatedAt: Date.now(),
      }));
    }
    setChatInput("");
    setChatError("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          model: resolvedModel || undefined,
          context: chatContext || undefined,
          messages: nextMessages,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.message) {
        throw new Error(data.error || "Chat request failed.");
      }

      setChatMessages((previous) => [
        ...previous,
        { role: "assistant", content: data.message as string },
      ]);
      if (activeChatThreadId) {
        updateThread(activeChatThreadId, (thread) => ({
          ...thread,
          messages: [
            ...thread.messages,
            { role: "assistant", content: data.message as string },
          ],
          updatedAt: Date.now(),
        }));
      }
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Something went wrong in chat.",
      );
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <section className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <BrieflyLogo
                imageClassName="h-11 w-auto"
                variant="dark"
              />
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Three focused tools, one calmer workflow.
              </h1>
              <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
                Switch tools with tabs, keep the working area wide, and only open
                BYOP settings when you need them.
              </p>
            </div>

            <button
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
            >
              {settingsOpen ? "Hide BYOP settings" : "Show BYOP settings"}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-stone-300">
              {apiKey ? "BYOP connected" : "Fallback mode"}
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-stone-300">
              Model: {resolvedModel || "none"}
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-stone-300">
              Active view: {activeView === "chat" ? "Chat" : activeTool.name}
            </div>
          </div>

          {settingsOpen ? (
            <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-emerald-500/15 bg-emerald-400/10 p-5 lg:grid-cols-[1fr_1fr]">
              <div className="lg:col-span-2 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Connect Pollinations
                    </p>
                    <p className="mt-1 text-sm leading-6 text-emerald-50/80">
                      Primary BYOP flow for Briefly. Redirects to Pollinations and returns to <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.95em] text-white">/app</code>.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {!apiKey ? (
                      <button
                        className="rounded-full bg-white px-5 py-3 text-sm font-medium text-stone-950 transition hover:bg-stone-100"
                        type="button"
                        onClick={handleConnectPollinations}
                      >
                        Connect Pollinations
                      </button>
                    ) : null}
                    {apiKey ? (
                      <button
                        className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/5"
                        type="button"
                        onClick={handleDisconnectPollinations}
                      >
                        Disconnect
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-emerald-50/75">
                  <span className="rounded-full border border-white/10 px-3 py-2">
                    {apiKey ? "connected" : "not connected"}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-2">
                    budget {DEFAULT_BYOP_BUDGET}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-2">
                    expiry {DEFAULT_BYOP_EXPIRY_DAYS}d
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-2">
                    route /app
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-emerald-100">Model</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm text-white outline-none"
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                >
                  {BYOP_MODEL_OPTIONS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.id} = {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-emerald-100 lg:col-span-2">
                The BYOP key stays in local storage on this browser after approval.
              </div>

              {byopNotice ? (
                <p className="rounded-2xl border border-emerald-300/20 bg-emerald-200/10 px-4 py-3 text-sm text-emerald-50 lg:col-span-2">
                  {byopNotice}
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          {TOOL_DEFINITIONS.map((tool) => {
            const isActive = tool.id === activeView;

            return (
              <button
                key={tool.id}
                className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-200 text-stone-950"
                    : "border border-white/10 bg-white/5 text-stone-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
                type="button"
                onClick={() => setActiveView(tool.id)}
              >
                {tool.name}
              </button>
            );
          })}
          <button
            className={`rounded-full px-5 py-3 text-sm font-medium transition ${
              activeView === "chat"
                ? "bg-amber-200 text-stone-950"
                : "border border-white/10 bg-white/5 text-stone-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
            }`}
            type="button"
            onClick={() => setActiveView("chat")}
          >
            Chat
          </button>
        </div>

        {activeView === "chat" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                    Chat
                  </p>
                  <h2 className="mt-2 text-2xl font-medium text-white">Recent</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.18em] text-stone-300">
                  {resolvedModel}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {chatThreads.length > 0 ? (
                  [...chatThreads]
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((thread) => (
                      <button
                        key={thread.id}
                        className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                          thread.id === activeChatThreadId
                            ? "border-cyan-300/30 bg-cyan-200/10"
                            : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                        }`}
                        type="button"
                        onClick={() => {
                          setActiveChatThreadId(thread.id);
                          setActiveView("chat");
                        }}
                      >
                        <p className="truncate text-sm font-medium text-white">
                          {thread.title}
                        </p>
                      </button>
                    ))
                ) : (
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-stone-400">
                    No recent threads yet. Generate a result first, then use `Discuss in Chat`.
                  </div>
                )}
              </div>
            </aside>

            <section
              className={`flex min-h-[42rem] flex-col rounded-[2rem] border p-0 ${
                chatLoading
                  ? "thinking-shell border-transparent bg-[#171414]"
                  : "border-white/10 bg-[#171414]"
              }`}
            >
              <div className="border-b border-white/8 px-6 py-5">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Briefly Chat
                </p>
                <p className="mt-2 text-sm text-stone-400">
                  Review, refine, or continue the current thread with the same model.
                </p>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-auto px-6 py-6">
                  {chatMessages.length > 0 ? (
                    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                      {chatMessages.map((message, index) => {
                        const messageKey = `${message.role}-${index}`;
                        const isSeedContext = message.kind === "seed-context";
                        const copyButton = (
                          <button
                            aria-label="Copy message"
                            className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/10 text-stone-300 transition hover:border-white/20 hover:text-white"
                            type="button"
                            onClick={() =>
                              void handleCopyChatMessage(messageKey, message.content)
                            }
                          >
                            {copiedChatKey === messageKey ? (
                              <span className="text-[11px] uppercase tracking-[0.18em]">
                                Copied
                              </span>
                            ) : (
                              <svg
                                aria-hidden="true"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  height="12"
                                  rx="2.5"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  width="12"
                                  x="8"
                                  y="4"
                                />
                                <rect
                                  height="12"
                                  rx="2.5"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  width="12"
                                  x="4"
                                  y="8"
                                />
                              </svg>
                            )}
                          </button>
                        );

                        return (
                          <div
                            key={messageKey}
                            className={`flex items-start gap-4 ${
                              message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {message.role === "assistant" ? (
                              <>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-white">
                                  AI
                                </div>
                                <div
                                  className={`max-w-[78%] px-6 py-4 text-sm leading-7 text-stone-200 ${
                                    isSeedContext
                                      ? "rounded-[1.5rem] border border-cyan-300/20 bg-cyan-200/[0.07]"
                                      : "rounded-[2rem] border border-white/10 bg-white/[0.03]"
                                  }`}
                                >
                                  {isSeedContext ? (
                                    <div>
                                      <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
                                        Seed context
                                      </p>
                                      <RenderChatMessage content={message.content} />
                                    </div>
                                  ) : (
                                    <RenderChatMessage content={message.content} />
                                  )}
                                </div>
                                {copyButton}
                              </>
                            ) : (
                              <>
                                {copyButton}
                                <div className="max-w-[60%] rounded-[2rem] bg-[#2a241f] px-6 py-4 text-sm leading-7 text-stone-100">
                                  <RenderChatMessage content={message.content} />
                                </div>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-200 text-sm font-semibold text-stone-950">
                                  U
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {chatLoading ? <ChatLoading /> : null}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center px-6">
                      <div className="max-w-xl rounded-[2rem] border border-dashed border-white/10 px-8 py-10 text-center text-sm leading-7 text-stone-500">
                        Start from any tool result, click `Discuss in Chat`, then continue the work here like a focused chat thread.
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/8 px-4 py-4">
                  <div className="mx-auto max-w-4xl">
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
                      <textarea
                        className="min-h-28 w-full resize-none bg-transparent px-3 py-3 text-sm text-stone-100 outline-none placeholder:text-stone-500"
                        placeholder="Ask for a revision, deeper explanation, or a follow-up version..."
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                      />
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/8 px-3 pt-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          {chatContext ? `Context: ${chatContext.toolName}` : "No context seeded"}
                        </div>
                        <button
                          className="rounded-full bg-white px-5 py-3 text-sm font-medium text-stone-950 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={chatLoading}
                          type="button"
                          onClick={() => void handleSendChat()}
                        >
                          {chatLoading ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </div>

                    {chatError ? (
                      <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                        {chatError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-2xl font-medium text-white">{activeTool.name}</h2>
              <p className="mt-2 text-sm leading-7 text-stone-400">
                {activeTool.shortDescription}
              </p>

              <label className="mt-6 block text-sm text-stone-300">
                {activeTool.inputLabel}
              </label>
              <textarea
                className="mt-2 min-h-72 w-full rounded-[1.5rem] border border-white/10 bg-stone-900/80 px-4 py-4 text-sm text-stone-100 outline-none placeholder:text-stone-500"
                placeholder={activeTool.placeholder}
                value={activeState.input}
                onChange={(event) =>
                  setToolState((previous) => ({
                    ...previous,
                    [activeTool.id]: {
                      ...previous[activeTool.id],
                      input: event.target.value,
                    },
                  }))
                }
              />

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full bg-amber-200 px-5 py-3 text-sm font-medium text-stone-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={activeState.isLoading}
                  type="button"
                  onClick={() => handleGenerate(activeTool.id)}
                >
                  {activeState.isLoading ? "Generating..." : activeTool.ctaLabel}
                </button>
              </div>

              {activeState.error ? (
                <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  {activeState.error}
                </p>
              ) : null}
          </section>

          <section
            className={`flex min-h-[38rem] flex-col rounded-[2rem] border p-5 ${
              activeState.isLoading
                ? "thinking-shell border border-transparent bg-white/5"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                    Output
                  </p>
                  <p className="mt-2 text-sm text-stone-400">
                    {activeTool.introLabel}
                  </p>
                </div>
                {activeState.result ? (
                  <button
                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-stone-300 transition hover:border-white/30 hover:text-white"
                    type="button"
                    onClick={() => handleCopy(activeTool.id)}
                  >
                    {copiedToolId === activeTool.id ? "Copied" : "Copy"}
                  </button>
                ) : null}
              </div>

              {activeState.isLoading ? (
                <LoadingOutput toolName={activeTool.name} />
              ) : activeState.result ? (
                <div className="mt-4 flex flex-1 flex-col">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl font-medium text-white">
                        {activeState.result.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {activeState.result.model &&
                        activeState.result.mode === "pollinations" ? (
                          <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-300">
                            {activeState.result.model}
                          </div>
                        ) : null}
                        <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-300">
                          {activeState.result.mode}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-200/20"
                        type="button"
                        onClick={() => handleDiscussInChat(activeTool.id)}
                      >
                        Discuss in Chat
                      </button>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-stone-300">
                      {activeState.result.intro}
                    </p>
                    {activeState.result.warning ? (
                      <p className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
                        {activeState.result.warning}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {activeState.result.sections.map((section) => (
                      <section
                        key={section.key}
                        className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4"
                      >
                        <h4 className="text-sm font-medium uppercase tracking-[0.18em] text-stone-300">
                          {section.label}
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-200">
                          {section.items.map((item, index) => (
                            <li
                              key={`${section.key}-${index}`}
                              className="rounded-xl bg-white/5 px-3 py-2"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 px-6 text-center text-sm leading-7 text-stone-500">
                  Choose a tool, add input, then generate to see a wider and cleaner structured result here.
                </div>
              )}
            </div>
          </section>
        </div>
        )}
      </section>
      <footer className="mx-auto w-full max-w-7xl px-6 pb-8 pt-2 text-sm text-stone-500 sm:px-10 lg:px-12">
        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>Briefly by @defyma (Defy M Aminuddin)</p>
            <p>
              Made with ♡ by{" "}
              <a
                className="text-stone-300 transition hover:text-white"
                href="https://pollinations.ai"
                target="_blank"
                rel="noreferrer"
              >
                Pollinations.AI
              </a>
            </p>
          </div>
          <a
            className="text-stone-300 transition hover:text-white"
            href="https://github.com/defyma/briefly-app"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub 🐙
          </a>
        </div>
      </footer>
    </main>
  );
}
