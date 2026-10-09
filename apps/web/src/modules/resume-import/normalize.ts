import { norm } from "@/modules/library/library-keys";
import { textSimilarity, wordTokens } from "@/utils/text-similarity";

const COMPANY_SUFFIXES = new Set([
  "inc",
  "llc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "co",
  "company",
  "gmbh",
  "plc",
  "sa",
  "ag",
]);

/** "CloudScale Systems, Inc. (US - Remote)" → "cloudscale systems". */
export function canonicalCompany(value: string): string {
  const withoutNotes = value.replace(/\([^)]*\)/g, " ");
  return wordTokens(withoutNotes)
    .filter((token) => !COMPANY_SUFFIXES.has(token))
    .join(" ");
}

const ROLE_WORDS: Record<string, string> = {
  sr: "senior",
  snr: "senior",
  jr: "junior",
  jnr: "junior",
  eng: "engineer",
  engr: "engineer",
  dev: "developer",
  mgr: "manager",
  swe: "software engineer",
  frontend: "frontend",
  backend: "backend",
  fullstack: "fullstack",
};

/** "Sr. Front-end Eng." → "senior frontend engineer". */
export function canonicalRole(value: string): string {
  const joined = value
    .toLowerCase()
    .replace(/\bfront[\s-]+end\b/g, "frontend")
    .replace(/\bback[\s-]+end\b/g, "backend")
    .replace(/\bfull[\s-]+stack\b/g, "fullstack");
  return wordTokens(joined)
    .map((token) => ROLE_WORDS[token] ?? token)
    .join(" ");
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthNumber(name: string): string | null {
  const index = MONTHS.indexOf(name.slice(0, 3).toLowerCase());
  return index === -1 ? null : String(index + 1).padStart(2, "0");
}

/** "Jan 2026", "01/2026", "2026-1" → "2026-01"; "Current" → "present"; unknown text is normalized as-is. */
export function canonicalDate(value: string): string {
  const text = norm(value);
  if (!text) return "";
  if (/^(present|current|now|today|ongoing)$/.test(text)) return "present";
  let match = /^(\d{4})[-/.](\d{1,2})$/.exec(text);
  if (match) return `${match[1]}-${match[2]!.padStart(2, "0")}`;
  match = /^(\d{1,2})[-/.](\d{4})$/.exec(text);
  if (match) return `${match[2]}-${match[1]!.padStart(2, "0")}`;
  match = /^([a-z]+)\.?\s+(\d{4})$/.exec(text);
  if (match) {
    const month = monthNumber(match[1]!);
    if (month) return `${match[2]}-${month}`;
  }
  return text;
}

/** "https://www.GitHub.com/me/repo.git/" → "github.com/me/repo". */
export function canonicalUrl(value: string): string {
  return norm(value)
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

/** "Node.js", "NodeJS", "node js" → "node"; "C++" stays "c++". */
export function canonicalSkill(value: string): string {
  const compact = norm(value).replace(/[\s._-]+/g, "");
  return compact.length > 4 && compact.endsWith("js") ? compact.slice(0, -2) : compact;
}

/** Project names compare without case, spaces or punctuation ("Flow Board" = "flowboard"). */
export function canonicalName(value: string): string {
  return norm(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

export function sameText(a: string, b: string) {
  return norm(a) === norm(b);
}

export function similarCompany(a: string, b: string): number {
  const left = canonicalCompany(a);
  const right = canonicalCompany(b);
  if (!left || !right) return 0;
  return left === right ? 1 : textSimilarity(left, right);
}

export function similarRole(a: string, b: string): number {
  return textSimilarity(canonicalRole(a), canonicalRole(b));
}
