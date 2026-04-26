import type { ResumeDocumentV1 } from "./resume-schema";

const ILLEGAL_FILE_SYMBOLS = /[<>:"/\\|?*]/;

function stripIllegalFileChars(s: string): string {
  let out = "";
  for (const ch of s) {
    if (ILLEGAL_FILE_SYMBOLS.test(ch)) continue;
    if (ch.charCodeAt(0) < 32) continue;
    out += ch;
  }
  return out;
}

export function resumePdfFileStem(resumeName: string | undefined, doc: ResumeDocumentV1): string {
  const candidate = resumeName?.trim() || doc.header.fullName.trim();
  if (!candidate) return "resume";
  const cleaned = stripIllegalFileChars(candidate)
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const stem = cleaned.slice(0, 200);
  return stem || "resume";
}
