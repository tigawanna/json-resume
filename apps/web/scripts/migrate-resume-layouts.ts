/**
 * One-off: store a `layout` on every résumé from the old link tables and merge
 * skill groups by name. Résumés that already have a layout keep it (only
 * merged group ids are repointed). Run it after migration 0008 (`resume.layout`)
 * and before the link tables are dropped, then rebuild every event log.
 *
 * Usage (from apps/web; reads DATABASE_URL / DATABASE_AUTH_TOKEN from the env or .env):
 *   npx tsx scripts/migrate-resume-layouts.ts           # dry run, prints the plan
 *   npx tsx scripts/migrate-resume-layouts.ts --write   # applies it in one transaction
 */

import { createClient, type Client, type InStatement, type Row } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  LAYOUT_ENTITY_KEYS,
  resumeLayoutSchema,
  type LayoutEntityKey,
} from "../src/features/resume/resume-layout";
import {
  planLayoutMigration,
  type LegacyLink,
  type LegacyLinkData,
} from "../src/modules/admin/layout-migration";

function loadEnv(dir: string): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(resolve(dir, ".env"), "utf-8");
  } catch {
    return {};
  }
  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return result;
}

/** Link table and library table behind each layout list. */
const LINK_TABLES: Record<LayoutEntityKey, { link: string; column: string; library: string }> = {
  experiences: {
    link: "resume_experience_item",
    column: "experience_id",
    library: "resume_experience",
  },
  skillGroups: {
    link: "resume_skill_group_item",
    column: "group_id",
    library: "resume_skill_group",
  },
  education: { link: "resume_education_item", column: "education_id", library: "resume_education" },
  projects: { link: "resume_project_item", column: "project_id", library: "resume_project" },
  talks: { link: "resume_talk_item", column: "talk_id", library: "resume_talk" },
  contacts: { link: "resume_contact_item", column: "contact_id", library: "resume_contact" },
  links: { link: "resume_link_item", column: "link_id", library: "resume_link" },
  summaries: { link: "resume_summary_item", column: "summary_id", library: "resume_summary" },
  notes: { link: "resume_note_item", column: "note_id", library: "resume_note" },
  certifications: {
    link: "resume_certification_item",
    column: "certification_id",
    library: "resume_certification",
  },
  volunteers: {
    link: "resume_volunteer_item",
    column: "volunteer_id",
    library: "resume_volunteer",
  },
  languages: { link: "resume_language_item", column: "language_id", library: "resume_language" },
};

function str(row: Row, column: string): string {
  const value = row[column];
  if (typeof value !== "string") throw new Error(`Expected text in ${column}, got ${typeof value}`);
  return value;
}

function optionalStr(row: Row, column: string): string | null {
  const value = row[column];
  return typeof value === "string" ? value : null;
}

function num(row: Row, column: string): number {
  const value = row[column];
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return 0;
}

async function select(client: Client, sql: string): Promise<Row[]> {
  return (await client.execute(sql)).rows;
}

async function linkTablesExist(client: Client): Promise<boolean> {
  const rows = await select(
    client,
    "select name from sqlite_master where type = 'table' and name = 'resume_section'",
  );
  return rows.length > 0;
}

