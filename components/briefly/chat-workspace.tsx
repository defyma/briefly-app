"use client";

import { useEffect, useState } from "react";
import type { KeyboardEventHandler, RefObject } from "react";

import { RenderChatMessage } from "@/components/briefly/render-chat-message";
import { BrieflyLogo } from "@/components/briefly-logo";
import type { ChatMessage, ChatSeed } from "@/lib/briefly-tools";

type ChatThread = {
  id: string;
  title: string;
  context: ChatSeed | null;
  messages: ChatMessage[];
  updatedAt: number;
};

type ChatWorkspaceProps = {
  activeChatThreadId: string | null;
  byopConnected: boolean;
  chatReady: boolean;
  chatContext: ChatSeed | null;
  chatError: string;
  chatInput: string;
  chatInputRef: RefObject<HTMLTextAreaElement | null>;
  chatLoading: boolean;
  chatMessages: ChatMessage[];
  chatScrollRef: RefObject<HTMLDivElement | null>;
  chatThreads: ChatThread[];
  copiedChatKey: string | null;
  featuresLocked: boolean;
  resolvedModel: string;
  showScrollToBottom: boolean;
  onBackToWorkspace: () => void;
  onChatInputChange: (value: string) => void;
  onChatInputKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onChatScroll: () => void;
  onCopyChatMessage: (messageKey: string, content: string) => void | Promise<void>;
  onOpenSettings: () => void;
  onScrollToBottom: () => void;
  onSelectThread: (threadId: string) => void;
  onSendChat: () => void | Promise<void>;
};

