import {
  createEducation,
  createExperience,
  createProject,
  createTalk,
  editEducation,
  editExperience,
  editProject,
  editTalk,
  removeEducation,
  removeExperience,
  removeProject,
  removeTalk,
  replaceResumeDoc,
  searchEducation,
  searchExperienceBullets,
  searchExperiences,
  searchProjects,
  searchSkills,
  searchTalks,
  updateContacts,
  updateExperienceBullets,
  updateLinks,
  updateResumeMeta,
  updateSkillGroups,
  updateSummary,
} from "@/data-access-layer/resume/resume.functions";
import { reorderExperienceFn } from "@/data-access-layer/resume/experiences/experience.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import {
  resumeCollection,
  resumesCollection,
} from "@/data-access-layer/resume/resumes-query-collection";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import type {
  ContactDraft,
  EducationDraft,
  ExperienceDraft,
  LinkDraft,
  ProjectDraft,
  ResumeMetadataDraft,
  ResumeWorkspaceAdapter,
  SkillGroupDraft,
  TalkDraft,
} from "./resume-workspace-types";

function writeResumeUpdate(resumeId: string, updates: Partial<ResumeDetailDTO>) {
  try {
    resumeCollection.utils.writeUpdate({ id: resumeId, ...updates });
  } catch {
    // Collection may not be initialized yet; server already persisted the update
  }
  try {
    resumesCollection.utils.writeUpdate({
      id: resumeId,
      updatedAt: new Date().toISOString(),
      ...updates,
    });
  } catch {
    // Same guard for the list collection
  }
}

