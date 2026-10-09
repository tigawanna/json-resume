import { documentToInsertData } from "@/data-access-layer/resume/resume-converters";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import {
  addEntity,
  layoutIds,
  removeEntity,
  setEntities,
  setExperienceBullets,
  swapEntities,
  type LayoutEntityKey,
  type ResumeLayout,
} from "@/features/resume/resume-layout";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import type {
  AttachableLibraryKey,
  ContactDraft,
  EducationDraft,
  ExperienceDraft,
  LinkDraft,
  ProjectDraft,
  ResumeMetadataDraft,
  ResumeWorkspaceAdapter,
  SkillGroupDraft,
  TalkDraft,
  TargetJobDraft,
} from "@/components/resume/resume-workspace/resume-workspace-types";
import type { AppDb } from "./collection";
import type { EventSourcedResumeSnapshots } from "./assemble-resume-detail";
import { attachJobToResume, saveResumeTargetJob, searchJobs } from "./job-rows";
import {
  contactIndex,
  educationIndex,
  experienceIndex,
  libraryBulletIds,
  linkIndex,
  noteIndex,
  projectIndex,
  resolveBulletIds,
  resolveSkillGroup,
  resolveSkillIds,
  summaryIndex,
  talkIndex,
} from "./library-resolve";
import { currentLayout, editLayout } from "./resume-layout-rows";
import { joinSearchable, libraryRowBase, nowMs } from "@/routes/_dashboard/-utils/row-helpers";

function matchQuery(query: string, ...parts: Array<string | null | undefined>) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => (part ?? "").toLowerCase().includes(needle));
}

