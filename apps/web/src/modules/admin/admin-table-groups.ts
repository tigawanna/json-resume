export const ADMIN_TABLE_GROUPS = [
  { id: "resume", label: "Résumé" },
  { id: "ai", label: "AI" },
  { id: "auth", label: "Auth" },
  { id: "jobs", label: "Jobs" },
  { id: "system", label: "Sync & system" },
] as const;

export type AdminTableGroupId = (typeof ADMIN_TABLE_GROUPS)[number]["id"];

const AUTH_TABLES = new Set([
  "account",
  "apikey",
  "invitation",
  "jwks",
  "member",
  "organization",
  "session",
  "user",
  "verification",
]);

export function adminTableGroup(name: string): AdminTableGroupId {
  if (name.startsWith("resume_ai_")) return "ai";
  if (name.startsWith("resume") || name === "public_resume" || name === "saved_project") {
    return "resume";
  }
  if (AUTH_TABLES.has(name) || name.startsWith("oauth_")) return "auth";
  if (name === "job") return "jobs";
  return "system";
}
