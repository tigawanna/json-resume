import { Inject, Injectable } from '@nestjs/common';
import { resume } from '@repo/db/postgres/schema/resume/resume';
import {
  assembleResumeDetail,
  resumeLayoutOf,
} from '@repo/isomorphic/resume/assemble-detail';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import { resumeColumns } from './resume-detail/columns.js';
import { loadLibraryRows } from './resume-detail/library-rows.js';
import { loadRelationRows } from './resume-detail/relation-rows.js';
import { toResumeSnapshot } from './resume-detail/snapshot.js';

@Injectable()
export class LegacyResumeDetailRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async get({ userId, id }: { userId: string; id: string }) {
    const [row] = await this.db
      .select(resumeColumns)
      .from(resume)
      .where(and(eq(resume.id, id), eq(resume.userId, userId)))
      .limit(1);
    if (!row) return null;

    const resumeSnapshot = toResumeSnapshot(row);
    const layout = resumeLayoutOf(resumeSnapshot);
    const [library, relations] = await Promise.all([
      loadLibraryRows({ db: this.db, userId, layout }),
      loadRelationRows({
        db: this.db,
        userId,
        layout,
        jobId: resumeSnapshot.jobId,
      }),
    ]);

    return assembleResumeDetail(id, {
      resume: resumeSnapshot,
      ...library,
      ...relations,
    });
  }
}
