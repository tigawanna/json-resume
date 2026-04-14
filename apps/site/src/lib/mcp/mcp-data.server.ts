import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume } from "@/lib/drizzle/scheam/resume-schema";
import { pinnedProject } from "@/lib/drizzle/scheam/github-schema";
import { desc, eq, and } from "drizzle-orm";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { buildTailorPrompt } from "@/features/resume/resume-prompt";

export async function mcpListResumes(userId: string) {
  const rows = await db
    .select({
      id: resume.id,
      name: resume.name,
      description: resume.description,
      updatedAt: resume.updatedAt,
    })
    .from(resume)
    .where(eq(resume.userId, userId))
    .orderBy(desc(resume.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function mcpGetResume(userId: string, resumeId: string) {
  const rows = await db
    .select()
    .from(resume)
    .where(and(eq(resume.id, resumeId), eq(resume.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    jobDescription: row.jobDescription,
    data: JSON.parse(row.data) as ResumeDocumentV1,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function mcpCreateResume(
  userId: string,
  input: {
    name: string;
    description: string;
    jobDescription: string;
    data: ResumeDocumentV1;
  },
) {
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(resume).values({
    id,
    userId,
    name: input.name,
    description: input.description,
    jobDescription: input.jobDescription,
    data: JSON.stringify(input.data),
    createdAt: now,
    updatedAt: now,
  });
  return { id, name: input.name };
}

export async function mcpListPinnedProjects(userId: string) {
  const rows = await db
    .select()
    .from(pinnedProject)
    .where(eq(pinnedProject.userId, userId));

  return rows.map((r) => ({
    name: r.name,
    fullName: r.fullName,
    description: r.description,
    repoUrl: r.repoUrl,
    homepageUrl: r.homepageUrl,
    topics: JSON.parse(r.topics) as string[],
    language: r.language,
    stargazersCount: r.stargazersCount,
  }));
}

export async function mcpGetPrompt(
  userId: string,
  resumeId: string,
  jobDescription: string,
) {
  const resumeRow = await mcpGetResume(userId, resumeId);
  if (!resumeRow) throw new Error("Resume not found");

  const pinnedProjects = await mcpListPinnedProjects(userId);

  const projectContext =
    pinnedProjects.length > 0
      ? `\n\n## My Pinned Projects (for context)\n\n${pinnedProjects
          .map(
            (p) =>
              `- **${p.name}** (${p.language || "N/A"}): ${p.description || "No description"}${p.topics.length > 0 ? ` [${p.topics.join(", ")}]` : ""}${p.homepageUrl ? ` — ${p.homepageUrl}` : ""}`,
          )
          .join("\n")}`
      : "";

  const jd = jobDescription || resumeRow.jobDescription;
  if (!jd) {
    throw new Error(
      "No job description provided. Pass one as an argument or save one on the resume.",
    );
  }

  const basePrompt = buildTailorPrompt(resumeRow.data, jd);
  return basePrompt + projectContext;
}
