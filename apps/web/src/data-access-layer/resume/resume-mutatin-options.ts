import { createDefaultResume } from "@/features/resume/resume-schema";
import { isErrorThrownByRedirect } from "@/lib/tanstack/router/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { resumeDetailToDocument } from "./resume-converters";
import { createResume, deleteResume, getResume } from "./resume.functions";
import { resumesCollection } from "./resumes-query-collection";

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
    const now = new Date().toISOString();
    resumesCollection.utils.writeInsert({
      id: result.id,
      name: "Untitled Resume",
      fullName: "",
      headline: "",
      description: "",
      templateId: "classic",
      createdAt: now,
      updatedAt: now,
    });
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
    const clonedName = `${source.name} (copy)`;
    const result = await createResume({
      data: {
        name: clonedName,
        description: source.description,
        jobDescription: source.jobDescription,
        doc,
      },
    });
    return { id: result.id, name: clonedName, source };
  },
  onSuccess(result) {
    const now = new Date().toISOString();
    resumesCollection.utils.writeInsert({
      id: result.id,
      name: result.name,
      fullName: result.source.fullName,
      headline: result.source.headline,
      description: result.source.description,
      templateId: result.source.templateId,
      createdAt: now,
      updatedAt: now,
    });
    toast.success("Resume cloned");
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
    toast.error("Failed to clone resume", {
      description: unwrapUnknownError(err).message,
    });
  },
  meta: { invalidates: [["resumes"]] },
});

export const deleteResumeMutationOptions = mutationOptions({
  mutationFn: async (resumeId: string) => deleteResume({ data: { id: resumeId } }),
  onSuccess() {
    toast.success("Resume deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete resume", {
      description: unwrapUnknownError(err).message,
    });
  },
  meta: { invalidates: [["resumes"]] },
});
