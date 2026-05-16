/**
 * Import a ResumeDocumentV1 JSON into the normalized schema (post-migration-0003).
 *
 * Items are owned by user_id directly. Links to a specific resume go through
 * the *_item junction tables. No resume_id on item rows.
 *
 * Usage (run from apps/web):
 *   npx tsx scripts/import-resume.ts --user <userId> --file <path-to-json>
 *   npx tsx scripts/import-resume.ts --user <userId> --name "My Resume" --file <path>
 *
 * Reads DATABASE_URL and DATABASE_AUTH_TOKEN from the .env file automatically.
 */

import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Minimal .env parser ─────────────────────────────────────────────────────

function loadEnv(dir: string): Record<string, string> {
  const envPath = resolve(dir, ".env");
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf-8");
  } catch {
    return {};
  }
  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    result[key] = val;
  }
  return result;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Link {
  label: string;
  url: string;
}

interface ExperienceItem {
  company: string;
  role: string;
  start: string;
  end: string;
  location?: string;
  bullets: string[];
}

interface EducationItem {
  school: string;
  degree: string;
  field?: string;
  year: string;
  bullets?: string[];
}

interface ProjectItem {
  name: string;
  url?: string;
  homepageUrl?: string;
  description: string;
  tech: string[];
}

interface TalkItem {
  title: string;
  event?: string;
  date?: string;
  links?: Link[];
}

interface SkillGroup {
  name: string;
  items: string[];
}

interface ResumeDocumentV1 {
  version: 1;
  meta: { templateId: string };
  sectionOrder: string[];
  header: {
    enabled: boolean;
    fullName: string;
    headline: string;
    email?: string;
    location?: string;
    links: Link[];
  };
  summary: { enabled: boolean; text: string };
  experience: { enabled: boolean; items: ExperienceItem[] };
  education: { enabled: boolean; items: EducationItem[] };
  projects: { enabled: boolean; items: ProjectItem[] };
  talks: { enabled: boolean; items: TalkItem[] };
  skills: { enabled: boolean; groups: SkillGroup[] };
}

// ─── CLI args ────────────────────────────────────────────────────────────────