export async function loadLegacyLinkData(client: Client): Promise<LegacyLinkData> {
  const resumes = (await select(client, "select id, user_id, layout from resume")).map((row) => {
    const raw = optionalStr(row, "layout");
    return {
      id: str(row, "id"),
      userId: str(row, "user_id"),
      layout: raw ? resumeLayoutSchema.parse(JSON.parse(raw)) : null,
    };
  });

  const sections = (
    await select(client, "select resume_id, key, title, enabled, sort_order from resume_section")
  ).map((row) => ({
    resumeId: str(row, "resume_id"),
    key: str(row, "key"),
    title: str(row, "title"),
    enabled: num(row, "enabled") !== 0,
    sortOrder: num(row, "sort_order"),
  }));

  const links = new Map<LayoutEntityKey, LegacyLink[]>();
  const existing = new Map<LayoutEntityKey, Set<string>>();
  for (const key of LAYOUT_ENTITY_KEYS) {
    const table = LINK_TABLES[key];
    links.set(
      key,
      (
        await select(client, `select resume_id, ${table.column}, sort_order from ${table.link}`)
      ).map((row) => ({
        resumeId: str(row, "resume_id"),
        entityId: str(row, table.column),
        sortOrder: num(row, "sort_order"),
      })),
    );
    existing.set(
      key,
      new Set(
        (await select(client, `select id from ${table.library}`)).map((row) => str(row, "id")),
      ),
    );
  }

  const bullets = (
    await select(client, "select id, experience_id, sort_order from resume_experience_bullet")
  ).map((row) => ({
    id: str(row, "id"),
    experienceId: str(row, "experience_id"),
    sortOrder: num(row, "sort_order"),
  }));
  const bulletLinks = (
    await select(
      client,
      "select resume_id, bullet_id, sort_order from resume_experience_bullet_item",
    )
  ).map((row) => ({
    resumeId: str(row, "resume_id"),
    entityId: str(row, "bullet_id"),
    sortOrder: num(row, "sort_order"),
  }));
  const skills = (await select(client, "select id, group_id, sort_order from resume_skill")).map(
    (row) => ({
      id: str(row, "id"),
      groupId: optionalStr(row, "group_id"),
      sortOrder: num(row, "sort_order"),
    }),
  );
  const groupSkills = (
    await select(client, "select group_id, skill_id, sort_order from resume_skill_group_skill")
  ).map((row) => ({
    groupId: str(row, "group_id"),
    skillId: str(row, "skill_id"),
    sortOrder: num(row, "sort_order"),
  }));
  const groups = (
    await select(client, "select id, user_id, name, updated_at from resume_skill_group")
  ).map((row) => ({
    id: str(row, "id"),
    userId: optionalStr(row, "user_id"),
    name: str(row, "name"),
    updatedAt: num(row, "updated_at"),
  }));

  return {
    resumes,
    sections,
    links,
    existing,
    bullets,
    bulletLinks,
    skills,
    groupSkills,
    groups,
  };
}

async function main() {
  const env = { ...loadEnv(process.cwd()), ...process.env };
  const url = env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const write = process.argv.includes("--write");
  const client = createClient({ url, authToken: env.DATABASE_AUTH_TOKEN || undefined });

  try {
    if (!(await linkTablesExist(client))) {
      const missing = await select(client, "select id from resume where layout is null");
      console.log(
        missing.length === 0
          ? "Link tables are gone and every résumé has a layout; nothing to do."
          : `Link tables are gone but ${missing.length} résumé(s) have no layout. Restore a backup.`,
      );
      return;
    }

    const data = await loadLegacyLinkData(client);
    const plan = planLayoutMigration(data);
    const before = new Map(
      data.resumes.map((resume) => [resume.id, JSON.stringify(resume.layout)]),
    );
    const changed = [...plan.layouts].filter(
      ([id, layout]) => before.get(id) !== JSON.stringify(layout),
    );

    console.log(`${data.resumes.length} résumés`);
    console.log(`  layouts derived from link rows: ${plan.derived.length}`);
    console.log(`  layouts written: ${changed.length}`);
    console.log(`${data.groups.length} skill groups`);
    console.log(`  merged by name: ${plan.groupMerges.length}`);
    console.log(`  remaining: ${data.groups.length - plan.groupMerges.length}`);

    if (!write) {
      console.log("\nDry run. Pass --write to apply.");
      return;
    }

    const statements: InStatement[] = changed.map(([id, layout]) => ({
      sql: "update resume set layout = ? where id = ?",
      args: [JSON.stringify(layout), id],
    }));
    for (const { from, to } of plan.groupMerges) {
      statements.push(
        { sql: "delete from resume_skill_group_item where group_id = ?", args: [from] },
        { sql: "delete from resume_skill_group_skill where group_id = ?", args: [from] },
        { sql: "update resume_skill set group_id = ? where group_id = ?", args: [to, from] },
        { sql: "delete from resume_skill_group where id = ?", args: [from] },
      );
    }
    await client.batch(statements, "write");
    console.log(`\nApplied ${statements.length} statements. Now rebuild every event log.`);
  } finally {
    client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
