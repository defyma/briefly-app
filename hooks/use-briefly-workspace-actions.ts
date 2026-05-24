"use client";

import { useCallback, useEffect } from "react";

import {
  BYOP_AUTH_MODELS,
  detectLanguage,
  TOOL_DEFINITIONS,
  formatBriefForCopy,
  type ChatMessage,
  type ChatSeed,
  type GeneratedBrief,
  type ToolId,
} from "@/lib/briefly-tools";
import {
  BYOP_STATE_STORAGE_KEY,
  createByopState,
  DEFAULT_BYOP_BUDGET,
  DEFAULT_BYOP_EXPIRY_DAYS,
  getRedirectUri,
  makeThreadTitle,
  type ChatThread,
  type ToolStateMap,
  type WorkspaceView,
} from "@/lib/briefly-workspace";

type UseBrieflyWorkspaceActionsParams = {
  activeChatThreadId: string | null;
  chatContext: ChatSeed | null;
  chatInput: string;
  chatMessages: ChatMessage[];
  chatThreads: ChatThread[];
  featuresLocked: boolean;
  pollinationsClientId: string;
  resolvedModel: string;
  scrollChatToBottomSoon: () => void;
  setActiveChatThreadId: (value: string | null) => void;
  setActiveView: (value: WorkspaceView) => void;
  setByopConnected: (value: boolean) => void;
  setByopNotice: (value: string) => void;
  setChatContext: (value: ChatSeed | null) => void;
  setChatError: (value: string) => void;
  setChatInput: (value: string) => void;
  setChatLoading: (value: boolean) => void;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setChatThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>;
  setCopiedChatKey: (value: string | null) => void;
  setCopiedToolId: (value: ToolId | null) => void;
  setDisconnectConfirmOpen: (value: boolean) => void;
  setSettingsOpen: (value: boolean) => void;
  setToolState: React.Dispatch<React.SetStateAction<ToolStateMap>>;
  toolState: ToolStateMap;
};

