import type { Resume } from "@/data-access-layer/event-sourced/schemas";
import { layoutIds, type LayoutEntityKey } from "@/features/resume/resume-layout";

export function resumeLabel(resume: Pick<Resume, "name" | "fullName">) {
  return resume.name.trim() || resume.fullName.trim() || "Untitled résumé";
}

/** Library ids the résumés' layouts point at for one section, de-duplicated. */
export function resumesLibraryIds(resumes: ReadonlyArray<Resume>, key: LayoutEntityKey): string[] {
  return [
    ...new Set(resumes.flatMap((resume) => (resume.layout ? layoutIds(resume.layout, key) : []))),
  ];
}

/** Target jobs of the résumés, de-duplicated. */
export function resumesJobIds(resumes: ReadonlyArray<Resume>): string[] {
  return [...new Set(resumes.flatMap((resume) => (resume.jobId ? [resume.jobId] : [])))];
}
