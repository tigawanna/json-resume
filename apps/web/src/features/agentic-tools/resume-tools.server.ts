import "@tanstack/react-start/server-only";

import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import {
  createResumeForUser,
  getResumeDetail,
  setExperienceBullets,
} from "@/data-access-layer/resume/resume.server";
import { db } from "@/lib/drizzle/client";
import {
  resume,
  resumeExperience,
  resumeExperienceBullet,
  resumeProject,
  resumeSkill,
  resumeSkillGroup,
  resumeSummary,
} from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gte, like, or, sql } from "drizzle-orm";
import {
  addExperienceBulletToolInputSchema,
  cloneResumeToolInputSchema,
  createResumeFromDocumentToolInputSchema,
  getResumeDocumentToolInputSchema,
  listResumesToolInputSchema,
  replaceExperienceBulletsToolInputSchema,
  searchResumeBlocksToolInputSchema,
  type AddExperienceBulletToolInput,
  type CloneResumeToolInput,
  type CreateResumeFromDocumentToolInput,
  type GetResumeDocumentToolInput,
  type ListResumesToolInput,
  type ReplaceExperienceBulletsToolInput,
  type ResumeBlockType,
  type SearchResumeBlocksToolInput,
} from "./resume-tool-schemas";

type ToolContext = {
  userId: string;
};

export type ResumeSearchBlock =
  | {
      type: "summary";
      id: string;
      resumeId: string;
      resumeName: string;
      text: string;
    }
  | {
      type: "experience";
      id: string;
      resumeId: string;
      resumeName: string;
      company: string;
      role: string;
      startDate: string;
      endDate: string;
      location: string;
    }
  | {
      type: "experience_bullet";
      id: string;
      experienceId: string;
      resumeId: string;
      resumeName: string;
      company: string;
      role: string;
      text: string;
      sortOrder: number;
    }
  | {
      type: "project";
      id: string;
      resumeId: string;
      resumeName: string;
      name: string;
      description: string;
      tech: string[];
      url: string;
      homepageUrl: string;
    }
  | {
      type: "skill";
      id: string;
      groupId: string;
      resumeId: string;
      resumeName: string;
      groupName: string;
      name: string;
    };

const defaultBlockTypes: ResumeBlockType[] = [
  "summary",
  "experience",
  "experience_bullet",
  "project",
  "skill",
];

function keywordPattern(keyword: string | undefined): string | undefined {
  return keyword ? `%${keyword}%` : undefined;
}

function parseJsonStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function assertUserOwnsExperience(userId: string, experienceId: string): Promise<void> {
  const rows = await db
    .select({ id: resumeExperience.id })
    .from(resumeExperience)
    .innerJoin(resume, eq(resumeExperience.resumeId, resume.id))
    .where(and(eq(resumeExperience.id, experienceId), eq(resume.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    throw new Error("Experience not found");
  }
}

export async function listResumesTool(ctx: ToolContext, input: ListResumesToolInput) {
  const data = listResumesToolInputSchema.parse(input);
  const conditions = [eq(resume.userId, ctx.userId)];
  const pattern = keywordPattern(data.keyword);

  if (pattern) {
    conditions.push(
      or(
        like(resume.name, pattern),
        like(resume.fullName, pattern),
        like(resume.headline, pattern),
        like(resume.description, pattern),
        like(resume.jobDescription, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resume.id,
      name: resume.name,
      fullName: resume.fullName,
      headline: resume.headline,
      description: resume.description,
      templateId: resume.templateId,
      updatedAt: resume.updatedAt,
    })
    .from(resume)
    .where(and(...conditions))
    .orderBy(desc(resume.updatedAt), desc(resume.id))
    .limit(data.limit);

  return {
    resumes: rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function getResumeDocumentTool(ctx: ToolContext, input: GetResumeDocumentToolInput) {
  const data = getResumeDocumentToolInputSchema.parse(input);
  const detail = await getResumeDetail(data.resumeId, ctx.userId);

  if (!detail) {
    throw new Error("Resume not found");
  }

  return {
    resume: {
      id: detail.id,
      name: detail.name,
      description: detail.description,
      jobDescription: detail.jobDescription,
      document: resumeDetailToDocument(detail),
      updatedAt: detail.updatedAt,
    },
  };
}

export async function searchResumeBlocksTool(ctx: ToolContext, input: SearchResumeBlocksToolInput) {
  const data = searchResumeBlocksToolInputSchema.parse(input);
  const blockTypes = data.blockTypes ?? defaultBlockTypes;
  const pattern = keywordPattern(data.keyword);
  const resumeScope = data.resumeId ? eq(resume.id, data.resumeId) : undefined;

  const summariesPromise = blockTypes.includes("summary")
    ? db
        .select({
          id: resumeSummary.id,
          resumeId: resume.id,
          resumeName: resume.name,
          text: resumeSummary.text,
        })
        .from(resumeSummary)
        .innerJoin(resume, eq(resumeSummary.resumeId, resume.id))
        .where(
          and(
            eq(resume.userId, ctx.userId),
            resumeScope,
            pattern ? like(resumeSummary.text, pattern) : undefined,
          ),
        )
        .orderBy(asc(resumeSummary.sortOrder), asc(resumeSummary.id))
        .limit(data.limitPerType)
    : Promise.resolve([]);

  const experiencesPromise = blockTypes.includes("experience")
    ? db
        .select({
          id: resumeExperience.id,
          resumeId: resume.id,
          resumeName: resume.name,
          company: resumeExperience.company,
          role: resumeExperience.role,
          startDate: resumeExperience.startDate,
          endDate: resumeExperience.endDate,
          location: resumeExperience.location,
        })
        .from(resumeExperience)
        .innerJoin(resume, eq(resumeExperience.resumeId, resume.id))
        .where(
          and(
            eq(resume.userId, ctx.userId),
            resumeScope,
            pattern
              ? or(
                  like(resumeExperience.company, pattern),
                  like(resumeExperience.role, pattern),
                  like(resumeExperience.location, pattern),
                )
              : undefined,
          ),
        )
        .orderBy(desc(resumeExperience.sortOrder), desc(resumeExperience.id))
        .limit(data.limitPerType)
    : Promise.resolve([]);

  const bulletsPromise = blockTypes.includes("experience_bullet")
    ? db
        .select({
          id: resumeExperienceBullet.id,
          experienceId: resumeExperience.id,
          resumeId: resume.id,
          resumeName: resume.name,
          company: resumeExperience.company,
          role: resumeExperience.role,
          text: resumeExperienceBullet.text,
          sortOrder: resumeExperienceBullet.sortOrder,
        })
        .from(resumeExperienceBullet)
        .innerJoin(resumeExperience, eq(resumeExperienceBullet.experienceId, resumeExperience.id))
        .innerJoin(resume, eq(resumeExperience.resumeId, resume.id))
        .where(
          and(
            eq(resume.userId, ctx.userId),
            resumeScope,
            pattern
              ? or(
                  like(resumeExperienceBullet.text, pattern),
                  like(resumeExperience.company, pattern),
                  like(resumeExperience.role, pattern),
                )
              : undefined,
          ),
        )
        .orderBy(desc(resumeExperience.sortOrder), asc(resumeExperienceBullet.sortOrder))
        .limit(data.limitPerType)
    : Promise.resolve([]);

  const projectsPromise = blockTypes.includes("project")
    ? db
        .select({
          id: resumeProject.id,
          resumeId: resume.id,
          resumeName: resume.name,
          name: resumeProject.name,
          description: resumeProject.description,
          tech: resumeProject.tech,
          url: resumeProject.url,
          homepageUrl: resumeProject.homepageUrl,
        })
        .from(resumeProject)
        .innerJoin(resume, eq(resumeProject.resumeId, resume.id))
        .where(
          and(
            eq(resume.userId, ctx.userId),
            resumeScope,
            pattern
              ? or(
                  like(resumeProject.name, pattern),
                  like(resumeProject.description, pattern),
                  like(resumeProject.tech, pattern),
                )
              : undefined,
          ),
        )
        .orderBy(asc(resumeProject.sortOrder), asc(resumeProject.id))
        .limit(data.limitPerType)
    : Promise.resolve([]);

  const skillsPromise = blockTypes.includes("skill")
    ? db
        .select({
          id: resumeSkill.id,
          groupId: resumeSkillGroup.id,
          resumeId: resume.id,
          resumeName: resume.name,
          groupName: resumeSkillGroup.name,
          name: resumeSkill.name,
        })
        .from(resumeSkill)
        .innerJoin(resumeSkillGroup, eq(resumeSkill.groupId, resumeSkillGroup.id))
        .innerJoin(resume, eq(resumeSkillGroup.resumeId, resume.id))
        .where(
          and(
            eq(resume.userId, ctx.userId),
            resumeScope,
            pattern
              ? or(like(resumeSkill.name, pattern), like(resumeSkillGroup.name, pattern))
              : undefined,
          ),
        )
        .orderBy(asc(resumeSkillGroup.sortOrder), asc(resumeSkill.sortOrder), asc(resumeSkill.id))
        .limit(data.limitPerType)
    : Promise.resolve([]);

  const [summaries, experiences, bullets, projects, skills] = await Promise.all([
    summariesPromise,
    experiencesPromise,
    bulletsPromise,
    projectsPromise,
    skillsPromise,
  ]);

  const blocks: ResumeSearchBlock[] = [
    ...summaries.map((row) => ({ type: "summary" as const, ...row })),
    ...experiences.map((row) => ({ type: "experience" as const, ...row })),
    ...bullets.map((row) => ({ type: "experience_bullet" as const, ...row })),
    ...projects.map((row) => ({
      type: "project" as const,
      ...row,
      tech: parseJsonStringArray(row.tech),
    })),
    ...skills.map((row) => ({ type: "skill" as const, ...row })),
  ];

  return { blocks };
}

export async function addExperienceBulletTool(
  ctx: ToolContext,
  input: AddExperienceBulletToolInput,
) {
  const data = addExperienceBulletToolInputSchema.parse(input);
  await assertUserOwnsExperience(ctx.userId, data.experienceId);

  let sortOrder: number;

  if (data.afterBulletId) {
    const rows = await db
      .select({ sortOrder: resumeExperienceBullet.sortOrder })
      .from(resumeExperienceBullet)
      .where(
        and(
          eq(resumeExperienceBullet.id, data.afterBulletId),
          eq(resumeExperienceBullet.experienceId, data.experienceId),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new Error("Anchor bullet not found");
    }

    sortOrder = rows[0]!.sortOrder + 1;
    await db
      .update(resumeExperienceBullet)
      .set({ sortOrder: sql`${resumeExperienceBullet.sortOrder} + 1` })
      .where(
        and(
          eq(resumeExperienceBullet.experienceId, data.experienceId),
          gte(resumeExperienceBullet.sortOrder, sortOrder),
        ),
      );
  } else {
    const rows = await db
      .select({ sortOrder: resumeExperienceBullet.sortOrder })
      .from(resumeExperienceBullet)
      .where(eq(resumeExperienceBullet.experienceId, data.experienceId))
      .orderBy(desc(resumeExperienceBullet.sortOrder))
      .limit(1);

    sortOrder = (rows[0]?.sortOrder ?? -1) + 1;
  }

  const id = crypto.randomUUID();
  await db.insert(resumeExperienceBullet).values({
    id,
    experienceId: data.experienceId,
    text: data.text,
    sortOrder,
  });

  return {
    bullet: {
      id,
      experienceId: data.experienceId,
      text: data.text,
      sortOrder,
    },
  };
}

export async function replaceExperienceBulletsTool(
  ctx: ToolContext,
  input: ReplaceExperienceBulletsToolInput,
) {
  const data = replaceExperienceBulletsToolInputSchema.parse(input);
  await assertUserOwnsExperience(ctx.userId, data.experienceId);
  await setExperienceBullets(data.experienceId, data.bullets);

  return {
    experienceId: data.experienceId,
    bulletCount: data.bullets.length,
  };
}

export async function createResumeFromDocumentTool(
  ctx: ToolContext,
  input: CreateResumeFromDocumentToolInput,
) {
  const data = createResumeFromDocumentToolInputSchema.parse(input);
  const resumeId = await createResumeForUser(ctx.userId, {
    name: data.name,
    description: data.description,
    jobDescription: data.jobDescription,
    doc: data.document,
  });

  return { resumeId };
}

export async function cloneResumeTool(ctx: ToolContext, input: CloneResumeToolInput) {
  const data = cloneResumeToolInputSchema.parse(input);
  const detail = await getResumeDetail(data.sourceResumeId, ctx.userId);

  if (!detail) {
    throw new Error("Source resume not found");
  }

  const name = data.name ?? `${detail.name} Copy`;
  const resumeId = await createResumeForUser(ctx.userId, {
    name,
    description: data.description ?? detail.description,
    jobDescription: data.jobDescription ?? detail.jobDescription,
    doc: resumeDetailToDocument(detail),
  });

  return {
    sourceResumeId: data.sourceResumeId,
    resumeId,
    name,
  };
}