export function useBrieflyWorkspaceActions(
  params: UseBrieflyWorkspaceActionsParams,
) {
  const {
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
  } = params;

  const updateThread = useCallback(
    (threadId: string, updater: (thread: ChatThread) => ChatThread) => {
      setChatThreads((previous) =>
        previous.map((thread) => (thread.id === threadId ? updater(thread) : thread)),
      );
    },
    [setChatThreads],
  );

  useEffect(() => {
    const activeThread = chatThreads.find(
      (thread) => thread.id === activeChatThreadId,
    );

    if (chatThreads.length > 0 && !activeChatThreadId) {
      const latest = [...chatThreads].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setActiveChatThreadId(latest.id);
      return;
    }

    if (!activeThread) {
      setChatContext(null);
      setChatMessages([]);
      return;
    }

    setChatContext(activeThread.context);

    if (activeThread.messages.length > 0) {
      setChatMessages(activeThread.messages);
      return;
    }

    let cancelled = false;

    void fetch(`/api/chat/threads/${activeThread.id}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          error?: string;
          thread?: ChatThread;
        };

        if (!response.ok || !data.thread || cancelled) {
          throw new Error(data.error || "Failed to load chat thread.");
        }

        setChatContext(data.thread.context);
        setChatMessages(data.thread.messages);
        updateThread(activeThread.id, () => data.thread as ChatThread);
      })
      .catch(() => {
        if (!cancelled) {
          setChatMessages([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeChatThreadId,
    chatThreads,
    setActiveChatThreadId,
    setChatContext,
    setChatMessages,
    updateThread,
  ]);

  const handleGenerate = useCallback(
    async (toolId: ToolId) => {
      if (featuresLocked) {
        setToolState((previous) => ({
          ...previous,
          [toolId]: {
            ...previous[toolId],
            error: "Connect Pollinations first to unlock this feature.",
          },
        }));
        return;
      }

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
    },
    [featuresLocked, resolvedModel, setToolState, toolState],
  );

  const handleCopy = useCallback(
    async (toolId: ToolId) => {
      const result = toolState[toolId].result;

      if (!result) {
        return;
      }

      await navigator.clipboard.writeText(formatBriefForCopy(result));
      setCopiedToolId(toolId);
      window.setTimeout(() => setCopiedToolId(null), 1600);
    },
    [setCopiedToolId, toolState],
  );

  const handleCopyChatMessage = useCallback(
    async (messageKey: string, content: string) => {
      await navigator.clipboard.writeText(content);
      setCopiedChatKey(messageKey);
      window.setTimeout(() => setCopiedChatKey(null), 1600);
    },
    [setCopiedChatKey],
  );

  const handleDiscussInChat = useCallback(
    (toolId: ToolId) => {
      if (featuresLocked) {
        return;
      }

      const result = toolState[toolId].result;
      const tool = TOOL_DEFINITIONS.find((item) => item.id === toolId);

      if (!result || !tool) {
        return;
      }

      const summary = formatBriefForCopy(result);
      const language = detectLanguage(summary);
      const context = {
        toolId,
        toolName: tool.name,
        summary,
      };
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

      void fetch("/api/chat/threads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context,
          messages: seedMessages,
          title: makeThreadTitle(tool.name, result.title || summary),
        }),
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            error?: string;
            thread?: ChatThread;
          };

          if (!response.ok || !data.thread) {
            throw new Error(data.error || "Failed to create chat thread.");
          }

          setChatContext(context);
          setChatThreads((previous) =>
            [data.thread as ChatThread, ...previous.filter((thread) => thread.id !== data.thread?.id)].slice(0, 12),
          );
          setActiveChatThreadId(data.thread.id);
          setChatMessages(data.thread.messages);
          setChatInput("");
          setChatError("");
          setActiveView("chat");
        })
        .catch((error) => {
          setChatError(
            error instanceof Error
              ? error.message
              : "Failed to open chat from this result.",
          );
        });
    },
    [
      featuresLocked,
      setActiveChatThreadId,
      setActiveView,
      setChatContext,
      setChatError,
      setChatInput,
      setChatMessages,
      setChatThreads,
      toolState,
    ],
  );

  const handleConnectPollinations = useCallback(() => {
    if (!pollinationsClientId) {
      setByopNotice(
        "Missing POLLINATIONS_CLIENT_ID. Add your pk_... key first.",
      );
      setSettingsOpen(true);
      return;
    }

    const redirectUri = getRedirectUri();
    const state = createByopState();
    const params = new URLSearchParams({
      client_id: pollinationsClientId,
      redirect_uri: redirectUri,
      budget: DEFAULT_BYOP_BUDGET,
      expiry: DEFAULT_BYOP_EXPIRY_DAYS,
      models: BYOP_AUTH_MODELS,
      state,
    });

    window.localStorage.setItem(BYOP_STATE_STORAGE_KEY, state);
    window.location.href = `https://enter.pollinations.ai/authorize?${params.toString()}`;
  }, [pollinationsClientId, setByopNotice, setSettingsOpen]);

  const handleDisconnectPollinations = useCallback(() => {
    void fetch("/api/byop/session", {
      method: "DELETE",
    }).then(() => {
      setByopConnected(false);
      setByopNotice("Saved BYOP session removed from this browser.");
      setDisconnectConfirmOpen(false);
      setSettingsOpen(false);
    });
  }, [
    setByopConnected,
    setByopNotice,
    setDisconnectConfirmOpen,
    setSettingsOpen,
  ]);

  const handleSendChat = useCallback(async () => {
    if (!activeChatThreadId) {
      setChatError("Generate a tool result first, then use Discuss in Chat.");
      return;
    }

    if (featuresLocked) {
      setChatError("Connect Pollinations first to unlock chat.");
      return;
    }

    if (!chatInput.trim()) {
      setChatError("Please enter a message first.");
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: chatInput.trim() },
    ];

    setChatMessages(nextMessages);
    updateThread(activeChatThreadId, (thread) => ({
      ...thread,
      messages: nextMessages,
      updatedAt: Date.now(),
    }));
    setChatInput("");
    setChatError("");
    setChatLoading(true);
    scrollChatToBottomSoon();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: chatInput.trim(),
          model: resolvedModel || undefined,
          threadId: activeChatThreadId,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        thread?: ChatThread;
      };

      if (!response.ok || !data.message) {
        throw new Error(data.error || "Chat request failed.");
      }

      if (data.thread) {
        setChatMessages(data.thread.messages);
        updateThread(activeChatThreadId, () => data.thread as ChatThread);
      } else {
        setChatMessages((previous) => [
          ...previous,
          { role: "assistant", content: data.message as string },
        ]);
        updateThread(activeChatThreadId, (thread) => ({
          ...thread,
          messages: [
            ...thread.messages,
            { role: "assistant", content: data.message as string },
          ],
          updatedAt: Date.now(),
        }));
      }
      scrollChatToBottomSoon();
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Something went wrong in chat.",
      );
    } finally {
      setChatLoading(false);
    }
  }, [
    activeChatThreadId,
    chatContext,
    chatInput,
    chatMessages,
    featuresLocked,
    resolvedModel,
    scrollChatToBottomSoon,
    setChatError,
    setChatInput,
    setChatLoading,
    setChatMessages,
    updateThread,
  ]);

  return {
    handleConnectPollinations,
    handleCopy,
    handleCopyChatMessage,
    handleDisconnectPollinations,
    handleDiscussInChat,
    handleGenerate,
    handleSendChat,
  };
}
