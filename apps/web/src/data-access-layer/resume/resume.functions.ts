import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { createServerFn } from "@tanstack/react-start";
import {
  addCertification,
  addContact,
  addEducation,
  addExperience,
  addLanguage,
  addLink,
  addProject,
  addSkillGroup,
  addSummaryItem,
  addTalk,
  addVolunteer,
  batchUpdateSectionOrder,
  createResumeForUser,
  deleteCertification,
  deleteContactById,
  deleteEducation,
  deleteExperience,
  deleteLanguageById,
  deleteLinkById,
  deleteProject,
  deleteResumeForUser,
  deleteSkillGroupById,
  deleteSummaryById,
  deleteTalk,
  deleteVolunteerById,
  getResumeDetail,
  listResumesForUser,
  replaceResumeContent,
  searchUserEducation,
  searchUserExperienceBullets,
  searchUserExperiences,
  searchUserProjects,
  searchUserSkills,
  searchUserTalks,
  setExperienceBullets,
  setResumeContacts,
  setResumeLinks,
  setResumeSummary,
  setSkillGroups,
  updateCertification,
  updateContact,
  updateEducation,
  updateExperience,
  updateLanguage,
  updateLink,
  updateProject,
  updateResumeMetadata,
  updateSkillGroup,
  updateSummaryItem,
  updateTalk,
  updateVolunteer,
} from "./resume.server";

// ─── List & Detail ─────────────────────────────────────────

export const listResumes = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input?: { id?: string; keyword?: string }) => input)
  .handler(async ({ context, data }) => {
    return listResumesForUser({
      userId: context.viewer.user.id,
      id: data?.id,
      keyword: data?.keyword,
    });
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

export const createLink = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; label: string; url: string; icon?: string; sortOrder: number }) =>
      input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addLink(resumeId, rest);
    return { id };
  });

export const editLink = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { id: string; label?: string; url?: string; icon?: string; sortOrder?: number }) =>
      input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateLink(id, rest);
    return { success: true };
  });

export const removeLink = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteLinkById(data.id);
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

export const createSummaryItem = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { resumeId: string; text: string; sortOrder: number }) => input)
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addSummaryItem(resumeId, rest);
    return { id };
  });

export const editSummaryItem = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string; text?: string; sortOrder?: number }) => input)
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateSummaryItem(id, rest);
    return { success: true };
  });

export const removeSummaryItem = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteSummaryById(data.id);
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

export const editSkillGroup = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { id: string; name?: string; skills?: string[]; sortOrder?: number }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateSkillGroup(id, rest);
    return { success: true };
  });

export const removeSkillGroup = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteSkillGroupById(data.id);
    return { success: true };
  });

export const createSkillGroup = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; name: string; skills: string[]; sortOrder: number }) => input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addSkillGroup(resumeId, rest);
    return { id };
  });

// ─── Certifications ────────────────────────────────────────

export const editCertification = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      issuer?: string;
      date?: string;
      url?: string;
      sortOrder?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateCertification(id, rest);
    return { success: true };
  });

export const removeCertification = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteCertification(data.id);
    return { success: true };
  });

export const createCertification = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId: string;
      name: string;
      issuer?: string;
      date?: string;
      url?: string;
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addCertification(resumeId, rest);
    return { id };
  });

// ─── Volunteers ────────────────────────────────────────────

export const editVolunteer = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      id: string;
      organization?: string;
      role?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
      sortOrder?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateVolunteer(id, rest);
    return { success: true };
  });

export const removeVolunteer = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteVolunteerById(data.id);
    return { success: true };
  });

export const createVolunteer = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId: string;
      organization: string;
      role?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addVolunteer(resumeId, rest);
    return { id };
  });

// ─── Languages ─────────────────────────────────────────────

export const editLanguage = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { id: string; name?: string; proficiency?: string; sortOrder?: number }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateLanguage(id, rest);
    return { success: true };
  });

export const removeLanguage = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteLanguageById(data.id);
    return { success: true };
  });

export const createLanguage = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; name: string; proficiency?: string; sortOrder: number }) => input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addLanguage(resumeId, rest);
    return { id };
  });

// ─── Contacts (individual) ─────────────────────────────────

export const editContact = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { id: string; type?: string; value?: string; label?: string; sortOrder?: number }) =>
      input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    await updateContact(id, rest);
    return { success: true };
  });

export const removeContact = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteContactById(data.id);
    return { success: true };
  });

export const createContact = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; type: string; value: string; label?: string; sortOrder: number }) =>
      input,
  )
  .handler(async ({ data }) => {
    const { resumeId, ...rest } = data;
    const id = await addContact(resumeId, rest);
    return { id };
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

export const searchTalks = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ context, data }) => {
    return searchUserTalks(context.viewer.user.id, data.query);
  });
