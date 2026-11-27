import type { PaginatedResult } from "@repo/isomorphic/pagination";
import "@/services/nest/client";
import { legacyImportLibraryControllerListCertifications } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListCertifications";
import { legacyImportLibraryControllerListContacts } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListContacts";
import { legacyImportLibraryControllerListEducation } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListEducation";
import { legacyImportLibraryControllerListExperiences } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListExperiences";
import { legacyImportLibraryControllerListLanguages } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListLanguages";
import { legacyImportLibraryControllerListLinks } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListLinks";
import { legacyImportLibraryControllerListProjects } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListProjects";
import { legacyImportLibraryControllerListSkillGroups } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListSkillGroups";
import { legacyImportLibraryControllerListSummaries } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListSummaries";
import { legacyImportLibraryControllerListTalks } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListTalks";
import { legacyImportLibraryControllerListVolunteers } from "@/services/nest/generated/clients/legacyImport/legacyImportLibraryControllerListVolunteers";
import { legacyImportResumeControllerGetResume } from "@/services/nest/generated/clients/legacyImport/legacyImportResumeControllerGetResume";
import { legacyImportResumeControllerListResumes } from "@/services/nest/generated/clients/legacyImport/legacyImportResumeControllerListResumes";

export type LegacyListInput = {
  keyword?: string;
  cursor?: string;
  direction?: "after" | "before";
};

type LegacyListCall = { data?: LegacyListInput };
type LegacyResumeListCall = { data?: { id?: string; keyword?: string } };

type GeneratedPage<T> = {
  items: T[];
  nextCursor?: string;
  previousCursor?: string;
};

async function toCursorPage<T>({ page }: { page: GeneratedPage<T> }): Promise<PaginatedResult<T>> {
  return {
    items: page.items,
    nextCursor: page.nextCursor,
    previousCursor: page.previousCursor,
  };
}

export async function listTalks(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListTalks({ query: input.data }),
  });
}

export async function listLinks(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListLinks({ query: input.data }),
  });
}

export async function listResumeProjects(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListProjects({ query: input.data }),
  });
}

export async function listCertifications(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListCertifications({ query: input.data }),
  });
}

export async function listLanguages(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListLanguages({ query: input.data }),
  });
}

export async function listSkillGroups(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListSkillGroups({ query: input.data }),
  });
}

export async function listExperiences(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListExperiences({ query: input.data }),
  });
}

export async function listEducation(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListEducation({ query: input.data }),
  });
}

export async function listVolunteers(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListVolunteers({ query: input.data }),
  });
}

export async function listContacts(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListContacts({ query: input.data }),
  });
}

export async function listSummaries(input: LegacyListCall = {}) {
  return toCursorPage({
    page: await legacyImportLibraryControllerListSummaries({ query: input.data }),
  });
}

export async function listResumes(input: LegacyResumeListCall = {}) {
  return legacyImportResumeControllerListResumes({ query: input.data });
}

export async function getResume({ data }: { data: { id: string } }) {
  const detail = await legacyImportResumeControllerGetResume({ path: { id: data.id } });
  return detail || null;
}
