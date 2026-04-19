import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { createServerFn } from "@tanstack/react-start";
import {
  addEducation,
  addExperience,
  addProject,
  addTalk,
  batchUpdateSectionOrder,
  createResumeForUser,
  deleteEducation,
  deleteExperience,
  deleteProject,
  deleteResumeForUser,
  deleteTalk,
  getResumeDetail,
  listResumesForUser,
  replaceResumeContent,
  searchUserEducation,
  searchUserExperienceBullets,
  searchUserExperiences,
  searchUserProjects,
  searchUserSkills,
  setExperienceBullets,
  setResumeContacts,
  setResumeLinks,
  setResumeSummary,
  setSkillGroups,
  updateEducation,
  updateExperience,
  updateProject,
  updateResumeMetadata,
  updateTalk,
} from "./resume.server";

// ─── List & Detail ─────────────────────────────────────────

export const listResumes = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id?: string }) => input)
  .handler(async ({ context, data }) => {
    return listResumesForUser({ userId: context.viewer.user.id, id: data?.id });
  });

export const getResume = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    return getResumeDetail(data.id, context.viewer.user.id);
  });

// ─── Create ────────────────────────────────────────────────

export const createResume = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { name: string; description: string; jobDescription: string; doc: ResumeDocumentV1 }) =>
      input,
  )
  .handler(async ({ context, data }) => {
    const id = await createResumeForUser(context.viewer.user.id, data);
    return { id };
  });

// ─── Update Metadata ───────────────────────────────────────

export const updateResumeMeta = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      description?: string;
      jobDescription?: string;
      fullName?: string;
      headline?: string;
      templateId?: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await updateResumeMetadata(id, context.viewer.user.id, rest);
    return { success: true };
  });

// ─── Replace Content (full doc update) ─────────────────────

export const replaceResumeDoc = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string; doc: ResumeDocumentV1 }) => input)
  .handler(async ({ context, data }) => {
    await replaceResumeContent(data.id, context.viewer.user.id, data.doc);
    return { success: true };
  });

// ─── Delete ────────────────────────────────────────────────

export const deleteResume = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await deleteResumeForUser(data.id, context.viewer.user.id);
    return { success: true };
  });

// ─── Section Order ─────────────────────────────────────────

export const updateSectionOrder = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId: string;
      sections: { key: string; enabled: boolean; sortOrder: number }[];
    }) => input,
  )
  .handler(async ({ data }) => {
    await batchUpdateSectionOrder(data.resumeId, data.sections);
    return { success: true };
  });

// ─── Contacts ──────────────────────────────────────────────

export const updateContacts = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; contacts: { type: string; value: string; label: string }[] }) =>
      input,
  )
  .handler(async ({ data }) => {
    await setResumeContacts(data.resumeId, data.contacts);
    return { success: true };
  });

// ─── Links ─────────────────────────────────────────────────

export const updateLinks = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; links: { label: string; url: string; icon?: string }[] }) => input,
  )
  .handler(async ({ data }) => {
    await setResumeLinks(data.resumeId, data.links);
    return { success: true };
  });

// ─── Summary ───────────────────────────────────────────────

export const updateSummary = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { resumeId: string; text: string }) => input)
  .handler(async ({ data }) => {
    await setResumeSummary(data.resumeId, data.text);
    return { success: true };
  });

// ─── Experience ────────────────────────────────────────────

export const createExperience = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId: string;
      company: string;
      role: string;
      startDate: string;
      endDate: string;
      location?: string;
      sortOrder: number;
      bullets: string[];
    }) => input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addExperience(resumeId, rest);
    return { id };
  });

export const editExperience = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      id: string;
      company?: string;
      role?: string;
      startDate?: string;
      endDate?: string;
      location?: string;
      sortOrder?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateExperience(id, rest);
    return { success: true };
  });

export const removeExperience = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteExperience(data.id);
    return { success: true };
  });

export const updateExperienceBullets = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { experienceId: string; bullets: string[] }) => input)
  .handler(async ({ data }) => {
    await setExperienceBullets(data.experienceId, data.bullets);
    return { success: true };
  });

// ─── Education ─────────────────────────────────────────────

export const createEducation = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId: string;
      school: string;
      degree: string;
      field?: string;
      startDate?: string;
      endDate: string;
      description?: string;
      sortOrder: number;
      bullets?: string[];
    }) => input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addEducation(resumeId, rest);
    return { id };
  });

export const editEducation = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      id: string;
      school?: string;
      degree?: string;
      field?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
      sortOrder?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateEducation(id, rest);
    return { success: true };
  });

export const removeEducation = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteEducation(data.id);
    return { success: true };
  });

// ─── Projects ──────────────────────────────────────────────

export const createProject = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId: string;
      name: string;
      url?: string;
      homepageUrl?: string;
      description: string;
      tech: string[];
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addProject(resumeId, rest);
    return { id };
  });

export const editProject = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      url?: string;
      homepageUrl?: string;
      description?: string;
      tech?: string[];
      sortOrder?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateProject(id, rest);
    return { success: true };
  });

export const removeProject = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteProject(data.id);
    return { success: true };
  });

// ─── Skills ────────────────────────────────────────────────

export const updateSkillGroups = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; groups: { name: string; items: string[] }[] }) => input,
  )
  .handler(async ({ data }) => {
    await setSkillGroups(data.resumeId, data.groups);
    return { success: true };
  });

// ─── Talks ─────────────────────────────────────────────────

export const createTalk = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId: string;
      title: string;
      event?: string;
      date?: string;
      description?: string;
      links?: { label: string; url: string }[];
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addTalk(resumeId, rest);
    return { id };
  });

export const editTalk = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      id: string;
      title?: string;
      event?: string;
      date?: string;
      description?: string;
      links?: { label: string; url: string }[];
      sortOrder?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateTalk(id, rest);
    return { success: true };
  });

export const removeTalk = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteTalk(data.id);
    return { success: true };
  });

// ─── Search (for "pick from existing" modal) ───────────────

export const searchExperienceBullets = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ context, data }) => {
    return searchUserExperienceBullets(context.viewer.user.id, data.query);
  });

export const searchExperiences = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ context, data }) => {
    return searchUserExperiences(context.viewer.user.id, data.query);
  });

export const searchProjects = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ context, data }) => {
    return searchUserProjects(context.viewer.user.id, data.query);
  });

export const searchEducation = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ context, data }) => {
    return searchUserEducation(context.viewer.user.id, data.query);
  });

export const searchSkills = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ context, data }) => {
    return searchUserSkills(context.viewer.user.id, data.query);
  });
