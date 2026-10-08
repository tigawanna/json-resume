import {
  LAYOUT_ENTITY_KEYS,
  resumeLayoutSchema,
  type LayoutEntityKey,
} from "@/features/resume/resume-layout";
import {
  planLayoutMigration,
  type LegacyLink,
  type LegacyLinkData,
} from "@/modules/admin/layout-migration";

type Row = Record<string, unknown>;

/** The link collections that said which library rows a résumé showed before `resume.layout`. */
const LEGACY_LINKS: Record<
  LayoutEntityKey,
  { collectionId: string; field: string; library: string }
> = {
  experiences: {
    collectionId: "resumeExperienceItem",
    field: "experienceId",
    library: "resumeExperience",
  },
  skillGroups: {
    collectionId: "resumeSkillGroupItem",
    field: "groupId",
    library: "resumeSkillGroup",
  },
  education: {
    collectionId: "resumeEducationItem",
    field: "educationId",
    library: "resumeEducation",
  },
  projects: { collectionId: "resumeProjectItem", field: "projectId", library: "resumeProject" },
  talks: { collectionId: "resumeTalkItem", field: "talkId", library: "resumeTalk" },
  contacts: { collectionId: "resumeContactItem", field: "contactId", library: "resumeContact" },
  links: { collectionId: "resumeLinkItem", field: "linkId", library: "resumeLink" },
  summaries: { collectionId: "resumeSummaryItem", field: "summaryId", library: "resumeSummary" },
  notes: { collectionId: "resumeNoteItem", field: "noteId", library: "resumeNote" },
  certifications: {
    collectionId: "resumeCertificationItem",
    field: "certificationId",
    library: "resumeCertification",
  },
  volunteers: {
    collectionId: "resumeVolunteerItem",
    field: "volunteerId",
    library: "resumeVolunteer",
  },
  languages: { collectionId: "resumeLanguageItem", field: "languageId", library: "resumeLanguage" },
};

const LEGACY_COLLECTION_IDS = new Set([
  ...Object.values(LEGACY_LINKS).map((link) => link.collectionId),
  "resumeSection",
  "resumeExperienceBulletItem",
  "resumeSkillGroupSkill",
]);

export function isLegacyCollectionId(collectionId: string): boolean {
  return LEGACY_COLLECTION_IDS.has(collectionId);
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function linkRows(rows: ReadonlyArray<Row>, field: string): LegacyLink[] {
  return rows.flatMap((row) => {
    const resumeId = text(row.resumeId);
    const entityId = text(row[field]);
    return resumeId && entityId ? [{ resumeId, entityId, sortOrder: num(row.sortOrder) }] : [];
  });
}

function legacyLinkData(collections: Record<string, ReadonlyArray<Row>>): LegacyLinkData {
  const rowsOf = (collectionId: string) => collections[collectionId] ?? [];
  const links = new Map<LayoutEntityKey, LegacyLink[]>();
  const existing = new Map<LayoutEntityKey, Set<string>>();
  for (const key of LAYOUT_ENTITY_KEYS) {
    const link = LEGACY_LINKS[key];
    links.set(key, linkRows(rowsOf(link.collectionId), link.field));
    existing.set(key, new Set(rowsOf(link.library).flatMap((row) => text(row.id) ?? [])));
  }

  return {
    resumes: rowsOf("resume").flatMap((row) => {
      const id = text(row.id);
      const userId = text(row.userId);
      if (!id || !userId) return [];
      const parsed = resumeLayoutSchema.safeParse(row.layout);
      return [{ id, userId, layout: row.layout != null && parsed.success ? parsed.data : null }];
    }),
    sections: rowsOf("resumeSection").flatMap((row) => {
      const resumeId = text(row.resumeId);
      const key = text(row.key);
      if (!resumeId || !key) return [];
      return [
        {
          resumeId,
          key,
          title: text(row.title) ?? key,
          enabled: row.enabled !== false && row.enabled !== 0,
          sortOrder: num(row.sortOrder),
        },
      ];
    }),
    links,
    existing,
    bullets: rowsOf("resumeExperienceBullet").flatMap((row) => {
      const id = text(row.id);
      const experienceId = text(row.experienceId);
      return id && experienceId ? [{ id, experienceId, sortOrder: num(row.sortOrder) }] : [];
    }),
    bulletLinks: linkRows(rowsOf("resumeExperienceBulletItem"), "bulletId"),
    skills: rowsOf("resumeSkill").flatMap((row) => {
      const id = text(row.id);
      return id ? [{ id, groupId: text(row.groupId), sortOrder: num(row.sortOrder) }] : [];
    }),
    groupSkills: rowsOf("resumeSkillGroupSkill").flatMap((row) => {
      const groupId = text(row.groupId);
      const skillId = text(row.skillId);
      return groupId && skillId ? [{ groupId, skillId, sortOrder: num(row.sortOrder) }] : [];
    }),
    groups: rowsOf("resumeSkillGroup").flatMap((row) => {
      const id = text(row.id);
      if (!id) return [];
      return [
        { id, userId: text(row.userId), name: text(row.name) ?? "", updatedAt: num(row.updatedAt) },
      ];
    }),
  };
}

/**
 * A backup snapshot from before `resume.layout`: link rows become each
 * résumé's layout, same-named skill groups merge, and the link collections
 * are dropped.
 */
export function upgradeLegacySnapshot(
  collections: Record<string, ReadonlyArray<Row>>,
): Record<string, Row[]> {
  const plan = planLayoutMigration(legacyLinkData(collections));
  const mergedAway = new Set(plan.groupMerges.map((merge) => merge.from));
  const out: Record<string, Row[]> = {};
  for (const [collectionId, rows] of Object.entries(collections)) {
    if (isLegacyCollectionId(collectionId)) continue;
    if (collectionId === "resume") {
      out[collectionId] = rows.map((row) => {
        const layout = typeof row.id === "string" ? plan.layouts.get(row.id) : undefined;
        return layout ? { ...row, layout } : { ...row };
      });
    } else if (collectionId === "resumeSkillGroup") {
      out[collectionId] = rows.filter((row) => !mergedAway.has(String(row.id)));
    } else {
      out[collectionId] = [...rows];
    }
  }
  return out;
}
