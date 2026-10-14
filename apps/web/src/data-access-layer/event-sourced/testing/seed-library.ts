import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";
import { libraryKeys, type LibraryCollectionId } from "@/modules/library/library-keys";
import { ownedChildren } from "@/modules/library/library-references";
import type { AppDb } from "../collection";
import type {
  ResumeCertification,
  ResumeContact,
  ResumeEducation,
  ResumeEducationBullet,
  ResumeExperience,
  ResumeExperienceBullet,
  ResumeLanguage,
  ResumeLink,
  ResumeNote,
  ResumeProject,
  ResumeSkill,
  ResumeSkillGroup,
  ResumeSummary,
  ResumeTalk,
  ResumeVolunteer,
} from "../schemas";

export const SEED_RESUME_ID = "resume-seed";

const base = {
  userId: "u1" as string | null,
  searchableText: "",
  embedding: null,
  embeddingModel: null,
  createdAt: 1,
  updatedAt: 1,
};

const childBase = {
  searchableText: "",
  embedding: null,
  embeddingModel: null,
  createdAt: 1,
  updatedAt: 1,
};

/** One unique row per index, so seeded rows are not duplicates of each other. */
const rowFor = {
  resumeExperience: (i): ResumeExperience => ({
    id: `resumeExperience-${i}`,
    company: `Company ${i}`,
    role: "Engineer",
    startDate: "2020",
    endDate: "",
    location: "",
    sortOrder: i,
    ...base,
  }),
  resumeEducation: (i): ResumeEducation => ({
    id: `resumeEducation-${i}`,
    school: `School ${i}`,
    degree: "BSc",
    field: "CS",
    startDate: "2016",
    endDate: "2020",
    description: "",
    sortOrder: i,
    ...base,
  }),
  resumeProject: (i): ResumeProject => ({
    id: `resumeProject-${i}`,
    name: `Project ${i}`,
    url: `https://example.com/${i}`,
    homepageUrl: "",
    description: "",
    tech: "[]",
    sortOrder: i,
    ...base,
  }),
  resumeTalk: (i): ResumeTalk => ({
    id: `resumeTalk-${i}`,
    title: `Talk ${i}`,
    event: `Event ${i}`,
    date: "2024",
    description: "",
    links: "[]",
    sortOrder: i,
    ...base,
  }),
  resumeContact: (i): ResumeContact => ({
    id: `resumeContact-${i}`,
    type: "email",
    value: `person${i}@example.com`,
    label: "",
    sortOrder: i,
    ...base,
  }),
  resumeLink: (i): ResumeLink => ({
    id: `resumeLink-${i}`,
    label: `Link ${i}`,
    url: `https://example.com/link/${i}`,
    icon: null,
    sortOrder: i,
    ...base,
  }),
  resumeSummary: (i): ResumeSummary => ({
    id: `resumeSummary-${i}`,
    text: `Summary ${i}`,
    sortOrder: i,
    ...base,
  }),
  resumeNote: (i): ResumeNote => ({
    id: `resumeNote-${i}`,
    label: `Note ${i}`,
    text: `Body ${i}`,
    sortOrder: i,
    ...base,
  }),
  resumeLanguage: (i): ResumeLanguage => ({
    id: `resumeLanguage-${i}`,
    name: `Language ${i}`,
    proficiency: "fluent",
    sortOrder: i,
    ...base,
  }),
  resumeCertification: (i): ResumeCertification => ({
    id: `resumeCertification-${i}`,
    name: `Cert ${i}`,
    issuer: `Issuer ${i}`,
    date: "2024",
    url: "",
    sortOrder: i,
    ...base,
  }),
  resumeVolunteer: (i): ResumeVolunteer => ({
    id: `resumeVolunteer-${i}`,
    organization: `Org ${i}`,
    role: "Helper",
    startDate: "2021",
    endDate: "",
    description: "",
    sortOrder: i,
    ...base,
  }),
  resumeSkill: (i): ResumeSkill => ({
    id: `resumeSkill-${i}`,
    name: `Skill ${i}`,
    level: null,
    sortOrder: i,
    ...base,
  }),
  resumeSkillGroup: (i): ResumeSkillGroup => ({
    id: `resumeSkillGroup-${i}`,
    name: `Group ${i}`,
    sortOrder: i,
    ...base,
  }),
  resumeExperienceBullet: (): ResumeExperienceBullet => {
    throw new Error("experience bullets are inserted under their experience");
  },
} satisfies Record<LibraryCollectionId, (i: number) => object>;

