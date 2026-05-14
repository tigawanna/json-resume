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
  assertCertificationBelongsToUser,
  assertContactBelongsToUser,
  assertEducationBelongsToUser,
  assertExperienceBelongsToUser,
  assertLanguageBelongsToUser,
  assertLinkBelongsToUser,
  assertProjectBelongsToUser,
  assertResumeBelongsToUser,
  assertSkillGroupBelongsToUser,
  assertSummaryBelongsToUser,
  assertTalkBelongsToUser,
  assertVolunteerBelongsToUser,
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
  listResumesForUserPaginated,
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
  updateDuplicateContactsForUser,
  updateDuplicateLinksForUser,
  updateEducation,
  updateExperience,
  updateLanguage,
  updateProject,
  updateResumeMetadata,
  updateSkillGroup,
  updateSummaryItem,
  updateTalk,
  updateVolunteer,
  swapEducationSortOrder,
  swapProjectSortOrder,
  swapTalkSortOrder,
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

export const listResumesPaginated = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input?: { keyword?: string; cursor?: string; direction?: "after" | "before" }) => input,
  )
  .handler(async ({ context, data }) => {
    return listResumesForUserPaginated(context.viewer.user.id, {
      keyword: data?.keyword,
      cursor: data?.cursor,
      direction: data?.direction,
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
  .handler(async ({ context, data }) => {
    await assertResumeBelongsToUser(data.resumeId, context.viewer.user.id);
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
  .handler(async ({ context, data }) => {
    await assertResumeBelongsToUser(data.resumeId, context.viewer.user.id);
    await setResumeContacts(data.resumeId, context.viewer.user.id, data.contacts);
    return { success: true };
  });

// ─── Links ─────────────────────────────────────────────────

export const updateLinks = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; links: { label: string; url: string; icon?: string }[] }) => input,
  )
  .handler(async ({ context, data }) => {
    await assertResumeBelongsToUser(data.resumeId, context.viewer.user.id);
    await setResumeLinks(data.resumeId, context.viewer.user.id, data.links);
    return { success: true };
  });

export const createLink = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId?: string; label: string; url: string; icon?: string; sortOrder: number }) =>
      input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addLink(context.viewer.user.id, resumeId, rest);
    return { id };
  });

export const editLink = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { id: string; label?: string; url?: string; icon?: string; sortOrder?: number }) =>
      input,
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertLinkBelongsToUser(id, context.viewer.user.id);
    await updateDuplicateLinksForUser(id, context.viewer.user.id, rest);
    return { success: true };
  });

export const removeLink = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertLinkBelongsToUser(data.id, context.viewer.user.id);
    await deleteLinkById(data.id);
    return { success: true };
  });

// ─── Summary ───────────────────────────────────────────────

export const updateSummary = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { resumeId: string; text: string }) => input)
  .handler(async ({ context, data }) => {
    await assertResumeBelongsToUser(data.resumeId, context.viewer.user.id);
    await setResumeSummary(data.resumeId, context.viewer.user.id, data.text);
    return { success: true };
  });

export const createSummaryItem = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { resumeId?: string; text: string; sortOrder: number }) => input)
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addSummaryItem(context.viewer.user.id, resumeId, rest);
    return { id };
  });

export const editSummaryItem = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string; text?: string; sortOrder?: number }) => input)
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertSummaryBelongsToUser(id, context.viewer.user.id);
    await updateSummaryItem(id, rest);
    return { success: true };
  });

export const removeSummaryItem = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertSummaryBelongsToUser(data.id, context.viewer.user.id);
    await deleteSummaryById(data.id);
    return { success: true };
  });

// ─── Experience ────────────────────────────────────────────

export const createExperience = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId?: string;
      company: string;
      role: string;
      startDate: string;
      endDate: string;
      location?: string;
      sortOrder: number;
      bullets: string[];
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addExperience(context.viewer.user.id, resumeId, rest);
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
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertExperienceBelongsToUser(id, context.viewer.user.id);
    await updateExperience(id, rest);
    return { success: true };
  });

export const removeExperience = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertExperienceBelongsToUser(data.id, context.viewer.user.id);
    await deleteExperience(data.id);
    return { success: true };
  });

export const updateExperienceBullets = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { experienceId: string; bullets: string[] }) => input)
  .handler(async ({ context, data }) => {
    await assertExperienceBelongsToUser(data.experienceId, context.viewer.user.id);
    await setExperienceBullets(data.experienceId, data.bullets);
    return { success: true };
  });

// ─── Education ─────────────────────────────────────────────

export const createEducation = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId?: string;
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
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addEducation(context.viewer.user.id, resumeId, rest);
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
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertEducationBelongsToUser(id, context.viewer.user.id);
    await updateEducation(id, rest);
    return { success: true };
  });

export const removeEducation = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertEducationBelongsToUser(data.id, context.viewer.user.id);
    await deleteEducation(data.id);
    return { success: true };
  });

