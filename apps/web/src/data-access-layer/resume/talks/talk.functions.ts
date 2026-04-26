import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteTalkForUser, listTalksForUserPaginated } from "./talk.server";

export const listTalks = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input?: { keyword?: string; cursor?: string; direction?: "after" | "before" }) => input,
  )
  .handler(async ({ context, data }) => {
    return listTalksForUserPaginated(context.viewer.user.id, {
      keyword: data?.keyword,
      cursor: data?.cursor,
      direction: data?.direction,
    });
  });

export const deleteTalkFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteTalkForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
