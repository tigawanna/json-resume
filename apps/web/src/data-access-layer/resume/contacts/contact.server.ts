import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeContact } from "@/lib/drizzle/scheam";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { ContactListItemDTO } from "./contact.types";

export async function listContactsForUser(
  userId: string,
  keyword?: string,
): Promise<ContactListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resumeContact.type, pattern),
        like(resumeContact.value, pattern),
        like(resumeContact.label, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resumeContact.id,
      resumeId: resumeContact.resumeId,
      resumeName: resume.name,
      type: resumeContact.type,
      value: resumeContact.value,
      label: resumeContact.label,
      sortOrder: resumeContact.sortOrder,
      createdAt: resumeContact.createdAt,
      updatedAt: resumeContact.updatedAt,
    })
    .from(resumeContact)
    .innerJoin(resume, eq(resumeContact.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeContact.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteContactForUser(contactId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeContact.id })
    .from(resumeContact)
    .innerJoin(resume, eq(resumeContact.resumeId, resume.id))
    .where(and(eq(resumeContact.id, contactId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Contact not found");
  await db.delete(resumeContact).where(eq(resumeContact.id, contactId));
}
