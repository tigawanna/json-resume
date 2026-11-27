import { resumeLayoutSchema } from '@repo/isomorphic/resume/layout';
import { jobStatusSchema } from '@repo/isomorphic/resume/rows';
import type {
  JobSnapshot,
  ResumeSnapshot,
} from '@repo/isomorphic/resume/assemble-detail';
import type { job } from '@repo/db/postgres/schema/job-schema';
import type { resume } from '@repo/db/postgres/schema/resume/resume';

export function toSnapshotRow<T extends { createdAt: Date; updatedAt: Date }>({
  row,
}: {
  row: T;
}) {
  const { createdAt, updatedAt, ...fields } = row;
  return {
    ...fields,
    createdAt: createdAt.getTime(),
    updatedAt: updatedAt.getTime(),
  };
}

type ResumeRow = Pick<
  typeof resume.$inferSelect,
  | 'id'
  | 'userId'
  | 'name'
  | 'fullName'
  | 'headline'
  | 'description'
  | 'jobId'
  | 'templateId'
  | 'layout'
  | 'searchableText'
  | 'createdAt'
  | 'updatedAt'
>;

type JobRow = Pick<
  typeof job.$inferSelect,
  | 'id'
  | 'company'
  | 'title'
  | 'description'
  | 'url'
  | 'location'
  | 'payRate'
  | 'hourlyMinCents'
  | 'hourlyMaxCents'
  | 'payBasis'
  | 'status'
  | 'notes'
  | 'appliedAt'
  | 'searchableText'
  | 'createdAt'
  | 'updatedAt'
>;

export function toResumeSnapshot(row: ResumeRow): ResumeSnapshot {
  return {
    ...toSnapshotRow({ row }),
    layout: row.layout === null ? null : resumeLayoutSchema.parse(row.layout),
  };
}

export function toJobSnapshot(row: JobRow): JobSnapshot {
  return {
    ...toSnapshotRow({ row }),
    status: jobStatusSchema.parse(row.status),
    appliedAt: row.appliedAt?.getTime() ?? null,
  };
}
