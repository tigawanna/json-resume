import "@tanstack/react-start/server-only";

import { getResumeDetail } from "@/data-access-layer/resume/resume.server";
import { emptyResumeLayout, resumeLayoutSchema } from "@/features/resume/resume-layout";
import { db } from "@/lib/drizzle/client";
import {
  job,
  resume,
  resumeExperience,
  resumeExperienceBullet,
  resumeProject,
  resumeSkill,
  resumeSkillGroup,
  resumeSummary,
} from "@/lib/drizzle/scheam";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { resumeView } from "./shared/resume-view";
import { nextOffset, searchTerms } from "./shared/search-page";
import {
  getResumeToolInputSchema,
  listResumesToolInputSchema,
  searchResumeBlocksToolInputSchema,
  type GetResumeToolInput,
  type GetResumeToolOutput,
  type ListResumesToolInput,
  type ListResumesToolOutput,
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

const REUSABLE: Usage = { resumeId: "", resumeName: "Reusable item" };

type Usage = { resumeId: string; resumeName: string };

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

/** Which résumé (most recently updated first) uses each library id, read from layouts. */
async function layoutUsage(userId: string, resumeId: string | undefined) {
  const rows = await db
    .select({ id: resume.id, name: resume.name, layout: resume.layout })
    .from(resume)
    .where(and(eq(resume.userId, userId), resumeId ? eq(resume.id, resumeId) : undefined))
    .orderBy(desc(resume.updatedAt));

  const byId = new Map<string, Usage>();
  const skillPairs: Array<Usage & { groupId: string; skillId: string }> = [];
  const note = (id: string, usage: Usage) => {
    if (!byId.has(id)) byId.set(id, usage);
  };

  for (const row of rows) {
    const parsed = resumeLayoutSchema.safeParse(row.layout);
    const layout = parsed.success ? parsed.data : emptyResumeLayout();
    const usage = { resumeId: row.id, resumeName: row.name };
    for (const id of layout.summaries) note(id, usage);
    for (const id of layout.projects) note(id, usage);
    for (const entry of layout.experiences) {
      note(entry.id, usage);
      for (const bullet of entry.bullets) note(bullet, usage);
    }
    for (const entry of layout.skillGroups) {
      for (const skillId of entry.skills) skillPairs.push({ ...usage, groupId: entry.id, skillId });
    }
  }
  return { byId, skillPairs };
}

export async function listResumesTool(
  ctx: ToolContext,
  input: ListResumesToolInput,
): Promise<ListResumesToolOutput> {
  const data = listResumesToolInputSchema.parse(input);
  const conditions = [eq(resume.userId, ctx.userId)];

  for (const term of searchTerms(data.keyword)) {
    const pattern = `%${term}%`;
    conditions.push(
      or(
        like(resume.name, pattern),
        like(resume.fullName, pattern),
        like(resume.headline, pattern),
        like(resume.description, pattern),
        like(job.description, pattern),
        like(job.company, pattern),
        like(job.title, pattern),
      )!,
    );
  }

  const where = and(...conditions);
  const jobJoin = and(eq(job.id, resume.jobId), eq(job.userId, ctx.userId));

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: resume.id,
        name: resume.name,
        fullName: resume.fullName,
        headline: resume.headline,
        description: resume.description,
        templateId: resume.templateId,
        updatedAt: resume.updatedAt,
        jobId: job.id,
        jobCompany: job.company,
        jobTitle: job.title,
        jobDescriptionStart: sql<string | null>`substr(${job.description}, 1, 240)`,
      })
      .from(resume)
      .leftJoin(job, jobJoin)
      .where(where)
      .orderBy(desc(resume.updatedAt), desc(resume.id))
      .limit(data.limit)
      .offset(data.offset),
    db.select({ total: count() }).from(resume).leftJoin(job, jobJoin).where(where),
  ]);

  return {
    resumes: rows.map(({ jobId, jobCompany, jobTitle, jobDescriptionStart, ...row }) => ({
      ...row,
      jobId,
      jobLabel: jobId
        ? jobListLabel({
            company: jobCompany ?? "",
            title: jobTitle ?? "",
            description: jobDescriptionStart ?? "",
          })
        : "",
      updatedAt: row.updatedAt.toISOString(),
    })),
    total,
    nextOffset: nextOffset(total, data.offset, rows.length),
  };
}

/** Remote callers have no active résumé, so `resumeId` is required here even though the schema allows omitting it. */
export async function getResumeTool(
  ctx: ToolContext,
  input: GetResumeToolInput,
): Promise<GetResumeToolOutput> {
  const data = getResumeToolInputSchema.parse(input);
  if (!data.resumeId) {
    throw new Error("resumeId is required. Call list_resumes to find it.");
  }
  const detail = await getResumeDetail(data.resumeId, ctx.userId);
  if (!detail) {
    throw new Error("Resume not found");
  }
  return { resume: resumeView(detail, data.sections) };
}

/**
 * Library rows matching the keyword, labelled with the résumé that uses them.
 * With `resumeId`, only rows that résumé's layout shows; otherwise unused rows
 * come back as "Reusable item".
 */
