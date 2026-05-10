import { tanstackDBPersistence } from "@/lib/tanstack/db/browser-presistor";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { createCollection } from "@tanstack/db";
import type { ResumeAiChatDTO } from "./ai-chat.types";

export const resumeAiChatCollection = createCollection(
  persistedCollectionOptions<ResumeAiChatDTO, string>({
    id: "resume-ai-chat-history",
    persistence: tanstackDBPersistence,
    schemaVersion: 1,
    getKey: (chat) => chat.resumeId,
  }),
);

export async function persistLocalResumeAiChat(chat: ResumeAiChatDTO) {
  await resumeAiChatCollection.preload();
  const existing = resumeAiChatCollection.state.has(chat.resumeId);
  const tx = existing
    ? resumeAiChatCollection.update(chat.resumeId, (draft) => {
        Object.assign(draft, chat);
      })
    : resumeAiChatCollection.insert(chat);
  await tx.isPersisted.promise;
}

export async function clearLocalResumeAiChat(resumeId: string) {
  await resumeAiChatCollection.preload();
  if (!resumeAiChatCollection.state.has(resumeId)) return;
  const tx = resumeAiChatCollection.delete(resumeId);
  await tx.isPersisted.promise;
}