export function createRemoteResumeWorkspace(resume: ResumeDetailDTO): ResumeWorkspaceAdapter {
  return {
    mode: "remote",
    resume,
    searches: {
      experiences: (query) => searchExperiences({ data: { query } }),
      experienceBullets: (query) => searchExperienceBullets({ data: { query } }),
      education: (query) => searchEducation({ data: { query } }),
      projects: (query) => searchProjects({ data: { query } }),
      skills: (query) => searchSkills({ data: { query } }),
      talks: (query) => searchTalks({ data: { query } }),
    },
    async updateMetadata(values: ResumeMetadataDraft) {
      await updateResumeMeta({ data: { id: resume.id, ...values } });
      writeResumeUpdate(resume.id, values);
    },
    async updateContacts(contacts: ContactDraft[]) {
      await updateContacts({ data: { resumeId: resume.id, contacts } });
      writeResumeUpdate(resume.id, {
        contacts: contacts.map((contact, index) => ({
          id: "",
          resumeId: resume.id,
          type: contact.type,
          value: contact.value,
          label: contact.label,
          sortOrder: index,
        })),
      });
    },
    async updateLinks(links: LinkDraft[]) {
      await updateLinks({ data: { resumeId: resume.id, links } });
      writeResumeUpdate(resume.id, {
        links: links.map((link, index) => ({
          id: "",
          resumeId: resume.id,
          label: link.label,
          url: link.url,
          icon: link.icon ?? "",
          sortOrder: index,
        })),
      });
    },
    async updateSummary(text: string) {
      await updateSummary({ data: { resumeId: resume.id, text } });
      writeResumeUpdate(resume.id, {
        summaries: [{ id: "", resumeId: resume.id, text, sortOrder: 0 }],
      });
    },
    async updateSkillGroups(groups: SkillGroupDraft[]) {
      await updateSkillGroups({ data: { resumeId: resume.id, groups } });
      writeResumeUpdate(resume.id, {
        skillGroups: groups.map((group, groupIndex) => ({
          id: "",
          resumeId: resume.id,
          name: group.name,
          sortOrder: groupIndex,
          skills: group.items.map((skill, skillIndex) => ({
            id: "",
            groupId: "",
            name: skill,
            level: null,
            sortOrder: skillIndex,
          })),
        })),
      });
    },
    async createExperience(values: ExperienceDraft) {
      const data = await createExperience({
        data: { resumeId: resume.id, ...values, sortOrder: resume.experiences.length, bullets: [] },
      });
      writeResumeUpdate(resume.id, {
        experiences: [
          ...resume.experiences,
          {
            id: data.id,
            resumeId: resume.id,
            ...values,
            sortOrder: resume.experiences.length,
            bullets: [],
          },
        ],
      });
      return data;
    },
    async updateExperience(id: string, values: ExperienceDraft) {
      await editExperience({ data: { id, ...values } });
      writeResumeUpdate(resume.id, {
        experiences: resume.experiences.map((item) =>
          item.id === id ? { ...item, ...values } : item,
        ),
      });
    },
    async deleteExperience(id: string) {
      await removeExperience({ data: { id } });
      writeResumeUpdate(resume.id, {
        experiences: resume.experiences.filter((item) => item.id !== id),
      });
    },
    async reorderExperience(idA: string, idB: string) {
      await reorderExperienceFn({ data: { idA, idB } });
      const experiences = [...resume.experiences];
      const indexA = experiences.findIndex((e) => e.id === idA);
      const indexB = experiences.findIndex((e) => e.id === idB);
      if (indexA >= 0 && indexB >= 0) {
        const tempOrder = experiences[indexA].sortOrder;
        experiences[indexA] = { ...experiences[indexA], sortOrder: experiences[indexB].sortOrder };
        experiences[indexB] = { ...experiences[indexB], sortOrder: tempOrder };
        experiences.sort((a, b) => b.sortOrder - a.sortOrder);
        writeResumeUpdate(resume.id, { experiences });
      }
    },
    async updateExperienceBullets(experienceId: string, bullets: string[]) {
      await updateExperienceBullets({ data: { experienceId, bullets } });
      writeResumeUpdate(resume.id, {
        experiences: resume.experiences.map((item) =>
          item.id === experienceId
            ? {
                ...item,
                bullets: bullets.map((text, index) => ({
                  id: "",
                  experienceId,
                  text,
                  sortOrder: index,
                })),
              }
            : item,
        ),
      });
    },
    async createEducation(values: EducationDraft) {
      const data = await createEducation({
        data: { resumeId: resume.id, ...values, sortOrder: resume.education.length },
      });
      writeResumeUpdate(resume.id, {
        education: [
          ...resume.education,
          {
            id: data.id,
            resumeId: resume.id,
            ...values,
            sortOrder: resume.education.length,
            bullets: [],
          },
        ],
      });
      return data;
    },
    async updateEducation(id: string, values: EducationDraft) {
      await editEducation({ data: { id, ...values } });
      writeResumeUpdate(resume.id, {
        education: resume.education.map((item) => (item.id === id ? { ...item, ...values } : item)),
      });
    },
    async deleteEducation(id: string) {
      await removeEducation({ data: { id } });
      writeResumeUpdate(resume.id, {
        education: resume.education.filter((item) => item.id !== id),
      });
    },
    async createProject(values: ProjectDraft) {
      const data = await createProject({
        data: { resumeId: resume.id, ...values, sortOrder: resume.projects.length },
      });
      writeResumeUpdate(resume.id, {
        projects: [
          ...resume.projects,
          {
            id: data.id,
            resumeId: resume.id,
            name: values.name,
            url: values.url,
            homepageUrl: values.homepageUrl,
            description: values.description,
            tech: JSON.stringify(values.tech),
            sortOrder: resume.projects.length,
          },
        ],
      });
      return data;
    },
    async updateProject(id: string, values: ProjectDraft) {
      await editProject({ data: { id, ...values } });
      writeResumeUpdate(resume.id, {
        projects: resume.projects.map((item) =>
          item.id === id
            ? {
                ...item,
                name: values.name,
                url: values.url,
                homepageUrl: values.homepageUrl,
                description: values.description,
                tech: JSON.stringify(values.tech),
              }
            : item,
        ),
      });
    },
    async deleteProject(id: string) {
      await removeProject({ data: { id } });
      writeResumeUpdate(resume.id, {
        projects: resume.projects.filter((item) => item.id !== id),
      });
    },
    async createTalk(values: TalkDraft) {
      const data = await createTalk({
        data: {
          resumeId: resume.id,
          title: values.title,
          event: values.event,
          date: values.date,
          description: values.description,
          sortOrder: resume.talks.length,
        },
      });
      writeResumeUpdate(resume.id, {
        talks: [
          ...resume.talks,
          {
            id: data.id,
            resumeId: resume.id,
            title: values.title,
            event: values.event,
            date: values.date,
            description: values.description,
            links: JSON.stringify(values.links ?? []),
            sortOrder: resume.talks.length,
          },
        ],
      });
      return data;
    },
    async updateTalk(id: string, values: TalkDraft) {
      await editTalk({ data: { id, ...values, links: values.links ?? [] } });
      writeResumeUpdate(resume.id, {
        talks: resume.talks.map((item) =>
          item.id === id
            ? {
                ...item,
                title: values.title,
                event: values.event,
                date: values.date,
                description: values.description,
                links: JSON.stringify(values.links ?? []),
              }
            : item,
        ),
      });
    },
    async deleteTalk(id: string) {
      await removeTalk({ data: { id } });
      writeResumeUpdate(resume.id, {
        talks: resume.talks.filter((item) => item.id !== id),
      });
    },
    async replaceDocument(doc: ResumeDocumentV1) {
      await replaceResumeDoc({ data: { id: resume.id, doc } });
      await resumeCollection.utils.refetch();
      await resumesCollection.utils.refetch();
    },
  };
}