export const reorderEducationFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { idA: string; idB: string }) => input)
  .handler(async ({ context, data }) => {
    await swapEducationSortOrder(context.viewer.user.id, data.idA, data.idB);
    return { success: true };
  });

// ─── Projects ──────────────────────────────────────────────

export const createProject = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId?: string;
      name: string;
      url?: string;
      homepageUrl?: string;
      description: string;
      tech: string[];
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addProject(context.viewer.user.id, resumeId, rest);
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
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertProjectBelongsToUser(id, context.viewer.user.id);
    await updateProject(id, rest);
    return { success: true };
  });

export const removeProject = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertProjectBelongsToUser(data.id, context.viewer.user.id);
    await deleteProject(data.id);
    return { success: true };
  });

export const reorderProjectFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { idA: string; idB: string }) => input)
  .handler(async ({ context, data }) => {
    await swapProjectSortOrder(context.viewer.user.id, data.idA, data.idB);
    return { success: true };
  });

// ─── Skills ────────────────────────────────────────────────

export const updateSkillGroups = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId: string; groups: { name: string; items: string[] }[] }) => input,
  )
  .handler(async ({ context, data }) => {
    await assertResumeBelongsToUser(data.resumeId, context.viewer.user.id);
    await setSkillGroups(data.resumeId, context.viewer.user.id, data.groups);
    return { success: true };
  });

export const editSkillGroup = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { id: string; name?: string; skills?: string[]; sortOrder?: number }) => input,
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertSkillGroupBelongsToUser(id, context.viewer.user.id);
    await updateSkillGroup(id, rest);
    return { success: true };
  });

export const removeSkillGroup = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertSkillGroupBelongsToUser(data.id, context.viewer.user.id);
    await deleteSkillGroupById(data.id);
    return { success: true };
  });

export const createSkillGroup = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId?: string; name: string; skills: string[]; sortOrder: number }) => input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addSkillGroup(context.viewer.user.id, resumeId, rest);
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
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertCertificationBelongsToUser(id, context.viewer.user.id);
    await updateCertification(id, rest);
    return { success: true };
  });

export const removeCertification = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertCertificationBelongsToUser(data.id, context.viewer.user.id);
    await deleteCertification(data.id);
    return { success: true };
  });

export const createCertification = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId?: string;
      name: string;
      issuer?: string;
      date?: string;
      url?: string;
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addCertification(context.viewer.user.id, resumeId, rest);
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
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertVolunteerBelongsToUser(id, context.viewer.user.id);
    await updateVolunteer(id, rest);
    return { success: true };
  });

export const removeVolunteer = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertVolunteerBelongsToUser(data.id, context.viewer.user.id);
    await deleteVolunteerById(data.id);
    return { success: true };
  });

export const createVolunteer = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId?: string;
      organization: string;
      role?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addVolunteer(context.viewer.user.id, resumeId, rest);
    return { id };
  });

// ─── Languages ─────────────────────────────────────────────

export const editLanguage = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { id: string; name?: string; proficiency?: string; sortOrder?: number }) => input,
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertLanguageBelongsToUser(id, context.viewer.user.id);
    await updateLanguage(id, rest);
    return { success: true };
  });

export const removeLanguage = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertLanguageBelongsToUser(data.id, context.viewer.user.id);
    await deleteLanguageById(data.id);
    return { success: true };
  });

export const createLanguage = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { resumeId?: string; name: string; proficiency?: string; sortOrder: number }) => input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addLanguage(context.viewer.user.id, resumeId, rest);
    return { id };
  });

// ─── Contacts (individual) ─────────────────────────────────

export const editContact = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: { id: string; type?: string; value?: string; label?: string; sortOrder?: number }) =>
      input,
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertContactBelongsToUser(id, context.viewer.user.id);
    await updateDuplicateContactsForUser(id, context.viewer.user.id, rest);
    return { success: true };
  });

export const removeContact = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertContactBelongsToUser(data.id, context.viewer.user.id);
    await deleteContactById(data.id);
    return { success: true };
  });

export const createContact = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId?: string;
      type: string;
      value: string;
      label?: string;
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addContact(context.viewer.user.id, resumeId, rest);
    return { id };
  });

// ─── Talks ─────────────────────────────────────────────────

export const createTalk = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input: {
      resumeId?: string;
      title: string;
      event?: string;
      date?: string;
      description?: string;
      links?: { label: string; url: string }[];
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { resumeId, ...rest } = data;
    if (resumeId) await assertResumeBelongsToUser(resumeId, context.viewer.user.id);
    const id = await addTalk(context.viewer.user.id, resumeId, rest);
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
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    await assertTalkBelongsToUser(id, context.viewer.user.id);
    await updateTalk(id, rest);
    return { success: true };
  });

export const removeTalk = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertTalkBelongsToUser(data.id, context.viewer.user.id);
    await deleteTalk(data.id);
    return { success: true };
  });

export const reorderTalkFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: { idA: string; idB: string }) => input)
  .handler(async ({ context, data }) => {
    await swapTalkSortOrder(context.viewer.user.id, data.idA, data.idB);
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
