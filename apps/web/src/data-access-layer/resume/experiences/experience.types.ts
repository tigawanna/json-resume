export interface ExperienceBulletDTO {
  id: string;
  text: string;
  sortOrder: number;
}

export interface ExperienceResumeUsageDTO {
  resumeId: string;
  resumeName: string;
  sortOrder: number;
}

export interface ExperienceListItemDTO {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  bullets: ExperienceBulletDTO[];
  resumeUsage: ExperienceResumeUsageDTO[];
}
