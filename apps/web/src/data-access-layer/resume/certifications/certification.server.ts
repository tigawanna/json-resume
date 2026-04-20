import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeCertification } from "@/lib/drizzle/scheam";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { CertificationListItemDTO } from "./certification.types";

export async function listCertificationsForUser(
  userId: string,
  keyword?: string,
): Promise<CertificationListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(like(resumeCertification.name, pattern), like(resumeCertification.issuer, pattern))!,
    );
  }

  const rows = await db
    .select({
      id: resumeCertification.id,
      resumeId: resumeCertification.resumeId,
      resumeName: resume.name,
      name: resumeCertification.name,
      issuer: resumeCertification.issuer,
      date: resumeCertification.date,
      url: resumeCertification.url,
      sortOrder: resumeCertification.sortOrder,
      createdAt: resumeCertification.createdAt,
      updatedAt: resumeCertification.updatedAt,
    })
    .from(resumeCertification)
    .innerJoin(resume, eq(resumeCertification.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeCertification.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteCertificationForUser(certId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeCertification.id })
    .from(resumeCertification)
    .innerJoin(resume, eq(resumeCertification.resumeId, resume.id))
    .where(and(eq(resumeCertification.id, certId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Certification not found");
  await db.delete(resumeCertification).where(eq(resumeCertification.id, certId));
}