function ChatLoading() {
  return (
    <div className="mt-4 flex items-start">
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

export function ChatWorkspace(props: ChatWorkspaceProps) {
  const {
    activeChatThreadId,
    byopConnected,
    chatReady,
    chatContext,
    chatError,
    chatInput,
    chatInputRef,
    chatLoading,
    chatMessages,
    chatScrollRef,
    chatThreads,
    copiedChatKey,
    featuresLocked,
    resolvedModel,
    showScrollToBottom,
    onBackToWorkspace,
    onChatInputChange,
    onChatInputKeyDown,
    onChatScroll,
    onCopyChatMessage,
    onOpenSettings,
    onScrollToBottom,
    onSelectThread,
    onSendChat,
  } = props;
  const composerLocked = featuresLocked || !chatReady;
  const [expandedSummaryKeys, setExpandedSummaryKeys] = useState<string[]>([]);

  useEffect(() => {
    setExpandedSummaryKeys([]);
  }, [activeChatThreadId]);

  function toggleSummary(summaryKey: string) {
    setExpandedSummaryKeys((previous) =>
      previous.includes(summaryKey)
        ? previous.filter((key) => key !== summaryKey)
        : [...previous, summaryKey],
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-black text-stone-50">
      <div className="grid h-full min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-white/10 bg-black/95">
          <div className="border-b border-white/10 px-5 py-5">
            <BrieflyLogo imageClassName="h-10 w-auto" variant="dark" />
          </div>

          <div className="space-y-3 px-4 py-4">
            <button
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-stone-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              type="button"
              onClick={onBackToWorkspace}
            >
              <span>&larr; Back to Tool Workspace</span>
              <span className="text-stone-500">↗</span>
            </button>
          </div>

          <div className="px-5 pb-3 pt-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                Recents
              </p>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-400">
                {resolvedModel}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {chatThreads.length > 0 ? (
              [...chatThreads]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((thread) => (
                  <button
                    key={thread.id}
                    className={`mb-2 w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                      thread.id === activeChatThreadId
                        ? "bg-white/20 text-white"
                        : "text-stone-300 hover:bg-white/10 hover:text-white"
                    }`}
                    type="button"
                    onClick={() => onSelectThread(thread.id)}
                  >
                    <p className="truncate font-medium">{thread.title}</p>
                  </button>
                ))
            ) : (
              <div className="mx-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-stone-500">
                No recent threads yet. Generate a tool result first, then continue it here with `Discuss in Chat`.
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <button
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              type="button"
              onClick={onOpenSettings}
            >
              Show BYOP settings
            </button>
          </div>
        </aside>

        <section className="relative flex min-h-0 flex-col bg-black">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-3">
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-white">
                {chatThreads.find((thread) => thread.id === activeChatThreadId)?.title ||
                  chatContext?.toolName ||
                  "Briefly Chat"}
              </p>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-stone-400 md:block">
              {byopConnected ? "BYOP connected" : "Features locked"}
            </div>
          </div>

          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 overflow-y-auto"
            onScroll={onChatScroll}
          >
            {chatMessages.length > 0 ? (
              <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-8 px-6 py-8">
                {(() => {
                  let summaryCount = 0;

                  return chatMessages.map((message, index) => {
                  const messageKey = `${message.role}-${index}`;
                  const isSeedContext = message.kind === "seed-context";
                  const isHistorySummary = message.kind === "history-summary";
                  const summaryExpanded = expandedSummaryKeys.includes(messageKey);
                  if (isHistorySummary) {
                    summaryCount += 1;
                  }
                  const summaryLabel = `AUTO COMPACTING ${summaryCount}`;
                  const copyButton = (
                    <button
                      aria-label="Copy message"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-400 opacity-0 transition hover:border-white/20 hover:text-white group-hover:opacity-100"
                      type="button"
                      onClick={() => void onCopyChatMessage(messageKey, message.content)}
                    >
                      {copiedChatKey === messageKey ? (
                        <span className="text-[10px] uppercase tracking-[0.18em]">
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
                    <div key={messageKey}>
                      {isHistorySummary ? (
                        <div className="flex flex-col items-center gap-4">
                          <button
                            className="flex w-full items-center gap-4 text-[11px] font-medium uppercase tracking-[0.28em] text-stone-500 transition hover:text-stone-300"
                            type="button"
                            onClick={() => toggleSummary(messageKey)}
                          >
                            <span className="h-px flex-1 bg-white/10" />
                            <span className="inline-flex items-center gap-3">
                              <span>{summaryLabel}</span>
                              <span className="text-[10px] tracking-[0.22em] text-stone-600">
                                {summaryExpanded ? "HIDE SUMMARY" : "SHOW SUMMARY"}
                              </span>
                            </span>
                            <span className="h-px flex-1 bg-white/10" />
                          </button>

                          {summaryExpanded ? (
                            <div className="w-full max-w-3xl rounded-[1.5rem] border border-amber-300/15 bg-amber-200/[0.06] px-6 py-5 text-base leading-8 text-stone-200">
                              <RenderChatMessage content={message.content} />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div
                          className={`group flex items-start gap-4 ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                      {message.role === "assistant" ? (
                        <div className="max-w-3xl flex-1">
                          <div
                            className={`text-base leading-8 text-stone-200 ${
                              isSeedContext
                                ? "rounded-[1.5rem] border border-cyan-300/20 bg-cyan-200/[0.07] px-6 py-5"
                                : ""
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
                          <div className="mt-4">{copyButton}</div>
                        </div>
                      ) : (
                        <div className="max-w-xl">
                          <div className="rounded-[1.75rem] bg-white/16 px-6 py-4 text-base leading-8 text-white">
                            <RenderChatMessage content={message.content} />
                          </div>
                          <div className="mt-4 flex justify-end">{copyButton}</div>
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  );
                  });
                })()}
                {chatLoading ? <ChatLoading /> : null}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-6">
                <div className="max-w-2xl text-center">
                  <p className="text-4xl font-medium tracking-[-0.04em] text-white">
                    Briefly Chat
                  </p>
                  <p className="mt-4 text-base leading-8 text-stone-500">
                    Bring in any tool result with `Discuss in Chat`, then continue it here in a full-screen thread.
                  </p>
                </div>
              </div>
            )}
          </div>

          {showScrollToBottom ? (
            <button
              aria-label="Scroll to bottom"
              className="absolute bottom-28 left-1/2 z-10 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.14]"
              type="button"
              onClick={onScrollToBottom}
            >
              <svg
                aria-hidden="true"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5v14M12 19l-6-6M12 19l6-6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                />
              </svg>
            </button>
          ) : null}

          <div className="border-t border-white/10 bg-black/95 px-4 py-4">
            <div className="mx-auto max-w-5xl">
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.08] px-5 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                <textarea
                  ref={chatInputRef}
                  rows={1}
                  className="w-full resize-none bg-transparent py-2 pr-16 text-base leading-8 text-stone-100 outline-none placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={composerLocked}
                  placeholder={
                    chatReady
                      ? "Ask anything about this thread..."
                      : "Generate a tool result first, then use Discuss in Chat..."
                  }
                  value={chatInput}
                  onChange={(event) => onChatInputChange(event.target.value)}
                  onKeyDown={onChatInputKeyDown}
                />
                <div className="absolute bottom-3 right-3 flex items-center justify-end">
                  <button
                    aria-label={chatLoading ? "Sending" : "Send"}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-stone-950 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={composerLocked || chatLoading}
                    type="button"
                    onClick={() => void onSendChat()}
                  >
                    {chatLoading ? (
                      <span className="text-xs font-medium uppercase tracking-[0.18em]">
                        ...
                      </span>
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 5v14M12 5l-6 6M12 5l6 6"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.2"
                        />
                      </svg>
                    )}
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
        </section>
      </div>
    </main>
  );
}
