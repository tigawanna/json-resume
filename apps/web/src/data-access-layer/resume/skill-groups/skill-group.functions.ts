import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteSkillGroupForUser, listSkillGroupsForUserPaginated } from "./skill-group.server";

export const listSkillGroups = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input?: { keyword?: string; cursor?: string; direction?: "after" | "before" }) => input,
  )
  .handler(async ({ context, data }) => {
    return listSkillGroupsForUserPaginated(context.viewer.user.id, {
      keyword: data?.keyword,
      cursor: data?.cursor,
      direction: data?.direction,
    });
  });

export const deleteSkillGroupFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteSkillGroupForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
