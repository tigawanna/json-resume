import type { ResumeLayout } from "../layout/schema.ts";
import { mapPicked } from "./helpers.ts";
import type { EventSourcedResumeSnapshots } from "./types.ts";

export function assembleFlatRows({
  resumeId,
  layout,
  snapshots,
}: {
  resumeId: string;
  layout: ResumeLayout;
  snapshots: EventSourcedResumeSnapshots;
}) {
  return {
    contacts: mapPicked({
      ids: layout.contacts,
      rows: snapshots.contacts,
      map: (row, sortOrder) => ({
        id: row.id,
        resumeId,
        type: row.type,
        value: row.value,
        label: row.label,
        sortOrder,
      }),
    }),
    links: mapPicked({
      ids: layout.links,
      rows: snapshots.links,
      map: (row, sortOrder) => ({
        id: row.id,
        resumeId,
        label: row.label,
        url: row.url,
        icon: row.icon ?? null,
        sortOrder,
      }),
    }),
    summaries: mapPicked({
      ids: layout.summaries,
      rows: snapshots.summaries,
      map: (row, sortOrder) => ({ id: row.id, resumeId, text: row.text, sortOrder }),
    }),
    notes: mapPicked({
      ids: layout.notes,
      rows: snapshots.notes,
      map: (row, sortOrder) => ({
        id: row.id,
        resumeId,
        label: row.label,
        text: row.text,
        sortOrder,
      }),
    }),
    projects: mapPicked({
      ids: layout.projects,
      rows: snapshots.projects,
      map: (row, sortOrder) => ({
        id: row.id,
        resumeId,
        name: row.name,
        url: row.url,
        homepageUrl: row.homepageUrl,
        description: row.description,
        tech: row.tech,
        sortOrder,
      }),
    }),
    talks: mapPicked({
      ids: layout.talks,
      rows: snapshots.talks,
      map: (row, sortOrder) => ({
        id: row.id,
        resumeId,
        title: row.title,
        event: row.event,
        date: row.date,
        description: row.description,
        links: row.links,
        sortOrder,
      }),
    }),
    certifications: mapPicked({
      ids: layout.certifications,
      rows: snapshots.certifications,
      map: (row, sortOrder) => ({
        id: row.id,
        resumeId,
        name: row.name,
        issuer: row.issuer,
        date: row.date,
        url: row.url,
        sortOrder,
      }),
    }),
    volunteers: mapPicked({
      ids: layout.volunteers,
      rows: snapshots.volunteers,
      map: (row, sortOrder) => ({
        id: row.id,
        resumeId,
        organization: row.organization,
        role: row.role,
        startDate: row.startDate,
        endDate: row.endDate,
        description: row.description,
        sortOrder,
      }),
    }),
    languages: mapPicked({
      ids: layout.languages,
      rows: snapshots.languages,
      map: (row, sortOrder) => ({
        id: row.id,
        resumeId,
        name: row.name,
        proficiency: row.proficiency,
        sortOrder,
      }),
    }),
  };
}
