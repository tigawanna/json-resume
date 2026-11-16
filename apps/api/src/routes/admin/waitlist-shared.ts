import { and, asc, count, desc, eq, isNotNull, isNull, like, or } from "drizzle-orm";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import { z } from "zod";

export const listQueryInput = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(["joined", "removed"]).optional(),
  hasAccount: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateEntryInput = z.object({
  status: z.enum(["joined", "removed"]).optional(),
  /** `null` unlinks the account; a user id links it (the user must exist). */
  userId: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type WaitlistPage = Awaited<ReturnType<typeof readWaitlistPage>>;

/** Paginated, searchable waitlist list joined with the linked account email. */
export async function readWaitlistPage(input: z.output<typeof listQueryInput>) {
  const filters = [];
  if (input.q) {
    filters.push(or(like(waitlistEntry.email, `%${input.q}%`), like(waitlistEntry.name, `%${input.q}%`)));
  }
  if (input.status) {
    filters.push(eq(waitlistEntry.status, input.status));
  }
  if (input.hasAccount === "true") {
    filters.push(isNotNull(waitlistEntry.userId));
  } else if (input.hasAccount === "false") {
    filters.push(isNull(waitlistEntry.userId));
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(waitlistEntry).where(where);
  const total = totalRow?.total ?? 0;

  const rows = await db
    .select({
      id: waitlistEntry.id,
      email: waitlistEntry.email,
      name: waitlistEntry.name,
      status: waitlistEntry.status,
      source: waitlistEntry.source,
      notes: waitlistEntry.notes,
      userId: waitlistEntry.userId,
      userEmail: user.email,
      claimedAt: waitlistEntry.claimedAt,
      consentAt: waitlistEntry.consentAt,
      createdAt: waitlistEntry.createdAt,
    })
    .from(waitlistEntry)
    .leftJoin(user, eq(waitlistEntry.userId, user.id))
    .where(where)
    .orderBy(desc(waitlistEntry.createdAt), asc(waitlistEntry.id))
    .limit(input.perPage)
    .offset((input.page - 1) * input.perPage);

  return {
    items: rows,
    pagination: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    },
  };
}

/** Counts for the admin home card: waitlist size and linked accounts. */
export async function readWaitlistStats() {
  const [joinedRow] = await db
    .select({ total: count() })
    .from(waitlistEntry)
    .where(eq(waitlistEntry.status, "joined"));
  const [linkedRow] = await db
    .select({ total: count() })
    .from(waitlistEntry)
    .where(and(eq(waitlistEntry.status, "joined"), isNotNull(waitlistEntry.userId)));
  const [removedRow] = await db
    .select({ total: count() })
    .from(waitlistEntry)
    .where(eq(waitlistEntry.status, "removed"));

  return {
    joined: joinedRow?.total ?? 0,
    linked: linkedRow?.total ?? 0,
    removed: removedRow?.total ?? 0,
  };
}

export type WaitlistExportRow = {
  email: string;
  name: string | null;
  status: string;
  source: string;
  userId: string | null;
  userEmail: string | null;
  consentAt: Date;
  createdAt: Date;
};

export async function readWaitlistExportRows(): Promise<WaitlistExportRow[]> {
  return db
    .select({
      email: waitlistEntry.email,
      name: waitlistEntry.name,
      status: waitlistEntry.status,
      source: waitlistEntry.source,
      userId: waitlistEntry.userId,
      userEmail: user.email,
      consentAt: waitlistEntry.consentAt,
      createdAt: waitlistEntry.createdAt,
    })
    .from(waitlistEntry)
    .leftJoin(user, eq(waitlistEntry.userId, user.id))
    .orderBy(asc(waitlistEntry.createdAt));
}

/** Quoted CSV with a fixed header; every value is escaped. */
export function buildWaitlistCsv(rows: WaitlistExportRow[]): string {
  const header = "email,name,status,source,userId,userEmail,consentAt,createdAt";
  const body = rows.map((row) =>
    [
      row.email,
      row.name ?? "",
      row.status,
      row.source,
      row.userId ?? "",
      row.userEmail ?? "",
      row.consentAt.toISOString(),
      row.createdAt.toISOString(),
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header, ...body].join("\n");
}
