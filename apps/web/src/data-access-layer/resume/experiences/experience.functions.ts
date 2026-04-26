import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteExperienceForUser, listExperiencesForUserPaginated } from "./experience.server";

export const listExperiences = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input?: { keyword?: string; cursor?: string; direction?: "after" | "before" }) => input,
  )
  .handler(async ({ context, data }) => {
    return listExperiencesForUserPaginated(context.viewer.user.id, {
      keyword: data?.keyword,
      cursor: data?.cursor,
      direction: data?.direction,
    });
  });

export const deleteExperienceFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteExperienceForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
