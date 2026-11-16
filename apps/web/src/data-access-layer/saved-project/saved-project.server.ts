import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { savedProject } from "@repo/db/schema/saved-project-schema";
import { and, eq } from "drizzle-orm";

export async function listSavedProjects(userId: string) {
  return db
    .select({
      id: savedProject.id,
      name: savedProject.name,
      url: savedProject.url,
      homepageUrl: savedProject.homepageUrl,
      description: savedProject.description,
      tech: savedProject.tech,
      createdAt: savedProject.createdAt,
      updatedAt: savedProject.updatedAt,
    })
    .from(savedProject)
    .where(eq(savedProject.userId, userId));
}

export type SavedProjectRow = Awaited<ReturnType<typeof listSavedProjects>>[number];

export async function saveProject(
  userId: string,
  data: {
    name: string;
    url: string;
    homepageUrl?: string;
    description?: string;
    tech?: string[];
  },
) {
  const searchableText = [data.name, data.description ?? "", ...(data.tech ?? [])].join(" ");
  const [row] = await db
    .insert(savedProject)
    .values({
      userId,
      name: data.name,
      url: data.url,
      homepageUrl: data.homepageUrl ?? "",
      description: data.description ?? "",
      tech: JSON.stringify(data.tech ?? []),
      searchableText,
    })
    .returning({
      id: savedProject.id,
      name: savedProject.name,
      url: savedProject.url,
      homepageUrl: savedProject.homepageUrl,
      description: savedProject.description,
      tech: savedProject.tech,
      createdAt: savedProject.createdAt,
      updatedAt: savedProject.updatedAt,
    });
  return row;
}

export async function unsaveProjectByUrl(userId: string, url: string) {
  await db
    .delete(savedProject)
    .where(and(eq(savedProject.userId, userId), eq(savedProject.url, url)));
}
