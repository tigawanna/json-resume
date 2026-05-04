import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
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
import { localResumeCollection } from "./local-resume-collection";
import { resumeDocumentToDetail, nowIso } from "./resume-workspace-utils";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";

function makeId() {
  return crypto.randomUUID();
}

async function applyUpdate(id: string, updater: (draft: ResumeDetailDTO) => void): Promise<void> {
  await localResumeCollection.preload();
  const tx = localResumeCollection.update(id, (draft) => {
    updater(draft as ResumeDetailDTO);
    (draft as ResumeDetailDTO).updatedAt = nowIso();
  });
  await tx.isPersisted.promise;
}

export function createLocalResumeWorkspace(resume: ResumeDetailDTO): ResumeWorkspaceAdapter {
  const id = resume.id;

  return {
    mode: "local",
    resume,
    async updateMetadata(values: ResumeMetadataDraft) {
      await applyUpdate(id, (draft) => {
        Object.assign(draft, values);
      });
    },
    async updateContacts(contacts: ContactDraft[]) {
      await applyUpdate(id, (draft) => {
        draft.contacts = contacts.map((contact, index) => ({
          id: makeId(),
          resumeId: id,
          type: contact.type,
          value: contact.value,
          label: contact.label,
          sortOrder: index,
        }));
      });
    },
    async updateLinks(links: LinkDraft[]) {
      await applyUpdate(id, (draft) => {
        draft.links = links.map((link, index) => ({
          id: makeId(),
          resumeId: id,
          label: link.label,
          url: link.url,
          icon: link.icon ?? null,
          sortOrder: index,
        }));
      });
    },
    async updateSummary(text: string) {
      await applyUpdate(id, (draft) => {
        draft.summaries = text.trim() ? [{ id: makeId(), resumeId: id, text, sortOrder: 0 }] : [];
      });
    },
    async updateSkillGroups(groups: SkillGroupDraft[]) {
      await applyUpdate(id, (draft) => {
        draft.skillGroups = groups.map((group, groupIndex) => {
          const groupId = makeId();
          return {
            id: groupId,
            resumeId: id,
            name: group.name,
            sortOrder: groupIndex,
            skills: group.items.map((skill, skillIndex) => ({
              id: makeId(),
              groupId,
              name: skill,
              level: null,
              sortOrder: skillIndex,
            })),
          };
        });
      });
    },
    async createExperience(values: ExperienceDraft) {
      const newId = makeId();
      await applyUpdate(id, (draft) => {
        draft.experiences.push({
          id: newId,
          resumeId: id,
          ...values,
          sortOrder: draft.experiences.length,
          bullets: [],
        });
      });
      return { id: newId };
    },
    async updateExperience(expId: string, values: ExperienceDraft) {
      await applyUpdate(id, (draft) => {
        const item = draft.experiences.find((e) => e.id === expId);
        if (item) Object.assign(item, values);
      });
    },
    async deleteExperience(expId: string) {
      await applyUpdate(id, (draft) => {
        draft.experiences = draft.experiences.filter((e) => e.id !== expId);
      });
    },
    async reorderExperience(idA: string, idB: string) {
      await applyUpdate(id, (draft) => {
        const a = draft.experiences.find((e) => e.id === idA);
        const b = draft.experiences.find((e) => e.id === idB);
        if (a && b) {
          const tempOrder = a.sortOrder;
          a.sortOrder = b.sortOrder;
          b.sortOrder = tempOrder;
          draft.experiences.sort((x, y) => y.sortOrder - x.sortOrder);
        }
      });
    },
    async updateExperienceBullets(experienceId: string, bullets: string[]) {
      await applyUpdate(id, (draft) => {
        const item = draft.experiences.find((e) => e.id === experienceId);
        if (item) {
          item.bullets = bullets.map((text, index) => ({
            id: makeId(),
            experienceId,
            text,
            sortOrder: index,
          }));
        }
      });
    },
    async createEducation(values: EducationDraft) {
      const newId = makeId();
      await applyUpdate(id, (draft) => {
        draft.education.push({
          id: newId,
          resumeId: id,
          ...values,
          sortOrder: draft.education.length,
          bullets: [],
        });
      });
      return { id: newId };
    },
    async updateEducation(eduId: string, values: EducationDraft) {
      await applyUpdate(id, (draft) => {
        const item = draft.education.find((e) => e.id === eduId);
        if (item) Object.assign(item, values);
      });
    },
    async deleteEducation(eduId: string) {
      await applyUpdate(id, (draft) => {
        draft.education = draft.education.filter((e) => e.id !== eduId);
      });
    },
    async createProject(values: ProjectDraft) {
      const newId = makeId();
      await applyUpdate(id, (draft) => {
        draft.projects.push({
          id: newId,
          resumeId: id,
          name: values.name,
          url: values.url,
          homepageUrl: values.homepageUrl,
          description: values.description,
          tech: JSON.stringify(values.tech),
          sortOrder: draft.projects.length,
        });
      });
      return { id: newId };
    },
    async updateProject(projId: string, values: ProjectDraft) {
      await applyUpdate(id, (draft) => {
        const item = draft.projects.find((p) => p.id === projId);
        if (item) {
          item.name = values.name;
          item.url = values.url;
          item.homepageUrl = values.homepageUrl;
          item.description = values.description;
          item.tech = JSON.stringify(values.tech);
        }
      });
    },
    async deleteProject(projId: string) {
      await applyUpdate(id, (draft) => {
        draft.projects = draft.projects.filter((p) => p.id !== projId);
      });
    },
    async createTalk(values: TalkDraft) {
      const newId = makeId();
      await applyUpdate(id, (draft) => {
        draft.talks.push({
          id: newId,
          resumeId: id,
          title: values.title,
          event: values.event,
          date: values.date,
          description: values.description,
          links: JSON.stringify(values.links ?? []),
          sortOrder: draft.talks.length,
        });
      });
      return { id: newId };
    },
    async updateTalk(talkId: string, values: TalkDraft) {
      await applyUpdate(id, (draft) => {
        const item = draft.talks.find((t) => t.id === talkId);
        if (item) {
          item.title = values.title;
          item.event = values.event;
          item.date = values.date;
          item.description = values.description;
          item.links = JSON.stringify(values.links ?? []);
        }
      });
    },
    async deleteTalk(talkId: string) {
      await applyUpdate(id, (draft) => {
        draft.talks = draft.talks.filter((t) => t.id !== talkId);
      });
    },
    async replaceDocument(doc: ResumeDocumentV1) {
      const next = resumeDocumentToDetail({
        id,
        userId: resume.userId,
        name: resume.name,
        description: resume.description,
        jobDescription: resume.jobDescription,
        createdAt: resume.createdAt,
        doc,
      });
      await applyUpdate(id, (draft) => {
        Object.assign(draft, next);
      });
    },
  };
}