const layoutList: Partial<Record<LibraryCollectionId, keyof ResumeLayout>> = {
  resumeEducation: "education",
  resumeProject: "projects",
  resumeTalk: "talks",
  resumeContact: "contacts",
  resumeLink: "links",
  resumeSummary: "summaries",
  resumeNote: "notes",
  resumeCertification: "certifications",
  resumeVolunteer: "volunteers",
  resumeLanguage: "languages",
};

const OWNED_CHILD_IDS = new Set(
  Object.values(ownedChildren).flatMap((children) => children.map((child) => child.collectionId)),
);

export type SeedLibraryOptions = {
  /** Seed only these collections. Defaults to every library collection. */
  include?: readonly LibraryCollectionId[];
  /** Drop these collections from the set being seeded. */
  exclude?: readonly (LibraryCollectionId | "resumeEducationBullet")[];
  /** Rows inserted into each chosen collection that is not an owned child. */
  count?: number;
  /** Bullets created under each experience or education row. */
  childrenPerParent?: number;
};

/** Stable ids so a child row and the résumé layout can point at the same parent. */
function ids(collectionId: string, count: number) {
  return Array.from({ length: count }, (_, i) => `${collectionId}-${i}`);
}

/** `include` (or every library collection) minus `exclude`. */
function chosen(options: SeedLibraryOptions): LibraryCollectionId[] {
  const include = options.include ?? (Object.keys(libraryKeys) as LibraryCollectionId[]);
  const exclude = new Set(options.exclude ?? []);
  return include.filter((id) => !exclude.has(id));
}

/** Adds the parent collection when a bullet collection was requested on its own. */
function parentsOf(selected: readonly LibraryCollectionId[]): LibraryCollectionId[] {
  const ids = new Set(selected);
  for (const [parent, children] of Object.entries(ownedChildren)) {
    if (children.some((child) => ids.has(child.collectionId as LibraryCollectionId))) {
      ids.add(parent as LibraryCollectionId);
    }
  }
  return [...ids];
}

function rowsOf<T>(count: number, build: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => build(index));
}

/** Each collection's `insert` has its own row type, so this stays a switch. */
function insertParents(db: AppDb, selected: readonly LibraryCollectionId[], count: number) {
  for (const id of selected) {
    if (OWNED_CHILD_IDS.has(id)) continue;
    switch (id) {
      case "resumeExperience":
        db.collections.resumeExperience.insert(rowsOf(count, rowFor.resumeExperience));
        break;
      case "resumeEducation":
        db.collections.resumeEducation.insert(rowsOf(count, rowFor.resumeEducation));
        break;
      case "resumeProject":
        db.collections.resumeProject.insert(rowsOf(count, rowFor.resumeProject));
        break;
      case "resumeTalk":
        db.collections.resumeTalk.insert(rowsOf(count, rowFor.resumeTalk));
        break;
      case "resumeContact":
        db.collections.resumeContact.insert(rowsOf(count, rowFor.resumeContact));
        break;
      case "resumeLink":
        db.collections.resumeLink.insert(rowsOf(count, rowFor.resumeLink));
        break;
      case "resumeSummary":
        db.collections.resumeSummary.insert(rowsOf(count, rowFor.resumeSummary));
        break;
      case "resumeNote":
        db.collections.resumeNote.insert(rowsOf(count, rowFor.resumeNote));
        break;
      case "resumeLanguage":
        db.collections.resumeLanguage.insert(rowsOf(count, rowFor.resumeLanguage));
        break;
      case "resumeCertification":
        db.collections.resumeCertification.insert(rowsOf(count, rowFor.resumeCertification));
        break;
      case "resumeVolunteer":
        db.collections.resumeVolunteer.insert(rowsOf(count, rowFor.resumeVolunteer));
        break;
      case "resumeSkill":
        db.collections.resumeSkill.insert(rowsOf(count, rowFor.resumeSkill));
        break;
      case "resumeSkillGroup":
        db.collections.resumeSkillGroup.insert(rowsOf(count, rowFor.resumeSkillGroup));
        break;
      case "resumeExperienceBullet":
        break;
      default: {
        const unreachable: never = id;
        return unreachable;
      }
    }
  }
}

