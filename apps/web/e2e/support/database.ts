import { createClient } from "@libsql/client";
import { fileURLToPath } from "node:url";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  `file:${fileURLToPath(new URL("../../.test/db/e2e.sqlite", import.meta.url))}`;

export const reusablePartCountQueries = [
  ["contacts", "select count(*) as count from resume_contact where user_id = ?"],
  ["links", "select count(*) as count from resume_link where user_id = ?"],
  ["summaries", "select count(*) as count from resume_summary where user_id = ?"],
  ["experiences", "select count(*) as count from resume_experience where user_id = ?"],
  [
    "experienceBullets",
    `select count(*) as count
     from resume_experience_bullet bullet
     inner join resume_experience experience on experience.id = bullet.experience_id
     where experience.user_id = ?`,
  ],
  ["education", "select count(*) as count from resume_education where user_id = ?"],
  ["projects", "select count(*) as count from resume_project where user_id = ?"],
  ["skillGroups", "select count(*) as count from resume_skill_group where user_id = ?"],
  [
    "skills",
    `select count(*) as count
     from resume_skill skill
     inner join resume_skill_group skill_group on skill_group.id = skill.group_id
     where skill_group.user_id = ?`,
  ],
  ["talks", "select count(*) as count from resume_talk where user_id = ?"],
] as const;

export const resumeAssociationCountQueries = [
  [
    "contactItems",
    "select count(*) as count from resume_contact_item item inner join resume r on r.id = item.resume_id where r.user_id = ?",
  ],
  [
    "linkItems",
    "select count(*) as count from resume_link_item item inner join resume r on r.id = item.resume_id where r.user_id = ?",
  ],
  [
    "summaryItems",
    "select count(*) as count from resume_summary_item item inner join resume r on r.id = item.resume_id where r.user_id = ?",
  ],
  [
    "experienceItems",
    "select count(*) as count from resume_experience_item item inner join resume r on r.id = item.resume_id where r.user_id = ?",
  ],
  [
    "educationItems",
    "select count(*) as count from resume_education_item item inner join resume r on r.id = item.resume_id where r.user_id = ?",
  ],
  [
    "projectItems",
    "select count(*) as count from resume_project_item item inner join resume r on r.id = item.resume_id where r.user_id = ?",
  ],
  [
    "skillGroupItems",
    "select count(*) as count from resume_skill_group_item item inner join resume r on r.id = item.resume_id where r.user_id = ?",
  ],
  [
    "talkItems",
    "select count(*) as count from resume_talk_item item inner join resume r on r.id = item.resume_id where r.user_id = ?",
  ],
] as const;

export async function getUserIdByEmail(email: string) {
  const client = createClient({ url: databaseUrl, authToken: "" });
  try {
    const result = await client.execute({
      sql: "select id from user where email = ?",
      args: [email],
    });
    const id = result.rows[0]?.id;
    if (typeof id !== "string") {
      throw new Error(`Could not find test user ${email}`);
    }
    return id;
  } finally {
    client.close();
  }
}

async function countFromQuery(sql: string, userId: string) {
  const client = createClient({ url: databaseUrl, authToken: "" });
  try {
    const result = await client.execute({ sql, args: [userId] });
    const count = result.rows[0]?.count;
    if (typeof count !== "number" && typeof count !== "bigint") {
      throw new Error(`Count query did not return a numeric result: ${sql}`);
    }
    return Number(count);
  } finally {
    client.close();
  }
}

export async function getCounts(
  queries: readonly (readonly [string, string])[],
  userId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const [key, sql] of queries) {
    counts.set(key, await countFromQuery(sql, userId));
  }
  return counts;
}

export async function getResumeCount(userId: string) {
  return countFromQuery("select count(*) as count from resume where user_id = ?", userId);
}
