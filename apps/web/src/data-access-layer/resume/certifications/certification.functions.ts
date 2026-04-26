import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import {
  deleteCertificationForUser,
  listCertificationsForUserPaginated,
} from "./certification.server";

export const listCertifications = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input?: { keyword?: string; cursor?: string; direction?: "after" | "before" }) => input,
  )
  .handler(async ({ context, data }) => {
    return listCertificationsForUserPaginated(context.viewer.user.id, {
      keyword: data?.keyword,
      cursor: data?.cursor,
      direction: data?.direction,
    });
  });

export const deleteCertificationFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteCertificationForUser(data.id, context.viewer.user.id);
    return { success: true };
  });
