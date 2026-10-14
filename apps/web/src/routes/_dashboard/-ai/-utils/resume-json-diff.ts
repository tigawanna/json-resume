import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import {
  assembleResumeDetail,
  asTemplateId,
} from "@/data-access-layer/event-sourced/resume/assemble-resume-detail";
import { snapshotEventSourcedResume } from "@/data-access-layer/event-sourced/resume/snapshot-resume";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { structuredPatch } from "diff";

type ResumeDetail = NonNullable<ReturnType<typeof assembleResumeDetail>>;

export function resumeDetailJson(detail: ResumeDetail): string {
  const doc = resumeDetailToDocument({ ...detail, templateId: asTemplateId(detail.templateId) });
  return JSON.stringify(doc, null, 2);
}

/** The résumé document as pretty JSON, read straight from the local DB (`null` if missing). */
export function snapshotResumeJson(db: AppDb, resumeId: string): string | null {
  const detail = assembleResumeDetail(resumeId, snapshotEventSourcedResume(db, resumeId));
  return detail ? resumeDetailJson(detail) : null;
}

export type ResumeJsonDiffLine = { kind: "add" | "remove" | "context"; text: string };

export type ResumeJsonDiffHunk = {
  oldStart: number;
  newStart: number;
  lines: ResumeJsonDiffLine[];
};

export function diffResumeJson(before: string, after: string, context = 3) {
  const patch = structuredPatch("before", "after", before, after, undefined, undefined, {
    context,
  });
  let added = 0;
  let removed = 0;
  const hunks: ResumeJsonDiffHunk[] = patch.hunks.map((hunk) => ({
    oldStart: hunk.oldStart,
    newStart: hunk.newStart,
    lines: hunk.lines.flatMap((line): ResumeJsonDiffLine[] => {
      const text = line.slice(1);
      if (line.startsWith("+")) {
        added++;
        return [{ kind: "add", text }];
      }
      if (line.startsWith("-")) {
        removed++;
        return [{ kind: "remove", text }];
      }
      if (line.startsWith(" ")) return [{ kind: "context", text }];
      return [];
    }),
  }));
  return { hunks, added, removed };
}
