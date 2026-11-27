import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { resumeDocumentV1Schema } from '@repo/isomorphic/resume/schema';
import { publicResume } from '@repo/db/postgres/schema/resume/public-resume';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import type {
  PublicResumeListQueryDto,
  PublishPublicResumeDto,
  PublicResumeDto,
  PublicResumeListItemDto,
} from './public-resume.dto.js';

const headline = sql<string>`coalesce(${publicResume.document} #>> '{header,headline}', '')`;

function toDto(row: typeof publicResume.$inferSelect): PublicResumeDto {
  return {
    id: row.id,
    sourceResumeId: row.sourceResumeId,
    title: row.title,
    document: resumeDocumentV1Schema.parse(row.document),
    publishedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PublicResumeService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getById({ id }: { id: string }) {
    const [row] = await this.db
      .select()
      .from(publicResume)
      .where(eq(publicResume.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Public résumé not found');
    return toDto(row);
  }

  async getMine({
    userId,
    sourceResumeId,
  }: {
    userId: string;
    sourceResumeId: string;
  }) {
    const [row] = await this.db
      .select()
      .from(publicResume)
      .where(
        and(
          eq(publicResume.userId, userId),
          eq(publicResume.sourceResumeId, sourceResumeId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Public résumé not found');
    return toDto(row);
  }

  async list({
    userId,
    query,
  }: {
    userId: string;
    query: PublicResumeListQueryDto;
  }) {
    const keyword = query.keyword?.trim();
    const keywordCondition = keyword
      ? or(
          ilike(publicResume.title, `%${keyword}%`),
          ilike(publicResume.sourceResumeId, `%${keyword}%`),
          ilike(publicResume.id, `%${keyword}%`),
          ilike(headline, `%${keyword}%`),
        )
      : undefined;
    const where = keywordCondition
      ? and(eq(publicResume.userId, userId), keywordCondition)
      : eq(publicResume.userId, userId);

    const [[totals], rows] = await Promise.all([
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(publicResume)
        .where(where),
      this.db
        .select({
          id: publicResume.id,
          sourceResumeId: publicResume.sourceResumeId,
          title: publicResume.title,
          headline,
          createdAt: publicResume.createdAt,
          updatedAt: publicResume.updatedAt,
        })
        .from(publicResume)
        .where(where)
        .orderBy(desc(publicResume.updatedAt))
        .limit(query.limit)
        .offset(query.offset),
    ]);

    return {
      total: totals?.total ?? 0,
      items: rows.map((row) => this.toListItem(row)),
    };
  }

  async publish({
    userId,
    body,
  }: {
    userId: string;
    body: PublishPublicResumeDto;
  }) {
    const [row] = await this.db
      .insert(publicResume)
      .values({
        userId,
        sourceResumeId: body.sourceResumeId,
        title: body.title,
        document: body.document,
      })
      .onConflictDoUpdate({
        target: [publicResume.userId, publicResume.sourceResumeId],
        set: {
          title: body.title,
          document: body.document,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) throw new Error('Failed to publish résumé');
    return toDto(row);
  }

  async rename({
    userId,
    id,
    title,
  }: {
    userId: string;
    id: string;
    title: string;
  }) {
    const [row] = await this.db
      .update(publicResume)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(publicResume.userId, userId), eq(publicResume.id, id)))
      .returning({
        id: publicResume.id,
        sourceResumeId: publicResume.sourceResumeId,
        title: publicResume.title,
        headline,
        createdAt: publicResume.createdAt,
        updatedAt: publicResume.updatedAt,
      });
    if (!row) throw new NotFoundException('Public résumé not found');
    return this.toListItem(row);
  }

  async unpublishBySource({
    userId,
    sourceResumeId,
  }: {
    userId: string;
    sourceResumeId: string;
  }) {
    const deleted = await this.db
      .delete(publicResume)
      .where(
        and(
          eq(publicResume.userId, userId),
          eq(publicResume.sourceResumeId, sourceResumeId),
        ),
      )
      .returning({ id: publicResume.id });
    return { success: deleted.length > 0 };
  }

  async unpublishById({ userId, id }: { userId: string; id: string }) {
    const deleted = await this.db
      .delete(publicResume)
      .where(and(eq(publicResume.userId, userId), eq(publicResume.id, id)))
      .returning({ id: publicResume.id });
    return { success: deleted.length > 0 };
  }

  private toListItem(row: {
    id: string;
    sourceResumeId: string;
    title: string;
    headline: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PublicResumeListItemDto {
    return {
      id: row.id,
      sourceResumeId: row.sourceResumeId,
      title: row.title,
      headline: row.headline ?? '',
      publishedAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