/** Bulk-inserts library rows, nests owned children under their parents, and points one résumé layout at them. */
export function seedLibrary(db: AppDb, options: SeedLibraryOptions = {}) {
  const count = options.count ?? 1;
  const childrenPerParent = options.childrenPerParent ?? 1;
  const excluded = new Set(options.exclude ?? []);
  const selected = parentsOf(chosen(options)).filter((id) => !excluded.has(id));
  const selectedSet = new Set(selected);

  // Parents only; bullets are inserted underneath them below.
  insertParents(db, selected, count);

  // `childrenPerParent` bullets per experience, each `experienceId` set to that parent.
  const experienceBullets: string[][] = [];
  if (selectedSet.has("resumeExperience") && !excluded.has("resumeExperienceBullet")) {
    const rows: ResumeExperienceBullet[] = [];
    for (let parent = 0; parent < count; parent++) {
      const bulletIds: string[] = [];
      for (let child = 0; child < childrenPerParent; child++) {
        const id = `resumeExperienceBullet-${parent}-${child}`;
        bulletIds.push(id);
        rows.push({
          id,
          experienceId: `resumeExperience-${parent}`,
          text: `Bullet ${parent}.${child}`,
          sortOrder: child,
          ...childBase,
        });
      }
      experienceBullets.push(bulletIds);
    }
    if (rows.length > 0) db.collections.resumeExperienceBullet.insert(rows);
  }

  // Same nesting for education; these bullets are not listed in the layout.
  if (selectedSet.has("resumeEducation") && !excluded.has("resumeEducationBullet")) {
    const rows: ResumeEducationBullet[] = [];
    for (let parent = 0; parent < count; parent++) {
      for (let child = 0; child < childrenPerParent; child++) {
        rows.push({
          id: `resumeEducationBullet-${parent}-${child}`,
          educationId: `resumeEducation-${parent}`,
          text: `Bullet ${parent}.${child}`,
          sortOrder: child,
          ...childBase,
        });
      }
    }
    if (rows.length > 0) db.collections.resumeEducationBullet.insert(rows);
  }

  // One résumé whose layout points at every seeded row, with bullets nested under experiences.
  const layout = emptyResumeLayout();
  if (selectedSet.has("resumeExperience")) {
    layout.experiences = ids("resumeExperience", count).map((id, parent) => ({
      id,
      bullets: experienceBullets[parent] ?? [],
    }));
  }
  // Each skill group in the layout holds the skill with the same index.
  if (selectedSet.has("resumeSkillGroup")) {
    const skills = selectedSet.has("resumeSkill") ? ids("resumeSkill", count) : [];
    layout.skillGroups = ids("resumeSkillGroup", count).map((id, parent) => ({
      id,
      skills: skills[parent] ? [skills[parent]] : [],
    }));
  }
  // Flat layout lists (projects, contacts, …) get the ids of that collection.
  for (const id of selected) {
    const list = layoutList[id];
    if (!list || !Array.isArray(layout[list])) continue;
    Object.assign(layout, { [list]: ids(id, count) });
  }

  db.collections.resume.insert({
    id: SEED_RESUME_ID,
    userId: "u1",
    name: "Seed",
    fullName: "Ada",
    headline: "",
    description: "",
    jobId: null,
    templateId: "classic",
    layout,
    searchableText: "",
    embedding: null,
    embeddingModel: null,
    createdAt: 1,
    updatedAt: 1,
  });
}
