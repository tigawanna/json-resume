import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { resumeDocumentV1Schema } from "@/features/resume/resume-schema";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  deletePublicResumeById,
  deletePublicResumeForSource,
  getPublicResumeById,
  getPublicResumeForSource,
  listPublicResumesForUser,
  updatePublicResumeTitle,
  upsertPublicResume,
} from "./public-resume.server";

const publishInputSchema = z.object({
  sourceResumeId: z.string().min(1),
  title: z.string().min(1),
  document: resumeDocumentV1Schema,
});

/** Anonymous: load a published snapshot by public id. */
export const getPublicResume = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    return getPublicResumeById(data.id);
  });

/** Auth: whether this local résumé already has a public link. */
export const getMyPublicResume = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .validator((input: { sourceResumeId: string }) =>
    z.object({ sourceResumeId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    return getPublicResumeForSource(context.viewer.user.id, data.sourceResumeId);
  });

/** Auth: list + search the signed-in user's public snapshots. */
export const listMyPublicResumes = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .validator((input?: { keyword?: string; limit?: number; offset?: number }) =>
    z
      .object({
        keyword: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      })
      .optional()
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    return listPublicResumesForUser({
      userId: context.viewer.user.id,
      keyword: data?.keyword,
      limit: data?.limit ?? 20,
      offset: data?.offset ?? 0,
    });
  });

/** Auth: publish or refresh the public snapshot (direct DB write, not sync). */
export const publishPublicResume = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator((input: z.infer<typeof publishInputSchema>) => publishInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    return upsertPublicResume({
      userId: context.viewer.user.id,
      sourceResumeId: data.sourceResumeId,
      title: data.title,
      document: data.document,
    });
  });

/** Auth: rename the public listing title (does not change the document). */
export const renamePublicResume = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator((input: { id: string; title: string }) =>
    z.object({ id: z.string().min(1), title: z.string().min(1) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const updated = await updatePublicResumeTitle({
      userId: context.viewer.user.id,
      id: data.id,
      title: data.title,
    });
    if (!updated) throw new Error("Public résumé not found");
    return updated;
  });

/** Auth: remove the public snapshot for this local résumé. */
export const unpublishPublicResume = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator((input: { sourceResumeId: string }) =>
    z.object({ sourceResumeId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const removed = await deletePublicResumeForSource(context.viewer.user.id, data.sourceResumeId);
    return { success: removed };
  });

/** Auth: remove a public snapshot by its public id. */
export const unpublishPublicResumeById = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator((input: { id: string }) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ context, data }) => {
    const removed = await deletePublicResumeById(context.viewer.user.id, data.id);
    return { success: removed };
  });
