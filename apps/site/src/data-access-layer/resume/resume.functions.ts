import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { createServerFn } from "@tanstack/react-start";
import type { ResumeDTO } from "./resume.types";
import {
  createResumeForCurrentUser,
  deleteResumeForCurrentUser,
  getResumeForCurrentUser,
  listResumesForCurrentUser,
  updateResumeForCurrentUser,
} from "./resume.server";

export const listResumes = createServerFn({ method: "GET" }).handler(listResumesForCurrentUser);

export const getResume = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<ResumeDTO | null> => {
    return getResumeForCurrentUser(data.id);
  });

export const createResume = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      name: string;
      description: string;
      jobDescription: string;
      data: ResumeDocumentV1;
    }) => input,
  )
  .handler(async ({ data: input }): Promise<ResumeDTO> => {
    return createResumeForCurrentUser(input);
  });

export const updateResume = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      description?: string;
      jobDescription?: string;
      data?: ResumeDocumentV1;
    }) => input,
  )
  .handler(async ({ data: input }): Promise<ResumeDTO> => {
    return updateResumeForCurrentUser(input);
  });

export const deleteResume = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return deleteResumeForCurrentUser(data.id);
  });