function parseArgs(): { userId: string; filePath: string; resumeName: string } {
  const args = process.argv.slice(2);
  let userId = "";
  let filePath = "";
  let resumeName = "Imported Resume";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--user" && args[i + 1]) userId = args[++i]!;
    else if (args[i] === "--file" && args[i + 1]) filePath = args[++i]!;
    else if (args[i] === "--name" && args[i + 1]) resumeName = args[++i]!;
  }

  if (!userId) {
    console.error("Error: --user <userId> is required");
    process.exit(1);
  }
  if (!filePath) {
    console.error("Error: --file <path> is required");
    process.exit(1);
  }

  return { userId, filePath: resolve(filePath), resumeName };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { userId, filePath, resumeName } = parseArgs();

  const env = { ...loadEnv(process.cwd()), ...process.env };
  const DATABASE_URL = env["DATABASE_URL"];
  const DATABASE_AUTH_TOKEN = env["DATABASE_AUTH_TOKEN"];

  if (!DATABASE_URL) {
    console.error("Error: DATABASE_URL not set in .env");
    process.exit(1);
  }

  const client = createClient({
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN ?? "",
  });

  const raw = readFileSync(filePath, "utf-8");
  const doc: ResumeDocumentV1 = JSON.parse(raw) as ResumeDocumentV1;

  if (doc.version !== 1) {
    console.error("Error: Only version 1 documents are supported");
    process.exit(1);
  }

  const resumeId = crypto.randomUUID();
  const now = Date.now();

  console.log(`\nImporting "${resumeName}" for user ${userId}`);
  console.log(`Resume ID: ${resumeId}\n`);

  // ── resume ───────────────────────────────────────────────────────────────
  await client.execute({
    sql: `INSERT INTO resume (id, user_id, name, description, job_description, full_name, headline, template_id, created_at, updated_at)
          VALUES (?, ?, ?, '', '', ?, ?, ?, ?, ?)`,
    args: [
      resumeId,
      userId,
      resumeName,
      doc.header.fullName,
      doc.header.headline,
      doc.meta.templateId,
      now,
      now,
    ],
  });
  console.log("✓ resume");

  // ── sections ─────────────────────────────────────────────────────────────
  for (let i = 0; i < doc.sectionOrder.length; i++) {
    const key = doc.sectionOrder[i]!;
    const enabled =
      key === "header"
        ? doc.header.enabled
        : key === "summary"
          ? doc.summary.enabled
          : key === "experience"
            ? doc.experience.enabled
            : key === "education"
              ? doc.education.enabled
              : key === "projects"
                ? doc.projects.enabled
                : key === "talks"
                  ? doc.talks.enabled
                  : key === "skills"
                    ? doc.skills.enabled
                    : true;
    const title = key === "header" ? "Profile" : key.charAt(0).toUpperCase() + key.slice(1);
    await client.execute({
      sql: `INSERT INTO resume_section (id, resume_id, key, title, enabled, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, key, title, enabled ? 1 : 0, i, now, now],
    });
  }
  console.log(`✓ ${doc.sectionOrder.length} sections`);

  // ── contacts ─────────────────────────────────────────────────────────────
  const contactDefs: { type: string; value: string; label: string }[] = [];
  if (doc.header.email)
    contactDefs.push({ type: "email", value: doc.header.email, label: "Email" });
  if (doc.header.location)
    contactDefs.push({ type: "location", value: doc.header.location, label: "Location" });

  for (let i = 0; i < contactDefs.length; i++) {
    const c = contactDefs[i]!;
    const contactId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resume_contact (id, user_id, type, value, label, sort_order, searchable_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, '', ?, ?)`,
      args: [contactId, userId, c.type, c.value, c.label, i, now, now],
    });
    await client.execute({
      sql: `INSERT INTO resume_contact_item (id, resume_id, contact_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, contactId, i, now, now],
    });
  }
  console.log(`✓ ${contactDefs.length} contacts`);

  // ── links ─────────────────────────────────────────────────────────────────
  for (let i = 0; i < doc.header.links.length; i++) {
    const l = doc.header.links[i]!;
    const linkId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resume_link (id, user_id, label, url, icon, sort_order, searchable_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, ?, '', ?, ?)`,
      args: [linkId, userId, l.label, l.url, i, now, now],
    });
    await client.execute({
      sql: `INSERT INTO resume_link_item (id, resume_id, link_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, linkId, i, now, now],
    });
  }
  console.log(`✓ ${doc.header.links.length} links`);

  // ── summary ───────────────────────────────────────────────────────────────
  if (doc.summary.text.trim()) {
    const summaryId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resume_summary (id, user_id, text, sort_order, searchable_text, created_at, updated_at)
            VALUES (?, ?, ?, 0, '', ?, ?)`,
      args: [summaryId, userId, doc.summary.text, now, now],
    });
    await client.execute({
      sql: `INSERT INTO resume_summary_item (id, resume_id, summary_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, 0, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, summaryId, now, now],
    });
    console.log("✓ summary");
  }

  // ── experience ────────────────────────────────────────────────────────────
  for (let i = 0; i < doc.experience.items.length; i++) {
    const ex = doc.experience.items[i]!;
    const expId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resume_experience (id, user_id, company, role, start_date, end_date, location, sort_order, searchable_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`,
      args: [expId, userId, ex.company, ex.role, ex.start, ex.end, ex.location ?? "", i, now, now],
    });
    await client.execute({
      sql: `INSERT INTO resume_experience_item (id, resume_id, experience_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, expId, i, now, now],
    });
    for (let bi = 0; bi < ex.bullets.length; bi++) {
      await client.execute({
        sql: `INSERT INTO resume_experience_bullet (id, experience_id, text, sort_order, searchable_text, created_at, updated_at)
              VALUES (?, ?, ?, ?, '', ?, ?)`,
        args: [crypto.randomUUID(), expId, ex.bullets[bi]!, bi, now, now],
      });
    }
  }
  console.log(`✓ ${doc.experience.items.length} experiences`);

  // ── education ─────────────────────────────────────────────────────────────
  for (let i = 0; i < doc.education.items.length; i++) {
    const ed = doc.education.items[i]!;
    const edId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resume_education (id, user_id, school, degree, field, start_date, end_date, description, sort_order, searchable_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, '', ?, '', ?, '', ?, ?)`,
      args: [edId, userId, ed.school, ed.degree, ed.field ?? "", ed.year, i, now, now],
    });
    await client.execute({
      sql: `INSERT INTO resume_education_item (id, resume_id, education_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, edId, i, now, now],
    });
    if (ed.bullets) {
      for (let bi = 0; bi < ed.bullets.length; bi++) {
        await client.execute({
          sql: `INSERT INTO resume_education_bullet (id, education_id, text, sort_order, searchable_text, created_at, updated_at)
                VALUES (?, ?, ?, ?, '', ?, ?)`,
          args: [crypto.randomUUID(), edId, ed.bullets[bi]!, bi, now, now],
        });
      }
    }
  }
  console.log(`✓ ${doc.education.items.length} education entries`);

  // ── projects ──────────────────────────────────────────────────────────────
  for (let i = 0; i < doc.projects.items.length; i++) {
    const p = doc.projects.items[i]!;
    const projectId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resume_project (id, user_id, name, url, homepage_url, description, tech, sort_order, searchable_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`,
      args: [
        projectId,
        userId,
        p.name,
        p.url ?? "",
        p.homepageUrl ?? "",
        p.description,
        JSON.stringify(p.tech),
        i,
        now,
        now,
      ],
    });
    await client.execute({
      sql: `INSERT INTO resume_project_item (id, resume_id, project_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, projectId, i, now, now],
    });
  }
  console.log(`✓ ${doc.projects.items.length} projects`);

  // ── talks ─────────────────────────────────────────────────────────────────
  for (let i = 0; i < doc.talks.items.length; i++) {
    const t = doc.talks.items[i]!;
    const talkId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resume_talk (id, user_id, title, event, date, description, links, sort_order, searchable_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, '', ?, ?, '', ?, ?)`,
      args: [
        talkId,
        userId,
        t.title,
        t.event ?? "",
        t.date ?? "",
        JSON.stringify(t.links ?? []),
        i,
        now,
        now,
      ],
    });
    await client.execute({
      sql: `INSERT INTO resume_talk_item (id, resume_id, talk_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, talkId, i, now, now],
    });
  }
  console.log(`✓ ${doc.talks.items.length} talks`);

  // ── skill groups & skills ─────────────────────────────────────────────────
  for (let gi = 0; gi < doc.skills.groups.length; gi++) {
    const g = doc.skills.groups[gi]!;
    const groupId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resume_skill_group (id, user_id, name, sort_order, searchable_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, '', ?, ?)`,
      args: [groupId, userId, g.name, gi, now, now],
    });
    await client.execute({
      sql: `INSERT INTO resume_skill_group_item (id, resume_id, group_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), resumeId, groupId, gi, now, now],
    });
    for (let si = 0; si < g.items.length; si++) {
      await client.execute({
        sql: `INSERT INTO resume_skill (id, group_id, name, level, sort_order, searchable_text, created_at, updated_at)
              VALUES (?, ?, ?, NULL, ?, '', ?, ?)`,
        args: [crypto.randomUUID(), groupId, g.items[si]!, si, now, now],
      });
    }
  }
  console.log(`✓ ${doc.skills.groups.length} skill groups`);

  console.log(`\n✅ Done! Open: /resumes/${resumeId}`);
  client.close();
}

main().catch((err: unknown) => {
  console.error("\n❌ Import failed:", err);
  process.exit(1);
});
