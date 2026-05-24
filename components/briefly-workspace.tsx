"use client";

import { useCallback, useEffect, useState } from "react";
import { ByopSettingsModal } from "@/components/briefly/byop-settings-modal";
import { ChatWorkspace } from "@/components/briefly/chat-workspace";
import { DisconnectConfirmModal } from "@/components/briefly/disconnect-confirm-modal";
import { ToolWorkspace } from "@/components/briefly/tool-workspace";
import { useBrieflyChatUi } from "@/hooks/use-briefly-chat-ui";
import { useBrieflyPersistence } from "@/hooks/use-briefly-persistence";
import { useBrieflyWorkspaceActions } from "@/hooks/use-briefly-workspace-actions";

import {
  TOOL_DEFINITIONS,
  type ChatMessage,
  type ChatSeed,
  type ToolId,
  DEFAULT_MODEL_ID,
} from "@/lib/briefly-tools";
import {
  buildInitialState,
  type ChatThread,
  type ToolStateMap,
  type WorkspaceView,
} from "@/lib/briefly-workspace";

type BrieflyWorkspaceProps = {
  pollinationsClientId?: string;
};

function WorkspaceHydrationShell() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <section className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="h-10 w-36 animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 h-8 w-96 max-w-full animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-4 w-72 max-w-full animate-pulse rounded-full bg-white/5" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-12 w-36 animate-pulse rounded-full border border-white/10 bg-white/5"
            />
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded-full bg-white/5" />
            <div className="mt-6 h-72 animate-pulse rounded-[1.5rem] border border-white/10 bg-stone-900/80" />
          </div>

          <div className="min-h-[38rem] rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="h-6 w-44 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-4 w-72 max-w-full animate-pulse rounded-full bg-white/5" />
            <div className="mt-8 space-y-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4"
                >
                  <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-white/5" />
                  <div className="mt-3 h-3 w-5/6 animate-pulse rounded-full bg-white/5" />
                  <div className="mt-3 h-3 w-2/3 animate-pulse rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function BrieflyWorkspace({
  pollinationsClientId = "",
}: BrieflyWorkspaceProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [toolState, setToolState] = useState<ToolStateMap>(buildInitialState);
  const [activeView, setActiveView] = useState<WorkspaceView>("meeting-notes");
  const [byopConnected, setByopConnected] = useState(false);
  const [byopNotice, setByopNotice] = useState("");
  const [copiedToolId, setCopiedToolId] = useState<ToolId | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [chatContext, setChatContext] = useState<ChatSeed | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [copiedChatKey, setCopiedChatKey] = useState<string | null>(null);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const {
    chatInputRef,
    chatScrollRef,
    handleChatScroll,
    scrollChatToBottom,
    scrollChatToBottomSoon,
    showScrollToBottom,
  } = useBrieflyChatUi({
    activeChatThreadId,
    activeView,
    chatInput,
    chatMessageCount: chatMessages.length,
  });

  const syncByopSession = useCallback(async (apiKey: string) => {
    const response = await fetch("/api/byop/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey }),
    });
    const data = (await response.json()) as { connected?: boolean; error?: string };

    if (!response.ok) {
      throw new Error(data.error || "Failed to save BYOP session.");
    }

    setByopConnected(Boolean(data.connected));
  }, []);

  useBrieflyPersistence({
    activeChatThreadId,
    activeView,
    chatThreads,
    onByopSessionSync: syncByopSession,
    selectedModel,
    setActiveChatThreadId,
    setActiveView,
    setByopConnected,
    setByopNotice,
    setChatThreads,
    setSelectedModel,
    setSettingsOpen,
  });

  const resolvedModel = selectedModel;
  const activeToolId = activeView === "chat" ? chatContext?.toolId || "meeting-notes" : activeView;
  const activeTool = TOOL_DEFINITIONS.find((tool) => tool.id === activeToolId)!;
  const activeState = toolState[activeTool.id];
  const featuresLocked = !byopConnected;
  const chatReady = chatThreads.length > 0 && Boolean(activeChatThreadId);

  const {
    handleConnectPollinations,
    handleCopy,
    handleCopyChatMessage,
    handleDisconnectPollinations,
    handleDiscussInChat,
    handleGenerate,
    handleSendChat,
  } = useBrieflyWorkspaceActions({
    activeChatThreadId,
    chatContext,
    chatInput,
    chatMessages,
    chatThreads,
    featuresLocked,
    pollinationsClientId,
    resolvedModel,
    scrollChatToBottomSoon,
    setActiveChatThreadId,
    setActiveView,
    setByopConnected,
    setByopNotice,
    setChatContext,
    setChatError,
    setChatInput,
    setChatLoading,
    setChatMessages,
    setChatThreads,
    setCopiedChatKey,
    setCopiedToolId,
    setDisconnectConfirmOpen,
    setSettingsOpen,
    setToolState,
    toolState,
  });

  if (!hasMounted) {
    return <WorkspaceHydrationShell />;
  }

  const settingsModal = settingsOpen ? (
    <ByopSettingsModal
      byopConnected={byopConnected}
      byopNotice={byopNotice}
      selectedModel={selectedModel}
      onClose={() => setSettingsOpen(false)}
      onConnect={handleConnectPollinations}
      onDisconnectRequest={() => setDisconnectConfirmOpen(true)}
      onSelectModel={setSelectedModel}
    />
  ) : null;
  const disconnectConfirmModal = disconnectConfirmOpen ? (
    <DisconnectConfirmModal
      onCancel={() => setDisconnectConfirmOpen(false)}
      onConfirm={handleDisconnectPollinations}
    />
  ) : null;

  function handleChatInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void handleSendChat();
  }

  if (activeView === "chat") {
    return (
      <>
        {settingsModal}
        {disconnectConfirmModal}
        <ChatWorkspace
          activeChatThreadId={activeChatThreadId}
          byopConnected={byopConnected}
          chatReady={chatReady}
          chatContext={chatContext}
          chatError={chatError}
          chatInput={chatInput}
          chatInputRef={chatInputRef}
          chatLoading={chatLoading}
          chatMessages={chatMessages}
          chatScrollRef={chatScrollRef}
          chatThreads={chatThreads}
          copiedChatKey={copiedChatKey}
          featuresLocked={featuresLocked}
          resolvedModel={resolvedModel}
          showScrollToBottom={showScrollToBottom}
          onBackToWorkspace={() => setActiveView("meeting-notes")}
          onChatInputChange={setChatInput}
          onChatInputKeyDown={handleChatInputKeyDown}
          onChatScroll={handleChatScroll}
          onCopyChatMessage={handleCopyChatMessage}
          onOpenSettings={() => setSettingsOpen(true)}
          onScrollToBottom={scrollChatToBottom}
          onSelectThread={(threadId) => {
            setActiveChatThreadId(threadId);
            setActiveView("chat");
          }}
          onSendChat={handleSendChat}
        />
      </>
    );
  }

  return (
    <>
      {settingsModal}
      {disconnectConfirmModal}
      <ToolWorkspace
        activeState={activeState}
        activeTool={activeTool}
        activeViewLabel={activeTool.name}
        chatAvailable={chatReady}
        copiedToolId={copiedToolId}
        featuresLocked={featuresLocked}
        resolvedModel={resolvedModel}
        onCopy={handleCopy}
        onDiscussInChat={handleDiscussInChat}
        onGenerate={handleGenerate}
        onInputChange={(toolId, value) =>
          setToolState((previous) => ({
            ...previous,
            [toolId]: {
              ...previous[toolId],
              input: value,
            },
          }))
        }
        onOpenSettings={() => setSettingsOpen(true)}
        onSetActiveView={(view) => {
          if (view === "chat" && !chatReady) {
            return;
          }
          setActiveView(view);
        }}
      />
    </>
  );
}
