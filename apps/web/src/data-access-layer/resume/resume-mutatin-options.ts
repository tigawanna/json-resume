import { createDefaultResume } from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { createResume, getResume } from "./resume.functions";
import { resumeDetailToDocument } from "./resume-converters";
import { isErrorThrownByRedirect } from "@/lib/tanstack/router/utils";

export const createResumeMuationOptions = mutationOptions({
  mutationFn: async () => {
    const doc = createDefaultResume();
    return createResume({
      data: {
        name: "Untitled Resume",
        description: "",
        jobDescription: "",
        doc,
      },
    });
  },
  onSuccess(result) {
    toast.success("Resume created");
    throw redirect({
      to: "/resumes/$resumeId",
      params: { resumeId: result.id },
      search: (prev) => ({ ...prev, tab: "edit" }),
    });
  },
  onError(err: unknown) {
    if (isErrorThrownByRedirect(err)) {
      return;
    }
    toast.error("Failed to create resume", {
      description: unwrapUnknownError(err).message,
    });
  },
  meta: { invalidates: [["resumes"]] },
});

export const cloneResumeMuationOptions = mutationOptions({
    mutationFn: async (sourceId: string) => {
      const source = await getResume({ data: { id: sourceId } });
      if (!source) throw new Error("Source resume not found");
      const doc = resumeDetailToDocument(source);
      return createResume({
        data: {
          name: `${source.name} (copy)`,
          description: source.description,
          jobDescription: source.jobDescription,
          doc,
        },
      });
    },
    onSuccess(result) {
      toast.success("Resume cloned");
      throw redirect({
        to: "/resumes/$resumeId",
        params: { resumeId: result.id },
        search: (prev) => ({ ...prev, tab: "edit" }),
      });
    },
    onError(err: unknown) {
      // Don't toast redirects — let the router handle them
      if (err && typeof err === "object" && "statusCode" in err && (err as any).statusCode === 307) {
        throw err;
      }
      toast.error("Failed to clone resume", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
});
