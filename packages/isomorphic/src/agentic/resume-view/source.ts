import type { JobStatusTool } from "../tool-schemas/resume/job.ts";

type SortedRow = { sortOrder: number };
type TextRow = SortedRow & { id: string; text: string };

export interface ResumeViewSource {
  id: string;
  name: string;
  description: string;
  templateId: string;
  updatedAt: string;
  jobId?: string | null;
  job: {
    id: string;
    company: string;
    title: string;
    status: JobStatusTool;
    location: string;
    payRate: string;
    url: string;
    description: string;
  } | null;
  fullName: string;
  headline: string;
  sections: ReadonlyArray<SortedRow & { key: string; enabled: boolean }>;
  contacts: ReadonlyArray<SortedRow & { id: string; type: string; value: string; label: string }>;
  links: ReadonlyArray<SortedRow & { id: string; label: string; url: string }>;
  summaries: ReadonlyArray<TextRow>;
  notes: ReadonlyArray<SortedRow & { id: string; label: string; text: string }>;
  experiences: ReadonlyArray<
    SortedRow & {
      id: string;
      company: string;
      role: string;
      startDate: string;
      endDate: string;
      location: string;
      bullets: ReadonlyArray<TextRow>;
    }
  >;
  education: ReadonlyArray<
    SortedRow & {
      id: string;
      school: string;
      degree: string;
      field: string;
      startDate: string;
      endDate: string;
      description: string;
      bullets: ReadonlyArray<TextRow>;
    }
  >;
  projects: ReadonlyArray<
    SortedRow & {
      id: string;
      name: string;
      description: string;
      tech: string;
      url: string;
      homepageUrl: string;
    }
  >;
  skillGroups: ReadonlyArray<
    SortedRow & {
      id: string;
      name: string;
      skills: ReadonlyArray<SortedRow & { id: string; name: string }>;
    }
  >;
  talks: ReadonlyArray<
    SortedRow & {
      id: string;
      title: string;
      event: string;
      date: string;
      description: string;
      links: string;
    }
  >;
}
