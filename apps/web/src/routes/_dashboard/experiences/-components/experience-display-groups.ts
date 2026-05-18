import type {
  ExperienceBulletDTO,
  ExperienceListItemDTO,
} from "@/data-access-layer/resume/experiences/experience.types";

export interface ExperienceResumeSectionDTO {
  experienceId: string;
  resumeId: string;
  resumeName: string;
  sortOrder: number;
  bullets: ExperienceBulletDTO[];
}

export interface ExperienceDisplayGroupDTO {
  key: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
  sortOrder: number;
  updatedAt: string;
  resumeSections: ExperienceResumeSectionDTO[];
  experiences: ExperienceListItemDTO[];
}

export function getExperienceGroupKey(item: ExperienceListItemDTO): string {
  return item.id;
}

export function getPrimaryExperience(group: ExperienceDisplayGroupDTO): ExperienceListItemDTO {
  return group.experiences.reduce((best, current) =>
    current.sortOrder > best.sortOrder ? current : best,
  );
}

export function groupExperiences(items: ExperienceListItemDTO[]): ExperienceDisplayGroupDTO[] {
  const groupMap = new Map<string, ExperienceListItemDTO[]>();

  for (const item of items) {
    const key = getExperienceGroupKey(item);
    const existing = groupMap.get(key) ?? [];
    existing.push(item);
    groupMap.set(key, existing);
  }

  const firstIndex = new Map<string, number>();
  items.forEach((item, index) => {
    const key = getExperienceGroupKey(item);
    if (!firstIndex.has(key)) firstIndex.set(key, index);
  });

  const groups = Array.from(groupMap.entries()).map(([key, experiences]) => {
    const primary = experiences.reduce((best, current) =>
      current.sortOrder > best.sortOrder ? current : best,
    );
    const resumeSections: ExperienceResumeSectionDTO[] = [];

    for (const experience of experiences) {
      for (const usage of experience.resumeUsage) {
        resumeSections.push({
          experienceId: experience.id,
          resumeId: usage.resumeId,
          resumeName: usage.resumeName,
          sortOrder: usage.sortOrder,
          bullets: experience.bullets,
        });
      }
    }

    resumeSections.sort((a, b) => a.resumeName.localeCompare(b.resumeName));

    return {
      key,
      company: primary.company,
      role: primary.role,
      startDate: primary.startDate,
      endDate: primary.endDate,
      location: primary.location,
      sortOrder: Math.max(...experiences.map((experience) => experience.sortOrder)),
      updatedAt: experiences.reduce(
        (latest, current) => (current.updatedAt > latest ? current.updatedAt : latest),
        experiences[0].updatedAt,
      ),
      resumeSections,
      experiences,
    };
  });

  groups.sort((a, b) => (firstIndex.get(a.key) ?? 0) - (firstIndex.get(b.key) ?? 0));

  return groups;
}
