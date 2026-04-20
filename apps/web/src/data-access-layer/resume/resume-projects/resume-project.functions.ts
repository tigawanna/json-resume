import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteResumeProjectForUser, listResumeProjectsForUser } from "./resume-project.server";

export const listResumeProjects = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input?: { keyword?: string }) => input)
  .handler(async ({ context, data }) => {
    return listResumeProjectsForUser(context.viewer.user.id, data?.keyword);
  });

export const deleteResumeProjectFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteResumeProjectForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
