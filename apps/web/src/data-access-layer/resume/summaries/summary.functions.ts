import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { deleteSummaryForUser, listSummariesForUser } from "./summary.server";

export const listSummaries = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input?: { keyword?: string }) => input)
  .handler(async ({ context, data }) => {
    return listSummariesForUser(context.viewer.user.id, data?.keyword);
  });

export const deleteSummaryFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteSummaryForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
