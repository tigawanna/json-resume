import { persistLocalResumeAiChat } from "@/data-access-layer/resume/ai-chat/ai-chat.collection";
import {
  clearResumeAiChat,
  saveResumeAiChat,
} from "@/data-access-layer/resume/ai-chat/ai-chat.functions";
import { resumeAiChatQueryOptions } from "@/data-access-layer/resume/ai-chat/ai-chat.query-options";
import type { ResumeAiChatDTO } from "@/data-access-layer/resume/ai-chat/ai-chat.types";
import type { AiSettings } from "@/types/ai-settings";
import { unwrapUnknownError } from "@/utils/errors";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useResumeAiChatMutations(args: {
  queryClient: QueryClient;
  resumeId: string;
  setClearScope: (scope: "remote" | "both" | null) => void;
  settings: AiSettings | null;
}) {
  const { queryClient, resumeId, setClearScope, settings } = args;
  const queryKey = resumeAiChatQueryOptions(resumeId).queryKey;
  const saveChatMutation = useMutation({
    mutationFn: async (messagesToSave: ResumeAiChatDTO["messages"]) =>
      saveResumeAiChat({ data: { resumeId, messages: messagesToSave, model: settings?.model } }),
    onSuccess(chat) {
      void persistLocalResumeAiChat(chat);
      queryClient.setQueryData(queryKey, chat);
    },
    onError(err: unknown) {
      toast.error("Failed to save chat history", {
        description: unwrapUnknownError(err).message,
      });
    },
  });
  const saveChatRef = useRef(saveChatMutation.mutate);

  useEffect(() => {
    saveChatRef.current = saveChatMutation.mutate;
  }, [saveChatMutation.mutate]);

  const clearChatMutation = useMutation({
    mutationFn: async () => clearResumeAiChat({ data: { resumeId } }),
    onSuccess() {
      queryClient.setQueryData(queryKey, null);
    },
    onSettled() {
      setClearScope(null);
    },
  });

  return { clearChatMutation, saveChatMutation, saveChatRef };
}
