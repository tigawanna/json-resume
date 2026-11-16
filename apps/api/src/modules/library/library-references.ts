/**
 * Children that cannot outlive their parent because their foreign key is
 * required (bullets belong to one experience). Résumés point at library rows
 * through `resume.layout`, so nothing else is deleted along with a row; a
 * layout id whose row is gone is skipped when the résumé renders.
 */
export type ReferenceRow = { collectionId: string; field: string };

export const ownedChildren: Record<string, readonly ReferenceRow[]> = {
  resumeExperience: [{ collectionId: "resumeExperienceBullet", field: "experienceId" }],
  resumeEducation: [{ collectionId: "resumeEducationBullet", field: "educationId" }],
};

/** Every row to delete along with `parentId`, children first. */
export function rowsToDeleteWith(
  collectionId: string,
  parentId: string,
  rowsOf: (collectionId: string) => ReadonlyArray<Record<string, unknown>>,
): Array<{ collectionId: string; id: string }> {
  const out: Array<{ collectionId: string; id: string }> = [];
  for (const owned of ownedChildren[collectionId] ?? []) {
    for (const row of rowsOf(owned.collectionId)) {
      if (row[owned.field] !== parentId || typeof row.id !== "string") continue;
      out.push(...rowsToDeleteWith(owned.collectionId, row.id, rowsOf));
      out.push({ collectionId: owned.collectionId, id: row.id });
    }
  }
  return out;
}
