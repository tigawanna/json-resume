import { persistLocalResumeAiChat } from "@/data-access-layer/resume/ai-chat/ai-chat.collection";
import type { ResumeAiChatDTO } from "@/data-access-layer/resume/ai-chat/ai-chat.types";
import { resumeDetailQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import {
  resumeCollection,
  resumesCollection,
} from "@/data-access-layer/resume/resumes-query-collection";
import { openRouterCreditsQueryOptions } from "@/hooks/use-openrouter-credits";
import type { UIMessage } from "@tanstack/ai-react";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  getStoredMessagesSignature,
  getToolOutputRecord,
  getUiMessagesSignature,
  toStoredMessages,
  toUiMessages,
} from "./resume-ai-message-utils";
import { writeToolNames } from "./resume-ai-types";

interface MutableRef<T> {
  current: T;
}

export function useOpenRouterCreditRefresh(args: {
  apiKey?: string;
  isLoading: boolean;
  queryClient: QueryClient;
  wasLoadingRef: MutableRef<boolean>;
}) {
  useEffect(() => {
    if (args.wasLoadingRef.current && !args.isLoading && args.apiKey) {
      void args.queryClient.invalidateQueries({
        queryKey: openRouterCreditsQueryOptions(args.apiKey).queryKey,
      });
    }
    args.wasLoadingRef.current = args.isLoading;
  }, [args.apiKey, args.isLoading, args.queryClient, args.wasLoadingRef]);
}

export function useResumeToolInvalidation(args: {
  handledToolOutputsRef: MutableRef<Set<string>>;
  messages: UIMessage[];
  queryClient: QueryClient;
  resumeId: string;
}) {
  useEffect(() => {
    let shouldRefreshResumeList = false;

    for (const message of args.messages) {
      for (const part of message.parts) {
        if (part.type !== "tool-call" || part.output === undefined) continue;
        if (!writeToolNames.has(part.name)) continue;

        const handledKey = `${part.id}:${part.state}`;
        if (args.handledToolOutputsRef.current.has(handledKey)) continue;
        args.handledToolOutputsRef.current.add(handledKey);

        const output = getToolOutputRecord(part);
        const outputResumeId =
          output && typeof output.resumeId === "string" ? output.resumeId : args.resumeId;

        shouldRefreshResumeList = true;
        void args.queryClient.invalidateQueries({
          queryKey: resumeDetailQueryOptions(outputResumeId).queryKey,
        });
      }
    }

    if (!shouldRefreshResumeList) return;
    void args.queryClient.invalidateQueries({ queryKey: ["resumes"] });
    void resumeCollection.utils.refetch();
    void resumesCollection.utils.refetch();
  }, [args.handledToolOutputsRef, args.messages, args.queryClient, args.resumeId]);
}

export function useResumeHistoryHydration(args: {
  hydratedHistoryRef: MutableRef<string | null>;
  lastSavedSignatureRef: MutableRef<string>;
  localChat?: ResumeAiChatDTO;
  messagesLength: number;
  serverChat?: ResumeAiChatDTO | null;
  setMessages: (messages: UIMessage[]) => void;
}) {
  const {
    hydratedHistoryRef,
    lastSavedSignatureRef,
    localChat,
    messagesLength,
    serverChat,
    setMessages,
  } = args;

  useEffect(() => {
    if (!serverChat || hydratedHistoryRef.current === serverChat.updatedAt) return;
    hydratedHistoryRef.current = serverChat.updatedAt;
    void persistLocalResumeAiChat(serverChat);

    if (messagesLength === 0 && serverChat.messages.length > 0) {
      setMessages(toUiMessages(serverChat.messages));
      lastSavedSignatureRef.current = getStoredMessagesSignature(serverChat.messages);
    }
  }, [hydratedHistoryRef, lastSavedSignatureRef, messagesLength, serverChat, setMessages]);

  useEffect(() => {
    if (messagesLength > 0 || !localChat || localChat.messages.length === 0) return;
    setMessages(toUiMessages(localChat.messages));
    lastSavedSignatureRef.current = getStoredMessagesSignature(localChat.messages);
  }, [lastSavedSignatureRef, localChat, messagesLength, setMessages]);
}

export function useResumeChatAutosave(args: {
  isLoading: boolean;
  lastSavedSignatureRef: MutableRef<string>;
  messages: UIMessage[];
  saveChatRef: MutableRef<(messages: ResumeAiChatDTO["messages"]) => void>;
}) {
  useEffect(() => {
    if (args.isLoading || args.messages.length === 0) return;
    if (args.messages.at(-1)?.role !== "assistant") return;
    const signature = getUiMessagesSignature(args.messages);
    if (signature === args.lastSavedSignatureRef.current) return;
    args.lastSavedSignatureRef.current = signature;
    args.saveChatRef.current(toStoredMessages(args.messages));
  }, [args.isLoading, args.lastSavedSignatureRef, args.messages, args.saveChatRef]);
}
