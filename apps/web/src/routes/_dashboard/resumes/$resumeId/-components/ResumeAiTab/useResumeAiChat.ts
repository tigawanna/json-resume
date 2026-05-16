import {
  clearLocalResumeAiChat,
  resumeAiChatCollection,
} from "@/data-access-layer/resume/ai-chat/ai-chat.collection";
import { resumeAiChatQueryOptions } from "@/data-access-layer/resume/ai-chat/ai-chat.query-options";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { fetchServerSentEvents, useChat, type UIMessage } from "@tanstack/ai-react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  getMessageText,
  getSessionChars,
  getStoredMessagesSignature,
  toUiMessages,
} from "./resume-ai-message-utils";
import {
  useOpenRouterCreditRefresh,
  useResumeChatAutosave,
  useResumeHistoryHydration,
  useResumeToolInvalidation,
} from "./useResumeAiChatEffects";
import { useResumeAiChatMutations } from "./useResumeAiChatMutations";
import { isLocalMode, type ResumeAiTabProps } from "./resume-ai-types";

export function useResumeAiChat({ resumeId, jobDescription }: ResumeAiTabProps) {
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearScope, setClearScope] = useState<"remote" | "both" | null>(null);
  const { settings, saveSettings, clearSettings } = useAiSettings();
  const queryClient = useQueryClient();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const hydratedHistoryRef = useRef<string | null>(null);
  const handledToolOutputsRef = useRef(new Set<string>());
  const isReady = isLocalMode || !!settings;

  const { data: localChats } = useLiveQuery(
    (q) =>
      q.from({ chat: resumeAiChatCollection }).where(({ chat }) => eq(chat.resumeId, resumeId)),
    [resumeId],
  );
  const localChat = localChats[0];
  const historyQuery = useQuery(resumeAiChatQueryOptions(resumeId));
  const initialStoredMessages = localChat?.messages ?? historyQuery.data?.messages ?? [];
  const lastSavedSignatureRef = useRef(getStoredMessagesSignature(initialStoredMessages));

  const { clearChatMutation, saveChatMutation, saveChatRef } = useResumeAiChatMutations({
    queryClient,
    resumeId,
    setClearScope,
    settings,
  });

  const chat = useChat({
    id: `resume-ai-chat-${resumeId}`,
    initialMessages: toUiMessages(initialStoredMessages),
    connection: fetchServerSentEvents("/api/ai/resume-tailor"),
    body: {
      resumeId,
      jobDescription,
      apiKey: settings?.apiKey,
      model: settings?.model,
    },
  });
  const { messages, isLoading, status, sessionGenerating, setMessages } = chat;

  const wasLoading = useRef(false);
  useOpenRouterCreditRefresh({
    apiKey: settings?.apiKey,
    isLoading,
    queryClient,
    wasLoadingRef: wasLoading,
  });
  useResumeToolInvalidation({ handledToolOutputsRef, messages, queryClient, resumeId });
  useResumeHistoryHydration({
    hydratedHistoryRef,
    lastSavedSignatureRef,
    localChat,
    messagesLength: messages.length,
    serverChat: historyQuery.data,
    setMessages,
  });
  useResumeChatAutosave({ isLoading, lastSavedSignatureRef, messages, saveChatRef });

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isLoading, status]);

  async function submitMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !isReady) return;
    await chat.sendMessage(trimmed);
    setInput("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submitMessage();
  }

  async function sendStarter(message: string) {
    if (isLoading || !isReady) return;
    await chat.sendMessage(message);
  }

  function resetVisibleConversation() {
    chat.clear();
    setInput("");
    lastSavedSignatureRef.current = "";
    hydratedHistoryRef.current = null;
  }

  async function clearRemoteConversation() {
    setClearScope("remote");
    await clearChatMutation.mutateAsync();
  }

  async function clearRemoteAndLocalConversation() {
    setClearScope("both");
    await Promise.all([clearLocalResumeAiChat(resumeId), clearChatMutation.mutateAsync()]);
    resetVisibleConversation();
    setClearDialogOpen(false);
  }

  function handleClearDialogOpenChange(open: boolean) {
    if (clearChatMutation.isPending) return;
    setClearDialogOpen(open);
  }

  function editPastPrompt(message: UIMessage) {
    const text = getMessageText(message);
    if (!text) return;
    setInput(text);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  async function resendPastPrompt(message: UIMessage) {
    const text = getMessageText(message);
    if (!text || isLoading || !isReady) return;
    await chat.sendMessage(text);
  }

  const activeModelLabel = settings?.model
    ? (settings.model.split("/").pop() ?? settings.model)
    : null;

  return {
    activeModelLabel,
    chatErrorMessage: chat.error?.message ?? null,
    clearChatMutation,
    clearDialogOpen,
    clearRemoteAndLocalConversation,
    clearRemoteConversation,
    clearScope,
    clearSettings,
    composerRef,
    editPastPrompt,
    endOfMessagesRef,
    handleClearDialogOpenChange,
    handleComposerKeyDown,
    handleSubmit,
    historyPending: historyQuery.isPending,
    input,
    isLoading,
    isReady,
    messages,
    reload: chat.reload,
    resendPastPrompt,
    saveChatMutation,
    saveSettings,
    sendStarter,
    sessionChars: getSessionChars(messages),
    sessionGenerating,
    settings,
    settingsOpen,
    setInput,
    setSettingsOpen,
    status,
    stop: chat.stop,
  };
}
