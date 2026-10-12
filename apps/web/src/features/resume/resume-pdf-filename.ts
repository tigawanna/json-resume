import type { ResumeDocumentV1 } from "./resume-schema";

// oxlint-disable-next-line no-control-regex
const ILLEGAL_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/** `candidate` made safe for a download name, or `fallback` when nothing is left. */
export function pdfFileStem(candidate: string, fallback: string): string {
  const cleaned = candidate
    .trim()
    .replace(ILLEGAL_FILE_CHARS, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned.slice(0, 200) || fallback;
}

export function resumePdfFileStem(resumeName: string | undefined, doc: ResumeDocumentV1): string {
  return pdfFileStem(resumeName?.trim() || doc.header.fullName, "resume");
}
