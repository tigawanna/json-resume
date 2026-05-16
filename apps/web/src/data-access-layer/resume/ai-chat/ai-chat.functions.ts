import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { assertResumeBelongsToUser } from "@/data-access-layer/resume/resume.server";
import { createServerFn } from "@tanstack/react-start";
import {
  clearResumeAiChatForUser,
  getResumeAiChatForUser,
  saveResumeAiChatForUser,
} from "./ai-chat.server";
import type { ResumeAiChatDTO } from "./ai-chat.types";

export const getResumeAiChat = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { resumeId: string }) => input)
  .handler(async ({ context, data }) => {
    await assertResumeBelongsToUser(data.resumeId, context.viewer.user.id);
    return getResumeAiChatForUser(data.resumeId, context.viewer.user.id);
  });

export const saveResumeAiChat = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; messages: ResumeAiChatDTO["messages"]; model?: string }) => input,
  )
  .handler(async ({ context, data }) => {
    await assertResumeBelongsToUser(data.resumeId, context.viewer.user.id);
    return saveResumeAiChatForUser(data.resumeId, context.viewer.user.id, data.messages, {
      model: data.model,
    });
  });

export const clearResumeAiChat = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { resumeId: string }) => input)
  .handler(async ({ context, data }) => {
    await assertResumeBelongsToUser(data.resumeId, context.viewer.user.id);
    await clearResumeAiChatForUser(data.resumeId, context.viewer.user.id);
    return { success: true };
  });
