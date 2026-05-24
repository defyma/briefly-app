"use client";

import { useEffect } from "react";

import { BYOP_MODEL_OPTIONS, DEFAULT_MODEL_ID } from "@/lib/briefly-tools";
import {
  ACTIVE_CHAT_THREAD_STORAGE_KEY,
  ACTIVE_VIEW_STORAGE_KEY,
  BYOP_STATE_STORAGE_KEY,
  MODEL_STORAGE_KEY,
  isWorkspaceView,
  type ChatThread,
  type WorkspaceView,
} from "@/lib/briefly-workspace";

type UseBrieflyPersistenceParams = {
  activeChatThreadId: string | null;
  activeView: WorkspaceView;
  chatThreads: ChatThread[];
  onByopSessionSync: (apiKey: string) => Promise<void>;
  selectedModel: string;
  setActiveChatThreadId: (value: string | null) => void;
  setActiveView: (value: WorkspaceView) => void;
  setByopConnected: (value: boolean) => void;
  setByopNotice: (value: string) => void;
  setChatThreads: (value: ChatThread[]) => void;
  setSelectedModel: (value: string) => void;
  setSettingsOpen: (value: boolean) => void;
};

export function useBrieflyPersistence(params: UseBrieflyPersistenceParams) {
  const {
    activeChatThreadId,
    activeView,
    chatThreads,
    onByopSessionSync,
    selectedModel,
    setActiveChatThreadId,
    setActiveView,
    setByopConnected,
    setByopNotice,
    setChatThreads,
    setSelectedModel,
    setSettingsOpen,
  } = params;

  useEffect(() => {
    const savedModel = window.localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_MODEL_ID;
    const savedActiveView = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    const savedActiveThread = window.localStorage.getItem(
      ACTIVE_CHAT_THREAD_STORAGE_KEY,
    );

    setSelectedModel(
      BYOP_MODEL_OPTIONS.some((model) => model.id === savedModel)
        ? savedModel
        : DEFAULT_MODEL_ID,
    );

    if (savedActiveView && isWorkspaceView(savedActiveView)) {
      setActiveView(savedActiveView);
    }

    if (savedActiveThread) {
      setActiveChatThreadId(savedActiveThread);
    }

    async function initialize() {
      const sessionResponse = await fetch("/api/byop/session", {
        cache: "no-store",
      });
      const sessionData = (await sessionResponse.json()) as { connected?: boolean };
      setByopConnected(Boolean(sessionData.connected));

      const threadsResponse = await fetch("/api/chat/threads", {
        cache: "no-store",
      });
      const threadsData = (await threadsResponse.json()) as {
        threads?: ChatThread[];
      };
      setChatThreads(Array.isArray(threadsData.threads) ? threadsData.threads : []);

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
          try {
            await onByopSessionSync(returnedKey);
            setSettingsOpen(true);
            setByopNotice("Pollinations connected. Your BYOP session is ready.");
          } catch (error) {
            setByopNotice(
              error instanceof Error ? error.message : "Failed to save BYOP session.",
            );
          }
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
    }

    void initialize();
  }, [
    onByopSessionSync,
    setActiveChatThreadId,
    setActiveView,
    setByopConnected,
    setByopNotice,
    setChatThreads,
    setSelectedModel,
    setSettingsOpen,
  ]);

  useEffect(() => {
    window.localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
  }, [activeView]);

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
}
