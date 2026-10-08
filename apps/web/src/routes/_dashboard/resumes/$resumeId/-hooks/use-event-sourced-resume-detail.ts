import {
  assembleResumeDetail,
  type EventSourcedResumeSnapshots,
} from "@/data-access-layer/event-sourced/assemble-resume-detail";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { eq, useLiveQuery } from "@tanstack/react-db";

function asRows<T>(data: T[] | undefined) {
  return data ?? [];
}

export function useEventSourcedResumeDetail(resumeId: string) {
  const db = useEventSourcedDb();

  const resumeQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resume }).where(({ row }) => eq(row.id, resumeId)),
    [resumeId],
  );
  const contactsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeContact }), []);
  const linksQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeLink }), []);
  const summariesQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeSummary }), []);
  const notesQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeNote }), []);
  const experiencesQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeExperience }),
    [],
  );
  const experienceBulletsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeExperienceBullet }),
    [],
  );
  const educationQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeEducation }), []);
  const educationBulletsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeEducationBullet }),
    [],
  );
  const projectsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeProject }), []);
  const skillGroupsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeSkillGroup }),
    [],
  );
  const skillsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeSkill }), []);
  const talksQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeTalk }), []);
  const certificationsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeCertification }),
    [],
  );
  const volunteersQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeVolunteer }), []);
  const languagesQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeLanguage }), []);
  const jobsQuery = useLiveQuery((q) => q.from({ row: db.collections.job }), []);

  const snapshots: EventSourcedResumeSnapshots = {
    resume: resumeQuery.data?.[0],
    contacts: asRows(contactsQuery.data),
    links: asRows(linksQuery.data),
    summaries: asRows(summariesQuery.data),
    notes: asRows(notesQuery.data),
    experiences: asRows(experiencesQuery.data),
    experienceBullets: asRows(experienceBulletsQuery.data),
    education: asRows(educationQuery.data),
    educationBullets: asRows(educationBulletsQuery.data),
    projects: asRows(projectsQuery.data),
    skillGroups: asRows(skillGroupsQuery.data),
    skills: asRows(skillsQuery.data),
    talks: asRows(talksQuery.data),
    certifications: asRows(certificationsQuery.data),
    volunteers: asRows(volunteersQuery.data),
    languages: asRows(languagesQuery.data),
    jobs: asRows(jobsQuery.data),
  };

  return {
    db,
    snapshots,
    detail: assembleResumeDetail(resumeId, snapshots),
    isLoading: resumeQuery.isLoading,
  };
}
