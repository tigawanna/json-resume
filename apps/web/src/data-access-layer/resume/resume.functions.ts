import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { getResumeDetail, listResumesForUser } from "./resume.server";

export const listResumes = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .validator((input?: { id?: string; keyword?: string }) => input)
  .handler(async ({ context, data }) => {
    return listResumesForUser({
      userId: context.viewer.user.id,
      id: data?.id,
      keyword: data?.keyword,
    });
  });

export const getResume = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    return getResumeDetail(data.id, context.viewer.user.id);
  });
