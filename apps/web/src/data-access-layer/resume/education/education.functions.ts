import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteEducationForUser, listEducationForUser } from "./education.server";

export const listEducation = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input?: { keyword?: string }) => input)
  .handler(async ({ context, data }) => {
    return listEducationForUser(context.viewer.user.id, data?.keyword);
  });

export const deleteEducationFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteEducationForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
