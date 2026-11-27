import type { LibrarySection } from '@repo/isomorphic/agentic/tool-schemas/resume/library';
import type { DrizzleDB } from '../../database/database.module.js';
import { searchExperienceBullets } from './search-experience-bullets.js';
import {
  searchEducation,
  searchExperience,
  searchProjects,
  searchSummary,
} from './search-content.js';
import { searchSkills, searchTalks } from './search-talks-skills.js';
import type { PageRequest, SectionResult } from './search-types.js';

export async function searchLibrarySection({
  db,
  userId,
  section,
  request,
}: {
  db: DrizzleDB;
  userId: string;
  section: LibrarySection;
  request: PageRequest;
}): Promise<SectionResult> {
  const context = { db, userId, request };
  switch (section) {
    case 'summary':
      return searchSummary(context);
    case 'experience':
      return searchExperience(context);
    case 'experience_bullet':
      return searchExperienceBullets(context);
    case 'education':
      return searchEducation(context);
    case 'projects':
      return searchProjects(context);
    case 'talks':
      return searchTalks(context);
    case 'skills':
      return searchSkills(context);
  }
}
