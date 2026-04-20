import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteExperienceForUser, listExperiencesForUser } from "./experience.server";

export const listExperiences = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input?: { keyword?: string }) => input)
  .handler(async ({ context, data }) => {
    return listExperiencesForUser(context.viewer.user.id, data?.keyword);
  });

export const deleteExperienceFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteExperienceForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
