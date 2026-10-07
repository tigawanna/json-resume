import { documentToInsertData } from "@/data-access-layer/resume/resume-converters";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
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
} from "@/components/resume/resume-workspace/resume-workspace-types";
import type { AppDb } from "./collection";
import type { EventSourcedResumeSnapshots } from "./assemble-resume-detail";
import {
  appendResumeItemOrder,
  junctionEntityIds,
  removeResumeItemOrder,
  reorderResumeItems,
} from "./resume-item-order";
import { attachJobToResume } from "./job-rows";
import {
  contactIndex,
  deleteUnlinkedGroups,
  educationIndex,
  experienceIndex,
  linkIndex,
  noteIndex,
  projectIndex,
  resolveSkillGroup,
  resolveSkillIds,
  setResumeBullets,
  summaryIndex,
  talkIndex,
} from "./library-resolve";
import {
  joinSearchable,
  libraryRowBase,
  newId,
  nowMs,
} from "@/routes/_dashboard/-utils/row-helpers";

function matchQuery(query: string, ...parts: Array<string | null | undefined>) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => (part ?? "").toLowerCase().includes(needle));
}

/** Reads the live collection: rows deleted earlier in the same edit are already gone. */
function deleteResumeItems(
  collection: {
    delete: (id: string) => unknown;
    toArray: ReadonlyArray<{ id: string; resumeId: string }>;
  },
  resumeId: string,
) {
  const ids = collection.toArray
    .filter((item) => item.resumeId === resumeId)
    .map((item) => item.id);
  for (const id of ids) collection.delete(id);
}

function junctionFields(resumeId: string, sortOrder: number) {
  const ts = nowMs();
  return {
    id: newId(),
    resumeId,
    sortOrder,
    createdAt: ts,
    updatedAt: ts,
  };
}

function isLinked<T extends { resumeId: string }>(
  items: ReadonlyArray<T>,
  resumeId: string,
  entityOf: (item: T) => string,
  entityId: string,
) {
  return items.some((item) => item.resumeId === resumeId && entityOf(item) === entityId);
}

