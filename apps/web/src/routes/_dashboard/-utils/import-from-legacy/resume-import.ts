import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import {
  libraryBulletIds,
  resolveSkillIds,
} from "@/data-access-layer/event-sourced/library-resolve";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { emptyResumeLayout, FLAT_LAYOUT_KEYS, setEntities } from "@/features/resume/resume-layout";
import { normalizeTitle } from "../find-existing";
import { joinSearchable, nowMs } from "../row-helpers";

type SeedCtx = {
  db: AppDb;
  userId: string;
};

type Identified = { id: string };

type VirtualRowKeys = "$synced" | "$origin" | "$key" | "$collectionId";

function clearCollection(collection: {
  toArray: readonly Identified[];
  delete: (id: string) => void;
}) {
  for (const row of collection.toArray.slice()) {
    collection.delete(row.id);
  }
}

/** Drop local résumés (and with them their layouts) so a re-import starts clean. */
export function purgeLocalResumes(db: AppDb) {
  clearCollection(db.collections.resume);
}

function resolveId<T extends Identified>(
  collection: { toArray: readonly T[]; insert: (row: T) => void },
  match: (row: T) => boolean,
  preferredId: string,
  build: (id: string) => Omit<T, VirtualRowKeys>,
): { id: string; created: boolean } {
  const byIdentity = collection.toArray.find(match);
  if (byIdentity) return { id: byIdentity.id, created: false };
  const byId = collection.toArray.find((row) => row.id === preferredId);
  if (byId) return { id: byId.id, created: false };
  collection.insert(build(preferredId) as T);
  return { id: preferredId, created: true };
}

function titleMatch(left: string, right: string) {
  return normalizeTitle(left) === normalizeTitle(right);
}

