import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../../query-keys";
import { deleteResumeProjectFn } from "./resume-project.functions";

export const deleteResumeProjectMutationOptions = mutationOptions({
  mutationFn: async (projectId: string) => deleteResumeProjectFn({ data: { id: projectId } }),
  onSuccess() {
    toast.success("Project deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete project", {
      description: unwrapUnknownError(err).message,
    });
  },
  meta: {
    invalidates: [[queryKeyPrefixes.resumeProjects], [queryKeyPrefixes.resumes]],
  },
});
