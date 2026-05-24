import type { ChatMessage, ChatSeed, GeneratedBrief, ToolId } from "@/lib/briefly-tools";

export const MODEL_STORAGE_KEY = "briefly-model-id";
export const ACTIVE_CHAT_THREAD_STORAGE_KEY = "briefly-active-chat-thread";
export const ACTIVE_VIEW_STORAGE_KEY = "briefly-active-view";
export const BYOP_STATE_STORAGE_KEY = "briefly-byop-state";
export const DEFAULT_BYOP_BUDGET = "10";
export const DEFAULT_BYOP_EXPIRY_DAYS = "7";
export const CHAT_INPUT_MIN_HEIGHT = 32;
export const CHAT_INPUT_MAX_HEIGHT = 160;

export type WorkspaceView = ToolId | "chat";

export type ToolState = {
  input: string;
  result: GeneratedBrief | null;
  error: string;
  isLoading: boolean;
};

export type ToolStateMap = Record<ToolId, ToolState>;

export type ChatThread = {
  id: string;
  title: string;
  context: ChatSeed | null;
  messages: ChatMessage[];
  updatedAt: number;
};

export function isWorkspaceView(value: string): value is WorkspaceView {
  return (
    value === "meeting-notes" ||
    value === "task-breakdown" ||
    value === "reply-draft" ||
    value === "chat"
  );
}

export function buildInitialState(): ToolStateMap {
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

export function createByopState() {
  return `briefly-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getRedirectUri() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}/app`;
}

export function makeThreadTitle(toolName: string, summary: string) {
  const firstLine = summary.split("\n")[0]?.trim() || toolName;
  return firstLine.length > 42 ? `${firstLine.slice(0, 41)}...` : firstLine;
}

export function createThreadId() {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
