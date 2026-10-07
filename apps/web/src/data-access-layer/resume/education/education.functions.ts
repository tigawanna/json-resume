import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteEducationForUser, listEducationForUserPaginated } from "./education.server";

export const listEducation = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .validator(
    (input?: { keyword?: string; cursor?: string; direction?: "after" | "before" }) => input,
  )
  .handler(async ({ context, data }) => {
    return listEducationForUserPaginated(context.viewer.user.id, {
      keyword: data?.keyword,
      cursor: data?.cursor,
      direction: data?.direction,
    });
  });

export const deleteEducationFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteEducationForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