export async function searchResumeBlocksTool(ctx: ToolContext, input: SearchResumeBlocksToolInput) {
  const data = searchResumeBlocksToolInputSchema.parse(input);
  const blockTypes = data.blockTypes ?? defaultBlockTypes;
  const pattern = keywordPattern(data.keyword);
  const resumeId = data.resumeId || undefined;
  const scoped = resumeId !== undefined;
  const { byId, skillPairs } = await layoutUsage(ctx.userId, resumeId);

  function labelled<T extends { id: string }>(rows: T[]): Array<T & Usage> {
    return rows
      .flatMap((row) => {
        const usage = byId.get(row.id);
        if (usage) return [{ ...row, ...usage }];
        return scoped ? [] : [{ ...row, ...REUSABLE }];
      })
      .slice(0, data.limitPerType);
  }

  const summariesPromise = blockTypes.includes("summary")
    ? db
        .select({ id: resumeSummary.id, text: resumeSummary.text })
        .from(resumeSummary)
        .where(
          and(
            eq(resumeSummary.userId, ctx.userId),
            pattern ? like(resumeSummary.text, pattern) : undefined,
          ),
        )
        .orderBy(asc(resumeSummary.sortOrder), asc(resumeSummary.id))
    : Promise.resolve([]);

  const experiencesPromise = blockTypes.includes("experience")
    ? db
        .select({
          id: resumeExperience.id,
          company: resumeExperience.company,
          role: resumeExperience.role,
          startDate: resumeExperience.startDate,
          endDate: resumeExperience.endDate,
          location: resumeExperience.location,
        })
        .from(resumeExperience)
        .where(
          and(
            eq(resumeExperience.userId, ctx.userId),
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
    : Promise.resolve([]);

  const bulletsPromise = blockTypes.includes("experience_bullet")
    ? db
        .select({
          id: resumeExperienceBullet.id,
          experienceId: resumeExperience.id,
          company: resumeExperience.company,
          role: resumeExperience.role,
          text: resumeExperienceBullet.text,
          sortOrder: resumeExperienceBullet.sortOrder,
        })
        .from(resumeExperienceBullet)
        .innerJoin(resumeExperience, eq(resumeExperienceBullet.experienceId, resumeExperience.id))
        .where(
          and(
            eq(resumeExperience.userId, ctx.userId),
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
    : Promise.resolve([]);

  const projectsPromise = blockTypes.includes("project")
    ? db
        .select({
          id: resumeProject.id,
          name: resumeProject.name,
          description: resumeProject.description,
          tech: resumeProject.tech,
          url: resumeProject.url,
          homepageUrl: resumeProject.homepageUrl,
        })
        .from(resumeProject)
        .where(
          and(
            eq(resumeProject.userId, ctx.userId),
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
    : Promise.resolve([]);

  const skillRowsPromise = blockTypes.includes("skill")
    ? Promise.all([
        db
          .select({ id: resumeSkill.id, name: resumeSkill.name })
          .from(resumeSkill)
          .where(eq(resumeSkill.userId, ctx.userId))
          .orderBy(asc(resumeSkill.sortOrder), asc(resumeSkill.id)),
        db
          .select({ id: resumeSkillGroup.id, name: resumeSkillGroup.name })
          .from(resumeSkillGroup)
          .where(eq(resumeSkillGroup.userId, ctx.userId)),
      ])
    : Promise.resolve(null);

  const [summaries, experiences, bullets, projects, skillRows] = await Promise.all([
    summariesPromise,
    experiencesPromise,
    bulletsPromise,
    projectsPromise,
    skillRowsPromise,
  ]);

  const blocks: ResumeSearchBlock[] = [
    ...labelled(summaries).map((row) => ({ type: "summary" as const, ...row })),
    ...labelled(experiences).map((row) => ({ type: "experience" as const, ...row })),
    ...labelled(bullets).map((row) => ({ type: "experience_bullet" as const, ...row })),
    ...labelled(projects).map((row) => ({
      type: "project" as const,
      ...row,
      tech: parseJsonStringArray(row.tech),
    })),
    ...(skillRows ? skillBlocks(skillRows, skillPairs, data.keyword, scoped) : []).slice(
      0,
      data.limitPerType,
    ),
  ];

  return { blocks };
}

/** Skills are picked per résumé inside a group, so each block is one (group, skill) pair from a layout. */
function skillBlocks(
  [skills, groups]: [Array<{ id: string; name: string }>, Array<{ id: string; name: string }>],
  pairs: Array<Usage & { groupId: string; skillId: string }>,
  keyword: string | undefined,
  scoped: boolean,
): ResumeSearchBlock[] {
  const skillName = new Map(skills.map((skill) => [skill.id, skill.name]));
  const groupName = new Map(groups.map((group) => [group.id, group.name]));
  const needle = keyword?.toLowerCase();
  const matches = (...values: string[]) =>
    !needle || values.some((value) => value.toLowerCase().includes(needle));

  const blocks: ResumeSearchBlock[] = [];
  const seen = new Set<string>();
  for (const pair of pairs) {
    const name = skillName.get(pair.skillId);
    const group = groupName.get(pair.groupId);
    const key = `${pair.groupId}\u241f${pair.skillId}`;
    if (name === undefined || group === undefined || seen.has(key)) continue;
    seen.add(key);
    if (!matches(name, group)) continue;
    blocks.push({
      type: "skill",
      id: pair.skillId,
      groupId: pair.groupId,
      groupName: group,
      name,
      resumeId: pair.resumeId,
      resumeName: pair.resumeName,
    });
  }
  if (scoped) return blocks;

  const used = new Set(pairs.map((pair) => pair.skillId));
  for (const skill of skills) {
    if (used.has(skill.id) || !matches(skill.name)) continue;
    blocks.push({
      type: "skill",
      id: skill.id,
      groupId: "",
      groupName: "",
      name: skill.name,
      ...REUSABLE,
    });
  }
  return blocks;
}
