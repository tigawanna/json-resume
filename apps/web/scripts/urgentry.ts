/**
 * Small Urgentry reader for local debugging.
 *
 *   pnpm urgentry status
 *   pnpm urgentry issues
 *   pnpm urgentry prove
 *
 * DSN: URGENTRY_DSN, else VITE_SENTRY_DSN from apps/web/.env
 * Token: URGENTRY_TOKEN, else pat= in ~/.urgentry/bootstrap-credentials.txt
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

type Dsn = {
  publicKey: string;
  baseUrl: string;
  projectId: string;
};

type Org = { slug: string; name: string };
type Project = { id: string; slug: string; name: string };
type Issue = { id: string; title?: string; count?: string; lastSeen?: string };

const webRoot = resolve(import.meta.dirname, "..");

function envFromDotenv(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  let text = "";
  try {
    text = readFileSync(resolve(webRoot, ".env"), "utf8");
  } catch {
    return undefined;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    return trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return undefined;
}

function parseDsn(raw: string): Dsn {
  const url = new URL(raw);
  const projectId = url.pathname.replace(/^\//, "").replace(/\/$/, "");
  if (!url.username || !projectId) {
    throw new Error(`DSN is missing a public key or project id: ${raw}`);
  }
  return {
    publicKey: decodeURIComponent(url.username),
    baseUrl: `${url.protocol}//${url.host}`,
    projectId,
  };
}

function token(): string {
  const fromEnv = process.env.URGENTRY_TOKEN;
  if (fromEnv) return fromEnv;
  const path = resolve(homedir(), ".urgentry/bootstrap-credentials.txt");
  const text = readFileSync(path, "utf8");
  const line = text.split("\n").find((row) => row.startsWith("pat="));
  const value = line?.slice("pat=".length).trim();
  if (!value) throw new Error(`No pat= line in ${path}`);
  return value;
}

async function api<T>(dsn: Dsn, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token()}`);
  const response = await fetch(new URL(path, dsn.baseUrl), {
    ...init,
    headers,
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} -> ${response.status} ${body}`);
  }
  return body ? (JSON.parse(body) as T) : (undefined as T);
}

async function organizations(dsn: Dsn) {
  return api<Org[]>(dsn, "/api/0/organizations/");
}

async function projects(dsn: Dsn, orgSlug: string) {
  return api<Project[]>(dsn, `/api/0/organizations/${orgSlug}/projects/`);
}

async function projectForDsn(dsn: Dsn) {
  const orgs = await organizations(dsn);
  for (const org of orgs) {
    const list = await projects(dsn, org.slug);
    const match = list.find(
      (project) => project.id === dsn.projectId || project.slug === dsn.projectId,
    );
    if (match) return { org, project: match };
  }
  throw new Error(`No project matches DSN project id ${dsn.projectId}`);
}

async function issues(dsn: Dsn, orgSlug: string, projectSlug: string) {
  return api<Issue[]>(dsn, `/api/0/projects/${orgSlug}/${projectSlug}/issues/`);
}

async function status(dsn: Dsn) {
  const root = await fetch(new URL("/api/0/", dsn.baseUrl));
  const rootBody = await root.text();
  const located = await projectForDsn(dsn);
  const keys = await api<Array<{ public?: string; dsn?: { public?: string } }>>(
    dsn,
    `/api/0/projects/${located.org.slug}/${located.project.slug}/keys/`,
  );
  const keyMatches = keys.some(
    (key) => key.public === dsn.publicKey || key.dsn?.public?.includes(dsn.publicKey),
  );
  console.log(
    JSON.stringify(
      {
        api: root.status,
        organization: located.org.slug,
        project: located.project.slug,
        projectId: located.project.id,
        publicKeyMatches: keyMatches,
      },
      null,
      2,
    ),
  );
  if (!root.ok) throw new Error(rootBody);
  if (!keyMatches) throw new Error("DSN public key is not on this project");
}

async function printIssues(dsn: Dsn) {
  const located = await projectForDsn(dsn);
  const list = await issues(dsn, located.org.slug, located.project.slug);
  console.log(
    JSON.stringify(
      list.map((issue) => ({
        id: issue.id,
        title: issue.title,
        count: issue.count,
        lastSeen: issue.lastSeen,
      })),
      null,
      2,
    ),
  );
}

async function prove(dsn: Dsn) {
  const eventId = crypto.randomUUID().replaceAll("-", "");
  const message = `urgentry prove ${new Date().toISOString()}`;
  const response = await fetch(new URL(`/api/${dsn.projectId}/store/`, dsn.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_key=${dsn.publicKey}, sentry_version=7`,
    },
    body: JSON.stringify({ event_id: eventId, message, level: "error" }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`store -> ${response.status} ${body}`);

  const located = await projectForDsn(dsn);
  let found = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const list = await issues(dsn, located.org.slug, located.project.slug);
    found = list.some((issue) => issue.title === message);
    if (found) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 400));
  }
  console.log(
    JSON.stringify({ stored: JSON.parse(body) as unknown, message, foundInIssues: found }, null, 2),
  );
  if (!found) throw new Error("Event was accepted but did not show up in issues");
}

async function main() {
  const command = process.argv[2] ?? "status";
  const raw = process.env.URGENTRY_DSN ?? envFromDotenv("VITE_SENTRY_DSN");
  if (!raw) throw new Error("Set URGENTRY_DSN or VITE_SENTRY_DSN");
  const dsn = parseDsn(raw);
  if (command === "status") await status(dsn);
  else if (command === "issues") await printIssues(dsn);
  else if (command === "prove") await prove(dsn);
  else {
    console.error("Usage: urgentry <status|issues|prove>");
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
