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
  const sectionsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeSection }), []);
  const contactsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeContact }), []);
  const contactItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeContactItem }),
    [],
  );
  const linksQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeLink }), []);
  const linkItemsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeLinkItem }), []);
  const summariesQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeSummary }), []);
  const summaryItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeSummaryItem }),
    [],
  );
  const notesQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeNote }), []);
  const noteItemsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeNoteItem }), []);
  const experiencesQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeExperience }),
    [],
  );
  const experienceItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeExperienceItem }),
    [],
  );
  const experienceBulletsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeExperienceBullet }),
    [],
  );
  const experienceBulletItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeExperienceBulletItem }),
    [],
  );
  const educationQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeEducation }), []);
  const educationItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeEducationItem }),
    [],
  );
  const educationBulletsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeEducationBullet }),
    [],
  );
  const projectsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeProject }), []);
  const projectItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeProjectItem }),
    [],
  );
  const skillGroupsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeSkillGroup }),
    [],
  );
  const skillGroupItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeSkillGroupItem }),
    [],
  );
  const skillsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeSkill }), []);
  const skillGroupSkillsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeSkillGroupSkill }),
    [],
  );
  const talksQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeTalk }), []);
  const talkItemsQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeTalkItem }), []);
  const certificationsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeCertification }),
    [],
  );
  const certificationItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeCertificationItem }),
    [],
  );
  const volunteersQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeVolunteer }), []);
  const volunteerItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeVolunteerItem }),
    [],
  );
  const languagesQuery = useLiveQuery((q) => q.from({ row: db.collections.resumeLanguage }), []);
  const languageItemsQuery = useLiveQuery(
    (q) => q.from({ row: db.collections.resumeLanguageItem }),
    [],
  );
  const jobsQuery = useLiveQuery((q) => q.from({ row: db.collections.job }), []);

  const snapshots: EventSourcedResumeSnapshots = {
    resume: resumeQuery.data?.[0],
    sections: asRows(sectionsQuery.data),
    contacts: asRows(contactsQuery.data),
    contactItems: asRows(contactItemsQuery.data),
    links: asRows(linksQuery.data),
    linkItems: asRows(linkItemsQuery.data),
    summaries: asRows(summariesQuery.data),
    summaryItems: asRows(summaryItemsQuery.data),
    notes: asRows(notesQuery.data),
    noteItems: asRows(noteItemsQuery.data),
    experiences: asRows(experiencesQuery.data),
    experienceItems: asRows(experienceItemsQuery.data),
    experienceBullets: asRows(experienceBulletsQuery.data),
    experienceBulletItems: asRows(experienceBulletItemsQuery.data),
    education: asRows(educationQuery.data),
    educationItems: asRows(educationItemsQuery.data),
    educationBullets: asRows(educationBulletsQuery.data),
    projects: asRows(projectsQuery.data),
    projectItems: asRows(projectItemsQuery.data),
    skillGroups: asRows(skillGroupsQuery.data),
    skillGroupItems: asRows(skillGroupItemsQuery.data),
    skills: asRows(skillsQuery.data),
    skillGroupSkills: asRows(skillGroupSkillsQuery.data),
    talks: asRows(talksQuery.data),
    talkItems: asRows(talkItemsQuery.data),
    certifications: asRows(certificationsQuery.data),
    certificationItems: asRows(certificationItemsQuery.data),
    volunteers: asRows(volunteersQuery.data),
    volunteerItems: asRows(volunteerItemsQuery.data),
    languages: asRows(languagesQuery.data),
    languageItems: asRows(languageItemsQuery.data),
    jobs: asRows(jobsQuery.data),
  };

  return {
    db,
    snapshots,
    detail: assembleResumeDetail(resumeId, snapshots),
    isLoading: resumeQuery.isLoading,
  };
}
