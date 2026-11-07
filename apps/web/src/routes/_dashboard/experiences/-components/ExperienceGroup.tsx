import type { ResumeExperience } from "@/data-access-layer/event-sourced/schemas";

export type ExperienceGroupData = {
  key: string;
  company: string;
  startDate: string;
  endDate: string;
  titles: ResumeExperience[];
  /** First title's id — stable row id for testids and detail link when the group has one title. */
  groupId: string;
};
