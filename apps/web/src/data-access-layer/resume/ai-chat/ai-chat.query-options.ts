import { queryOptions } from "@tanstack/react-query";
import { queryKeyPrefixes } from "../../query-keys";
import { getResumeAiChat } from "./ai-chat.functions";

export function resumeAiChatQueryOptions(resumeId: string) {
  return queryOptions({
    queryKey: [queryKeyPrefixes.resumeAiChat, resumeId],
    queryFn: () => getResumeAiChat({ data: { resumeId } }),
  });
}
