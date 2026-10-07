import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createServerFn } from "@tanstack/react-start";
import { listSavedProjects, saveProject, unsaveProjectByUrl } from "./saved-project.server";

export const getSavedProjects = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .handler(async ({ context }) => {
    return listSavedProjects(context.viewer.user.id);
  });

export const saveGithubProject = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator(
    (input: {
      name: string;
      url: string;
      homepageUrl?: string;
      description?: string;
      tech?: string[];
    }) => input,
  )
  .handler(async ({ context, data }) => {
    return saveProject(context.viewer.user.id, data);
  });

export const unsaveGithubProject = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator((input: { url: string }) => input)
  .handler(async ({ context, data }) => {
    await unsaveProjectByUrl(context.viewer.user.id, data.url);
    return { success: true };
  });
