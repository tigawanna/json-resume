import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteLinkForUser, listLinksForUser } from "./link.server";

export const listLinks = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input?: { keyword?: string }) => input)
  .handler(async ({ context, data }) => {
    return listLinksForUser(context.viewer.user.id, data?.keyword);
  });

export const deleteLinkFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteLinkForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