export function createEventSourcedResumeWorkspace(
  db: AppDb,
  detail: ResumeDetailDTO,
  snapshots: EventSourcedResumeSnapshots,
): ResumeWorkspaceAdapter {
  const resumeId = detail.id;
  const userId = detail.userId;

  function resolveExperience(values: ExperienceDraft) {
    return experienceIndex(db, userId).resolve(
      { company: values.company, role: values.role, startDate: values.startDate },
      () => {
        const base = libraryRowBase(userId);
        db.collections.resumeExperience.insert({
          ...base,
          ...values,
          searchableText: joinSearchable(values.company, values.role, values.location),
        });
        return base.id;
      },
    );
  }

  function resolveEducation(values: EducationDraft) {
    return educationIndex(db, userId).resolve(
      { school: values.school, degree: values.degree, field: values.field },
      () => {
        const base = libraryRowBase(userId);
        db.collections.resumeEducation.insert({
          ...base,
          ...values,
          searchableText: joinSearchable(values.school, values.degree, values.field),
        });
        return base.id;
      },
    );
  }

  function resolveProject(values: Omit<ProjectDraft, "tech"> & { tech: string }) {
    return projectIndex(db, userId).resolve({ name: values.name, url: values.url }, () => {
      const base = libraryRowBase(userId);
      db.collections.resumeProject.insert({
        ...base,
        name: values.name,
        url: values.url,
        homepageUrl: values.homepageUrl,
        description: values.description,
        tech: values.tech,
        searchableText: joinSearchable(values.name, values.description, values.url),
      });
      return base.id;
    });
  }

  function resolveTalk(values: Omit<TalkDraft, "links"> & { links: string }) {
    return talkIndex(db, userId).resolve({ title: values.title, event: values.event }, () => {
      const base = libraryRowBase(userId);
      db.collections.resumeTalk.insert({
        ...base,
        title: values.title,
        event: values.event,
        date: values.date,
        description: values.description,
        links: values.links,
        searchableText: joinSearchable(values.title, values.event, values.description),
      });
      return base.id;
    });
  }

  /** Drops this résumé's links to an experience's bullets; the bullets stay in the library. */
  function unlinkBullets(experienceId: string) {
    const ownIds = new Set(
      db.collections.resumeExperienceBullet.toArray
        .filter((bullet) => bullet.experienceId === experienceId)
        .map((bullet) => bullet.id),
    );
    const ids = db.collections.resumeExperienceBulletItem.toArray
      .filter((item) => item.resumeId === resumeId && ownIds.has(item.bulletId))
      .map((item) => item.id);
    for (const id of ids) db.collections.resumeExperienceBulletItem.delete(id);
  }

  return {
    mode: "local",
    resume: detail,
    jobs: db.collections.job.toArray.map((job) => ({
      id: job.id,
      company: job.company,
      title: job.title,
    })),
    searches: {
      experiences: async (query) =>
        snapshots.experiences
          .filter((row) => matchQuery(query, row.company, row.role, row.location))
          .map((row) => ({
            id: row.id,
            company: row.company,
            role: row.role,
            startDate: row.startDate,
            endDate: row.endDate,
          })),
      experienceBullets: async (query) =>
        snapshots.experienceBullets
          .filter((row) => matchQuery(query, row.text))
          .map((row) => ({ id: row.id, text: row.text })),
      education: async (query) =>
        snapshots.education
          .filter((row) => matchQuery(query, row.school, row.degree, row.field))
          .map((row) => ({
            id: row.id,
            school: row.school,
            degree: row.degree,
            field: row.field,
          })),
      projects: async (query) =>
        snapshots.projects
          .filter((row) => matchQuery(query, row.name, row.description, row.url, row.tech))
          .map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            url: row.url,
            homepageUrl: row.homepageUrl,
            tech: row.tech,
          })),
      skills: async (query) =>
        snapshots.skills
          .filter((row) => matchQuery(query, row.name))
          .map((row) => ({ id: row.id, name: row.name })),
      talks: async (query) =>
        snapshots.talks
          .filter((row) => matchQuery(query, row.title, row.event, row.description))
          .map((row) => ({
            id: row.id,
            title: row.title,
            event: row.event,
            date: row.date,
          })),
    },
    async updateMetadata(values: ResumeMetadataDraft) {
      db.collections.resume.update(resumeId, (draft) => {
        draft.name = values.name;
        draft.fullName = values.fullName;
        draft.headline = values.headline;
        draft.description = values.description;
        draft.templateId = values.templateId;
        draft.searchableText = joinSearchable(
          values.name,
          values.fullName,
          values.headline,
          values.description,
        );
        draft.updatedAt = nowMs();
      });
      const nextJobId = values.jobId === undefined ? (detail.jobId ?? null) : values.jobId;
      if (nextJobId) {
        attachJobToResume(db, resumeId, nextJobId);
      } else {
        attachJobToResume(db, resumeId, null);
        db.collections.resume.update(resumeId, (draft) => {
          draft.jobDescription = values.jobDescription;
          draft.updatedAt = nowMs();
        });
      }
    },
    async updateContacts(contacts: ContactDraft[]) {
      deleteResumeItems(db.collections.resumeContactItem, resumeId);
      const index = contactIndex(db, userId);
      const linked = new Set<string>();
      for (const contact of contacts) {
        const contactId = index.resolve({ type: contact.type, value: contact.value }, () => {
          const base = libraryRowBase(userId);
          db.collections.resumeContact.insert({
            ...base,
            type: contact.type,
            value: contact.value,
            label: contact.label,
            searchableText: joinSearchable(contact.type, contact.value, contact.label),
          });
          return base.id;
        });
        if (linked.has(contactId)) continue;
        db.collections.resumeContactItem.insert({
          ...junctionFields(resumeId, linked.size),
          contactId,
        });
        linked.add(contactId);
      }
    },
    async updateLinks(links: LinkDraft[]) {
      deleteResumeItems(db.collections.resumeLinkItem, resumeId);
      const index = linkIndex(db, userId);
      const linked = new Set<string>();
      for (const link of links) {
        const linkId = index.resolve({ url: link.url }, () => {
          const base = libraryRowBase(userId);
          db.collections.resumeLink.insert({
            ...base,
            label: link.label,
            url: link.url,
            icon: link.icon ?? null,
            searchableText: joinSearchable(link.label, link.url),
          });
          return base.id;
        });
        if (linked.has(linkId)) continue;
        db.collections.resumeLinkItem.insert({
          ...junctionFields(resumeId, linked.size),
          linkId,
        });
        linked.add(linkId);
      }
    },
    async updateSummary(text: string) {
      deleteResumeItems(db.collections.resumeSummaryItem, resumeId);
      if (!text.trim()) return;
      const summaryId = summaryIndex(db, userId).resolve({ text }, () => {
        const base = libraryRowBase(userId);
        db.collections.resumeSummary.insert({ ...base, text, searchableText: text });
        return base.id;
      });
      db.collections.resumeSummaryItem.insert({ ...junctionFields(resumeId, 0), summaryId });
    },
    async updateNotes(values: { label: string; text: string }) {
      deleteResumeItems(db.collections.resumeNoteItem, resumeId);
      if (!values.text.trim()) return;
      const label = values.label.trim() || "Notes";
      const noteId = noteIndex(db, userId).resolve({ label, text: values.text }, () => {
        const base = libraryRowBase(userId);
        db.collections.resumeNote.insert({
          ...base,
          label,
          text: values.text,
          searchableText: joinSearchable(label, values.text),
        });
        return base.id;
      });
      db.collections.resumeNoteItem.insert({ ...junctionFields(resumeId, 0), noteId });
    },
    async updateSkillGroups(groups: SkillGroupDraft[]) {
      const previous = db.collections.resumeSkillGroupItem.toArray
        .filter((item) => item.resumeId === resumeId)
        .map((item) => item.groupId);
      deleteResumeItems(db.collections.resumeSkillGroupItem, resumeId);
      const linked = new Set<string>();
      for (const group of groups) {
        const skillIds = resolveSkillIds(db, userId, group.items);
        const groupId = resolveSkillGroup(db, userId, group.name, skillIds);
        if (linked.has(groupId)) continue;
        db.collections.resumeSkillGroupItem.insert({
          ...junctionFields(resumeId, linked.size),
          groupId,
        });
        linked.add(groupId);
      }
      const stillLinked = new Set(
        db.collections.resumeSkillGroupItem.toArray.map((item) => item.groupId),
      );
      deleteUnlinkedGroups(db, previous, stillLinked);
    },
    async createExperience(values: ExperienceDraft) {
      const id = resolveExperience(values);
      if (
        !isLinked(
          db.collections.resumeExperienceItem.toArray,
          resumeId,
          (item) => item.experienceId,
          id,
        )
      ) {
        const sortOrder = db.collections.resumeExperienceItem.toArray.filter(
          (item) => item.resumeId === resumeId,
        ).length;
        db.collections.resumeExperienceItem.insert({
          ...junctionFields(resumeId, sortOrder),
          experienceId: id,
        });
        appendResumeItemOrder(
          db,
          resumeId,
          "experienceOrder",
          id,
          junctionEntityIds(snapshots.experienceItems, resumeId, "experienceId"),
        );
      }
      return { id };
    },
    async updateExperience(id: string, values: ExperienceDraft) {
      db.collections.resumeExperience.update(id, (draft) => {
        draft.company = values.company;
        draft.role = values.role;
        draft.startDate = values.startDate;
        draft.endDate = values.endDate;
        draft.location = values.location;
        draft.searchableText = joinSearchable(values.company, values.role, values.location);
        draft.updatedAt = nowMs();
      });
    },
    async deleteExperience(id: string) {
      unlinkBullets(id);
      const items = db.collections.resumeExperienceItem.toArray
        .filter((item) => item.resumeId === resumeId && item.experienceId === id)
        .map((item) => item.id);
      for (const itemId of items) db.collections.resumeExperienceItem.delete(itemId);
      removeResumeItemOrder(db, resumeId, "experienceOrder", id);
    },
    async reorderExperience(idA: string, idB: string) {
      reorderResumeItems(
        db,
        resumeId,
        "experienceOrder",
        idA,
        idB,
        snapshots.experienceItems,
        "experienceId",
        db.collections.resumeExperienceItem,
      );
    },
    async updateExperienceBullets(experienceId: string, bullets: string[]) {
      setResumeBullets(db, resumeId, experienceId, bullets);
    },
    async createEducation(values: EducationDraft) {
      const id = resolveEducation(values);
      if (
        !isLinked(
          db.collections.resumeEducationItem.toArray,
          resumeId,
          (item) => item.educationId,
          id,
        )
      ) {
        const sortOrder = db.collections.resumeEducationItem.toArray.filter(
          (item) => item.resumeId === resumeId,
        ).length;
        db.collections.resumeEducationItem.insert({
          ...junctionFields(resumeId, sortOrder),
          educationId: id,
        });
        appendResumeItemOrder(
          db,
          resumeId,
          "educationOrder",
          id,
          junctionEntityIds(snapshots.educationItems, resumeId, "educationId"),
        );
      }
      return { id };
    },
    async updateEducation(id: string, values: EducationDraft) {
      db.collections.resumeEducation.update(id, (draft) => {
        draft.school = values.school;
        draft.degree = values.degree;
        draft.field = values.field;
        draft.startDate = values.startDate;
        draft.endDate = values.endDate;
        draft.description = values.description;
        draft.searchableText = joinSearchable(values.school, values.degree, values.field);
        draft.updatedAt = nowMs();
      });
    },
    async deleteEducation(id: string) {
      for (const item of snapshots.educationItems) {
        if (item.resumeId === resumeId && item.educationId === id) {
          db.collections.resumeEducationItem.delete(item.id);
        }
      }
      removeResumeItemOrder(db, resumeId, "educationOrder", id);
    },
    async reorderEducation(idA: string, idB: string) {
      reorderResumeItems(
        db,
        resumeId,
        "educationOrder",
        idA,
        idB,
        snapshots.educationItems,
        "educationId",
        db.collections.resumeEducationItem,
      );
    },
    async createProject(values: ProjectDraft) {
      const id = resolveProject({ ...values, tech: JSON.stringify(values.tech) });
      if (
        !isLinked(db.collections.resumeProjectItem.toArray, resumeId, (item) => item.projectId, id)
      ) {
        const sortOrder = db.collections.resumeProjectItem.toArray.filter(
          (item) => item.resumeId === resumeId,
        ).length;
        db.collections.resumeProjectItem.insert({
          ...junctionFields(resumeId, sortOrder),
          projectId: id,
        });
        appendResumeItemOrder(
          db,
          resumeId,
          "projectOrder",
          id,
          junctionEntityIds(snapshots.projectItems, resumeId, "projectId"),
        );
      }
      return { id };
    },
    async updateProject(id: string, values: ProjectDraft) {
      db.collections.resumeProject.update(id, (draft) => {
        draft.name = values.name;
        draft.url = values.url;
        draft.homepageUrl = values.homepageUrl;
        draft.description = values.description;
        draft.tech = JSON.stringify(values.tech);
        draft.searchableText = joinSearchable(values.name, values.description, values.url);
        draft.updatedAt = nowMs();
      });
    },
    async deleteProject(id: string) {
      for (const item of snapshots.projectItems) {
        if (item.resumeId === resumeId && item.projectId === id) {
          db.collections.resumeProjectItem.delete(item.id);
        }
      }
      removeResumeItemOrder(db, resumeId, "projectOrder", id);
    },
    async reorderProject(idA: string, idB: string) {
      reorderResumeItems(
        db,
        resumeId,
        "projectOrder",
        idA,
        idB,
        snapshots.projectItems,
        "projectId",
        db.collections.resumeProjectItem,
      );
    },
    async createTalk(values: TalkDraft) {
      const id = resolveTalk({ ...values, links: JSON.stringify(values.links ?? []) });
      if (!isLinked(db.collections.resumeTalkItem.toArray, resumeId, (item) => item.talkId, id)) {
        const sortOrder = db.collections.resumeTalkItem.toArray.filter(
          (item) => item.resumeId === resumeId,
        ).length;
        db.collections.resumeTalkItem.insert({
          ...junctionFields(resumeId, sortOrder),
          talkId: id,
        });
        appendResumeItemOrder(
          db,
          resumeId,
          "talkOrder",
          id,
          junctionEntityIds(snapshots.talkItems, resumeId, "talkId"),
        );
      }
      return { id };
    },
    async updateTalk(id: string, values: TalkDraft) {
      db.collections.resumeTalk.update(id, (draft) => {
        draft.title = values.title;
        draft.event = values.event;
        draft.date = values.date;
        draft.description = values.description;
        draft.links = JSON.stringify(values.links ?? []);
        draft.searchableText = joinSearchable(values.title, values.event, values.description);
        draft.updatedAt = nowMs();
      });
    },
    async deleteTalk(id: string) {
      for (const item of snapshots.talkItems) {
        if (item.resumeId === resumeId && item.talkId === id) {
          db.collections.resumeTalkItem.delete(item.id);
        }
      }
      removeResumeItemOrder(db, resumeId, "talkOrder", id);
    },
    async reorderTalk(idA: string, idB: string) {
      reorderResumeItems(
        db,
        resumeId,
        "talkOrder",
        idA,
        idB,
        snapshots.talkItems,
        "talkId",
        db.collections.resumeTalkItem,
      );
    },
    /**
     * Rewrites the résumé from a document by linking to existing library rows
     * wherever one matches, so a regenerated résumé adds only what is new.
     */
    async replaceDocument(doc: ResumeDocumentV1) {
      const data = documentToInsertData(resumeId, userId, doc);
      const ts = nowMs();

      const sectionIds = db.collections.resumeSection.toArray
        .filter((section) => section.resumeId === resumeId)
        .map((section) => section.id);
      for (const id of sectionIds) db.collections.resumeSection.delete(id);
      for (const section of data.sections) {
        db.collections.resumeSection.insert({
          id: section.id,
          resumeId,
          key: section.key,
          title: section.title,
          enabled: section.enabled,
          sortOrder: section.sortOrder,
          createdAt: ts,
          updatedAt: ts,
        });
      }

      await this.updateContacts(
        data.contacts.map((contact) => ({
          type: contact.type,
          value: contact.value,
          label: contact.label,
        })),
      );
      await this.updateLinks(
        data.links.map((link) => ({
          label: link.label,
          url: link.url,
          icon: link.icon ?? undefined,
        })),
      );
      await this.updateSummary(data.summaries[0]?.text ?? "");
      const note = data.notes[0];
      await this.updateNotes({
        label: note?.label ?? "Notes",
        text: note?.text ?? "",
      });
      await this.updateSkillGroups(
        data.skillGroups.map((group) => ({
          name: group.name,
          items: data.skills
            .filter((skill) => skill.groupId === group.id)
            .map((skill) => skill.name),
        })),
      );

      const previousExperiences = db.collections.resumeExperienceItem.toArray
        .filter((item) => item.resumeId === resumeId)
        .map((item) => item.experienceId);
      deleteResumeItems(db.collections.resumeExperienceItem, resumeId);
      deleteResumeItems(db.collections.resumeEducationItem, resumeId);
      deleteResumeItems(db.collections.resumeProjectItem, resumeId);
      deleteResumeItems(db.collections.resumeTalkItem, resumeId);

      const experienceOrder: string[] = [];
      for (const experience of data.experiences) {
        const id = resolveExperience({
          company: experience.company,
          role: experience.role,
          startDate: experience.startDate,
          endDate: experience.endDate,
          location: experience.location,
        });
        if (experienceOrder.includes(id)) continue;
        db.collections.resumeExperienceItem.insert({
          ...junctionFields(resumeId, experienceOrder.length),
          experienceId: id,
        });
        experienceOrder.push(id);
        setResumeBullets(
          db,
          resumeId,
          id,
          data.experienceBullets
            .filter((bullet) => bullet.experienceId === experience.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((bullet) => bullet.text),
        );
      }
      for (const experienceId of previousExperiences) {
        if (!experienceOrder.includes(experienceId)) unlinkBullets(experienceId);
      }

      const educationOrder: string[] = [];
      for (const education of data.education) {
        const id = resolveEducation({
          school: education.school,
          degree: education.degree,
          field: education.field,
          startDate: education.startDate,
          endDate: education.endDate,
          description: education.description,
        });
        if (educationOrder.includes(id)) continue;
        db.collections.resumeEducationItem.insert({
          ...junctionFields(resumeId, educationOrder.length),
          educationId: id,
        });
        educationOrder.push(id);
      }

      const projectOrder: string[] = [];
      for (const project of data.projects) {
        const id = resolveProject(project);
        if (projectOrder.includes(id)) continue;
        db.collections.resumeProjectItem.insert({
          ...junctionFields(resumeId, projectOrder.length),
          projectId: id,
        });
        projectOrder.push(id);
      }

      const talkOrder: string[] = [];
      for (const talk of data.talks) {
        const id = resolveTalk(talk);
        if (talkOrder.includes(id)) continue;
        db.collections.resumeTalkItem.insert({
          ...junctionFields(resumeId, talkOrder.length),
          talkId: id,
        });
        talkOrder.push(id);
      }

      db.collections.resume.update(resumeId, (draft) => {
        draft.fullName = data.resume.fullName;
        draft.headline = data.resume.headline;
        draft.templateId = data.resume.templateId;
        draft.experienceOrder = experienceOrder;
        draft.educationOrder = educationOrder;
        draft.projectOrder = projectOrder;
        draft.talkOrder = talkOrder;
        draft.searchableText = joinSearchable(
          draft.name,
          data.resume.fullName,
          data.resume.headline,
          draft.description,
        );
        draft.updatedAt = ts;
      });
    },
  };
}