function bySortOrder<T extends { sortOrder: number }>(rows: readonly T[]): T[] {
  return rows.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

function libraryMeta(userId: string, searchableText: string, sortOrder: number) {
  const ts = nowMs();
  return {
    userId,
    sortOrder,
    searchableText,
    embedding: null as number[] | null,
    embeddingModel: null as string | null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function attachResumeDetail(ctx: SeedCtx, detail: ResumeDetailDTO) {
  const { db, userId } = ctx;
  const resumeId = detail.id;
  const ts = nowMs();
  const layout = emptyResumeLayout();
  if (detail.sections.length > 0) {
    layout.sections = bySortOrder(detail.sections).map((section) => ({
      key: section.key,
      title: section.title,
      enabled: section.enabled,
    }));
  }

  for (const item of bySortOrder(detail.experiences)) {
    const title = `${item.role} @ ${item.company}`;
    const { id: experienceId, created } = resolveId(
      db.collections.resumeExperience,
      (row) => titleMatch(`${row.role} @ ${row.company}`, title),
      item.id,
      (id) => ({
        id,
        company: item.company,
        role: item.role,
        startDate: item.startDate,
        endDate: item.endDate,
        location: item.location,
        ...libraryMeta(
          userId,
          joinSearchable(item.role, item.company, item.location, item.startDate, item.endDate),
          item.sortOrder,
        ),
      }),
    );
    if (created) {
      for (const bullet of item.bullets ?? []) {
        db.collections.resumeExperienceBullet.insert({
          id: bullet.id,
          experienceId,
          text: bullet.text,
          sortOrder: bullet.sortOrder,
          searchableText: bullet.text,
          embedding: null,
          embeddingModel: null,
          createdAt: ts,
          updatedAt: ts,
        });
      }
    }
    if (!layout.experiences.some((entry) => entry.id === experienceId)) {
      layout.experiences.push({ id: experienceId, bullets: libraryBulletIds(db, experienceId) });
    }
  }

  for (const item of bySortOrder(detail.education)) {
    const title = `${item.school} ${item.degree}`;
    const { id: educationId, created } = resolveId(
      db.collections.resumeEducation,
      (row) => titleMatch(`${row.school} ${row.degree}`, title),
      item.id,
      (id) => ({
        id,
        school: item.school,
        degree: item.degree,
        field: item.field,
        startDate: item.startDate,
        endDate: item.endDate,
        description: item.description,
        ...libraryMeta(
          userId,
          joinSearchable(item.school, item.degree, item.field),
          item.sortOrder,
        ),
      }),
    );
    if (created) {
      for (const bullet of item.bullets ?? []) {
        db.collections.resumeEducationBullet.insert({
          id: bullet.id,
          educationId,
          text: bullet.text,
          sortOrder: bullet.sortOrder,
          searchableText: bullet.text,
          embedding: null,
          embeddingModel: null,
          createdAt: ts,
          updatedAt: ts,
        });
      }
    }
    layout.education.push(educationId);
  }

  for (const item of bySortOrder(detail.projects)) {
    const { id: projectId } = resolveId(
      db.collections.resumeProject,
      (row) => titleMatch(row.name, item.name),
      item.id,
      (id) => ({
        id,
        name: item.name,
        url: item.url,
        homepageUrl: item.homepageUrl,
        description: item.description,
        tech: item.tech,
        ...libraryMeta(
          userId,
          joinSearchable(item.name, item.description, item.url),
          item.sortOrder,
        ),
      }),
    );
    layout.projects.push(projectId);
  }

  for (const item of bySortOrder(detail.talks)) {
    const { id: talkId } = resolveId(
      db.collections.resumeTalk,
      (row) => titleMatch(row.title, item.title),
      item.id,
      (id) => ({
        id,
        title: item.title,
        event: item.event,
        date: item.date,
        description: item.description,
        links: item.links || "[]",
        ...libraryMeta(
          userId,
          joinSearchable(item.title, item.event, item.date, item.description),
          item.sortOrder,
        ),
      }),
    );
    layout.talks.push(talkId);
  }

  for (const item of bySortOrder(detail.skillGroups)) {
    const { id: groupId } = resolveId(
      db.collections.resumeSkillGroup,
      (row) => titleMatch(row.name, item.name),
      item.id,
      (id) => ({
        id,
        name: item.name,
        ...libraryMeta(
          userId,
          joinSearchable(item.name, ...item.skills.map((skill) => skill.name)),
          item.sortOrder,
        ),
      }),
    );
    const skillIds = resolveSkillIds(
      db,
      userId,
      bySortOrder(item.skills).map((skill) => skill.name),
    );
    const existing = layout.skillGroups.find((entry) => entry.id === groupId);
    if (existing) existing.skills = [...new Set([...existing.skills, ...skillIds])];
    else layout.skillGroups.push({ id: groupId, skills: skillIds });
  }

  for (const item of bySortOrder(detail.contacts)) {
    const title = `${item.type} ${item.value}`;
    const { id: contactId } = resolveId(
      db.collections.resumeContact,
      (row) => titleMatch(`${row.type} ${row.value}`, title),
      item.id,
      (id) => ({
        id,
        type: item.type,
        value: item.value,
        label: item.label,
        ...libraryMeta(userId, joinSearchable(item.type, item.value, item.label), item.sortOrder),
      }),
    );
    layout.contacts.push(contactId);
  }

  for (const item of bySortOrder(detail.links)) {
    const { id: linkId } = resolveId(
      db.collections.resumeLink,
      (row) => titleMatch(row.url, item.url) || titleMatch(row.label, item.label),
      item.id,
      (id) => ({
        id,
        label: item.label,
        url: item.url,
        icon: item.icon,
        ...libraryMeta(userId, joinSearchable(item.label, item.url, item.icon), item.sortOrder),
      }),
    );
    layout.links.push(linkId);
  }

  for (const item of bySortOrder(detail.summaries)) {
    const { id: summaryId } = resolveId(
      db.collections.resumeSummary,
      (row) => titleMatch(row.text, item.text),
      item.id,
      (id) => ({
        id,
        text: item.text,
        ...libraryMeta(userId, joinSearchable(item.text), item.sortOrder),
      }),
    );
    layout.summaries.push(summaryId);
  }

  for (const item of bySortOrder(detail.notes)) {
    const { id: noteId } = resolveId(
      db.collections.resumeNote,
      (row) => titleMatch(row.text, item.text),
      item.id,
      (id) => ({
        id,
        label: item.label,
        text: item.text,
        ...libraryMeta(userId, joinSearchable(item.label, item.text), item.sortOrder),
      }),
    );
    layout.notes.push(noteId);
  }

  for (const item of bySortOrder(detail.certifications)) {
    const title = `${item.name} ${item.issuer}`;
    const { id: certificationId } = resolveId(
      db.collections.resumeCertification,
      (row) => titleMatch(`${row.name} ${row.issuer}`, title),
      item.id,
      (id) => ({
        id,
        name: item.name,
        issuer: item.issuer,
        date: item.date,
        url: item.url,
        ...libraryMeta(userId, joinSearchable(item.name, item.issuer, item.date), item.sortOrder),
      }),
    );
    layout.certifications.push(certificationId);
  }

  for (const item of bySortOrder(detail.volunteers)) {
    const title = `${item.role} @ ${item.organization}`;
    const { id: volunteerId } = resolveId(
      db.collections.resumeVolunteer,
      (row) => titleMatch(`${row.role} @ ${row.organization}`, title),
      item.id,
      (id) => ({
        id,
        organization: item.organization,
        role: item.role,
        startDate: item.startDate,
        endDate: item.endDate,
        description: item.description,
        ...libraryMeta(
          userId,
          joinSearchable(item.organization, item.role, item.description),
          item.sortOrder,
        ),
      }),
    );
    layout.volunteers.push(volunteerId);
  }

  for (const item of bySortOrder(detail.languages)) {
    const { id: languageId } = resolveId(
      db.collections.resumeLanguage,
      (row) => titleMatch(row.name, item.name),
      item.id,
      (id) => ({
        id,
        name: item.name,
        proficiency: item.proficiency,
        ...libraryMeta(userId, joinSearchable(item.name, item.proficiency), item.sortOrder),
      }),
    );
    layout.languages.push(languageId);
  }

  const next = FLAT_LAYOUT_KEYS.reduce(
    (current, key) => setEntities(current, key, current[key]),
    layout,
  );
  db.collections.resume.update(resumeId, (draft) => {
    draft.layout = next;
    draft.updatedAt = nowMs();
  });
}

export function insertImportedResume(ctx: SeedCtx, detail: ResumeDetailDTO) {
  const tsCreated = Date.parse(detail.createdAt);
  const tsUpdated = Date.parse(detail.updatedAt);
  ctx.db.collections.resume.insert({
    id: detail.id,
    userId: ctx.userId,
    name: detail.name,
    fullName: detail.fullName,
    headline: detail.headline,
    description: detail.description,
    jobDescription: detail.jobDescription,
    jobId: null,
    templateId: detail.templateId || "default",
    layout: emptyResumeLayout(),
    searchableText: joinSearchable(
      detail.name,
      detail.fullName,
      detail.headline,
      detail.description,
    ),
    embedding: null,
    embeddingModel: null,
    createdAt: Number.isNaN(tsCreated) ? nowMs() : tsCreated,
    updatedAt: Number.isNaN(tsUpdated) ? nowMs() : tsUpdated,
  });
}
