"use client";

import { useEffect, useRef, useState } from "react";

import {
  CHAT_INPUT_MAX_HEIGHT,
  CHAT_INPUT_MIN_HEIGHT,
  type WorkspaceView,
} from "@/lib/briefly-workspace";

type UseBrieflyChatUiParams = {
  activeChatThreadId: string | null;
  activeView: WorkspaceView;
  chatInput: string;
  chatMessageCount: number;
};

export function useBrieflyChatUi(params: UseBrieflyChatUiParams) {
  const { activeChatThreadId, activeView, chatInput, chatMessageCount } = params;
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  useEffect(() => {
    const textarea = chatInputRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = `${CHAT_INPUT_MIN_HEIGHT}px`;
    textarea.style.height = `${Math.min(textarea.scrollHeight, CHAT_INPUT_MAX_HEIGHT)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > CHAT_INPUT_MAX_HEIGHT ? "auto" : "hidden";
  }, [chatInput]);

  useEffect(() => {
    const container = chatScrollRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 160);
  }, [chatMessageCount, activeChatThreadId, activeView]);

  function handleChatScroll() {
    const container = chatScrollRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 160);
  }

  function scrollChatToBottom() {
    const container = chatScrollRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }

  function scrollChatToBottomSoon() {
    window.requestAnimationFrame(() => {
      scrollChatToBottom();
    });
  }

  return {
    chatInputRef,
    chatScrollRef,
    handleChatScroll,
    scrollChatToBottom,
    scrollChatToBottomSoon,
    showScrollToBottom,
  };
}
