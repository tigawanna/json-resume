/**
 * Rows that only exist to point a parent at something. Deleting the parent
 * deletes these and nothing else, so shared entities (skills, experiences,
 * contacts, …) survive the résumé or group that referenced them.
 *
 * `owned` lists children that cannot outlive the parent because their
 * foreign key is required (bullets belong to one experience).
 */
export type ReferenceRow = { collectionId: string; field: string };

type ParentRule = { references: readonly ReferenceRow[]; owned?: readonly ReferenceRow[] };

/** Everything a résumé points at; deleting and cloning a résumé both walk this list. */
export const resumeJoins = [
  { collectionId: "resumeSection", field: "resumeId" },
  { collectionId: "resumeContactItem", field: "resumeId" },
  { collectionId: "resumeLinkItem", field: "resumeId" },
  { collectionId: "resumeSummaryItem", field: "resumeId" },
  { collectionId: "resumeNoteItem", field: "resumeId" },
  { collectionId: "resumeExperienceItem", field: "resumeId" },
  { collectionId: "resumeExperienceBulletItem", field: "resumeId" },
  { collectionId: "resumeEducationItem", field: "resumeId" },
  { collectionId: "resumeProjectItem", field: "resumeId" },
  { collectionId: "resumeSkillGroupItem", field: "resumeId" },
  { collectionId: "resumeTalkItem", field: "resumeId" },
  { collectionId: "resumeCertificationItem", field: "resumeId" },
  { collectionId: "resumeVolunteerItem", field: "resumeId" },
  { collectionId: "resumeLanguageItem", field: "resumeId" },
] as const satisfies readonly ReferenceRow[];

export type ResumeJoinCollectionId = (typeof resumeJoins)[number]["collectionId"];

export const parentRules: Record<string, ParentRule> = {
  resume: { references: resumeJoins },
  resumeExperience: {
    references: [{ collectionId: "resumeExperienceItem", field: "experienceId" }],
    owned: [{ collectionId: "resumeExperienceBullet", field: "experienceId" }],
  },
  resumeExperienceBullet: {
    references: [{ collectionId: "resumeExperienceBulletItem", field: "bulletId" }],
  },
  resumeEducation: {
    references: [{ collectionId: "resumeEducationItem", field: "educationId" }],
    owned: [{ collectionId: "resumeEducationBullet", field: "educationId" }],
  },
  resumeSkillGroup: {
    references: [
      { collectionId: "resumeSkillGroupItem", field: "groupId" },
      { collectionId: "resumeSkillGroupSkill", field: "groupId" },
    ],
  },
  resumeSkill: { references: [{ collectionId: "resumeSkillGroupSkill", field: "skillId" }] },
  resumeContact: { references: [{ collectionId: "resumeContactItem", field: "contactId" }] },
  resumeLink: { references: [{ collectionId: "resumeLinkItem", field: "linkId" }] },
  resumeSummary: { references: [{ collectionId: "resumeSummaryItem", field: "summaryId" }] },
  resumeNote: { references: [{ collectionId: "resumeNoteItem", field: "noteId" }] },
  resumeProject: { references: [{ collectionId: "resumeProjectItem", field: "projectId" }] },
  resumeTalk: { references: [{ collectionId: "resumeTalkItem", field: "talkId" }] },
  resumeCertification: {
    references: [{ collectionId: "resumeCertificationItem", field: "certificationId" }],
  },
  resumeVolunteer: {
    references: [{ collectionId: "resumeVolunteerItem", field: "volunteerId" }],
  },
  resumeLanguage: { references: [{ collectionId: "resumeLanguageItem", field: "languageId" }] },
};

/**
 * Every row to delete along with `parentId`, children first. Owned children
 * bring their own references (a bullet's résumé links go with the bullet).
 */
export function rowsToDeleteWith(
  collectionId: string,
  parentId: string,
  rowsOf: (collectionId: string) => ReadonlyArray<Record<string, unknown>>,
): Array<{ collectionId: string; id: string }> {
  const rule = parentRules[collectionId];
  if (!rule) return [];
  const out: Array<{ collectionId: string; id: string }> = [];
  for (const owned of rule.owned ?? []) {
    for (const row of rowsOf(owned.collectionId)) {
      if (row[owned.field] !== parentId || typeof row.id !== "string") continue;
      out.push(...rowsToDeleteWith(owned.collectionId, row.id, rowsOf));
      out.push({ collectionId: owned.collectionId, id: row.id });
    }
  }
  for (const reference of rule.references) {
    for (const row of rowsOf(reference.collectionId)) {
      if (row[reference.field] === parentId && typeof row.id === "string") {
        out.push({ collectionId: reference.collectionId, id: row.id });
      }
    }
  }
  return out;
}