export function createEventSourcedResumeWorkspace(
  db: AppDb,
  detail: ResumeDetailDTO,
  snapshots: EventSourcedResumeSnapshots,
): ResumeWorkspaceAdapter {
  const resumeId = detail.id;
  const userId = detail.userId;

  function edit(change: (layout: ResumeLayout) => ResumeLayout) {
    editLayout(db, resumeId, change);
  }

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

  function contactIds(contacts: ContactDraft[]) {
    const index = contactIndex(db, userId);
    return contacts.map((contact) =>
      index.resolve({ type: contact.type, value: contact.value }, () => {
        const base = libraryRowBase(userId);
        db.collections.resumeContact.insert({
          ...base,
          type: contact.type,
          value: contact.value,
          label: contact.label,
          searchableText: joinSearchable(contact.type, contact.value, contact.label),
        });
        return base.id;
      }),
    );
  }

  function linkIds(links: LinkDraft[]) {
    const index = linkIndex(db, userId);
    return links.map((link) =>
      index.resolve({ url: link.url }, () => {
        const base = libraryRowBase(userId);
        db.collections.resumeLink.insert({
          ...base,
          label: link.label,
          url: link.url,
          icon: link.icon ?? null,
          searchableText: joinSearchable(link.label, link.url),
        });
        return base.id;
      }),
    );
  }

  function summaryIds(text: string) {
    if (!text.trim()) return [];
    return [
      summaryIndex(db, userId).resolve({ text }, () => {
        const base = libraryRowBase(userId);
        db.collections.resumeSummary.insert({ ...base, text, searchableText: text });
        return base.id;
      }),
    ];
  }

  function noteIds(values: { label: string; text: string }) {
    if (!values.text.trim()) return [];
    const label = values.label.trim() || "Notes";
    return [
      noteIndex(db, userId).resolve({ label, text: values.text }, () => {
        const base = libraryRowBase(userId);
        db.collections.resumeNote.insert({
          ...base,
          label,
          text: values.text,
          searchableText: joinSearchable(label, values.text),
        });
        return base.id;
      }),
    ];
  }

  /** Groups resolve by name; two drafts with the same name become one group with both skill lists. */
  function skillGroupEntries(groups: SkillGroupDraft[]): ResumeLayout["skillGroups"] {
    const skillsByGroup = new Map<string, string[]>();
    for (const group of groups) {
      const groupId = resolveSkillGroup(db, userId, group.name);
      const skillIds = resolveSkillIds(db, userId, group.items);
      const existing = skillsByGroup.get(groupId) ?? [];
      skillsByGroup.set(groupId, [...new Set([...existing, ...skillIds])]);
    }
    return [...skillsByGroup].map(([id, skills]) => ({ id, skills }));
  }

  /** Adds a library row to one list; a newly added experience starts with all its library bullets. */
  function addToLayout(key: LayoutEntityKey, id: string) {
    edit((layout) => {
      if (layoutIds(layout, key).includes(id)) return layout;
      return key === "experiences"
        ? setExperienceBullets(layout, id, libraryBulletIds(db, id))
        : addEntity(layout, key, id);
    });
  }

  return {
    mode: "local",
    resume: detail,
    searches: {
      jobs: async (query) =>
        searchJobs(snapshots.jobs, query).map((job) => ({
          id: job.id,
          company: job.company,
          title: job.title,
          description: job.description,
          url: job.url,
          location: job.location,
          status: job.status,
          updatedAt: job.updatedAt,
        })),
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
    },
    async attachJob(jobId: string | null) {
      attachJobToResume(db, resumeId, jobId);
    },
    async saveTargetJob(values: TargetJobDraft) {
      const job = saveResumeTargetJob(db, userId, resumeId, values);
      return { id: job.id };
    },
    async attachLibraryRows(key: AttachableLibraryKey, ids: string[]) {
      for (const id of ids) addToLayout(key, id);
    },
    async updateContacts(contacts: ContactDraft[]) {
      const ids = contactIds(contacts);
      edit((layout) => setEntities(layout, "contacts", ids));
    },
    async updateLinks(links: LinkDraft[]) {
      const ids = linkIds(links);
      edit((layout) => setEntities(layout, "links", ids));
    },
    async updateSummary(text: string) {
      const ids = summaryIds(text);
      edit((layout) => setEntities(layout, "summaries", ids));
    },
    async updateNotes(values: { label: string; text: string }) {
      const ids = noteIds(values);
      edit((layout) => setEntities(layout, "notes", ids));
    },
    async updateSkillGroups(groups: SkillGroupDraft[]) {
      const skillGroups = skillGroupEntries(groups);
      edit((layout) => ({ ...layout, skillGroups }));
    },
    async createExperience(values: ExperienceDraft) {
      const id = resolveExperience(values);
      addToLayout("experiences", id);
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
      edit((layout) => removeEntity(layout, "experiences", id));
    },
    async reorderExperience(idA: string, idB: string) {
      edit((layout) => swapEntities(layout, "experiences", idA, idB));
    },
    async updateExperienceBullets(experienceId: string, bullets: string[]) {
      const ids = resolveBulletIds(db, experienceId, bullets);
      edit((layout) => setExperienceBullets(layout, experienceId, ids));
    },
    async createEducation(values: EducationDraft) {
      const id = resolveEducation(values);
      addToLayout("education", id);
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
      edit((layout) => removeEntity(layout, "education", id));
    },
    async reorderEducation(idA: string, idB: string) {
      edit((layout) => swapEntities(layout, "education", idA, idB));
    },
    async createProject(values: ProjectDraft) {
      const id = resolveProject({ ...values, tech: JSON.stringify(values.tech) });
      addToLayout("projects", id);
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
      edit((layout) => removeEntity(layout, "projects", id));
    },
    async reorderProject(idA: string, idB: string) {
      edit((layout) => swapEntities(layout, "projects", idA, idB));
    },
    async createTalk(values: TalkDraft) {
      const id = resolveTalk({ ...values, links: JSON.stringify(values.links ?? []) });
      addToLayout("talks", id);
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
      edit((layout) => removeEntity(layout, "talks", id));
    },
    async reorderTalk(idA: string, idB: string) {
      edit((layout) => swapEntities(layout, "talks", idA, idB));
    },
    /**
     * Rewrites the résumé from a document by linking to existing library rows
     * wherever one matches, so a regenerated résumé adds only what is new.
     * The whole layout is written in one résumé update.
     */
    async replaceDocument(doc: ResumeDocumentV1) {
      const data = documentToInsertData(resumeId, userId, doc);
      const note = data.notes[0];

      const experiences: ResumeLayout["experiences"] = [];
      for (const experience of data.experiences) {
        const id = resolveExperience({
          company: experience.company,
          role: experience.role,
          startDate: experience.startDate,
          endDate: experience.endDate,
          location: experience.location,
        });
        if (experiences.some((entry) => entry.id === id)) continue;
        const bulletTexts = data.experienceBullets
          .filter((bullet) => bullet.experienceId === experience.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((bullet) => bullet.text);
        experiences.push({ id, bullets: resolveBulletIds(db, id, bulletTexts) });
      }

      const next: ResumeLayout = {
        ...currentLayout(db, resumeId),
        sections: data.sections
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((section) => ({ key: section.key, title: section.title, enabled: section.enabled })),
        contacts: [...new Set(contactIds(data.contacts))],
        links: [
          ...new Set(
            linkIds(
              data.links.map((link) => ({
                label: link.label,
                url: link.url,
                icon: link.icon ?? undefined,
              })),
            ),
          ),
        ],
        summaries: summaryIds(data.summaries[0]?.text ?? ""),
        notes: noteIds({ label: note?.label ?? "Notes", text: note?.text ?? "" }),
        skillGroups: skillGroupEntries(
          data.skillGroups.map((group) => ({
            name: group.name,
            items: data.skills
              .filter((skill) => skill.groupId === group.id)
              .map((skill) => skill.name),
          })),
        ),
        experiences,
        education: [
          ...new Set(
            data.education.map((education) =>
              resolveEducation({
                school: education.school,
                degree: education.degree,
                field: education.field,
                startDate: education.startDate,
                endDate: education.endDate,
                description: education.description,
              }),
            ),
          ),
        ],
        projects: [...new Set(data.projects.map((project) => resolveProject(project)))],
        talks: [...new Set(data.talks.map((talk) => resolveTalk(talk)))],
      };

      db.collections.resume.update(resumeId, (draft) => {
        draft.fullName = data.resume.fullName;
        draft.headline = data.resume.headline;
        draft.templateId = data.resume.templateId;
        draft.layout = next;
        draft.searchableText = joinSearchable(
          draft.name,
          data.resume.fullName,
          data.resume.headline,
          draft.description,
        );
        draft.updatedAt = nowMs();
      });
    },
  };
}
