import { createDefaultResume, safeParseResumeJson } from "@/features/resume/resume-schema";
import { isErrorThrownByRedirect } from "@/lib/tanstack/router/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../query-keys";
import { resumeDetailToDocument } from "./resume-converters";
import { createResume, deleteResume, getResume } from "./resume.functions";

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
  onSuccess(result, __, ___, ctx) {
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
    // const now = new Date().toISOString();
    // resumesCollection.utils.writeInsert({
    //   id: result.id,
    //   name: "Untitled Resume",
    //   fullName: "",
    //   headline: "",
    //   description: "",
    //   templateId: "classic",
    //   createdAt: now,
    //   updatedAt: now,
    // });
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
  onSuccess(result, __, ___, ctx) {
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
    // const now = new Date().toISOString();
    // resumesCollection.utils.writeInsert({
    //   id: result.id,
    //   name: result.name,
    //   fullName: result.source.fullName,
    //   headline: result.source.headline,
    //   description: result.source.description,
    //   templateId: result.source.templateId,
    //   createdAt: now,
    //   updatedAt: now,
    // });
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

export const createResumeFromJsonMutationOptions = mutationOptions({
  mutationFn: async (jsonText: string) => {
    const result = safeParseResumeJson(jsonText);
    if (!result.ok) throw new Error(result.error);
    return createResume({
      data: {
        name: "Imported Resume",
        description: "",
        jobDescription: "",
        doc: result.data,
      },
    });
  },
  onSuccess(result, __, ___, ctx) {
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
    // const now = new Date().toISOString();
    // resumesCollection.utils.writeInsert({
    //   id: result.id,
    //   name: "Imported Resume",
    //   fullName: "",
    //   headline: "",
    //   description: "",
    //   templateId: "classic",
    //   createdAt: now,
    //   updatedAt: now,
    // });
    toast.success("Resume imported from JSON");
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
    toast.error("Failed to import resume", {
      description: unwrapUnknownError(err).message,
    });
  },
});

export const deleteResumeMutationOptions = mutationOptions({
  mutationFn: async (resumeId: string) => deleteResume({ data: { id: resumeId } }),
  onSuccess(_, __, ___, ctx) {
    void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
    toast.success("Resume deleted");
  },
  onError(err: unknown) {
    toast.error("Failed to delete resume", {
      description: unwrapUnknownError(err).message,
    });
  },
});
