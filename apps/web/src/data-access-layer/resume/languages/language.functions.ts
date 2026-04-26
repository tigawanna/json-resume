import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteLanguageForUser, listLanguagesForUserPaginated } from "./language.server";

export const listLanguages = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input?: { keyword?: string; cursor?: string; direction?: "after" | "before" }) => input,
  )
  .handler(async ({ context, data }) => {
    return listLanguagesForUserPaginated(context.viewer.user.id, {
      keyword: data?.keyword,
      cursor: data?.cursor,
      direction: data?.direction,
    });
  });

export const deleteLanguageFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteLanguageForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
