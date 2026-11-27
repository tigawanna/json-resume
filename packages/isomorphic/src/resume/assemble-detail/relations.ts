import type { ResumeLayout } from "../layout/schema.ts";
import { byId, mapPicked, pick } from "./helpers.ts";
import type { EventSourcedResumeSnapshots } from "./types.ts";

export function assembleExperiences({
  resumeId,
  layout,
  snapshots,
}: {
  resumeId: string;
  layout: ResumeLayout;
  snapshots: EventSourcedResumeSnapshots;
}) {
  const bullets = byId(snapshots.experienceBullets);
  return mapPicked({
    ids: layout.experiences.map((entry) => entry.id),
    rows: snapshots.experiences,
    map: (row, sortOrder) => ({
      id: row.id,
      resumeId,
      company: row.company,
      role: row.role,
      startDate: row.startDate,
      endDate: row.endDate,
      location: row.location,
      sortOrder,
      bullets: pick(
        layout.experiences.find((entry) => entry.id === row.id)?.bullets ?? [],
        bullets,
      ).map((bullet, bulletOrder) => ({
        id: bullet.id,
        experienceId: bullet.experienceId,
        text: bullet.text,
        sortOrder: bulletOrder,
      })),
    }),
  });
}

export function assembleEducation({
  resumeId,
  layout,
  snapshots,
}: {
  resumeId: string;
  layout: ResumeLayout;
  snapshots: EventSourcedResumeSnapshots;
}) {
  return mapPicked({
    ids: layout.education,
    rows: snapshots.education,
    map: (row, sortOrder) => ({
      id: row.id,
      resumeId,
      school: row.school,
      degree: row.degree,
      field: row.field,
      startDate: row.startDate,
      endDate: row.endDate,
      description: row.description,
      sortOrder,
      bullets: snapshots.educationBullets
        .filter((bullet) => bullet.educationId === row.id)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((bullet) => ({
          id: bullet.id,
          educationId: bullet.educationId,
          text: bullet.text,
          sortOrder: bullet.sortOrder,
        })),
    }),
  });
}

export function assembleSkillGroups({
  resumeId,
  layout,
  snapshots,
}: {
  resumeId: string;
  layout: ResumeLayout;
  snapshots: EventSourcedResumeSnapshots;
}) {
  const skills = byId(snapshots.skills);
  return mapPicked({
    ids: layout.skillGroups.map((entry) => entry.id),
    rows: snapshots.skillGroups,
    map: (row, sortOrder) => ({
      id: row.id,
      resumeId,
      name: row.name,
      sortOrder,
      skills: pick(
        layout.skillGroups.find((entry) => entry.id === row.id)?.skills ?? [],
        skills,
      ).map((skill, skillOrder) => ({
        id: skill.id,
        groupId: row.id,
        name: skill.name,
        level: skill.level ?? null,
        sortOrder: skillOrder,
      })),
    }),
  });
}
