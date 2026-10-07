import {
  createDefaultResume,
  safeParseResumeJson,
  type ResumeDocumentV1,
} from "@/features/resume/resume-schema";
import { isErrorThrownByRedirect } from "@/lib/tanstack/router/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { mutationOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../query-keys";
import { createResume, deleteResume } from "./resume.functions";

function importedResumeNameFromDoc(doc: ResumeDocumentV1): string {
  const fullName = doc.header.fullName.trim();
  const headline = doc.header.headline.trim();
  if (fullName && headline) return `${fullName} - ${headline}`;
  return headline || fullName || "Imported Resume";
}

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

export const createResumeFromJsonMutationOptions = mutationOptions({
  mutationFn: async (jsonText: string) => {
    const result = safeParseResumeJson(jsonText);
    if (!result.ok) throw new Error(result.error);
    const importedName = importedResumeNameFromDoc(result.data);
    return createResume({
      data: {
        name: importedName,
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
    //   name: result.name,
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
