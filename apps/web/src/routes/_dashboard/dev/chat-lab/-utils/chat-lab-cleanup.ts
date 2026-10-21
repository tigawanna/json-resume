import { deleteWithReferences } from "@/data-access-layer/event-sourced/rows/library-resolve";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { CHAT_LAB_DRAFT_NAMES } from "./chat-lab-script";

const draftNames = new Set<string>(CHAT_LAB_DRAFT_NAMES);

export function isChatLabDraft(resume: { name: string }) {
  return draftNames.has(resume.name);
}

/** Deletes every lab copy, including the one the workbench is showing. */
export function deleteChatLabDrafts(input: {
  db: AppDb;
  resumes: ReadonlyArray<{ id: string; name: string }>;
}) {
  const targets = input.resumes.filter((resume) => isChatLabDraft(resume));
  for (const resume of targets) {
    deleteWithReferences(input.db, "resume", resume.id);
  }
  const removed = new Set(targets.map((resume) => resume.id));
  const next = input.resumes.find((resume) => !removed.has(resume.id)) ?? null;
  return { removed: targets.length, nextId: next?.id ?? null };
}
